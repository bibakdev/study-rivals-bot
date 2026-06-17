// apps/backend/src/modules/telegram-bot/handlers/target/set-target.action.ts

import { Context, Markup } from 'telegraf';
import mongoose from 'mongoose';
import { TargetModel } from '#modules/target/target.model';
import { logger } from '#utils/logger';

export const handleSetTargetRequest = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const tenantId = ctx.match[1];
    const telegramId = ctx.from?.id;

    await ctx.answerCbQuery().catch(() => {});

    if (!telegramId) return;

    // ۱. بررسی اینکه آیا کاربر قبلاً تارگتی در این گروه ثبت کرده است یا خیر
    const existingTarget = await TargetModel.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      telegramId
    }).lean();

    // ۲. اگر تارگت وجود داشت، مقدار آن و دکمه‌های ویرایش/حذف را نشان می‌دهیم
    if (existingTarget) {
      const hours = Math.floor(existingTarget.dailyMinutes / 60);
      const minutes = existingTarget.dailyMinutes % 60;
      const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

      const inlineKeyboard = [
        [
          Markup.button.callback(
            '✏️ ویرایش تارگت',
            `action_edit_target_${tenantId}`
          ),
          Markup.button.callback(
            '🗑 حذف تارگت',
            `action_delete_target_${tenantId}`
          )
        ],
        [
          Markup.button.callback(
            '🔙 بازگشت به پنل چالش',
            `select_tenant_${tenantId}`
          )
        ]
      ];

      await ctx
        .editMessageText(
          `🎯 **وضعیت تارگت شما**\n\nشما قبلاً یک تارگت برای این چالش ثبت کرده‌اید:\n⏱ زمان مطالعه روزانه: **${hours} ساعت و ${minutes} دقیقه** (\`${formattedTime}\`)\n\nجهت تغییر یا حذف، از دکمه‌های زیر استفاده کنید:`,
          {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: inlineKeyboard }
          }
        )
        .catch(() => {});
    }
    // ۳. اگر تارگتی وجود نداشت، منوی انتخاب چالش را نشان می‌دهیم
    else {
      const inlineKeyboard = [
        [
          Markup.button.callback(
            '👥 چالش گروهی',
            `action_select_challenge_${tenantId}_group`
          )
        ],
        [Markup.button.callback('🔙 بازگشت', `select_tenant_${tenantId}`)]
      ];

      await ctx
        .editMessageText(
          '🎯 **ثبت تارگت جدید**\n\nشما هنوز تارگتی ثبت نکرده‌اید.\nلطفاً چالشی که می‌خواهید برای آن تارگت ثبت کنید را انتخاب نمایید:\n\n*(در حال حاضر فقط چالش گروهی فعال است)*',
          {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: inlineKeyboard }
          }
        )
        .catch(() => {});
    }
  } catch (error) {
    logger.error('Error in set target action:', error);
    await ctx.answerCbQuery('⚠️ خطایی رخ داد.').catch(() => {});
  }
};
