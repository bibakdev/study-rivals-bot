// apps/backend/src/modules/tenant/tenant.controller.ts

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '#core/middlewares/validateTgInit';
import { UserModel } from '#modules/auth/user.model';
import { TenantModel } from '#modules/tenant/tenant.model';
import { TenantMemberModel } from '#modules/tenant/tenant-member.model';
import { botService } from '#modules/telegram-bot/bot.service';
import { logger } from '#utils/logger';
import { UserTenantDto, UserTenantRole } from 'shared-types';

/**
 * کنترلر اختصاصی استخراج هوشمند و داینامیک تمام گروه‌های فعال کاربر
 */
export const getMyTenants = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const telegramId = req.user?.id;

    if (!telegramId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'اطلاعات هویتی کاربر تلگرام یافت نشد.'
        }
      });
      return;
    }

    // ۱. بررسی نقش کاربری در سطح کل پلتفرم
    const user = await UserModel.findOne({ telegramId }).lean();
    if (!user) {
      res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'حساب کاربری شما در سیستم ثبت نشده است.'
        }
      });
      return;
    }

    let activeTenants: Array<{ _id: string; chatId: number | null }> = [];
    const rolesMap = new Map<string, UserTenantRole>();

    // ۲. تفکیک منطق کوئری بر اساس ساختار ادمین مادر یا کاربر استاندارد
    if (user.role === 'mother') {
      // اکانت مادر به تمام گروه‌های فعال سیستم دسترسی مستقیم دارد
      const tenants = await TenantModel.find({ isActive: true })
        .select('_id chatId')
        .lean();
      activeTenants = tenants.map((t) => ({
        _id: t._id.toString(),
        chatId: t.chatId
      }));
      tenants.forEach((t) => rolesMap.set(t._id.toString(), 'mother'));
    } else {
      // کاربران عادی: استخراج گروه‌هایی که در آن عضویت فعال دارند و تعلیق نشده‌اند
      const memberships = await TenantMemberModel.find({
        telegramId,
        isSuspended: false
      }).lean();
      if (memberships.length === 0) {
        res.status(200).json({ success: true, data: [] });
        return;
      }

      const tenantIds = memberships.map((m) => m.tenantId);
      const tenants = await TenantModel.find({
        _id: { $in: tenantIds },
        isActive: true
      })
        .select('_id chatId')
        .lean();

      activeTenants = tenants.map((t) => ({
        _id: t._id.toString(),
        chatId: t.chatId
      }));
      memberships.forEach((m) =>
        rolesMap.set(m.tenantId.toString(), m.tenantRole)
      );
    }

    // ۳. واکشی همزمان و موازی نام واقعی گروه‌ها از API تلگرام به کمک بذاگر بومی botService
    const mappedTenants: UserTenantDto[] = await Promise.all(
      activeTenants.map(async (tenant, index) => {
        let groupName = `چالش مطالعاتی ${index + 1}`;

        if (tenant.chatId) {
          try {
            const chatInfo = await botService
              .getBot()
              .telegram.getChat(tenant.chatId);
            if ('title' in chatInfo) {
              groupName = chatInfo.title;
            }
          } catch (err) {
            // هندل کردن زمانی که ربات از گروه اخراج شده یا چت ریلیشن موقتاً قطع است
            logger.warn(
              `Could not fetch chat title from Telegram for chatId ${tenant.chatId}`
            );
            groupName = `گروه چالش (${tenant._id.substring(18)})`;
          }
        }

        return {
          id: tenant._id,
          name: groupName,
          role: rolesMap.get(tenant._id) || 'user'
        };
      })
    );

    // ۴. ارسال ریسپانس نهایی کاملاً منطبق بر پوشش استاندارد انولوپ پروژه
    res.status(200).json({
      success: true,
      data: mappedTenants
    });
  } catch (error) {
    next(error);
  }
};
