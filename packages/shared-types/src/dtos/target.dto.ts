// packages/shared-types/src/dtos/target.dto.ts

import { z } from 'zod';

/**
 * اسکیمای اعتبارسنجی درخواست ثبت یا ویرایش تارگت روزانه از سمت مینی‌اپ تلگرام
 * هماهنگ با ساختار پیام خطای Zod v4 جهت پایداری فرآیند کامپایلر tsc مونو‌ریپو
 */
export const UpdateTargetRequestSchema = z.object({
  hours: z
    .number({
      message: 'مقدار ساعت تارگت الزامی است و باید یک عدد معتبر باشد.'
    })
    .int('مقدار ساعت تارگت باید یک عدد صحیح باشد.')
    .nonnegative('مقدار ساعت تارگت نمی‌تواند منفی باشد.')
    .max(23, 'مقدار ساعت تارگت نمی‌تواند بیشتر از ۲۳ ساعت باشد.'),

  minutes: z
    .number({
      message: 'مقدار دقیقه تارگت الزامی است و باید یک عدد معتبر باشد.'
    })
    .int('مقدار دقیقه تارگت باید یک عدد صحیح باشد.')
    .nonnegative('مقدار دقیقه تارگت نمی‌تواند منفی باشد.')
    .max(59, 'مقدار دقیقه تارگت نمی‌تواند بیشتر از ۵۹ دقیقه باشد.')
});

/**
 * اسکیمای اعتبارسنجی پاسخ موفقیت‌آمیز واکشی یا ذخیره تارگت برای مصرف در مینی‌اپ
 */
export const TargetResponseSchema = z.object({
  telegramId: z.number().int().positive(),
  tenantId: z.string().min(1),
  dailyMinutes: z.number().int().nonnegative()
});

// استخراج تایپ‌های استاتیک جهت استفاده در کامپایلر تایپ‌اسکریپت سراسر مونو‌ریپو
export type UpdateTargetRequestDto = z.infer<typeof UpdateTargetRequestSchema>;
export type TargetResponseDto = z.infer<typeof TargetResponseSchema>;
