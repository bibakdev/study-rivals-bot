// packages/shared-types/src/dtos/tenant.dto.ts

import { z } from 'zod';

/**
 * اسکیمای اعتبارسنجی نقش‌های مجاز کاربر در مینی‌اپ و گروه‌ها
 */
export const UserTenantRoleSchema = z.enum([
  'main_admin',
  'sub_admin',
  'user',
  'mother'
]);

/**
 * اسکیمای قرارداد خروجی اطلاعات هر گروه (Tenant) برای کلاینت
 */
export const UserTenantSchema = z.object({
  id: z.string().min(1, 'شناسه گروه الزامی است.'),
  name: z.string().min(1, 'نام گروه الزامی است.'),
  role: UserTenantRoleSchema
});

// استخراج تایپ‌های استاتیک برای استفاده در کامپایلر تایپ‌اسکریپت سراسر پروژه
export type UserTenantRole = z.infer<typeof UserTenantRoleSchema>;
export type UserTenantDto = z.infer<typeof UserTenantSchema>;
