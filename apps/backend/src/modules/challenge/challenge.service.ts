// apps/backend/src/modules/challenge/challenge.service.ts

import { ChallengeModel } from '#modules/challenge/challenge.model';
import { TimeLogModel } from '#modules/time-log/time-log.model';
import { UserModel, IUserDocument } from '#modules/auth/user.model';
import {
  TenantMemberModel,
  ITenantMemberDocument
} from '#modules/tenant/tenant-member.model';
import mongoose from 'mongoose';
import jalaali from 'jalaali-js';

const PERSIAN_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'امرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند'
];

interface ITimeLogAggregationResult {
  _id: number;
  totalMinutes: number;
}

export interface IActiveLeaderboardServiceResult {
  challenge: {
    id: string;
    startDateText: string;
    endDateText: string;
    durationDays: number;
    currentDay: number;
    status: 'pending' | 'active' | 'completed';
  };
  teams: Array<{
    id: string;
    name: string;
    color: 'blue' | 'red';
    totalMinutes: number;
    members: Array<{
      telegramId: number;
      name: string;
      minutes: number;
      avatar: string | null;
      initialTarget?: number | null;
      dailyLogs?: Array<{ dayIndex: number; minutes: number }>;
    }>;
  }>;
}

export const getActiveChallengeLeaderboard = async (
  tenantId: string
): Promise<IActiveLeaderboardServiceResult | null> => {
  const tenantObjectId = new mongoose.Types.ObjectId(tenantId);

  let challenge = await ChallengeModel.findOne({
    tenantId: tenantObjectId,
    status: 'active'
  }).lean();

  if (!challenge) {
    challenge = await ChallengeModel.findOne({
      tenantId: tenantObjectId,
      status: 'completed'
    })
      .sort({ endDate: -1 })
      .lean();
  }

  if (!challenge) {
    return null;
  }

  const now = Date.now();
  const startMs = challenge.startDate.getTime();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const TEHRAN_OFFSET = 3.5 * 60 * 60 * 1000; // 👈 اختلاف ساعت رسمی ایران برای محاسبه مرز 12 شب

  // 👈 اصلاح گام دوم: انتقال محدوده محاسباتی روزها به منطقه زمانی ایران
  const calculatedDay =
    Math.floor((now + TEHRAN_OFFSET - (startMs + TEHRAN_OFFSET)) / DAY_MS) + 1;
  const currentDay = Math.min(
    challenge.durationDays,
    Math.max(1, calculatedDay)
  );

  const timeLogsAggregation =
    await TimeLogModel.aggregate<ITimeLogAggregationResult>([
      {
        $match: {
          challengeId: challenge._id
        }
      },
      {
        $group: {
          _id: '$telegramId',
          totalMinutes: { $sum: '$minutes' }
        }
      }
    ]);

  const minutesMap = new Map<number, number>();
  timeLogsAggregation.forEach((log) => {
    minutesMap.set(log._id, log.totalMinutes);
  });

  // نگاشت سریع تارگت‌های اولیه از داکیومنت چالش برای دسترسی آسان
  const targetMap = new Map<number, number>();
  if (challenge.participantTargets) {
    challenge.participantTargets.forEach((pt) => {
      targetMap.set(pt.telegramId, pt.target);
    });
  }

  // منطق هوشمند استخراج MVP: پیدا کردن تیم برنده و سپس استخراج کاربر برتر آن تیم
  let winningTeamIndex = 0;
  let maxTeamMinutes = -1;
  challenge.teams.forEach((team, idx) => {
    let tTotal = 0;
    team.members.forEach((m) => {
      tTotal += minutesMap.get(m) || 0;
    });
    if (tTotal > maxTeamMinutes) {
      maxTeamMinutes = tTotal;
      winningTeamIndex = idx;
    }
  });

  let mvpId: number | null = null;
  let maxMemberMinutes = -1;
  if (challenge.teams.length > 0) {
    const winTeam = challenge.teams[winningTeamIndex];
    winTeam.members.forEach((m) => {
      const mTotal = minutesMap.get(m) || 0;
      if (mTotal > maxMemberMinutes) {
        maxMemberMinutes = mTotal;
        mvpId = m;
      }
    });
  }

  // فقط در صورتی که چالش تکمیل شده باشد و MVP داشته باشیم، یک کوئری تک‌نفره و بسیار سبک به دیتابیس می‌زنیم
  let mvpDailyLogs: { dayIndex: number; minutes: number }[] = [];
  if (mvpId && challenge.status === 'completed') {
    const logs = await TimeLogModel.find({
      challengeId: challenge._id,
      telegramId: mvpId
    }).lean();

    mvpDailyLogs = logs.map((log) => ({
      // 👈 هماهنگ‌سازی محاسبات ریز کارکرد با آفست زمانی ایران
      dayIndex: Math.floor(
        (log.date.getTime() + TEHRAN_OFFSET - (startMs + TEHRAN_OFFSET)) /
          DAY_MS
      ),
      minutes: log.minutes
    }));
  }

  const allMemberIds = challenge.teams.flatMap((t) => t.members);

  const [users, tenantMembers] = await Promise.all([
    UserModel.find({ telegramId: { $in: allMemberIds } }).lean() as any,
    TenantMemberModel.find({
      tenantId: tenantObjectId,
      telegramId: { $in: allMemberIds }
    }).lean() as any
  ]);

  const usersMap = new Map<number, IUserDocument>(
    users.map((u) => [u.telegramId, u])
  );
  const membersMap = new Map<number, ITenantMemberDocument>(
    tenantMembers.map((m) => [m.telegramId, m])
  );

  const teamRecords = challenge.teams.map((team, index) => {
    let teamTotalMinutes = 0;

    const mappedMembers = team.members.map((memberId) => {
      const user = usersMap.get(memberId);
      const membership = membersMap.get(memberId);
      const minutes = minutesMap.get(memberId) || 0;

      teamTotalMinutes += minutes;

      let finalName = 'کاربر عادی';
      if (membership?.alias) {
        finalName = membership.alias;
      } else if (user) {
        finalName =
          `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`.trim();
      }

      // تزریق دیتاهای اختصاصی به آبجکت نهایی کلاینت
      const initialTarget = targetMap.has(memberId)
        ? targetMap.get(memberId)
        : null;
      const dailyLogs =
        memberId === mvpId && challenge!.status === 'completed'
          ? mvpDailyLogs
          : undefined;

      return {
        telegramId: memberId,
        name: finalName,
        minutes: minutes,
        avatar: null,
        initialTarget,
        dailyLogs
      };
    });

    mappedMembers.sort((a, b) => b.minutes - a.minutes);

    const color: 'blue' | 'red' = index === 0 ? 'blue' : 'red';

    return {
      id: (team as any)._id ? (team as any)._id.toString() : `team_${index}`,
      name: team.name,
      color,
      totalMinutes: teamTotalMinutes,
      members: mappedMembers
    };
  });

  teamRecords.sort((a, b) => b.totalMinutes - a.totalMinutes);

  // محاسبه دقیق تاریخ روز آخر چالش برای نمایش
  const lastDayMs =
    challenge.startDate.getTime() + (challenge.durationDays - 1) * DAY_MS;
  const tzEndDate = new Date(lastDayMs + TEHRAN_OFFSET);
  const gy = tzEndDate.getUTCFullYear();
  const gm = tzEndDate.getUTCMonth() + 1;
  const gd = tzEndDate.getUTCDate();
  const { jd, jm, jy } = jalaali.toJalaali(gy, gm, gd);

  const endDateText = `${jd} ${PERSIAN_MONTHS[jm - 1]} ${jy}`;

  return {
    challenge: {
      id: challenge._id.toString(),
      startDateText: challenge.startDateText,
      endDateText,
      durationDays: challenge.durationDays,
      currentDay,
      status: challenge.status
    },
    teams: teamRecords
  };
};
