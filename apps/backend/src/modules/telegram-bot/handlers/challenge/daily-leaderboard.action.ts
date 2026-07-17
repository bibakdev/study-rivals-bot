// apps/backend/src/modules/telegram-bot/handlers/challenge/daily-leaderboard.action.ts

import { Context, Markup } from 'telegraf';
import { ChallengeModel } from '#modules/challenge/challenge.model';
import { TimeLogModel } from '#modules/time-log/time-log.model';
import { UserModel } from '#modules/auth/user.model';
import { TenantMemberModel } from '#modules/tenant/tenant-member.model';
import {
  formatMinutesToTime,
  formatPersianDateLabel
} from '#modules/time-log/utils/time-parser.util';
import { logger } from '#utils/logger';

export const handleDailyLeaderboardMenuRequest = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const challengeId = ctx.match[1];
    await ctx.answerCbQuery().catch(() => {});

    const challenge = await ChallengeModel.findById(challengeId).lean();
    if (!challenge) {
      await ctx.editMessageText('❌ چالش یافت نشد.').catch(() => {});
      return;
    }

    const now = Date.now();
    const startMs = challenge.startDate.getTime();
    const duration = challenge.durationDays;
    const DAY_MS = 24 * 60 * 60 * 1000;
    const TEHRAN_OFFSET = 3.5 * 60 * 60 * 1000;

    const calculatedDay =
      Math.floor((now + TEHRAN_OFFSET - (startMs + TEHRAN_OFFSET)) / DAY_MS) +
      1;
    const currentDay = Math.min(duration, Math.max(0, calculatedDay)); // 👈 تغییر 1 به 0

    const inlineKeyboard: any[][] = [];

    for (let i = 0; i < duration; i++) {
      if (i < currentDay) {
        const targetDate = new Date(startMs + i * DAY_MS);
        const dateLabel = formatPersianDateLabel(targetDate);

        inlineKeyboard.push([
          Markup.button.callback(
            `📅 روز ${i + 1} (${dateLabel})`,
            `daily_leaderboard_day_${challengeId}_${i}`
          )
        ]);
      }
    }

    if (inlineKeyboard.length === 0) {
      inlineKeyboard.push([
        Markup.button.callback(
          '🔙 بازگشت به جزئیات چالش',
          `view_challenge_${challengeId}`
        )
      ]);
      await ctx
        .editMessageText(
          '⏳ چالش فعال است، اما هنوز به تاریخ شروع روز اول نرسیده‌ایم.',
          {
            reply_markup: { inline_keyboard: inlineKeyboard }
          }
        )
        .catch(() => {});
      return;
    }

    inlineKeyboard.push([
      Markup.button.callback(
        '🔙 بازگشت به جزئیات چالش',
        `view_challenge_${challengeId}`
      )
    ]);

    await ctx
      .editMessageText(
        `📅 **رتبه‌بندی تایم‌های روزانه**\n\nلطفاً روزی که قصد مشاهده رتبه‌بندی کاربران در آن را دارید انتخاب کنید:`,
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: inlineKeyboard }
        }
      )
      .catch(() => {});
  } catch (error) {
    return;
  }
};

export const handleDailyLeaderboardDayRequest = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const challengeId = ctx.match[1];
    const dayIndex = parseInt(ctx.match[2], 10);

    await ctx.answerCbQuery().catch(() => {});

    const challenge = await ChallengeModel.findById(challengeId).lean();
    if (!challenge) return;

    const startMs = challenge.startDate.getTime();
    const DAY_MS = 24 * 60 * 60 * 1000;

    const queryDate = new Date(startMs + dayIndex * DAY_MS);
    const dateLabel = formatPersianDateLabel(queryDate);

    const allMemberIds = challenge.teams.flatMap((t) => t.members);

    const timeLogs = await TimeLogModel.find({
      challengeId: challenge._id,
      date: queryDate
    }).lean();

    const usersInfo = await UserModel.find({
      telegramId: { $in: allMemberIds }
    }).lean();
    const tenantMembers = await TenantMemberModel.find({
      tenantId: challenge.tenantId,
      telegramId: { $in: allMemberIds }
    }).lean();

    const userScores = allMemberIds.map((memberId) => {
      const user = usersInfo.find((u) => u.telegramId === memberId);
      const membership = tenantMembers.find((m) => m.telegramId === memberId);

      let name = 'کاربر';
      if (membership?.alias) name = membership.alias;
      else if (user)
        name = `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`;

      const userLog = timeLogs.find((log) => log.telegramId === memberId);
      const minutes = userLog ? userLog.minutes : 0;
      const userTeam = challenge.teams.find((t) =>
        t.members.includes(memberId)
      );
      const teamName = userTeam ? userTeam.name : 'بدون تیم';

      return { name, teamName, minutes };
    });

    userScores.sort((a, b) => b.minutes - a.minutes);

    let report = `🏆 **رتبه‌بندی روزانه کاربران**\n`;
    report += `📅 مربوط به: **روز ${dayIndex + 1} (${dateLabel})**\n\n`;

    userScores.forEach((score, index) => {
      const medal =
        index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🔹';
      const timeStr =
        score.minutes > 0 ? formatMinutesToTime(score.minutes) : 'ثبت نشده';

      report += `${medal} **${score.name}**\n`;
      report += `   تیم: ${score.teamName} | تایم: **${timeStr}**\n\n`;
    });

    await ctx
      .editMessageText(report, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              Markup.button.callback(
                '🔙 بازگشت به لیست روزها',
                `daily_leaderboard_menu_${challengeId}`
              )
            ]
          ]
        }
      })
      .catch(() => {});
  } catch (error) {
    logger.error('Error calculating daily leaderboard:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};
