// apps/frontend/src/features/leaderboard/components/WinnerView.tsx

'use client';

import { Trophy, Crown, Medal, ArrowLeft, Users, Clock } from 'lucide-react';
import { cn } from '@utils/cn';
import type { ActiveLeaderboardDto } from 'shared-types';

interface WinnerViewProps {
  // استفاده از Exclude برای تضمین غیر نال بودن دیتا در این لایه پس از گارد کانتینر
  data: Exclude<ActiveLeaderboardDto, null>;
  onSwitchToLeaderboard: () => void;
}

export function WinnerView({ data, onSwitchToLeaderboard }: WinnerViewProps) {
  const { challenge: metaData, teams } = data;

  // پیدا کردن تیم برنده (تیمی که بیشترین دقایق مطالعه را دارد)
  const winnerTeam =
    teams && teams.length > 0
      ? teams.reduce((prev, current) =>
          prev.totalMinutes > current.totalMinutes ? prev : current
        )
      : null;

  // پیدا کردن برترین کاربر رقابت (نفر اول تیم برنده)
  const topUser =
    winnerTeam && winnerTeam.members.length > 0 ? winnerTeam.members[0] : null;

  const formatTime = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}:${mins.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full h-full flex flex-col overflow-y-auto overflow-x-hidden scrollbar-hide pb-24 px-4 pt-4 animate-in fade-in zoom-in-95 duration-500">
      {/* هاله‌های نورانی طلایی ویژه تالار افتخارات */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[130vw] h-[35vh] bg-amber-500/10 rounded-[100%] blur-[90px] pointer-events-none" />

      {/* بخش هدر و کاپ قهرمانی */}
      <div className="flex flex-col items-center text-center mt-4 mb-8 space-y-3">
        <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-amber-500/10 border border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.2)] animate-bounce duration-[3000ms]">
          <Trophy className="w-12 h-12 text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.6)]" />
          <Crown className="w-6 h-6 text-amber-300 absolute -top-4 left-1/2 -translate-x-1/2 rotate-12" />
        </div>
        <h2 className="text-2xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-200">
          پایان رقابت و نتایج نهایی
        </h2>
        <p className="text-xs text-gray-400 font-medium">
          چالش مطالعاتی {metaData.durationDays} روزه با موفقیت به اتمام رسید
        </p>
      </div>

      {/* کارت اصلی تیم قهرمان */}
      {winnerTeam && winnerTeam.totalMinutes > 0 ? (
        <div className="w-full max-w-md mx-auto rounded-2xl bg-white/[0.02] border border-amber-500/20 shadow-[0_8px_32px_rgba(245,158,11,0.05)] backdrop-blur-xl p-5 mb-5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-500/[0.02] to-transparent pointer-events-none" />

          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Users className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[11px] font-bold text-amber-400/70 uppercase tracking-wider">
                  تیم قهرمان چالش
                </span>
                <span className="text-base font-black text-white">
                  {winnerTeam.name}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-gray-400 font-medium mb-0.5">
                مجموع کارکرد تیمی
              </span>
              <span className="text-base font-mono font-bold text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]">
                {formatTime(winnerTeam.totalMinutes)}
              </span>
            </div>
          </div>

          {/* معرفی ستاره و رکورددار تیم قهرمان */}
          {topUser && topUser.minutes > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
              <div className="w-9 h-9 rounded-full bg-gray-900 border border-amber-400/30 flex items-center justify-center overflow-hidden shrink-0">
                {topUser.avatar ? (
                  <img
                    src={topUser.avatar}
                    alt={topUser.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Medal className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <div className="flex flex-col flex-1 min-w-0 items-start">
                <span className="text-[10px] text-amber-300/80 font-bold flex items-center gap-1">
                  ⭐ برترین فرد تیم قهرمان
                </span>
                <span className="text-xs font-bold text-gray-200 truncate w-full mt-0.5">
                  {topUser.name}
                </span>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span className="text-[9px] text-gray-500 font-medium">
                  ساعت مطالعه
                </span>
                <span className="text-xs font-mono font-bold text-gray-200 mt-0.5">
                  {formatTime(topUser.minutes)}
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* هندل کردن حالت خاصی که هیچ تیمی تایم ثبت نکرده بود */
        <div className="w-full max-w-md mx-auto rounded-2xl bg-white/[0.02] border border-white/5 p-6 text-center mb-5">
          <p className="text-xs text-gray-400 font-medium">
            این رقابت به پایان رسید اما هیچ مینیات مطالعه‌ای توسط تیم‌ها ثبت
            نشده است.
          </p>
        </div>
      )}

      {/* دکمه ناوبری پایینی جهت هدایت به جدول رتبه‌بندی نهایی */}
      <div className="w-full max-w-md mx-auto mt-4 px-2">
        <button
          onClick={onSwitchToLeaderboard}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] active:scale-[0.98] transition-all text-xs font-bold text-gray-200 shadow-md group"
        >
          دیدن رتبه‌بندی این چالش
          <ArrowLeft className="w-4 h-4 text-gray-400 transition-transform group-hover:-translate-x-1" />
        </button>
      </div>
    </div>
  );
}
