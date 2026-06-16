// packages/shared-types/src/dtos/tenant-member.dto.ts

import { z } from 'zod';

// اسکیمای اعتبارسنجی نقش در سطح مستأجر (گروه)
export const TenantRoleSchema = z.enum(['main_admin', 'sub_admin', 'user']);

// اسکیمای اعتبارسنجی داده‌های عضو مستأجر
export const TenantMemberSchema = z.object({
  tenantId: z.string().min(1, 'شناسه مستأجر (گروه) الزامی است.'),
  telegramId: z.number().int().positive('شناسه تلگرام نامعتبر است.'),
  tenantRole: TenantRoleSchema,
  isSuspended: z.boolean().default(false)
});

// استخراج تایپ DTO برای استفاده در سراسر پروژه
export type TenantMemberDto = z.infer<typeof TenantMemberSchema>;
