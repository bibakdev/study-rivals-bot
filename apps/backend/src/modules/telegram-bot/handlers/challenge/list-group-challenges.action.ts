// apps/backend/src/modules/telegram-bot/handlers/challenge/list-group-challenges.action.ts

import { Context, Markup } from 'telegraf';
import mongoose from 'mongoose';
import { ChallengeModel } from '#modules/challenge/challenge.model';
import { logger } from '#utils/logger';

const statusMap: Record<'pending' | 'active' | 'completed', string> = {
  pending: 'اجرا نشده',
  active: 'در حال اجرا',
  completed: 'تکمیل شده'
};

export const handleListGroupChallengesRequest = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const tenantId = ctx.match[1];
    const status = ctx.match[2] as 'pending' | 'active' | 'completed';

    await ctx.answerCbQuery().catch(() => {});

    // واکشی چالش‌ها بر اساس شناسه گروه، نوع گروهی و وضعیت انتخاب شده
    const challenges = await ChallengeModel.find({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      type: 'group',
      status
    })
      .sort({ createdAt: -1 })
      .lean();

    const inlineKeyboard = [];

    // ساخت دکمه برای هر چالش (در صورت وجود)
    if (challenges.length > 0) {
      challenges.forEach((ch) => {
        inlineKeyboard.push([
          Markup.button.callback(
            `🏆 چالش ${ch.startDateText} (${ch.durationDays} روز)`,
            `view_challenge_${ch._id}` // اکشن نمایش جزئیات (برای توسعه‌های بعدی)
          )
        ]);
      });
    }

    inlineKeyboard.push([
      Markup.button.callback(
        '🔙 بازگشت',
        `action_manage_group_challenges_${tenantId}`
      )
    ]);

    const persianStatus = statusMap[status];
    const message =
      challenges.length > 0
        ? `📋 **لیست چالش‌های گروهی (${persianStatus})**\n\nبرای مشاهده جزئیات روی چالش مورد نظر کلیک کنید:`
        : `📋 **لیست چالش‌های گروهی (${persianStatus})**\n\nهیچ چالشی در این دسته‌بندی یافت نشد.`;

    await ctx
      .editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: inlineKeyboard }
      })
      .catch((err) => {
        if (!err.description?.includes('message is not modified')) {
          logger.warn(
            `Could not edit message in list group challenges: ${err.description}`
          );
        }
      });
  } catch (error) {
    logger.error('Error handling list group challenges action:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};
