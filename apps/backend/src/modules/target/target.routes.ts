// apps/backend/src/modules/target/target.routes.ts

import { Router } from 'express';
import { validateTelegramInitData } from '#core/middlewares/validateTgInit';
import { validateTenantAccess } from '#core/middlewares/validateTenantAccess';
import {
  setTargetController,
  getMyTargetController,
  deleteTargetController
} from './target.controller';

const router = Router();

router.get(
  '/me',
  validateTelegramInitData,
  validateTenantAccess,
  getMyTargetController
);

router.post(
  '/',
  validateTelegramInitData,
  validateTenantAccess,
  setTargetController
);

router.delete(
  '/',
  validateTelegramInitData,
  validateTenantAccess,
  deleteTargetController
);

export default router;
