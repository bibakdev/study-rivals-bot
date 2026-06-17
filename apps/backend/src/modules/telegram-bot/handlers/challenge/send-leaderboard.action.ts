// apps/backend/src/modules/telegram-bot/handlers/challenge/send-leaderboard.action.ts

import { Context } from 'telegraf';
import { ChallengeModel } from '#modules/challenge/challenge.model';
import { TenantModel } from '#modules/tenant/tenant.model';
import { TimeLogModel } from '#modules/time-log/time-log.model';
import { UserModel } from '#modules/auth/user.model';
import { logger } from '#utils/logger';

const formatMinutesToTime = (minutes: number): string => {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs}:${mins.toString().padStart(2, '0')}`;
};

export const handleSendLeaderboardRequest = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const challengeId = ctx.match[1];

    const challenge = await ChallengeModel.findById(challengeId).lean();
    if (!challenge) return;

    const tenant = await TenantModel.findById(challenge.tenantId).lean();
    if (!tenant || !tenant.chatId) {
      await ctx
        .answerCbQuery('❌ گروه یافت نشد یا ربات دسترسی ندارد.', {
          show_alert: true
        })
        .catch(() => {});
      return;
    }

    const timeLogs = await TimeLogModel.find({
      challengeId: challenge._id
    }).lean();

    const allMemberIds = challenge.teams.flatMap((t) => t.members);
    const usersInfo = await UserModel.find({
      telegramId: { $in: allMemberIds }
    }).lean();

    let message = `🏆 **رتبه‌بندی چالش در حال اجرا**\n\n`;

    const teamScores = challenge.teams.map((team) => {
      let totalMinutes = 0;
      const memberScores = team.members.map((memberId) => {
        const userLogs = timeLogs.filter((log) => log.telegramId === memberId);
        const userTotal = userLogs.reduce((sum, log) => sum + log.minutes, 0);
        totalMinutes += userTotal;
        const user = usersInfo.find((u) => u.telegramId === memberId);
        const name = user
          ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
          : 'کاربر';
        return { name, minutes: userTotal };
      });
      return { name: team.name, totalMinutes, memberScores };
    });

    teamScores.sort((a, b) => b.totalMinutes - a.totalMinutes);

    teamScores.forEach((team, index) => {
      const medal =
        index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🔹';
      message += `${medal} **${team.name}** - ${formatMinutesToTime(team.totalMinutes)}\n`;
      team.memberScores
        .sort((a, b) => b.minutes - a.minutes)
        .forEach((member) => {
          message += `   👤 ${member.name}: ${formatMinutesToTime(member.minutes)}\n`;
        });
      message += '\n';
    });

    const sendOptions: any = { parse_mode: 'Markdown' };
    if (tenant.topicId) {
      sendOptions.message_thread_id = tenant.topicId;
    }

    await ctx.telegram.sendMessage(tenant.chatId, message, sendOptions);
    await ctx
      .answerCbQuery('✅ رتبه‌بندی با موفقیت در گروه ارسال شد.', {
        show_alert: true
      })
      .catch(() => {});
  } catch (error) {
    logger.error('Error sending leaderboard:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};
