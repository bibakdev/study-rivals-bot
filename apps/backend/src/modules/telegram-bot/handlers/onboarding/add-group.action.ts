// apps/backend/src/modules/telegram-bot/handlers/onboarding/add-group.action.ts

import { Context, Markup } from 'telegraf';
import { logger } from '#utils/logger';

export const handleAddGroupRequest = async (ctx: Context): Promise<void> => {
  try {
    // ۱. بستن حالت لودینگ دکمه شیشه‌ای
    await ctx.answerCbQuery().catch((err) => {
      logger.warn(`Ignored answerCbQuery error: ${err.description}`);
    });

    // ۲. ویرایش پیام و درخواست کد لایسنس به همراه دکمه انصراف
    await ctx
      .editMessageText(
        '🔑 برای فعال‌سازی ربات، لطفاً **کد لایسنس ۱۶ رقمی** اختصاصی خود را ارسال کنید:',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              // بازگشت مستقیم به منوی "مدیریت گروه‌ها"
              [Markup.button.callback('🔙 انصراف', 'action_manage_groups')]
            ]
          }
        }
      )
      .catch((err) => {
        logger.warn(`Could not edit message in add-group: ${err.description}`);
      });
  } catch (error) {
    logger.error('Error handling add group action:', error);

    // ۳. جلوگیری از کرش کردن در صورت خطا
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد. لطفا دوباره تلاش کنید.', {
        show_alert: true
      })
      .catch(() => {});
  }
};
