// apps/backend/src/modules/telegram-bot/handlers/tenant/add-admin.action.ts

import { Context, Markup } from 'telegraf';
import mongoose from 'mongoose';
import { TenantMemberModel } from '#modules/tenant/tenant-member.model';
import { UserModel } from '#modules/auth/user.model';
import { logger } from '#utils/logger';

export const handleAddAdminRequest = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const tenantId = ctx.match[1];

    // بستن حالت لودینگ دکمه شیشه‌ای
    await ctx.answerCbQuery().catch((err) => {
      logger.warn(`Ignored answerCbQuery error: ${err.description}`);
    });

    // ۱. پیدا کردن تمام اعضایی که در این گروه فقط نقش کاربر عادی دارند
    const eligibleMembers = await TenantMemberModel.find({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      tenantRole: 'user'
    }).lean();

    // اگر هیچ کاربر عادی در گروه ثبت‌نام نکرده بود
    if (eligibleMembers.length === 0) {
      await ctx
        .editMessageText(
          '👥 **لیست خالی است**\n\nدر حال حاضر هیچ کاربری با نقش عادی (User) در این چالش ثبت‌نام نکرده است که بتوانید او را ادمین کنید.\n\nکاربران باید ابتدا از طریق لینک دعوت وارد ربات شوند.',
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
        // ارسال tenantId و telegramId فردی که قرار است ارتقا یابد به کال‌بک جدید
        Markup.button.callback(
          `👤 ${fullName}`,
          `promote_sub_${tenantId}_${u.telegramId}`
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
        '👤 **افزودن ادمین جدید**\n\nلطفاً از لیست زیر، کاربری که می‌خواهید به عنوان **مدیر فرعی (Sub Admin)** انتخاب کنید را لمس نمایید:',
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: inlineKeyboard }
        }
      )
      .catch((err) => {
        logger.warn(`Could not edit message in add-admin: ${err.description}`);
      });
  } catch (error) {
    logger.error('Error handling add admin action:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد. لطفا دوباره تلاش کنید.', {
        show_alert: true
      })
      .catch(() => {});
  }
};
