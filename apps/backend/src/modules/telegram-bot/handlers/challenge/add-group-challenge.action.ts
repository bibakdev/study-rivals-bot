// apps/backend/src/modules/telegram-bot/handlers/challenge/add-group-challenge.action.ts

import { Context, Markup } from 'telegraf';
import { BotStateModel } from '#modules/telegram-bot/models/bot-state.model';
import { logger } from '#utils/logger';

export const handleAddGroupChallengeRequest = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const tenantId = ctx.match[1];
    const telegramId = ctx.from?.id;

    await ctx.answerCbQuery().catch(() => {});

    if (!telegramId) return;

    // ثبت استپ اول در دیتابیس استیت
    await BotStateModel.findOneAndUpdate(
      { telegramId },
      {
        $set: {
          action: 'ADD_CHALLENGE_DATE',
          payload: { tenantId }
        }
      },
      { upsert: true }
    );

    await ctx
      .editMessageText(
        '📅 **گام ۱: تعیین زمان شروع**\n\nلطفاً روز شروع چالش را ارسال کنید (مثلاً: `۱۲ فروردین ۱۴۰۵`):',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback(
                  '❌ انصراف',
                  `cancel_add_challenge_${tenantId}`
                )
              ]
            ]
          }
        }
      )
      .catch(() => {});
  } catch (error) {
    logger.error('Error starting group challenge wizard:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};
