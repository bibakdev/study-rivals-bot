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

// تابع ساخت برچسب تاریخ شمسی (نمونه: 1تیر)
export const formatPersianDateLabel = (date: Date): string => {
  const { jd, jm } = jalaali.toJalaali(date);
  const monthName = PERSIAN_MONTHS[jm - 1];
  return `${jd}${monthName}`;
};

// تابع کمکی برای تبدیل اعداد فارسی و عربی به انگلیسی
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

    const hoursStr = parts[0].trim();
    const minsStr = parts[1].trim();

    const hours = hoursStr === '' ? 0 : parseFloat(hoursStr);
    const mins = minsStr === '' ? 0 : parseFloat(minsStr);

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

// 👈 اضافه شدن گام دوم: منطق هوشمند سه حالته (محاسبه تفاضل و تولید متن گزارش)
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

  const comparisonLine = `✏️ تغییر زمان از ${formatMinutesToTime(oldMinutes)} به ${formatMinutesToTime(newMinutes)}`;

  return `${diffLine}\n${comparisonLine}`;
};
