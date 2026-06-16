// apps/backend/src/modules/telegram-bot/handlers/tenant/do-suspend.action.ts

import { Context, Markup } from 'telegraf';
import mongoose from 'mongoose';
import { TenantMemberModel } from '#modules/tenant/tenant-member.model';
import { UserModel } from '#modules/auth/user.model';
import { logger } from '#utils/logger';

export const handleDoSuspend = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const tenantId = ctx.match[1];
    const targetTelegramId = Number(ctx.match[2]);
    const promoterId = ctx.from?.id;

    await ctx.answerCbQuery().catch(() => {});
    if (!promoterId) return;

    // بررسی دسترسی ادمین
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

    if (!isAuthorized) {
      await ctx
        .answerCbQuery('❌ شما دسترسی لازم را ندارید.', { show_alert: true })
        .catch(() => {});
      return;
    }

    // اعمال تعلیق
    await TenantMemberModel.updateOne(
      {
        tenantId: new mongoose.Types.ObjectId(tenantId),
        telegramId: targetTelegramId
      },
      { $set: { isSuspended: true } }
    );

    const targetUser = await UserModel.findOne({
      telegramId: targetTelegramId
    }).lean();
    const targetName = targetUser ? targetUser.firstName : 'کاربر';

    await ctx
      .editMessageText(
        `✅ **موفقیت‌آمیز**\n\nدسترسی کاربر **${targetName}** به این گروه تعلیق شد. داده‌های وی محفوظ است اما امکان فعالیت نخواهد داشت.`,
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
      `User ${targetTelegramId} suspended in Tenant ${tenantId} by ${promoterId}`
    );
  } catch (error) {
    logger.error('Error handling suspend action:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};
