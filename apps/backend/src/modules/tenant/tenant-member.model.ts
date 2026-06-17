// apps/backend/src/modules/tenant/tenant-member.model.ts

import { Schema, model, Document, Types } from 'mongoose';
import { TenantRole } from 'shared-types';

export interface ITenantMemberDocument extends Document {
  tenantId: Types.ObjectId;
  telegramId: number;
  tenantRole: TenantRole;
  isSuspended: boolean;
  alias?: string | null; // 👈 فیلد جدید
  createdAt: Date;
  updatedAt: Date;
}

const tenantMemberSchema = new Schema<ITenantMemberDocument>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true
    },
    telegramId: {
      type: Number,
      required: true,
      index: true
    },
    tenantRole: {
      type: String,
      enum: ['main_admin', 'sub_admin', 'user'],
      default: 'user',
      required: true
    },
    isSuspended: {
      type: Boolean,
      default: false,
      required: true
    },
    alias: {
      type: String,
      default: null // 👈 مقدار پیش‌فرض
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

tenantMemberSchema.index({ telegramId: 1, tenantId: 1 }, { unique: true });

export const TenantMemberModel = model<ITenantMemberDocument>(
  'TenantMember',
  tenantMemberSchema
);
