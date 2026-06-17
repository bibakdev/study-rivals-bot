// apps/backend/src/modules/telegram-bot/handlers/tenant/alias-manage.action.ts

import { Context, Markup } from 'telegraf';
import mongoose from 'mongoose';
import { TenantMemberModel } from '#modules/tenant/tenant-member.model';
import { UserModel } from '#modules/auth/user.model';
import { BotStateModel } from '#modules/telegram-bot/models/bot-state.model';
import { logger } from '#utils/logger';

// ۱. نمایش منوی اختصاصی نام مستعار برای یک کاربر
export const handleAliasUserSelect = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const tenantId = ctx.match[1];
    const targetTelegramId = Number(ctx.match[2]);

    await ctx.answerCbQuery().catch(() => {});

    // واکشی اطلاعات پایه کاربر
    const targetUser = await UserModel.findOne({
      telegramId: targetTelegramId
    }).lean();
    if (!targetUser) return;

    // واکشی اطلاعات عضویت برای بررسی نام مستعار فعلی
    const membership = await TenantMemberModel.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      telegramId: targetTelegramId
    }).lean();

    const realName =
      targetUser.firstName +
      (targetUser.lastName ? ` ${targetUser.lastName}` : '');
    const currentAlias = membership?.alias ? membership.alias : 'ندارد';

    const inlineKeyboard = [
      [
        Markup.button.callback(
          '✏️ ثبت / ویرایش نام مستعار',
          `action_enter_alias_${tenantId}_${targetTelegramId}`
        )
      ]
    ];

    // فقط اگر نام مستعاری وجود داشت دکمه حذف نمایش داده شود
    if (membership?.alias) {
      inlineKeyboard.push([
        Markup.button.callback(
          '🗑 حذف نام مستعار',
          `action_delete_alias_${tenantId}_${targetTelegramId}`
        )
      ]);
    }

    inlineKeyboard.push([
      Markup.button.callback(
        '🔙 بازگشت به لیست',
        `action_alias_menu_${tenantId}`
      )
    ]);

    await ctx
      .editMessageText(
        `🏷 **مدیریت نام مستعار**\n\n` +
          `👤 **نام اصلی کاربر:** ${realName}\n` +
          `🎭 **نام مستعار فعلی در این گروه:** ${currentAlias}\n\n` +
          `لطفاً عملیات مورد نظر را انتخاب کنید:`,
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: inlineKeyboard }
        }
      )
      .catch(() => {});
  } catch (error) {
    logger.error('Error handling alias user select:', error);
  }
};

// ۲. ورود به وضعیت (State) دریافت متن از ادمین
export const handleAliasEnterPrompt = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const tenantId = ctx.match[1];
    const targetTelegramId = Number(ctx.match[2]);
    const promoterId = ctx.from?.id;

    await ctx.answerCbQuery().catch(() => {});
    if (!promoterId) return;

    // ثبت در استیت ماشین
    await BotStateModel.findOneAndUpdate(
      { telegramId: promoterId },
      {
        $set: {
          action: 'SET_ALIAS',
          payload: { tenantId, targetTelegramId }
        }
      },
      { upsert: true }
    );

    await ctx
      .editMessageText(
        '✍️ **ثبت نام مستعار جدید**\n\nلطفاً نام مستعاری که قصد دارید برای این کاربر در این گروه ثبت کنید را ارسال نمایید:',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback(
                  '❌ انصراف',
                  `action_set_alias_prompt_${tenantId}_${targetTelegramId}` // بازگشت به پروفایل همان کاربر
                )
              ]
            ]
          }
        }
      )
      .catch(() => {});
  } catch (error) {
    logger.error('Error in alias prompt:', error);
  }
};

// ۳. حذف مستقیم نام مستعار
export const handleAliasDelete = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const tenantId = ctx.match[1];
    const targetTelegramId = Number(ctx.match[2]);

    await TenantMemberModel.updateOne(
      {
        tenantId: new mongoose.Types.ObjectId(tenantId),
        telegramId: targetTelegramId
      },
      { $set: { alias: null } } // یا $unset
    );

    await ctx.answerCbQuery('✅ نام مستعار با موفقیت حذف شد.').catch(() => {});

    // بازخوانی مجدد پروفایل همان شخص برای آپدیت شدن دکمه‌ها
    await handleAliasUserSelect(ctx);
  } catch (error) {
    logger.error('Error deleting alias:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی در حذف نام مستعار رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};
