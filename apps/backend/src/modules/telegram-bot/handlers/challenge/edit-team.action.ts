// apps/backend/src/modules/telegram-bot/handlers/challenge/edit-team.action.ts

import { Context, Markup } from 'telegraf';
import { ChallengeModel } from '#modules/challenge/challenge.model';
import { UserModel } from '#modules/auth/user.model';
import { logger } from '#utils/logger';

export const handleEditTeamRequest = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const challengeId = ctx.match[1];
    const teamIndex = parseInt(ctx.match[2], 10);

    await ctx.answerCbQuery().catch(() => {});

    const challenge = await ChallengeModel.findById(challengeId).lean();

    if (!challenge || !challenge.teams[teamIndex]) {
      await ctx
        .editMessageText('❌ تیم یا چالش مورد نظر یافت نشد.', {
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback(
                  '🔙 بازگشت',
                  `edit_challenge_${challengeId}`
                )
              ]
            ]
          }
        })
        .catch(() => {});
      return;
    }

    const team = challenge.teams[teamIndex];

    // واکشی اطلاعات کاربران این تیم
    const usersInfo = await UserModel.find({
      telegramId: { $in: team.members }
    }).lean();

    let membersList = '';
    if (team.members.length === 0) {
      membersList = 'بدون عضو\n';
    } else {
      team.members.forEach((memberId) => {
        const user = usersInfo.find((u) => u.telegramId === memberId);
        const name = user
          ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
          : 'کاربر';
        membersList += `👤 ${name}\n`;
      });
    }

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

    await ctx
      .editMessageText(
        `⚙️ **مدیریت تیم:** ${team.name}\n\n` +
          `👥 **اعضای فعلی تیم:**\n${membersList}\n` +
          `لطفاً عملیات مورد نظر را انتخاب کنید:`,
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: inlineKeyboard }
        }
      )
      .catch((err) => {
        logger.warn(`Could not edit message in edit team: ${err.description}`);
      });
  } catch (error) {
    logger.error('Error handling edit team action:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};
