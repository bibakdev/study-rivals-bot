// apps/backend/src/modules/telegram-bot/handlers/time-log/time-log-state.action.ts

import { Context, Markup } from 'telegraf';
import jalaali from 'jalaali-js';
import { BotStateModel } from '#modules/telegram-bot/models/bot-state.model';
import { TimeLogModel } from '#modules/time-log/time-log.model';
import { ChallengeModel } from '#modules/challenge/challenge.model';
import { TenantModel } from '#modules/tenant/tenant.model';
import { UserModel } from '#modules/auth/user.model';
import { TenantMemberModel } from '#modules/tenant/tenant-member.model';
import {
  parseTimeStringToMinutes,
  formatMinutesToTime,
  formatPersianDateLabel,
  generateTimeDiffMessage
} from '#modules/time-log/utils/time-parser.util';
import { generateLeaderboardText } from '#modules/challenge/utils/leaderboard.util';
import { logger } from '#utils/logger';

const PERSIAN_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند'
];

export const handleTimeLogStateText = async (
  ctx: Context,
  telegramId: number,
  text: string
): Promise<boolean> => {
  try {
    const state = await BotStateModel.findOne({
      telegramId,
      action: { $in: ['LOG_TIME_ADD', 'LOG_TIME_EDIT'] }
    }).lean();

    if (!state) return false;

    const { challengeId, dayIndex } = state.payload as any;

    const minutesToLog = parseTimeStringToMinutes(text);
    if (minutesToLog === null || minutesToLog < 0) {
      await ctx.reply(
        '❌ فرمت زمان نامعتبر است. لطفاً عدد خالص (به ساعت) یا فرمت ساعت:دقیقه (مثل 1:30) وارد کنید.'
      );
      return true;
    }

    const challenge = await ChallengeModel.findById(challengeId);
    if (!challenge) {
      await BotStateModel.deleteOne({ telegramId });
      return true;
    }

    if (challenge.status !== 'active') {
      await ctx.reply(
        '⚠️ این چالش پایان یافته است و دیگر امکان ثبت یا ویرایش زمان در آن وجود ندارد.',
        {
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback(
                  '🔙 بازگشت به پنل',
                  `select_tenant_${challenge.tenantId}`
                )
              ]
            ]
          }
        }
      );
      await BotStateModel.deleteOne({ telegramId });
      return true;
    }

    // ⛔ گارد امنیتی نهایی
    const isParticipating = challenge.teams.some((team) =>
      team.members.includes(telegramId)
    );
    if (!isParticipating) {
      await ctx.reply(
        '⛔️ شما از تیم‌های این چالش حذف شده‌آید و دیگر امکان ثبت ساعت ندارید.',
        {
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback(
                  '🔙 بازگشت',
                  `select_tenant_${challenge.tenantId}`
                )
              ]
            ]
          }
        }
      );
      await BotStateModel.deleteOne({ telegramId });
      return true;
    }

    const targetDateMs =
      challenge.startDate.getTime() + dayIndex * 24 * 60 * 60 * 1000;
    const targetDate = new Date(targetDateMs);

    let currentTotal = 0;
    let oldMinutes = 0;

    const existingLog = await TimeLogModel.findOne({
      challengeId,
      telegramId,
      date: targetDate
    });

    if (existingLog) {
      oldMinutes = existingLog.minutes;
      if (state.action === 'LOG_TIME_ADD') {
        currentTotal = existingLog.minutes + minutesToLog;
      } else {
        currentTotal = minutesToLog;
      }
    } else {
      currentTotal = minutesToLog;
    }

    const MAX_MINUTES_PER_DAY = 20 * 60;
    if (currentTotal > MAX_MINUTES_PER_DAY) {
      await ctx.reply(
        `❌ **سقف مجاز رد شد!**\nشما نمی‌توانید در یک روز بیش از ۲۰ ساعت مطالعه ثبت کنید.\n\n⏱ ساعت محاسبه شده نهایی: **${formatMinutesToTime(currentTotal)}**\nلطفاً مقدار کمتری وارد کنید:`
      );
      return true;
    }

    if (existingLog) {
      existingLog.minutes = currentTotal;
      await existingLog.save();
    } else {
      await TimeLogModel.create({
        tenantId: challenge.tenantId,
        challengeId: challenge._id,
        telegramId,
        date: targetDate,
        minutes: currentTotal
      });
    }

    await BotStateModel.deleteOne({ telegramId });

    const successMsg =
      state.action === 'LOG_TIME_ADD'
        ? `✅ زمان **${formatMinutesToTime(minutesToLog)}** با موفقیت به روز ${dayIndex + 1} اضافه شد.\n⏱ مجموع زمان امروز: **${formatMinutesToTime(currentTotal)}**`
        : `✅ کل زمان روز ${dayIndex + 1} با موفقیت به **${formatMinutesToTime(currentTotal)}** تغییر یافت.`;

    const inlineKeyboard = [
      [
        Markup.button.callback(
          '➕ اضافه کردن ساعت',
          `prompt_time_add_${challengeId}_${dayIndex}`
        ),
        Markup.button.callback(
          '✏️ ویرایش کل ساعت',
          `prompt_time_edit_${challengeId}_${dayIndex}`
        )
      ],
      [
        Markup.button.callback(
          '🔙 بازگشت به لیست روزها',
          `action_log_time_${challenge.tenantId}`
        )
      ]
    ];

    await ctx.reply(successMsg, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: inlineKeyboard }
    });

    const tenant = await TenantModel.findById(challenge.tenantId).lean();
    if (tenant && tenant.chatId) {
      const user = await UserModel.findOne({ telegramId }).lean();
      const membership = await TenantMemberModel.findOne({
        tenantId: challenge.tenantId,
        telegramId
      }).lean();

      let userName = 'کاربر';
      if (membership?.alias) {
        userName = membership.alias;
      } else if (user) {
        userName = `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`;
      }

      // 👈 تولید برچسب تاریخ شمسی و جزئیات تفاضل هوشمند زمان برای ربات
      const persianDateLabel = formatPersianDateLabel(targetDate);
      const timeDiffDetails = generateTimeDiffMessage(oldMinutes, currentTotal);

      const notificationMsg =
        `⏱ کاربر 👤 **${userName}** زمان خود را از طریق ربات به‌روزرسانی کرد.\n` +
        `📅 مربوط به: **روز ${dayIndex + 1} چالش (${persianDateLabel})**\n` +
        `${timeDiffDetails}\n` +
        `📊 مجموع ساعت نهایی این روز: **${formatMinutesToTime(currentTotal)}**`;

      const sendOptions: any = { parse_mode: 'Markdown' };
      if (tenant.topicId) sendOptions.message_thread_id = tenant.topicId;

      if (challenge.lastDividerMessageId) {
        await ctx.telegram
          .deleteMessage(tenant.chatId, challenge.lastDividerMessageId)
          .catch(() => {});
      }

      if (challenge.lastLeaderboardMessageId) {
        await ctx.telegram
          .deleteMessage(tenant.chatId, challenge.lastLeaderboardMessageId)
          .catch(() => {});
      }

      await ctx.telegram
        .sendMessage(tenant.chatId, notificationMsg, sendOptions)
        .catch(() => {});

      const dividerMsg = await ctx.telegram
        .sendMessage(tenant.chatId, '➖➖➖➖➖➖➖➖➖', sendOptions)
        .catch(() => null);

      const leaderboardStr = await generateLeaderboardText(challenge._id);
      if (leaderboardStr) {
        const sentLbMsg = await ctx.telegram
          .sendMessage(tenant.chatId, leaderboardStr, sendOptions)
          .catch(() => null);

        if (dividerMsg) challenge.lastDividerMessageId = dividerMsg.message_id;
        if (sentLbMsg)
          challenge.lastLeaderboardMessageId = sentLbMsg.message_id;
        await challenge.save();
      }
    }

    return true;
  } catch (error) {
    logger.error('Error handling time log state:', error);
    await ctx.reply('⚠️ خطایی رخ داد. فرآیند لغو شد.');
    await BotStateModel.deleteOne({ telegramId }).catch(() => {});
    return true;
  }
};
