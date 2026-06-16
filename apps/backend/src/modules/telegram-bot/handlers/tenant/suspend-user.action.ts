// apps/backend/src/modules/telegram-bot/handlers/tenant/suspend-user.action.ts

import { Context, Markup } from 'telegraf';
import mongoose from 'mongoose';
import { TenantMemberModel } from '#modules/tenant/tenant-member.model';
import { UserModel } from '#modules/auth/user.model';
import { logger } from '#utils/logger';

export const handleSuspendUserRequest = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const tenantId = ctx.match[1];
    const promoterId = ctx.from?.id; // 👈 گرفتن آیدی شخصی که دکمه را زده است

    await ctx.answerCbQuery().catch(() => {});

    if (!promoterId) return;

    // ۱. استخراج اعضایی که تعلیق نیستند، مدیر اصلی نیستند و شخصِ خودِ کلیک‌کننده هم نیستند
    const eligibleMembers = await TenantMemberModel.find({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      isSuspended: { $ne: true },
      tenantRole: { $ne: 'main_admin' },
      telegramId: { $ne: promoterId } // 👈 جلوگیری از نمایش اکانت خودتان
    }).lean();

    if (eligibleMembers.length === 0) {
      await ctx
        .editMessageText(
          '👥 **لیست خالی است**\n\nکاربری برای تعلیق در این گروه یافت نشد.',
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

    const userIds = eligibleMembers.map((member) => member.telegramId);

    // ۲. دریافت اطلاعات کاربران و حذف قطعی تمام اکانت‌های مادر از لیست
    const usersInfo = await UserModel.find({
      telegramId: { $in: userIds },
      role: { $ne: 'mother' } // 👈 فیلتر لایه دوم: هیچ اکانت مادری در لیست قرار نمی‌گیرد
    }).lean();

    // بررسی مجدد در صورت خالی شدن لیست پس از حذف اکانت مادر
    if (usersInfo.length === 0) {
      await ctx
        .editMessageText(
          '👥 **لیست خالی است**\n\nکاربری برای تعلیق در این گروه یافت نشد.',
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

    // ۳. ساخت کیبورد شیشه‌ای
    const inlineKeyboard = usersInfo.map((u) => {
      const fullName = u.firstName + (u.lastName ? ` ${u.lastName}` : '');
      return [
        Markup.button.callback(
          `🚫 ${fullName}`,
          `do_suspend_${tenantId}_${u.telegramId}`
        )
      ];
    });

    inlineKeyboard.push([
      Markup.button.callback('🔙 انصراف', `select_tenant_${tenantId}`)
    ]);

    // ۴. نمایش لیست
    await ctx
      .editMessageText(
        '🚫 **تعلیق کاربر**\n\nلطفاً کاربری که قصد دارید دسترسی وی به مینی‌اپ قطع شود را انتخاب کنید:',
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: inlineKeyboard }
        }
      )
      .catch(() => {});
  } catch (error) {
    logger.error('Error handling suspend user list action:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};
