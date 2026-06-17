// packages/shared-types/src/models/challenge.types.ts

export interface ChallengeTeam {
  name: string;
  members: number[]; // آرایه‌ای از Telegram ID ها
}

export interface Challenge {
  tenantId: string;
  type: 'group' | 'individual';
  startDateText: string;
  startDate: Date;
  endDate: Date;
  durationDays: number;
  teams: ChallengeTeam[];
  status: 'pending' | 'active' | 'completed';
  lastLeaderboardMessageId?: number; // 👈 ذخیره آیدی آخرین پیام رتبه‌بندی
  lastDividerMessageId?: number; // 👈 ذخیره آیدی پیام جداکننده
  createdAt: Date;
  updatedAt: Date;
}
