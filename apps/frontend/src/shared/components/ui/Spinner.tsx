import { cn } from '@utils/cn';

interface SpinnerProps {
  className?: string;
}

export function Spinner({ className }: SpinnerProps) {
  return (
    <div
      className={cn(
        'animate-spin inline-block w-10 h-10 border-[4px] border-current border-t-transparent rounded-full',
        className
      )}
      role="status"
      aria-label="loading"
    >
      <span className="sr-only">در حال بارگذاری...</span>
    </div>
  );
}
