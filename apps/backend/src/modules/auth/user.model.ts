// apps/backend/src/modules/auth/user.model.ts

import { Schema, model, Document } from 'mongoose';
import { UserRole } from 'shared-types';

export interface IUserDocument extends Document {
  telegramId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  isPremium?: boolean;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUserDocument>(
  {
    telegramId: {
      type: Number,
      required: true,
      unique: true,
      index: true
    },
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      trim: true
    },
    username: {
      type: String,
      trim: true
    },
    languageCode: {
      type: String,
      trim: true
    },
    isPremium: {
      type: Boolean,
      default: false
    },
    role: {
      type: String,
      enum: ['mother', 'standard'],
      default: 'standard',
      required: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// ایندکس ترکیبی استاندارد برای احراز هویت سریع مینی‌اپ
userSchema.index({ telegramId: 1, role: 1 });

/**
 * 👑 فیکس بحرانی معماری (Race Condition Protection):
 * ایجاد یک Partial Unique Index در سطح MongoDB.
 * این ایندکس تضمین می‌کند که در کل دیتابیس، فارغ از تعداد ریکوئست‌های همزمان،
 * فقط و فقط یک سند می‌تواند دارای نقش 'mother' باشد.
 */
userSchema.index(
  { role: 1 },
  {
    unique: true,
    partialFilterExpression: { role: 'mother' }
  }
);

export const UserModel = model<IUserDocument>('User', userSchema);
