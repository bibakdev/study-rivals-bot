// apps/backend/src/modules/telegram-bot/handlers/target/delete-target.action.ts

import { Context, Markup } from 'telegraf';
import mongoose from 'mongoose';
import { TargetModel } from '#modules/target/target.model';
import { logger } from '#utils/logger';

export const handleDeleteTargetRequest = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const tenantId = ctx.match[1];
    const telegramId = ctx.from?.id;

    await ctx.answerCbQuery().catch(() => {});

    if (!telegramId) return;

    // حذف رکورد از دیتابیس
    await TargetModel.deleteOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      telegramId
    });

    await ctx
      .editMessageText(
        '🗑 **تارگت شما با موفقیت حذف شد.**\nشما دیگر در این چالش تارگت فعالی ندارید.',
        {
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
        }
      )
      .catch(() => {});

    logger.info(`Target deleted by ${telegramId} for tenant ${tenantId}`);
  } catch (error) {
    logger.error('Error in delete target action:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};
