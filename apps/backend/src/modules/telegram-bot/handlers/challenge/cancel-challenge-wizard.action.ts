// apps/backend/src/modules/telegram-bot/handlers/challenge/cancel-challenge-wizard.action.ts

import { Context, Markup } from 'telegraf';
import { BotStateModel } from '#modules/telegram-bot/models/bot-state.model';
import { logger } from '#utils/logger';

export const handleCancelChallengeWizard = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const tenantId = ctx.match[1];
    const telegramId = ctx.from?.id;

    await ctx.answerCbQuery().catch(() => {});

    if (!telegramId) return;

    // پاک کردن تمام استیت‌های مربوط به ساخت چالش برای این کاربر
    await BotStateModel.deleteOne({
      telegramId,
      action: { $regex: '^ADD_CHALLENGE_' }
    });

    // ویرایش پیام به حالت لغو شده و نمایش دکمه بازگشت
    await ctx
      .editMessageText('❌ **عملیات ساخت چالش گروهی لغو شد.**', {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              Markup.button.callback(
                '🔙 بازگشت به منوی چالش',
                `action_group_challenge_${tenantId}`
              )
            ]
          ]
        }
      })
      .catch(() => {
        // در صورتی که امکان ادیت نبود، یک پیام جدید می‌فرستیم
        ctx.reply('❌ **عملیات ساخت چالش گروهی لغو شد.**', {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback(
                  '🔙 بازگشت',
                  `action_group_challenge_${tenantId}`
                )
              ]
            ]
          }
        });
      });
  } catch (error) {
    logger.error('Error cancelling challenge wizard:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی در لغو عملیات رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};
