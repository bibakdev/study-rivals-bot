// apps/backend/src/modules/telegram-bot/handlers/challenge/challenge-state.action.ts

import { Context, Markup } from 'telegraf';
import mongoose from 'mongoose';
import { BotStateModel } from '#modules/telegram-bot/models/bot-state.model';
import { TargetModel } from '#modules/target/target.model';
import { ChallengeModel } from '#modules/challenge/challenge.model';
import { UserModel } from '#modules/auth/user.model';
import { TenantMemberModel } from '#modules/tenant/tenant-member.model';
import { logger } from '#utils/logger';
import { parsePersianDate } from '#modules/challenge/utils/date-parser.util';

const formatMinutesToTime = (minutes?: number): string => {
  if (minutes === undefined || minutes === null) return 'نامشخص';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs}:${mins.toString().padStart(2, '0')}`;
};

export const handleChallengeStateText = async (
  ctx: Context,
  telegramId: number,
  text: string
): Promise<boolean> => {
  try {
    const state = await BotStateModel.findOne({
      telegramId,
      action: { $regex: '^(ADD_CHALLENGE_|EDIT_TEAM_NAME)' }
    }).lean();

    if (!state) return false;

    const payload = state.payload as any;
    const tenantId = payload.tenantId;

    if (state.action === 'EDIT_TEAM_NAME') {
      const { challengeId, teamIndex } = payload;
      const newName = text.trim();

      if (newName.length < 2) {
        await ctx.reply(
          '❌ نام تیم باید حداقل ۲ کاراکتر باشد. لطفاً دوباره ارسال کنید:'
        );
        return true;
      }

      const challenge = await ChallengeModel.findById(challengeId);
      if (!challenge || !challenge.teams[teamIndex]) {
        await ctx.reply('❌ چالش یا تیم مورد نظر یافت نشد.');
        await BotStateModel.deleteOne({ telegramId });
        return true;
      }

      challenge.teams[teamIndex].name = newName;
      await challenge.save();

      await BotStateModel.deleteOne({ telegramId });

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

      await ctx.reply(
        `✅ نام تیم با موفقیت به **${newName}** تغییر یافت.\n\n⚙️ **مدیریت تیم:** ${newName}\n\nلطفاً عملیات مورد نظر را انتخاب کنید:`,
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: inlineKeyboard }
        }
      );
      return true;
    }

    if (state.action === 'ADD_CHALLENGE_DATE') {
      const parsedDate = parsePersianDate(text);
      if (!parsedDate.isValid) {
        await ctx.reply(`❌ ${parsedDate.error}`);
        return true;
      }

      await BotStateModel.updateOne(
        { telegramId },
        {
          $set: {
            action: 'ADD_CHALLENGE_DURATION',
            'payload.startDateText': text,
            'payload.startDate': parsedDate.date
          }
        }
      );

      await ctx.reply(
        '⏳ **گام ۲: مدت زمان چالش**\n\nلطفاً تعداد روزهای چالش را به صورت عدد وارد کنید (مثلاً: `6`):',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback(
                  '❌ انصراف',
                  `cancel_add_challenge_${tenantId}`
                )
              ]
            ]
          }
        }
      );
      return true;
    }

    if (state.action === 'ADD_CHALLENGE_DURATION') {
      const duration = parseInt(text, 10);
      if (isNaN(duration) || duration <= 0) {
        await ctx.reply('❌ لطفاً فقط یک عدد صحیح و مثبت وارد کنید.');
        return true;
      }

      // 🛡️ فیلتر امنیتی: استخراج فقط اعضایی که در گروه حضور دارند و تعلیق نیستند
      const activeMembers = await TenantMemberModel.find({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        isSuspended: false
      }).lean();

      const activeMemberIds = activeMembers.map((m) => m.telegramId);

      // استخراج تارگت‌ها فقط برای اعضای معتبر
      const targets = await TargetModel.find({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        telegramId: { $in: activeMemberIds }
      }).lean();

      const targetCount = targets.length;

      if (targetCount === 0) {
        await BotStateModel.deleteOne({ telegramId });
        await ctx.reply(
          '⚠️ **هیچ کاربری واجد شرایط نیست!**\nکاربران فعال این گروه هنوز تارگتی ثبت نکرده‌اند.'
        );
        return true;
      }

      await BotStateModel.updateOne(
        { telegramId },
        {
          $set: {
            action: 'ADD_CHALLENGE_TEAMS',
            'payload.durationDays': duration
          }
        }
      );

      await ctx.reply(
        `👥 **گام ۳: تعیین تیم‌ها**\n\nتا این لحظه **${targetCount} نفر** فعال و واجد شرایط برای چالش تارگت مشخص کرده‌اند.\nمی‌خواهید این نفرات به چند تیم تقسیم شوند؟ (عدد وارد کنید، پیش‌فرض: \`2\`):`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback(
                  '❌ انصراف',
                  `cancel_add_challenge_${tenantId}`
                )
              ]
            ]
          }
        }
      );
      return true;
    }

    if (state.action === 'ADD_CHALLENGE_TEAMS') {
      let teamCount = parseInt(text, 10);
      if (isNaN(teamCount) || teamCount <= 0) {
        teamCount = 2;
      }

      // 🛡️ فیلتر امنیتی مجدد: استخراج اعضای فعال
      const activeMembers = await TenantMemberModel.find({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        isSuspended: false
      }).lean();

      const activeMemberIds = activeMembers.map((m) => m.telegramId);

      const targets = await TargetModel.find({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        telegramId: { $in: activeMemberIds }
      }).lean();

      const sortedTargets = targets.sort(
        (a, b) => b.dailyMinutes - a.dailyMinutes
      );

      const teamStats = Array.from({ length: teamCount }, (_, i) => ({
        name: `گروه ${String.fromCharCode(65 + i)}`,
        members: [] as number[],
        totalMinutes: 0
      }));

      for (const target of sortedTargets) {
        let minTeam = teamStats[0];
        for (let i = 1; i < teamStats.length; i++) {
          if (teamStats[i].totalMinutes < minTeam.totalMinutes) {
            minTeam = teamStats[i];
          }
        }
        minTeam.members.push(target.telegramId);
        minTeam.totalMinutes += target.dailyMinutes;
      }

      const teams = teamStats.map((t) => ({
        name: t.name,
        members: t.members
      }));
      const startDate = new Date(payload.startDate);
      const durationDays = payload.durationDays;
      const endDate = new Date(
        startDate.getTime() + durationDays * 24 * 60 * 60 * 1000
      );

      const participantTargets = targets.map((t) => ({
        telegramId: t.telegramId,
        target: t.dailyMinutes
      }));

      await ChallengeModel.create({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        type: 'group',
        startDateText: payload.startDateText,
        startDate: startDate,
        endDate: endDate,
        durationDays: durationDays,
        teams,
        participantTargets
      });

      await BotStateModel.deleteOne({ telegramId });

      let reportMessage = `✅ **چالش گروهی با موفقیت ایجاد شد!**\n\n`;
      reportMessage += `📅 **تاریخ شروع:** ${payload.startDateText}\n`;
      reportMessage += `⏳ **مدت زمان:** ${payload.durationDays} روز\n\n`;
      reportMessage += `📊 **گروه‌بندی‌ها (توزیع عادلانه):**\n\n`;

      const allUserIds = targets.map((t) => t.telegramId);
      const usersInfo = await UserModel.find({
        telegramId: { $in: allUserIds }
      }).lean();

      const tenantMembers = await TenantMemberModel.find({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        telegramId: { $in: allUserIds }
      }).lean();

      for (const teamStat of teamStats) {
        const formattedTotal = formatMinutesToTime(teamStat.totalMinutes);
        reportMessage += `🔹 **${teamStat.name}** (مجموع تارگت: ${formattedTotal})\n`;

        for (const memberId of teamStat.members) {
          const user = usersInfo.find((u) => u.telegramId === memberId);
          const membership = tenantMembers.find(
            (m) => m.telegramId === memberId
          );
          const rawTarget = targets.find((t) => t.telegramId === memberId);

          let name = 'کاربر';
          if (membership?.alias) {
            name = membership.alias;
          } else if (user) {
            name = `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`;
          }

          const targetValue = formatMinutesToTime(rawTarget?.dailyMinutes);
          reportMessage += `👤 ${name} - تارگت: ${targetValue}\n`;
        }
        reportMessage += '\n';
      }

      await ctx.reply(reportMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              Markup.button.callback(
                '🔙 لیست چالش‌های اجرا نشده',
                `action_list_challenges_${tenantId}_pending`
              )
            ]
          ]
        }
      });
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Error in challenge state machine:', error);
    await ctx.reply('⚠️ خطایی در پردازش اطلاعات رخ داد. فرآیند لغو شد.');
    await BotStateModel.deleteOne({ telegramId }).catch(() => {});
    return true;
  }
};
