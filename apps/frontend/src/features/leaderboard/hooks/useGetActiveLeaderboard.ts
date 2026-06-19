// apps/frontend/src/features/leaderboard/hooks/useGetActiveLeaderboard.ts

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@utils/api';
import { useTenantStore } from '@stores/useTenantStore';
import type { ActiveLeaderboardDto } from 'shared-types';

/**
 * هوک اختصاصی TanStack React Query جهت دریافت داده‌های زنده رتبه‌بندی چالش فعال گروه
 * این هوک دقیقاً مطابق قوانین نام‌گذاری پروژه از الگوی use[Action][Entity] پیروی می‌کند.
 */
export function useGetActiveLeaderboard() {
  // استخراج واکنشی شناسه گروه (Tenant Id) از استور سراسری Zustand
  const tenantId = useTenantStore((state) => state.tenantId);

  return useQuery<ActiveLeaderboardDto, Error>({
    // کپسوله‌سازی کلید کش به همراه tenantId جهت ایزوله‌سازی کامل حافظه موقت تب‌ها
    queryKey: ['activeLeaderboard', tenantId],

    queryFn: async (): Promise<ActiveLeaderboardDto> => {
      // فراخوانی روت وب اکسپرس فعال شده در فاز سوم
      // اینترسپتور apiClient به طور خودکار هدرهای Authorization و X-Tenant-Id را تزریق می‌کند
      return apiClient.get<ActiveLeaderboardDto>(
        '/api/challenges/active/leaderboard'
      );
    },

    /**
     * 🛡️ گارد محافظتی حیاتی فرانت‌اند (Zombie Requests Protection):
     * تا زمانی که شناسه پویا از روی لینک دعوت تلگرام پارس نشده و در استور Zustand بنشیند،
     * این هوک در حالت غیرفعال (Disabled) باقی می‌ماند تا از ارسال درخواست با هدر خالی و دریافت ارور ۴۰۰ جلوگیری شود.
     */
    enabled: !!tenantId,

    // کانفیگ‌های بهینه‌سازی شبکه و کاهش بار سرور
    staleTime: 30 * 1000, // داده‌ها تا ۳۰ ثانیه معتبر (Fresh) فرض شده و از حافظه کش خوانده می‌شوند
    refetchOnWindowFocus: false, // جلوگیری از شلیک ریکوئست‌های تکراری با هر بار جابجایی فوکوس در محیط تلگرام
    retry: 1 // در صورت قطعی اینترنت موقت کلاینت، فقط یک‌بار مجدداً تلاش کند
  });
}
