// packages/shared-types/src/dtos/tenant-member.dto.ts

import { z } from 'zod';

export const TenantRoleSchema = z.enum(['main_admin', 'sub_admin', 'user']);

export const TenantMemberSchema = z.object({
  tenantId: z.string().min(1, 'شناسه مستأجر (گروه) الزامی است.'),
  telegramId: z.number().int().positive('شناسه تلگرام نامعتبر است.'),
  tenantRole: TenantRoleSchema,
  isSuspended: z.boolean().default(false),
  alias: z.string().nullable().optional() // 👈 فیلد نام مستعار اضافه شد
});

export type TenantMemberDto = z.infer<typeof TenantMemberSchema>;
