// apps/backend/src/modules/time-log/time-log.routes.ts

import { Router } from 'express';
import { validateTelegramInitData } from '#core/middlewares/validateTgInit';
import { validateTenantAccess } from '#core/middlewares/validateTenantAccess';
import {
  logTimeController,
  getUserTimeLogsController
} from './time-log.controller';

const router = Router();

/**
 * روت ایمن دریافت کارکردهای زمانی ثبت شده پیشین کاربر
 */
router.get(
  '/me',
  validateTelegramInitData,
  validateTenantAccess,
  getUserTimeLogsController
);

/**
 * روت امن ثبت و ویرایش زمان مطالعه چالش
 */
router.post(
  '/',
  validateTelegramInitData,
  validateTenantAccess,
  logTimeController
);

export default router;
