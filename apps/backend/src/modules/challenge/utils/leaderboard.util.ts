// apps/backend/src/modules/challenge/utils/leaderboard.util.ts

import { ChallengeModel } from '#modules/challenge/challenge.model';
import { TimeLogModel } from '#modules/time-log/time-log.model';
import { UserModel } from '#modules/auth/user.model';
import { formatMinutesToTime } from '#modules/time-log/utils/time-parser.util';
import mongoose from 'mongoose';

export const generateLeaderboardText = async (
  challengeId: string | mongoose.Types.ObjectId
): Promise<string | null> => {
  const challenge = await ChallengeModel.findById(challengeId).lean();
  if (!challenge) return null;

  const timeLogs = await TimeLogModel.find({
    challengeId: challenge._id
  }).lean();

  const allMemberIds = challenge.teams.flatMap((t) => t.members);
  const usersInfo = await UserModel.find({
    telegramId: { $in: allMemberIds }
  }).lean();

  let message = `🏆 **رتبه‌بندی لحظه‌ای چالش**\n\n`;

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

  // مرتب‌سازی تیم‌ها از بیشترین ساعت به کمترین
  teamScores.sort((a, b) => b.totalMinutes - a.totalMinutes);

  teamScores.forEach((team, index) => {
    const medal =
      index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🔹';
    message += `${medal} **${team.name}** - ${formatMinutesToTime(team.totalMinutes)}\n`;

    // مرتب‌سازی اعضای هر تیم
    team.memberScores
      .sort((a, b) => b.minutes - a.minutes)
      .forEach((member) => {
        message += `   👤 ${member.name}: ${formatMinutesToTime(member.minutes)}\n`;
      });
    message += '\n';
  });

  return message;
};
