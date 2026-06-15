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
    chatId: {
      type: Number,
      default: null,
      index: true
    },
    topicId: {
      type: Number,
      default: null
    },
    mainAdminId: {
      type: Number,
      default: null,
      index: true // برای جستجوی سریع لایسنس‌های رزرو شده یک شخص
    },
    isBound: {
      type: Boolean,
      default: false,
      required: true
    },
    isActive: {
      type: Boolean,
      default: false,
      required: true
    },
    activatedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// جلوگیری از ثبت چند مستأجر روی یک گروه تلگرامی واحد
tenantSchema.index(
  { chatId: 1 },
  {
    unique: true,
    partialFilterExpression: { chatId: { $type: 'number' } }
  }
);

export const TenantModel = model<ITenantDocument>('Tenant', tenantSchema);

/**
 * 💡 Auto-Seeding:
 * ساخت لایسنس‌های نمونه جهت تست در زمان توسعه
 */
const seedTestLicenses = async (): Promise<void> => {
  try {
    const count = await TenantModel.countDocuments();
    if (count === 0) {
      await TenantModel.insertMany([
        { licenseCode: 'RIVL-GROP-TEST-1111', isBound: false, isActive: false },
        { licenseCode: 'RIVL-GROP-TEST-2222', isBound: false, isActive: false }
      ]);
      console.log(
        '\x1b[32m[SEED] Test Group Licenses injected into Database.\x1b[0m'
      );
    }
  } catch (error) {
    console.error('Failed to seed test group licenses:', error);
  }
};

setTimeout(seedTestLicenses, 3000);
