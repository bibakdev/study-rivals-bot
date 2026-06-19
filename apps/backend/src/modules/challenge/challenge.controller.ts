// apps/backend/src/modules/challenge/challenge.controller.ts

import { Response, NextFunction } from 'express';
import { TenantRequest } from '#core/middlewares/validateTenantAccess';
import { getActiveChallengeLeaderboard } from '#modules/challenge/challenge.service';

/**
 * کنترلر اختصاصی دریافت رتبه‌بندی لحظه‌ای چالش فعال مستأجر
 * این متد کاملاً با ساختار خطایابی متمرکز سیستم (errorHandler) سازگار است.
 */
export const getActiveLeaderboard = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // استخراج امن شناسه مستأجر که توسط میدل‌ور تایید صلاحیت شده و تزریق گردیده است
    const tenantId = req.tenantId;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT_ID',
          message: 'شناسه مستأجر در بدنه درخواست یافت نشد.'
        }
      });
      return;
    }

    // فراخوانی لایه سرویس بهینه محاسباتی فاز دوم
    const leaderboardData = await getActiveChallengeLeaderboard(tenantId);

    // ارسال پاسخ صددرصد منطبق بر استاندارد API Response Envelope پروژه
    res.status(200).json({
      success: true,
      data: leaderboardData
    });
  } catch (error) {
    // ارجاع مستقیم خطا به میدل‌ور errorHandler مرکزی بک‌اند
    next(error);
  }
};
