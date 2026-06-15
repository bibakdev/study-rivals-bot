// apps/backend/src/modules/telegram-bot/commands/start.command.ts

import { Context } from 'telegraf';
import { UserModel } from '#modules/auth/user.model';
import { ForbiddenUserModel } from '#modules/auth/forbidden-user.model';
import { env } from '#config/env';

export const startCommand = async (ctx: Context): Promise<void> => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  try {
    // ۱. بررسی وضعیت مسدودیت در لیست سیاه
    const isForbidden = await ForbiddenUserModel.findOne({
      telegramId,
      isBlacklisted: true
    });
    if (isForbidden) {
      await ctx.reply(
        '❌ حساب کاربری شما به دلیل تلاش‌های ناموفق مکرر برای ورود لایسنس مسدود شده است.'
      );
      return;
    }

    // ۲. بررسی وجود حساب کاربر و بررسی نقش او
    const user = await UserModel.findOne({ telegramId });

    if (
      user &&
      (user.role === 'mother' ||
        user.role === 'main_admin' ||
        user.role === 'sub_admin')
    ) {
      await ctx.reply(
        `👑 خوش آمدید ${ctx.from?.first_name || 'کاربر'} عزیز.\nشما دسترسی ادمین دارید. برای مدیریت و مشاهده وضعیت چالش‌ها روی دکمه زیر کلیک کنید:`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '🎯 ورود به اپلیکیشن مطالعاتی',
                  web_app: { url: env.MINI_APP_URL }
                }
              ]
            ]
          }
        }
      );
      return;
    }

    // ۳. وضعیت پیش‌فرض برای کاربرانی که هنوز فعال‌سازی لایسنس نکرده‌اند
    await ctx.reply(
      `به سرزمین رقابت و چالش‌های مطالعاتی خوش آمدید! 🎯\n\n` +
        `برای فعال‌سازی ربات در این گروه یا ثبت اکانت ادمین، لطفاً **کد لایسنس ۱۶ رقمی** خود را ارسال کنید.\n\n` +
        `💡 نکته: اگر شما مالک اصلی سیستم هستید، کد محرمانه تنظیم شده در سرور را ارسال نمایید.\n` +
        `⚠️ هشدارهای امنیتی: در صورت ۳ بار ورود لایسنس اشتباه، دسترسی شما برای همیشه مسدود خواهد شد.`
    );
  } catch (error) {
    await ctx.reply(
      '⚠️ خطایی در بارگذاری اطلاعات اولیه رخ داد. لطفاً مجدداً دستور /start را ارسال کنید.'
    );
  }
};
