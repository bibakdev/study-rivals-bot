// apps/backend/src/modules/tenant/tenant-member.model.ts

import { Schema, model, Document, Types } from 'mongoose';
import { TenantRole } from 'shared-types';

export interface ITenantMemberDocument extends Document {
  tenantId: Types.ObjectId;
  telegramId: number;
  tenantRole: TenantRole;
  createdAt: Date;
  updatedAt: Date;
}

const tenantMemberSchema = new Schema<ITenantMemberDocument>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true // برای جستجوی سریع تمام اعضای یک گروه
    },
    telegramId: {
      type: Number,
      required: true,
      index: true // برای جستجوی سریع تمام گروه‌های یک کاربر
    },
    tenantRole: {
      type: String,
      enum: ['main_admin', 'sub_admin', 'user'],
      default: 'user',
      required: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// 👑 ایجاد ایندکس ترکیبی یکتا (Unique Compound Index)
// تضمین می‌کند که هر کاربر (telegramId) در هر گروه (tenantId) فقط یکبار و با یک نقش ذخیره شود
tenantMemberSchema.index({ telegramId: 1, tenantId: 1 }, { unique: true });

export const TenantMemberModel = model<ITenantMemberDocument>(
  'TenantMember',
  tenantMemberSchema
);
