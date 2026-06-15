// apps/backend/src/modules/tenant/tenant.model.ts

import { Schema, model, Document } from 'mongoose';

export interface ITenantDocument extends Document {
  licenseCode: string;
  chatId: number | null;
  topicId: number | null;
  mainAdminId: number | null;
  isBound: boolean;
  isActive: boolean;
  activatedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const tenantSchema = new Schema<ITenantDocument>(
  {
    licenseCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    chatId: { type: Number, default: null, index: true },
    topicId: { type: Number, default: null },
    mainAdminId: { type: Number, default: null, index: true },
    isBound: { type: Boolean, default: false, required: true },
    isActive: { type: Boolean, default: false, required: true },
    activatedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null }
  },
  { timestamps: true, versionKey: false }
);

tenantSchema.index(
  { chatId: 1 },
  { unique: true, partialFilterExpression: { chatId: { $type: 'number' } } }
);

// 🛡️ Partial TTL Index: به صورت اتوماتیک در موتور MongoDB لایسنس‌هایی که
// منقضی شده‌اند را حذف می‌کند (فقط داکیومنت‌هایی که تاریخ انقضا دارند)
tenantSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { expiresAt: { $type: 'date' } }
  }
);

export const TenantModel = model<ITenantDocument>('Tenant', tenantSchema);
