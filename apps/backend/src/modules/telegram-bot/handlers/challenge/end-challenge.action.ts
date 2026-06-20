// apps/backend/src/modules/telegram-bot/handlers/challenge/end-challenge.action.ts

import { Context, Markup } from 'telegraf';
import jalaali from 'jalaali-js'; // 👈 اضافه شد برای محاسبه تاریخ شمسی
import { ChallengeModel } from '#modules/challenge/challenge.model';
import { TenantModel } from '#modules/tenant/tenant.model';
import { UserModel } from '#modules/auth/user.model';
import { TenantMemberModel } from '#modules/tenant/tenant-member.model';
import { TimeLogModel } from '#modules/time-log/time-log.model';
import { formatMinutesToTime } from '#modules/time-log/utils/time-parser.util';
import { logger } from '#utils/logger';

// 👈 ماه‌های شمسی برای گزارش شفافیت
const PERSIAN_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند'
];

// 👈 تابع کمکی برای ایجاد تاخیر زمانی (فاز ۴)
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const handleEndChallengePrompt = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const challengeId = ctx.match[1];
    await ctx.answerCbQuery().catch(() => {});

    const challenge = await ChallengeModel.findById(challengeId).lean();
    if (!challenge) {
      await ctx.editMessageText('❌ چالش یافت نشد.').catch(() => {});
      return;
    }

    if (challenge.status !== 'active') {
      await ctx
        .answerCbQuery('⚠️ این چالش در حال اجرا نیست.', { show_alert: true })
        .catch(() => {});
      return;
    }

    await ctx
      .editMessageText(
        '⚠️ **تاییدیه خاتمه چالش**\n\nآیا مطمئن هستید که می‌خواهید این چالش را پیش از موعد متوقف و خاتمه دهید؟\n\nپس از خاتمه، چالش به لیست «تکمیل شده‌ها» منتقل شده و گزارش نهایی در گروه ارسال می‌گردد.',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback(
                  '✅ بله، چالش را خاتمه بده',
                  `confirm_end_challenge_${challengeId}`
                )
              ],
              [
                Markup.button.callback(
                  '❌ خیر، انصراف',
                  `view_challenge_${challengeId}`
                )
              ]
            ]
          }
        }
      )
      .catch(() => {});
  } catch (error) {
    logger.error('Error in end challenge prompt:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};

export const handleDoEndChallenge = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const challengeId = ctx.match[1];

    const challenge = await ChallengeModel.findByIdAndUpdate(
      challengeId,
      { $set: { status: 'completed' } },
      { new: true }
    ).lean();

    if (!challenge) {
      await ctx
        .answerCbQuery('❌ چالش یافت نشد.', { show_alert: true })
        .catch(() => {});
      return;
    }

    await ctx.answerCbQuery('✅ چالش با موفقیت خاتمه یافت.').catch(() => {});

    const tenant = await TenantModel.findById(challenge.tenantId).lean();

    if (tenant && tenant.chatId) {
      // 👈 فاز ۱: واکشی بهینه تمام لاگ‌ها فقط با یک کوئری و نگاشت در مموری
      const allTimeLogs = await TimeLogModel.find({
        challengeId: challenge._id
      }).lean();

      const logsMap = new Map<
        number,
        {
          daysLogged: number;
          totalMinutes: number;
          dailyRecords: Map<number, number>;
        }
      >();

      const startMs = challenge.startDate.getTime();
      const DAY_MS = 24 * 60 * 60 * 1000;

      allTimeLogs.forEach((log) => {
        const dayIndex = Math.round((log.date.getTime() - startMs) / DAY_MS);

        if (!logsMap.has(log.telegramId)) {
          logsMap.set(log.telegramId, {
            daysLogged: 0,
            totalMinutes: 0,
            dailyRecords: new Map()
          });
        }

        const userStats = logsMap.get(log.telegramId)!;
        userStats.totalMinutes += log.minutes;
        userStats.daysLogged += 1;
        userStats.dailyRecords.set(dayIndex, log.minutes);
      });

      const allMemberIds = challenge.teams.flatMap((t) => t.members);
      const usersInfo = await UserModel.find({
        telegramId: { $in: allMemberIds }
      }).lean();
      const tenantMembers = await TenantMemberModel.find({
        tenantId: challenge.tenantId,
        telegramId: { $in: allMemberIds }
      }).lean();

      const teamStats = challenge.teams
        .map((team) => {
          let teamTotal = 0;
          const membersWithStats = team.members
            .map((memberId) => {
              const user = usersInfo.find((u) => u.telegramId === memberId);
              const membership = tenantMembers.find(
                (m) => m.telegramId === memberId
              );

              let name = 'کاربر';
              if (membership?.alias) {
                name = membership.alias;
              } else if (user) {
                name = `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`;
              }

              const stats = logsMap.get(memberId) || {
                daysLogged: 0,
                totalMinutes: 0,
                dailyRecords: new Map()
              };
              teamTotal += stats.totalMinutes;
              return { name, ...stats, telegramId: memberId };
            })
            .sort((a, b) => b.totalMinutes - a.totalMinutes);

          return { ...team, teamTotal, membersWithStats };
        })
        .sort((a, b) => b.teamTotal - a.teamTotal);

      const winnerTeam =
        teamStats.length > 0 && teamStats[0].teamTotal > 0
          ? teamStats[0]
          : null;

      const sendOptions: any = { parse_mode: 'Markdown' };
      if (tenant.topicId) sendOptions.message_thread_id = tenant.topicId;

      let reportMsg = `➖➖➖➖➖➖➖➖➖➖\n\n`;
      reportMsg += `🏁 **چالش مطالعاتی رسماً به پایان رسید!** 🏁\n\n`;
      reportMsg += `📅 **تاریخ شروع:** ${challenge.startDateText}\n`;
      reportMsg += `⏳ **مدت زمان برنامه‌ریزی شده:** ${challenge.durationDays} روز\n\n`;

      if (winnerTeam) {
        reportMsg += `🏆 **تیم قهرمان:** ${winnerTeam.name} (با مجموع ${formatMinutesToTime(winnerTeam.teamTotal)})\n\n`;
      } else {
        reportMsg += `🏆 **تیم قهرمان:** نامشخص (هیچ تایمی ثبت نشده است)\n\n`;
      }

      reportMsg += `📊 **جزئیات و عملکرد تیم‌ها:**\n\n`;
      teamStats.forEach((team) => {
        reportMsg += `🔹 **${team.name}** - مجموع: ${formatMinutesToTime(team.teamTotal)}\n`;
        if (team.membersWithStats.length === 0) {
          reportMsg += `  بدون عضو\n`;
        } else {
          team.membersWithStats.forEach((member) => {
            reportMsg += `   👤 ${member.name}: ${formatMinutesToTime(member.totalMinutes)} (در ${member.daysLogged} روز)\n`;
          });
        }
        reportMsg += `\n`;
      });

      // 👈 فاز ۳: تولید و خرد کردن امنِ متن گزارش شفافیت (Chunking)
      const transparencyChunks: string[] = [];
      let currentChunk = `🔎 **گزارش شفافیت و عملکرد روزانه اعضا**\nجهت بررسی صحت اهداف و رقابت منصفانه:\n\n`;

      teamStats.forEach((team) => {
        let teamBlock = `🔹 **${team.name}**\n`;

        if (team.membersWithStats.length === 0) {
          teamBlock += `  بدون عضو\n\n`;
        } else {
          team.membersWithStats.forEach((member) => {
            // استخراج تارگت اولیه فریز شده
            const pt = challenge.participantTargets?.find(
              (t) => t.telegramId === member.telegramId
            );
            const initialTarget = pt ? pt.target : 0;

            teamBlock += `👤 کاربر **${member.name}** | 🎯 تارگت اولیه: ${formatMinutesToTime(initialTarget)}\n`;

            // لیست کردن روز به روز
            for (let i = 0; i < challenge.durationDays; i++) {
              const targetDateMs = startMs + i * DAY_MS;
              const targetDate = new Date(targetDateMs);
              const { jd, jm } = jalaali.toJalaali(targetDate);
              const dateLabel = `${jd} ${PERSIAN_MONTHS[jm - 1]}`;

              const mins = member.dailyRecords.get(i) || 0;
              const icon = mins > 0 ? '✅' : '❌';
              teamBlock += `  ▫️ روز ${i + 1} (${dateLabel}): ${formatMinutesToTime(mins)} ${icon}\n`;
            }
            teamBlock += '\n';
          });
        }

        // بررسی طول پیام قبل از اضافه کردن تیم جدید به Chunk فعلی
        if (currentChunk.length + teamBlock.length > 3800) {
          transparencyChunks.push(currentChunk);
          currentChunk = teamBlock;
        } else {
          currentChunk += teamBlock;
        }
      });

      if (currentChunk.trim().length > 0) {
        transparencyChunks.push(currentChunk);
      }

      // ارسال پیام نتایج کلی
      await ctx.telegram
        .sendMessage(tenant.chatId, reportMsg, sendOptions)
        .catch((err) => {
          logger.error('Failed to send challenge end report to group:', err);
        });

      // ارسال پیام تبریک MVP
      if (winnerTeam && winnerTeam.membersWithStats.length > 0) {
        const topUser = winnerTeam.membersWithStats[0];
        if (topUser.totalMinutes > 0) {
          const congratsMsg =
            `🎉 **تبریک ویژه!** 🎉\n\n` +
            `👤 کاربر **${topUser.name}** عزیز از **${winnerTeam.name}**\n\n` +
            `شما با ثبت **${formatMinutesToTime(topUser.totalMinutes)}** زمان مطالعه، رکورددار و برترین فرد تیم قهرمان شدید! 🎖👏`;

          await ctx.telegram
            .sendMessage(tenant.chatId, congratsMsg, sendOptions)
            .catch(() => {});
        }
      }

      // 👈 فاز ۴: شلیک متوالی و تاخیری قطعات گزارش شفافیت به گروه
      for (const chunk of transparencyChunks) {
        await delay(500); // نیم ثانیه تاخیر برای جلوگیری از Rate Limit
        await ctx.telegram
          .sendMessage(tenant.chatId, chunk, sendOptions)
          .catch((err) => {
            logger.error('Failed to send transparency chunk to group:', err);
          });
      }
    }

    await ctx
      .editMessageText(
        '✅ چالش متوقف شد و گزارش نهایی در گروه ارسال گردید.\n\nهم‌اکنون این چالش در لیست چالش‌های تکمیل شده قرار دارد.',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback(
                  '🔙 بازگشت به لیست چالش‌های تکمیل شده',
                  `action_list_challenges_${challenge.tenantId}_completed`
                )
              ]
            ]
          }
        }
      )
      .catch(() => {});
  } catch (error) {
    logger.error('Error doing end challenge:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی در خاتمه چالش رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};
