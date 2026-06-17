// apps/backend/src/modules/telegram-bot/handlers/challenge/view-challenge.action.ts

import { Context, Markup } from 'telegraf';
import { ChallengeModel } from '#modules/challenge/challenge.model';
import { UserModel } from '#modules/auth/user.model';
import { TimeLogModel } from '#modules/time-log/time-log.model';
import { logger } from '#utils/logger';

export const handleViewChallengeRequest = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const challengeId = ctx.match[1];

    await ctx.answerCbQuery().catch(() => {});

    const challenge = await ChallengeModel.findById(challengeId).lean();

    if (!challenge) {
      await ctx
        .editMessageText('❌ چالش مورد نظر یافت نشد.', {
          reply_markup: {
            inline_keyboard: [
              [Markup.button.callback('🔙 بستن', 'action_manage_groups')]
            ]
          }
        })
        .catch(() => {});
      return;
    }

    const allMemberIds = challenge.teams.flatMap((t) => t.members);
    const usersInfo = await UserModel.find({
      telegramId: { $in: allMemberIds }
    }).lean();

    let extraInfo = '';
    let logsMap = new Map<number, number>();

    // 👈 اضافه شدن اطلاعات مختص چالش‌های در حال اجرا (Active)
    if (challenge.status === 'active') {
      const now = Date.now();
      const start = challenge.startDate.getTime();
      const daysPassed = Math.max(
        1,
        Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1
      );

      extraInfo = `🗓 **روزهای سپری شده:** ${daysPassed} روز از ${challenge.durationDays} روز\n`;

      const timeLogs = await TimeLogModel.aggregate([
        { $match: { challengeId: challenge._id } },
        { $group: { _id: '$telegramId', daysLogged: { $sum: 1 } } }
      ]);

      timeLogs.forEach((log) => logsMap.set(log._id, log.daysLogged));
    }

    let teamsInfoText = '\n📊 **تیم‌ها و نفرات:**\n\n';
    if (challenge.teams.length === 0) {
      teamsInfoText += 'هیچ تیمی ثبت نشده است.\n';
    } else {
      challenge.teams.forEach((team) => {
        teamsInfoText += `🔹 **${team.name}**\n`;
        if (team.members.length === 0) {
          teamsInfoText += `  بدون عضو\n`;
        } else {
          team.members.forEach((memberId) => {
            const user = usersInfo.find((u) => u.telegramId === memberId);
            const name = user
              ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
              : 'کاربر';

            if (challenge.status === 'active') {
              const daysLogged = logsMap.get(memberId) || 0;
              teamsInfoText += `  👤 ${name} - (تایم ثبت شده: ${daysLogged} روز)\n`;
            } else {
              teamsInfoText += `  👤 ${name}\n`;
            }
          });
        }
        teamsInfoText += '\n';
      });
    }

    const tenantId = challenge.tenantId.toString();
    const inlineKeyboard = [];

    // دکمه‌های متغیر بر اساس وضعیت
    if (challenge.status === 'pending') {
      inlineKeyboard.push(
        [
          Markup.button.callback(
            '📢 ارسال تیم‌ها در گروه',
            `send_teams_${challengeId}`
          )
        ],
        [
          Markup.button.callback(
            '▶️ شروع چالش',
            `start_challenge_${challengeId}`
          )
        ],
        [
          Markup.button.callback(
            '✏️ ویرایش چالش',
            `edit_challenge_${challengeId}`
          )
        ],
        [
          Markup.button.callback(
            '🗑 حذف چالش',
            `delete_challenge_${challengeId}`
          )
        ]
      );
    } else if (challenge.status === 'active') {
      inlineKeyboard.push(
        [
          Markup.button.callback(
            '🗑 حذف چالش',
            `delete_challenge_${challengeId}`
          )
        ],
        [
          Markup.button.callback('⏹ خاتمه چالش', `end_challenge_${challengeId}`)
        ],
        [
          Markup.button.callback(
            '🏆 ارسال رتبه‌بندی',
            `send_leaderboard_${challengeId}`
          )
        ],
        [
          Markup.button.callback(
            '⏱ مشاهده تایم‌های زده شده',
            `view_logged_times_${challengeId}`
          )
        ]
      );
    }

    inlineKeyboard.push([
      Markup.button.callback(
        '🔙 بازگشت به لیست',
        `action_list_challenges_${tenantId}_${challenge.status}`
      )
    ]);

    const statusPersian =
      challenge.status === 'pending'
        ? 'اجرا نشده'
        : challenge.status === 'active'
          ? 'در حال اجرا'
          : 'تکمیل شده';

    const message =
      `🏆 **جزئیات چالش**\n\n` +
      `📅 **تاریخ شروع:** ${challenge.startDateText}\n` +
      `⏳ **مدت زمان:** ${challenge.durationDays} روز\n` +
      `وضعیت: **${statusPersian}**\n` +
      extraInfo +
      teamsInfoText +
      `لطفاً عملیات مورد نظر خود را انتخاب کنید:`;

    await ctx
      .editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: inlineKeyboard }
      })
      .catch((err) => {
        if (!err.description?.includes('message is not modified')) {
          logger.warn(
            `Could not edit message in view challenge: ${err.description}`
          );
        }
      });
  } catch (error) {
    logger.error('Error handling view challenge action:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};
