// apps/backend/src/server.ts

import app from './app';
import { connectDatabase } from '#core/config/database';
import { env } from '#core/config/env';
import { logger } from '#core/utils/logger';
import { botService } from '#modules/telegram-bot/bot.service';

const startServer = async (): Promise<void> => {
  try {
    // ۱. اتصال به دیتابیس فعال شد
    await connectDatabase();

    // ۲. راه‌اندازی ربات تلگرام
    await botService.launch();

    // ۳. راه‌اندازی سرور اکسپرس
    app.listen(env.PORT, () => {
      logger.info(
        `Server is running on port ${env.PORT} in ${env.NODE_ENV} mode.`
      );
    });
  } catch (error) {
    logger.error('Critical Error during server startup:', error);
    process.exit(1);
  }
};

// هندل کردن خطاهای پیش‌بینی نشده سراسری
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

startServer();
