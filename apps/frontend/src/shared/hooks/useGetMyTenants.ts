// apps/frontend/src/shared/hooks/useGetMyTenants.ts

'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@utils/api';
import { useTelegram } from '@hooks/useTelegram';
import type { UserTenantDto } from 'shared-types';

/**
 * هوک اختصاصی جهت واکشی تمام گروه‌های فعال کاربر چالش
 * پیروی دقیق از الگوی ساختاری use[Action][Entity] بدون استفاده از any
 */
export function useGetMyTenants() {
  const { isReady } = useTelegram();

  return useQuery<UserTenantDto[], Error>({
    queryKey: ['myTenants'],
    queryFn: async (): Promise<UserTenantDto[]> => {
      // فراخوانی روت جدید ساخته شده در فاز دوم بک‌اَند
      return apiClient.get<UserTenantDto[]>('/api/challenges/tenants/my');
    },
    // فعال‌سازی هوک صرفاً پس از لود کامل زیرساخت و ای‌پی‌آی تلگرام
    enabled: isReady,
    staleTime: 5 * 60 * 1000, // معتبر دانستن دیتای لود شده تا ۵ دقیقه
    refetchOnWindowFocus: false,
    retry: 1
  });
}
