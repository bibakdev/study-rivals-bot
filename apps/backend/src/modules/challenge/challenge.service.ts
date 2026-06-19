// apps/backend/src/modules/challenge/challenge.service.ts

import { ChallengeModel } from '#modules/challenge/challenge.model';
import { TimeLogModel } from '#modules/time-log/time-log.model';
import { UserModel, IUserDocument } from '#modules/auth/user.model';
import {
  TenantMemberModel,
  ITenantMemberDocument
} from '#modules/tenant/tenant-member.model';
import { AppError } from '#utils/AppError';
import mongoose from 'mongoose';

// تعریف اینترفیس اختصاصی برای خروجی لوله تجمیع (Aggregation Pipeline) جهت حذف any
interface ITimeLogAggregationResult {
  _id: number; // همان telegramId کاربر
  totalMinutes: number;
}

// تعریف اینترفیس خروجی متد سرویس منطبق بر نیازمندی‌های فاز اول قرارداد داده‌ها
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
 * سرویس جامع محاسبات و استخراج رتبه‌بندی لحظه‌ای چالش فعال مستأجر
 * @param tenantId شناسه گروه تایید صلاحیت شده توسط میدل‌ور
 */
export const getActiveChallengeLeaderboard = async (
  tenantId: string
): Promise<IActiveLeaderboardServiceResult> => {
  const tenantObjectId = new mongoose.Types.ObjectId(tenantId);

  // ۱. واکشی اتمیک چالش در حال اجرا (Active) قفل شده روی مستأجر جهت جلوگیری از نشت داده‌ها
  const challenge = await ChallengeModel.findOne({
    tenantId: tenantObjectId,
    status: 'active'
  }).lean();

  if (!challenge) {
    throw new AppError(
      'در حال حاضر هیچ چالش فعالی برای این گروه در سیستم در حال اجرا نیست.',
      404,
      'ACTIVE_CHALLENGE_NOT_FOUND'
    );
  }

  // ۲. محاسبه دقیق روز فعلی چالش بر اساس زمان سرور (با اعمال گارد محافظتی سقف و کف روزها)
  const now = Date.now();
  const startMs = challenge.startDate.getTime();
  const DAY_MS = 24 * 60 * 60 * 1000;

  const calculatedDay = Math.floor((now - startMs) / DAY_MS) + 1;
  const currentDay = Math.min(
    challenge.durationDays,
    Math.max(1, calculatedDay)
  );

  // ۳. اجرای لوله تجمیع (Aggregation Pipeline) بهینه‌شده در سطح دیتابیس برای جمع زدن کل دقایق مطالعه
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

  // نگاشت خروجی تجمیع به ساختار مپ برای دسترسی پرفورمنسی با مرتبه زمانی O(1)
  const minutesMap = new Map<number, number>();
  timeLogsAggregation.forEach((log) => {
    minutesMap.set(log._id, log.totalMinutes);
  });

  // ۴. واکشی همزمان اطلاعات هویتی و اطلاعات درون‌گروهی کاربران (پایان دادن به بحران پرفورمنسی N+1 Queries)
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

  // ۵. ساختاربندی و تجمیع داده‌های تیم‌ها و اعمال الگوهای بیزینسی پروژه
  const teamRecords = challenge.teams.map((team, index) => {
    let teamTotalMinutes = 0;

    const mappedMembers = team.members.map((memberId) => {
      const user = usersMap.get(memberId);
      const membership = membersMap.get(memberId);
      const minutes = minutesMap.get(memberId) || 0;

      // جمع جبری کارکرد اعضا برای تجمیع نهایی ساعت تیمی
      teamTotalMinutes += minutes;

      // 👑 اعمال مهندسی‌شده گارد اولویت نام مستعار (Alias Entry Guard)
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
          : null // شبیه‌سازی ایمن ساختار آواتار فرانت بدون نشت داده
      };
    });

    // مرتب‌سازی دقیق اعضای داخلی تیم بر اساس بالاترین میزان مطالعه (نزولی)
    mappedMembers.sort((a, b) => b.minutes - a.minutes);

    // تخصیص رنگ به صورت زوج-فرد متناسب با VS Progress Bar در فرانت‌اند (تیم اول آبی، تیم دوم قرمز)
    const color: 'blue' | 'red' = index === 0 ? 'blue' : 'red';

    return {
      id: team._id ? team._id.toString() : `team_${index}`,
      name: team.name,
      color,
      totalMinutes: teamTotalMinutes,
      members: mappedMembers
    };
  });

  // مرتب‌سازی نهایی کل تیم‌های حاضر در چالش بر اساس مجموع کارکرد کل تیمی (نزولی)
  teamRecords.sort((a, b) => b.totalMinutes - a.totalMinutes);

  // تخمین تاریخ پایان به عنوان فیلد کمکی متنی بر اساس داده‌های موجود
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
