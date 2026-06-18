// apps/frontend/app/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useTelegram } from '@hooks/useTelegram';
import { BookOpen, Trophy } from 'lucide-react';

export default function Home() {
  const { isReady, user } = useTelegram();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // منتظر می‌مانیم تا تلگرام آماده شود
    if (isReady) {
      // یک تأخیر نمایشی جذاب برای نمایش کامل افکت‌ها به کاربر
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [isReady]);

  // ==========================================
  // صفحه لودینگ (Loading Screen)
  // ==========================================
  if (isLoading) {
    return (
      <main className="relative flex flex-col items-center justify-center min-h-screen bg-black overflow-hidden selection:bg-blue-500/30">
        {/* افکت‌های نوری پس‌زمینه (Glowing Orbs) */}
        <div className="absolute top-1/4 -left-10 w-72 h-72 bg-blue-600/20 rounded-full blur-[80px] animate-pulse" />
        <div
          className="absolute bottom-1/4 -right-10 w-72 h-72 bg-purple-600/20 rounded-full blur-[80px] animate-pulse"
          style={{ animationDelay: '0.7s' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] animate-pulse"
          style={{ animationDelay: '1s' }}
        />

        {/* کارت شیشه‌ای مرکزی (Glassmorphism Card) */}
        <div className="relative z-10 flex flex-col items-center p-10 rounded-[2rem] bg-white/[0.02] backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] max-w-[85vw] sm:max-w-md w-full">
          {/* بخش آیکون و حلقه‌های لودینگ */}
          <div className="relative flex items-center justify-center w-32 h-32 mb-8">
            {/* حلقه چرخنده بیرونی */}
            <div
              className="absolute inset-0 rounded-full border-t-2 border-b-2 border-blue-500/80 animate-spin"
              style={{ animationDuration: '3s' }}
            ></div>
            {/* حلقه چرخنده داخلی (معکوس) */}
            <div className="absolute inset-2 rounded-full border-r-2 border-l-2 border-purple-500/80 animate-spin-reverse"></div>

            {/* آیکون مرکزی (کتاب باز شده) */}
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-tr from-blue-500/20 to-purple-500/20 rounded-full backdrop-blur-md m-5 border border-white/5 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
              <BookOpen
                className="w-10 h-10 text-white animate-pulse"
                strokeWidth={1.5}
              />
            </div>
          </div>

          {/* متن اصلی */}
          <h1 className="text-3xl font-bold mb-3 tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
            Study Rivals
          </h1>

          {/* متن توضیحی و نوار پیشرفت */}
          <div className="flex flex-col items-center mt-2 w-full">
            <p className="text-sm text-gray-400 font-medium tracking-wider mb-5">
              در حال آماده‌سازی رقابت مطالعاتی...
            </p>

            {/* نوار لودینگ */}
            <div className="w-48 h-1.5 bg-white/5 rounded-full overflow-hidden relative border border-white/5">
              <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-loading-bar rounded-full"></div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================
  // صفحه اصلی (بعد از اتمام لودینگ)
  // ==========================================
  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen bg-black overflow-hidden text-center p-6 text-white selection:bg-blue-500/30">
      {/* افکت‌های نوری پس‌زمینه برای صفحه اصلی */}
      <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-blue-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[40rem] h-[40rem] bg-purple-600/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3" />

      {/* کارت خوش‌آمدگویی (Glassmorphism) */}
      <div className="relative z-10 flex flex-col items-center p-10 rounded-[2rem] bg-white/[0.02] backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] w-full max-w-[90vw] sm:max-w-md transition-all duration-700 ease-out animate-in fade-in zoom-in-95">
        {/* آیکون جام در صفحه خوش‌آمدگویی (نشان‌دهنده رقابت و پیروزی) */}
        <div className="p-4 rounded-full bg-gradient-to-tr from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 mb-6 shadow-[0_0_30px_rgba(234,179,8,0.15)]">
          <Trophy className="w-14 h-14 text-yellow-500" strokeWidth={1.5} />
        </div>

        <h1 className="text-3xl font-bold leading-relaxed tracking-tight text-gray-100">
          به سرزمین چالش‌ها
          <br />
          خوش آمدید
        </h1>

        <div className="mt-6 inline-block">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 text-2xl font-bold px-4 py-2 bg-white/5 rounded-xl border border-white/5">
            {user?.first_name ? `${user.first_name} عزیز` : 'کاربر عزیز'}
          </span>
        </div>
      </div>
    </main>
  );
}
