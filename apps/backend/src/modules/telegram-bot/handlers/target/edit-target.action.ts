// apps/backend/src/modules/telegram-bot/handlers/target/edit-target.action.ts

import { Context, Markup } from 'telegraf';
import { BotStateModel } from '#modules/telegram-bot/models/bot-state.model';
import { TargetModel } from '#modules/target/target.model';
import { formatMinutesToTime } from '#modules/time-log/utils/time-parser.util';
import { logger } from '#utils/logger';

export const handleEditTargetRequest = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const tenantId = ctx.match[1];
    const telegramId = ctx.from?.id;

    await ctx.answerCbQuery().catch(() => {});
    if (!telegramId) return;

    const existingTarget = await TargetModel.findOne({
      tenantId,
      telegramId
    }).lean();
    const currentTargetText = existingTarget
      ? formatMinutesToTime(existingTarget.dailyMinutes)
      : 'نامشخص';

    // تنظیم وضعیت بات روی انتظار برای ویرایش
    await BotStateModel.findOneAndUpdate(
      { telegramId },
      { $set: { action: 'EDIT_TARGET', payload: { tenantId } } },
      { upsert: true }
    );

    const exampleText =
      'برای وارد کردن ساعت و دقیقه از دونقطه استفاده کنید (مثلاً `8:30` یا `0:20`) و برای ثبت ساعت رند فقط عدد وارد کنید (مثلاً `4` یعنی ۴ ساعت).';

    await ctx
      .editMessageText(
        `✏️ **ویرایش تارگت روزانه**\n\n⏱ تارگت فعلی شما: **${currentTargetText}**\n\nلطفاً مقدار تارگت جدید خود را ارسال نمایید.\n\n💡 ${exampleText}`,
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
    logger.error('Error handling edit target action:', error);
  }
};
