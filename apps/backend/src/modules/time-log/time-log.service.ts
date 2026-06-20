// apps/backend/src/modules/time-log/time-log.service.ts

import { ChallengeModel } from '#modules/challenge/challenge.model';
import { TimeLogModel } from '#modules/time-log/time-log.model';
import { UserModel } from '#modules/auth/user.model';
import { TenantMemberModel } from '#modules/tenant/tenant-member.model';
import { TenantModel } from '#modules/tenant/tenant.model';
import { botService } from '#modules/telegram-bot/bot.service';
import { generateLeaderboardText } from '#modules/challenge/utils/leaderboard.util';
import { formatMinutesToTime } from '#modules/time-log/utils/time-parser.util';
import { AppError } from '#utils/AppError';
import mongoose from 'mongoose';
import { LogTimeRequestDto, LogTimeResponseDto } from 'shared-types';

/**
 * سرویس جامع ثبت و ویرایش زمان مطالعه چالش همراه با گارد ضد تقلب و همگام‌سازی زنده با گروه تلگرام
 */
export const logTimeService = async (
  telegramId: number,
  tenantId: string,
  data: LogTimeRequestDto
): Promise<LogTimeResponseDto> => {
  const tenantObjectId = new mongoose.Types.ObjectId(tenantId);

  // ۱. واکشی چالش فعال مستقر در این گروه
  const challenge = await ChallengeModel.findOne({
    tenantId: tenantObjectId,
    status: 'active'
  });

  if (!challenge) {
    throw new AppError(
      'هیچ چالش مطالعاتی فعالی در این گروه در حال اجرا نیست.',
      404,
      'ACTIVE_CHALLENGE_NOT_FOUND'
    );
  }

  // ۲. گارد امنیتی: بررسی حضور قطعی کاربر در یکی از تیم‌های چالش
  const isParticipating = challenge.teams.some((team) =>
    team.members.includes(telegramId)
  );
  if (!isParticipating) {
    throw new AppError(
      'دسترسی رد شد: شما در هیچ‌یک از تیم‌های این چالش عضویت ندارید.',
      403,
      'FORBIDDEN_CHALLENGE_MEMBER'
    );
  }

  // ۳. محاسبه کاملاً همگام روز جاری چالش بر اساس فرمول استاندارد پلتفرم
  const now = Date.now();
  const startMs = challenge.startDate.getTime();
  const DAY_MS = 24 * 60 * 60 * 1000;

  const calculatedDay = Math.floor((now - startMs) / DAY_MS) + 1;
  const currentDay = Math.min(
    challenge.durationDays,
    Math.max(1, calculatedDay)
  );

  // ⛔ گارد امنیتی هماهنگ: جلوگیری از ثبت زمان برای روزهایی که از روز جاری چالش بزرگتر هستند
  if (data.dayIndex > currentDay - 1) {
    throw new AppError(
      'شما مجاز به ثبت یا ویرایش زمان برای روزهای آینده چالش نیستید.',
      400,
      'FUTURE_DAY_LOG_NOT_ALLOWED'
    );
  }

  // محاسبه تاریخ روز هدف جهت ثبت دقیق سند در دیتابیس
  const targetDate = new Date(startMs + data.dayIndex * DAY_MS);

  const calculatedMinutes = data.hours * 60 + data.minutes;
  const MAX_MINUTES_PER_DAY = 20 * 60; // سقف مچ مجاز روزانه: ۲۰ ساعت

  // ۴. گارد سخت‌گیرانه ضد تقلب (Anti-Cheat Layer)
  if (calculatedMinutes > MAX_MINUTES_PER_DAY) {
    throw new AppError(
      `سقف مجاز روزانه رد شد! شما مجاز به ثبت بیش از ۲۰ ساعت مطالعه در یک روز نیستید.`,
      400,
      'ANTI_CHEAT_LIMIT_EXCEEDED'
    );
  }

  // ۵. جستجوی رکورد پیشین و اعمال تغییرات به صورت اتمیک در دیتابیس
  const existingLog = await TimeLogModel.findOne({
    challengeId: challenge._id,
    telegramId,
    date: targetDate
  });

  let oldMinutes = 0;
  if (existingLog) {
    oldMinutes = existingLog.minutes;
    existingLog.minutes = calculatedMinutes;
    await existingLog.save();
  } else {
    await TimeLogModel.create({
      tenantId: tenantObjectId,
      challengeId: challenge._id,
      telegramId,
      date: targetDate,
      minutes: calculatedMinutes
    });
  }

  // ۶. لایه همگام‌سازی زنده با گروه تلگرام (Telegram Group Synchronization Layer)
  const tenant = await TenantModel.findById(tenantObjectId).lean();
  if (tenant && tenant.chatId) {
    const user = await UserModel.findOne({ telegramId }).lean();
    const membership = await TenantMemberModel.findOne({
      tenantId: tenantObjectId,
      telegramId
    }).lean();

    // تعیین هویت کاربر با اولویت قطعی نام مستعار درون‌گروهی
    let userName = 'کاربر چالش';
    if (membership?.alias) {
      userName = membership.alias;
    } else if (user) {
      userName =
        `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`.trim();
    }

    const notificationMsg =
      `⏱ کاربر 👤 **${userName}** زمان خود را از طریق مینی‌اپ به‌روزرسانی کرد.\n` +
      `📅 مربوط به: **روز ${data.dayIndex + 1} چالش**\n` +
      `✏️ تغییر زمان از ${formatMinutesToTime(oldMinutes)} به **${formatMinutesToTime(calculatedMinutes)}**\n` +
      `📊 مجموع ساعت نهایی این روز: **${formatMinutesToTime(calculatedMinutes)}**`;

    const sendOptions: any = { parse_mode: 'Markdown' };
    if (tenant.topicId) sendOptions.message_thread_id = tenant.topicId;

    // حذف خودکار و اتمیک پیام لیدربرد و جداکننده قبلی گروه جهت جلوگیری از انباشت اسپم
    if (challenge.lastDividerMessageId) {
      await botService
        .getBot()
        .telegram.deleteMessage(tenant.chatId, challenge.lastDividerMessageId)
        .catch(() => {});
    }
    if (challenge.lastLeaderboardMessageId) {
      await botService
        .getBot()
        .telegram.deleteMessage(
          tenant.chatId,
          challenge.lastLeaderboardMessageId
        )
        .catch(() => {});
    }

    // ارسال پیام اعلان لاگ زمان جدید به تاپیک قفل شده گروه
    await botService
      .getBot()
      .telegram.sendMessage(tenant.chatId, notificationMsg, sendOptions)
      .catch(() => {});

    // شلیک و تزریق لیدربرد تجدید شده جدید به تاپیک گروه
    const dividerMsg = await botService
      .getBot()
      .telegram.sendMessage(tenant.chatId, '➖➖➖➖➖➖➖➖➖', sendOptions)
      .catch(() => null);
    const leaderboardStr = await generateLeaderboardText(challenge._id);

    if (leaderboardStr) {
      const sentLbMsg = await botService
        .getBot()
        .telegram.sendMessage(tenant.chatId, leaderboardStr, sendOptions)
        .catch(() => null);

      // ذخیره‌سازی پیام‌های جدید در چالش جهت چرخه‌های حذف بعدی
      await ChallengeModel.findByIdAndUpdate(challenge._id, {
        $set: {
          lastDividerMessageId: dividerMsg ? dividerMsg.message_id : null,
          lastLeaderboardMessageId: sentLbMsg ? sentLbMsg.message_id : null
        }
      });
    }
  }

  return {
    dayIndex: data.dayIndex,
    updatedTotalMinutes: calculatedMinutes
  };
};

/**
 * سرویس واکشی لیست تمام زمان‌های لاگ شده کاربر جاری برای چالش فعال مستأجر
 */
export const getUserTimeLogsService = async (
  telegramId: number,
  tenantId: string
): Promise<Array<{ dayIndex: number; minutes: number }>> => {
  const tenantObjectId = new mongoose.Types.ObjectId(tenantId);
  const challenge = await ChallengeModel.findOne({
    tenantId: tenantObjectId,
    status: 'active'
  });
  if (!challenge) return [];

  const timeLogs = await TimeLogModel.find({
    challengeId: challenge._id,
    telegramId
  }).lean();

  const startMs = challenge.startDate.getTime();
  const DAY_MS = 24 * 60 * 60 * 1000;

  return timeLogs.map((log) => {
    const dayIndex = Math.round((log.date.getTime() - startMs) / DAY_MS);
    return {
      dayIndex,
      minutes: log.minutes
    };
  });
};
