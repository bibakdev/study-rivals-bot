// apps/backend/src/modules/telegram-bot/commands/start/deep-link.action.ts

import { Context } from 'telegraf';
import mongoose from 'mongoose';
import { UserModel } from '#modules/auth/user.model';
import { TenantModel } from '#modules/tenant/tenant.model';
import { TenantMemberModel } from '#modules/tenant/tenant-member.model';
import { logger } from '#utils/logger';
import { grantDashboardAccess } from './start.utils';

export const handleDeepLink = async (
  ctx: Context,
  payload: string,
  telegramId: number
): Promise<void> => {
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
    // بررسی وضعیت عضویت در گروه تلگرامی
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

    // ۱. ثبت یا آپدیت اطلاعات کاربر در سیستم اصلی با نقش پلتفرمی standard
    const updatedUser = await UserModel.findOneAndUpdate(
      { telegramId },
      {
        $set: {
          firstName: ctx.from?.first_name || 'کاربر',
          lastName: ctx.from?.last_name,
          username: ctx.from?.username,
          languageCode: ctx.from?.language_code
        },
        $setOnInsert: { role: 'standard' }
      },
      { upsert: true, new: true }
    );

    // ۲. ایجاد رکورد اختصاصی عضویت کاربر در این مستأجر (گروه) با نقش پیش‌فرض user
    // استفاده از $setOnInsert باعث می‌شود اگر کاربر قبلاً ادمین گروه بوده، نقشش از بین نرود
    const tenantMember = await TenantMemberModel.findOneAndUpdate(
      {
        telegramId,
        tenantId: new mongoose.Types.ObjectId(tenantId)
      },
      {
        $setOnInsert: { tenantRole: 'user' }
      },
      { upsert: true, new: true }
    );

    logger.info(
      `User enrolled via deep link. TenantId: ${tenantId}, TelegramId: ${telegramId}`
    );

    // تعیین نقش برای کیبورد: اگر مالک کل پلتفرم (mother) باشد همان می‌ماند،
    // در غیر این صورت نقش درون‌گروهی‌اش (tenantRole) اعمال می‌شود
    const actualRole =
      updatedUser.role === 'mother' ? 'mother' : tenantMember.tenantRole;

    await grantDashboardAccess(
      ctx,
      `🎉 خوش آمدید ${ctx.from?.first_name || 'کاربر'} عزیز!\nعضویت شما در چالش تأیید شد.\n\n` +
        `📱 **جهت ورود به اپلیکیشن، روی دکمه آبی‌رنگ (Open) کلیک کنید.**`,
      actualRole as 'mother' | 'main_admin' | 'sub_admin' | 'user'
    );
  } catch (tgError: unknown) {
    logger.error('Failed to verify group membership:', tgError);
    await ctx.reply('⚠️ خطایی در تایید وضعیت عضویت شما رخ داد.');
  }
};
