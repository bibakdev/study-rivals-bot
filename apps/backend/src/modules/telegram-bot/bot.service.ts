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

// Admin & Suspension & Alias
import { handleAddAdminRequest } from '#modules/telegram-bot/handlers/tenant/add-admin.action';
import { handlePromoteSubAdmin } from '#modules/telegram-bot/handlers/tenant/promote-admin.action';
import { handleRemoveAdminRequest } from '#modules/telegram-bot/handlers/tenant/remove-admin.action';
import { handleDemoteSubAdmin } from '#modules/telegram-bot/handlers/tenant/demote-admin.action';
import { handleSuspendUserRequest } from '#modules/telegram-bot/handlers/tenant/suspend-user.action';
import { handleDoSuspend } from '#modules/telegram-bot/handlers/tenant/do-suspend.action';
import { handleUnsuspendUserRequest } from '#modules/telegram-bot/handlers/tenant/unsuspend-user.action';
import { handleDoUnsuspend } from '#modules/telegram-bot/handlers/tenant/do-unsuspend.action';
import { handleAliasMenuRequest } from '#modules/telegram-bot/handlers/tenant/alias-menu.action';
import {
  handleAliasUserSelect,
  handleAliasEnterPrompt,
  handleAliasDelete
} from '#modules/telegram-bot/handlers/tenant/alias-manage.action';

// مدیریت تارگت‌ها توسط ادمین
import { handleManageUsersTargetsMenu } from '#modules/telegram-bot/handlers/tenant/manage-targets-menu.action';
import {
  handleUserTargetDetail,
  handleDeleteUserTarget,
  handleEditUserTargetPrompt // 👈 ایمپورت اضافه شد
} from '#modules/telegram-bot/handlers/tenant/manage-targets-detail.action';

// Target Handlers
import { handleSetTargetRequest } from '#modules/telegram-bot/handlers/target/set-target.action';
import { handleSelectChallengeRequest } from '#modules/telegram-bot/handlers/target/select-challenge.action';
import { handleDeleteTargetRequest } from '#modules/telegram-bot/handlers/target/delete-target.action';
import { handleEditTargetRequest } from '#modules/telegram-bot/handlers/target/edit-target.action';
import { handleCancelTargetRequest } from '#modules/telegram-bot/handlers/target/cancel-target.action';

// Time Log Handlers
import { handleLogTimeMenuRequest } from '#modules/telegram-bot/handlers/time-log/log-time-menu.action';
import { handleSelectDayAction } from '#modules/telegram-bot/handlers/time-log/select-day.action';
import { handlePromptTimeAction } from '#modules/telegram-bot/handlers/time-log/prompt-time.action';

// Challenge Handlers
import { handleChallengesMenu } from '#modules/telegram-bot/handlers/challenge/challenges-menu.action';
import { handleGroupChallengeMenu } from '#modules/telegram-bot/handlers/challenge/group-challenge-menu.action';
import { handleAddGroupChallengeRequest } from '#modules/telegram-bot/handlers/challenge/add-group-challenge.action';
import { handleCancelChallengeWizard } from '#modules/telegram-bot/handlers/challenge/cancel-challenge-wizard.action';
import { handleManageGroupChallengesRequest } from '#modules/telegram-bot/handlers/challenge/manage-group-challenges.action';
import { handleListGroupChallengesRequest } from '#modules/telegram-bot/handlers/challenge/list-group-challenges.action';
import { handleViewChallengeRequest } from '#modules/telegram-bot/handlers/challenge/view-challenge.action';
import {
  handleDeleteChallengePrompt,
  handleDoDeleteChallenge
} from '#modules/telegram-bot/handlers/challenge/delete-challenge.action';
import { handleStartGroupChallengeRequest } from '#modules/telegram-bot/handlers/challenge/start-challenge.action';
import { handleEditChallengeRequest } from '#modules/telegram-bot/handlers/challenge/edit-challenge.action';
import { handleEditTeamRequest } from '#modules/telegram-bot/handlers/challenge/edit-team.action';
import { handleChangeTeamNameRequest } from '#modules/telegram-bot/handlers/challenge/change-team-name.action';
import { handleCancelEditTeamName } from '#modules/telegram-bot/handlers/challenge/cancel-edit-team-name.action';
import { handleChangeTeamMembersRequest } from '#modules/telegram-bot/handlers/challenge/change-team-members.action';
import {
  handleRemoveMemberMenu,
  handleDoRemoveMember
} from '#modules/telegram-bot/handlers/challenge/remove-team-member.action';
import {
  handleAddMemberMenu,
  handleDoAddMember
} from '#modules/telegram-bot/handlers/challenge/add-team-member.action';
import { handleSendTeamsToGroupRequest } from '#modules/telegram-bot/handlers/challenge/send-teams.action';
import {
  handleEndChallengePrompt,
  handleDoEndChallenge
} from '#modules/telegram-bot/handlers/challenge/end-challenge.action';
import { handleSendLeaderboardRequest } from '#modules/telegram-bot/handlers/challenge/send-leaderboard.action';

import {
  handleViewLoggedTimesRequest,
  handleViewUserLogsRequest
} from '#modules/telegram-bot/handlers/challenge/view-logged-times.action';

// رتبه‌بندی روزانه
import {
  handleDailyLeaderboardMenuRequest,
  handleDailyLeaderboardDayRequest
} from '#modules/telegram-bot/handlers/challenge/daily-leaderboard.action';

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

    // اکشن‌های مربوط به منوی ثبت ساعت
    this.bot.action(
      /^action_log_time_([a-f\d]{24})$/i,
      handleLogTimeMenuRequest
    );
    this.bot.action(
      /^action_log_time_day_([a-f\d]{24})_(\d+)$/i,
      handleSelectDayAction
    );
    this.bot.action(
      /^prompt_time_(add|edit)_([a-f\d]{24})_(\d+)$/i,
      handlePromptTimeAction
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
    this.bot.action(
      /^cancel_add_challenge_([a-f\d]{24})$/i,
      handleCancelChallengeWizard
    );

    // مدیریت وضعیت چالش‌ها
    this.bot.action(
      /^action_manage_group_challenges_([a-f\d]{24})$/i,
      handleManageGroupChallengesRequest
    );
    this.bot.action(
      /^action_list_challenges_([a-f\d]{24})_(pending|active|completed)$/i,
      handleListGroupChallengesRequest
    );
    this.bot.action(
      /^view_challenge_([a-f\d]{24})$/i,
      handleViewChallengeRequest
    );
    this.bot.action(
      /^send_teams_([a-f\d]{24})$/i,
      handleSendTeamsToGroupRequest
    );

    // اکشن‌های چالش در حال اجرا
    this.bot.action(/^end_challenge_([a-f\d]{24})$/i, handleEndChallengePrompt);
    this.bot.action(
      /^confirm_end_challenge_([a-f\d]{24})$/i,
      handleDoEndChallenge
    );
    this.bot.action(
      /^send_leaderboard_([a-f\d]{24})$/i,
      handleSendLeaderboardRequest
    );
    this.bot.action(
      /^view_logged_times_([a-f\d]{24})$/i,
      handleViewLoggedTimesRequest
    );
    this.bot.action(
      /^view_user_logs_([a-f\d]{24})_(\d+)$/i,
      handleViewUserLogsRequest
    );

    // رتبه‌بندی روزانه
    this.bot.action(
      /^daily_leaderboard_menu_([a-f\d]{24})$/i,
      handleDailyLeaderboardMenuRequest
    );
    this.bot.action(
      /^daily_leaderboard_day_([a-f\d]{24})_(\d+)$/i,
      handleDailyLeaderboardDayRequest
    );

    // دکمه‌های مربوط به حذف چالش
    this.bot.action(
      /^delete_challenge_([a-f\d]{24})$/i,
      handleDeleteChallengePrompt
    );
    this.bot.action(
      /^confirm_delete_challenge_([a-f\d]{24})$/i,
      handleDoDeleteChallenge
    );

    this.bot.action(
      /^start_challenge_([a-f\d]{24})$/i,
      handleStartGroupChallengeRequest
    );
    this.bot.action(
      /^edit_challenge_([a-f\d]{24})$/i,
      handleEditChallengeRequest
    );
    this.bot.action(/^edit_team_([a-f\d]{24})_(\d+)$/i, handleEditTeamRequest);

    // ویرایش نام تیم
    this.bot.action(
      /^change_team_name_([a-f\d]{24})_(\d+)$/i,
      handleChangeTeamNameRequest
    );
    this.bot.action(
      /^cancel_edit_team_name_([a-f\d]{24})_(\d+)$/i,
      handleCancelEditTeamName
    );

    // ویرایش اعضای تیم
    this.bot.action(
      /^change_team_members_([a-f\d]{24})_(\d+)$/i,
      handleChangeTeamMembersRequest
    );
    this.bot.action(
      /^remove_member_menu_([a-f\d]{24})_(\d+)$/i,
      handleRemoveMemberMenu
    );
    this.bot.action(
      /^do_remove_member_([a-f\d]{24})_(\d+)_(\d+)$/i,
      handleDoRemoveMember
    );
    this.bot.action(
      /^add_member_menu_([a-f\d]{24})_(\d+)$/i,
      handleAddMemberMenu
    );
    this.bot.action(
      /^do_add_member_([a-f\d]{24})_(\d+)_(\d+)$/i,
      handleDoAddMember
    );

    // ادمین‌ها و نام مستعار
    this.bot.action(/^action_add_admin_(.+)$/, handleAddAdminRequest);
    this.bot.action(
      /^promote_sub_([a-f\d]{24})_(\d+)$/i,
      handlePromoteSubAdmin
    );
    this.bot.action(/^action_remove_admin_(.+)$/, handleRemoveAdminRequest);
    this.bot.action(/^demote_sub_([a-f\d]{24})_(\d+)$/i, handleDemoteSubAdmin);
    this.bot.action(/^action_suspend_user_(.+)$/, handleSuspendUserRequest);
    this.bot.action(/^do_suspend_([a-f\d]{24})_(\d+)$/i, handleDoSuspend);
    this.bot.action(/^action_unsuspend_user_(.+)$/, handleUnsuspendUserRequest);
    this.bot.action(/^do_unsuspend_([a-f\d]{24})_(\d+)$/i, handleDoUnsuspend);
    this.bot.action(
      /^action_alias_menu_([a-f\d]{24})$/i,
      handleAliasMenuRequest
    );
    this.bot.action(
      /^action_set_alias_prompt_([a-f\d]{24})_(\d+)$/i,
      handleAliasUserSelect
    );
    this.bot.action(
      /^action_enter_alias_([a-f\d]{24})_(\d+)$/i,
      handleAliasEnterPrompt
    );
    this.bot.action(
      /^action_delete_alias_([a-f\d]{24})_(\d+)$/i,
      handleAliasDelete
    );

    // منوی مدیریت تارگت‌ها توسط ادمین
    this.bot.action(
      /^action_manage_users_targets_([a-f\d]{24})$/i,
      handleManageUsersTargetsMenu
    );

    this.bot.action(
      /^action_user_target_detail_([a-f\d]{24})_(\d+)$/i,
      handleUserTargetDetail
    );
    this.bot.action(
      /^action_delete_user_target_([a-f\d]{24})_(\d+)$/i,
      handleDeleteUserTarget
    );

    // 👈 اضافه شدن اکشن دریافت پرامپت ویرایش تارگت
    this.bot.action(
      /^action_edit_user_target_prompt_([a-f\d]{24})_(\d+)$/i,
      handleEditUserTargetPrompt
    );

    // هندلر خارج شدن کاربران
    this.bot.on('left_chat_member', handleLeaveGroup);

    // هندلر مرکزی پیام‌های متنی
    this.bot.on('text', async (ctx, next) => {
      const chatType = ctx.chat?.type;
      if (chatType === 'private') {
        await handleBotOnboardingText(ctx);
        return next();
      } else if (chatType === 'group' || chatType === 'supergroup') {
        return handleGroupTenantMessages(ctx, next);
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
