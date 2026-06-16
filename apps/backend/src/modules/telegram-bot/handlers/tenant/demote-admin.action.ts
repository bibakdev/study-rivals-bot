// apps/backend/src/modules/telegram-bot/handlers/tenant/demote-admin.action.ts

import { Context, Markup } from 'telegraf';
import mongoose from 'mongoose';
import { TenantMemberModel } from '#modules/tenant/tenant-member.model';
import { UserModel } from '#modules/auth/user.model';
import { logger } from '#utils/logger';

export const handleDemoteSubAdmin = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const tenantId = ctx.match[1];
    const targetTelegramId = Number(ctx.match[2]);
    const promoterId = ctx.from?.id;

    await ctx.answerCbQuery().catch(() => {});

    if (!promoterId) return;

    // ۱. بررسی امنیتی: آیا شخصی که دکمه را زده صلاحیت عزل دیگران را دارد؟ (فقط مالک پلتفرم یا مدیر اصلی گروه)
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

    // ۲. به‌روزرسانی نقش کاربر در دیتابیس (تبدیل به کاربر عادی)
    await TenantMemberModel.updateOne(
      {
        tenantId: new mongoose.Types.ObjectId(tenantId),
        telegramId: targetTelegramId
      },
      { $set: { tenantRole: 'user' } }
    );

    // ۳. گرفتن نام کاربر عزل یافته برای نمایش در پیام موفقیت
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
        `✅ **موفقیت‌آمیز**\n\nکاربر **${targetName}** با موفقیت از سمت مدیریت عزل شد و به عنوان **کاربر عادی (User)** در چالش به فعالیت خود ادامه می‌دهد.`,
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
      `User ${targetTelegramId} was demoted to user in Tenant ${tenantId} by ${promoterId}`
    );
  } catch (error) {
    logger.error('Error handling demote sub-admin action:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};
