import { Context } from 'telegraf';
import { UserModel } from '#modules/auth/user.model';
import { grantDashboardAccess } from './start.utils';

export const handleStandardStart = async (
  ctx: Context,
  telegramId: number
): Promise<void> => {
  const user = await UserModel.findOne({ telegramId }).lean();

  if (user && ['mother', 'main_admin', 'sub_admin'].includes(user.role)) {
    await grantDashboardAccess(
      ctx,
      `👑 خوش آمدید ${ctx.from?.first_name || 'ادمین'} عزیز.\n\n` +
        `⚙️ **برای باز کردن کنترل‌پنل مدیریت چالش‌ها، روی دکمه آبی‌رنگ (Open) کلیک کنید.**\n\n` +
        `🤖 تنظیمات داخلی ربات:`,
      user.role as 'mother' | 'main_admin' | 'sub_admin'
    );
    return;
  }

  if (user && user.role === 'user') {
    await grantDashboardAccess(
      ctx,
      `🎯 خوش آمدید ${ctx.from?.first_name || 'کاربر'} عزیز.\n\n` +
        `📊 **جهت مشاهده داشبورد مسابقات، روی دکمه آبی‌رنگ (Open) کلیک کنید.**\n\n` +
        `🤖 گزینه‌های ربات:`,
      'user'
    );
    return;
  }

  // وضعیت Fallback برای کاربران غریبه
  await ctx.setChatMenuButton({ type: 'default' });
  await ctx.reply(
    `به سرزمین رقابت و چالش‌های مطالعاتی خوش آمدید! 🎯\n\n` +
      `برای فعال‌سازی ربات، لطفاً **کد لایسنس ۱۶ رقمی** خود را ارسال کنید.`
  );
};
