import { Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { Update } from 'telegraf/types';
import { UserModel } from '#modules/auth/user.model';
import { logger } from '#utils/logger';
import { getTopicId } from './tenant.utils';
import { handleAutoActivate } from './auto-activate.action';
import { handleManualBind } from './manual-bind.action';

export const handleGroupTenantMessages = async (
  ctx: Context<Update>,
  next: () => Promise<void>
): Promise<void> => {
  if (!ctx.has(message('text')) || !ctx.chat) return next();

  const chatType = ctx.chat.type;
  if (chatType !== 'group' && chatType !== 'supergroup') return next();

  const chatId = ctx.chat.id;
  const telegramId = ctx.from?.id;
  const rawText = ctx.message.text.trim().toUpperCase();

  if (!telegramId) return next();
  if (rawText !== 'START' && rawText !== '/START') return next();

  try {
    const extractedTopicId = getTopicId(ctx);
    const replyOptions = { message_thread_id: extractedTopicId };

    const botUsername = ctx.botInfo?.username;
    if (!botUsername) {
      logger.error(
        'Bot info is missing from context. Cannot generate deep link.'
      );
      return;
    }

    const currentUser = await UserModel.findOne({ telegramId }).lean();
    const isMother = currentUser?.role === 'mother';

    if (isMother) {
      await handleAutoActivate(
        ctx,
        chatId,
        telegramId,
        extractedTopicId,
        botUsername,
        replyOptions
      );
      return;
    }

    await handleManualBind(
      ctx,
      chatId,
      telegramId,
      extractedTopicId,
      botUsername,
      replyOptions
    );
  } catch (error) {
    logger.error(
      'Critical Error during group tenant single-step binding:',
      error
    );
  }
};
