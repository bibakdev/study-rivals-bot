// apps/backend/src/core/config/database.ts

import mongoose from 'mongoose';
import { env } from '#core/config/env';
import { logger } from '#core/utils/logger';

export const connectDatabase = async (): Promise<void> => {
  try {
    mongoose.set('strictQuery', true);

    /**
     * 🛡️ غیرفعال کردن بافرینگ کوئری‌ها (Disable Command Buffering):
     * با این کار، اگر دیتابیس قطع باشد یا کوئری هِنگ کند، Mongoose منتظر نمی‌ماند
     * و فوراً خطای قطعی صادر می‌کند تا سرور قفل نشود و خطای 504 به خطای شفاف دیتابیس تبدیل گردد.
     */
    mongoose.set('bufferCommands', false);

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
