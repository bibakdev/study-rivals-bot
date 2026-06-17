// apps/backend/src/modules/telegram-bot/handlers/challenge/challenges-menu.action.ts

import { Context, Markup } from 'telegraf';
import { logger } from '#utils/logger';

export const handleChallengesMenu = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const tenantId = ctx.match[1];

    // بستن حالت لودینگ دکمه شیشه‌ای
    await ctx.answerCbQuery().catch(() => {});

    // منوی لیست چالش‌ها (فعلاً فقط چالش گروهی قرار داده شده است)
    const inlineKeyboard = [
      [
        Markup.button.callback(
          '👥 چالش گروهی',
          `action_group_challenge_${tenantId}`
        )
      ],
      [
        Markup.button.callback(
          '🔙 بازگشت به پنل گروه',
          `select_tenant_${tenantId}`
        )
      ]
    ];

    await ctx
      .editMessageText(
        '🏆 **بخش چالش‌ها**\n\nدر این بخش می‌توانید در رقابت‌های مختلف شرکت کنید. لطفاً چالش مورد نظر خود را انتخاب کنید:',
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: inlineKeyboard }
        }
      )
      .catch((err) => {
        logger.warn(
          `Could not edit message in challenges menu: ${err.description}`
        );
      });
  } catch (error) {
    logger.error('Error handling challenges menu action:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد. لطفا دوباره تلاش کنید.', {
        show_alert: true
      })
      .catch(() => {});
  }
};
