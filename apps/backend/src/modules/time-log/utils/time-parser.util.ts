// apps/backend/src/modules/time-log/utils/time-parser.util.ts

export const parseTimeStringToMinutes = (text: string): number | null => {
  const trimmed = text.trim();

  // پشتیبانی از فرمت ساعت:دقیقه (مثال 10:30 یا 0: 32)
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    if (parts.length !== 2) return null;

    const hoursStr = parts[0].trim();
    const minsStr = parts[1].trim();

    // اگر بخش ساعت خالی بود (مثلاً :32) آن را صفر در نظر می‌گیریم
    const hours = hoursStr === '' ? 0 : parseFloat(hoursStr);
    const mins = minsStr === '' ? 0 : parseFloat(minsStr);

    if (isNaN(hours) || isNaN(mins)) return null;

    return Math.round(hours * 60 + mins);
  }

  // پشتیبانی از عدد خالص به عنوان ساعت (مثال 5 یعنی 5 ساعت)
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
