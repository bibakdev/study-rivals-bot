// apps/backend/src/modules/telegram-bot/handlers/tenant/leave-group.action.ts

import { Context } from 'telegraf';
import { Update, Message } from 'telegraf/types';
import { TenantModel } from '#modules/tenant/tenant.model';
import { TenantMemberModel } from '#modules/tenant/tenant-member.model';
import { UserModel } from '#modules/auth/user.model';
import { logger } from '#utils/logger';

export const handleLeaveGroup = async (ctx: Context<Update>): Promise<void> => {
  try {
    // اطمینان از اینکه آپدیت مربوط به رویداد خروج کاربر است
    if (!ctx.message || !('left_chat_member' in ctx.message)) return;

    const leftMember = (ctx.message as Message.LeftChatMemberMessage)
      .left_chat_member;
    const telegramId = leftMember.id;
    const chatId = ctx.chat?.id;

    // اگر ربات خودمان از گروه اخراج شده باشد، سناریوی متفاوتی است که نادیده می‌گیریم
    if (leftMember.is_bot && leftMember.id === ctx.botInfo?.id) {
      return;
    }

    if (!chatId || !telegramId) return;

    // ۱. استثنای اکانت مادر: بررسی می‌کنیم که کاربر خارج‌شده اکانت مادر نباشد
    const user = await UserModel.findOne({ telegramId }).lean();
    if (user?.role === 'mother') {
      return; // اکانت مادر تحت هیچ شرایطی دسترسی پلتفرمی‌اش قطع نمی‌شود
    }

    // ۲. پیدا کردن شناسه اصلی گروه (Tenant) در سیستم ما بر اساس chatId تلگرام
    const tenant = await TenantModel.findOne({ chatId }).lean();
    if (!tenant) return; // این گروه اصلا در سیستم ما فعال نشده است

    // ۳. حذف کامل رکورد عضویت این کاربر خاص از این گروه خاص
    const deleteResult = await TenantMemberModel.deleteOne({
      telegramId,
      tenantId: tenant._id
    });

    if (deleteResult.deletedCount > 0) {
      logger.info(
        `Security: User ${telegramId} left chat ${chatId}. Removed from Tenant ${tenant._id}.`
      );
    }
  } catch (error) {
    logger.error('Error handling user leaving group:', error);
  }
};
