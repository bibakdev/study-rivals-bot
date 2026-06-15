// apps/backend/src/core/config/env.ts

import dotenv from 'dotenv';
import { z } from 'zod';

// بارگذاری فایل .env
dotenv.config();

// تعریف اسکیمای اعتبارسنجی متغیرهای محیطی با Zod
const envSchema = z.object({
  PORT: z
    .string()
    .default('3000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive('پورت سرور باید یک عدد مثبت باشد.')),

  MONGO_URI: z
    .string()
    .url('فرمت آدرس دیتابیس نامعتبر است.')
    .default('mongodb://127.0.0.1:27017/study-rivals'),

  BOT_TOKEN: z
    .string()
    .min(
      1,
      'Critical Configuration Error: BOT_TOKEN is strictly required but missing.'
    ),

  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  MINI_APP_URL: z
    .string()
    .url('فرمت آدرس مینی‌اپ نامعتبر است.')
    .default('https://google.com'),

  MOTHER_SECRET_CODE: z
    .string()
    .min(16, 'کد محرمانه اکانت مادر باید حداقل ۱۶ کاراکتر باشد.')
    .default('MOTHER-INIT-CODE-16')
});

// پارس کردن و اعتبارسنجی فرآیند
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    '❌ Critical Configuration Error: Invalid environment variables:'
  );
  // نمایش خطاهای ساختاریافته به شکل خوانا در کنسول
  console.error(JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

// صادر کردن متغیرهای کاملاً تایپ‌دهی شده و ایمن
export const env = parsedEnv.data;
