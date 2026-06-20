// apps/frontend/src/features/target/hooks/useDeleteTarget.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@utils/api';

export function useDeleteTarget() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: async (): Promise<void> => {
      return apiClient.delete('/api/targets');
    },
    onSuccess: () => {
      // ابطال کش‌ها جهت بروزرسانی همزمان UI (حذف تارگت و آپدیت جدول)
      queryClient.invalidateQueries({ queryKey: ['myTarget'] });
      queryClient.invalidateQueries({ queryKey: ['activeLeaderboard'] });
    }
  });
}
