// apps/frontend/src/features/time-log/hooks/useUpdateTimeLog.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@utils/api';
import type { LogTimeRequestDto, LogTimeResponseDto } from 'shared-types';

/**
 * هوک سفارشی و اختصاصی ثبت ساعت مطالعه کلاینت متصل به API مرکزی پلتفرم
 * پیروی دقیق از الگوی ساختاری use[Action][Entity] بدون استفاده از کلمه کلیدی any
 */
export function useUpdateTimeLog() {
  const queryClient = useQueryClient();

  return useMutation<LogTimeResponseDto, Error, LogTimeRequestDto>({
    mutationFn: async (
      data: LogTimeRequestDto
    ): Promise<LogTimeResponseDto> => {
      // شلیک درخواست POST به روت امن فاز دوم بک‌اَند
      return apiClient.post<LogTimeResponseDto>('/api/time-logs', data);
    },

    onSuccess: () => {
      /**
       * 🔄 ابطال هم‌زمان کش‌ها (Dual Cache Invalidation):
       * ابطال کش لیدربرد گروه و کش ریز کارکردهای کاربر جاری به طور هم‌زمان
       * تا به محض ورود به هر تب، آخرین تغییرات دیتابیس بدون تاخیر رندر شوند.
       */
      queryClient.invalidateQueries({ queryKey: ['activeLeaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['myTimeLogs'] }); // 👈 ابطال کش زمان‌های کاربر جهت رفع باگ جابجایی تب‌ها
    }
  });
}
