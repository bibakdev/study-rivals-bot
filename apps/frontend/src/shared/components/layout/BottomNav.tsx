// apps/frontend/src/shared/components/layout/BottomNav.tsx

'use client';

import { Trophy, Clock, Target } from 'lucide-react';
import { cn } from '@utils/cn';

export type TabType = 'leaderboard' | 'log-time' | 'target';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
    { id: 'leaderboard', label: 'رتبه‌بندی', icon: Trophy },
    { id: 'log-time', label: 'ثبت ساعت', icon: Clock },
    { id: 'target', label: 'ثبت تارگت', icon: Target }
  ] as const;

  return (
    // لایه محافظ برای جلوگیری از تداخل محتوا با پس‌زمینه در پایین صفحه
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-5 pt-4 bg-gradient-to-t from-black via-black/90 to-transparent">
      {/* کانتینر اصلی شیشه‌ای */}
      <nav className="flex items-center justify-between bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-2xl p-1.5 shadow-[0_8px_32px_0_rgba(0,0,0,0.6)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'relative flex flex-col items-center justify-center w-full py-2.5 rounded-xl transition-all duration-300 ease-out',
                isActive ? 'text-white' : 'text-gray-500 hover:text-gray-300'
              )}
            >
              {/* پس‌زمینه تب فعال */}
              {isActive && (
                <div className="absolute inset-0 bg-white/[0.06] rounded-xl shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]" />
              )}

              <Icon
                className={cn(
                  'w-6 h-6 mb-1 z-10 transition-transform duration-300',
                  isActive
                    ? 'scale-110 text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]'
                    : 'scale-100'
                )}
                strokeWidth={isActive ? 2 : 1.5}
              />

              <span
                className={cn(
                  'text-[10px] font-medium z-10 transition-colors duration-300',
                  isActive ? 'text-blue-200' : 'text-gray-500'
                )}
              >
                {tab.label}
              </span>

              {/* نقطه نورانی زیر تب فعال */}
              {isActive && (
                <div className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,1)]" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
