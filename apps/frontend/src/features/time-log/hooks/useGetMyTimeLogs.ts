// apps/frontend/src/features/time-log/hooks/useGetMyTimeLogs.ts

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@utils/api';
import { useTenantStore } from '@stores/useTenantStore';

export interface UserTimeLogDto {
  dayIndex: number;
  minutes: number;
}

/**
 * هوک اختصاصی واکشی زنده ریز ساعت‌های ثبت شده قبلی کاربر از دیتابیس
 */
export function useGetMyTimeLogs() {
  const tenantId = useTenantStore((state) => state.tenantId);

  return useQuery<UserTimeLogDto[], Error>({
    queryKey: ['myTimeLogs', tenantId],
    queryFn: async (): Promise<UserTimeLogDto[]> => {
      return apiClient.get<any, UserTimeLogDto[]>('/api/time-logs/me');
    },
    enabled: !!tenantId,
    staleTime: 15 * 1000, // حافظه موقت معتبر تا ۱۵ ثانیه
    refetchOnWindowFocus: false
  });
}
