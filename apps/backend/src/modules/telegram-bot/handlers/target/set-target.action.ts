// apps/backend/src/modules/telegram-bot/handlers/target/set-target.action.ts

import { Context, Markup } from 'telegraf';
import { BotStateModel } from '#modules/telegram-bot/models/bot-state.model';
import { TargetModel } from '#modules/target/target.model';
import { formatMinutesToTime } from '#modules/time-log/utils/time-parser.util';
import { logger } from '#utils/logger';

export const handleSetTargetRequest = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const tenantId = ctx.match[1];
    const telegramId = ctx.from?.id;

    await ctx.answerCbQuery().catch(() => {});
    if (!telegramId) return;

    // بررسی اینکه آیا قبلاً تارگت دارد یا خیر
    const existingTarget = await TargetModel.findOne({
      tenantId,
      telegramId
    }).lean();

    if (existingTarget) {
      // اگر تارگت دارد، دکمه ویرایش و حذف را نمایش می‌دهیم
      await ctx
        .editMessageText(
          `🎯 **مدیریت تارگت**\n\nشما قبلاً تارگت خود را روی **${formatMinutesToTime(existingTarget.dailyMinutes)}** تنظیم کرده‌اید.`,
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
                    '🔙 بازگشت به پنل',
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

    // اگر تارگت نداشت، وضعیت را برای دریافت متن آماده می‌کنیم
    await BotStateModel.findOneAndUpdate(
      { telegramId },
      { $set: { action: 'SET_TARGET', payload: { tenantId } } },
      { upsert: true }
    );

    const exampleText =
      'برای وارد کردن ساعت و دقیقه از دونقطه استفاده کنید (مثلاً `8:30` یا `0:20`) و برای ثبت ساعت رند فقط عدد وارد کنید (مثلاً `4` یعنی ۴ ساعت).';

    await ctx
      .editMessageText(
        `🎯 **ثبت تارگت روزانه**\n\nلطفاً مقداری که قصد دارید هر روز مطالعه کنید را ارسال نمایید.\n\n💡 ${exampleText}`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback(
                  '❌ انصراف',
                  `action_cancel_target_${tenantId}`
                ) // بازگشت در صورت انصراف
              ]
            ]
          }
        }
      )
      .catch(() => {});
  } catch (error) {
    logger.error('Error handling set target action:', error);
  }
};
