// apps/backend/src/modules/telegram-bot/handlers/challenge/group-challenge-menu.action.ts

import { Context, Markup } from 'telegraf';
import { logger } from '#utils/logger';

export const handleGroupChallengeMenu = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const tenantId = ctx.match[1];

    // بستن حالت لودینگ دکمه شیشه‌ای
    await ctx.answerCbQuery().catch(() => {});

    // منوی چالش گروهی شامل دو دکمه درخواستی و یک دکمه بازگشت
    const inlineKeyboard = [
      [
        Markup.button.callback(
          '➕ اضافه کردن چالش گروهی',
          `action_add_group_challenge_${tenantId}`
        )
      ],
      [
        Markup.button.callback(
          '⚙️ مدیریت چالش‌های گروهی',
          `action_manage_group_challenges_${tenantId}`
        )
      ],
      [
        Markup.button.callback(
          '🔙 بازگشت به چالش‌ها',
          `action_challenges_${tenantId}`
        )
      ]
    ];

    await ctx
      .editMessageText(
        '👥 **منوی چالش گروهی**\n\nلطفاً یکی از عملیات زیر را انتخاب کنید:',
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: inlineKeyboard }
        }
      )
      .catch((err) => {
        // نادیده گرفتن خطای کلیک‌های تکراری و سریع
        if (!err.description?.includes('message is not modified')) {
          logger.warn(
            `Could not edit message in group challenge menu: ${err.description}`
          );
        }
      });
  } catch (error) {
    logger.error('Error handling group challenge menu action:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد. لطفا دوباره تلاش کنید.', {
        show_alert: true
      })
      .catch(() => {});
  }
};
