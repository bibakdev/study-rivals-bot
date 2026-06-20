// apps/frontend/src/features/target/components/TargetFormView.tsx

'use client';

import { Plus, Minus, Trash2, AlertCircle } from 'lucide-react';

interface TargetFormViewProps {
  hoursValue: string;
  minutesValue: string;
  isSubmitting: boolean;
  hasExistingTarget: boolean;
  isDeleting: boolean;
  onHoursChange: (value: string) => void;
  onMinutesChange: (value: string) => void;
  onSubmit: () => void;
  onDelete: () => void;
}

export function TargetFormView({
  hoursValue,
  minutesValue,
  isSubmitting,
  hasExistingTarget,
  isDeleting,
  onHoursChange,
  onMinutesChange,
  onSubmit,
  onDelete
}: TargetFormViewProps) {
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const incrementHours = () => {
    const current = parseInt(hoursValue, 10) || 0;
    if (current < 23) onHoursChange(String(current + 1));
  };

  const decrementHours = () => {
    const current = parseInt(hoursValue, 10) || 0;
    if (current > 0) onHoursChange(String(current - 1));
  };

  const incrementMinutes = () => {
    const current = parseInt(minutesValue, 10) || 0;
    if (current < 59) onMinutesChange(String(current + 1));
  };

  const decrementMinutes = () => {
    const current = parseInt(minutesValue, 10) || 0;
    if (current > 0) onMinutesChange(String(current - 1));
  };

  return (
    <form
      onSubmit={handleFormSubmit}
      className="relative z-10 flex flex-col flex-1 gap-5 w-full"
    >
      <div className="grid grid-cols-2 gap-4">
        {/* فیلد ساعت */}
        <div className="flex flex-col">
          <label
            htmlFor="targetHoursInput"
            className="text-[11px] font-bold text-gray-400 mb-2 px-1 text-right"
          >
            مقدار ساعت:
          </label>
          <div className="flex items-center justify-between bg-white/[0.01] border border-white/10 rounded-xl p-1 direction-ltr">
            <button
              type="button"
              onClick={decrementHours}
              disabled={isSubmitting || isDeleting}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/[0.02] border border-white/5 text-gray-400 active:scale-90 hover:text-white transition-all disabled:opacity-30 cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <input
              type="number"
              id="targetHoursInput"
              min="0"
              max="23"
              placeholder="0"
              value={hoursValue}
              onChange={(e) => onHoursChange(e.target.value)}
              disabled={isSubmitting || isDeleting}
              className="w-full text-center font-mono font-bold text-base bg-transparent border-0 focus:outline-none focus:ring-0 placeholder:text-gray-800 disabled:opacity-40"
            />

            <button
              type="button"
              onClick={incrementHours}
              disabled={isSubmitting || isDeleting}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/[0.02] border border-white/5 text-gray-400 active:scale-90 hover:text-white transition-all disabled:opacity-30 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* فیلد دقیقه */}
        <div className="flex flex-col">
          <label
            htmlFor="targetMinutesInput"
            className="text-[11px] font-bold text-gray-400 mb-2 px-1 text-right"
          >
            مقدار دقیقه:
          </label>
          <div className="flex items-center justify-between bg-white/[0.01] border border-white/10 rounded-xl p-1 direction-ltr">
            <button
              type="button"
              onClick={decrementMinutes}
              disabled={isSubmitting || isDeleting}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/[0.02] border border-white/5 text-gray-400 active:scale-90 hover:text-white transition-all disabled:opacity-30 cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <input
              type="number"
              id="targetMinutesInput"
              min="0"
              max="59"
              placeholder="00"
              value={minutesValue}
              onChange={(e) => onMinutesChange(e.target.value)}
              disabled={isSubmitting || isDeleting}
              className="w-full text-center font-mono font-bold text-base bg-transparent border-0 focus:outline-none focus:ring-0 placeholder:text-gray-800 disabled:opacity-40"
            />

            <button
              type="button"
              onClick={incrementMinutes}
              disabled={isSubmitting || isDeleting}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/[0.02] border border-white/5 text-gray-400 active:scale-90 hover:text-white transition-all disabled:opacity-30 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 👈 باکس تذکر با متن اختصاصی شما */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200/90 shadow-[0_0_15px_rgba(245,158,11,0.05)] mt-1">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
        <p className="text-[10px] font-medium leading-relaxed">
          <strong className="text-amber-400">مبنای موازنه قدرت: </strong>
          کاربران بر اساس سطح تارگت تعیین‌شده در گروه‌ها قرار می‌گیرند؛ بنابراین
          لطفاً تارگت خود را{' '}
          <strong className="text-amber-300">واقعی و منطقی</strong> وارد کنید.
        </p>
      </div>

      <div className="mt-auto pt-2 flex flex-col gap-3">
        <button
          type="submit"
          disabled={isSubmitting || isDeleting}
          className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] transition-all text-xs font-bold text-white shadow-[0_4px_20px_rgba(59,130,246,0.25)] flex items-center justify-center gap-2 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>{isSubmitting ? 'در حال ثبت...' : 'ثبت تارگت'}</span>
        </button>

        {hasExistingTarget && (
          <button
            type="button"
            onClick={onDelete}
            disabled={isSubmitting || isDeleting}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 active:scale-[0.98] transition-all text-xs font-bold text-red-400 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isDeleting ? 'در حال حذف...' : 'حذف تارگت فعلی'}</span>
          </button>
        )}
      </div>
    </form>
  );
}
