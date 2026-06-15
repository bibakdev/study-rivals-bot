import { Context } from 'telegraf';
import { ForbiddenUserModel } from '#modules/auth/forbidden-user.model';
import { logger } from '#utils/logger';
import { handleDeepLink } from './deep-link.action';
import { handleStandardStart } from './standard.action';

interface ExtendedContext extends Context {
  payload?: string;
}

export const startCommand = async (
  ctx: ExtendedContext,
  next: () => Promise<void>
): Promise<void> => {
  if (ctx.chat?.type !== 'private') return next();

  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  try {
    const isForbidden = await ForbiddenUserModel.findOne({
      telegramId,
      isBlacklisted: true
    }).lean();

    if (isForbidden) {
      await ctx.setChatMenuButton({ type: 'default' });
      await ctx.reply('❌ حساب کاربری شما مسدود شده است.');
      return;
    }

    const payload = ctx.payload;

    if (payload && payload.startsWith('ref_')) {
      await handleDeepLink(ctx, payload, telegramId);
    } else {
      await handleStandardStart(ctx, telegramId);
    }
  } catch (error) {
    logger.error('Error processing startCommand structure:', error);
    await ctx.reply('⚠️ خطایی رخ داد. مجدداً دستور /start را ارسال کنید.');
  }
};
