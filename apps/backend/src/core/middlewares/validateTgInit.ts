// apps/backend/src/core/middlewares/validateTgInit.ts

import crypto from 'crypto';
import { Response, NextFunction, Request } from 'express';
import { env } from '#core/config/env';
import { AppError } from '#utils/AppError';

// تعریف تایپ دقیق کاربر تلگرام برای جلوگیری از استفاده از any
export interface TelegramUser {
  id: number;
  is_bot?: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  added_to_attachment_menu?: boolean;
  allows_write_to_pm?: boolean;
  photo_url?: string;
}

// توسعه اینترفیس Request اکسپرس برای قرار دادن امن آبجکت user
export interface AuthenticatedRequest extends Request {
  user?: TelegramUser;
}

export const validateTelegramInitData = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const initData = req.headers.authorization;

    // ۱. بررسی وجود داده‌ها
    if (!initData) {
      throw new AppError(
        'داده‌های احراز هویت (Init Data) ارسال نشده است.',
        401,
        'UNAUTHORIZED'
      );
    }

    const botToken = env.BOT_TOKEN;
    if (!botToken) {
      throw new AppError(
        'توکن ربات در سرور تنظیم نشده است.',
        500,
        'SERVER_CONFIG_ERROR'
      );
    }

    // پاک‌سازی پیشوند Bearer
    const cleanInitData = initData.startsWith('Bearer ')
      ? initData.slice(7)
      : initData;
    const params = new URLSearchParams(cleanInitData);

    const hash = params.get('hash');
    const authDate = params.get('auth_date');

    // ۲. بررسی وجود فیلدهای حیاتی
    if (!hash || !authDate) {
      throw new AppError(
        'پارامترهای ضروری احراز هویت نامعتبر است.',
        400,
        'BAD_REQUEST'
      );
    }

    // ۳. جلوگیری از Replay Attack (انقضای ۱ ساعته)
    const now = Math.floor(Date.now() / 1000);
    const MAX_AGE_SECONDS = 3600;

    if (now - parseInt(authDate, 10) > MAX_AGE_SECONDS) {
      throw new AppError(
        'داده‌های احراز هویت منقضی شده است.',
        401,
        'EXPIRED_INIT_DATA'
      );
    }

    // ۴. حذف هش برای محاسبه مجدد
    params.delete('hash');

    // ۵. مرتب‌سازی الفبایی و اتصال پارامترها
    const sortedParams = Array.from(params.entries())
      .map(([key, value]) => `${key}=${value}`)
      .sort()
      .join('\n');

    // ۶. ساخت کلید مخفی و تولید هش با HMAC-SHA256
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(sortedParams)
      .digest('hex');

    // ۷. مقایسه نهایی
    if (calculatedHash !== hash) {
      throw new AppError(
        'امضای دیجیتال تلگرام نامعتبر است.',
        403,
        'FORBIDDEN_INVALID_SIGNATURE'
      );
    }

    // ۸. استخراج اطلاعات کاربر و تزریق به Request برای استفاده در کنترلرها
    if (params.has('user')) {
      const userString = params.get('user');
      if (userString) {
        req.user = JSON.parse(userString) as TelegramUser;
      }
    }

    // عبور به میدل‌ور/کنترلر بعدی
    next();
  } catch (error) {
    // پاس دادن ارور به میدل‌ور هندلر سراسری خطا برای تولید ریسپانس استاندارد
    next(error);
  }
};
