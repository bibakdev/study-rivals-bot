// apps/backend/src/modules/telegram-bot/handlers/challenge/view-logged-times.action.ts

import { Context, Markup } from 'telegraf';
import { ChallengeModel } from '#modules/challenge/challenge.model';
import { TimeLogModel } from '#modules/time-log/time-log.model';
import { UserModel } from '#modules/auth/user.model';
import { logger } from '#utils/logger';

const formatMinutesToTime = (minutes: number): string => {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs}:${mins.toString().padStart(2, '0')}`;
};

export const handleViewLoggedTimesRequest = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const challengeId = ctx.match[1];
    await ctx.answerCbQuery().catch(() => {});

    const challenge = await ChallengeModel.findById(challengeId).lean();
    if (!challenge) return;

    const timeLogs = await TimeLogModel.find({
      challengeId: challenge._id
    }).lean();
    const allMemberIds = challenge.teams.flatMap((t) => t.members);
    const usersInfo = await UserModel.find({
      telegramId: { $in: allMemberIds }
    }).lean();

    let message = `⏱ **تایم‌های زده شده در چالش**\n\n`;

    challenge.teams.forEach((team) => {
      message += `🔹 **${team.name}**\n`;
      if (team.members.length === 0) {
        message += `  بدون عضو\n`;
      } else {
        team.members.forEach((memberId) => {
          const userLogs = timeLogs.filter(
            (log) => log.telegramId === memberId
          );
          const totalMinutes = userLogs.reduce(
            (sum, log) => sum + log.minutes,
            0
          );
          const daysLogged = userLogs.length;

          const user = usersInfo.find((u) => u.telegramId === memberId);
          const name = user
            ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
            : 'کاربر';

          message += `  👤 ${name}: ${formatMinutesToTime(totalMinutes)} (مجموعاً ${daysLogged} روز)\n`;
        });
      }
      message += '\n';
    });

    await ctx
      .editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              Markup.button.callback(
                '🔙 بازگشت به جزئیات چالش',
                `view_challenge_${challengeId}`
              )
            ]
          ]
        }
      })
      .catch(() => {});
  } catch (error) {
    logger.error('Error viewing logged times:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};
