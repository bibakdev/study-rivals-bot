// apps/backend/src/core/middlewares/validateTenantAccess.ts

import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '#core/middlewares/validateTgInit';
import { AppError } from '#utils/AppError';
import { UserModel } from '#modules/auth/user.model';
import { TenantMemberModel } from '#modules/tenant/tenant-member.model';
import { TenantRole } from 'shared-types';

// گسترش تایپ Request برای تزریق اطلاعات گروه و نقش کاربر در آن گروه
export interface TenantRequest extends AuthenticatedRequest {
  tenantId?: string;
  tenantRole?: TenantRole | 'mother';
}

export const validateTenantAccess = async (
  req: TenantRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const telegramId = req.user?.id;

    if (!telegramId) {
      throw new AppError(
        'اطلاعات هویتی کاربر یافت نشد. لطفاً ابتدا وارد مینی‌اپ شوید.',
        401,
        'UNAUTHORIZED'
      );
    }

    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      throw new AppError(
        'شناسه گروه (X-Tenant-Id) در هدر درخواست ارسال نشده است.',
        400,
        'MISSING_TENANT_ID'
      );
    }

    if (!mongoose.Types.ObjectId.isValid(tenantId)) {
      throw new AppError(
        'فرمت شناسه گروه نامعتبر است.',
        400,
        'INVALID_TENANT_ID'
      );
    }

    // بررسی وجود کاربر در دیتابیس کل سیستم و استخراج نقش پلتفرمی
    const user = await UserModel.findOne({ telegramId }).lean();

    if (!user) {
      throw new AppError(
        'حساب کاربری شما در دیتابیس سیستم یافت نشد.',
        404,
        'USER_NOT_FOUND'
      );
    }

    // ۱. دسترسی سراسری (Global Access) ویژه ادمین مادر
    if (user.role === 'mother') {
      req.tenantId = tenantId;
      req.tenantRole = 'mother'; // کنترلرها می‌توانند روی این نقش برای بای‌پس کردن محدودیت‌ها حساب کنند
      return next();
    }

    // ۲. بررسی عضویت اختصاصی کاربر در مستأجر
    const membership = await TenantMemberModel.findOne({
      telegramId,
      tenantId: new mongoose.Types.ObjectId(tenantId)
    }).lean();

    if (!membership) {
      throw new AppError(
        'شما دسترسی به این چالش را ندارید یا از گروه مربوطه حذف شده‌اید.',
        403,
        'FORBIDDEN_TENANT_ACCESS'
      );
    }

    // ⛔ ۳. گارد امنیتی: قطع دسترسی در صورت تعلیق کاربر
    if (membership.isSuspended) {
      throw new AppError(
        'شما در این گروه تعلیق شده‌اید.',
        403,
        'USER_SUSPENDED'
      );
    }

    // ۴. تزریق شناسه گروه و نقشِ اختصاصیِ کاربر در این گروه به بدنه ریکوئست
    req.tenantId = tenantId;
    req.tenantRole = membership.tenantRole;

    next();
  } catch (error) {
    next(error); // پاس دادن خطا به errorHandler مرکزی
  }
};
