// apps/backend/src/modules/telegram-bot/handlers/challenge/manage-group-challenges.action.ts

import { Context, Markup } from 'telegraf';
import { logger } from '#utils/logger';

export const handleManageGroupChallengesRequest = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const tenantId = ctx.match[1];

    // بستن حالت لودینگ دکمه شیشه‌ای
    await ctx.answerCbQuery().catch(() => {});

    // منوی دسته‌بندی چالش‌ها بر اساس وضعیت
    const inlineKeyboard = [
      [
        Markup.button.callback(
          '⏳ چالش‌های اجرا نشده',
          `action_list_challenges_${tenantId}_pending`
        )
      ],
      [
        Markup.button.callback(
          '▶️ چالش‌های در حال اجرا',
          `action_list_challenges_${tenantId}_active`
        )
      ],
      [
        Markup.button.callback(
          '✅ چالش‌های تکمیل شده',
          `action_list_challenges_${tenantId}_completed`
        )
      ],
      [
        Markup.button.callback(
          '🔙 بازگشت',
          `action_group_challenge_${tenantId}`
        )
      ]
    ];

    await ctx
      .editMessageText(
        '⚙️ **مدیریت چالش‌های گروهی**\n\nلطفاً وضعیت چالش‌های مورد نظر خود را انتخاب کنید:',
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: inlineKeyboard }
        }
      )
      .catch((err) => {
        if (!err.description?.includes('message is not modified')) {
          logger.warn(
            `Could not edit message in manage group challenges menu: ${err.description}`
          );
        }
      });
  } catch (error) {
    logger.error('Error handling manage group challenges menu action:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد. لطفا دوباره تلاش کنید.', {
        show_alert: true
      })
      .catch(() => {});
  }
};
