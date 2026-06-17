// apps/backend/src/modules/telegram-bot/handlers/challenge/delete-challenge.action.ts

import { Context, Markup } from 'telegraf';
import { ChallengeModel } from '#modules/challenge/challenge.model';
import { logger } from '#utils/logger';

export const handleDeleteGroupChallengeRequest = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const challengeId = ctx.match[1];

    await ctx.answerCbQuery().catch(() => {});

    const challenge = await ChallengeModel.findById(challengeId).lean();

    if (!challenge) {
      await ctx
        .editMessageText('❌ چالش مورد نظر یافت نشد یا قبلاً حذف شده است.', {
          reply_markup: {
            inline_keyboard: [
              [Markup.button.callback('🔙 بستن', 'action_manage_groups')]
            ]
          }
        })
        .catch(() => {});
      return;
    }

    await ChallengeModel.findByIdAndDelete(challengeId);

    // 👈 هدایت پویا به لیست مرتبط با وضعیت همان چالش (اجرا نشده / در حال اجرا)
    await ctx
      .editMessageText('✅ چالش با موفقیت حذف شد.', {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              Markup.button.callback(
                '🔙 بازگشت به لیست',
                `action_list_challenges_${challenge.tenantId.toString()}_${challenge.status}`
              )
            ]
          ]
        }
      })
      .catch((err) => {
        logger.warn(
          `Could not edit message in delete challenge: ${err.description}`
        );
      });

    logger.info(`Challenge ${challengeId} deleted successfully.`);
  } catch (error) {
    logger.error('Error handling delete challenge action:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};
