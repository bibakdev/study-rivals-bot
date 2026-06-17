// apps/backend/src/modules/telegram-bot/handlers/target/set-target.action.ts

import { Context, Markup } from 'telegraf';
import mongoose from 'mongoose';
import { TargetModel } from '#modules/target/target.model';
import { BotStateModel } from '#modules/telegram-bot/models/bot-state.model';
import { logger } from '#utils/logger';

export const handleSetTargetRequest = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const tenantId = ctx.match[1];
    const telegramId = ctx.from?.id;

    await ctx.answerCbQuery().catch(() => {});

    if (!telegramId) return;

    // جستجوی تارگت کاربر در دیتابیس
    const existingTarget = await TargetModel.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      telegramId
    }).lean();

    if (existingTarget) {
      // 👈 دریافت دقیقه‌ها و تبدیل به ساعت و دقیقه جهت نمایش صحیح
      const totalMinutes = existingTarget.dailyMinutes || 0;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

      await ctx
        .editMessageText(
          `🎯 **وضعیت تارگت شما**\n\nشما قبلاً یک تارگت برای این چالش ثبت کرده‌اید:\n⏱️ زمان مطالعه روزانه: **${hours} ساعت و ${minutes} دقیقه** (\`${formattedTime}\`)\n\nجهت تغییر یا حذف، از دکمه‌های زیر استفاده کنید:`,
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
        )
        .catch((err) => {
          if (!err.description?.includes('message is not modified')) {
            logger.warn(
              `Could not edit message in set target: ${err.description}`
            );
          }
        });
      return;
    }

    // اگر تارگت نداشت، وضعیت ربات به "در انتظار دریافت تارگت" تغییر می‌کند
    await BotStateModel.findOneAndUpdate(
      { telegramId },
      {
        $set: {
          action: 'WAITING_FOR_TARGET',
          payload: { tenantId }
        }
      },
      { upsert: true }
    );

    await ctx
      .editMessageText(
        '🎯 **ثبت تارگت روزانه**\n\nلطفاً تارگت (هدف) مطالعه روزانه خود را دقیقاً با فرمت `HH:MM` برای من ارسال کنید.\n\n📌 **مثال:** برای ثبت 4 ساعت و 30 دقیقه، دقیقاً متن زیر را بفرستید:\n`04:30`',
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
      )
      .catch(() => {});
  } catch (error) {
    logger.error('Error handling set target action:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};
