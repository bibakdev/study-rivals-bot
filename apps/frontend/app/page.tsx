'use client';

import { useState, useEffect } from 'react';
import { useTelegram } from '@hooks/useTelegram';
import { Spinner } from '@components/ui/Spinner';

export default function Home() {
  const { isReady, user } = useTelegram();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // منتظر می‌مانیم تا تلگرام آماده شود
    if (isReady) {
      // یک تأخیر کوتاه نمایشی برای دیدن لودر
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isReady]);

  // نمایش صفحه لودینگ
  if (isLoading) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center min-h-screen">
        <Spinner className="text-blue-500 mb-4" />
        <p className="text-lg font-medium animate-pulse">
          در حال آماده‌سازی مینی‌اپ...
        </p>
      </main>
    );
  }

  // نمایش صفحه اصلی پس از اتمام لودینگ
  return (
    <main className="flex flex-1 flex-col items-center justify-center min-h-screen p-6 text-center">
      <h1 className="text-3xl font-bold leading-relaxed">
        به سرزمین چالش ها خوش آمدید
        <br />
        <span className="text-blue-500 text-2xl mt-2 block">
          {user?.first_name ? `${user.first_name} عزیز` : ''}
        </span>
      </h1>
    </main>
  );
}
