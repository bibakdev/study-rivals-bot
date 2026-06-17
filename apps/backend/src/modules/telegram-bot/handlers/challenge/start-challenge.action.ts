// apps/backend/src/modules/telegram-bot/handlers/challenge/start-challenge.action.ts

import { Context, Markup } from 'telegraf';
import { ChallengeModel } from '#modules/challenge/challenge.model';
import { logger } from '#utils/logger';

export const handleStartGroupChallengeRequest = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const challengeId = ctx.match[1];

    // بررسی وجود چالش مورد نظر
    const challenge = await ChallengeModel.findById(challengeId).lean();

    if (!challenge) {
      await ctx
        .answerCbQuery('❌ چالش مورد نظر یافت نشد.', { show_alert: true })
        .catch(() => {});
      await ctx
        .editMessageText('❌ چالش مورد نظر یافت نشد.', {
          reply_markup: {
            inline_keyboard: [
              [Markup.button.callback('🔙 بستن', 'action_manage_groups')]
            ]
          }
        })
        .catch(() => {});
      return;
    }

    // بررسی وضعیت فعلی چالش (باید در حالت اجرا نشده باشد)
    if (challenge.status !== 'pending') {
      await ctx
        .answerCbQuery('⚠️ این چالش قبلاً شروع شده یا به پایان رسیده است.', {
          show_alert: true
        })
        .catch(() => {});
      return;
    }

    // 👈 بررسی اینکه آیا هم‌اکنون چالش دیگری در این گروه در حال اجراست یا خیر
    const activeChallengeExists = await ChallengeModel.exists({
      tenantId: challenge.tenantId,
      status: 'active'
    });

    if (activeChallengeExists) {
      // نمایش الرت پاپ‌آپ تلگرام به کاربر و جلوگیری از شروع چالش جدید
      await ctx
        .answerCbQuery(
          '⚠️ یک چالش در حال اجرا است! لطفاً ابتدا چالش فعلی را تکمیل یا متوقف کنید.',
          {
            show_alert: true
          }
        )
        .catch(() => {});
      return;
    }

    // بستن لودینگ دکمه با پیام موفقیت اولیه
    await ctx.answerCbQuery('✅ چالش با موفقیت شروع شد!').catch(() => {});

    // به‌روزرسانی وضعیت چالش به حالت فعال
    await ChallengeModel.findByIdAndUpdate(challengeId, {
      $set: { status: 'active' }
    });

    // نمایش پیام موفقیت‌آمیز بودن شروع چالش و دکمه رفتن به لیست در حال اجرا
    await ctx
      .editMessageText(
        '▶️ **چالش با موفقیت آغاز شد!**\n\nهم‌اکنون این چالش در دسته‌بندی «در حال اجرا» قرار دارد.',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback(
                  '🔙 مشاهده چالش‌های در حال اجرا',
                  `action_list_challenges_${challenge.tenantId.toString()}_active`
                )
              ]
            ]
          }
        }
      )
      .catch((err) => {
        logger.warn(
          `Could not edit message in start challenge: ${err.description}`
        );
      });

    logger.info(`Challenge ${challengeId} started successfully.`);
  } catch (error) {
    logger.error('Error handling start challenge action:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};
