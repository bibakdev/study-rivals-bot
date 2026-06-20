// apps/frontend/src/features/target/containers/TargetContainer.tsx

'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTelegram } from '@hooks/useTelegram';
import { apiClient } from '@utils/api';
import { useTenantStore } from '@stores/useTenantStore';
import { StatusCardView } from '@components/ui/StatusCardView';
import { NotificationBannerView } from '@components/ui/NotificationBannerView';
import { TargetFormView } from '../components/TargetFormView';
import { useDeleteTarget } from '../hooks/useDeleteTarget';
import { Spinner } from '@components/ui/Spinner';
import type { TargetResponseDto, UpdateTargetRequestDto } from 'shared-types';

function useGetMyTarget() {
  const tenantId = useTenantStore((state) => state.tenantId);
  return useQuery<TargetResponseDto | null, Error>({
    queryKey: ['myTarget', tenantId],
    queryFn: async () =>
      apiClient.get<TargetResponseDto | null>('/api/targets/me'),
    enabled: !!tenantId,
    refetchOnWindowFocus: false
  });
}

function useSetTarget() {
  const queryClient = useQueryClient();
  return useMutation<TargetResponseDto, Error, UpdateTargetRequestDto>({
    mutationFn: async (data) =>
      apiClient.post<TargetResponseDto>('/api/targets', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myTarget'] });
      queryClient.invalidateQueries({ queryKey: ['activeLeaderboard'] });
    }
  });
}

export function TargetContainer() {
  const { isReady } = useTelegram();
  const tenantId = useTenantStore((state) => state.tenantId);

  const { data: serverTarget, isLoading: isTargetLoading } = useGetMyTarget();
  const { mutate: setTarget, isPending: isSubmitting } = useSetTarget();
  const { mutate: deleteTarget, isPending: isDeleting } = useDeleteTarget();

  const [hours, setHours] = useState<string>('');
  const [minutes, setMinutes] = useState<string>('');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (serverTarget) {
      const h = Math.floor(serverTarget.dailyMinutes / 60);
      const m = serverTarget.dailyMinutes % 60;
      setHours(h.toString());
      setMinutes(m.toString());
    } else {
      setHours('');
      setMinutes('');
    }
  }, [serverTarget]);

  if (!isReady || isTargetLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] w-full">
        <Spinner className="text-blue-500" />
        <p className="text-xs text-gray-400 mt-3 font-medium">
          در حال دریافت اطلاعات تارگت...
        </p>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] w-full text-center px-6">
        <p className="text-xs text-gray-500">گروهی انتخاب نشده است.</p>
      </div>
    );
  }

  const currentTargetMinutes = serverTarget?.dailyMinutes ?? 0;
  const hasExistingTarget = currentTargetMinutes > 0;

  const handleSubmit = () => {
    setNotification(null);

    const parsedHours = parseInt(hours, 10) || 0;
    const parsedMinutes = parseInt(minutes, 10) || 0;
    const totalInputMinutes = parsedHours * 60 + parsedMinutes;

    if (totalInputMinutes <= 0) {
      setNotification({
        type: 'error',
        title: 'خطا در اطلاعات',
        message: 'مقدار تارگت نمی‌تواند صفر باشد.'
      });
      return;
    }

    if (totalInputMinutes > 24 * 60) {
      setNotification({
        type: 'error',
        title: 'سقف مجاز',
        message: 'تارگت روزانه نمی‌تواند بیش از ۲۴ ساعت باشد.'
      });
      return;
    }

    setTarget(
      { hours: parsedHours, minutes: parsedMinutes },
      {
        onSuccess: () => {
          setNotification({
            type: 'success',
            title: 'ثبت موفقیت‌آمیز',
            message: 'تارگت روزانه شما با موفقیت ذخیره شد.'
          });
        },
        onError: (err) => {
          setNotification({
            type: 'error',
            title: 'خطا در ثبت',
            message: err.message || 'مشکلی در ارتباط با سرور پیش آمد.'
          });
        }
      }
    );
  };

  const handleDelete = () => {
    if (confirm('آیا از پاک کردن تارگت مطالعاتی خود مطمئن هستید؟')) {
      setNotification(null);

      deleteTarget(undefined, {
        onSuccess: () => {
          setHours('');
          setMinutes('');
          setNotification({
            type: 'success',
            title: 'حذف موفقیت‌آمیز',
            message: 'تارگت شما با موفقیت از سیستم پاک شد.'
          });
        },
        onError: (err) => {
          setNotification({
            type: 'error',
            title: 'خطا در حذف',
            message: err.message || 'مشکلی در ارتباط با سرور پیش آمد.'
          });
        }
      });
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto overflow-x-hidden scrollbar-hide pb-28 px-4 pt-2">
      {notification && (
        <NotificationBannerView
          type={notification.type}
          title={notification.title}
          message={notification.message}
        />
      )}

      <StatusCardView
        totalMinutes={currentTargetMinutes}
        title="تارگت روزانه فعلی"
        subtitle="هدف‌گذاری شما در این چالش:"
      />

      <TargetFormView
        hoursValue={hours}
        minutesValue={minutes}
        isSubmitting={isSubmitting}
        hasExistingTarget={hasExistingTarget}
        isDeleting={isDeleting}
        onHoursChange={setHours}
        onMinutesChange={setMinutes}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
      />
    </div>
  );
}
