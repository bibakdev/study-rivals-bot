// apps/backend/src/modules/telegram-bot/handlers/tenant/back-to-main.action.ts

import { Context } from 'telegraf';
import { UserModel } from '#modules/auth/user.model';
import { getStartKeyboard } from '#modules/telegram-bot/utils/keyboards.util';
import { logger } from '#utils/logger';

export const handleBackToMain = async (ctx: Context): Promise<void> => {
  try {
    // بستن حالت لودینگ دکمه
    await ctx.answerCbQuery().catch(() => {});
    const telegramId = ctx.from?.id;

    if (!telegramId) return;

    // استخراج نقش برای نمایش منوی صحیح
    const user = await UserModel.findOne({ telegramId }).lean();
    const role = user?.role === 'mother' ? 'mother' : 'user';

    // ویرایش متن و کیبورد به حالت منوی اصلی
    await ctx
      .editMessageText(
        'به سرزمین رقابت و چالش‌های مطالعاتی خوش آمدید! 🎯\n\nبرای شروع، از منوی زیر استفاده کنید:',
        { reply_markup: getStartKeyboard(role) }
      )
      .catch((err) => {
        logger.warn(
          `Could not edit message in back-to-main: ${err.description}`
        );
      });
  } catch (error) {
    logger.error('Error handling back to main action:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی در بازگشت به منو رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};
