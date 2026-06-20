// apps/frontend/src/features/target/hooks/useGetMyTarget.ts

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@utils/api';
import { useTenantStore } from '@stores/useTenantStore';
import type { TargetResponseDto } from 'shared-types';

/**
 * هوک اختصاصی واکشی زنده تارگت ثبت شده پیشین کاربر از دیتابیس بک‌اَند
 * مجهز به مکانیسم وابستگی کلید کش به شناسه مستأجر جاری جهت لود صحیح داده‌ها
 */
export function useGetMyTarget() {
  const tenantId = useTenantStore((state) => state.tenantId);

  return useQuery<TargetResponseDto | null, Error>({
    queryKey: ['myTarget', tenantId],
    queryFn: async (): Promise<TargetResponseDto | null> => {
      return apiClient.get<TargetResponseDto | null>('/api/targets/me');
    },
    enabled: !!tenantId,
    staleTime: 30 * 1000, // معتبر دانستن کش تا ۳۰ ثانیه
    refetchOnWindowFocus: false
  });
}
