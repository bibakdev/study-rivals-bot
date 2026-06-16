// apps/backend/src/modules/telegram-bot/commands/start/standard.action.ts

import { Context } from 'telegraf';
import { UserModel } from '#modules/auth/user.model';
import { getStartKeyboard } from '#modules/telegram-bot/utils/keyboards.util';

export const handleStandardStart = async (
  ctx: Context,
  telegramId: number
): Promise<void> => {
  // دریافت اطلاعات کاربر برای تشخیص نقش (اکانت مادر یا عادی)
  const user = await UserModel.findOne({ telegramId }).lean();
  const role = user?.role === 'mother' ? 'mother' : 'user';

  // غیرفعال کردن دکمه وب‌اپ (چون هنوز گروهی انتخاب نکرده است)
  await ctx.setChatMenuButton({ type: 'default' });

  // ارسال پیام ثابت منوی اصلی
  await ctx.reply(
    `به سرزمین رقابت و چالش‌های مطالعاتی خوش آمدید! 🎯\n\nبرای شروع، از منوی زیر استفاده کنید:`,
    { reply_markup: getStartKeyboard(role) }
  );
};
