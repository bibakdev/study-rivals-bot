// apps/backend/src/modules/telegram-bot/handlers/challenge/move-team-member.action.ts

import { Context, Markup } from 'telegraf';
import { ChallengeModel } from '#modules/challenge/challenge.model';
import { UserModel } from '#modules/auth/user.model';
import { TenantMemberModel } from '#modules/tenant/tenant-member.model';
import { logger } from '#utils/logger';
import { handleChangeTeamMembersRequest } from './change-team-members.action';

// ۱. نمایش لیست اعضای فعلی برای جابجایی
export const handleMoveMemberSelectUser = async (
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
        .editMessageText(
          `👥 تیم **${team.name}** هیچ عضوی برای جابجایی ندارد.`,
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

    // اگر کلا فقط ۱ تیم در چالش باشد، امکان جابجایی منطقی نیست
    if (challenge.teams.length <= 1) {
      await ctx
        .editMessageText(
          `⚠️ تیم دیگری در این چالش برای جابجایی کاربر وجود ندارد.`,
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
      telegramId: { $in: team.members }
    }).lean();

    const tenantMembers = await TenantMemberModel.find({
      tenantId: challenge.tenantId,
      telegramId: { $in: team.members }
    }).lean();

    const inlineKeyboard = team.members.map((memberId) => {
      const user = usersInfo.find((u) => u.telegramId === memberId);
      const membership = tenantMembers.find((m) => m.telegramId === memberId);

      let fullName = 'کاربر';
      if (membership?.alias) {
        fullName = membership.alias;
      } else if (user) {
        fullName = user.firstName + (user.lastName ? ` ${user.lastName}` : '');
      }

      return [
        Markup.button.callback(
          `🔄 جابجایی: ${fullName}`,
          `move_member_select_team_${challengeId}_${teamIndex}_${memberId}`
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
        `🔄 **جابجایی کاربر از تیم:** ${team.name}\n\nلطفاً کاربری که قصد انتقال آن به تیم دیگر را دارید انتخاب کنید:`,
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: inlineKeyboard }
        }
      )
      .catch(() => {});
  } catch (error) {
    logger.error('Error in move member select user menu:', error);
  }
};

// ۲. نمایش لیست تیم‌های مقصد برای انتقال کاربر
export const handleMoveMemberSelectTeam = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const challengeId = ctx.match[1];
    const fromTeamIndex = parseInt(ctx.match[2], 10);
    const targetTelegramId = parseInt(ctx.match[3], 10);

    await ctx.answerCbQuery().catch(() => {});

    const challenge = await ChallengeModel.findById(challengeId).lean();
    if (!challenge) return;

    // استخراج اطلاعات کاربری که قرار است منتقل شود
    const user = await UserModel.findOne({
      telegramId: targetTelegramId
    }).lean();
    const membership = await TenantMemberModel.findOne({
      tenantId: challenge.tenantId,
      telegramId: targetTelegramId
    }).lean();

    let fullName = 'کاربر';
    if (membership?.alias) fullName = membership.alias;
    else if (user)
      fullName = user.firstName + (user.lastName ? ` ${user.lastName}` : '');

    const inlineKeyboard: any[][] = [];

    // ساخت دکمه برای تیم‌های مقصد (تیم فعلی کاربر فیلتر می‌شود)
    challenge.teams.forEach((team, index) => {
      if (index !== fromTeamIndex) {
        inlineKeyboard.push([
          Markup.button.callback(
            `➡️ انتقال به: ${team.name}`,
            `do_move_member_${challengeId}_${fromTeamIndex}_${index}_${targetTelegramId}`
          )
        ]);
      }
    });

    inlineKeyboard.push([
      Markup.button.callback(
        '🔙 بازگشت به لیست نفرات',
        `move_member_select_user_${challengeId}_${fromTeamIndex}`
      )
    ]);

    await ctx
      .editMessageText(
        `👤 **کاربر:** ${fullName}\n\nلطفاً تیمی که قصد دارید این کاربر به آن منتقل شود را انتخاب کنید.\n(تمامی ساعت‌های مطالعه کاربر محفوظ مانده و به صورت خودکار به امتیاز تیم جدید اضافه می‌شود):`,
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: inlineKeyboard }
        }
      )
      .catch(() => {});
  } catch (error) {
    logger.error('Error in move member select team menu:', error);
  }
};

// ۳. انجام عملیات جابجایی در دیتابیس
export const handleDoMoveMember = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const challengeId = ctx.match[1];
    const fromTeamIndex = parseInt(ctx.match[2], 10);
    const toTeamIndex = parseInt(ctx.match[3], 10);
    const targetTelegramId = parseInt(ctx.match[4], 10);

    await ctx.answerCbQuery('✅ کاربر با موفقیت جابجا شد.').catch(() => {});

    const challenge = await ChallengeModel.findById(challengeId);
    if (
      !challenge ||
      !challenge.teams[fromTeamIndex] ||
      !challenge.teams[toTeamIndex]
    )
      return;

    // حذف کاربر از آرایه members تیم مبدا
    challenge.teams[fromTeamIndex].members = challenge.teams[
      fromTeamIndex
    ].members.filter((id) => id !== targetTelegramId);

    // اضافه کردن کاربر به آرایه members تیم مقصد (در صورتی که وجود نداشته باشد)
    if (!challenge.teams[toTeamIndex].members.includes(targetTelegramId)) {
      challenge.teams[toTeamIndex].members.push(targetTelegramId);
    }

    await challenge.save();

    // شبیه‌سازی کال‌بک بازگشت به منوی مدیریت اعضای تیم
    ctx.match = [
      '',
      challengeId,
      fromTeamIndex.toString()
    ] as unknown as RegExpExecArray;
    await handleChangeTeamMembersRequest(ctx);
  } catch (error) {
    logger.error('Error doing move member:', error);
  }
};
