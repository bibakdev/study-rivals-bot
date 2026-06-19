// apps/frontend/src/features/leaderboard/components/WinnerView.tsx

'use client';

import { useEffect } from 'react';
import { Trophy, Crown, ArrowLeft, Users, Medal } from 'lucide-react';
import { cn } from '@utils/cn';
import type { ActiveLeaderboardDto } from 'shared-types';
import { Avatar } from '@components/ui/Avatar';
import { Confetti } from '@components/ui/Confetti';

interface WinnerViewProps {
  data: Exclude<ActiveLeaderboardDto, null>;
  onSwitchToLeaderboard: () => void;
}

export function WinnerView({ data, onSwitchToLeaderboard }: WinnerViewProps) {
  const { challenge: metaData, teams } = data;

  // 🎵 افکت صوتی هنگام باز شدن صفحه
  useEffect(() => {
    const playCheerSound = async () => {
      try {
        const audio = new Audio('/sounds/cheer.mp3');
        audio.volume = 0.6;
        await audio.play();
      } catch (error) {
        console.warn('پخش خودکار صدا توسط مرورگر مسدود شد.', error);
      }
    };
    playCheerSound();
  }, []);

  // پیدا کردن تیم برنده
  const winnerTeam =
    teams && teams.length > 0
      ? teams.reduce((prev, current) =>
          prev.totalMinutes > current.totalMinutes ? prev : current
        )
      : null;

  // مرتب‌سازی اعضای تیم بر اساس بیشترین زمان به کمترین
  const sortedMembers = winnerTeam
    ? [...winnerTeam.members].sort((a, b) => b.minutes - a.minutes)
    : [];

  // جدا کردن نفر اول (MVP) از بقیه اعضای تیم
  const topUser = sortedMembers.length > 0 ? sortedMembers[0] : null;
  const otherMembers = sortedMembers.slice(1);

  const formatTime = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}:${mins.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full h-full flex flex-col overflow-y-auto overflow-x-hidden scrollbar-hide pb-28 px-4 pt-4 bg-[#030712] animate-in fade-in zoom-in-95 duration-700">
      {/* پترن گرید (شبکه خطوط نوری آبی) */}
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

      {/* 🔵 نور آبی ملایم متمرکز در مرکز صفحه */}
      <div className="absolute top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[60vh] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />

      {/* 🎉 فراخوانی کامپوننت آتش‌بازی */}
      <Confetti />

      {/* هدر صفحه */}
      <div className="relative z-10 flex flex-col items-center text-center mt-2 mb-4 space-y-1.5 shrink-0">
        <h2 className="text-xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-white to-blue-300 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
          پایان رقابت و نتایج نهایی
        </h2>
        <p className="text-[11px] text-blue-200/60 font-medium">
          چالش مطالعاتی {metaData.durationDays} روزه با موفقیت به اتمام رسید
        </p>
      </div>

      {winnerTeam && winnerTeam.totalMinutes > 0 ? (
        <div className="relative z-10 w-full max-w-md mx-auto flex flex-col gap-4 shrink-0">
          {/* 🌟 بخش اختصاصی و ویژه MVP */}
          {topUser && topUser.minutes > 0 && (
            <div className="relative flex flex-col items-center justify-center p-4 rounded-3xl bg-gradient-to-b from-blue-600/20 to-blue-950/40 border border-blue-400/30 shadow-[0_0_30px_rgba(59,130,246,0.15)] backdrop-blur-md mt-6">
              {/* جایگزینی آیکون با عکس واقعی تاج */}
              <div className="absolute -top-4  animate-bounce duration-[3000ms] z-10">
                <img
                  src="/imgs/crown.png"
                  alt="MVP Crown"
                  className="w-16 h-16 object-contain drop-shadow-[0_8px_15px_rgba(250,204,21,0.6)]"
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

              <div className="flex items-center gap-1.5 text-[10px] font-bold text-yellow-300 mt-1 mb-2 bg-yellow-500/10 px-2.5 py-0.5 rounded-full border border-yellow-500/20">
                <Trophy className="w-3 h-3" />
                ارزشمندترین بازیکن
              </div>

              <span className="text-sm font-mono font-bold text-blue-100 bg-[#0a0f1c]/80 px-4 py-1.5 rounded-lg border border-blue-500/40 shadow-inner">
                {formatTime(topUser.minutes)}
              </span>
            </div>
          )}

          {/* 🛡️ کارت تیم برنده و لیست سایر اعضا */}
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

            {/* لیست سایر اعضای تیم برنده */}
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

      {/* دکمه پایین صفحه */}
      <div className="relative z-10 w-full max-w-md mx-auto mt-4 px-1 shrink-0">
        <button
          onClick={onSwitchToLeaderboard}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600/10 border border-blue-500/30 hover:bg-blue-600/20 active:scale-[0.98] transition-all text-xs font-bold text-blue-200 shadow-[0_0_15px_rgba(59,130,246,0.15)] group"
        >
          دیدن رتبه‌بندی نهایی سایر تیم‌ها
          <ArrowLeft className="w-3.5 h-3.5 text-blue-400 transition-transform group-hover:-translate-x-1" />
        </button>
      </div>
    </div>
  );
}
