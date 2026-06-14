'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  // ساخت کلاینت درون یک useState تا در طول رندرهای مجدد Next.js App Router از بین نرود
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // داده‌ها تا ۱ دقیقه منقضی نمی‌شوند
            retry: 1, // در صورت خطا، فقط ۱ بار مجدداً تلاش کند
            refetchOnWindowFocus: false // جلوگیری از فراخوانی مجدد با فوکوس روی پنجره
          }
        }
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
