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
    const telegramId = ctx.from?.id;

    await ctx.answerCbQuery().catch(() => {});

    if (!telegramId) return;

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

    // ⛔ گارد امنیتی: بررسی عضویت کاربر در یکی از تیم‌های چالش
    const isParticipating = challenge.teams.some((team) =>
      team.members.includes(telegramId)
    );

    if (!isParticipating) {
      await ctx
        .editMessageText(
          '⛔️ **عدم دسترسی**\n\nشما در هیچ‌یک از تیم‌های این چالش حضور ندارید.\nفقط شرکت‌کنندگانی که در لیست تیم‌ها قرار دارند مجاز به ثبت ساعت مطالعه می‌باشند.',
          {
            parse_mode: 'Markdown',
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
    const DAY_MS = 24 * 60 * 60 * 1000;
    const TEHRAN_OFFSET = 3.5 * 60 * 60 * 1000; // آفست زمان ایران

    // محاسبه دقیق روز سپری شده بر مبنای نیمه‌شب تهران
    const calculatedDay =
      Math.floor((now + TEHRAN_OFFSET - (startMs + TEHRAN_OFFSET)) / DAY_MS) +
      1;
    const currentDay = Math.min(duration, Math.max(1, calculatedDay));

    const inlineKeyboard = [];

    for (let i = 0; i < duration; i++) {
      // دکمه روزها فقط در صورتی نمایش داده می‌شود که آن روز بر مبنای زمان ایران فرا رسیده باشد
      if (i < currentDay) {
        const dateObj = new Date(startMs + i * DAY_MS + TEHRAN_OFFSET);
        const { jd, jm } = jalaali.toJalaali(dateObj);
        const dateLabel = `${jd} ${PERSIAN_MONTHS[jm - 1]}`;

        inlineKeyboard.push([
          Markup.button.callback(
            `روز ${i + 1}: ${dateLabel}`,
            `action_log_time_day_${challenge._id}_${i}`
          )
        ]);
      }
    }

    inlineKeyboard.push([
      Markup.button.callback('🔙 بازگشت', `select_tenant_${tenantId}`)
    ]);

    let message = `⏱ **ثبت ساعت مطالعه**\n\n`;

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
