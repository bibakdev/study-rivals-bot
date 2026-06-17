// apps/backend/src/modules/telegram-bot/handlers/challenge/cancel-edit-team-name.action.ts

import { Context, Markup } from 'telegraf';
import { BotStateModel } from '#modules/telegram-bot/models/bot-state.model';
import { ChallengeModel } from '#modules/challenge/challenge.model';
import { logger } from '#utils/logger';

export const handleCancelEditTeamName = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const challengeId = ctx.match[1];
    const teamIndex = parseInt(ctx.match[2], 10);
    const telegramId = ctx.from?.id;

    await ctx.answerCbQuery().catch(() => {});

    if (!telegramId) return;

    // پاک کردن وضعیت کاربر از دیتابیس (خروج از حالت انتظار برای نام)
    await BotStateModel.deleteOne({ telegramId, action: 'EDIT_TEAM_NAME' });

    // واکشی مجدد چالش برای نمایش نام قبلی در منو
    const challenge = await ChallengeModel.findById(challengeId).lean();

    if (!challenge || !challenge.teams[teamIndex]) {
      await ctx
        .editMessageText('❌ چالش یا تیم مورد نظر یافت نشد.')
        .catch(() => {});
      return;
    }

    const team = challenge.teams[teamIndex];

    const inlineKeyboard = [
      [
        Markup.button.callback(
          '📝 تغییر نام تیم',
          `change_team_name_${challengeId}_${teamIndex}`
        )
      ],
      [
        Markup.button.callback(
          '👤 تغییر اعضای تیم',
          `change_team_members_${challengeId}_${teamIndex}`
        )
      ],
      [
        Markup.button.callback(
          '🔙 بازگشت به لیست تیم‌ها',
          `edit_challenge_${challengeId}`
        )
      ]
    ];

    // ویرایش پیام به حالت لغو شده و نمایش مجدد منوی مدیریت تیم
    await ctx
      .editMessageText(
        `❌ عملیات تغییر نام لغو شد.\n\n⚙️ **مدیریت تیم:** ${team.name}\n\nلطفاً عملیات مورد نظر را انتخاب کنید:`,
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: inlineKeyboard }
        }
      )
      .catch(() => {});
  } catch (error) {
    logger.error('Error cancelling team name change:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};
