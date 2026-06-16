// apps/backend/src/modules/telegram-bot/handlers/tenant/select-tenant.action.ts

import { Context } from 'telegraf';
import mongoose from 'mongoose';
import { env } from '#core/config/env';
import { UserModel } from '#modules/auth/user.model';
import { TenantMemberModel } from '#modules/tenant/tenant-member.model';
import { logger } from '#utils/logger';

export const handleSelectTenant = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const tenantId = ctx.match[1];
    const telegramId = ctx.from?.id;

    if (!tenantId || !telegramId) {
      await ctx
        .answerCbQuery('❌ خطایی در تشخیص گروه یا کاربر رخ داد.', {
          show_alert: true
        })
        .catch(() => {});
      return;
    }

    // ۱. پیدا کردن نقش دقیق کاربر در این گروه خاص
    let persianRole = 'کاربر عادی';
    let systemRole = 'user';
    const user = await UserModel.findOne({ telegramId }).lean();

    if (user?.role === 'mother') {
      persianRole = '👑 مالک کل پلتفرم (اکانت مادر)';
      systemRole = 'mother';
    } else {
      const membership = await TenantMemberModel.findOne({
        telegramId,
        tenantId: new mongoose.Types.ObjectId(tenantId)
      }).lean();

      if (membership) {
        systemRole = membership.tenantRole;
        switch (membership.tenantRole) {
          case 'main_admin':
            persianRole = 'مدیر اصلی (Main Admin)';
            break;
          case 'sub_admin':
            persianRole = 'مدیر فرعی (Sub Admin)';
            break;
          case 'user':
            persianRole = 'کاربر عادی';
            break;
        }
      } else {
        persianRole = 'بدون دسترسی (نامشخص)';
        systemRole = 'none';
      }
    }

    // ۲. اضافه کردن پارامتر به URL مینی‌اپ
    const miniAppUrl = new URL(env.MINI_APP_URL);
    miniAppUrl.searchParams.set('tenantId', tenantId);
    const finalUrl = miniAppUrl.toString();

    // ۳. تغییر دکمه اصلی ربات برای این کاربر خاص
    await ctx.setChatMenuButton({
      type: 'web_app',
      text: 'Open',
      web_app: { url: finalUrl }
    });

    // ۴. بستن حالت لودینگ دکمه شیشه‌ای
    await ctx.answerCbQuery('✅ گروه انتخاب شد!').catch(() => {});

    // ۵. ساخت کیبورد شیشه‌ای به صورت داینامیک بر اساس نقش
    const inlineKeyboard = [];

    // نمایش دکمه "اضافه کردن ادمین" و "عزل ادمین" فقط برای نقش‌های دارای صلاحیت
    if (systemRole === 'main_admin' || systemRole === 'mother') {
      inlineKeyboard.push([
        {
          text: '➕ اضافه کردن ادمین',
          callback_data: `action_add_admin_${tenantId}`
        },
        {
          text: '➖ عزل ادمین',
          callback_data: `action_remove_admin_${tenantId}`
        }
      ]);
    }

    // دکمه بازگشت همیشه در پایین قرار می‌گیرد
    inlineKeyboard.push([
      { text: '🔙 بازگشت به لیست گروه‌ها', callback_data: 'action_my_groups' }
    ]);

    // ۶. ویرایش پیام و نمایش موفقیت همراه با نقش کاربر و کیبورد داینامیک
    await ctx
      .editMessageText(
        `✅ **گروه با موفقیت انتخاب شد.**\n\n` +
          `👤 **نقش شما در این گروه:** ${persianRole}\n\n` +
          `جهت ورود به پنل، روی دکمه آبی‌رنگ **Open** در پایین صفحه کلیک کنید.`,
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: inlineKeyboard }
        }
      )
      .catch(async () => {
        // فال‌بک در صورتی که ویرایش پیام به هر دلیلی ممکن نبود
        await ctx.reply(
          `✅ **گروه با موفقیت انتخاب شد.**\n\n👤 **نقش شما:** ${persianRole}\n\nروی دکمه آبی‌رنگ **Open** کلیک کنید.`,
          {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: inlineKeyboard }
          }
        );
      });

    logger.info(
      `User ${telegramId} dynamically selected tenant ${tenantId} via inline keyboard. Role: ${persianRole}`
    );
  } catch (error) {
    logger.error('Error handling dynamic tenant selection:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد. لطفا دوباره تلاش کنید.', {
        show_alert: true
      })
      .catch(() => {});
  }
};
