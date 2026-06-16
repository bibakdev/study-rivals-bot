// apps/backend/src/modules/telegram-bot/handlers/tenant/manage-groups.action.ts

import { Context } from 'telegraf';
import { logger } from '#utils/logger';
import { getManageGroupsSubMenu } from '#modules/telegram-bot/utils/keyboards.util';

export const handleManageGroupsRequest = async (
  ctx: Context
): Promise<void> => {
  try {
    // نادیده گرفتن ارور تایم‌اوت تلگرام در صورت کلیک دیرهنگام
    await ctx.answerCbQuery().catch((err) => {
      logger.warn(
        `Ignored answerCbQuery error in manage-groups: ${err.description}`
      );
    });

    // ویرایش پیام فعلی و نمایش زیرمنو
    await ctx.editMessageText(
      '⚙️ **بخش مدیریت گروه‌ها**\n\nلطفاً یکی از گزینه‌های زیر را انتخاب کنید:',
      {
        parse_mode: 'Markdown',
        reply_markup: getManageGroupsSubMenu()
      }
    );
  } catch (error) {
    logger.error('Error handling manage groups action:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};
