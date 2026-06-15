// packages/shared-types/src/dtos/auth.dto.ts

import { z } from 'zod';

// تعریف اسکیمای ران‌تایم برای اطلاعات کاربر تلگرام
export const TelegramUserSchema = z.object({
  id: z.number(),
  is_bot: z.boolean().optional(),
  first_name: z.string().min(1),
  last_name: z.string().optional(),
  username: z.string().optional(),
  language_code: z.string().optional(),
  is_premium: z.boolean().optional(),
  photo_url: z.string().optional()
});

// استخراج تایپ استاتیک برای استفاده در کامپایلر تایپ‌اسکریپت
export type TelegramUserDto = z.infer<typeof TelegramUserSchema>;

// اسکیمای رشته خام توکن ورودی
export const TelegramInitDataSchema = z.object({
  initData: z.string().min(1, 'رشته initData الزامی است.')
});

export type TelegramInitDataDto = z.infer<typeof TelegramInitDataSchema>;
