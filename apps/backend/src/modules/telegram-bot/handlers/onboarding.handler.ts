// apps/backend/src/modules/telegram-bot/handlers/onboarding.handler.ts

import { Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { env } from '#config/env';
import { UserModel } from '#modules/auth/user.model';
import { ForbiddenUserModel } from '#modules/auth/forbidden-user.model';
import { TenantModel } from '#modules/tenant/tenant.model';
import { logger } from '#utils/logger';

export const handleBotOnboardingText = async (ctx: Context): Promise<void> => {
  if (!ctx.has(message('text')) || ctx.chat?.type !== 'private') return;

  const telegramId = ctx.from?.id;
  const rawText = ctx.message.text.trim();

  if (!telegramId) return;

  try {
    const forbiddenCheck = await ForbiddenUserModel.findOne({
      telegramId
    }).lean();
    if (forbiddenCheck?.isBlacklisted) {
      await ctx.reply(
        '❌ حساب کاربری شما مسدود شده است و امکان استفاده از ربات را ندارید.'
      );
      return;
    }

    const normalizedInput = rawText.replace(/[-\s]/g, '').toUpperCase();
    const normalizedMotherCode = env.MOTHER_SECRET_CODE.replace(
      /[-\s]/g,
      ''
    ).toUpperCase();

    if (normalizedInput === 'START' || normalizedInput === '/START') return;

    let isValidCodeProvided = false;

    // --- جریان اکانت مادر ---
    if (normalizedInput === normalizedMotherCode) {
      isValidCodeProvided = true;
      try {
        await UserModel.findOneAndUpdate(
          { telegramId },
          {
            $set: {
              firstName: ctx.from?.first_name || 'کاربر',
              lastName: ctx.from?.last_name,
              username: ctx.from?.username,
              languageCode: ctx.from?.language_code,
              role: 'mother'
            }
          },
          { upsert: true, new: true, runValidators: true }
        );

        await ForbiddenUserModel.deleteOne({ telegramId });
        logger.info(`Mother account activated. TelegramId: ${telegramId}`);
        await ctx.reply(
          '👑 **مالک پلتفرم تایید شد!**\nشما به عنوان اکانت مادر شناخته شدید.\nبرای فعال‌سازی چالش‌ها، کافیست ربات را به گروه‌های خود ببرید و در تاپیک مربوطه کلمه `start` را بفرستید.'
        );
        return;
      } catch (mongoError: unknown) {
        if (
          typeof mongoError === 'object' &&
          mongoError !== null &&
          'code' in mongoError
        ) {
          if ((mongoError as { code: number }).code === 11000) {
            await ctx.reply('❌ پلتفرم در حال حاضر یک اکانت مادر مستقل دارد.');
            return;
          }
        }
        throw mongoError;
      }
    }

    // --- جریان رزرو اتمیک لایسنس کاربران (Race Condition Protected) ---
    if (normalizedInput.length === 16 && !isValidCodeProvided) {
      const targetLicense = await TenantModel.findOne({
        licenseCode: normalizedInput
      }).lean();

      if (targetLicense) {
        isValidCodeProvided = true;

        if (targetLicense.isBound) {
          await ctx.reply(
            '❌ این لایسنس روی یک گروه فعال است و قابل رزرو نیست.'
          );
          return;
        }

        if (
          targetLicense.mainAdminId &&
          targetLicense.mainAdminId !== telegramId
        ) {
          await ctx.reply('❌ این لایسنس توسط شخص دیگری رزرو شده است.');
          return;
        }

        // بررسی انقضا در خود دیتابیس انجام می‌شود تا از Race Condition در سطح صدم ثانیه جلوگیری شود
        const reserved = await TenantModel.findOneAndUpdate(
          {
            _id: targetLicense._id,
            isBound: false,
            mainAdminId: { $in: [null, telegramId] },
            $or: [
              { expiresAt: null },
              { expiresAt: { $gt: new Date() } } // فقط در صورتی آپدیت کن که زمان منقضی نشده باشد
            ]
          },
          { $set: { mainAdminId: telegramId } },
          { new: true }
        );

        if (!reserved) {
          // اگر reserved برنگشت، یعنی یا منقضی شده یا در کسر ثانیه توسط کس دیگری اشغال شده
          if (targetLicense.expiresAt && targetLicense.expiresAt < new Date()) {
            await ctx.reply(
              '❌ این لایسنس منقضی شده است (اعتبار ۱ ساعته آن به پایان رسیده).'
            );
          } else {
            await ctx.reply(
              '⚠️ خطای همزمانی! این لایسنس در همین لحظه نامعتبر یا توسط فرآیند دیگری اشغال شد.'
            );
          }
          return;
        }

        await ForbiddenUserModel.deleteOne({ telegramId });
        logger.info(
          `License reserved in PV. Admin: ${telegramId}, License: ${normalizedInput}`
        );

        await ctx.reply(
          '✅ **لایسنس با موفقیت برای شما رزرو شد!**\n\n' +
            '📌 **گام نهایی:** حالا ربات را به گروه تلگرامی خود اضافه کنید، وارد تاپیک (Topic) مورد نظر شوید و کلمه **`start`** را بفرستید.'
        );
        return;
      }
    }

    // --- مدیریت خطای رمز (Attempts) ---
    if (!isValidCodeProvided && rawText.length >= 6) {
      const updatedForbidden = await ForbiddenUserModel.findOneAndUpdate(
        { telegramId },
        { $inc: { attemptsCount: 1 } },
        { upsert: true, new: true }
      );

      if (updatedForbidden.attemptsCount >= 3) {
        await ForbiddenUserModel.updateOne(
          { telegramId },
          { $set: { isBlacklisted: true } }
        );
        await ctx.reply(
          '❌ ۳ بار کد اشتباه وارد کردید. حساب شما برای همیشه مسدود شد.'
        );
      } else {
        const remaining = 3 - updatedForbidden.attemptsCount;
        await ctx.reply(
          `❌ کد وارد شده نامعتبر است. (${remaining} فرصت باقی مانده)`
        );
      }
    }
  } catch (error) {
    logger.error('Error during PV onboarding handling:', error);
    await ctx.reply('⚠️ خطایی رخ داد. مجدداً تلاش کنید.');
  }
};
