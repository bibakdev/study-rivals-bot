// apps/frontend/src/shared/components/layout/HomeHeader.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { useTelegram } from '@hooks/useTelegram';
import { useTenantStore } from '@stores/useTenantStore';
import { useGetMyTenants } from '@hooks/useGetMyTenants';
import { useGetActiveLeaderboard } from '@features/leaderboard/hooks/useGetActiveLeaderboard';
import {
  User,
  ChevronDown,
  Shield,
  Users,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { cn } from '@utils/cn';

export function HomeHeader() {
  const { user } = useTelegram();
  const tenantId = useTenantStore((state) => state.tenantId);
  const setTenantId = useTenantStore((state) => state.setTenantId);

  const { data: tenants, isLoading: isTenantsLoading } = useGetMyTenants();
  const { refetch, isRefetching } = useGetActiveLeaderboard();

  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // وضعیت تاریخ برای جلوگیری از خطای Hydration در Next.js
  const [currentDate, setCurrentDate] = useState<string>('');

  // 🗓️ محاسبه داینامیک تاریخ جاری و تبدیل آن به گاه‌شماری شاهنشاهی پس از Mount
  useEffect(() => {
    try {
      const parts = new Intl.DateTimeFormat('fa-IR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        calendar: 'persian',
        timeZone: 'Asia/Tehran'
      }).formatToParts(new Date());

      // تابع تبدیل امن اعداد فارسی و عربی به انگلیسی
      const normalizeDigits = (str: string) => {
        const persian = /[\u06F0-\u06F9]/g;
        const arabic = /[\u0660-\u0669]/g;
        return str
          .replace(persian, (c) => (c.charCodeAt(0) - 0x06f0).toString())
          .replace(arabic, (c) => (c.charCodeAt(0) - 0x0660).toString());
      };

      const dayVal = parts.find((p) => p.type === 'day')?.value || '';
      const monthVal = parts.find((p) => p.type === 'month')?.value || '';
      const yearVal = parts.find((p) => p.type === 'year')?.value || '';

      const day = normalizeDigits(dayVal);
      const month = monthVal;
      const yearStr = normalizeDigits(yearVal);

      // فیلتر کردن و استخراج فقط بخش عددی سال (برای جلوگیری از باگ عباراتی مثل " ه‍.ش.")
      const yearMatch = yearStr.match(/\d+/);

      if (day && month && yearMatch) {
        // افزودن دقیق ۱۱۸۰ سال به سال شمسی جاری
        const imperialYear = parseInt(yearMatch[0], 10) + 1180;
        setCurrentDate(`${day} ${month} ${imperialYear}`);
      }
    } catch (e) {
      setCurrentDate('');
    }
  }, []);

  // منطق انتخاب هوشمند چالش پیش‌فرض
  useEffect(() => {
    if (tenants && tenants.length > 0 && !tenantId) {
      const privilegedGroup = tenants.find(
        (t) =>
          t.role === 'main_admin' ||
          t.role === 'sub_admin' ||
          t.role === 'mother'
      );
      if (privilegedGroup) {
        setTenantId(privilegedGroup.id);
      } else {
        setTenantId(tenants[0].id);
      }
    }
  }, [tenants, tenantId, setTenantId]);

  // گارد بستن دراپ‌داون با کلیک بیرونی
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentTenant = tenants?.find((t) => t.id === tenantId);

  return (
    <header className="flex items-center justify-between py-3 px-4 mt-2 border-b border-white/[0.03] z-50">
      {/* بخش راست: اطلاعات کاربر و دراپ‌داون */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 flex items-center justify-center bg-white/5 shrink-0 shadow-md">
          {user?.photo_url ? (
            <img
              src={user.photo_url}
              alt={user.first_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-5 h-5 text-gray-400" />
          )}
        </div>

        <div className="flex flex-col items-start gap-0.5">
          <span className="text-sm font-bold text-gray-200">
            {user?.first_name
              ? `${user.first_name} ${user.last_name || ''}`.trim()
              : 'کاربر مهمان'}
          </span>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() =>
                !isTenantsLoading && setIsDropdownOpen(!isDropdownOpen)
              }
              disabled={isTenantsLoading}
              className={cn(
                'flex items-center gap-1 text-[11px] font-medium transition-all duration-200 cursor-pointer select-none',
                currentTenant ? 'text-blue-400' : 'text-gray-400 animate-pulse'
              )}
            >
              <span className="max-w-[130px] truncate">
                {isTenantsLoading
                  ? 'در حال بررسی دسترسی...'
                  : currentTenant?.name || 'انتخاب چالش مطالعاتی'}
              </span>
              <ChevronDown
                className={cn(
                  'w-3 h-3 transition-transform duration-200',
                  isDropdownOpen && 'transform rotate-180'
                )}
              />
            </button>

            {/* دراپ‌داون لیست چالش‌ها */}
            {isDropdownOpen && tenants && tenants.length > 0 && (
              <div className="absolute right-0 mt-2 w-60 rounded-xl bg-gray-950/95 border border-white/10 backdrop-blur-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] overflow-hidden z-50">
                <div className="flex flex-col py-1 max-h-64 overflow-y-auto scrollbar-hide">
                  {tenants.map((tenant) => {
                    const isPrivileged =
                      tenant.role === 'main_admin' ||
                      tenant.role === 'sub_admin' ||
                      tenant.role === 'mother';
                    const isSelected = tenant.id === tenantId;

                    return (
                      <button
                        key={tenant.id}
                        onClick={() => {
                          setTenantId(tenant.id);
                          setIsDropdownOpen(false);
                        }}
                        className={cn(
                          'flex items-center justify-between w-full px-3 py-2.5 text-right text-xs transition-colors duration-150 cursor-pointer select-none',
                          isSelected
                            ? 'bg-white/[0.06] text-white font-bold'
                            : 'text-gray-400 hover:bg-white/[0.03] hover:text-gray-200'
                        )}
                      >
                        <span className="truncate max-w-[140px]">
                          {tenant.name}
                        </span>
                        {isPrivileged ? (
                          <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">
                            <Shield className="w-2.5 h-2.5" />
                            مدیریت
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 font-medium border border-blue-500/10">
                            <Users className="w-2.5 h-2.5" />
                            شرکت‌کننده
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* بخش چپ: دکمه رفرش و نمایش تاریخ */}
      <div className="flex items-center gap-2">
        {currentDate && (
          <div className="flex items-center gap-1 text-[10px] font-medium text-gray-400 bg-white/[0.02] border border-white/5 px-2 py-1 rounded-lg shadow-sm">
            <Calendar className="w-3 h-3 text-gray-500" />
            <span className="font-mono">{currentDate}</span>
          </div>
        )}

        <button
          onClick={() => refetch()}
          disabled={isRefetching || !tenantId}
          className={cn(
            'flex items-center justify-center p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 active:scale-95 transition-all cursor-pointer shadow-[0_0_10px_rgba(59,130,246,0.05)] disabled:opacity-40 disabled:cursor-not-allowed',
            isRefetching && 'opacity-80'
          )}
          title="به‌روزرسانی اطلاعات"
        >
          <RefreshCw
            className={cn(
              'w-3.5 h-3.5 text-blue-400 transition-transform',
              isRefetching && 'animate-spin text-indigo-400'
            )}
          />
        </button>
      </div>
    </header>
  );
}
