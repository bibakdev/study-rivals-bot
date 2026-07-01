// apps/backend/src/modules/telegram-bot/handlers/challenge/notify-targets.util.ts

import { Context } from 'telegraf';
import mongoose from 'mongoose';
import { TargetModel } from '#modules/target/target.model';
import { UserModel } from '#modules/auth/user.model';
import { TenantMemberModel } from '#modules/tenant/tenant-member.model';
import { logger } from '#utils/logger';

/**
 * ماژول مستقل جهت ارسال پیام فراخوان چالش جدید و منشن کردن تمام کاربرانی که تارگت فعال دارند
 */
export const sendNewChallengeCall = async (
  ctx: Context,
  tenantId: mongoose.Types.ObjectId,
  chatId: number,
  topicId?: number | null
): Promise<void> => {
  try {
    // ۱. واکشی تمام تارگت‌های ثبت شده برای این گروه
    const targets = await TargetModel.find({ tenantId }).lean();

    if (targets.length === 0) {
      return; // اگر هیچ تارگتی وجود نداشت، نیازی به ارسال پیام نیست
    }

    const userIds = targets.map((t) => t.telegramId);

    // ۲. واکشی اطلاعات کاربران برای استخراج نام و نام مستعار
    const usersInfo = await UserModel.find({
      telegramId: { $in: userIds }
    }).lean();
    const tenantMembers = await TenantMemberModel.find({
      tenantId,
      telegramId: { $in: userIds }
    }).lean();

    // ۳. ساخت آرایه‌ای از منشن‌های متنی (Text Mentions)
    const mentions = targets.map((target) => {
      const user = usersInfo.find((u) => u.telegramId === target.telegramId);
      const membership = tenantMembers.find(
        (m) => m.telegramId === target.telegramId
      );

      // اولویت با نام مستعار است
      let name = 'کاربر';
      if (membership?.alias) {
        name = membership.alias;
      } else if (user) {
        name =
          `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`.trim();
      }

      // پاکسازی کاراکترهای مخرب که ممکن است فرمت Markdown تلگرام را بشکنند
      const safeName = name.replace(/\[|\]|\*|_|`/g, '').trim() || 'کاربر';

      // ساخت فرمت منشن متنی تلگرام
      return `[${safeName}](tg://user?id=${target.telegramId})`;
    });

    // اتصال منشن‌ها با ویرگول
    const mentionsText = mentions.join('، ');

    // ۴. ساخت متن نهایی دقیقاً مطابق درخواست
    const message = `🔔 فراخوان چالش جدید
خداقوت به همگی! چالش قبلی با موفقیت به پایان رسید. 🏁
برای شروع چالش جدید، لطفاً در صورت نیاز تارگت خود را ویرایش کنید.
همچنین اگر قصد شرکت در دوره جدید را ندارید، حتماً تارگت خود را حذف کنید تا در لیست تیم‌ها قرار نگیرید.

📣 ${mentionsText}`;

    const sendOptions: any = { parse_mode: 'Markdown' };
    if (topicId) {
      sendOptions.message_thread_id = topicId;
    }

    // ۵. ارسال پیام به گروه
    await ctx.telegram.sendMessage(chatId, message, sendOptions);
    logger.info(`Sent new challenge call with mentions to chat ${chatId}`);
  } catch (error) {
    logger.error('Error sending new challenge call with mentions:', error);
  }
};
