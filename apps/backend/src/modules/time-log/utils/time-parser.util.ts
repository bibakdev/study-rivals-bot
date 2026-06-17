// apps/backend/src/modules/time-log/utils/time-parser.util.ts

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
  // ۱. ابتدا تمام اعداد به انگلیسی استاندارد تبدیل می‌شوند
  let trimmed = normalizeDigits(text).trim();

  // ۲. اصلاح دونقطه فارسی (در صورتی که کیبورد کاراکتر متفاوتی تایپ کند)
  trimmed = trimmed.replace(/：/g, ':');

  // ۳. پشتیبانی از فرمت ساعت:دقیقه (مثال 8:30 یا 0:20)
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

  // ۴. پشتیبانی از عدد خالص به عنوان ساعت (مثال 4 یعنی 4 ساعت)
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
