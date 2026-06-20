// apps/frontend/src/features/time-log/components/TimeInputFormView.tsx

'use client';

import { Plus, Minus } from 'lucide-react';
import { cn } from '@utils/cn';

interface TimeInputFormViewProps {
  logMode: 'add' | 'edit';
  hoursValue: string;
  minutesValue: string;
  isSubmitting: boolean;
  onLogModeChange: (mode: 'add' | 'edit') => void;
  onHoursChange: (value: string) => void;
  onMinutesChange: (value: string) => void;
  onSubmit: () => void;
}

export function TimeInputFormView({
  logMode,
  hoursValue,
  minutesValue,
  isSubmitting,
  onLogModeChange,
  onHoursChange,
  onMinutesChange,
  onSubmit
}: TimeInputFormViewProps) {
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  // توابع کمکی مدیریت دکمه‌های پلاس و ماینس لایه نمایش
  const incrementHours = () => {
    const current = parseInt(hoursValue, 10) || 0;
    if (current < 23) {
      onHoursChange(String(current + 1));
    }
  };

  const decrementHours = () => {
    const current = parseInt(hoursValue, 10) || 0;
    if (current > 0) {
      onHoursChange(String(current - 1));
    }
  };

  const incrementMinutes = () => {
    const current = parseInt(minutesValue, 10) || 0;
    if (current < 59) {
      onMinutesChange(String(current + 1));
    }
  };

  const decrementMinutes = () => {
    const current = parseInt(minutesValue, 10) || 0;
    if (current > 0) {
      onMinutesChange(String(current - 1));
    }
  };

  return (
    <form
      onSubmit={handleFormSubmit}
      className="relative z-10 flex flex-col flex-1 gap-5 w-full"
    >
      {/* سوئیچ اختصاصی نوع عملیات ریاضی ثبت داده */}
      <div className="flex flex-col">
        <label className="text-[11px] font-bold text-gray-400 mb-2.5 px-1 text-right">
          تنظیم نوع محاسبه ثبت زمان:
        </label>
        <div className="grid grid-cols-2 p-1 bg-white/[0.02] border border-white/5 rounded-xl backdrop-blur-md">
          <button
            type="button"
            onClick={() => onLogModeChange('add')}
            className={cn(
              'py-2.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer select-none',
              logMode === 'add'
                ? 'text-white bg-blue-500/20 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                : 'text-gray-500 hover:text-gray-300'
            )}
          >
            ➕ افزودن به تایم قبلی
          </button>
          <button
            type="button"
            onClick={() => onLogModeChange('edit')}
            className={cn(
              'py-2.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer select-none',
              logMode === 'edit'
                ? 'text-white bg-blue-500/20 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                : 'text-gray-500 hover:text-gray-300'
            )}
          >
            ✏️ جایگزینی کل زمان امروز
          </button>
        </div>
      </div>

      {/* فیلدهای عددی مجهز به دکمه‌های استپر لمسی (Stepper) */}
      <div className="grid grid-cols-2 gap-4">
        {/* باکس مدیریت پلاس/ماینس ساعت */}
        <div className="flex flex-col">
          <label
            htmlFor="hoursInput"
            className="text-[11px] font-bold text-gray-400 mb-2 px-1 text-right"
          >
            مقدار ساعت:
          </label>
          <div className="flex items-center justify-between bg-white/[0.01] border border-white/10 rounded-xl p-1 direction-ltr">
            <button
              type="button"
              onClick={decrementHours}
              disabled={isSubmitting}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/[0.02] border border-white/5 text-gray-400 active:scale-90 hover:text-white transition-all disabled:opacity-30 cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <input
              type="number"
              id="hoursInput"
              min="0"
              max="23"
              placeholder="0"
              value={hoursValue}
              onChange={(e) => onHoursChange(e.target.value)}
              disabled={isSubmitting}
              className="w-full text-center font-mono font-bold text-base bg-transparent border-0 focus:outline-none focus:ring-0 placeholder:text-gray-800 disabled:opacity-40"
            />

            <button
              type="button"
              onClick={incrementHours}
              disabled={isSubmitting}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/[0.02] border border-white/5 text-gray-400 active:scale-90 hover:text-white transition-all disabled:opacity-30 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* باکس مدیریت پلاس/ماینس دقیقه */}
        <div className="flex flex-col">
          <label
            htmlFor="minutesInput"
            className="text-[11px] font-bold text-gray-400 mb-2 px-1 text-right"
          >
            مقدار دقیقه:
          </label>
          <div className="flex items-center justify-between bg-white/[0.01] border border-white/10 rounded-xl p-1 direction-ltr">
            <button
              type="button"
              onClick={decrementMinutes}
              disabled={isSubmitting}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/[0.02] border border-white/5 text-gray-400 active:scale-90 hover:text-white transition-all disabled:opacity-30 cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <input
              type="number"
              id="minutesInput"
              min="0"
              max="59"
              placeholder="00"
              value={minutesValue}
              onChange={(e) => onMinutesChange(e.target.value)}
              disabled={isSubmitting}
              className="w-full text-center font-mono font-bold text-base bg-transparent border-0 focus:outline-none focus:ring-0 placeholder:text-gray-800 disabled:opacity-40"
            />

            <button
              type="button"
              onClick={incrementMinutes}
              disabled={isSubmitting}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/[0.02] border border-white/5 text-gray-400 active:scale-90 hover:text-white transition-all disabled:opacity-30 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* دکمه اصلی ارسال اطلاعات ماژول */}
      <div className="mt-auto pt-6">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] transition-all text-xs font-bold text-white shadow-[0_4px_20px_rgba(59,130,246,0.25)] flex items-center justify-center gap-2 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>
            {isSubmitting ? 'در حال ثبت اطلاعات...' : 'ثبت زمان مطالعه چالش'}
          </span>
        </button>
      </div>
    </form>
  );
}
