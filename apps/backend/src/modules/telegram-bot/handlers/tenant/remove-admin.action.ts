// apps/backend/src/modules/telegram-bot/handlers/tenant/remove-admin.action.ts

import { Context, Markup } from 'telegraf';
import mongoose from 'mongoose';
import { TenantMemberModel } from '#modules/tenant/tenant-member.model';
import { UserModel } from '#modules/auth/user.model';
import { logger } from '#utils/logger';

export const handleRemoveAdminRequest = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const tenantId = ctx.match[1];

    // بستن حالت لودینگ دکمه شیشه‌ای
    await ctx.answerCbQuery().catch((err) => {
      logger.warn(`Ignored answerCbQuery error: ${err.description}`);
    });

    // ۱. پیدا کردن تمام اعضایی که در این گروه نقش مدیر فرعی (sub_admin) دارند
    const eligibleMembers = await TenantMemberModel.find({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      tenantRole: 'sub_admin'
    }).lean();

    // اگر هیچ مدیر فرعی در گروه وجود نداشت
    if (eligibleMembers.length === 0) {
      await ctx
        .editMessageText(
          '👥 **لیست خالی است**\n\nدر حال حاضر هیچ کاربری با نقش مدیر فرعی (Sub Admin) در این چالش وجود ندارد که بتوانید او را عزل کنید.',
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '🔙 بازگشت به پنل گروه',
                    callback_data: `select_tenant_${tenantId}`
                  }
                ]
              ]
            }
          }
        )
        .catch(() => {});
      return;
    }

    // ۲. استخراج نام کاربران از کالکشن User برای نمایش روی دکمه‌ها
    const userIds = eligibleMembers.map((member) => member.telegramId);
    const usersInfo = await UserModel.find({
      telegramId: { $in: userIds }
    }).lean();

    // ۳. ساخت لیست دکمه‌های شیشه‌ای
    const inlineKeyboard = usersInfo.map((u) => {
      const fullName = u.firstName + (u.lastName ? ` ${u.lastName}` : '');
      return [
        // ارسال tenantId و telegramId فردی که قرار است عزل یابد به کال‌بک جدید
        Markup.button.callback(
          `👤 ${fullName}`,
          `demote_sub_${tenantId}_${u.telegramId}`
        )
      ];
    });

    // اضافه کردن دکمه انصراف به انتهای لیست
    inlineKeyboard.push([
      Markup.button.callback('🔙 انصراف', `select_tenant_${tenantId}`)
    ]);

    // ۴. نمایش لیست کاربران
    await ctx
      .editMessageText(
        '➖ **عزل مدیر فرعی**\n\nلطفاً از لیست زیر، ادمینی که می‌خواهید به نقش **کاربر عادی (User)** برگردانده شود را انتخاب نمایید:',
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: inlineKeyboard }
        }
      )
      .catch((err) => {
        logger.warn(
          `Could not edit message in remove-admin: ${err.description}`
        );
      });
  } catch (error) {
    logger.error('Error handling remove admin action:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد. لطفا دوباره تلاش کنید.', {
        show_alert: true
      })
      .catch(() => {});
  }
};
