// apps/backend/src/core/middlewares/errorHandler.ts

import { Request, Response, NextFunction } from 'express';
import { logger } from '#utils/logger';
import { AppError } from '#utils/AppError';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction // وجود این پارامتر برای تشخیص میدل‌ور خطا توسط اکسپرس الزامی است
): void => {
  // ۱. لاگ کردن خطا برای تیم توسعه
  logger.error(`Request Failed: ${req.method} ${req.url}`, err);

  // ۲. مدیریت خطاهای عملیاتی (AppError) که خودمان ایجاد کرده‌ایم
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.errorCode,
        message: err.message
      }
    });
    return;
  }

  // ۳. مدیریت خطاهای اختصاصی Mongoose / MongoDB (اختیاری اما بسیار کاربردی)
  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message // در محیط پروداکشن می‌توان پیام‌ها را یکپارچه‌تر کرد
      }
    });
    return;
  }

  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID_FORMAT',
        message: 'شناسه ارسال شده نامعتبر است.'
      }
    });
    return;
  }

  // ۴. خطاهای ناشناخته (Internal Server Error)
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'خطای داخلی سرور. لطفاً دقایقی دیگر مجدداً تلاش کنید.'
    }
  });
};
