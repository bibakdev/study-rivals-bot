// apps/backend/src/modules/time-log/time-log.controller.ts

import { Response, NextFunction } from 'express';
import { TenantRequest } from '#core/middlewares/validateTenantAccess';
import { logTimeService, getUserTimeLogsService } from './time-log.service';
import { LogTimeRequestSchema } from 'shared-types';
import { AppError } from '#utils/AppError';

/**
 * کنترلر اختصاصی پردازش و ثبت هماهنگ زمان مطالعه چالش ورودی از کلاینت
 */
export const logTimeController = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const telegramId = req.user?.id;
    const tenantId = req.tenantId;

    if (!telegramId) {
      throw new AppError(
        'اطلاعات احراز هویت کاربری تلگرام یافت نشد.',
        401,
        'UNAUTHORIZED'
      );
    }

    if (!tenantId) {
      throw new AppError(
        'شناسه معتبر مستأجر (X-Tenant-Id) در هدر یافت نشد.',
        400,
        'MISSING_TENANT_ID'
      );
    }

    // اعتبارسنجی دقیق ران‌تایم بدنه درخواست با اسکیمای قرارداد پکیج اشتراکی
    const validationResult = LogTimeRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new AppError(
        (validationResult.error as any).errors[0].message,
        400,
        'VALIDATION_ERROR'
      );
    }

    // فراخوانی لایه سرویس بیزینس
    const resultData = await logTimeService(
      telegramId,
      tenantId,
      validationResult.data
    );

    res.status(200).json({
      success: true,
      data: resultData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * کنترلر استخراج زمان‌های ثبت شده قبلی کاربر برای چالش فعال گروه
 */
export const getUserTimeLogsController = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const telegramId = req.user?.id;
    const tenantId = req.tenantId;

    if (!telegramId) {
      throw new AppError(
        'اطلاعات احراز هویت کاربری تلگرام یافت نشد.',
        401,
        'UNAUTHORIZED'
      );
    }

    if (!tenantId) {
      throw new AppError(
        'شناسه معتبر مستأجر (X-Tenant-Id) در هدر یافت نشد.',
        400,
        'MISSING_TENANT_ID'
      );
    }

    const logs = await getUserTimeLogsService(telegramId, tenantId);

    res.status(200).json({
      success: true,
      data: logs
    });
  } catch (error) {
    next(error);
  }
};
