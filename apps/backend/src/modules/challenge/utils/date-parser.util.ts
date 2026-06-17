// apps/backend/src/modules/challenge/utils/date-parser.util.ts

import jalaali from 'jalaali-js';

const PERSIAN_MONTHS: Record<string, number> = {
  فروردین: 1,
  اردیبهشت: 2,
  خرداد: 3,
  تیر: 4,
  مرداد: 5,
  شهریور: 6,
  مهر: 7,
  آبان: 8,
  آذر: 9,
  دی: 10,
  بهمن: 11,
  اسفند: 12
};

export interface ParseDateResult {
  isValid: boolean;
  date?: Date;
  error?: string;
}

export const parsePersianDate = (text: string): ParseDateResult => {
  // گرفتن الگو مثل "15 فروردین 1405" (پشتیبانی از فاصله‌های اضافه بین کلمات)
  const regex = /^(\d{1,2})\s+([آ-ی]+)\s+(\d{4})$/;
  const match = text.trim().match(regex);

  if (!match) {
    return {
      isValid: false,
      error:
        'فرمت وارد شده نامعتبر است. لطفاً دقیقاً مانند الگو وارد کنید (مثال: 15 فروردین 1405)'
    };
  }

  const day = parseInt(match[1], 10);
  const monthName = match[2];
  const year = parseInt(match[3], 10);

  const month = PERSIAN_MONTHS[monthName];

  if (!month) {
    return {
      isValid: false,
      error:
        'نام ماه نامعتبر است. لطفاً نام ماه را به درستی وارد کنید (مثلاً: فروردین).'
    };
  }

  // اعتبارسنجی تقویم شمسی (تعداد روزهای ماه‌ها و سال کبیسه)
  if (
    day < 1 ||
    day > 31 ||
    (month > 6 && day > 30) ||
    (month === 12 && day > 29 && !jalaali.isLeapJalaaliYear(year))
  ) {
    return {
      isValid: false,
      error: 'روز وارد شده برای این ماه معتبر نمی‌باشد.'
    };
  }

  try {
    // تبدیل به میلادی
    const { gy, gm, gd } = jalaali.toGregorian(year, month, day);

    // تنظیم دقیق تاریخ روی ساعت 00:00:00 UTC
    const date = new Date(Date.UTC(gy, gm - 1, gd, 0, 0, 0));

    return { isValid: true, date };
  } catch (error) {
    return {
      isValid: false,
      error: 'خطایی در پردازش و تبدیل تاریخ رخ داد.'
    };
  }
};
