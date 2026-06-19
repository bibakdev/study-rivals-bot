// apps/frontend/src/features/leaderboard/containers/LeaderboardContainer.tsx

'use client';

import { useTelegram } from '@hooks/useTelegram';
import { useGetActiveLeaderboard } from '@features/leaderboard/hooks/useGetActiveLeaderboard';
import { Spinner } from '@components/ui/Spinner';
import { LeaderboardTab } from '../components/LeaderboardTab';
import { AlertCircle, RefreshCw } from 'lucide-react';

export function LeaderboardContainer() {
  const { isReady } = useTelegram();
  const { data, isLoading, error, refetch, isRefetching } =
    useGetActiveLeaderboard();

  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] w-full">
        <Spinner className="text-blue-500" />
        <p className="text-xs text-gray-400 mt-3 font-medium">
          در حال اتصال به پلتفرم تلگرام...
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] w-full">
        <Spinner className="text-blue-500" />
        <p className="text-xs text-gray-400 mt-3 font-medium">
          در حال دریافت جدول رتبه‌بندی زنده...
        </p>
      </div>
    );
  }

  if (error) {
    const apiError = error as unknown as { message?: string; code?: string };
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] w-full px-6 text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 mb-4 shadow-[0_0_20px_rgba(239,68,68,0.05)]">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
        </div>
        <h3 className="text-base font-bold text-red-200 mb-2">
          خطا در بارگذاری اطلاعات
        </h3>
        <p className="text-xs text-gray-400 max-w-xs leading-relaxed mb-6">
          {apiError.message ||
            'ارتباط با سرور برقرار نشد. لطفاً مجدداً تلاش کنید.'}
        </p>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] active:scale-95 transition-all text-xs font-semibold text-gray-200 shadow-md disabled:opacity-50"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`}
          />
          {isRefetching ? 'در حال تلاش مجدد...' : 'تلاش مجدد'}
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] w-full text-center">
        <p className="text-xs text-gray-400 font-medium">
          هیچ داده‌ای برای نمایش یافت نشد.
        </p>
      </div>
    );
  }

  // 👈 تزریق تابع refetch و وضعیت isRefetching به عنوان props به لایه نمایشی
  return (
    <LeaderboardTab
      data={data}
      onRefresh={() => refetch()}
      isRefreshing={isRefetching}
    />
  );
}
