// apps/backend/src/modules/challenge/challenge.controller.ts

import { Response, NextFunction } from 'express';
import { TenantRequest } from '#core/middlewares/validateTenantAccess';
import { getActiveChallengeLeaderboard } from '#modules/challenge/challenge.service';

/**
 * کنترلر اختصاصی دریافت رتبه‌بندی رقابت فعال یا آخرین چالش تکمیل‌شده مستأجر
 */
export const getActiveLeaderboard = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
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

    // فراخوانی لایه سرویس بهینه‌سازی شده فاز دوم
    const leaderboardData = await getActiveChallengeLeaderboard(tenantId);

    // 👈 ارسال پاسخ منطبق بر استاندارد و پاک‌سازی گارد پرتاب خطای ۴۰۴ سخت‌گیرانه قبلی
    res.status(200).json({
      success: true,
      data: leaderboardData
    });
  } catch (error) {
    next(error);
  }
};
