// apps/backend/src/modules/telegram-bot/handlers/time-log/prompt-time.action.ts

import { Context, Markup } from 'telegraf';
import jalaali from 'jalaali-js';
import { BotStateModel } from '#modules/telegram-bot/models/bot-state.model';
import { ChallengeModel } from '#modules/challenge/challenge.model';
import { TimeLogModel } from '#modules/time-log/time-log.model';
import { formatMinutesToTime } from '#modules/time-log/utils/time-parser.util';
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

export const handlePromptTimeAction = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const actionType = ctx.match[1];
    const challengeId = ctx.match[2];
    const dayIndex = parseInt(ctx.match[3], 10);
    const telegramId = ctx.from?.id;

    await ctx.answerCbQuery().catch(() => {});
    if (!telegramId) return;

    const challenge = await ChallengeModel.findById(challengeId).lean();
    if (!challenge) {
      await ctx.editMessageText('❌ چالش یافت نشد.').catch(() => {});
      return;
    }

    if (challenge.status !== 'active') {
      await ctx
        .editMessageText(
          '⚠️ این چالش به پایان رسیده است و دیگر امکان ثبت یا ویرایش زمان در آن وجود ندارد.',
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
        )
        .catch(() => {});
      return;
    }

    // ⛔ گارد امنیتی
    const isParticipating = challenge.teams.some((team) =>
      team.members.includes(telegramId)
    );
    if (!isParticipating) {
      await ctx
        .editMessageText('⛔️ شما در تیم‌های این چالش حضور ندارید.', {
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
        })
        .catch(() => {});
      return;
    }

    await BotStateModel.findOneAndUpdate(
      { telegramId },
      {
        $set: {
          action: actionType === 'add' ? 'LOG_TIME_ADD' : 'LOG_TIME_EDIT',
          payload: { challengeId, dayIndex, tenantId: challenge.tenantId }
        }
      },
      { upsert: true }
    );

    const targetDateMs =
      challenge.startDate.getTime() + dayIndex * 24 * 60 * 60 * 1000;
    const targetDate = new Date(targetDateMs);
    const { jd, jm } = jalaali.toJalaali(targetDate);
    const dateLabel = `${jd} ${PERSIAN_MONTHS[jm - 1]}`;

    const existingLog = await TimeLogModel.findOne({
      challengeId: challenge._id,
      telegramId,
      date: targetDate
    }).lean();

    const currentLoggedMinutes = existingLog ? existingLog.minutes : 0;
    const formattedCurrentTime = formatMinutesToTime(currentLoggedMinutes);

    const actionText = actionType === 'add' ? 'اضافه کردن' : 'ویرایش';
    const exampleText =
      'برای وارد کردن ساعت و دقیقه از دونقطه استفاده کنید (مثلاً `10:30` یا `0:32`) و برای ثبت ساعت رند فقط عدد وارد کنید (مثلاً `5` یعنی ۵ ساعت).';

    await ctx
      .editMessageText(
        `📅 **روز ${dayIndex + 1} (${dateLabel})**\n\n` +
          `⏱ **ساعت ثبت شده فعلی شما:** ${formattedCurrentTime}\n\n` +
          `✏️ **${actionText} ساعت مطالعه**\nلطفاً مقدار زمانی که می‌خواهید اعمال شود را ارسال نمایید.\n\n💡 ${exampleText}`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback(
                  '❌ انصراف',
                  `action_log_time_day_${challengeId}_${dayIndex}`
                )
              ]
            ]
          }
        }
      )
      .catch(() => {});
  } catch (error) {
    logger.error('Error prompting time input:', error);
  }
};
