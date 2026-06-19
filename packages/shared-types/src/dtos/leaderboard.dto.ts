// packages/shared-types/src/dtos/leaderboard.dto.ts

import { z } from 'zod';

/**
 * اسکیمای اعتبارسنجی ریز اطلاعات هر عضو حاضر در رتبه‌بندی چالش
 */
export const LeaderboardMemberSchema = z.object({
  telegramId: z
    .number()
    .int()
    .positive('شناسه تلگرام باید یک عدد صحیح و مثبت باشد.'),
  name: z.string().min(1, 'نام کاربر یا نام مستعار الزامی است.'),
  minutes: z.number().nonnegative('دقایق مطالعه نمی‌تواند منفی باشد.'),
  avatar: z
    .string()
    .url('فرمت آدرس تصویر پروفایل نامعتبر است.')
    .nullable()
    .optional()
});

/**
 * اسکیمای اعتبارسنجی اطلاعات تجمیع‌شده هر تیم در چالش
 */
export const LeaderboardTeamSchema = z.object({
  id: z.string().min(1, 'شناسه تیم الزامی است.'),
  name: z.string().min(1, 'نام تیم الزامی است.'),
  color: z.enum(['blue', 'red']),
  totalMinutes: z.number().nonnegative('مجموع دقایق تیم نمی‌تواند منفی باشد.'),
  members: z.array(LeaderboardMemberSchema)
});

/**
 * اسکیمای خلاصه وضعیت چالش فعال متناسب با نیازهای لایه فرانت‌اند مینی‌اپ
 * فیلدهای زمان در این لایه به صورت رشته مدیریت می‌شوند تا تداخل هیدراسیون و سریالایز JSON رخ ندهد.
 */
export const ChallengeSummarySchema = z.object({
  id: z.string().min(1, 'شناسه چالش الزامی است.'),
  startDateText: z.string().min(1, 'متن تاریخ شروع الزامی است.'),
  endDateText: z.string().min(1, 'متن تاریخ پایان الزامی است.'),
  durationDays: z.number().int().positive('مدت زمان چالش باید مثبت باشد.'),
  currentDay: z
    .number()
    .int()
    .nonnegative('روز فعلی چالش نمی‌تواند منفی باشد.'),
  status: z.enum(['pending', 'active', 'completed'])
});

/**
 * اسکیمای نهایی و جامع خروجی رتبه‌بندی فعال جهت مصرف در مینی‌اپ تلگرام
 */
export const ActiveLeaderboardSchema = z.object({
  challenge: ChallengeSummarySchema,
  teams: z.array(LeaderboardTeamSchema)
});

// استخراج تایپ‌های استاتیک برای استفاده در کامپایلر تایپ‌اسکریپت فرانت‌اند و بک‌اند
export type LeaderboardMemberDto = z.infer<typeof LeaderboardMemberSchema>;
export type LeaderboardTeamDto = z.infer<typeof LeaderboardTeamSchema>;
export type ChallengeSummaryDto = z.infer<typeof ChallengeSummarySchema>;
export type ActiveLeaderboardDto = z.infer<typeof ActiveLeaderboardSchema>;
