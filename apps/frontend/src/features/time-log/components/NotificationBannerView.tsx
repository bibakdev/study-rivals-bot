// apps/frontend/src/features/time-log/components/NotificationBannerView.tsx

'use client';

import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@utils/cn';

interface NotificationBannerViewProps {
  type: 'success' | 'error';
  title: string;
  message: string;
  onClose?: () => void;
}

export function NotificationBannerView({
  type,
  title,
  message
}: NotificationBannerViewProps) {
  const isSuccess = type === 'success';

  return (
    <div
      className={cn(
        'relative z-10 w-full p-4 rounded-2xl border backdrop-blur-md mb-5 transition-all duration-300 animate-in fade-in zoom-in-95',
        isSuccess
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
          : 'bg-red-500/10 border-red-500/20 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.05)]'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          {isSuccess ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-400" />
          )}
        </div>
        <div className="flex-1 flex flex-col items-start text-right">
          <h4 className="text-xs font-bold tracking-wide">{title}</h4>
          <p className="text-[11px] mt-1 opacity-85 leading-relaxed">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
