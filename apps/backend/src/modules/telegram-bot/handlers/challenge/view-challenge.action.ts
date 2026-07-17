// apps/backend/src/modules/telegram-bot/handlers/challenge/view-challenge.action.ts

import { Context, Markup } from 'telegraf';
import { ChallengeModel } from '#modules/challenge/challenge.model';
import { UserModel } from '#modules/auth/user.model';
import { TimeLogModel } from '#modules/time-log/time-log.model';
import { formatMinutesToTime } from '#modules/time-log/utils/time-parser.util';
import { logger } from '#utils/logger';

export const handleViewChallengeRequest = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const challengeId = ctx.match[1];

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

    if (
      challenge.status !== 'pending' &&
      challenge.status !== 'active' &&
      challenge.status !== 'completed'
    ) {
      return;
    }

    const allMemberIds = challenge.teams.flatMap((t) => t.members);
    const usersInfo = await UserModel.find({
      telegramId: { $in: allMemberIds }
    }).lean();

    let extraInfo = '';
    let logsMap = new Map<
      number,
      { daysLogged: number; totalMinutes: number }
    >();

    if (challenge.status === 'active' || challenge.status === 'completed') {
      const timeLogs = await TimeLogModel.aggregate([
        { $match: { challengeId: challenge._id } },
        {
          $group: {
            _id: '$telegramId',
            daysLogged: { $sum: 1 },
            totalMinutes: { $sum: '$minutes' }
          }
        }
      ]);

      timeLogs.forEach((log) => {
        logsMap.set(log._id, {
          daysLogged: log.daysLogged,
          totalMinutes: log.totalMinutes
        });
      });
    }

    if (challenge.status === 'active') {
      const now = Date.now();
      const startMs = challenge.startDate.getTime();
      const DAY_MS = 24 * 60 * 60 * 1000;
      const TEHRAN_OFFSET = 3.5 * 60 * 60 * 1000;

      // محاسبه روزهای سپری شده چالش کاملاً هماهنگ با ساعت ایران
      const calculatedDay =
        Math.floor((now + TEHRAN_OFFSET - (startMs + TEHRAN_OFFSET)) / DAY_MS) +
        1;
      const daysPassed = Math.min(
        challenge.durationDays,
        Math.max(0, calculatedDay) // 👈 تغییر 1 به 0
      );

      extraInfo = `🗓 **روزهای سپری شده:** ${daysPassed} روز از ${challenge.durationDays} روز\n`;
    }

    let teamsInfoText = '';

    if (challenge.status === 'completed') {
      const teamStats = challenge.teams.map((team) => {
        const teamTotal = team.members.reduce((sum, memberId) => {
          return sum + (logsMap.get(memberId)?.totalMinutes || 0);
        }, 0);
        return { ...team, teamTotal };
      });

      teamStats.sort((a, b) => b.teamTotal - a.teamTotal);

      const winnerTeam =
        teamStats.length > 0 && teamStats[0].teamTotal > 0
          ? teamStats[0]
          : null;

      teamsInfoText = '\n🏆 **نتایج نهایی چالش:**\n\n';
      if (winnerTeam) {
        teamsInfoText += `🎖 **تیم برنده:** ${winnerTeam.name} با مجموع ${formatMinutesToTime(winnerTeam.teamTotal)}\n\n`;
      } else {
        teamsInfoText += `🎖 **تیم برنده:** نامشخص (تایمی در طول چالش ثبت نشده است)\n\n`;
      }

      teamStats.forEach((team) => {
        teamsInfoText += `🔹 **${team.name}** (مجموع: ${formatMinutesToTime(team.teamTotal)})\n`;
        if (team.members.length === 0) {
          teamsInfoText += `   بدون عضو\n`;
        } else {
          const membersWithStats = team.members
            .map((memberId) => {
              const user = usersInfo.find((u) => u.telegramId === memberId);
              const name = user
                ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
                : 'کاربر';
              const stats = logsMap.get(memberId) || {
                daysLogged: 0,
                totalMinutes: 0
              };
              return { name, ...stats };
            })
            .sort((a, b) => b.totalMinutes - a.totalMinutes);

          membersWithStats.forEach((member) => {
            teamsInfoText += `    👤 ${member.name}: ${formatMinutesToTime(member.totalMinutes)} (در ${member.daysLogged} روز)\n`;
          });
        }
        teamsInfoText += '\n';
      });
    } else {
      teamsInfoText = '\n📊 **تیم‌ها و نفرات:**\n\n';
      if (challenge.teams.length === 0) {
        teamsInfoText += 'هیچ تیمی ثبت نشده است.\n';
      } else {
        challenge.teams.forEach((team) => {
          teamsInfoText += `🔹 **${team.name}**\n`;
          if (team.members.length === 0) {
            teamsInfoText += `   بدون عضو\n`;
          } else {
            team.members.forEach((memberId) => {
              const user = usersInfo.find((u) => u.telegramId === memberId);
              const name = user
                ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
                : 'کاربر';

              if (challenge.status === 'active') {
                const daysLogged = logsMap.get(memberId)?.daysLogged || 0;
                teamsInfoText += `    👤 ${name} - (تایم ثبت شده: ${daysLogged} روز)\n`;
              } else {
                teamsInfoText += `    👤 ${name}\n`;
              }
            });
          }
          teamsInfoText += '\n';
        });
      }
    }

    const tenantId = challenge.tenantId.toString();
    const inlineKeyboard = [];

    if (challenge.status === 'pending') {
      inlineKeyboard.push(
        [
          Markup.button.callback(
            '📢 ارسال تیم‌ها در گروه',
            `send_teams_${challengeId}`
          )
        ],
        [
          Markup.button.callback(
            '▶️ شروع چالش',
            `start_challenge_${challengeId}`
          )
        ],
        [
          Markup.button.callback(
            '✏️ ویرایش چالش',
            `edit_challenge_${challengeId}`
          )
        ],
        [
          Markup.button.callback(
            '🗑 حذف چالش',
            `delete_challenge_${challengeId}`
          )
        ]
      );
    } else if (challenge.status === 'active') {
      inlineKeyboard.push(
        [
          Markup.button.callback(
            '✏️ ویرایش چالش',
            `edit_challenge_${challengeId}`
          )
        ],
        [
          Markup.button.callback(
            '🗑 حذف چالش',
            `delete_challenge_${challengeId}`
          )
        ],
        [
          Markup.button.callback('⏹ خاتمه چالش', `end_challenge_${challengeId}`)
        ],
        [
          Markup.button.callback(
            '🏆 ارسال رتبه‌بندی',
            `send_leaderboard_${challengeId}`
          )
        ],
        [
          Markup.button.callback(
            '⏱ مشاهده تایم‌های زده شده',
            `view_logged_times_${challengeId}`
          )
        ],
        [
          Markup.button.callback(
            '📅 رتبه‌بندی تایم‌های روزانه',
            `daily_leaderboard_menu_${challengeId}`
          )
        ]
      );
    } else if (challenge.status === 'completed') {
      inlineKeyboard.push([
        Markup.button.callback('🗑 حذف چالش', `delete_challenge_${challengeId}`)
      ]);
    }

    inlineKeyboard.push([
      Markup.button.callback(
        '🔙 بازگشت به لیست',
        `action_list_challenges_${tenantId}_${challenge.status}`
      )
    ]);

    const statusPersian =
      challenge.status === 'pending'
        ? 'اجرا نشده'
        : challenge.status === 'active'
          ? 'در حال اجرا'
          : 'تکمیل شده';

    const message =
      `🏆 **جزئیات چالش**\n\n` +
      `📅 **تاریخ شروع:** ${challenge.startDateText}\n` +
      `⏳ **مدت زمان کل:** ${challenge.durationDays} روز\n` +
      `وضعیت: **${statusPersian}**\n` +
      extraInfo +
      teamsInfoText +
      `لطفاً عملیات مورد نظر خود را انتخاب کنید:`;

    await ctx
      .editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: inlineKeyboard }
      })
      .catch((err) => {
        if (!err.description?.includes('message is not modified')) {
          logger.warn(
            `Could not edit message in view challenge: ${err.description}`
          );
        }
      });
  } catch (error) {
    return;
  }
};
