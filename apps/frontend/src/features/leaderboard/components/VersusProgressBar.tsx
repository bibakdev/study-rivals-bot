'use client';

import { useState, useEffect } from 'react';
import { cn } from '@utils/cn';
import { AnimatedTime } from '@components/ui/AnimatedTime';
import type { LeaderboardTeamDto } from 'shared-types';

interface VersusProgressBarProps {
  teams: LeaderboardTeamDto[];
  isArchived: boolean;
}

export function VersusProgressBar({
  teams,
  isArchived
}: VersusProgressBarProps) {
  const [barWidths, setBarWidths] = useState<[number, number]>([0, 0]);

  useEffect(() => {
    if (teams && teams.length >= 2) {
      const t1 = teams[0].totalMinutes;
      const t2 = teams[1].totalMinutes;
      const total = t1 + t2;

      const percent1 = total > 0 ? (t1 / total) * 100 : 50;
      const percent2 = total > 0 ? (t2 / total) * 100 : 50;

      const animTimer = setTimeout(() => {
        setBarWidths([percent1, percent2]);
      }, 100);

      return () => clearTimeout(animTimer);
    }
  }, [teams]);

  if (!teams || teams.length < 2) return null;

  const formatTime = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}:${mins.toString().padStart(2, '0')}`;
  };

  const winningTeamIndex =
    teams[0].totalMinutes > teams[1].totalMinutes
      ? 0
      : teams[1].totalMinutes > teams[0].totalMinutes
        ? 1
        : -1;

  return (
    <div className="relative z-10 w-full max-w-2xl mx-auto mb-6 px-1 animate-in fade-in slide-in-from-bottom-6 duration-700 mt-2">
      <div className="flex justify-between items-end mb-2 px-1">
        <div className="flex flex-col items-start relative">
          {winningTeamIndex === 0 && !isArchived && (
            <div className="absolute -top-7 right-0 text-xl animate-bounce drop-shadow-[0_0_10px_rgba(255,165,0,0.8)]">
              🔥
            </div>
          )}
          <span
            className={cn(
              'text-[11px] font-bold mb-0.5',
              isArchived ? 'text-gray-400' : 'text-blue-300'
            )}
          >
            {teams[0].name}
          </span>
          <span className="text-[15px] font-mono font-bold text-white drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]">
            {isArchived ? (
              formatTime(teams[0].totalMinutes)
            ) : (
              <AnimatedTime minutes={teams[0].totalMinutes} />
            )}
          </span>
        </div>

        <div className="flex items-center justify-center mb-1">
          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)] backdrop-blur-md">
            <span className="text-[9px] font-black text-gray-300 italic tracking-tighter">
              VS
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end relative">
          {winningTeamIndex === 1 && !isArchived && (
            <div className="absolute -top-7 left-0 text-xl animate-bounce drop-shadow-[0_0_10px_rgba(255,165,0,0.8)]">
              🔥
            </div>
          )}
          <span
            className={cn(
              'text-[11px] font-bold mb-0.5',
              isArchived ? 'text-gray-400' : 'text-red-300'
            )}
          >
            {teams[1].name}
          </span>
          <span className="text-[15px] font-mono font-bold text-white drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]">
            {isArchived ? (
              formatTime(teams[1].totalMinutes)
            ) : (
              <AnimatedTime minutes={teams[1].totalMinutes} />
            )}
          </span>
        </div>
      </div>

      <div className="relative w-full h-3.5 bg-white/5 rounded-full overflow-hidden border border-white/10 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
        <div
          className={cn(
            'absolute right-0 top-0 bottom-0 transition-all duration-[1500ms] ease-out z-10',
            isArchived
              ? 'bg-gray-600'
              : 'bg-gradient-to-l from-blue-600 to-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.4)]'
          )}
          style={{ width: `${barWidths[0]}%` }}
        >
          {!isArchived && (
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-white/50 blur-[2px]" />
          )}
        </div>

        <div
          className={cn(
            'absolute left-0 top-0 bottom-0 transition-all duration-[1500ms] ease-out z-0',
            isArchived
              ? 'bg-gray-500'
              : 'bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]'
          )}
          style={{ width: `${barWidths[1]}%` }}
        >
          {!isArchived && (
            <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-white/50 blur-[2px]" />
          )}
        </div>
      </div>
    </div>
  );
}
