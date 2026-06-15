// apps/backend/src/modules/telegram-bot/handlers/tenant/tenant.utils.ts

import { Context } from 'telegraf';
import mongoose from 'mongoose';
import { Update } from 'telegraf/types';
import { UserModel } from '#modules/auth/user.model';
import { TenantMemberModel } from '#modules/tenant/tenant-member.model';

interface ThreadMessage {
  message_thread_id?: number;
}

export const getTopicId = (ctx: Context<Update>): number | undefined => {
  if (ctx.message && 'message_thread_id' in ctx.message) {
    const msg = ctx.message as ThreadMessage;
    return typeof msg.message_thread_id === 'number'
      ? msg.message_thread_id
      : undefined;
  }
  return undefined;
};

export const generateEnrollmentKeyboard = (
  botUsername: string,
  tenantId: mongoose.Types.ObjectId
) => {
  if (!botUsername) throw new Error('CRITICAL: Bot username is undefined');
  return {
    inline_keyboard: [
      [
        {
          text: '🎯 ثبت‌نام و ورود به چالش',
          url: `https://t.me/${botUsername}?start=ref_${tenantId.toString()}`
        }
      ]
    ]
  };
};

export const promoteToAdmin = async (
  telegramId: number,
  ctx: Context<Update>,
  tenantId: mongoose.Types.ObjectId
): Promise<void> => {
  // ۱. اطمینان از وجود کاربر در سیستم یکپارچه با نقش پایه و پیش‌فرض (standard)
  await UserModel.findOneAndUpdate(
    { telegramId },
    {
      $setOnInsert: {
        firstName: ctx.from?.first_name || 'ادمین',
        lastName: ctx.from?.last_name,
        username: ctx.from?.username,
        languageCode: ctx.from?.language_code,
        role: 'standard'
      }
    },
    { upsert: true }
  );

  // ۲. ایجاد یا آپدیت رکورد اختصاصی کاربر در گروه مربوطه به عنوان ادمین اصلی
  await TenantMemberModel.findOneAndUpdate(
    { telegramId, tenantId },
    {
      $set: { tenantRole: 'main_admin' }
    },
    { upsert: true }
  );
};
