// apps/backend/src/modules/telegram-bot/handlers/time-log/log-time-menu.action.ts

import { Context, Markup } from 'telegraf';
import mongoose from 'mongoose';
import jalaali from 'jalaali-js';
import { ChallengeModel } from '#modules/challenge/challenge.model';
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

export const handleLogTimeMenuRequest = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const tenantId = ctx.match[1];
    await ctx.answerCbQuery().catch(() => {});

    // جستجوی چالش در حال اجرا (Active) برای این گروه
    const challenge = await ChallengeModel.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      status: 'active'
    }).lean();

    if (!challenge) {
      await ctx
        .editMessageText(
          '❌ در حال حاضر هیچ چالشی در این گروه در حال اجرا نیست.',
          {
            reply_markup: {
              inline_keyboard: [
                [
                  Markup.button.callback(
                    '🔙 بازگشت',
                    `select_tenant_${tenantId}`
                  )
                ]
              ]
            }
          }
        )
        .catch(() => {});
      return;
    }

    const now = Date.now();
    const startMs = challenge.startDate.getTime();
    const duration = challenge.durationDays;
    const DAY_MS = 24 * 60 * 60 * 1000; // میلی‌ثانیه‌های یک شبانه‌روز

    const inlineKeyboard = [];

    // حلقه به تعداد کل روزهای چالش
    for (let i = 0; i < duration; i++) {
      const targetDateMs = startMs + i * DAY_MS;

      // بررسی: آیا زمان فعلی از تاریخ شروع این «روز خاص» عبور کرده است؟
      if (now >= targetDateMs) {
        // تبدیل تاریخ میلادی به شمسی جهت نمایش
        const dateObj = new Date(targetDateMs);
        const { jd, jm } = jalaali.toJalaali(dateObj);
        const dateLabel = `${jd} ${PERSIAN_MONTHS[jm - 1]}`;

        inlineKeyboard.push([
          Markup.button.callback(
            `روز ${i + 1}: ${dateLabel}`,
            `action_log_time_day_${challenge._id}_${i}` // 👈 این اکشن برای فرمان بعدی شما آماده شده است
          )
        ]);
      }
    }

    // دکمه بازگشت همیشه در انتها
    inlineKeyboard.push([
      Markup.button.callback('🔙 بازگشت', `select_tenant_${tenantId}`)
    ]);

    let message = `⏱ **ثبت ساعت مطالعه**\n\n`;

    // اگر فقط دکمه بازگشت در آرایه باشد (یعنی length مساوی 1 است)
    if (inlineKeyboard.length === 1) {
      message += `⏳ چالش فعال است، اما هنوز به تاریخ شروع روز اول نرسیده‌ایم.`;
    } else {
      message += `لطفاً روزی که قصد ثبت زمان برای آن را دارید انتخاب کنید:\n(روزهای جدید به صورت خودکار هر ۲۴ ساعت ظاهر می‌شوند)`;
    }

    await ctx
      .editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: inlineKeyboard }
      })
      .catch(() => {});
  } catch (error) {
    logger.error('Error handling log time menu action:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};
