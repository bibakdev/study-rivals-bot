// packages/shared-types/src/dtos/time-log.dto.ts

import { z } from 'zod';

/**
 * اسکیمای اعتبارسنجی درخواست ثبت یا ویرایش ساعت مطالعه از سمت مینی‌اپ تلگرام
 */
export const LogTimeRequestSchema = z.object({
  hours: z
    .number({ message: 'مقدار ساعت الزامی است و باید عدد باشد.' })
    .int('مقدار ساعت باید یک عدد صحیح باشد.')
    .nonnegative('مقدار ساعت نمی‌تواند منفی باشد.')
    .max(23, 'مقدار ساعت نمی‌تواند بیشتر از ۲۳ ساعت باشد.'),

  minutes: z
    .number({ message: 'مقدار دقیقه الزامی است و باید عدد باشد.' })
    .int('مقدار دقیقه باید یک عدد صحیح باشد.')
    .nonnegative('مقدار دقیقه نمی‌تواند منفی باشد.')
    .max(59, 'مقدار دقیقه نمی‌تواند بیشتر از ۵۹ دقیقه باشد.'),

  dayIndex: z
    .number({ message: 'ایندکس روز الزامی است و باید عدد باشد.' })
    .int('ایندکس روز باید یک عدد صحیح باشد.')
    .nonnegative('ایندکس روز چالش نمی‌تواند منفی باشد.')
});

/**
 * اسکیمای اعتبارسنجی پاسخ موفقیت‌آمیز ثبت ساعت مطالعه برای مصرف در مینی‌اپ
 */
export const LogTimeResponseSchema = z.object({
  dayIndex: z.number().int().nonnegative(),
  updatedTotalMinutes: z.number().int().nonnegative()
});

// استخراج تایپ‌های استاتیک جهت استفاده در کامپایلر تاپ‌اسکریپت سراسر مونو‌ریپو
export type LogTimeRequestDto = z.infer<typeof LogTimeRequestSchema>;
export type LogTimeResponseDto = z.infer<typeof LogTimeResponseSchema>;
