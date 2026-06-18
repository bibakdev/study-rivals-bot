// apps/frontend/src/features/leaderboard/components/LeaderboardTab.tsx

'use client';

import { useState, useEffect } from 'react';
import { CalendarDays, Swords } from 'lucide-react';

// شبیه‌سازی تایپ‌های دریافتی از بک‌اند
interface ChallengeMetaData {
  startDate: string;
  endDate: string;
  durationDays: number;
  currentDay: number;
}

export function LeaderboardTab() {
  // شبیه‌سازی دریافت داده از API (بعداً با React Query جایگزین می‌شود)
  const [metaData, setMetaData] = useState<ChallengeMetaData | null>(null);

  useEffect(() => {
    // شبیه‌سازی فچ شدن دیتا
    const timer = setTimeout(() => {
      setMetaData({
        startDate: '۱۵ فروردین',
        endDate: '۲۵ فروردین',
        durationDays: 10,
        currentDay: 4
      });
    }, 500); // 0.5 ثانیه تاخیر شبیه‌سازی شبکه
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col overflow-y-auto overflow-x-hidden scrollbar-hide pb-24">
      {/* 🟢 قدم اول: هاله‌های نوری پس‌زمینه (The Canvas) */}
      {/* هاله آبی در بالا (تیم آبی) */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[150vw] h-[40vh] bg-blue-600/15 rounded-[100%] blur-[80px] pointer-events-none" />
      {/* هاله قرمز در پایین (تیم قرمز) */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[150vw] h-[40vh] bg-red-600/15 rounded-[100%] blur-[80px] pointer-events-none" />

      {/* 🟢 قدم دوم: هدر و تایمر معکوس (Header & Timer) */}
      <div className="relative z-10 flex flex-col items-center mt-2 px-4 space-y-5">
        {/* بج تاریخ (کپسول شیشه‌ای) */}
        {metaData ? (
          <div className="flex items-center justify-center gap-2.5 px-5 py-2 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.3)] animate-in fade-in slide-in-from-top-4 duration-500">
            <CalendarDays className="w-4 h-4 text-gray-400" />
            <span className="text-[11px] font-medium text-gray-300">
              {metaData.startDate} تا {metaData.endDate}
            </span>
            <span className="w-1 h-1 rounded-full bg-gray-500" />
            <span className="text-[11px] font-bold text-gray-200">
              {metaData.durationDays} روزه
            </span>
          </div>
        ) : (
          /* اسکلتون لودینگ برای کپسول تاریخ */
          <div className="w-48 h-8 rounded-full bg-white/5 animate-pulse" />
        )}

        {/* باکس شیشه‌ای روز چالش با افکت Pulse */}
        {metaData ? (
          <div className="relative flex items-center justify-center px-8 py-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-500 group">
            {/* افکت نوری چشمک‌زن زیر باکس */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-red-500/10 animate-pulse pointer-events-none" />

            <Swords className="w-5 h-5 text-gray-400 ml-3 animate-bounce" />
            <h2 className="text-xl font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-red-400 drop-shadow-sm">
              روز {metaData.currentDay} چالش
            </h2>
          </div>
        ) : (
          /* اسکلتون لودینگ برای باکس روز چالش */
          <div className="w-56 h-14 rounded-2xl bg-white/5 animate-pulse" />
        )}
      </div>

      {/* محل قرارگیری قدم سوم (لیست تیم‌ها و کاربران) که در مرحله بعد اضافه می‌کنیم */}
    </div>
  );
}
