// apps/frontend/src/shared/components/ui/Avatar.tsx

'use client';

import { useState } from 'react';
import { cn } from '@utils/cn';

interface AvatarProps {
  src?: string | null;
  name: string;
  className?: string;
}

// پالت رنگی جذاب برای پس‌زمینه آواتارهایی که عکس ندارند
const COLORS = [
  'bg-red-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-orange-500',
  'bg-cyan-500'
];

export function Avatar({ src, name, className }: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  // استخراج حرف اول اسم برای نمایش (در صورت نبود اسم، علامت سوال نشان داده می‌شود)
  const initial = name ? name.charAt(0).toUpperCase() : '؟';

  // تولید یک رنگ ثابت و یکتا بر اساس کدهای اسکی (ASCII) نام کاربر
  const colorIndex = name
    ? Array.from(name).reduce((acc, char) => acc + char.charCodeAt(0), 0) %
      COLORS.length
    : 0;
  const bgColor = COLORS[colorIndex];

  return (
    <div
      className={cn(
        'relative flex items-center justify-center shrink-0 overflow-hidden rounded-full font-bold text-white',
        !src || imgError ? bgColor : 'bg-gray-800',
        className
      )}
    >
      {src && !imgError ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)} // اگر عکس به هر دلیلی شکسته بود، سریعاً به حالت حرف اول سوییچ می‌کند
        />
      ) : (
        <span className="text-white drop-shadow-md">{initial}</span>
      )}
    </div>
  );
}
