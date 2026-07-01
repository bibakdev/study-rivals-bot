// apps/backend/src/modules/telegram-bot/handlers/tenant/manage-targets-detail.action.ts

import { Context, Markup } from 'telegraf';
import mongoose from 'mongoose';
import { TargetModel } from '#modules/target/target.model';
import { UserModel } from '#modules/auth/user.model';
import { TenantMemberModel } from '#modules/tenant/tenant-member.model';
import { BotStateModel } from '#modules/telegram-bot/models/bot-state.model'; // 👈 ایمپورت اضافه شد
import { formatMinutesToTime } from '#modules/time-log/utils/time-parser.util';
import { logger } from '#utils/logger';

// ۱. هندلر نمایش جزئیات تارگت یک کاربر خاص
export const handleUserTargetDetail = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const tenantId = ctx.match[1];
    const targetTelegramId = Number(ctx.match[2]);
    const promoterId = ctx.from?.id;

    await ctx.answerCbQuery().catch(() => {});

    if (!promoterId) return;

    // بررسی دسترسی (فقط مالک پلتفرم و مدیر اصلی مجاز هستند)
    const promoterUser = await UserModel.findOne({
      telegramId: promoterId
    }).lean();
    let isAuthorized = promoterUser?.role === 'mother';

    if (!isAuthorized) {
      const membership = await TenantMemberModel.findOne({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        telegramId: promoterId
      }).lean();
      isAuthorized = membership?.tenantRole === 'main_admin';
    }

    if (!isAuthorized) {
      await ctx
        .answerCbQuery('❌ شما دسترسی لازم برای این بخش را ندارید.', {
          show_alert: true
        })
        .catch(() => {});
      return;
    }

    // واکشی تارگت کاربر
    const target = await TargetModel.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      telegramId: targetTelegramId
    }).lean();

    if (!target) {
      await ctx
        .editMessageText('❌ تارگت این کاربر یافت نشد یا قبلاً حذف شده است.', {
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback(
                  '🔙 بازگشت به لیست',
                  `action_manage_users_targets_${tenantId}`
                )
              ]
            ]
          }
        })
        .catch(() => {});
      return;
    }

    // واکشی اطلاعات کاربر برای نمایش نام
    const user = await UserModel.findOne({
      telegramId: targetTelegramId
    }).lean();
    const membership = await TenantMemberModel.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      telegramId: targetTelegramId
    }).lean();

    let displayName = 'کاربر نامشخص';
    if (membership?.alias) {
      displayName = membership.alias;
    } else if (user) {
      displayName = `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`;
    }

    const inlineKeyboard = [
      [
        Markup.button.callback(
          '✏️ تغییر تارگت',
          `edit_tgt_prmpt_${tenantId}_${targetTelegramId}`
        )
      ],
      [
        Markup.button.callback(
          '🗑 حذف تارگت',
          `del_tgt_${tenantId}_${targetTelegramId}`
        )
      ],
      [
        Markup.button.callback(
          '🔙 بازگشت به لیست',
          `action_manage_users_targets_${tenantId}`
        )
      ]
    ];

    await ctx
      .editMessageText(
        `🎯 **جزئیات تارگت کاربر**\n\n` +
          `👤 **نام کاربر:** ${displayName}\n` +
          `⏱ **مقدار تارگت روزانه:** ${formatMinutesToTime(target.dailyMinutes)}\n\n` +
          `لطفاً عملیات مورد نظر را انتخاب کنید:`,
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: inlineKeyboard }
        }
      )
      .catch(() => {});
  } catch (error) {
    logger.error('Error handling user target detail:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};

// ۲. هندلر حذف قطعی تارگت کاربر
export const handleDeleteUserTarget = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const tenantId = ctx.match[1];
    const targetTelegramId = Number(ctx.match[2]);
    const promoterId = ctx.from?.id;

    await ctx.answerCbQuery().catch(() => {});

    if (!promoterId) return;

    // بررسی دسترسی مجدد برای امنیت
    const promoterUser = await UserModel.findOne({
      telegramId: promoterId
    }).lean();
    let isAuthorized = promoterUser?.role === 'mother';

    if (!isAuthorized) {
      const membership = await TenantMemberModel.findOne({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        telegramId: promoterId
      }).lean();
      isAuthorized = membership?.tenantRole === 'main_admin';
    }

    if (!isAuthorized) return;

    // حذف رکورد تارگت از دیتابیس
    await TargetModel.deleteOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      telegramId: targetTelegramId
    });

    await ctx
      .editMessageText(
        `✅ **تارگت با موفقیت حذف شد.**\n\nاین کاربر دیگر در چالش‌های بعدی که ایجاد می‌کنید، شرکت داده نخواهد شد (مگر اینکه مجدداً تارگت جدیدی ثبت کند).`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback(
                  '🔙 بازگشت به لیست',
                  `action_manage_users_targets_${tenantId}`
                )
              ]
            ]
          }
        }
      )
      .catch(() => {});

    logger.info(
      `Admin ${promoterId} deleted target for user ${targetTelegramId} in tenant ${tenantId}.`
    );
  } catch (error) {
    logger.error('Error handling delete user target:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی در حذف تارگت رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};

// ۳. هندلر پرامپت (رفتن به وضعیت انتظار متن) برای ویرایش تارگت
export const handleEditUserTargetPrompt = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const tenantId = ctx.match[1];
    const targetTelegramId = Number(ctx.match[2]);
    const promoterId = ctx.from?.id;

    await ctx.answerCbQuery().catch(() => {});
    if (!promoterId) return;

    // ثبت وضعیت در دیتابیس برای منتظر ماندن ورودی ادمین
    await BotStateModel.findOneAndUpdate(
      { telegramId: promoterId },
      {
        $set: {
          action: 'EDIT_USER_TARGET',
          payload: { tenantId, targetTelegramId }
        }
      },
      { upsert: true }
    );

    await ctx
      .editMessageText(
        '✏️ **ویرایش تارگت کاربر**\n\nلطفاً تارگت جدید را ارسال کنید.\nمی‌توانید مقدار را به صورت ساعت خالص (مثلاً `5`) یا ترکیب ساعت و دقیقه (مثلاً `4:30`) وارد نمایید:',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback(
                  '❌ انصراف',
                  `action_user_target_detail_${tenantId}_${targetTelegramId}`
                )
              ]
            ]
          }
        }
      )
      .catch(() => {});
  } catch (error) {
    logger.error('Error in edit user target prompt:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};
