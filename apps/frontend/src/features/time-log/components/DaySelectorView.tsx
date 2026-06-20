// apps/frontend/src/features/time-log/components/DaySelectorView.tsx

'use client';

import { Calendar } from 'lucide-react';
import { cn } from '@utils/cn';

interface DaySelectorViewProps {
  durationDays: number;
  currentDay: number; // 👈 اضافه شدن روز سپری‌شده جهت کنترل چرخه رندر روزها
  currentSelectedDay: number;
  daysMinutesMap: Map<number, number>;
  onSelectDay: (dayIndex: number) => void;
}

export function DaySelectorView({
  durationDays,
  currentDay,
  currentSelectedDay,
  daysMinutesMap,
  onSelectDay
}: DaySelectorViewProps) {
  const formatMinutesToTime = (minutes: number): string => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}:${mins.toString().padStart(2, '0')}`;
  };

  // 🛡️ محدود کردن حلقه رندر به تعداد روزهای سپری‌شده چالش (currentDay)
  const renderCount = Math.min(durationDays, currentDay);

  return (
    <div className="relative z-10 flex flex-col mb-6 shrink-0 w-full">
      <label className="text-[11px] font-bold text-gray-400 mb-3 flex items-center gap-1.5 px-1">
        <Calendar className="w-3.5 h-3.5 text-gray-500" />
        <span>انتخاب روز رقابت:</span>
      </label>

      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide snap-x">
        {Array.from({ length: renderCount }).map((_, i) => {
          const isSelected = i === currentSelectedDay;
          const loggedMinutes = daysMinutesMap.get(i) || 0;
          const hasData = loggedMinutes > 0;

          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelectDay(i)}
              className={cn(
                'snap-center shrink-0 px-4 py-3 rounded-xl border text-xs font-bold transition-all duration-200 cursor-pointer select-none flex flex-col items-center gap-1 min-w-[90px]',
                isSelected
                  ? 'bg-blue-600 border-blue-400 text-white shadow-[0_4px_15px_rgba(59,130,246,0.25)] scale-102'
                  : hasData
                    ? 'bg-white/[0.03] border-emerald-500/30 text-emerald-400 hover:bg-white/[0.05]'
                    : 'bg-white/[0.01] border-white/5 text-gray-500 hover:text-gray-300 hover:bg-white/[0.02]'
              )}
            >
              <span>روز {i + 1}</span>
              <span className="text-[9px] font-mono opacity-70 tracking-wider">
                {hasData ? formatMinutesToTime(loggedMinutes) : 'خالی'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
