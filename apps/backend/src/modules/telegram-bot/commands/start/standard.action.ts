// apps/backend/src/modules/telegram-bot/commands/start/standard.action.ts

import { Context, Markup } from 'telegraf';
import { UserModel } from '#modules/auth/user.model';
import { TenantMemberModel } from '#modules/tenant/tenant-member.model';
import { getUserActiveTenants } from '#modules/telegram-bot/services/user-tenants.service';
import { grantDashboardAccess } from './start.utils';

export const handleStandardStart = async (
  ctx: Context,
  telegramId: number
): Promise<void> => {
  const user = await UserModel.findOne({ telegramId }).lean();

  // فراخوانی سرویس برای دریافت لیست گروه‌های فعال کاربر
  const tenants = await getUserActiveTenants(telegramId);

  // حالت اول: کاربر در ۰ گروه عضو است
  if (tenants.length === 0) {
    // تبصره معماری: استثنا برای اکانت مادر که بتواند حتی بدون داشتن گروه، پنل را باز کرده و لایسنس تولید کند
    if (user?.role === 'mother') {
      await grantDashboardAccess(
        ctx,
        `👑 خوش آمدید مالک پلتفرم.\n\nدر حال حاضر هیچ چالش فعالی در سیستم وجود ندارد.\n\n🤖 تنظیمات داخلی ربات:`,
        'mother'
      );
      return;
    }

    // کاربر عادی که در هیچ گروهی نیست (پیام Fallback)
    await ctx.setChatMenuButton({ type: 'default' });
    await ctx.reply(
      `به سرزمین رقابت و چالش‌های مطالعاتی خوش آمدید! 🎯\n\n` +
        `برای فعال‌سازی ربات، لطفاً **کد لایسنس ۱۶ رقمی** خود را ارسال کنید.`
    );
    return;
  }

  // حالت دوم: کاربر در بیش از ۱ گروه عضو است
  if (tenants.length > 1) {
    // غیرفعال کردن دکمه وب‌اپ (برگرداندن به حالت دیفالت) در این مرحله
    await ctx.setChatMenuButton({ type: 'default' });

    // ساخت کیبورد شیشه‌ای با شناسه‌های یکتا
    const buttons = tenants.map((tenant, index) => {
      // استفاده از آیدی گروه یا یک نام پیش‌فرض (در صورت نبود آیدی)
      const groupName = tenant.chatId
        ? `گروه ${tenant.chatId}`
        : `چالش ${index + 1}`;
      return [
        Markup.button.callback(
          groupName,
          `select_tenant_${tenant._id.toString()}`
        )
      ];
    });

    await ctx.reply(
      `🎯 شما در بیش از یک چالش عضو هستید.\nلطفاً گروه مورد نظر خود را برای ورود انتخاب کنید:`,
      Markup.inlineKeyboard(buttons)
    );
    return;
  }

  // حالت سوم: کاربر دقیقاً در ۱ گروه عضو است
  const singleTenant = tenants[0];
  let actualRole: 'mother' | 'main_admin' | 'sub_admin' | 'user' = 'user';

  // محاسبه دقیق نقش کاربر برای این یک گروه
  if (user?.role === 'mother') {
    actualRole = 'mother';
  } else {
    const membership = await TenantMemberModel.findOne({
      telegramId,
      tenantId: singleTenant._id
    }).lean();

    if (membership) {
      actualRole = membership.tenantRole;
    }
  }

  // ارسال پیام‌های خوش‌آمدگویی و فعال‌سازی دکمه آبی بسته به نقش استخراج شده
  if (['mother', 'main_admin', 'sub_admin'].includes(actualRole)) {
    await grantDashboardAccess(
      ctx,
      `👑 خوش آمدید ${ctx.from?.first_name || 'ادمین'} عزیز.\n\n` +
        `⚙️ **برای باز کردن کنترل‌پنل مدیریت چالش‌ها، روی دکمه آبی‌رنگ (Open) کلیک کنید.**\n\n` +
        `🤖 تنظیمات داخلی ربات:`,
      actualRole
    );
  } else {
    await grantDashboardAccess(
      ctx,
      `🎯 خوش آمدید ${ctx.from?.first_name || 'کاربر'} عزیز.\n\n` +
        `📊 **جهت مشاهده داشبورد مسابقات، روی دکمه آبی‌رنگ (Open) کلیک کنید.**\n\n` +
        `🤖 گزینه‌های ربات:`,
      'user'
    );
  }
};
