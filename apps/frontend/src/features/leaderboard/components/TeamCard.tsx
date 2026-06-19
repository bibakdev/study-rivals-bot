// apps/frontend/src/features/leaderboard/components/TeamCard.tsx

'use client';

import { Users } from 'lucide-react';
import { cn } from '@utils/cn';
import type { LeaderboardTeamDto } from 'shared-types';
import { Avatar } from '@components/ui/Avatar'; // 👈 اضافه شد

interface TeamCardProps {
  team: LeaderboardTeamDto;
  isArchived: boolean;
}

const formatTime = (minutes: number) => {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs}:${mins.toString().padStart(2, '0')}`;
};

const renderRankIcon = (rank: number) => {
  if (rank === 1) return <span className="text-lg drop-shadow-md">👑</span>;
  if (rank === 2) return <span className="text-lg drop-shadow-md">🥈</span>;
  if (rank === 3) return <span className="text-lg drop-shadow-md">🥉</span>;
  return <span className="text-xs font-bold text-gray-500">{rank}</span>;
};

export function TeamCard({ team, isArchived }: TeamCardProps) {
  const sortedMembers = [...team.members].sort((a, b) => b.minutes - a.minutes);
  const isBlue = team.color === 'blue';

  const teamStyles = {
    border: isArchived
      ? 'border-white/5'
      : isBlue
        ? 'border-blue-500/20'
        : 'border-red-500/20',
    bgHeader: isArchived
      ? 'bg-white/5'
      : isBlue
        ? 'bg-blue-500/10'
        : 'bg-red-500/10',
    textTitle: isArchived
      ? 'text-gray-400'
      : isBlue
        ? 'text-blue-300'
        : 'text-red-300',
    badgeBg: isArchived
      ? 'bg-white/10'
      : isBlue
        ? 'bg-blue-500/20'
        : 'bg-red-500/20'
  };

  return (
    <div
      className={cn(
        'flex flex-col rounded-2xl bg-white/[0.01] backdrop-blur-xl border border-white/[0.04] overflow-hidden shadow-lg',
        teamStyles.border
      )}
    >
      <div
        className={cn(
          'flex flex-col items-center justify-center py-3 px-2 border-b border-white/10 relative',
          teamStyles.bgHeader
        )}
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <Users className={cn('w-4 h-4', teamStyles.textTitle)} />
          <h3
            className={cn(
              'text-sm font-bold tracking-wide truncate max-w-[100px]',
              teamStyles.textTitle
            )}
          >
            {team.name}
          </h3>
        </div>
        <div className="text-[10px] text-gray-400 font-mono font-medium">
          مجموع: {formatTime(team.totalMinutes)}
        </div>
        <div
          className={cn(
            'absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-bold text-white/70',
            teamStyles.badgeBg
          )}
        >
          {team.members.length} نفر
        </div>
      </div>

      <div className="flex flex-col p-2 gap-2 h-full">
        {sortedMembers.map((member, index) => {
          const rank = index + 1;
          const isFirst = rank === 1;

          const memberGlow =
            !isArchived && isFirst
              ? isBlue
                ? 'shadow-[0_0_15px_rgba(59,130,246,0.2)] border-blue-400/30 bg-blue-500/10'
                : 'shadow-[0_0_15px_rgba(239,68,68,0.2)] border-red-400/30 bg-red-500/10'
              : 'bg-white/[0.02] border border-white/5 hover:bg-white/[0.05]';

          return (
            <div
              key={member.telegramId}
              className={cn(
                'flex items-center gap-2 p-2 rounded-xl transition-all duration-300',
                memberGlow
              )}
            >
              <div className="flex items-center justify-center w-5 shrink-0">
                {renderRankIcon(rank)}
              </div>

              {/* جایگزینی با آواتار هوشمند */}
              <Avatar
                src={member.avatar}
                name={member.name}
                className="w-7 h-7 text-[11px] border border-white/10"
              />

              <div className="flex flex-col flex-1 min-w-0">
                <span
                  className={cn(
                    'text-[10px] font-medium truncate',
                    !isArchived && isFirst ? 'text-white' : 'text-gray-300'
                  )}
                >
                  {member.name}
                </span>
                <span
                  className={cn(
                    'text-[10px] font-mono font-bold mt-0.5',
                    !isArchived && isFirst
                      ? teamStyles.textTitle
                      : 'text-gray-400'
                  )}
                >
                  {formatTime(member.minutes)}
                </span>
              </div>
            </div>
          );
        })}
        {sortedMembers.length === 0 && (
          <div className="flex items-center justify-center h-20 text-[10px] text-gray-500">
            بدون عضو
          </div>
        )}
      </div>
    </div>
  );
}
