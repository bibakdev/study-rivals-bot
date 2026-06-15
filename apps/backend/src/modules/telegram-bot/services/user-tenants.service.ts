// apps/backend/src/modules/telegram-bot/services/user-tenants.service.ts

import { UserModel } from '#modules/auth/user.model';
import { TenantModel } from '#modules/tenant/tenant.model';
import { TenantMemberModel } from '#modules/tenant/tenant-member.model';
import { logger } from '#utils/logger';

export const getUserActiveTenants = async (telegramId: number) => {
  try {
    const user = await UserModel.findOne({ telegramId }).lean();

    if (!user) {
      return [];
    }

    // ۱. اگر کاربر ادمین مادر است، دسترسی کامل به تمام گروه‌های فعال دارد
    if (user.role === 'mother') {
      const allActiveTenants = await TenantModel.find({
        isActive: true
      }).lean();
      return allActiveTenants;
    }

    // ۲. اگر کاربر استاندارد است، ابتدا پیدا می‌کنیم عضو چه گروه‌هایی است
    const memberships = await TenantMemberModel.find({ telegramId }).lean();

    if (!memberships.length) {
      return [];
    }

    // استخراج شناسه‌های گروه‌ها (Tenant IDs)
    const tenantIds = memberships.map((membership) => membership.tenantId);

    // ۳. گرفتن اطلاعات فقط گروه‌هایی که فعال هستند
    const userActiveTenants = await TenantModel.find({
      _id: { $in: tenantIds },
      isActive: true
    }).lean();

    return userActiveTenants;
  } catch (error) {
    logger.error(`Error fetching tenants for user ${telegramId}:`, error);
    throw error;
  }
};
