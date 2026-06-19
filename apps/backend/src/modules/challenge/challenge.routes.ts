// apps/backend/src/modules/challenge/challenge.routes.ts

import { Router } from 'express';
import { validateTelegramInitData } from '#core/middlewares/validateTgInit';
import { validateTenantAccess } from '#core/middlewares/validateTenantAccess';
import { getActiveLeaderboard } from '#modules/challenge/challenge.controller';
import { getMyTenants } from '#modules/tenant/tenant.controller'; // 👈 امپورت کنترلر جدید فاز دوم

const router = Router();

/**
 * روت اختصاصی دریافت لیست تمام گروه‌های فعال کاربر جهت تغذیه دراپ‌داون مینی‌اپ
 * 🛡️ این روت فاقد میدل‌ور validateTenantAccess است تا کلاینت بدون داشتن هدر اولیه بتواند آن را صدا بزند.
 */
router.get('/tenants/my', validateTelegramInitData, getMyTenants);

/**
 * روت دریافت رتبه‌بندی چالش فعال گروه
 */
router.get(
  '/active/leaderboard',
  validateTelegramInitData,
  validateTenantAccess,
  getActiveLeaderboard
);

export default router;
