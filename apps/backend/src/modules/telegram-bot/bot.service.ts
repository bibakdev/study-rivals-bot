import { Telegraf } from 'telegraf';
import { env } from '#core/config/env';
import { logger } from '#utils/logger';
import { startCommand } from '#modules/telegram-bot/commands/start.command';

export class BotService {
  private bot: Telegraf;

  constructor() {
    if (!env.BOT_TOKEN) {
      logger.error('BOT_TOKEN is missing in environment variables!');
      process.exit(1);
    }

    this.bot = new Telegraf(env.BOT_TOKEN);
    this.initializeCommands();
  }

  private initializeCommands(): void {
    // ثبت دستورات ربات
    this.bot.start(startCommand);
  }

  // 👈 علامت => حذف شد و به شکل یک متد استاندارد کلاس نوشته شد
  public async launch(): Promise<void> {
    try {
      // اجرای ربات
      await this.bot.launch();
      logger.info('Telegram Bot successfully launched.');
    } catch (error) {
      logger.error('Failed to launch Telegram bot', error);
    }
  }

  public getBot(): Telegraf {
    return this.bot;
  }
}

// ساخت یک نمونه سینگلتون (Singleton) برای استفاده در کل برنامه
export const botService = new BotService();
