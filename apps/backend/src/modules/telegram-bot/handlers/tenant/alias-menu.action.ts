// apps/backend/src/modules/telegram-bot/handlers/tenant/alias-menu.action.ts

import { Context, Markup } from 'telegraf';
import mongoose from 'mongoose';
import { TenantMemberModel } from '#modules/tenant/tenant-member.model';
import { UserModel } from '#modules/auth/user.model';
import { logger } from '#utils/logger';

export const handleAliasMenuRequest = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const tenantId = ctx.match[1];
    const promoterId = ctx.from?.id;

    await ctx.answerCbQuery().catch(() => {});

    if (!promoterId) return;

    // ۱. بررسی دسترسی: فقط ادمین اصلی و اکانت مادر مجاز هستند
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

    // ۲. استخراج تمام اعضای این گروه از دیتابیس
    const memberships = await TenantMemberModel.find({
      tenantId: new mongoose.Types.ObjectId(tenantId)
    }).lean();

    const userIds = memberships.map((m) => m.telegramId);

    // ۳. اضافه کردن اکانت مادر به لیست کاربران (چون به صورت پیش‌فرض در TenantMember عضو نمی‌شود)
    const motherUser = await UserModel.findOne({ role: 'mother' }).lean();
    if (motherUser && !userIds.includes(motherUser.telegramId)) {
      userIds.push(motherUser.telegramId);
    }

    // ۴. واکشی اطلاعات تمام کاربران استخراج شده برای نمایش نام‌ها
    const usersInfo = await UserModel.find({
      telegramId: { $in: userIds }
    }).lean();

    // ۵. ساخت دکمه‌های شیشه‌ای برای هر کاربر
    const inlineKeyboard = usersInfo.map((u) => {
      const fullName = u.firstName + (u.lastName ? ` ${u.lastName}` : '');
      const roleLabel = u.role === 'mother' ? '👑 ' : '';
      return [
        Markup.button.callback(
          `${roleLabel}🏷 ${fullName}`,
          `action_set_alias_prompt_${tenantId}_${u.telegramId}` // این اکشن در مرحله بعد ساخته می‌شود
        )
      ];
    });

    inlineKeyboard.push([
      Markup.button.callback('🔙 بازگشت', `select_tenant_${tenantId}`)
    ]);

    // ۶. ویرایش و نمایش پیام
    await ctx
      .editMessageText(
        '🏷 **ثبت نام مستعار**\n\nلطفاً کاربری که می‌خواهید برای او نام مستعار (Alias) ثبت کنید را از لیست زیر انتخاب نمایید:',
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: inlineKeyboard }
        }
      )
      .catch(() => {});
  } catch (error) {
    logger.error('Error handling alias menu action:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد. لطفا دوباره تلاش کنید.', {
        show_alert: true
      })
      .catch(() => {});
  }
};
