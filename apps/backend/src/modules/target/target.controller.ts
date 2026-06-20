// apps/backend/src/modules/target/target.controller.ts

import { Response, NextFunction } from 'express';
import { TenantRequest } from '#core/middlewares/validateTenantAccess';
import { UpdateTargetRequestSchema } from 'shared-types';
import { AppError } from '#utils/AppError';
import {
  setTargetService,
  getMyTargetService,
  deleteTargetService
} from './target.service';

export const setTargetController = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const telegramId = req.user?.id;
    const tenantId = req.tenantId;

    if (!telegramId || !tenantId) {
      throw new AppError('احراز هویت نامعتبر است.', 401, 'UNAUTHORIZED');
    }

    const validationResult = UpdateTargetRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new AppError(
        validationResult.error.errors[0].message,
        400,
        'VALIDATION_ERROR'
      );
    }

    const result = await setTargetService(
      telegramId,
      tenantId,
      validationResult.data
    );

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getMyTargetController = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const telegramId = req.user?.id;
    const tenantId = req.tenantId;

    if (!telegramId || !tenantId) {
      throw new AppError('احراز هویت نامعتبر است.', 401, 'UNAUTHORIZED');
    }

    const result = await getMyTargetService(telegramId, tenantId);

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const deleteTargetController = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const telegramId = req.user?.id;
    const tenantId = req.tenantId;

    if (!telegramId || !tenantId) {
      throw new AppError('دسترسی غیرمجاز', 401, 'UNAUTHORIZED');
    }

    await deleteTargetService(telegramId, tenantId);

    res.status(200).json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};
