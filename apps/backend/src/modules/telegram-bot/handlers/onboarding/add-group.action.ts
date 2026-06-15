// apps/backend/src/modules/telegram-bot/handlers/onboarding/add-group.action.ts

import { Context } from 'telegraf';
import { logger } from '#utils/logger';

export const handleAddGroupRequest = async (ctx: Context): Promise<void> => {
  try {
    // ۱. بستن حالت لودینگ دکمه شیشه‌ای با قابلیت نادیده گرفتن خطای انقضا
    await ctx.answerCbQuery().catch((err) => {
      logger.warn(`Ignored answerCbQuery error: ${err.description}`);
    });

    // ۲. درخواست کد لایسنس از کاربر
    await ctx.reply(
      '🔑 برای فعال‌سازی ربات، لطفاً **کد لایسنس ۱۶ رقمی** اختصاصی خود را ارسال کنید:',
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    logger.error('Error handling add group action:', error);

    // ۳. جلوگیری از کرش کردن مجدد سرور در صورت بروز خطا در بلاک catch
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد. لطفا دوباره تلاش کنید.', {
        show_alert: true
      })
      .catch(() => {});
  }
};
