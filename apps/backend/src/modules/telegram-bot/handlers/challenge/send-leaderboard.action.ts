// apps/backend/src/modules/telegram-bot/handlers/challenge/send-leaderboard.action.ts

import { Context } from 'telegraf';
import { ChallengeModel } from '#modules/challenge/challenge.model';
import { TenantModel } from '#modules/tenant/tenant.model';
import { generateLeaderboardText } from '#modules/challenge/utils/leaderboard.util';
import { logger } from '#utils/logger';

export const handleSendLeaderboardRequest = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const challengeId = ctx.match[1];

    const challenge = await ChallengeModel.findById(challengeId);
    if (!challenge) return;

    const tenant = await TenantModel.findById(challenge.tenantId).lean();
    if (!tenant || !tenant.chatId) {
      await ctx
        .answerCbQuery('❌ گروه یافت نشد یا ربات دسترسی ندارد.', {
          show_alert: true
        })
        .catch(() => {});
      return;
    }

    const leaderboardMessage = await generateLeaderboardText(challengeId);

    if (!leaderboardMessage) {
      await ctx
        .answerCbQuery('❌ خطایی در تولید رتبه‌بندی رخ داد.')
        .catch(() => {});
      return;
    }

    const sendOptions: any = { parse_mode: 'Markdown' };
    if (tenant.topicId) sendOptions.message_thread_id = tenant.topicId;

    // حذف جداکننده و لیدربرد قبلی
    if (challenge.lastDividerMessageId) {
      await ctx.telegram
        .deleteMessage(tenant.chatId, challenge.lastDividerMessageId)
        .catch(() => {});
    }
    if (challenge.lastLeaderboardMessageId) {
      await ctx.telegram
        .deleteMessage(tenant.chatId, challenge.lastLeaderboardMessageId)
        .catch(() => {});
    }

    // ارسال پیام‌های جدید و مجزا
    const dividerMsg = await ctx.telegram
      .sendMessage(tenant.chatId, '➖➖➖➖➖➖➖➖➖➖', sendOptions)
      .catch(() => null);
    const sentLbMsg = await ctx.telegram
      .sendMessage(tenant.chatId, leaderboardMessage, sendOptions)
      .catch(() => null);

    // ذخیره آیدی پیام‌ها در دیتابیس
    if (dividerMsg) challenge.lastDividerMessageId = dividerMsg.message_id;
    if (sentLbMsg) challenge.lastLeaderboardMessageId = sentLbMsg.message_id;
    await challenge.save();

    await ctx
      .answerCbQuery('✅ رتبه‌بندی با موفقیت در گروه ارسال شد.', {
        show_alert: true
      })
      .catch(() => {});
  } catch (error) {
    logger.error('Error sending leaderboard:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};
