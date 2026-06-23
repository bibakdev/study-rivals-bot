// apps/backend/src/modules/time-log/utils/time-parser.util.ts

import jalaali from 'jalaali-js';

const PERSIAN_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند'
];

// 👈 تابع مصون از منطقه زمانی سرور (همیشه تاریخ ایران را خروجی می‌دهد)
export const formatPersianDateLabel = (date: Date): string => {
  const TEHRAN_OFFSET = 3.5 * 60 * 60 * 1000;
  const tzDate = new Date(date.getTime() + TEHRAN_OFFSET);

  // استخراج با متدهای UTC تا سرور Render نتواند روز را جابجا کند
  const gy = tzDate.getUTCFullYear();
  const gm = tzDate.getUTCMonth() + 1;
  const gd = tzDate.getUTCDate();

  const { jd, jm } = jalaali.toJalaali(gy, gm, gd);
  return `${jd} ${PERSIAN_MONTHS[jm - 1]}`;
};

export const normalizeDigits = (text: string): string => {
  const persianNumbers = [
    /۰/g,
    /۱/g,
    /۲/g,
    /۳/g,
    /۴/g,
    /۵/g,
    /۶/g,
    /۷/g,
    /۸/g,
    /۹/g
  ];
  const arabicNumbers = [
    /٠/g,
    /١/g,
    /٢/g,
    /٣/g,
    /٤/g,
    /٥/g,
    /٦/g,
    /٧/g,
    /٨/g,
    /٩/g
  ];

  let normalized = text;
  for (let i = 0; i < 10; i++) {
    normalized = normalized
      .replace(persianNumbers[i], String(i))
      .replace(arabicNumbers[i], String(i));
  }
  return normalized;
};

export const parseTimeStringToMinutes = (text: string): number | null => {
  let trimmed = normalizeDigits(text).trim();
  trimmed = trimmed.replace(/：/g, ':');

  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    if (parts.length !== 2) return null;
    const hours = parts[0].trim() === '' ? 0 : parseFloat(parts[0].trim());
    const mins = parts[1].trim() === '' ? 0 : parseFloat(parts[1].trim());
    if (isNaN(hours) || isNaN(mins)) return null;
    return Math.round(hours * 60 + mins);
  }

  const hours = parseFloat(trimmed);
  if (isNaN(hours)) return null;
  return Math.round(hours * 60);
};

export const formatMinutesToTime = (minutes?: number): string => {
  if (minutes === undefined || minutes === null) return '0:00';
  const hrs = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  return `${hrs}:${mins.toString().padStart(2, '0')}`;
};

export const generateTimeDiffMessage = (
  oldMinutes: number,
  newMinutes: number
): string => {
  const diffMinutes = newMinutes - oldMinutes;
  let diffLine = '';

  if (diffMinutes > 0) {
    diffLine = `➕ مقدار زمان اضافه شده: ${formatMinutesToTime(diffMinutes)}`;
  } else if (diffMinutes < 0) {
    diffLine = `➖ مقدار زمان کاهش یافته: ${formatMinutesToTime(Math.abs(diffMinutes))}`;
  } else {
    diffLine = `🔹 مقدار زمان تغییر یافته: 0:00`;
  }

  return `${diffLine}\n✏️ تغییر زمان از ${formatMinutesToTime(oldMinutes)} به ${formatMinutesToTime(newMinutes)}`;
};
