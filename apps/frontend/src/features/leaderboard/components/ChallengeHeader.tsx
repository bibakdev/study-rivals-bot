// apps/frontend/src/features/leaderboard/components/ChallengeHeader.tsx

'use client';

import { CalendarDays, Swords } from 'lucide-react';
import { cn } from '@utils/cn';
import type { ChallengeSummaryDto } from 'shared-types';

// تابع کمکی برای تبدیل سال شمسی به شاهنشاهی در متن‌های دریافتی
const convertToImperialText = (text?: string) => {
  if (!text) return '';
  // ۱. ابتدا اعداد فارسی و عربی را به انگلیسی تبدیل می‌کنیم تا پردازش ریاضی روی آن‌ها ممکن باشد
  const normalized = text
    .replace(/[۰-۹]/g, (c) => (c.charCodeAt(0) - 0x06f0).toString())
    .replace(/[٠-٩]/g, (c) => (c.charCodeAt(0) - 0x0660).toString());

  // ۲. پیدا کردن سال‌های شمسی (مانند 13xx و 14xx) و افزودن عدد 1180 به آن‌ها
  return normalized.replace(/\b(13\d{2}|14\d{2})\b/g, (match) => {
    return (parseInt(match, 10) + 1180).toString();
  });
};

interface ChallengeHeaderProps {
  metaData?: ChallengeSummaryDto;
  isArchived: boolean;
}

export function ChallengeHeader({
  metaData,
  isArchived
}: ChallengeHeaderProps) {
  if (!metaData) {
    return (
      <div className="relative z-10 flex flex-col items-center mb-5 space-y-4 w-full">
        <div className="w-48 h-8 rounded-full bg-white/5 animate-pulse" />
        <div className="w-56 h-14 rounded-2xl bg-white/5 animate-pulse" />
      </div>
    );
  }

  // اعمال تبدیل تاریخ روی متن‌های شروع و پایان چالش
  const imperialStartDate = convertToImperialText(metaData.startDateText);
  const imperialEndDate = convertToImperialText(metaData.endDateText);

  return (
    <div className="relative z-10 flex flex-col items-center mb-5 space-y-4 mt-2">
      <div className="flex items-center justify-center gap-2.5 px-5 py-2 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.3)] animate-in fade-in slide-in-from-top-4 duration-500">
        <CalendarDays className="w-4 h-4 text-gray-400" />
        <span className="text-[11px] font-medium text-gray-300">
          {imperialStartDate} تا {imperialEndDate}
        </span>
        <span className="w-1 h-1 rounded-full bg-gray-500" />
        <span className="text-[11px] font-bold text-gray-200">
          {metaData.durationDays} روزه
        </span>
      </div>

      <div className="relative flex items-center justify-center px-8 py-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-500 group">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/5 to-red-500/10 pointer-events-none" />
        <Swords
          className={cn(
            'w-5 h-5 text-gray-400 ml-3',
            !isArchived && 'animate-bounce'
          )}
        />
        <h2
          className={cn(
            'text-xl font-bold tracking-wide drop-shadow-sm',
            isArchived
              ? 'text-gray-300'
              : 'text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-red-400'
          )}
        >
          {isArchived
            ? 'رتبه‌بندی نهایی رقابت آرشیو شده'
            : `روز ${metaData.currentDay} چالش`}
        </h2>
      </div>
    </div>
  );
}
