// apps/backend/src/modules/telegram-bot/handlers/tenant/alias-state.action.ts

import { Context, Markup } from 'telegraf';
import mongoose from 'mongoose';
import { BotStateModel } from '#modules/telegram-bot/models/bot-state.model';
import { TenantMemberModel } from '#modules/tenant/tenant-member.model';
import { UserModel } from '#modules/auth/user.model';
import { logger } from '#utils/logger';

export const handleAliasStateText = async (
  ctx: Context,
  telegramId: number,
  text: string
): Promise<boolean> => {
  try {
    // ۱. بررسی اینکه آیا کاربر در وضعیت ثبت نام مستعار قرار دارد یا خیر
    const state = await BotStateModel.findOne({
      telegramId,
      action: 'SET_ALIAS'
    }).lean();

    if (!state) return false;

    const { tenantId, targetTelegramId } = state.payload as {
      tenantId: string;
      targetTelegramId: number;
    };

    const trimmedAlias = text.trim();

    if (trimmedAlias.length < 2) {
      await ctx.reply(
        '❌ نام مستعار باید حداقل ۲ کاراکتر باشد. لطفاً دوباره ارسال کنید:'
      );
      return true; // مدیریت شد
    }

    // ۲. به‌روزرسانی رکورد با نام مستعار جدید (در صورت عدم وجود، برای اکانت‌های مادر می‌سازد)
    await TenantMemberModel.findOneAndUpdate(
      {
        tenantId: new mongoose.Types.ObjectId(tenantId),
        telegramId: targetTelegramId
      },
      {
        $set: { alias: trimmedAlias },
        $setOnInsert: { tenantRole: 'user', isSuspended: false } // در صورت نیاز به ساخت اولیه اکانت مادر در این گروه
      },
      { upsert: true }
    );

    // ۳. خروج از وضعیت (State)
    await BotStateModel.deleteOne({ telegramId });

    // ۴. استخراج نام اصلی برای ساخت پیام تایید
    const targetUser = await UserModel.findOne({
      telegramId: targetTelegramId
    }).lean();
    const realName = targetUser
      ? targetUser.firstName +
        (targetUser.lastName ? ` ${targetUser.lastName}` : '')
      : 'کاربر';

    // ۵. ارسال پیام موفقیت‌آمیز به همراه دکمه بازگشت
    await ctx.reply(
      `✅ نام مستعار **${trimmedAlias}** با موفقیت برای کاربر **${realName}** ثبت شد.\nاز این پس در تمامی رتبه‌بندی‌ها و گزارش‌های این گروه، نام این شخص به این شکل نمایش داده خواهد شد.`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              Markup.button.callback(
                '🔙 بازگشت به پنل نام مستعار',
                `action_set_alias_prompt_${tenantId}_${targetTelegramId}`
              )
            ]
          ]
        }
      }
    );

    return true; // یعنی این متن پردازش و هضم شد
  } catch (error) {
    logger.error('Error handling alias state input:', error);
    await ctx.reply('⚠️ خطایی در پردازش اطلاعات رخ داد. فرآیند لغو شد.');
    await BotStateModel.deleteOne({ telegramId }).catch(() => {});
    return true;
  }
};
