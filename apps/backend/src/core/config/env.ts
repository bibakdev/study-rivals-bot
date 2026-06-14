// apps/backend/src/core/config/env.ts

import dotenv from 'dotenv';

// بارگذاری فایل .env در صورت وجود
dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/study-rivals',
  BOT_TOKEN: process.env.BOT_TOKEN || '',
  NODE_ENV: process.env.NODE_ENV || 'development'
} as const;
