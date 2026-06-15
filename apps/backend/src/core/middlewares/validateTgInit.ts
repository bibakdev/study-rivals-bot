// apps/backend/src/core/middlewares/validateTgInit.ts

import crypto from 'crypto';
import { Response, NextFunction, Request } from 'express';
import { env } from '#core/config/env';
import { AppError } from '#utils/AppError';
import { TelegramUserSchema, type TelegramUserDto } from 'shared-types';

export interface AuthenticatedRequest extends Request {
  user?: TelegramUserDto; // استفاده از DTO استاندارد پکیج اشتراکی
}

export const validateTelegramInitData = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const initData = req.headers.authorization;

    if (!initData) {
      throw new AppError(
        'داده‌های احراز هویت (Init Data) ارسال نشده است.',
        401,
        'UNAUTHORIZED'
      );
    }

    const botToken = env.BOT_TOKEN;

    const cleanInitData = initData.startsWith('Bearer ')
      ? initData.slice(7)
      : initData;
    const params = new URLSearchParams(cleanInitData);

    const hash = params.get('hash');
    const authDate = params.get('auth_date');

    if (!hash || !authDate) {
      throw new AppError(
        'پارامترهای ضروری احراز هویت نامعتبر است.',
        400,
        'BAD_REQUEST'
      );
    }

    // بررسی Replay Attack
    const now = Math.floor(Date.now() / 1000);
    const MAX_AGE_SECONDS = 3600;

    if (now - parseInt(authDate, 10) > MAX_AGE_SECONDS) {
      throw new AppError(
        'داده‌های احراز هویت منقضی شده است.',
        401,
        'EXPIRED_INIT_DATA'
      );
    }

    params.delete('hash');

    const sortedParams = Array.from(params.entries())
      .map(([key, value]) => `${key}=${value}`)
      .sort()
      .join('\n');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(sortedParams)
      .digest('hex');

    if (calculatedHash !== hash) {
      throw new AppError(
        'امضای دیجیتال تلگرام نامعتبر است.',
        403,
        'FORBIDDEN_INVALID_SIGNATURE'
      );
    }

    // 🛡️ تغییر اصلی: اعتبارسنجی سخت‌گیرانه ران‌تایم با Zod به جای Type Casting
    if (params.has('user')) {
      const userString = params.get('user');
      if (userString) {
        try {
          const rawUserData = JSON.parse(userString);

          // بررسی صحت تمام فیلدها با اسکیما
          const validationResult = TelegramUserSchema.safeParse(rawUserData);

          if (!validationResult.success) {
            throw new AppError(
              'ساختار داده‌های کاربر تلگرام دستکاری شده یا ناقص است.',
              400,
              'BAD_REQUEST'
            );
          }

          // تزریق داده‌های کاملاً مطمئن و پارس شده به درخواست
          req.user = validationResult.data;
        } catch (e) {
          if (e instanceof AppError) throw e;
          throw new AppError(
            'فرمت متنی کاربر تلگرام معتبر نیست.',
            400,
            'BAD_REQUEST'
          );
        }
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};
