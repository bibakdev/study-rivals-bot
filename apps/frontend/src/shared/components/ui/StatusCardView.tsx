'use client';

interface StatusCardViewProps {
  totalMinutes: number;
  title?: string;
  subtitle?: string;
}

export function StatusCardView({
  totalMinutes,
  title = 'وضعیت تارگت دوره جدید',
  subtitle = 'هدف‌گذاری ثبت شده فعلی شما:'
}: StatusCardViewProps) {
  const formatMinutesToTime = (minutes: number): string => {
    if (minutes === 0) return 'تنظیم نشده';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}:${mins.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative z-10 w-full rounded-2xl bg-white/[0.01] border border-white/[0.05] backdrop-blur-xl p-4 mb-5 shadow-lg flex items-center justify-between transition-all duration-300">
      <div className="flex flex-col items-start gap-1">
        <span className="text-[11px] font-black text-purple-400 tracking-wide">
          {title}
        </span>
        <span className="text-[10px] text-gray-400 font-medium">
          {subtitle}
        </span>
      </div>

      <div className="flex items-baseline gap-1.5 bg-[#0e071c]/60 border border-purple-500/10 px-4 py-2 rounded-xl shadow-inner">
        <span className="text-xl font-mono font-black text-white tracking-wide">
          {formatMinutesToTime(totalMinutes)}
        </span>
        {totalMinutes > 0 && (
          <span className="text-[9px] font-bold text-gray-500">ساعت</span>
        )}
      </div>
    </div>
  );
}
