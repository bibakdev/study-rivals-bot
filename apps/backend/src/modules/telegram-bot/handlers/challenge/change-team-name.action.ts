// apps/backend/src/modules/telegram-bot/handlers/challenge/change-team-name.action.ts

import { Context, Markup } from 'telegraf';
import { BotStateModel } from '#modules/telegram-bot/models/bot-state.model';
import { logger } from '#utils/logger';

export const handleChangeTeamNameRequest = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const challengeId = ctx.match[1];
    const teamIndex = parseInt(ctx.match[2], 10);
    const telegramId = ctx.from?.id;

    await ctx.answerCbQuery().catch(() => {});

    if (!telegramId) return;

    // ثبت وضعیت در دیتابیس برای منتظر ماندن نام جدید
    await BotStateModel.findOneAndUpdate(
      { telegramId },
      {
        $set: {
          action: 'EDIT_TEAM_NAME',
          payload: { challengeId, teamIndex }
        }
      },
      { upsert: true }
    );

    await ctx
      .editMessageText(
        '📝 **تغییر نام تیم**\n\nلطفاً نام جدیدی که برای این تیم در نظر دارید را ارسال کنید:',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback(
                  '❌ انصراف',
                  `cancel_edit_team_name_${challengeId}_${teamIndex}`
                )
              ]
            ]
          }
        }
      )
      .catch(() => {});
  } catch (error) {
    logger.error('Error starting team name change:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};
