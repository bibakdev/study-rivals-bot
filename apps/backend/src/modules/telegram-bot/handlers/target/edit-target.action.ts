// apps/backend/src/modules/telegram-bot/handlers/target/edit-target.action.ts

import { Context, Markup } from 'telegraf';
import { BotStateModel } from '#modules/telegram-bot/models/bot-state.model';
import { logger } from '#utils/logger';

export const handleEditTargetRequest = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const tenantId = ctx.match[1];
    const telegramId = ctx.from?.id;

    await ctx.answerCbQuery().catch(() => {});

    if (!telegramId) return;

    // ثبت وضعیت کاربر در دیتابیس
    await BotStateModel.findOneAndUpdate(
      { telegramId },
      { action: 'WAITING_FOR_TARGET', payload: { tenantId } },
      { upsert: true }
    );

    await ctx
      .editMessageText(
        `✏️ **ویرایش تارگت چالش گروهی**\n\nلطفاً تارگت مطالعه روزانه جدید خود را دقیقاً با فرمت \`HH:MM\` تایپ کرده و بفرستید.\n\n💡 مثال: \`10:30\``,
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
    logger.error('Error in edit target action:', error);
  }
};
