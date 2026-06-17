// apps/backend/src/modules/telegram-bot/handlers/challenge/end-challenge.action.ts

import { Context, Markup } from 'telegraf';
import { ChallengeModel } from '#modules/challenge/challenge.model';
import { logger } from '#utils/logger';

export const handleEndChallengeRequest = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const challengeId = ctx.match[1];

    const challenge = await ChallengeModel.findByIdAndUpdate(
      challengeId,
      { $set: { status: 'completed' } },
      { new: true }
    ).lean();

    if (!challenge) {
      await ctx
        .answerCbQuery('❌ چالش یافت نشد.', { show_alert: true })
        .catch(() => {});
      return;
    }

    await ctx.answerCbQuery('✅ چالش با موفقیت خاتمه یافت.').catch(() => {});

    await ctx
      .editMessageText(
        '✅ چالش متوقف شد و هم‌اکنون به لیست چالش‌های تکمیل شده منتقل گردید.',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback(
                  '🔙 بازگشت به لیست چالش‌ها',
                  `action_list_challenges_${challenge.tenantId}_completed`
                )
              ]
            ]
          }
        }
      )
      .catch(() => {});
  } catch (error) {
    logger.error('Error ending challenge:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};
