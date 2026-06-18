// apps/frontend/src/features/leaderboard/components/LeaderboardTab.tsx

'use client';

import { useState, useEffect } from 'react';
import { CalendarDays, Swords, Users, User as UserIcon } from 'lucide-react';
import { cn } from '@utils/cn';

// ==========================================
// کامپوننت کمکی: انیمیشن شمارش اعداد زمان
// ==========================================
const AnimatedTime = ({ minutes }: { minutes: number }) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 1500; // مدت زمان انیمیشن (۱.۵ ثانیه)

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);

      const easeOut = 1 - Math.pow(1 - progress, 4);
      setCurrent(Math.floor(easeOut * minutes));

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [minutes]);

  const hrs = Math.floor(current / 60);
  const mins = current % 60;
  return `${hrs}:${mins.toString().padStart(2, '0')}`;
};

// ==========================================
// شبیه‌سازی تایپ‌های دریافتی از بک‌اند
// ==========================================
interface ChallengeMetaData {
  startDate: string;
  endDate: string;
  durationDays: number;
  currentDay: number;
}

interface UserScore {
  id: number;
  name: string;
  minutes: number;
  avatar?: string;
}

interface TeamData {
  id: string;
  name: string;
  color: 'blue' | 'red';
  totalMinutes: number;
  members: UserScore[];
}

export function LeaderboardTab() {
  const [metaData, setMetaData] = useState<ChallengeMetaData | null>(null);
  const [teams, setTeams] = useState<TeamData[] | null>(null);
  const [barWidths, setBarWidths] = useState<[number, number]>([0, 0]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMetaData({
        startDate: '۱۵ فروردین',
        endDate: '۲۵ فروردین',
        durationDays: 10,
        currentDay: 4
      });

      setTeams([
        {
          id: 'team_a',
          name: 'آبی‌پوشان',
          color: 'blue',
          totalMinutes: 1450,
          members: [
            { id: 1, name: 'علی اکبری', minutes: 840 },
            { id: 2, name: 'سارا', minutes: 210 },
            { id: 3, name: 'رضا حسینی', minutes: 400 }
          ]
        },
        {
          id: 'team_b',
          name: 'طوفان سرخ',
          color: 'red',
          totalMinutes: 1320,
          members: [
            { id: 4, name: 'مینا', minutes: 120 },
            { id: 5, name: 'امید فرزانه', minutes: 700 },
            { id: 6, name: 'نیما', minutes: 500 }
          ]
        }
      ]);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

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

  // 👈 محاسبه ایندکس گروه برنده (0 برای تیم اول، 1 برای تیم دوم، -1 برای حالت مساوی)
  const winningTeamIndex =
    teams && teams.length >= 2
      ? teams[0].totalMinutes > teams[1].totalMinutes
        ? 0
        : teams[1].totalMinutes > teams[0].totalMinutes
          ? 1
          : -1
      : -1;

  return (
    <div className="relative w-full h-full flex flex-col overflow-y-auto overflow-x-hidden scrollbar-hide pb-24 px-4 pt-2">
      {/* هاله‌های نوری پس‌زمینه */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[150vw] h-[40vh] bg-blue-600/15 rounded-[100%] blur-[80px] pointer-events-none" />
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[150vw] h-[40vh] bg-red-600/15 rounded-[100%] blur-[80px] pointer-events-none" />

      {/* هدر و تایمر */}
      <div className="relative z-10 flex flex-col items-center mb-5 space-y-4">
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
          <div className="w-48 h-8 rounded-full bg-white/5 animate-pulse" />
        )}

        {metaData ? (
          <div className="relative flex items-center justify-center px-8 py-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-500 group">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-red-500/10 animate-pulse pointer-events-none" />
            <Swords className="w-5 h-5 text-gray-400 ml-3 animate-bounce" />
            <h2 className="text-xl font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-red-400 drop-shadow-sm">
              روز {metaData.currentDay} چالش
            </h2>
          </div>
        ) : (
          <div className="w-56 h-14 rounded-2xl bg-white/5 animate-pulse" />
        )}
      </div>

      {/* نوار رقابت (VS Progress Bar) */}
      {teams && teams.length >= 2 && (
        <div className="relative z-10 w-full max-w-2xl mx-auto mb-6 px-1 animate-in fade-in slide-in-from-bottom-6 duration-700 mt-2">
          <div className="flex justify-between items-end mb-2 px-1">
            {/* 👈 مشخصات تیم اول (آبی) */}
            <div className="flex flex-col items-start relative">
              {/* انیمیشن آتش برای تیم برنده */}
              {winningTeamIndex === 0 && (
                <div className="absolute -top-7 right-0 text-xl animate-bounce drop-shadow-[0_0_10px_rgba(255,165,0,0.8)] animate-in zoom-in duration-500">
                  🔥
                </div>
              )}
              <span className="text-[11px] font-bold text-blue-300 mb-0.5">
                {teams[0].name}
              </span>
              <span className="text-[15px] font-mono font-bold text-white drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]">
                <AnimatedTime minutes={teams[0].totalMinutes} />
              </span>
            </div>

            <div className="flex items-center justify-center mb-1">
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)] backdrop-blur-md">
                <span className="text-[9px] font-black text-gray-300 italic tracking-tighter">
                  VS
                </span>
              </div>
            </div>

            {/* 👈 مشخصات تیم دوم (قرمز) */}
            <div className="flex flex-col items-end relative">
              {/* انیمیشن آتش برای تیم برنده */}
              {winningTeamIndex === 1 && (
                <div className="absolute -top-7 left-0 text-xl animate-bounce drop-shadow-[0_0_10px_rgba(255,165,0,0.8)] animate-in zoom-in duration-500">
                  🔥
                </div>
              )}
              <span className="text-[11px] font-bold text-red-300 mb-0.5">
                {teams[1].name}
              </span>
              <span className="text-[15px] font-mono font-bold text-white drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                <AnimatedTime minutes={teams[1].totalMinutes} />
              </span>
            </div>
          </div>

          <div className="relative w-full h-3.5 bg-white/5 rounded-full overflow-hidden border border-white/10 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
            <div
              className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-blue-600 to-blue-400 transition-all duration-[1500ms] ease-out shadow-[0_0_15px_rgba(59,130,246,0.6)] z-10"
              style={{ width: `${barWidths[0]}%` }}
            >
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-white/50 blur-[2px]" />
            </div>

            <div
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-red-600 to-red-400 transition-all duration-[1500ms] ease-out shadow-[0_0_15px_rgba(239,68,68,0.6)] z-0"
              style={{ width: `${barWidths[1]}%` }}
            >
              <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-white/50 blur-[2px]" />
            </div>
          </div>
        </div>
      )}

      {/* گرید تیم‌ها و کارت‌های اعضا */}
      {teams ? (
        <div className="relative z-10 grid grid-cols-2 gap-3 w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
          {teams.map((team) => {
            const sortedMembers = [...team.members].sort(
              (a, b) => b.minutes - a.minutes
            );
            const isBlue = team.color === 'blue';
            const teamStyles = {
              border: isBlue ? 'border-blue-500/20' : 'border-red-500/20',
              bgHeader: isBlue ? 'bg-blue-500/10' : 'bg-red-500/10',
              textTitle: isBlue ? 'text-blue-300' : 'text-red-300',
              badgeBg: isBlue ? 'bg-blue-500/20' : 'bg-red-500/20',
              glow1st: isBlue
                ? 'shadow-[0_0_15px_rgba(59,130,246,0.3)] border-blue-400/40 bg-blue-500/10'
                : 'shadow-[0_0_15px_rgba(239,68,68,0.3)] border-red-400/40 bg-red-500/10'
            };

            return (
              <div
                key={team.id}
                className={cn(
                  'flex flex-col rounded-2xl bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] overflow-hidden shadow-lg',
                  teamStyles.border
                )}
              >
                <div
                  className={cn(
                    'flex flex-col items-center justify-center py-3 px-2 border-b border-white/5 relative',
                    teamStyles.bgHeader
                  )}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Users className={cn('w-4 h-4', teamStyles.textTitle)} />
                    <h3
                      className={cn(
                        'text-xs font-bold tracking-wide truncate max-w-[90px]',
                        teamStyles.textTitle
                      )}
                    >
                      {team.name}
                    </h3>
                  </div>
                  <div className="text-[10px] text-gray-300 font-mono font-medium">
                    مجموع: {formatTime(team.totalMinutes)}
                  </div>
                  <div
                    className={cn(
                      'absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-bold text-white/80',
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

                    return (
                      <div
                        key={member.id}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-xl transition-all duration-300',
                          isFirst
                            ? teamStyles.glow1st
                            : 'bg-white/[0.03] border border-white/5 hover:bg-white/[0.06]'
                        )}
                      >
                        <div className="flex items-center justify-center w-5 shrink-0">
                          {renderRankIcon(rank)}
                        </div>
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-800 border border-white/10 shrink-0 flex items-center justify-center">
                          {member.avatar ? (
                            <img
                              src={member.avatar}
                              alt={member.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                          )}
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <span
                            className={cn(
                              'text-[10px] font-medium truncate',
                              isFirst ? 'text-white' : 'text-gray-300'
                            )}
                          >
                            {member.name}
                          </span>
                          <span
                            className={cn(
                              'text-[10px] font-mono font-bold mt-0.5',
                              isFirst ? teamStyles.textTitle : 'text-gray-400'
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
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 w-full max-w-2xl mx-auto z-10 px-4">
          <div className="h-64 rounded-2xl bg-white/5 animate-pulse" />
          <div className="h-64 rounded-2xl bg-white/5 animate-pulse" />
        </div>
      )}
    </div>
  );
}
