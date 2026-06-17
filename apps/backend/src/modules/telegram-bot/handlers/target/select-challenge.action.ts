// apps/backend/src/modules/telegram-bot/handlers/target/select-challenge.action.ts

import { Context, Markup } from 'telegraf';
import { BotStateModel } from '#modules/telegram-bot/models/bot-state.model';
import { logger } from '#utils/logger';

export const handleSelectChallengeRequest = async (
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
        `🎯 **ثبت تارگت چالش گروهی**\n\nلطفاً تارگت مطالعه روزانه خود را دقیقاً با فرمت \`HH:MM\` در همینجا تایپ کرده و ارسال کنید (نیازی به ریپلای نیست).\n\n💡 مثال: برای ۱۰ ساعت و نیم بنویسید \`10:30\``,
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
    logger.error('Error in select challenge action:', error);
  }
};
