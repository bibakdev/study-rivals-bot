// apps/frontend/src/shared/components/ui/Accordion.tsx

'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@utils/cn';

interface AccordionProps {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function Accordion({
  title,
  children,
  defaultOpen = false,
  className
}: AccordionProps) {
  const [isOpen, setIsOpen] = useState<boolean>(defaultOpen);

  return (
    <div
      className={cn(
        'flex flex-col border border-white/10 rounded-xl overflow-hidden bg-white/[0.02] backdrop-blur-md transition-colors',
        isOpen ? 'bg-white/[0.04] border-white/20' : '',
        className
      )}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation(); // جلوگیری از تداخل کلیک در لایه‌های بالاتر (مثل WinnerView)
          setIsOpen(!isOpen);
        }}
        className="flex items-center justify-between w-full p-3 text-right transition-colors hover:bg-white/[0.02] cursor-pointer"
      >
        <div className="flex-1 min-w-0">{title}</div>
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/5 shrink-0 ml-1">
          <ChevronDown
            className={cn(
              'w-3.5 h-3.5 text-gray-400 transition-transform duration-300 ease-out',
              isOpen && 'transform rotate-180 text-blue-300'
            )}
          />
        </div>
      </button>

      {/* تکنیک مدرن CSS Grid برای ایجاد انیمیشن نرم روی ارتفاع نامشخص.
        وقتی باز است، ردیف ۱ واحد کامل فضا می‌گیرد و وقتی بسته است، ۰ می‌شود.
      */}
      <div
        className={cn(
          'grid transition-all duration-300 ease-in-out',
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <div className="p-3 pt-0 border-t border-white/5 mt-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
