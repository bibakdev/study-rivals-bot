// apps/backend/src/modules/telegram-bot/bot.service.ts

import { Telegraf } from 'telegraf';
import rateLimit from 'telegraf-ratelimit'; // 👈 ۱. ایمپورت پکیج محدودکننده
import { env } from '#core/config/env';
import { logger } from '#utils/logger';
import { startCommand } from '#modules/telegram-bot/commands/start/start.router';
import { handleBotOnboardingText } from '#modules/telegram-bot/handlers/onboarding/onboarding.router';
import { handleGroupTenantMessages } from '#modules/telegram-bot/handlers/tenant/tenant.router';
import { handleGenerateLicense } from '#modules/telegram-bot/handlers/mother/generate-license.action';
import { handleSelectTenant } from '#modules/telegram-bot/handlers/tenant/select-tenant.action';
import { handleAddGroupRequest } from '#modules/telegram-bot/handlers/onboarding/add-group.action';
import { handleMyGroupsRequest } from '#modules/telegram-bot/handlers/tenant/my-groups.action';
import { handleManageGroupsRequest } from '#modules/telegram-bot/handlers/tenant/manage-groups.action';
import { handleBackToMain } from '#modules/telegram-bot/handlers/tenant/back-to-main.action';
import { handleLeaveGroup } from '#modules/telegram-bot/handlers/tenant/leave-group.action';
import { handleAddAdminRequest } from '#modules/telegram-bot/handlers/tenant/add-admin.action';
import { handlePromoteSubAdmin } from '#modules/telegram-bot/handlers/tenant/promote-admin.action';
import { handleRemoveAdminRequest } from '#modules/telegram-bot/handlers/tenant/remove-admin.action';
import { handleDemoteSubAdmin } from '#modules/telegram-bot/handlers/tenant/demote-admin.action';

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
    // 👈 ۲. پیکربندی سپر موقت (Rate Limit)
    const rateLimitConfig = {
      window: 3000, // بازه زمانی: ۳ ثانیه (۳۰۰۰ میلی‌ثانیه)
      limit: 2, // حداکثر درخواست مجاز در این بازه: ۲ عدد
      onLimitExceeded: (ctx: any, next: () => Promise<void>) => {
        // وقتی کاربر از حد مجاز عبور کرد، فقط یک لاگ می‌اندازیم و next() را صدا نمی‌زنیم.
        // صدا نزدن next() باعث می‌شود ریکوئست همین‌جا کُشته (Drop) شود و به دیتابیس نرسد.
        logger.warn(`Spam detected and dropped. Telegram ID: ${ctx.from?.id}`);
      },
      keyGenerator: (ctx: any) => {
        // شناسه منحصر‌به‌فرد برای هر محدودیت، آیدی عددی تلگرام کاربر است
        return ctx.from?.id?.toString() || 'unknown';
      }
    };

    // 👈 ۳. تزریق به عنوان اولین لایه دفاعی (بالاتر از همه دستورات)
    this.bot.use(rateLimit(rateLimitConfig));

    // ۱. ثبت دستور استارت عمومی
    this.bot.start(startCommand);

    // ۲. اتصال اکشن دکمه شیشه‌ای تولید لایسنس (ویژه مادر)
    this.bot.action('action_generate_license', handleGenerateLicense);

    // ۳. هندل کردن انتخاب گروه از طریق کیبورد شیشه‌ای با استفاده از ریجکس (Regex)
    this.bot.action(/^select_tenant_(.+)$/, handleSelectTenant);

    // ۴. هندل کردن دکمه‌های پنل کاربری و مدیریت گروه‌ها
    this.bot.action('action_manage_groups', handleManageGroupsRequest);
    this.bot.action('action_add_to_group', handleAddGroupRequest);
    this.bot.action('action_my_groups', handleMyGroupsRequest);

    // ۵. هندل کردن دکمه بازگشت به منوی اصلی
    this.bot.action('action_back_to_main', handleBackToMain);

    // ۶. هندل کردن لیست کاربران برای افزودن ادمین
    this.bot.action(/^action_add_admin_(.+)$/, handleAddAdminRequest);

    // ۷. هندل کردن کلیک روی کاربر برای ارتقای نقش
    this.bot.action(
      /^promote_sub_([a-f\d]{24})_(\d+)$/i,
      handlePromoteSubAdmin
    );

    // ۸. هندل کردن لیست ادمین‌ها برای عزل
    this.bot.action(/^action_remove_admin_(.+)$/, handleRemoveAdminRequest);

    // ۹. هندل کردن کلیک روی ادمین فرعی برای تنزل نقش به کاربر عادی
    this.bot.action(/^demote_sub_([a-f\d]{24})_(\d+)$/i, handleDemoteSubAdmin);

    // ۱۰. گوش دادن به رویداد خروج کاربر از گروه تلگرامی برای حذف دسترسی
    this.bot.on('left_chat_member', handleLeaveGroup);

    // ۱۱. مدیریت هوشمند رویدادهای متنی بر اساس مرزبندی محیط چت
    this.bot.on('text', async (ctx, next) => {
      const chatType = ctx.chat?.type;

      if (chatType === 'private') {
        await handleBotOnboardingText(ctx);
      } else if (chatType === 'group' || chatType === 'supergroup') {
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
