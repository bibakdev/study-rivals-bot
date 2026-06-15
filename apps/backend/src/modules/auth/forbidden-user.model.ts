// apps/backend/src/modules/auth/forbidden-user.model.ts

import { Schema, model, Document } from 'mongoose';

export interface IForbiddenUserDocument extends Document {
  telegramId: number;
  attemptsCount: number;
  isBlacklisted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const forbiddenUserSchema = new Schema<IForbiddenUserDocument>(
  {
    telegramId: {
      type: Number,
      required: true,
      unique: true,
      index: true
    },
    attemptsCount: {
      type: Number,
      required: true,
      default: 0
    },
    isBlacklisted: {
      type: Boolean,
      required: true,
      default: false
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// ایندکس ترکیبی برای بهینه‌سازی کوئری‌های بررسی وضعیت بلک‌لیست
forbiddenUserSchema.index({ telegramId: 1, isBlacklisted: 1 });

export const ForbiddenUserModel = model<IForbiddenUserDocument>(
  'ForbiddenUser',
  forbiddenUserSchema
);
