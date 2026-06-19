// apps/backend/src/modules/telegram-bot/handlers/challenge/delete-challenge.action.ts

import { Context, Markup } from 'telegraf';
import { ChallengeModel } from '#modules/challenge/challenge.model';
import { TimeLogModel } from '#modules/time-log/time-log.model';
import { logger } from '#utils/logger';

// ۱. مرحله اول: نمایش پیام تاییدیه (Prompt)
export const handleDeleteChallengePrompt = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const challengeId = ctx.match[1];
    await ctx.answerCbQuery().catch(() => {});

    const challenge = await ChallengeModel.findById(challengeId).lean();

    if (!challenge) {
      await ctx
        .editMessageText('❌ چالش مورد نظر یافت نشد یا قبلاً حذف شده است.', {
          reply_markup: {
            inline_keyboard: [
              [Markup.button.callback('🔙 بستن', 'action_manage_groups')]
            ]
          }
        })
        .catch(() => {});
      return;
    }

    // نمایش پیام هشدار و دکمه‌های تایید/انصراف
    await ctx
      .editMessageText(
        '⚠️ **تاییدیه حذف چالش**\n\nآیا از حذف کامل این چالش مطمئن هستید؟\n\nاین عمل غیرقابل بازگشت است و تمامی زمان‌های مطالعه ثبت‌شده در این چالش به همراه ساختار تیم‌ها از بین خواهند رفت.',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback(
                  '✅ بله، کاملاً مطمئنم',
                  `confirm_delete_challenge_${challengeId}`
                )
              ],
              [
                Markup.button.callback(
                  '❌ خیر، انصراف',
                  `view_challenge_${challengeId}` // بازگشت به صفحه جزئیات همان چالش
                )
              ]
            ]
          }
        }
      )
      .catch(() => {});
  } catch (error) {
    logger.error('Error in delete challenge prompt:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};

// ۲. مرحله دوم: انجام حذف واقعی پس از تایید
export const handleDoDeleteChallenge = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const challengeId = ctx.match[1];

    await ctx.answerCbQuery().catch(() => {});

    const challenge = await ChallengeModel.findById(challengeId).lean();

    if (!challenge) {
      await ctx
        .editMessageText('❌ چالش مورد نظر یافت نشد یا قبلاً حذف شده است.', {
          reply_markup: {
            inline_keyboard: [
              [Markup.button.callback('🔙 بستن', 'action_manage_groups')]
            ]
          }
        })
        .catch(() => {});
      return;
    }

    // حذف خود چالش
    await ChallengeModel.findByIdAndDelete(challengeId);

    // پاک کردن تایم‌های ثبت شده مربوط به این چالش جهت جلوگیری از انباشت دیتای یتیم
    await TimeLogModel.deleteMany({ challengeId: challenge._id }).catch(
      () => {}
    );

    // 👈 هدایت پویا به لیست مرتبط با وضعیت همان چالش (اجرا نشده / در حال اجرا / تکمیل شده)
    await ctx
      .editMessageText('✅ چالش با موفقیت حذف شد.', {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              Markup.button.callback(
                '🔙 بازگشت به لیست',
                `action_list_challenges_${challenge.tenantId.toString()}_${challenge.status}`
              )
            ]
          ]
        }
      })
      .catch((err) => {
        logger.warn(
          `Could not edit message in delete challenge: ${err.description}`
        );
      });

    logger.info(`Challenge ${challengeId} deleted successfully.`);
  } catch (error) {
    logger.error('Error handling delete challenge action:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی در حذف چالش رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};
