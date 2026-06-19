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

    // ۲. 🛡️ راه‌اندازی سرور اکسپرس (ابتدا سرور وب را بالا می‌آوریم تا APIها در دسترس باشند)
    app.listen(env.PORT, () => {
      logger.info(
        `Server is running on port ${env.PORT} in ${env.NODE_ENV} mode.`
      );
    });

    // ۳. 🛡️ راه‌اندازی ربات تلگرام به صورت موازی (بدون await)
    // با این کار اگر اتصال به تلگرام هِنگ کند، سرور اکسپرس ما از کار نمی‌افتد
    botService.launch().catch((error) => {
      logger.error('Failed to launch Telegram bot from server.ts:', error);
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
