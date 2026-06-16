// apps/backend/src/modules/telegram-bot/handlers/tenant/do-unsuspend.action.ts

import { Context, Markup } from 'telegraf';
import mongoose from 'mongoose';
import { TenantMemberModel } from '#modules/tenant/tenant-member.model';
import { UserModel } from '#modules/auth/user.model';
import { logger } from '#utils/logger';

export const handleDoUnsuspend = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const tenantId = ctx.match[1];
    const targetTelegramId = Number(ctx.match[2]);
    const promoterId = ctx.from?.id;

    await ctx.answerCbQuery().catch(() => {});
    if (!promoterId) return;

    // بررسی دسترسی (مانند فایل‌های قبل)
    const promoterUser = await UserModel.findOne({
      telegramId: promoterId
    }).lean();
    let isAuthorized = promoterUser?.role === 'mother';

    if (!isAuthorized) {
      const membership = await TenantMemberModel.findOne({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        telegramId: promoterId
      }).lean();
      isAuthorized = membership?.tenantRole === 'main_admin';
    }

    if (!isAuthorized) return;

    // رفع تعلیق
    await TenantMemberModel.updateOne(
      {
        tenantId: new mongoose.Types.ObjectId(tenantId),
        telegramId: targetTelegramId
      },
      { $set: { isSuspended: false } }
    );

    const targetUser = await UserModel.findOne({
      telegramId: targetTelegramId
    }).lean();
    const targetName = targetUser ? targetUser.firstName : 'کاربر';

    await ctx
      .editMessageText(
        `✅ **موفقیت‌آمیز**\n\nکاربر **${targetName}** از حالت تعلیق خارج شد و مجدداً به پنل خود دسترسی دارد.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [Markup.button.callback('🔙 بازگشت', `select_tenant_${tenantId}`)]
            ]
          }
        }
      )
      .catch(() => {});

    logger.info(
      `User ${targetTelegramId} unsuspended in Tenant ${tenantId} by ${promoterId}`
    );
  } catch (error) {
    logger.error('Error handling unsuspend action:', error);
  }
};
