// apps/backend/src/modules/telegram-bot/handlers/target/save-target.action.ts

import { Context, Markup } from 'telegraf';
import mongoose from 'mongoose';
import { TargetModel } from '#modules/target/target.model';
import { BotStateModel } from '#modules/telegram-bot/models/bot-state.model';
import { logger } from '#utils/logger';

export const handleSaveTargetText = async (
  ctx: Context,
  telegramId: number,
  rawText: string
): Promise<boolean> => {
  try {
    // ۱. بررسی اینکه آیا کاربر در حالت "انتظار برای تارگت" قرار دارد یا خیر
    const state = await BotStateModel.findOne({ telegramId }).lean();
    if (!state || state.action !== 'WAITING_FOR_TARGET') {
      return false; // کاربر در این وضعیت نیست، عبور به سایر هندلرها
    }

    const tenantId = state.payload.tenantId;

    // ۲. اعتبارسنجی دقیق فرمت HH:MM
    const targetRegex = /^(\d{1,2}):([0-5]\d)$/;
    const timeMatch = rawText.trim().match(targetRegex);

    if (!timeMatch) {
      await ctx.reply(
        '❌ فرمت وارد شده نامعتبر است.\nلطفاً دقیقاً با فرمت `HH:MM` وارد کنید (مثال `10:30`).\n\nبرای تلاش مجدد کافیست متن صحیح را بفرستید.',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback(
                  '❌ انصراف',
                  `action_cancel_target_${tenantId}`
                )
              ]
            ]
          }
        }
      );
      return true; // مدیریت شد اما استیت حفظ می‌شود تا کاربر دوباره تلاش کند
    }

    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const totalMinutes = hours * 60 + minutes;

    if (totalMinutes <= 0) {
      await ctx.reply('❌ زمان تارگت باید بیشتر از صفر باشد.', {
        reply_markup: {
          inline_keyboard: [
            [
              Markup.button.callback(
                '❌ انصراف',
                `action_cancel_target_${tenantId}`
              )
            ]
          ]
        }
      });
      return true;
    }

    // ۳. ذخیره یا آپدیت واقعی تارگت در دیتابیس (Upsert)
    await TargetModel.findOneAndUpdate(
      {
        tenantId: new mongoose.Types.ObjectId(tenantId),
        telegramId
      },
      {
        $set: { dailyMinutes: totalMinutes }
      },
      { upsert: true, new: true }
    );

    // ۴. پاک کردن State کاربر پس از ثبت موفق
    await BotStateModel.deleteOne({ telegramId });

    await ctx.reply(
      `✅ **تارگت شما با موفقیت ثبت شد!**\n\n⏱ زمان تعیین شده: **${hours} ساعت و ${minutes} دقیقه**`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
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
          ]
        }
      }
    );

    logger.info(
      `Target set by ${telegramId} for tenant ${tenantId}: ${totalMinutes} minutes`
    );
    return true;
  } catch (error) {
    logger.error('Error saving target text via state:', error);
    await ctx.reply('⚠️ خطایی در ثبت تارگت رخ داد.');
    return true;
  }
};
