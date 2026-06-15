// apps/backend/src/core/config/env.ts

import dotenv from 'dotenv';

// بارگذاری فایل .env در صورت وجود
dotenv.config();
const parsedPort = parseInt(process.env.PORT || '3000', 10);
// مکانیسم Fail-Fast برای جلوگیری از اجرای سرور با پورت نامعتبر
if (isNaN(parsedPort) || parsedPort <= 0) {
  throw new Error(
    'Critical Configuration Error: INVALID_PORT provided in environment variables.'
  );
}

if (!process.env.BOT_TOKEN) {
  throw new Error(
    'Critical Configuration Error: BOT_TOKEN is strictly required but missing.'
  );
}

export const env = {
  PORT: parsedPort,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/study-rivals',
  BOT_TOKEN: process.env.BOT_TOKEN || '',
  NODE_ENV: process.env.NODE_ENV || 'development',
  MINI_APP_URL: process.env.MINI_APP_URL || 'https://google.com',
  // کد ۱۶ رقمی محرمانه برای راه‌اندازی اولیه اکانت مادر سیستم (مثلاً: ABCD-1234-EFGH-5678)
  MOTHER_SECRET_CODE: process.env.MOTHER_SECRET_CODE || 'MOTHER-INIT-CODE-16'
} as const;
