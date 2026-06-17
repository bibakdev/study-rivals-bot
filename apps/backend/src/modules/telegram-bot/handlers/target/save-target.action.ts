// apps/backend/src/modules/telegram-bot/handlers/target/save-target.action.ts

import { Context, Markup } from 'telegraf';
import mongoose from 'mongoose';
import { BotStateModel } from '#modules/telegram-bot/models/bot-state.model';
import { TargetModel } from '#modules/target/target.model';
import {
  parseTimeStringToMinutes,
  formatMinutesToTime
} from '#modules/time-log/utils/time-parser.util';
import { logger } from '#utils/logger';

export const handleSaveTargetText = async (
  ctx: Context,
  telegramId: number,
  text: string
): Promise<boolean> => {
  try {
    const state = await BotStateModel.findOne({
      telegramId,
      action: { $in: ['SET_TARGET', 'EDIT_TARGET'] }
    }).lean();

    if (!state) return false;

    const { tenantId } = state.payload as any;

    // پارس کردن زمان ارسالی با قابلیت تبدیل اعداد فارسی و فرمت‌های مختلف
    const dailyMinutes = parseTimeStringToMinutes(text);

    if (dailyMinutes === null || dailyMinutes <= 0) {
      await ctx.reply(
        '❌ فرمت وارد شده نامعتبر است. لطفاً عدد خالص (به ساعت) یا فرمت ساعت:دقیقه (مثل 8:30) وارد کنید.'
      );
      return true;
    }

    // سقف مجاز برای تارگت (مانند ثبت زمان)
    if (dailyMinutes > 20 * 60) {
      await ctx.reply(
        '❌ تارگت روزانه نمی‌تواند بیشتر از ۲۰ ساعت باشد. لطفاً مقدار کمتری وارد کنید:'
      );
      return true;
    }

    // ذخیره در دیتابیس
    await TargetModel.findOneAndUpdate(
      { tenantId: new mongoose.Types.ObjectId(tenantId), telegramId },
      { $set: { dailyMinutes } },
      { upsert: true, new: true }
    );

    await BotStateModel.deleteOne({ telegramId });

    const formattedTime = formatMinutesToTime(dailyMinutes);
    const actionType = state.action === 'SET_TARGET' ? 'ثبت' : 'ویرایش';

    await ctx.reply(
      `✅ تارگت شما با موفقیت روی **${formattedTime}** ${actionType} شد.`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              Markup.button.callback(
                '🔙 بازگشت به پنل',
                `select_tenant_${tenantId}`
              )
            ]
          ]
        }
      }
    );

    return true;
  } catch (error) {
    logger.error('Error handling target state text:', error);
    await ctx.reply('⚠️ خطایی رخ داد. فرآیند لغو شد.');
    await BotStateModel.deleteOne({ telegramId }).catch(() => {});
    return true;
  }
};
