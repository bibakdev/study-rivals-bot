// apps/backend/src/modules/telegram-bot/bot.service.ts

import { Telegraf } from 'telegraf';
import rateLimit from 'telegraf-ratelimit';
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
import { handleSuspendUserRequest } from '#modules/telegram-bot/handlers/tenant/suspend-user.action';
import { handleDoSuspend } from '#modules/telegram-bot/handlers/tenant/do-suspend.action';
import { handleUnsuspendUserRequest } from '#modules/telegram-bot/handlers/tenant/unsuspend-user.action';
import { handleDoUnsuspend } from '#modules/telegram-bot/handlers/tenant/do-unsuspend.action';

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
    const rateLimitConfig = {
      window: 3000,
      limit: 2,
      onLimitExceeded: (ctx: any, next: () => Promise<void>) => {
        logger.warn(`Spam detected and dropped. Telegram ID: ${ctx.from?.id}`);
      },
      keyGenerator: (ctx: any) => {
        return ctx.from?.id?.toString() || 'unknown';
      }
    };

    this.bot.use(rateLimit(rateLimitConfig));
    this.bot.start(startCommand);
    this.bot.action('action_generate_license', handleGenerateLicense);
    this.bot.action(/^select_tenant_(.+)$/, handleSelectTenant);
    this.bot.action('action_manage_groups', handleManageGroupsRequest);
    this.bot.action('action_add_to_group', handleAddGroupRequest);
    this.bot.action('action_my_groups', handleMyGroupsRequest);
    this.bot.action('action_back_to_main', handleBackToMain);

    // ادمین‌ها
    this.bot.action(/^action_add_admin_(.+)$/, handleAddAdminRequest);
    this.bot.action(
      /^promote_sub_([a-f\d]{24})_(\d+)$/i,
      handlePromoteSubAdmin
    );
    this.bot.action(/^action_remove_admin_(.+)$/, handleRemoveAdminRequest);
    this.bot.action(/^demote_sub_([a-f\d]{24})_(\d+)$/i, handleDemoteSubAdmin);

    // تعلیق و رفع تعلیق
    this.bot.action(/^action_suspend_user_(.+)$/, handleSuspendUserRequest);
    this.bot.action(/^do_suspend_([a-f\d]{24})_(\d+)$/i, handleDoSuspend);
    this.bot.action(/^action_unsuspend_user_(.+)$/, handleUnsuspendUserRequest);
    this.bot.action(/^do_unsuspend_([a-f\d]{24})_(\d+)$/i, handleDoUnsuspend);

    this.bot.on('left_chat_member', handleLeaveGroup);
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
      logger.info('Telegram Bot successfully launched.');
    } catch (error) {
      logger.error('Failed to launch Telegram bot', error);
    }
  }

  public getBot(): Telegraf {
    return this.bot;
  }
}

export const botService = new BotService();
