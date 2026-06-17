// apps/backend/src/modules/telegram-bot/handlers/target/cancel-target.action.ts

import { Context, Markup } from 'telegraf';
import { BotStateModel } from '#modules/telegram-bot/models/bot-state.model';
import { logger } from '#utils/logger';

export const handleCancelTargetRequest = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const tenantId = ctx.match[1];
    const telegramId = ctx.from?.id;

    await ctx.answerCbQuery('❌ عملیات لغو شد.').catch(() => {});

    if (telegramId) {
      await BotStateModel.deleteOne({ telegramId });
    }

    await ctx
      .editMessageText('❌ **عملیات ثبت تارگت لغو شد.**', {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              Markup.button.callback(
                '🔙 بازگشت به پنل چالش',
                `select_tenant_${tenantId}`
              )
            ]
          ]
        }
      })
      .catch(() => {});
  } catch (error) {
    logger.error('Error in cancel target action:', error);
  }
};
