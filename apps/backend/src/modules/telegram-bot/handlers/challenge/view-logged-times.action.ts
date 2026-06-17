// apps/backend/src/modules/telegram-bot/handlers/challenge/view-logged-times.action.ts

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

// ۱. اکشن نمایش لیست تمام کاربران شرکت‌کننده در چالش
export const handleViewLoggedTimesRequest = async (
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

    const allMemberIds = challenge.teams.flatMap((t) => t.members);

    // واکشی اطلاعات کاربران برای نمایش نام (با اولویت نام مستعار)
    const usersInfo = await UserModel.find({
      telegramId: { $in: allMemberIds }
    }).lean();

    const tenantMembers = await TenantMemberModel.find({
      tenantId: challenge.tenantId,
      telegramId: { $in: allMemberIds }
    }).lean();

    const inlineKeyboard: any[][] = [];

    // ساخت دکمه برای هر کاربر
    challenge.teams.forEach((team) => {
      team.members.forEach((memberId) => {
        const user = usersInfo.find((u) => u.telegramId === memberId);
        const membership = tenantMembers.find((m) => m.telegramId === memberId);

        let name = 'کاربر';
        if (membership?.alias) {
          name = membership.alias;
        } else if (user) {
          name = `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`;
        }

        inlineKeyboard.push([
          Markup.button.callback(
            `👤 ${name} (${team.name})`,
            `view_user_logs_${challengeId}_${memberId}`
          )
        ]);
      });
    });

    if (inlineKeyboard.length === 0) {
      inlineKeyboard.push([
        Markup.button.callback(
          '🔙 بازگشت به جزئیات چالش',
          `view_challenge_${challengeId}`
        )
      ]);
      await ctx
        .editMessageText('👥 هیچ کاربری در این چالش عضو نیست.', {
          reply_markup: { inline_keyboard: inlineKeyboard }
        })
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
        `👥 **لیست شرکت‌کنندگان چالش**\n\nبرای مشاهده ریز کارکرد و تایم‌های ثبت شده، روی کاربر مورد نظر کلیک کنید:`,
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: inlineKeyboard }
        }
      )
      .catch(() => {});
  } catch (error) {
    logger.error('Error viewing logged times menu:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};

// ۲. اکشن نمایش ریز کارکرد و تایم‌های سپری‌شده برای یک کاربر خاص
export const handleViewUserLogsRequest = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const challengeId = ctx.match[1];
    const targetTelegramId = Number(ctx.match[2]);

    await ctx.answerCbQuery().catch(() => {});

    const challenge = await ChallengeModel.findById(challengeId).lean();
    if (!challenge) return;

    // گرفتن نام کاربر
    const user = await UserModel.findOne({
      telegramId: targetTelegramId
    }).lean();
    const membership = await TenantMemberModel.findOne({
      tenantId: challenge.tenantId,
      telegramId: targetTelegramId
    }).lean();

    let name = 'کاربر';
    if (membership?.alias) {
      name = membership.alias;
    } else if (user) {
      name = `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`;
    }

    // محاسبه روزهای سپری شده
    const now = Date.now();
    const startMs = challenge.startDate.getTime();
    const duration = challenge.durationDays;
    const DAY_MS = 24 * 60 * 60 * 1000;

    // تعداد روزهای گذشته (حداکثر تا سقف مدت زمان چالش)
    const daysPassed = Math.min(
      duration,
      Math.max(0, Math.floor((now - startMs) / DAY_MS) + 1)
    );

    // واکشی تمام تایم‌های این کاربر در این چالش
    const timeLogs = await TimeLogModel.find({
      challengeId: challenge._id,
      telegramId: targetTelegramId
    }).lean();

    let report = `👤 **ریز کارکرد:** ${name}\n\n`;
    let totalMins = 0;

    if (daysPassed === 0) {
      report += '⏳ چالش هنوز شروع نشده است.';
    } else {
      for (let i = 0; i < daysPassed; i++) {
        const targetDateMs = startMs + i * DAY_MS;
        const targetDate = new Date(targetDateMs);
        const { jd, jm } = jalaali.toJalaali(targetDate);
        const dateLabel = `${jd} ${PERSIAN_MONTHS[jm - 1]}`;

        // پیدا کردن لاگِ مربوط به این روز بر اساس Timestamp
        const log = timeLogs.find(
          (l) => l.date.getTime() === targetDate.getTime()
        );
        const mins = log ? log.minutes : 0;
        totalMins += mins;

        const minsStr = mins > 0 ? formatMinutesToTime(mins) : 'ثبت نشده';
        const icon = mins > 0 ? '✅' : '❌';

        report += `${icon} روز ${i + 1} (${dateLabel}): **${minsStr}**\n`;
      }
    }

    report += `\n📊 مجموع تایم ثبت شده تاکنون: **${formatMinutesToTime(totalMins)}**`;

    const inlineKeyboard = [
      [
        Markup.button.callback(
          '🔙 بازگشت به لیست شرکت‌کنندگان',
          `view_logged_times_${challengeId}`
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
    logger.error('Error viewing specific user logs:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};
