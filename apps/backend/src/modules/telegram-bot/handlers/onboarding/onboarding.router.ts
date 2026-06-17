// apps/backend/src/modules/telegram-bot/handlers/onboarding/onboarding.router.ts

import { Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { env } from '#config/env';
import { ForbiddenUserModel } from '#modules/auth/forbidden-user.model';
import { logger } from '#utils/logger';
import { handleMotherAuth } from './mother-auth.action';
import { handleLicenseReservation } from './license-bind.action';
import { handleFailedAttempt } from './attempt-limit.action';
import { handleSaveTargetText } from '../target/save-target.action';

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

    // 👈 ۱. بررسی State-based برای دریافت پیام‌های تارگت
    const isTargetHandled = await handleSaveTargetText(
      ctx,
      telegramId,
      rawText
    );
    if (isTargetHandled) return; // اگر پیام مربوط به سیستم استیت‌دار بود، فرآیند متوقف شود

    const normalizedInput = rawText.replace(/[-\s]/g, '').toUpperCase();
    const normalizedMotherCode = env.MOTHER_SECRET_CODE.replace(
      /[-\s]/g,
      ''
    ).toUpperCase();

    if (normalizedInput === 'START' || normalizedInput === '/START') return;

    // --- جریان اکانت مادر ---
    if (normalizedInput === normalizedMotherCode) {
      await handleMotherAuth(ctx, telegramId);
      return;
    }

    // --- جریان رزرو اتمیک لایسنس کاربران ---
    if (normalizedInput.length === 16) {
      const isHandled = await handleLicenseReservation(
        ctx,
        telegramId,
        normalizedInput
      );
      if (isHandled) return; // لایسنس پردازش شد، پس کار متوقف می‌شود
    }

    // --- مدیریت خطای رمز (Attempts) ---
    if (rawText.length >= 6) {
      await handleFailedAttempt(ctx, telegramId);
    }
  } catch (error) {
    logger.error('Error during PV onboarding handling:', error);
    await ctx.reply('⚠️ خطایی رخ داد. مجدداً تلاش کنید.');
  }
};
