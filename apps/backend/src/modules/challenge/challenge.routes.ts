// apps/backend/src/modules/challenge/challenge.routes.ts

import { Router } from 'express';
import { validateTelegramInitData } from '#core/middlewares/validateTgInit';
import { validateTenantAccess } from '#core/middlewares/validateTenantAccess';
import { getActiveLeaderboard } from '#modules/challenge/challenge.controller';

const router = Router();

/**
 * روت دریافت رتبه‌بندی چالش فعال گروه
 * ترتیب میدل‌ورها اهمیت حیاتی دارد:
 * ۱. ابتدا صحت امضا و هویت کلاینت تلگرام بررسی می‌شود (validateTelegramInitData)
 * ۲. سپس سطح دسترسی کاربر به گروه و گارد تعلیق اعمال می‌گردد (validateTenantAccess)
 */
router.get(
  '/active/leaderboard',
  validateTelegramInitData,
  validateTenantAccess,
  getActiveLeaderboard
);

export default router;
