// packages/shared-types/src/models/tenant-member.types.ts

export type TenantRole = 'main_admin' | 'sub_admin' | 'user';

export interface TenantMember {
  tenantId: string;
  telegramId: number;
  tenantRole: TenantRole;
  isSuspended: boolean;
}
