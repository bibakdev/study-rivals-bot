// apps/backend/src/modules/telegram-bot/handlers/challenge/daily-leaderboard.action.ts

import { Context, Markup } from 'telegraf';
import jalaali from 'jalaali-js';
import { ChallengeModel } from '#modules/challenge/challenge.model';
import { TimeLogModel } from '#modules/time-log/time-log.model';
import { UserModel } from '#modules/auth/user.model';
import { TenantMemberModel } from '#modules/tenant/tenant-member.model';
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

// ۱. اکشن نمایش لیست روزهای سپری شده چالش
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

    const inlineKeyboard: any[][] = [];

    // ساخت دکمه برای روزهایی که فرا رسیده‌اند
    for (let i = 0; i < duration; i++) {
      const targetDateMs = startMs + i * DAY_MS;

      if (now >= targetDateMs) {
        const targetDate = new Date(targetDateMs);
        const { jd, jm } = jalaali.toJalaali(targetDate);
        const dateLabel = `${jd} ${PERSIAN_MONTHS[jm - 1]}`;

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
    logger.error('Error viewing daily leaderboard menu:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};

// ۲. اکشن محاسبه و نمایش رتبه‌بندی کل کاربران در یک روز خاص
export const handleDailyLeaderboardDayRequest = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const challengeId = ctx.match[1];
    const dayIndex = parseInt(ctx.match[2], 10);

    await ctx.answerCbQuery().catch(() => {});

    const challenge = await ChallengeModel.findById(challengeId).lean();
    if (!challenge) return;

    // محاسبه تاریخ دقیق این روز
    const targetDateMs =
      challenge.startDate.getTime() + dayIndex * 24 * 60 * 60 * 1000;
    const targetDate = new Date(targetDateMs);
    const { jd, jm } = jalaali.toJalaali(targetDate);
    const dateLabel = `${jd} ${PERSIAN_MONTHS[jm - 1]}`;

    // استخراج تمام کاربران حاضر در همه تیم‌های چالش
    const allMemberIds = challenge.teams.flatMap((t) => t.members);

    // واکشی تایم‌های لاگ شده فقط در همین روز خاص و برای همین چالش
    const timeLogs = await TimeLogModel.find({
      challengeId: challenge._id,
      date: targetDate
    }).lean();

    // واکشی اطلاعات کاربران جهت استخراج نام و نام مستعار
    const usersInfo = await UserModel.find({
      telegramId: { $in: allMemberIds }
    }).lean();

    const tenantMembers = await TenantMemberModel.find({
      tenantId: challenge.tenantId,
      telegramId: { $in: allMemberIds }
    }).lean();

    // ایجاد لیست رتبه‌بندی
    const userScores = allMemberIds.map((memberId) => {
      const user = usersInfo.find((u) => u.telegramId === memberId);
      const membership = tenantMembers.find((m) => m.telegramId === memberId);

      let name = 'کاربر';
      if (membership?.alias) {
        name = membership.alias;
      } else if (user) {
        name = `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`;
      }

      const userLog = timeLogs.find((log) => log.telegramId === memberId);
      const minutes = userLog ? userLog.minutes : 0;

      // پیدا کردن نام تیمی که این کاربر در آن قرار دارد
      const userTeam = challenge.teams.find((t) =>
        t.members.includes(memberId)
      );
      const teamName = userTeam ? userTeam.name : 'بدون تیم';

      return { name, teamName, minutes };
    });

    // مرتب‌سازی کاربران از بیشترین ساعت به کمترین
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

    const inlineKeyboard = [
      [
        Markup.button.callback(
          '🔙 بازگشت به لیست روزها',
          `daily_leaderboard_menu_${challengeId}`
        )
      ]
    ];

    await ctx
      .editMessageText(report, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: inlineKeyboard }
      })
      .catch(() => {});
  } catch (error) {
    logger.error('Error calculating daily leaderboard:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};
