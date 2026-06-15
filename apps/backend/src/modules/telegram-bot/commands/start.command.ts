// apps/backend/src/modules/telegram-bot/commands/start.command.ts

import { Context } from 'telegraf';
import mongoose from 'mongoose';
import { UserModel } from '#modules/auth/user.model';
import { ForbiddenUserModel } from '#modules/auth/forbidden-user.model';
import { TenantModel } from '#modules/tenant/tenant.model';
import { logger } from '#utils/logger';
import {
  getStartKeyboard,
  getWebAppMenuButton
} from '#modules/telegram-bot/utils/keyboards.util';

interface ExtendedContext extends Context {
  payload?: string;
}

export const startCommand = async (
  ctx: ExtendedContext,
  next: () => Promise<void>
): Promise<void> => {
  if (ctx.chat?.type !== 'private') return next();

  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const grantDashboardAccess = async (
    welcomeMessage: string,
    role: 'mother' | 'main_admin' | 'sub_admin' | 'user' | 'guest'
  ): Promise<void> => {
    await ctx.setChatMenuButton(getWebAppMenuButton());
    await ctx.reply(welcomeMessage, { reply_markup: getStartKeyboard(role) });
  };

  try {
    const isForbidden = await ForbiddenUserModel.findOne({
      telegramId,
      isBlacklisted: true
    }).lean();
    if (isForbidden) {
      await ctx.setChatMenuButton({ type: 'default' });
      await ctx.reply('❌ حساب کاربری شما مسدود شده است.');
      return;
    }

    const payload = ctx.payload;

    // ------------------------------------------------------------------
    // جریان ورود با لینک دعوت اختصاصی گروه (Deep Link Payload)
    // ------------------------------------------------------------------
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
            '❌ شما عضو گروه این چالش نیستید و امکان ثبت‌نام ندارید.'
          );
          return;
        }

        // آپدیت اطلاعات کاربر و دریافت نقش واقعی او در قالب updatedUser
        const updatedUser = await UserModel.findOneAndUpdate(
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
          { upsert: true, new: true } // 👈 new: true باعث می‌شود داکیومنت جدید/بروز شده برگردد
        );

        logger.info(
          `User enrolled via deep link. TenantId: ${tenantId}, TelegramId: ${telegramId}`
        );

        // 💡 فیکس اصلی: استخراج نقش واقعی کاربر از دیتابیس به جای هاردکد کردن 'user'
        const actualRole = updatedUser.role as
          | 'mother'
          | 'main_admin'
          | 'sub_admin'
          | 'user';

        await grantDashboardAccess(
          `🎉 خوش آمدید ${ctx.from?.first_name || 'کاربر'} عزیز!\nعضویت شما در چالش تأیید شد.\n\n` +
            `📱 **جهت ورود به اپلیکیشن، روی دکمه آبی‌رنگ (Open) کلیک کنید.**`,
          actualRole
        );
        return;
      } catch (tgError: unknown) {
        logger.error('Failed to verify group membership:', tgError);
        await ctx.reply('⚠️ خطایی در تایید وضعیت عضویت شما رخ داد.');
        return;
      }
    }

    // ------------------------------------------------------------------
    // جریان ورود با دستور عادی /start
    // ------------------------------------------------------------------
    const user = await UserModel.findOne({ telegramId }).lean();

    if (user && ['mother', 'main_admin', 'sub_admin'].includes(user.role)) {
      await grantDashboardAccess(
        `👑 خوش آمدید ${ctx.from?.first_name || 'ادمین'} عزیز.\n\n` +
          `⚙️ **برای باز کردن کنترل‌پنل مدیریت چالش‌ها، روی دکمه آبی‌رنگ (Open) کلیک کنید.**\n\n` +
          `🤖 تنظیمات داخلی ربات:`,
        user.role as 'mother' | 'main_admin' | 'sub_admin'
      );
      return;
    }

    if (user && user.role === 'user') {
      await grantDashboardAccess(
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
  } catch (error) {
    logger.error('Error processing startCommand structure:', error);
    await ctx.reply('⚠️ خطایی رخ داد. مجدداً دستور /start را ارسال کنید.');
  }
};
