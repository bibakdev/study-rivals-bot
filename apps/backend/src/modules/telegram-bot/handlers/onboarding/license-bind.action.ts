// apps/backend/src/modules/telegram-bot/handlers/onboarding/license-bind.action.ts

import { Context } from 'telegraf';
import mongoose from 'mongoose';
import { TenantModel } from '#modules/tenant/tenant.model';
import { ForbiddenUserModel } from '#modules/auth/forbidden-user.model';
import { promoteToAdmin } from '#modules/telegram-bot/handlers/tenant/tenant.utils';
import { logger } from '#utils/logger';

export const handleLicenseReservation = async (
  ctx: Context,
  telegramId: number,
  normalizedInput: string
): Promise<boolean> => {
  // ۱. جستجوی لایسنس تولید شده توسط اکانت مادر
  const targetLicense = await TenantModel.findOne({
    licenseCode: normalizedInput
  }).lean();

  if (!targetLicense) return false; // به روتر اطلاع می‌دهیم که لایسنس یافت نشد

  // ۲. بررسی‌های امنیتی
  if (targetLicense.isBound) {
    await ctx.reply('❌ این لایسنس روی یک گروه فعال است و قابل رزرو نیست.');
    return true;
  }

  if (targetLicense.mainAdminId && targetLicense.mainAdminId !== telegramId) {
    await ctx.reply('❌ این لایسنس توسط شخص دیگری استفاده شده است.');
    return true;
  }

  // ۳. رزرو اتمیک گروه به نام کاربر
  const reserved = await TenantModel.findOneAndUpdate(
    {
      _id: targetLicense._id,
      isBound: false,
      mainAdminId: { $in: [null, telegramId] },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
    },
    { $set: { mainAdminId: telegramId } },
    { new: true }
  );

  if (!reserved) {
    if (targetLicense.expiresAt && targetLicense.expiresAt < new Date()) {
      await ctx.reply(
        '❌ این لایسنس منقضی شده است (اعتبار ۱ ساعته آن به پایان رسیده).'
      );
    } else {
      await ctx.reply(
        '⚠️ خطای همزمانی! این لایسنس در همین لحظه نامعتبر یا توسط فرآیند دیگری اشغال شد.'
      );
    }
    return true;
  }

  // ۴. تخصیص نقش ادمین اصلی (main_admin) به کاربر در همین لحظه
  await promoteToAdmin(
    telegramId,
    // استفاده از any موقت برای تطبیق تایپ Context با Context<Update> در Telegraf
    ctx as any,
    reserved._id as mongoose.Types.ObjectId
  );

  // پاک کردن خطاهای قبلی کاربر (در صورت وجود)
  await ForbiddenUserModel.deleteOne({ telegramId });
  logger.info(
    `Tenant claimed in PV and user promoted to main_admin. Admin: ${telegramId}, License: ${normalizedInput}`
  );

  await ctx.reply(
    '✅ **چالش با موفقیت برای شما ساخته شد و شما ادمین اصلی شدید!**\n\n' +
      '📌 **گام نهایی:** حالا ربات را به گروه تلگرامی خود اضافه کنید، وارد تاپیک (Topic) مورد نظر شوید و کلمه **`start`** را بفرستید تا داشبورد گروه فعال شود.'
  );

  return true;
};
