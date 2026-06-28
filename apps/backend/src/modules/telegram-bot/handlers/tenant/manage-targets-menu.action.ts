// apps/backend/src/modules/telegram-bot/handlers/tenant/manage-targets-menu.action.ts

import { Context, Markup } from 'telegraf';
import mongoose from 'mongoose';
import { TargetModel } from '#modules/target/target.model';
import { UserModel } from '#modules/auth/user.model';
import { TenantMemberModel } from '#modules/tenant/tenant-member.model';
import { logger } from '#utils/logger';

export const handleManageUsersTargetsMenu = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    const tenantId = ctx.match[1];
    const promoterId = ctx.from?.id;

    await ctx.answerCbQuery().catch(() => {});

    if (!promoterId) return;

    // ۱. بررسی دسترسی (فقط مالک پلتفرم و مدیر اصلی مجاز هستند)
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

    // ۲. استخراج تمام تارگت‌های ثبت شده برای این گروه
    const targets = await TargetModel.find({
      tenantId: new mongoose.Types.ObjectId(tenantId)
    }).lean();

    if (targets.length === 0) {
      await ctx
        .editMessageText(
          '🎯 **لیست خالی است**\n\nهنوز هیچ کاربری در این گروه تارگت مطالعاتی ثبت نکرده است.',
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

    // ۳. واکشی اطلاعات کاربران برای نمایش نام‌ها (با اولویت نام مستعار)
    const usersInfo = await UserModel.find({
      telegramId: { $in: userIds }
    }).lean();
    const tenantMembers = await TenantMemberModel.find({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      telegramId: { $in: userIds }
    }).lean();

    // ۴. ساخت دکمه‌های شیشه‌ای برای هر کاربر دارای تارگت
    const inlineKeyboard = targets.map((target) => {
      const user = usersInfo.find((u) => u.telegramId === target.telegramId);
      const membership = tenantMembers.find(
        (m) => m.telegramId === target.telegramId
      );

      let displayName = 'کاربر نامشخص';
      if (membership?.alias) {
        displayName = membership.alias;
      } else if (user) {
        displayName = `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`;
      }

      return [
        Markup.button.callback(
          `🎯 ${displayName}`,
          `action_user_target_detail_${tenantId}_${target.telegramId}` // این اکشن در فاز ۲ ساخته می‌شود
        )
      ];
    });

    inlineKeyboard.push([
      Markup.button.callback(
        '🔙 بازگشت به پنل گروه',
        `select_tenant_${tenantId}`
      )
    ]);

    // ۵. نمایش لیست
    await ctx
      .editMessageText(
        '🎯 **مدیریت تارگت کاربران**\n\nلطفاً کاربری که قصد مشاهده یا ویرایش تارگت او را دارید انتخاب کنید:',
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: inlineKeyboard }
        }
      )
      .catch(() => {});
  } catch (error) {
    logger.error('Error handling manage users targets menu:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی در بارگذاری لیست تارگت‌ها رخ داد.', {
        show_alert: true
      })
      .catch(() => {});
  }
};
