// apps/frontend/app/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useTelegram } from '@hooks/useTelegram';
import { BookOpen, User } from 'lucide-react';
import { BottomNav, type TabType } from '@components/layout/BottomNav';
import { LeaderboardTab } from '@features/leaderboard/components/LeaderboardTab';

export default function Home() {
  const { isReady, user } = useTelegram();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('leaderboard');

  useEffect(() => {
    if (isReady) {
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
      <main className="relative flex flex-col items-center justify-center min-h-screen bg-background overflow-hidden selection:bg-blue-500/30">
        <div className="absolute top-1/4 -left-10 w-72 h-72 bg-blue-600/20 rounded-full blur-[80px] animate-pulse" />
        <div
          className="absolute bottom-1/4 -right-10 w-72 h-72 bg-purple-600/20 rounded-full blur-[80px] animate-pulse"
          style={{ animationDelay: '0.7s' }}
        />

        <div className="relative z-10 flex flex-col items-center p-10 rounded-[2rem] bg-white/[0.02] backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] max-w-[85vw] sm:max-w-md w-full">
          <div className="relative flex items-center justify-center w-32 h-32 mb-8">
            <div
              className="absolute inset-0 rounded-full border-t-2 border-b-2 border-blue-500/80 animate-spin"
              style={{ animationDuration: '3s' }}
            ></div>
            <div className="absolute inset-2 rounded-full border-r-2 border-l-2 border-purple-500/80 animate-spin-reverse"></div>
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-tr from-blue-500/20 to-purple-500/20 rounded-full backdrop-blur-md m-5 border border-white/5 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
              <BookOpen
                className="w-10 h-10 text-white animate-pulse"
                strokeWidth={1.5}
              />
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-3 tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
            Study Rivals
          </h1>

          <div className="flex flex-col items-center mt-2 w-full">
            <p className="text-sm text-gray-400 font-medium tracking-wider mb-5">
              در حال آماده‌سازی رقابت مطالعاتی...
            </p>
            <div className="w-48 h-1.5 bg-white/5 rounded-full overflow-hidden relative border border-white/5">
              <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-loading-bar rounded-full"></div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================
  // محتوای تب‌ها
  // ==========================================
  const renderTabContent = () => {
    switch (activeTab) {
      case 'leaderboard':
        return <LeaderboardTab />;
      case 'log-time':
        return (
          <div className="flex flex-col items-center justify-center h-full animate-in fade-in zoom-in-95 duration-500">
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600 mb-4">
              بخش ثبت ساعت
            </h2>
            <p className="text-gray-400 text-sm">
              فرم ثبت ساعت در اینجا قرار می‌گیرد.
            </p>
          </div>
        );
      case 'target':
        return (
          <div className="flex flex-col items-center justify-center h-full animate-in fade-in zoom-in-95 duration-500">
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-4">
              بخش ثبت تارگت
            </h2>
            <p className="text-gray-400 text-sm">
              تنظیمات تارگت روزانه در این قسمت خواهد بود.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  // ==========================================
  // صفحه اصلی (شامل نویگیشن و محتوا)
  // ==========================================
  return (
    <main className="relative flex flex-col h-screen bg-background overflow-hidden text-white selection:bg-blue-500/30">
      {/* بخش محتوای اصلی */}
      <div className="relative z-10 flex flex-col flex-1 w-full max-w-3xl mx-auto">
        {/* هدر: عکس پروفایل و اطلاعات کاربر */}
        <header className="flex items-center justify-between py-3 px-4 mt-2 border-b border-white/[0.03] z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 flex items-center justify-center bg-white/5 shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
              {user?.photo_url ? (
                <img
                  src={user.photo_url}
                  alt={user.first_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-gray-400" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 font-medium tracking-wider mb-0.5">
                کاربر فعلی
              </span>
              <span className="text-xs font-bold text-gray-200">
                {user?.first_name
                  ? `${user.first_name} ${user.last_name || ''}`.trim()
                  : 'کاربر مهمان'}
              </span>
            </div>
          </div>
          <div className="px-2.5 py-1 text-[9px] font-bold tracking-wider uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.1)]">
            Study Rivals
          </div>
        </header>

        {/* رندر شدن محتوای تب انتخاب شده */}
        <div className="flex-1 relative overflow-hidden">
          {renderTabContent()}
        </div>
      </div>

      {/* نویگیشن بار پایین */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </main>
  );
}
