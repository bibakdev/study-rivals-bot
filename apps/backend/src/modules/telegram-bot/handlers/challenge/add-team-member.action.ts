// apps/backend/src/modules/telegram-bot/handlers/challenge/add-team-member.action.ts

import { Context, Markup } from 'telegraf';
import mongoose from 'mongoose';
import { ChallengeModel } from '#modules/challenge/challenge.model';
import { TargetModel } from '#modules/target/target.model';
import { UserModel } from '#modules/auth/user.model';
import { logger } from '#utils/logger';

// نمایش لیست افراد واجد شرایط (دارای تارگت و بدون تیم)
export const handleAddMemberMenu = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const challengeId = ctx.match[1];
    const teamIndex = parseInt(ctx.match[2], 10);

    await ctx.answerCbQuery().catch(() => {});

    const challenge = await ChallengeModel.findById(challengeId).lean();
    if (!challenge || !challenge.teams[teamIndex]) return;

    // پیدا کردن تمام کاربرانی که در این چالش عضو تیمی هستند
    const allMembersInChallenge = new Set(
      challenge.teams.flatMap((t) => t.members)
    );

    // پیدا کردن کاربرانی که در این گروه تارگت دارند
    const targets = await TargetModel.find({
      tenantId: challenge.tenantId
    }).lean();

    // فیلتر کردن کاربرانی که تارگت دارند ولی در هیچ تیمی نیستند
    const eligibleUserIds = targets
      .map((t) => t.telegramId)
      .filter((id) => !allMembersInChallenge.has(id));

    if (eligibleUserIds.length === 0) {
      await ctx
        .editMessageText(
          `➕ هیچ کاربری یافت نشد!\n\nتمامی کاربرانی که تارگت مشخص کرده‌اند، هم‌اکنون عضو تیم‌ها هستند.`,
          {
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
          }
        )
        .catch(() => {});
      return;
    }

    const usersInfo = await UserModel.find({
      telegramId: { $in: eligibleUserIds }
    }).lean();

    const inlineKeyboard = usersInfo.map((u) => {
      const fullName = u.firstName + (u.lastName ? ` ${u.lastName}` : '');
      return [
        Markup.button.callback(
          `➕ افزودن: ${fullName}`,
          `do_add_member_${challengeId}_${teamIndex}_${u.telegramId}`
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
        `➕ **اضافه کردن کاربر به تیم:** ${challenge.teams[teamIndex].name}\n\nلطفاً کاربر مورد نظر را انتخاب کنید:`,
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: inlineKeyboard }
        }
      )
      .catch(() => {});
  } catch (error) {
    logger.error('Error in add member menu:', error);
  }
};

// انجام عملیات اضافه کردن و بازگشت به لیست
export const handleDoAddMember = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const challengeId = ctx.match[1];
    const teamIndex = parseInt(ctx.match[2], 10);
    const targetTelegramId = parseInt(ctx.match[3], 10);

    await ctx
      .answerCbQuery('✅ کاربر با موفقیت به تیم اضافه شد')
      .catch(() => {});

    const challenge = await ChallengeModel.findById(challengeId);
    if (!challenge || !challenge.teams[teamIndex]) return;

    // اضافه کردن شناسه در صورتی که تکراری نباشد
    if (!challenge.teams[teamIndex].members.includes(targetTelegramId)) {
      challenge.teams[teamIndex].members.push(targetTelegramId);
      await challenge.save();
    }

    // فراخوانی مجدد منوی لیست برای آپدیت شدن صفحه
    await handleAddMemberMenu(ctx);
  } catch (error) {
    logger.error('Error doing add member:', error);
  }
};
