// apps/backend/src/modules/telegram-bot/handlers/challenge/change-team-members.action.ts

import { Context, Markup } from 'telegraf';
import { ChallengeModel } from '#modules/challenge/challenge.model';
import { UserModel } from '#modules/auth/user.model';
import { logger } from '#utils/logger';

export const handleChangeTeamMembersRequest = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const challengeId = ctx.match[1];
    const teamIndex = parseInt(ctx.match[2], 10);

    await ctx.answerCbQuery().catch(() => {});

    const challenge = await ChallengeModel.findById(challengeId).lean();

    if (!challenge || !challenge.teams[teamIndex]) {
      await ctx
        .editMessageText('❌ چالش یا تیم مورد نظر یافت نشد.')
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
          '➕ اضافه کردن کاربر',
          `add_member_menu_${challengeId}_${teamIndex}`
        )
      ],
      [
        Markup.button.callback(
          '➖ حذف کاربر',
          `remove_member_menu_${challengeId}_${teamIndex}`
        )
      ],
      [
        Markup.button.callback(
          '🔄 جابجایی کاربر',
          `move_member_select_user_${challengeId}_${teamIndex}`
        )
      ],
      [
        Markup.button.callback(
          '🔙 بازگشت',
          `edit_team_${challengeId}_${teamIndex}`
        )
      ]
    ];

    await ctx
      .editMessageText(
        `👥 **تغییر اعضای تیم:** ${team.name}\n\n` +
          `تعداد اعضای فعلی: ${team.members.length} نفر\n\n` +
          `لیست نفرات:\n${membersList}\n` +
          `لطفاً عملیات مورد نظر را انتخاب کنید:`,
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: inlineKeyboard }
        }
      )
      .catch(() => {});
  } catch (error) {
    logger.error('Error in change team members menu:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};
