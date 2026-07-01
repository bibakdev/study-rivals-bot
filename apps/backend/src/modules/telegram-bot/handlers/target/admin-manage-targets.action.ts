// apps/backend/src/modules/telegram-bot/handlers/target/admin-manage-targets.action.ts

import { Context, Markup } from 'telegraf';
import mongoose from 'mongoose';
import { TargetModel } from '#modules/target/target.model';
import { UserModel } from '#modules/auth/user.model';
import { TenantMemberModel } from '#modules/tenant/tenant-member.model';
import { BotStateModel } from '#modules/telegram-bot/models/bot-state.model';
import {
  formatMinutesToTime,
  parseTimeStringToMinutes
} from '#modules/time-log/utils/time-parser.util';
import { logger } from '#utils/logger';

// ۱. نمایش لیست تمام کاربرانی که تارگت ثبت کرده‌اند
export const handleAdminTargetsList = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const tenantId = ctx.match[1];
    await ctx.answerCbQuery().catch(() => {});

    const targets = await TargetModel.find({
      tenantId: new mongoose.Types.ObjectId(tenantId)
    }).lean();

    if (targets.length === 0) {
      await ctx
        .editMessageText(
          '🎯 **لیست تارگت‌ها خالی است**\n\nدر حال حاضر هیچ کاربری در این گروه تارگت مطالعاتی ثبت نکرده است.',
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  Markup.button.callback(
                    '🔙 بازگشت به پنل گروه',
                    `select_tenant_${tenantId}`
                  )
                ]
              ]
            }
          }
        )
        .catch(() => {});
      return;
    }

    const userIds = targets.map((t) => t.telegramId);

    const usersInfo = await UserModel.find({
      telegramId: { $in: userIds }
    }).lean();

    const tenantMembers = await TenantMemberModel.find({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      telegramId: { $in: userIds }
    }).lean();

    const inlineKeyboard = targets.map((target) => {
      const user = usersInfo.find((u) => u.telegramId === target.telegramId);
      const membership = tenantMembers.find(
        (m) => m.telegramId === target.telegramId
      );

      let name = 'کاربر';
      if (membership?.alias) {
        name = membership.alias;
      } else if (user) {
        name = `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`;
      }

      const formattedTarget = formatMinutesToTime(target.dailyMinutes);

      return [
        Markup.button.callback(
          `👤 ${name} - 🎯 ${formattedTarget}`,
          `admin_target_menu_${tenantId}_${target.telegramId}`
        )
      ];
    });

    inlineKeyboard.push([
      Markup.button.callback(
        '🔙 بازگشت به پنل گروه',
        `select_tenant_${tenantId}`
      )
    ]);

    await ctx
      .editMessageText(
        '🎯 **مدیریت تارگت کاربران**\n\nلطفاً کاربری که قصد مدیریت تارگت او را دارید از لیست زیر انتخاب کنید:',
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: inlineKeyboard }
        }
      )
      .catch(() => {});
  } catch (error) {
    logger.error('Error in handleAdminTargetsList:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};

// ۲. نمایش منوی اختصاصی مدیریت تارگت برای یک کاربر خاص
export const handleAdminTargetMenu = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const tenantId = ctx.match[1];
    const targetTelegramId = Number(ctx.match[2]);

    await ctx.answerCbQuery().catch(() => {});

    const target = await TargetModel.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      telegramId: targetTelegramId
    }).lean();

    if (!target) {
      await ctx
        .editMessageText(
          '❌ تارگت این کاربر یافت نشد (ممکن است توسط خودش حذف شده باشد).',
          {
            reply_markup: {
              inline_keyboard: [
                [
                  Markup.button.callback(
                    '🔙 بازگشت به لیست',
                    `admin_targets_list_${tenantId}`
                  )
                ]
              ]
            }
          }
        )
        .catch(() => {});
      return;
    }

    const user = await UserModel.findOne({
      telegramId: targetTelegramId
    }).lean();
    const membership = await TenantMemberModel.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      telegramId: targetTelegramId
    }).lean();

    let name = 'کاربر';
    if (membership?.alias) {
      name = membership.alias;
    } else if (user) {
      name = `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`;
    }

    const formattedTarget = formatMinutesToTime(target.dailyMinutes);

    const inlineKeyboard = [
      [
        Markup.button.callback(
          '✏️ ویرایش تارگت',
          `admin_edit_target_prompt_${tenantId}_${targetTelegramId}`
        )
      ],
      [
        Markup.button.callback(
          '🗑 حذف تارگت',
          `admin_delete_target_${tenantId}_${targetTelegramId}`
        )
      ],
      [
        Markup.button.callback(
          '🔙 بازگشت به لیست تارگت‌ها',
          `admin_targets_list_${tenantId}`
        )
      ]
    ];

    await ctx
      .editMessageText(
        `⚙️ **مدیریت تارگت کاربر**\n\n` +
          `👤 **نام کاربر:** ${name}\n` +
          `🎯 **تارگت فعلی:** ${formattedTarget}\n\n` +
          `لطفاً عملیات مورد نظر را انتخاب کنید:`,
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: inlineKeyboard }
        }
      )
      .catch(() => {});
  } catch (error) {
    logger.error('Error in handleAdminTargetMenu:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};

// ۳. حذف تارگت
export const handleAdminDeleteTarget = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const tenantId = ctx.match[1];
    const targetTelegramId = Number(ctx.match[2]);

    await ctx.answerCbQuery().catch(() => {});

    const result = await TargetModel.deleteOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      telegramId: targetTelegramId
    });

    if (result.deletedCount === 0) {
      await ctx
        .editMessageText('❌ تارگت یافت نشد یا قبلاً حذف شده است.', {
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback(
                  '🔙 بازگشت به لیست',
                  `admin_targets_list_${tenantId}`
                )
              ]
            ]
          }
        })
        .catch(() => {});
      return;
    }

    await ctx
      .editMessageText(
        '✅ **تارگت کاربر با موفقیت حذف شد.**\n\nاین تغییر تاثیری روی چالش‌های در حال اجرا ندارد و فقط از ورود این کاربر به چالش‌های آینده جلوگیری می‌کند.',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback(
                  '🔙 بازگشت به لیست تارگت‌ها',
                  `admin_targets_list_${tenantId}`
                )
              ]
            ]
          }
        }
      )
      .catch(() => {});
  } catch (error) {
    logger.error('Error in handleAdminDeleteTarget:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی در حذف تارگت رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};

// ۴. ورود به وضعیت ویرایش تارگت
export const handleAdminEditTargetPrompt = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const tenantId = ctx.match[1];
    const targetTelegramId = Number(ctx.match[2]);
    const adminId = ctx.from?.id;

    await ctx.answerCbQuery().catch(() => {});
    if (!adminId) return;

    // ثبت وضعیت در دیتابیس برای منتظر ماندن عدد تارگت
    await BotStateModel.findOneAndUpdate(
      { telegramId: adminId },
      {
        $set: {
          action: 'ADMIN_EDIT_TARGET',
          payload: { tenantId, targetTelegramId }
        }
      },
      { upsert: true }
    );

    await ctx
      .editMessageText(
        '✏️ **ویرایش تارگت کاربر**\n\nلطفاً مقدار تارگت جدید را ارسال کنید.\n(مثلاً `2:30` برای دو و نیم ساعت یا `150` برای ۱۵۰ دقیقه):',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback(
                  '❌ انصراف',
                  `admin_target_menu_${tenantId}_${targetTelegramId}`
                )
              ]
            ]
          }
        }
      )
      .catch(() => {});
  } catch (error) {
    logger.error('Error in handleAdminEditTargetPrompt:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد.', { show_alert: true })
      .catch(() => {});
  }
};

// ۵. پردازش متن ورودی برای ویرایش تارگت
export const handleAdminTargetStateText = async (
  ctx: Context,
  telegramId: number,
  text: string
): Promise<boolean> => {
  try {
    const state = await BotStateModel.findOne({
      telegramId,
      action: 'ADMIN_EDIT_TARGET'
    }).lean();

    if (!state) return false;

    const { tenantId, targetTelegramId } = state.payload as any;

    const minutes = parseTimeStringToMinutes(text);
    if (minutes === null || minutes <= 0) {
      await ctx.reply(
        '❌ فرمت زمان نامعتبر است. لطفاً مجدداً ارسال کنید (مثلاً 2:30 یا 150):'
      );
      return true;
    }

    const MAX_TARGET_MINUTES = 24 * 60;
    if (minutes > MAX_TARGET_MINUTES) {
      await ctx.reply(
        '❌ تارگت نمی‌تواند بیشتر از ۲۴ ساعت باشد. لطفاً مقدار کمتری وارد کنید:'
      );
      return true;
    }

    // به‌روزرسانی تارگت در دیتابیس
    await TargetModel.findOneAndUpdate(
      {
        tenantId: new mongoose.Types.ObjectId(tenantId),
        telegramId: targetTelegramId
      },
      { $set: { dailyMinutes: minutes } }
    );

    // خروج از وضعیت
    await BotStateModel.deleteOne({ telegramId });

    // واکشی نام کاربر برای پیام موفقیت
    const user = await UserModel.findOne({
      telegramId: targetTelegramId
    }).lean();
    const membership = await TenantMemberModel.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      telegramId: targetTelegramId
    }).lean();

    let name = 'کاربر';
    if (membership?.alias) {
      name = membership.alias;
    } else if (user) {
      name = `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`;
    }

    await ctx.reply(
      `✅ **تارگت با موفقیت ویرایش شد.**\n\nتارگت جدید کاربر **${name}** به **${formatMinutesToTime(minutes)}** تغییر یافت.\n\n(این تغییر فقط در چالش‌های آینده اعمال خواهد شد)`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              Markup.button.callback(
                '🔙 بازگشت به منوی کاربر',
                `admin_target_menu_${tenantId}_${targetTelegramId}`
              )
            ]
          ]
        }
      }
    );

    return true;
  } catch (error) {
    logger.error('Error in handleAdminTargetStateText:', error);
    await ctx.reply('⚠️ خطایی در پردازش اطلاعات رخ داد. فرآیند لغو شد.');
    await BotStateModel.deleteOne({ telegramId }).catch(() => {});
    return true;
  }
};
