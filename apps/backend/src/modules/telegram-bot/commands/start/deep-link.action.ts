import { Context } from 'telegraf';
import mongoose from 'mongoose';
import { UserModel } from '#modules/auth/user.model';
import { TenantModel } from '#modules/tenant/tenant.model';
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
      { upsert: true, new: true }
    );

    logger.info(
      `User enrolled via deep link. TenantId: ${tenantId}, TelegramId: ${telegramId}`
    );

    const actualRole = updatedUser.role as
      | 'mother'
      | 'main_admin'
      | 'sub_admin'
      | 'user';

    await grantDashboardAccess(
      ctx,
      `🎉 خوش آمدید ${ctx.from?.first_name || 'کاربر'} عزیز!\nعضویت شما در چالش تأیید شد.\n\n` +
        `📱 **جهت ورود به اپلیکیشن، روی دکمه آبی‌رنگ (Open) کلیک کنید.**`,
      actualRole
    );
  } catch (tgError: unknown) {
    logger.error('Failed to verify group membership:', tgError);
    await ctx.reply('⚠️ خطایی در تایید وضعیت عضویت شما رخ داد.');
  }
};
