// apps/backend/src/modules/telegram-bot/handlers/challenge/edit-challenge.action.ts

import { Context, Markup } from 'telegraf';
import { ChallengeModel } from '#modules/challenge/challenge.model';
import { logger } from '#utils/logger';

export const handleEditChallengeRequest = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const challengeId = ctx.match[1];

    // بستن حالت لودینگ دکمه شیشه‌ای
    await ctx.answerCbQuery().catch(() => {});

    // جستجوی چالش برای دریافت تیم‌ها
    const challenge = await ChallengeModel.findById(challengeId).lean();

    if (!challenge) {
      await ctx
        .editMessageText('❌ چالش مورد نظر یافت نشد.', {
          reply_markup: {
            inline_keyboard: [
              [Markup.button.callback('🔙 بستن', 'action_manage_groups')]
            ]
          }
        })
        .catch(() => {});
      return;
    }

    // 👈 بررسی وضعیت چالش: حالا به pending و active هر دو اجازه ویرایش می‌دهد
    if (challenge.status !== 'pending' && challenge.status !== 'active') {
      await ctx
        .answerCbQuery(
          '⚠️ فقط چالش‌های اجرا نشده یا در حال اجرا قابل ویرایش هستند.',
          {
            show_alert: true
          }
        )
        .catch(() => {});
      return;
    }

    const inlineKeyboard = [];

    // ساخت یک دکمه برای هر تیم با پاس دادن ایندکس تیم
    challenge.teams.forEach((team, index) => {
      inlineKeyboard.push([
        Markup.button.callback(
          `👥 ${team.name} (${team.members.length} عضو)`,
          `edit_team_${challengeId}_${index}`
        )
      ]);
    });

    // دکمه بازگشت به جزئیات چالش
    inlineKeyboard.push([
      Markup.button.callback('🔙 بازگشت', `view_challenge_${challengeId}`)
    ]);

    await ctx
      .editMessageText(
        '✏️ **ویرایش چالش**\n\nلطفاً تیمی که قصد ویرایش آن را دارید انتخاب کنید:',
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: inlineKeyboard }
        }
      )
      .catch((err) => {
        logger.warn(
          `Could not edit message in edit challenge: ${err.description}`
        );
      });
  } catch (error) {
    logger.error('Error handling edit challenge action:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};
