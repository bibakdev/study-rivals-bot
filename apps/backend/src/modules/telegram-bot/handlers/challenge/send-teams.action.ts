// apps/backend/src/modules/telegram-bot/handlers/challenge/send-teams.action.ts

import { Context } from 'telegraf';
import { ChallengeModel } from '#modules/challenge/challenge.model';
import { TenantModel } from '#modules/tenant/tenant.model';
import { TargetModel } from '#modules/target/target.model';
import { UserModel } from '#modules/auth/user.model';
import { TenantMemberModel } from '#modules/tenant/tenant-member.model';
import { logger } from '#utils/logger';

const formatMinutesToTime = (minutes?: number): string => {
  if (minutes === undefined || minutes === null) return 'نامشخص';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs}:${mins.toString().padStart(2, '0')}`;
};

export const handleSendTeamsToGroupRequest = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const challengeId = ctx.match[1];

    const challenge = await ChallengeModel.findById(challengeId).lean();
    if (!challenge) {
      await ctx
        .answerCbQuery('❌ چالش مورد نظر یافت نشد.', { show_alert: true })
        .catch(() => {});
      return;
    }

    const tenant = await TenantModel.findById(challenge.tenantId).lean();
    if (!tenant || !tenant.chatId) {
      await ctx
        .answerCbQuery('❌ ربات در حال حاضر به هیچ گروهی متصل نیست.', {
          show_alert: true
        })
        .catch(() => {});
      return;
    }

    const allMemberIds = challenge.teams.flatMap((t) => t.members);
    const targets = await TargetModel.find({
      telegramId: { $in: allMemberIds },
      tenantId: challenge.tenantId
    }).lean();

    const usersInfo = await UserModel.find({
      telegramId: { $in: allMemberIds }
    }).lean();
    const tenantMembers = await TenantMemberModel.find({
      tenantId: challenge.tenantId,
      telegramId: { $in: allMemberIds }
    }).lean();

    let message = `📣 **اعلام گروه‌بندی چالش**\n\n`;
    message += `📅 **تاریخ شروع:** ${challenge.startDateText}\n`;
    message += `⏳ **مدت زمان:** ${challenge.durationDays} روز\n\n`;
    message += `📊 **لیست تیم‌ها و تارگت‌ها:**\n\n`;

    challenge.teams.forEach((team) => {
      let teamTotalMinutes = 0;

      const teamMembersText = team.members
        .map((memberId) => {
          const user = usersInfo.find((u) => u.telegramId === memberId);
          const membership = tenantMembers.find(
            (m) => m.telegramId === memberId
          );
          const target = targets.find((t) => t.telegramId === memberId);

          // 👈 اولویت با نام مستعار
          let name = 'کاربر';
          if (membership?.alias) {
            name = membership.alias;
          } else if (user) {
            name = `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`;
          }

          const targetValue = target?.dailyMinutes || 0;
          teamTotalMinutes += targetValue;

          return `👤 کاربر ${name} - تارگت: ${formatMinutesToTime(targetValue)}`;
        })
        .join('\n');

      const formattedTotal = formatMinutesToTime(teamTotalMinutes);
      message += `🔹 **${team.name}** (مجموع: ${formattedTotal})\n`;
      message += teamMembersText ? teamMembersText + '\n\n' : 'بدون عضو\n\n';
    });

    const sendOptions: any = { parse_mode: 'Markdown' };
    if (tenant.topicId) {
      sendOptions.message_thread_id = tenant.topicId;
    }

    await ctx.telegram.sendMessage(tenant.chatId, message, sendOptions);

    await ctx
      .answerCbQuery('✅ اطلاعات تیم‌ها با موفقیت در گروه ارسال شد.', {
        show_alert: true
      })
      .catch(() => {});

    logger.info(
      `Teams for challenge ${challengeId} sent to group ${tenant.chatId}.`
    );
  } catch (error) {
    logger.error('Error sending teams to group:', error);
    await ctx
      .answerCbQuery(
        '⚠️ خطایی رخ داد. بررسی کنید ربات در گروه دسترسی ارسال پیام داشته باشد.',
        { show_alert: true }
      )
      .catch(() => {});
  }
};
