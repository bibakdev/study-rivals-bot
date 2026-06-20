// apps/frontend/src/features/leaderboard/components/WinnerView.tsx

'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Trophy,
  ArrowLeft,
  Users,
  Medal,
  Target,
  CalendarDays
} from 'lucide-react';
import { cn } from '@utils/cn';
import type { ActiveLeaderboardDto } from 'shared-types';
import { Avatar } from '@components/ui/Avatar';
import { Confetti } from '@components/ui/Confetti';
import { Accordion } from '@components/ui/Accordion';

interface WinnerViewProps {
  data: Exclude<ActiveLeaderboardDto, null>;
  onSwitchToLeaderboard: () => void;
}

export function WinnerView({ data, onSwitchToLeaderboard }: WinnerViewProps) {
  const { challenge: metaData, teams } = data;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [hasPlayedAudio, setHasPlayedAudio] = useState(false);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.Telegram?.WebApp?.HapticFeedback
    ) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }

    const audio = new Audio('/sounds/cheer.mp3');
    audio.volume = 0.6;
    audioRef.current = audio;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setHasPlayedAudio(true);
        })
        .catch((error) => {
          console.warn(
            'Autoplay blocked by browser. Waiting for first interaction...',
            error
          );
        });
    }

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  const handleUserInteraction = () => {
    if (!hasPlayedAudio && audioRef.current) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.then(() => setHasPlayedAudio(true)).catch(() => {});
      }
    }
  };

  const winnerTeam =
    teams && teams.length > 0
      ? teams.reduce((prev, current) =>
          prev.totalMinutes > current.totalMinutes ? prev : current
        )
      : null;

  const sortedMembers = winnerTeam
    ? [...winnerTeam.members].sort((a, b) => b.minutes - a.minutes)
    : [];

  const topUser = sortedMembers.length > 0 ? sortedMembers[0] : null;
  const otherMembers = sortedMembers.slice(1);

  const formatTime = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}:${mins.toString().padStart(2, '0')}`;
  };

  return (
    <div
      onClick={handleUserInteraction}
      onTouchStart={handleUserInteraction}
      // 👈 تغییر کلیدی برای رفع باگ اسکرول در این فایل
      className="absolute inset-0 flex flex-col overflow-y-auto overflow-x-hidden scrollbar-hide pb-28 px-4 pt-4 bg-[#030712] animate-in fade-in zoom-in-95 duration-700"
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.2) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.2) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px'
        }}
      />

      <div className="absolute top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[60vh] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />

      <Confetti />

      <div className="relative z-10 flex flex-col items-center text-center mt-2 mb-4 space-y-1.5 shrink-0 pointer-events-none">
        <h2 className="text-xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-white to-blue-300 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
          پایان رقابت و نتایج نهایی
        </h2>
        <p className="text-[11px] text-blue-200/60 font-medium">
          چالش مطالعاتی {metaData.durationDays} روزه با موفقیت به اتمام رسید
        </p>
      </div>

      {winnerTeam && winnerTeam.totalMinutes > 0 ? (
        <div className="relative z-10 w-full max-w-md mx-auto flex flex-col gap-4 shrink-0">
          {topUser && topUser.minutes > 0 && (
            <div className="relative flex flex-col items-center justify-center p-4 rounded-3xl bg-gradient-to-b from-blue-600/20 to-blue-950/40 border border-blue-400/30 shadow-[0_0_30px_rgba(59,130,246,0.15)] backdrop-blur-md mt-6 w-full">
              <div className="absolute -top-8 animate-bounce duration-[3000ms] z-10">
                <img
                  src="/imgs/crown.png"
                  alt="MVP Crown"
                  className="w-14 h-14 object-contain drop-shadow-[0_8px_15px_rgba(250,204,21,0.6)]"
                />
              </div>

              <Avatar
                src={topUser.avatar}
                name={topUser.name}
                className="w-16 h-16 text-xl mt-3 mb-2 border-2 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]"
              />

              <h3 className="text-lg font-black text-white drop-shadow-md tracking-wide">
                {topUser.name}
              </h3>

              <div className="flex items-center gap-1.5 text-[10px] font-bold text-yellow-300 mt-1 mb-4 bg-yellow-500/10 px-2.5 py-0.5 rounded-full border border-yellow-500/20">
                <Trophy className="w-3 h-3" />
                ارزشمندترین بازیکن (MVP)
              </div>

              <div className="flex items-center justify-center gap-4 w-full mb-3 px-2">
                <div className="flex flex-col items-center flex-1 bg-white/5 border border-white/10 rounded-xl py-2 shadow-inner">
                  <span className="text-[9px] text-blue-200/60 font-medium mb-1 uppercase tracking-wider">
                    مجموع ثبت شده
                  </span>
                  <span className="text-sm font-mono font-black text-blue-300 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]">
                    {formatTime(topUser.minutes)}
                  </span>
                </div>

                {topUser.initialTarget != null && (
                  <div className="flex flex-col items-center flex-1 bg-white/5 border border-white/10 rounded-xl py-2 shadow-inner">
                    <span className="flex items-center gap-1 text-[9px] text-purple-200/60 font-medium mb-1 uppercase tracking-wider">
                      <Target className="w-3 h-3" />
                      تارگت اولیه
                    </span>
                    <span className="text-sm font-mono font-black text-purple-300 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]">
                      {formatTime(topUser.initialTarget)}
                    </span>
                  </div>
                )}
              </div>

              {topUser.dailyLogs && topUser.dailyLogs.length > 0 && (
                <div className="w-full mt-1">
                  <Accordion
                    title={
                      <span className="text-xs font-bold text-blue-200 flex items-center gap-1.5">
                        <CalendarDays className="w-4 h-4 text-blue-400" />
                        ریز کارکرد روزانه قهرمان
                      </span>
                    }
                  >
                    <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto scrollbar-hide pr-1 pb-1">
                      {topUser.dailyLogs.map((log) => (
                        <div
                          key={log.dayIndex}
                          className="flex items-center justify-between text-[11px] bg-white/[0.03] px-3 py-2 rounded-lg border border-white/5"
                        >
                          <span className="text-gray-300 font-medium">
                            روز {log.dayIndex + 1}
                          </span>
                          <span className="font-mono font-bold text-blue-300">
                            {log.minutes > 0
                              ? formatTime(log.minutes)
                              : 'ثبت نشده'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Accordion>
                </div>
              )}
            </div>
          )}

          <div className="rounded-2xl bg-[#0a0f1c]/80 border border-blue-500/30 shadow-[0_8px_32px_rgba(59,130,246,0.15)] backdrop-blur-xl p-4 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/[0.05] to-transparent pointer-events-none" />

            <div className="flex items-center justify-between border-b border-blue-500/20 pb-3 mb-3 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                  <Users className="w-4 h-4 text-blue-300" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-[10px] font-bold text-blue-400/80 uppercase tracking-wider">
                    تیم قهرمان
                  </span>
                  <span className="text-base font-black text-white drop-shadow-md">
                    {winnerTeam.name}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[9px] text-blue-200/60 font-medium mb-0.5">
                  مجموع تیمی
                </span>
                <span className="text-base font-mono font-bold text-blue-300 drop-shadow-[0_0_10px_rgba(59,130,246,0.6)]">
                  {formatTime(winnerTeam.totalMinutes)}
                </span>
              </div>
            </div>

            {otherMembers.length > 0 && (
              <div className="flex flex-col gap-2 relative z-10">
                <span className="text-[10px] font-bold text-blue-300/70 mb-0.5 px-1 flex items-center gap-1">
                  <Medal className="w-3 h-3" />
                  سایر قهرمانان تیم
                </span>

                {otherMembers.map((member, index) => {
                  const rank = index + 2;

                  return (
                    <div
                      key={member.telegramId}
                      className="flex items-center gap-2.5 p-2 rounded-lg bg-blue-950/40 border border-blue-500/10 hover:bg-blue-900/40 transition-colors"
                    >
                      <div className="w-6 text-center shrink-0">
                        {rank === 2 ? (
                          <span className="text-base drop-shadow-md">🥈</span>
                        ) : rank === 3 ? (
                          <span className="text-base drop-shadow-md">🥉</span>
                        ) : (
                          <span className="text-[11px] font-bold text-blue-400/60">
                            {rank}
                          </span>
                        )}
                      </div>

                      <Avatar
                        src={member.avatar}
                        name={member.name}
                        className="w-7 h-7 text-[9px] border border-blue-400/20"
                      />

                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-[11px] font-bold text-gray-200 truncate">
                          {member.name}
                        </span>
                      </div>

                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-[11px] font-mono font-bold text-blue-200">
                          {formatTime(member.minutes)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {otherMembers.length === 0 && (
              <div className="py-3 text-center">
                <span className="text-[10px] text-blue-200/40 font-medium">
                  این تیم قهرمان دیگری ندارد.
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="relative z-10 w-full max-w-md mx-auto rounded-2xl bg-white/[0.02] border border-white/5 p-6 text-center mb-5 backdrop-blur-md shrink-0">
          <p className="text-xs text-gray-400 font-medium">
            این رقابت به پایان رسید اما هیچ مینیات مطالعه‌ای توسط تیم‌ها ثبت
            نشده است.
          </p>
        </div>
      )}

      <div className="relative z-10 w-full max-w-md mx-auto mt-4 px-1 shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSwitchToLeaderboard();
          }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600/10 border border-blue-500/30 hover:bg-blue-600/20 active:scale-[0.98] transition-all text-xs font-bold text-blue-200 shadow-[0_0_15px_rgba(59,130,246,0.15)] group"
        >
          دیدن رتبه‌بندی نهایی سایر تیم‌ها
          <ArrowLeft className="w-3.5 h-3.5 text-blue-400 transition-transform group-hover:-translate-x-1" />
        </button>
      </div>
    </div>
  );
}
