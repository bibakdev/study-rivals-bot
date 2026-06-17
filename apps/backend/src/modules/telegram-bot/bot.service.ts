// apps/backend/src/modules/telegram-bot/bot.service.ts

import { Telegraf } from 'telegraf';
import rateLimit from 'telegraf-ratelimit';
import { env } from '#core/config/env';
import { logger } from '#utils/logger';

// Router & Start
import { startCommand } from '#modules/telegram-bot/commands/start/start.router';
import { handleBotOnboardingText } from '#modules/telegram-bot/handlers/onboarding/onboarding.router';
import { handleGroupTenantMessages } from '#modules/telegram-bot/handlers/tenant/tenant.router';

// Mother
import { handleGenerateLicense } from '#modules/telegram-bot/handlers/mother/generate-license.action';

// Onboarding
import { handleAddGroupRequest } from '#modules/telegram-bot/handlers/onboarding/add-group.action';

// Tenant / Group management
import { handleSelectTenant } from '#modules/telegram-bot/handlers/tenant/select-tenant.action';
import { handleMyGroupsRequest } from '#modules/telegram-bot/handlers/tenant/my-groups.action';
import { handleManageGroupsRequest } from '#modules/telegram-bot/handlers/tenant/manage-groups.action';
import { handleBackToMain } from '#modules/telegram-bot/handlers/tenant/back-to-main.action';
import { handleLeaveGroup } from '#modules/telegram-bot/handlers/tenant/leave-group.action';

// Admin & Suspension
import { handleAddAdminRequest } from '#modules/telegram-bot/handlers/tenant/add-admin.action';
import { handlePromoteSubAdmin } from '#modules/telegram-bot/handlers/tenant/promote-admin.action';
import { handleRemoveAdminRequest } from '#modules/telegram-bot/handlers/tenant/remove-admin.action';
import { handleDemoteSubAdmin } from '#modules/telegram-bot/handlers/tenant/demote-admin.action';
import { handleSuspendUserRequest } from '#modules/telegram-bot/handlers/tenant/suspend-user.action';
import { handleDoSuspend } from '#modules/telegram-bot/handlers/tenant/do-suspend.action';
import { handleUnsuspendUserRequest } from '#modules/telegram-bot/handlers/tenant/unsuspend-user.action';
import { handleDoUnsuspend } from '#modules/telegram-bot/handlers/tenant/do-unsuspend.action';

// Target Handlers
import { handleSetTargetRequest } from '#modules/telegram-bot/handlers/target/set-target.action';
import { handleSelectChallengeRequest } from '#modules/telegram-bot/handlers/target/select-challenge.action';
import { handleDeleteTargetRequest } from '#modules/telegram-bot/handlers/target/delete-target.action';
import { handleEditTargetRequest } from '#modules/telegram-bot/handlers/target/edit-target.action';
import { handleCancelTargetRequest } from '#modules/telegram-bot/handlers/target/cancel-target.action';

// Challenge Handlers
import { handleChallengesMenu } from '#modules/telegram-bot/handlers/challenge/challenges-menu.action';
import { handleGroupChallengeMenu } from '#modules/telegram-bot/handlers/challenge/group-challenge-menu.action';
import { handleAddGroupChallengeRequest } from '#modules/telegram-bot/handlers/challenge/add-group-challenge.action';
import { handleCancelChallengeWizard } from '#modules/telegram-bot/handlers/challenge/cancel-challenge-wizard.action'; // 👈 اضافه شد

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
    this.bot.action(/^select_tenant_([a-f\d]{24})$/i, handleSelectTenant);
    this.bot.action('action_manage_groups', handleManageGroupsRequest);
    this.bot.action('action_add_to_group', handleAddGroupRequest);
    this.bot.action('action_my_groups', handleMyGroupsRequest);
    this.bot.action('action_back_to_main', handleBackToMain);

    // اکشن‌های مربوط به مدیریت تارگت
    this.bot.action(
      /^action_set_target_([a-f\d]{24})$/i,
      handleSetTargetRequest
    );
    this.bot.action(
      /^action_select_challenge_([a-f\d]{24})_(.+)$/i,
      handleSelectChallengeRequest
    );
    this.bot.action(
      /^action_delete_target_([a-f\d]{24})$/i,
      handleDeleteTargetRequest
    );
    this.bot.action(
      /^action_edit_target_([a-f\d]{24})$/i,
      handleEditTargetRequest
    );
    this.bot.action(
      /^action_cancel_target_([a-f\d]{24})$/i,
      handleCancelTargetRequest
    );

    // اکشن‌های مربوط به منوی چالش‌ها
    this.bot.action(/^action_challenges_([a-f\d]{24})$/i, handleChallengesMenu);
    this.bot.action(
      /^action_group_challenge_([a-f\d]{24})$/i,
      handleGroupChallengeMenu
    );
    this.bot.action(
      /^action_add_group_challenge_([a-f\d]{24})$/i,
      handleAddGroupChallengeRequest
    );

    // 👈 اضافه شدن مسیر دکمه لغو استیت ساخت چالش
    this.bot.action(
      /^cancel_add_challenge_([a-f\d]{24})$/i,
      handleCancelChallengeWizard
    );

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

    // هندلر خارج شدن کاربران
    this.bot.on('left_chat_member', handleLeaveGroup);

    // هندلر مرکزی پیام‌های متنی
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
