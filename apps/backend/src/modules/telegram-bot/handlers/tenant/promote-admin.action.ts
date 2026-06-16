// apps/backend/src/modules/telegram-bot/handlers/tenant/promote-admin.action.ts

import { Context, Markup } from 'telegraf';
import mongoose from 'mongoose';
import { TenantMemberModel } from '#modules/tenant/tenant-member.model';
import { UserModel } from '#modules/auth/user.model';
import { logger } from '#utils/logger';

export const handlePromoteSubAdmin = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const tenantId = ctx.match[1];
    const targetTelegramId = Number(ctx.match[2]);
    const promoterId = ctx.from?.id;

    await ctx.answerCbQuery().catch(() => {});

    if (!promoterId) return;

    // ۱. بررسی امنیتی: آیا شخصی که دکمه را زده صلاحیت ارتقای دیگران را دارد؟ (فقط مالک پلتفرم یا مدیر اصلی گروه)
    const promoterUser = await UserModel.findOne({
      telegramId: promoterId
    }).lean();
    let isAuthorized = promoterUser?.role === 'mother';

    if (!isAuthorized) {
      const promoterMembership = await TenantMemberModel.findOne({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        telegramId: promoterId
      }).lean();
      isAuthorized = promoterMembership?.tenantRole === 'main_admin';
    }

    if (!isAuthorized) {
      await ctx
        .answerCbQuery('❌ شما دسترسی لازم برای این کار را ندارید.', {
          show_alert: true
        })
        .catch(() => {});
      return;
    }

    // ۲. به‌روزرسانی نقش کاربر در دیتابیس
    await TenantMemberModel.updateOne(
      {
        tenantId: new mongoose.Types.ObjectId(tenantId),
        telegramId: targetTelegramId
      },
      { $set: { tenantRole: 'sub_admin' } }
    );

    // ۳. گرفتن نام کاربر ارتقا یافته برای نمایش در پیام موفقیت
    const targetUser = await UserModel.findOne({
      telegramId: targetTelegramId
    }).lean();
    const targetName = targetUser
      ? targetUser.firstName +
        (targetUser.lastName ? ` ${targetUser.lastName}` : '')
      : 'کاربر';

    // ۴. نمایش پیام موفقیت
    await ctx
      .editMessageText(
        `✅ **موفقیت‌آمیز**\n\nکاربر **${targetName}** با موفقیت به عنوان مدیر فرعی (Sub Admin) در این چالش منصوب شد و از این پس به امکانات مدیریتی دسترسی دارد.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback(
                  '🔙 بازگشت به پنل گروه',
                  `select_tenant_${tenantId}`
                )
              ]
            ]
          }
        }
      )
      .catch(() => {});

    logger.info(
      `User ${targetTelegramId} was promoted to sub_admin in Tenant ${tenantId} by ${promoterId}`
    );
  } catch (error) {
    logger.error('Error handling promote sub-admin action:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};
