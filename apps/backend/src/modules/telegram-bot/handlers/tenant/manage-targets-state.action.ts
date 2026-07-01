// apps/backend/src/modules/telegram-bot/handlers/tenant/manage-targets-state.action.ts

import { Context, Markup } from 'telegraf';
import mongoose from 'mongoose';
import { BotStateModel } from '#modules/telegram-bot/models/bot-state.model';
import { TargetModel } from '#modules/target/target.model';
import { UserModel } from '#modules/auth/user.model';
import { TenantMemberModel } from '#modules/tenant/tenant-member.model';
import {
  parseTimeStringToMinutes,
  formatMinutesToTime
} from '#modules/time-log/utils/time-parser.util';
import { logger } from '#utils/logger';

export const handleEditUserTargetStateText = async (
  ctx: Context,
  telegramId: number,
  text: string
): Promise<boolean> => {
  try {
    const state = await BotStateModel.findOne({
      telegramId,
      action: 'EDIT_USER_TARGET'
    }).lean();

    if (!state) return false;

    const { tenantId, targetTelegramId } = state.payload as any;

    const minutesToLog = parseTimeStringToMinutes(text);
    if (minutesToLog === null || minutesToLog <= 0) {
      await ctx.reply(
        '❌ فرمت زمان نامعتبر است. لطفاً عدد خالص (به ساعت) یا فرمت ساعت:دقیقه (مثل 1:30) وارد کنید.'
      );
      return true; // پیام هندل شد
    }

    const MAX_MINUTES_PER_DAY = 20 * 60;
    if (minutesToLog > MAX_MINUTES_PER_DAY) {
      await ctx.reply(
        '❌ تارگت نمی‌تواند بیشتر از ۲۰ ساعت در روز باشد. لطفاً مقدار منطقی‌تری وارد کنید:'
      );
      return true;
    }

    // به‌روزرسانی تارگت در دیتابیس
    const target = await TargetModel.findOneAndUpdate(
      {
        tenantId: new mongoose.Types.ObjectId(tenantId),
        telegramId: targetTelegramId
      },
      { $set: { dailyMinutes: minutesToLog } },
      { new: true }
    );

    if (!target) {
      await ctx.reply('❌ خطایی رخ داد. تارگت این کاربر یافت نشد.');
      await BotStateModel.deleteOne({ telegramId });
      return true;
    }

    // خروج از وضعیت انتظار متن
    await BotStateModel.deleteOne({ telegramId });

    // واکشی اطلاعات برای پیام موفقیت
    const user = await UserModel.findOne({
      telegramId: targetTelegramId
    }).lean();
    const membership = await TenantMemberModel.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      telegramId: targetTelegramId
    }).lean();

    let displayName = 'کاربر';
    if (membership?.alias) {
      displayName = membership.alias;
    } else if (user) {
      displayName = `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`;
    }

    await ctx.reply(
      `✅ تارگت **${displayName}** با موفقیت به **${formatMinutesToTime(minutesToLog)}** تغییر یافت.\n\nاین تغییرات در دوره‌ی بعدی چالش (که پایه‌ریزی خواهید کرد) لحاظ خواهد شد.`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              Markup.button.callback(
                '🔙 بازگشت به جزئیات تارگت',
                `action_user_target_detail_${tenantId}_${targetTelegramId}`
              )
            ]
          ]
        }
      }
    );

    return true;
  } catch (error) {
    logger.error('Error handling edit user target state:', error);
    await ctx.reply('⚠️ خطایی در پردازش اطلاعات رخ داد. فرآیند لغو شد.');
    await BotStateModel.deleteOne({ telegramId }).catch(() => {});
    return true;
  }
};
