// apps/backend/src/core/config/database.ts

import mongoose from 'mongoose';
import { env } from '#core/config/env';
import { logger } from '#core/utils/logger';

export const connectDatabase = async (): Promise<void> => {
  try {
    // تنظیمات سخت‌گیرانه برای کوئری‌ها (جلوگیری از ذخیره فیلدهای تعریف نشده در مدل)
    mongoose.set('strictQuery', true);
    
    await mongoose.connect(env.MONGO_URI);
    logger.info('Successfully connected to MongoDB.');
  } catch (error) {
    logger.error('Failed to connect to MongoDB', error);
    // در صورت عدم اتصال به دیتابیس، سرور باید متوقف شود
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB.');
  } catch (error) {
    logger.error('Failed to disconnect from MongoDB', error);
  }
};