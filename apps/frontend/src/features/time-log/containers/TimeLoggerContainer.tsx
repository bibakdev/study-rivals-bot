// apps/frontend/src/features/time-log/containers/TimeLoggerContainer.tsx

'use client';

import { useState, useEffect } from 'react';
import { useTelegram } from '@hooks/useTelegram';
import { useGetActiveLeaderboard } from '@features/leaderboard/hooks/useGetActiveLeaderboard';
import { useGetMyTimeLogs } from '../hooks/useGetMyTimeLogs'; // 👈 امپورت هوک جدید واکشی دیتای زنده
import { useUpdateTimeLog } from '../hooks/useUpdateTimeLog';
import { DaySelectorView } from '../components/DaySelectorView';
import { StatusCardView } from '../components/StatusCardView';
import { TimeInputFormView } from '../components/TimeInputFormView';
import { NotificationBannerView } from '../components/NotificationBannerView';
import { Spinner } from '@components/ui/Spinner';
import { Trophy } from 'lucide-react';

export function TimeLoggerContainer() {
  const { isReady } = useTelegram();
  const { data: leaderboardData, isLoading: isLeaderboardLoading } =
    useGetActiveLeaderboard();
  const { data: serverLogs, isLoading: isLogsLoading } = useGetMyTimeLogs(); // 👈 واکشی زمان‌های دیتابیس
  const { mutate: updateTimeLog, isPending: isSubmitting } = useUpdateTimeLog();

  // استیت‌های محلی مدیریت فیلدهای فرم و روز انتخاب شده چالش
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [logMode, setLogMode] = useState<'add' | 'edit'>('add');
  const [hours, setHours] = useState<string>('');
  const [minutes, setMinutes] = useState<string>('');

  // مدیریت واکنش‌گرای ذخیره‌سازی زمان‌های ثبت شده در سشن جاری مینی‌اپ
  const [localDaysMinutes, setLocalDaysMinutes] = useState<Map<number, number>>(
    new Map()
  );

  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);

  // هوش پلتفرم: تنظیم خودکار روز جاری رقابت بر اساس دیتای زنده سرور به عنوان روز فعال پیش‌فرض
  useEffect(() => {
    if (leaderboardData?.challenge) {
      const currentDayIndex = leaderboardData.challenge.currentDay - 1;
      setSelectedDay(currentDayIndex >= 0 ? currentDayIndex : 0);
    }
  }, [leaderboardData]);

  // 🔄 هیدراتاسیون خودکار استیت محلی از روی دیتای واقعی واکشی شده از دیتابیس MongoDB بک‌اَند
  useEffect(() => {
    if (serverLogs) {
      const newMap = new Map<number, number>();
      serverLogs.forEach((log) => {
        newMap.set(log.dayIndex, log.minutes);
      });
      setLocalDaysMinutes(newMap);
    }
  }, [serverLogs]);

  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] w-full">
        <Spinner className="text-blue-500" />
        <p className="text-xs text-gray-400 mt-3 font-medium">
          در حال اتصال به پلتفرم تلگرام...
        </p>
      </div>
    );
  }

  if (isLeaderboardLoading || isLogsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] w-full">
        <Spinner className="text-blue-500" />
        <p className="text-xs text-gray-400 mt-3 font-medium">
          در حال دریافت وضعیت چالش گروه...
        </p>
      </div>
    );
  }

  if (!leaderboardData?.challenge) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] w-full text-center px-6">
        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-4">
          <Trophy className="w-8 h-8 text-blue-400 mx-auto" />
        </div>
        <h3 className="text-sm font-bold text-gray-200 mb-1">
          رقابتی یافت نشد
        </h3>
        <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
          جهت ثبت ساعت، باید ابتدا یک چالش فعال توسط مدیریت در این گروه تلگرامی
          پایه‌ریزی شده باشد.
        </p>
      </div>
    );
  }

  const { durationDays, currentDay } = leaderboardData.challenge;
  const currentLoggedMinutes = localDaysMinutes.get(selectedDay) || 0;

  const handleSubmit = () => {
    setNotification(null);

    const parsedHours = parseInt(hours, 10) || 0;
    const parsedMinutes = parseInt(minutes, 10) || 0;
    const inputMinutes = parsedHours * 60 + parsedMinutes;

    if (inputMinutes <= 0) {
      setNotification({
        type: 'error',
        title: 'خطا در ورود اطلاعات',
        message: 'لطفاً مقدار معتبری برای ساعت یا دقیقه مطالعه وارد کنید.'
      });
      return;
    }

    let targetTotalMinutes = inputMinutes;
    if (logMode === 'add') {
      targetTotalMinutes = currentLoggedMinutes + inputMinutes;
    }

    // گارد محافظتی لایه فرانت‌اَند پیش از ارسال به شبکه
    const MAX_MINUTES_PER_DAY = 20 * 60;
    if (targetTotalMinutes > MAX_MINUTES_PER_DAY) {
      setNotification({
        type: 'error',
        title: '⛔️ سقف مجاز روزانه رد شد (Anti-Cheat)',
        message:
          'شما نمی‌توانید در یک روز بیش از ۲۰ ساعت مطالعه ثبت کنید. لطفاً مقدار کمتری وارد کنید.'
      });
      return;
    }

    // محاسبه تفکیکی ساعت و دقیقه نهایی برای ارسال به بک‌اند
    const finalHoursToSend = Math.floor(targetTotalMinutes / 60);
    const finalMinutesToSend = targetTotalMinutes % 60;

    // ارجاع کل لاجیک سابمیت به هوک سرور
    updateTimeLog(
      {
        hours: finalHoursToSend,
        minutes: finalMinutesToSend,
        dayIndex: selectedDay
      },
      {
        onSuccess: () => {
          setLocalDaysMinutes((prev) => {
            const newMap = new Map(prev);
            newMap.set(selectedDay, targetTotalMinutes);
            return newMap;
          });

          setHours('');
          setMinutes('');
          setNotification({
            type: 'success',
            title: 'ثبت موفقیت‌آمیز زمان مطالعه',
            message:
              'ساعت مطالعه شما با موفقیت در سرور ثبت شد و لیدربرد زنده گروه تلگرام بروزرسانی گردید.'
          });
        },
        onError: (err) => {
          setNotification({
            type: 'error',
            title: 'خطا در ثبت اطلاعات',
            message:
              err.message ||
              'ارتباط با سرور برقرار نشد. لطفاً مجدداً تلاش کنید.'
          });
        }
      }
    );
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

      <DaySelectorView
        durationDays={durationDays}
        currentDay={currentDay}
        currentSelectedDay={selectedDay}
        daysMinutesMap={localDaysMinutes}
        onSelectDay={(index) => {
          setNotification(null);
          setSelectedDay(index);
        }}
      />

      <StatusCardView
        selectedDayNumber={selectedDay + 1}
        totalMinutes={currentLoggedMinutes}
      />

      <TimeInputFormView
        logMode={logMode}
        hoursValue={hours}
        minutesValue={minutes}
        isSubmitting={isSubmitting}
        onLogModeChange={setLogMode}
        onHoursChange={setHours}
        onMinutesChange={setMinutes}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
