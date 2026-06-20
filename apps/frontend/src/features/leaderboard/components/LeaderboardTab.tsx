// apps/frontend/src/features/leaderboard/components/LeaderboardTab.tsx

'use client';

import { Trophy } from 'lucide-react';
import { cn } from '@utils/cn';
import type { ActiveLeaderboardDto } from 'shared-types';
import { ChallengeHeader } from './ChallengeHeader';
import { VersusProgressBar } from './VersusProgressBar';
import { TeamCard } from './TeamCard';

interface LeaderboardTabProps {
  data: Exclude<ActiveLeaderboardDto, null>;
  onRefresh: () => void;
  isRefreshing: boolean;
  isArchived?: boolean;
  onSwitchToWinner?: () => void;
}

export function LeaderboardTab({
  data,
  onRefresh,
  isRefreshing,
  isArchived = false,
  onSwitchToWinner
}: LeaderboardTabProps) {
  const { challenge: metaData, teams } = data;

  return (
    // 👈 تغییر کلیدی: استفاده از absolute inset-0 به جای relative h-full برای آزادسازی اسکرول
    <div className="absolute inset-0 flex flex-col overflow-y-auto overflow-x-hidden scrollbar-hide pb-24 px-4 pt-2">
      {/* هاله‌های نوری پس‌زمینه شرطی بر اساس وضعیت چالش */}
      <div
        className={cn(
          'fixed top-0 left-1/2 -translate-x-1/2 w-[150vw] h-[40vh] rounded-[100%] blur-[80px] pointer-events-none',
          isArchived ? 'bg-amber-600/5' : 'bg-blue-600/15'
        )}
      />
      <div
        className={cn(
          'fixed bottom-0 left-1/2 -translate-x-1/2 w-[150vw] h-[40vh] rounded-[100%] blur-[80px] pointer-events-none',
          isArchived ? 'bg-amber-600/5' : 'bg-red-600/15'
        )}
      />

      {/* هدر اطلاعات چالش */}
      <ChallengeHeader metaData={metaData} isArchived={isArchived} />

      {/* نوار پیشرفت و تقابل تیم‌ها */}
      <VersusProgressBar teams={teams} isArchived={isArchived} />

      {/* گرید تیم‌ها و کارت‌های اعضا */}
      {teams ? (
        <div className="relative z-10 grid grid-cols-2 gap-3 w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} isArchived={isArchived} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 w-full max-w-2xl mx-auto z-10 px-4">
          <div className="h-64 rounded-2xl bg-white/5 animate-pulse" />
          <div className="h-64 rounded-2xl bg-white/5 animate-pulse" />
        </div>
      )}

      {/* دکمه بازگشت به نمای تیم برنده (فقط برای حالت آرشیو) */}
      {isArchived && onSwitchToWinner && (
        <div className="w-full max-w-2xl mx-auto mt-6 px-1 z-50">
          <button
            onClick={onSwitchToWinner}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 active:scale-[0.98] transition-all text-xs font-bold text-amber-300 shadow-md"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            دیدن تیم برنده
          </button>
        </div>
      )}
    </div>
  );
}
