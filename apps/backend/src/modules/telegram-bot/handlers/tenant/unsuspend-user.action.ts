// apps/backend/src/modules/telegram-bot/handlers/tenant/unsuspend-user.action.ts

import { Context, Markup } from 'telegraf';
import mongoose from 'mongoose';
import { TenantMemberModel } from '#modules/tenant/tenant-member.model';
import { UserModel } from '#modules/auth/user.model';
import { logger } from '#utils/logger';

export const handleUnsuspendUserRequest = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const tenantId = ctx.match[1];
    await ctx.answerCbQuery().catch(() => {});

    const suspendedMembers = await TenantMemberModel.find({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      isSuspended: true
    }).lean();

    if (suspendedMembers.length === 0) {
      await ctx
        .editMessageText(
          '✅ **لیست خالی است**\n\nهیچ کاربر معلقی در این گروه وجود ندارد.',
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  Markup.button.callback(
                    '🔙 بازگشت',
                    `select_tenant_${tenantId}`
                  )
                ]
              ]
            }
          }
        )
        .catch(() => {});
      return;
    }

    const userIds = suspendedMembers.map((m) => m.telegramId);
    const usersInfo = await UserModel.find({
      telegramId: { $in: userIds }
    }).lean();

    const inlineKeyboard = usersInfo.map((u) => {
      const fullName = u.firstName + (u.lastName ? ` ${u.lastName}` : '');
      return [
        Markup.button.callback(
          `✅ ${fullName}`,
          `do_unsuspend_${tenantId}_${u.telegramId}`
        )
      ];
    });

    inlineKeyboard.push([
      Markup.button.callback('🔙 انصراف', `select_tenant_${tenantId}`)
    ]);

    await ctx
      .editMessageText(
        '✅ **رفع تعلیق کاربر**\n\nلطفاً برای بازیابی دسترسی، کاربر مورد نظر را انتخاب کنید:',
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: inlineKeyboard }
        }
      )
      .catch(() => {});
  } catch (error) {
    logger.error('Error handling unsuspend user list:', error);
  }
};
