// apps/backend/src/modules/telegram-bot/bot.service.ts

import { Telegraf } from 'telegraf';
import { env } from '#core/config/env';
import { logger } from '#utils/logger';
import { startCommand } from '#modules/telegram-bot/commands/start/start.router';
import { handleBotOnboardingText } from '#modules/telegram-bot/handlers/onboarding/onboarding.router';
import { handleGroupTenantMessages } from '#modules/telegram-bot/handlers/tenant.handler';
import { handleGenerateLicense } from '#modules/telegram-bot/handlers/mother/generate-license.action';
export class BotService {
  private bot: Telegraf;

  constructor() {
    if (!env.BOT_TOKEN) {
      logger.error('BOT_TOKEN is missing in environment variables!');
      process.exit(1);
    }

    this.bot = new Telegraf(env.BOT_TOKEN);
    this.initializeCommandsAndHandlers();
  }

  private initializeCommandsAndHandlers(): void {
    // ۱. ثبت دستور استارت عمومی
    this.bot.start(startCommand);

    // اتصال اکشن دکمه شیشه‌ای تولید لایسنس (ویژه مادر)
    this.bot.action('action_generate_license', handleGenerateLicense);

    // ۲. مدیریت هوشمند رویدادهای متنی بر اساس مرزبندی محیط چت (تلگرام کور-لاجیک)
    this.bot.on('text', async (ctx, next) => {
      const chatType = ctx.chat?.type;

      if (chatType === 'private') {
        // محیط پیوی: پردازش Onboarding و احراز هویت اولیه اکانت مادر
        await handleBotOnboardingText(ctx);
      } else if (chatType === 'group' || chatType === 'supergroup') {
        // محیط گروه: پردازش فعال‌سازی لایسنس مستأجرین و اتصال اتمیک به تاپیک چالش
        await handleGroupTenantMessages(ctx);
      }

      return next();
    });
  }

  public async launch(): Promise<void> {
    try {
      await this.bot.launch();
      logger.info(
        'Telegram Bot successfully launched with segregated Tenant & Onboarding architecture.'
      );
    } catch (error) {
      logger.error('Failed to launch Telegram bot', error);
    }
  }

  public getBot(): Telegraf {
    return this.bot;
  }
}

export const botService = new BotService();
