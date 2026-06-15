// apps/backend/src/modules/telegram-bot/commands/start.command.ts

import { Context } from 'telegraf';
import mongoose from 'mongoose';
import { UserModel } from '#modules/auth/user.model';
import { ForbiddenUserModel } from '#modules/auth/forbidden-user.model';
import { TenantModel } from '#modules/tenant/tenant.model';
import { env } from '#config/env';
import { logger } from '#utils/logger';

interface ExtendedContext extends Context {
  payload?: string;
}

// کپسوله‌سازی منطق نمایشی (Presentational Constants) برای رعایت اصل DRY
const WEB_APP_MENU_BUTTON = {
  type: 'web_app' as const,
  text: 'Open',
  web_app: { url: env.MINI_APP_URL }
};

const BOT_NATIVE_KEYBOARD = {
  inline_keyboard: [
    [
      { text: '👤 پروفایل تلگرامی من', callback_data: 'action_profile' },
      { text: '❓ راهنمای چالش‌ها', callback_data: 'action_help' }
    ]
  ]
};

export const startCommand = async (
  ctx: ExtendedContext,
  next: () => Promise<void>
): Promise<void> => {
  // 🚨 مدیریت Edge Case: جلوگیری از رهگیری دستورات گروه توسط هندلر پی‌وی
  if (ctx.chat?.type !== 'private') {
    return next();
  }

  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  // رعایت ماژولاریتی: تابع متمرکز برای اعطای دسترسی پنل
  const grantDashboardAccess = async (
    welcomeMessage: string
  ): Promise<void> => {
    await ctx.setChatMenuButton(WEB_APP_MENU_BUTTON);
    await ctx.reply(welcomeMessage, { reply_markup: BOT_NATIVE_KEYBOARD });
  };

  try {
    // استفاده از lean برای بهینه‌سازی حافظه (Memory Leak Protection در فرآیندهای Read-Only)
    const isForbidden = await ForbiddenUserModel.findOne({
      telegramId,
      isBlacklisted: true
    }).lean();

    if (isForbidden) {
      await ctx.setChatMenuButton({ type: 'default' });
      await ctx.reply(
        '❌ حساب کاربری شما به دلیل تلاش‌های ناموفق مکرر برای ورود لایسنس مسدود شده است.'
      );
      return;
    }

    const payload = ctx.payload;
    if (payload && payload.startsWith('ref_')) {
      const tenantId = payload.replace('ref_', '');

      if (!mongoose.Types.ObjectId.isValid(tenantId)) {
        await ctx.reply('❌ لینک دعوت ارسالی معتبر نمی‌باشد.');
        return;
      }

      const tenant = await TenantModel.findById(tenantId).lean();
      if (!tenant || !tenant.isActive || !tenant.chatId) {
        await ctx.reply(
          '❌ این لینک دعوت منقضی شده یا گروه مربوطه از سیستم حذف شده است.'
        );
        return;
      }

      try {
        const chatMember = await ctx.telegram.getChatMember(
          tenant.chatId,
          telegramId
        );
        const allowedStatuses = [
          'creator',
          'administrator',
          'member',
          'restricted'
        ];

        if (!allowedStatuses.includes(chatMember.status)) {
          await ctx.reply(
            '❌ شما عضو گروه این چالش مطالعاتی نیستید و امکان ثبت‌نام از این طریق را ندارید.'
          );
          return;
        }

        await UserModel.findOneAndUpdate(
          { telegramId },
          {
            $set: {
              firstName: ctx.from?.first_name || 'کاربر',
              lastName: ctx.from?.last_name,
              username: ctx.from?.username,
              languageCode: ctx.from?.language_code
            },
            $setOnInsert: { role: 'user' }
          },
          { upsert: true, new: true }
        );

        logger.info(
          `User successfully enrolled via group deep link. TenantId: ${tenantId}, TelegramId: ${telegramId}`
        );

        await grantDashboardAccess(
          `🎉 خوش آمدید ${ctx.from?.first_name || 'کاربر'} عزیز!\nعضویت شما در چالش تأیید شد.\n\n` +
            `📱 **جهت ورود به اپلیکیشن و مشاهده پنل خود، روی دکمه آبی‌رنگ (Open) در پایین صفحه کلیک کنید.**\n\n` +
            `🤖 همچنین برای تعامل با خود ربات می‌توانید از دکمه‌های زیر استفاده نمایید:`
        );
        return;
      } catch (tgError: unknown) {
        logger.error(
          'Failed to verify group membership through getChatMember:',
          tgError
        );
        await ctx.reply(
          '⚠️ خطایی در تایید وضعیت عضویت شما رخ داد. لطفاً اطمینان حاصل کنید که هنوز در گروه حضور دارید.'
        );
        return;
      }
    }

    const user = await UserModel.findOne({ telegramId }).lean();

    if (user && ['mother', 'main_admin', 'sub_admin'].includes(user.role)) {
      await grantDashboardAccess(
        `👑 خوش آمدید ${ctx.from?.first_name || 'کاربر'} عزیز.\nشما دسترسی مدیریتی دارید.\n\n` +
          `⚙️ **برای باز کردن کنترل‌پنل مدیریت چالش‌ها، روی دکمه آبی‌رنگ (Open) در گوشه سمت چپ پایین کلیک کنید.**\n\n` +
          `🤖 تنظیمات داخلی ربات:`
      );
      return;
    }

    if (user && user.role === 'user') {
      await grantDashboardAccess(
        `🎯 خوش آمدید ${ctx.from?.first_name || 'کاربر'} عزیز.\n\n` +
          `📊 **جهت مشاهده داشبورد مسابقات و جدول امتیازات، روی دکمه آبی‌رنگ (Open) در پایین صفحه کلیک کنید.**\n\n` +
          `🤖 گزینه‌های ربات:`
      );
      return;
    }

    // وضعیت Fallback برای کاربران غریبه
    await ctx.setChatMenuButton({ type: 'default' });
    await ctx.reply(
      `به سرزمین رقابت و چالش‌های مطالعاتی خوش آمدید! 🎯\n\n` +
        `برای فعال‌سازی ربات در این گروه یا ثبت اکانت ادمین، لطفاً **کد لایسنس ۱۶ رقمی** خود را ارسال کنید.\n\n` +
        `💡 نکته: اگر شما مالک اصلی پلتفرم هستید، کد محرمانه تنظیم شده در سرور را بفرستید.\n` +
        `⚠️ هشدارهای امنیتی: در صورت ۳ بار ورود لایسنس اشتباه، دسترسی شما برای همیشه مسدود خواهد شد.`
    );
  } catch (error) {
    logger.error('Error processing startCommand structure:', error);
    await ctx.reply(
      '⚠️ خطایی در بارگذاری اطلاعات اولیه رخ داد. لطفاً مجدداً دستور /start را ارسال کنید.'
    );
  }
};
