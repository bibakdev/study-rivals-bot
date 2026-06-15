import { Context } from 'telegraf';
import { TenantModel } from '#modules/tenant/tenant.model';
import { ForbiddenUserModel } from '#modules/auth/forbidden-user.model';
import { logger } from '#utils/logger';

export const handleLicenseReservation = async (
  ctx: Context,
  telegramId: number,
  normalizedInput: string
): Promise<boolean> => {
  const targetLicense = await TenantModel.findOne({
    licenseCode: normalizedInput
  }).lean();

  if (!targetLicense) return false; // به روتر اطلاع می‌دهیم که لایسنس یافت نشد

  if (targetLicense.isBound) {
    await ctx.reply('❌ این لایسنس روی یک گروه فعال است و قابل رزرو نیست.');
    return true;
  }

  if (targetLicense.mainAdminId && targetLicense.mainAdminId !== telegramId) {
    await ctx.reply('❌ این لایسنس توسط شخص دیگری رزرو شده است.');
    return true;
  }

  // بررسی انقضا در خود دیتابیس انجام می‌شود تا از Race Condition در سطح صدم ثانیه جلوگیری شود
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

  await ForbiddenUserModel.deleteOne({ telegramId });
  logger.info(
    `License reserved in PV. Admin: ${telegramId}, License: ${normalizedInput}`
  );

  await ctx.reply(
    '✅ **لایسنس با موفقیت برای شما رزرو شد!**\n\n' +
      '📌 **گام نهایی:** حالا ربات را به گروه تلگرامی خود اضافه کنید، وارد تاپیک (Topic) مورد نظر شوید و کلمه **`start`** را بفرستید.'
  );

  return true;
};
