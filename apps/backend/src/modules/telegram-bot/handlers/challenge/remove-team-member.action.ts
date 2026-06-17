// apps/backend/src/modules/telegram-bot/handlers/challenge/remove-team-member.action.ts

import { Context, Markup } from 'telegraf';
import { ChallengeModel } from '#modules/challenge/challenge.model';
import { UserModel } from '#modules/auth/user.model';
import { TimeLogModel } from '#modules/time-log/time-log.model'; // 👈 اضافه شد
import { logger } from '#utils/logger';

// نمایش لیست اعضای فعلی برای حذف
export const handleRemoveMemberMenu = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const challengeId = ctx.match[1];
    const teamIndex = parseInt(ctx.match[2], 10);

    await ctx.answerCbQuery().catch(() => {});

    const challenge = await ChallengeModel.findById(challengeId).lean();
    if (!challenge || !challenge.teams[teamIndex]) return;

    const team = challenge.teams[teamIndex];

    if (team.members.length === 0) {
      await ctx
        .editMessageText(`👥 تیم **${team.name}** هیچ عضوی برای حذف ندارد.`, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback(
                  '🔙 بازگشت',
                  `change_team_members_${challengeId}_${teamIndex}`
                )
              ]
            ]
          }
        })
        .catch(() => {});
      return;
    }

    const usersInfo = await UserModel.find({
      telegramId: { $in: team.members }
    }).lean();

    const inlineKeyboard = usersInfo.map((u) => {
      const fullName = u.firstName + (u.lastName ? ` ${u.lastName}` : '');
      return [
        Markup.button.callback(
          `❌ حذف: ${fullName}`,
          `do_remove_member_${challengeId}_${teamIndex}_${u.telegramId}`
        )
      ];
    });

    inlineKeyboard.push([
      Markup.button.callback(
        '🔙 بازگشت',
        `change_team_members_${challengeId}_${teamIndex}`
      )
    ]);

    await ctx
      .editMessageText(
        `➖ **حذف کاربر از تیم:** ${team.name}\n\nلطفاً کاربری که قصد حذف آن را دارید انتخاب کنید:`,
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: inlineKeyboard }
        }
      )
      .catch(() => {});
  } catch (error) {
    logger.error('Error in remove member menu:', error);
  }
};

// انجام عملیات حذف و بازگشت به همان لیست
export const handleDoRemoveMember = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const challengeId = ctx.match[1];
    const teamIndex = parseInt(ctx.match[2], 10);
    const targetTelegramId = parseInt(ctx.match[3], 10);

    await ctx
      .answerCbQuery('✅ کاربر و تایم‌های ثبت‌شده‌اش حذف شدند.')
      .catch(() => {});

    const challenge = await ChallengeModel.findById(challengeId);
    if (!challenge || !challenge.teams[teamIndex]) return;

    // حذف کاربر از آرایه members چالش
    challenge.teams[teamIndex].members = challenge.teams[
      teamIndex
    ].members.filter((id) => id !== targetTelegramId);
    await challenge.save();

    // 👈 پاک کردن تمام تایم‌های ثبت شده‌ی این کاربر برای این چالش
    await TimeLogModel.deleteMany({
      challengeId: challenge._id,
      telegramId: targetTelegramId
    });

    // فراخوانی مجدد منوی لیست اعضا برای آپدیت شدن صفحه
    await handleRemoveMemberMenu(ctx);
  } catch (error) {
    logger.error('Error doing remove member:', error);
  }
};
