// apps/frontend/src/features/time-log/components/StatusCardView.tsx

'use client';

interface StatusCardViewProps {
  selectedDayNumber: number;
  totalMinutes: number;
}

export function StatusCardView({
  selectedDayNumber,
  totalMinutes
}: StatusCardViewProps) {
  const formatMinutesToTime = (minutes: number): string => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}:${mins.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative z-10 w-full rounded-2xl bg-white/[0.01] border border-white/[0.05] backdrop-blur-2xl p-4 mb-5 shadow-lg flex items-center justify-between transition-all duration-300">
      <div className="flex flex-col items-start gap-1">
        <span className="text-[11px] font-black text-blue-400 tracking-wide">
          روز {selectedDayNumber} چالش گروه
        </span>
        <span className="text-[10px] text-gray-400 font-medium">
          کارکرد زمانی ثبت شده شما در این روز:
        </span>
      </div>

      <div className="flex items-baseline gap-1.5 bg-[#060b18]/80 border border-white/5 px-4 py-2 rounded-xl shadow-inner">
        <span className="text-xl font-mono font-black text-white tracking-wide">
          {formatMinutesToTime(totalMinutes)}
        </span>
        <span className="text-[9px] font-bold text-gray-500">ساعت</span>
      </div>
    </div>
  );
}
