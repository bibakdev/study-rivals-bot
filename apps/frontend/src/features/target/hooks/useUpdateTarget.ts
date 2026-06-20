// apps/frontend/src/features/target/hooks/useUpdateTarget.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@utils/api';
import { useTenantStore } from '@stores/useTenantStore';
import type { UpdateTargetRequestDto, TargetResponseDto } from 'shared-types';

/**
 * هوک سفارشی ثبت و به‌روزرسانی اتمیک تارگت روزانه کاربر کلاینت
 * ابطال هم‌زمان کش‌های تارگت و لیدربرد چالش فعال جهت یکپارچگی آنی فرانت‌اَند
 */
export function useUpdateTarget() {
  const queryClient = useQueryClient();
  const tenantId = useTenantStore((state) => state.tenantId);

  return useMutation<TargetResponseDto, Error, UpdateTargetRequestDto>({
    mutationFn: async (
      data: UpdateTargetRequestDto
    ): Promise<TargetResponseDto> => {
      return apiClient.post<TargetResponseDto>('/api/targets', data);
    },
    onSuccess: () => {
      // پاکسازی و تجدید آنی حافظه موقت تب لیدربرد و تب تارگت برای اعمال سریع موازنه قدرت تیمی
      queryClient.invalidateQueries({ queryKey: ['myTarget', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['activeLeaderboard'] });
    }
  });
}
