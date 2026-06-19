// apps/backend/src/modules/challenge/challenge.service.ts

import { ChallengeModel } from '#modules/challenge/challenge.model';
import { TimeLogModel } from '#modules/time-log/time-log.model';
import { UserModel, IUserDocument } from '#modules/auth/user.model';
import {
  TenantMemberModel,
  ITenantMemberDocument
} from '#modules/tenant/tenant-member.model';
import mongoose from 'mongoose';

// تعریف اینترفیس اختصاصی برای خروجی لوله تجمیع جهت حذف any
interface ITimeLogAggregationResult {
  _id: number; // همان telegramId کاربر
  totalMinutes: number;
}

// تعریف اینترفیس خروجی متد سرویس
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
    }>;
  }>;
}

/**
 * سرویس جامع محاسبات و استخراج رتبه‌بندی لحظه‌ای چالش فعال یا آخرین چالش تکمیل‌شده مستأجر
 * @param tenantId شناسه گروه تایید صلاحیت شده
 */
export const getActiveChallengeLeaderboard = async (
  tenantId: string
): Promise<IActiveLeaderboardServiceResult | null> => {
  const tenantObjectId = new mongoose.Types.ObjectId(tenantId);

  // ۱. تلاش برای واکشی چالش در حال اجرا (Active)
  let challenge = await ChallengeModel.findOne({
    tenantId: tenantObjectId,
    status: 'active'
  }).lean();

  // 👈 گارد فلوبک: اگر چالش فعالی وجود نداشت، آخرین چالش تکمیل شده واکشی می‌شود
  if (!challenge) {
    challenge = await ChallengeModel.findOne({
      tenantId: tenantObjectId,
      status: 'completed'
    })
      .sort({ endDate: -1 }) // مرتب‌سازی نزولی برای گرفتن آخرین چالش پایان‌یافته
      .lean();
  }

  // 👈 اگر کماکان هیچ چالشی (نه فعال و نه تکمیل‌شده) یافت نشد، مقدار null بازگردانده می‌شود
  if (!challenge) {
    return null;
  }

  // ۲. محاسبه دقیق روز فعلی چالش بر اساس زمان سرور (با اعمال گارد سقف مدت زمان)
  const now = Date.now();
  const startMs = challenge.startDate.getTime();
  const DAY_MS = 24 * 60 * 60 * 1000;

  const calculatedDay = Math.floor((now - startMs) / DAY_MS) + 1;
  const currentDay = Math.min(
    challenge.durationDays,
    Math.max(1, calculatedDay)
  );

  // ۳. اجرای لوله تجمیع در سطح دیتابیس برای جمع زدن کل دقایق مطالعه چالش واکشی شده
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

  // ۴. واکشی اطلاعات هویتی و اطلاعات درون‌گروهی کاربران حاضر در چالش
  const allMemberIds = challenge.teams.flatMap((t) => t.members);

  const [users, tenantMembers] = await Promise.all([
    UserModel.find({ telegramId: { $in: allMemberIds } }).lean() as Promise<
      IUserDocument[]
    >,
    TenantMemberModel.find({
      tenantId: tenantObjectId,
      telegramId: { $in: allMemberIds }
    }).lean() as Promise<ITenantMemberDocument[]>
  ]);

  const usersMap = new Map<number, IUserDocument>(
    users.map((u) => [u.telegramId, u])
  );
  const membersMap = new Map<number, ITenantMemberDocument>(
    tenantMembers.map((m) => [m.telegramId, m])
  );

  // ۵. نگاشت و تجمیع داده‌های تیم‌ها
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

      return {
        telegramId: memberId,
        name: finalName,
        minutes: minutes,
        avatar: user?.username
          ? `https://t.me/i/userpic/1/${user.username}.jpg`
          : null
      };
    });

    mappedMembers.sort((a, b) => b.minutes - a.minutes);

    const color: 'blue' | 'red' = index === 0 ? 'blue' : 'red';

    return {
      id: team._id ? team._id.toString() : `team_${index}`,
      name: team.name,
      color,
      totalMinutes: teamTotalMinutes,
      members: mappedMembers
    };
  });

  teamRecords.sort((a, b) => b.totalMinutes - a.totalMinutes);

  const endDateText = `پایان رقابت (${challenge.durationDays} روزه)`;

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
