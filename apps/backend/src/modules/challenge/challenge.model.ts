// apps/backend/src/modules/challenge/challenge.model.ts

import { Schema, model, Document, Types } from 'mongoose';
import { ChallengeTeam } from 'shared-types';

export interface IChallengeDocument extends Document {
  tenantId: Types.ObjectId;
  type: 'group' | 'individual';
  startDateText: string;
  startDate: Date;
  endDate: Date;
  durationDays: number;
  teams: ChallengeTeam[];
  status: 'pending' | 'active' | 'completed'; // 👈 اضافه شدن وضعیت pending
  createdAt: Date;
  updatedAt: Date;
}

const challengeSchema = new Schema<IChallengeDocument>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true
    },
    type: { type: String, enum: ['group', 'individual'], required: true },
    startDateText: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    durationDays: { type: Number, required: true },
    teams: [
      {
        name: { type: String, required: true },
        members: [{ type: Number, required: true }] // Telegram IDs
      }
    ],
    // 👈 اضافه شدن pending و تغییر مقدار پیش‌فرض در دیتابیس
    status: {
      type: String,
      enum: ['pending', 'active', 'completed'],
      default: 'pending'
    }
  },
  { timestamps: true, versionKey: false }
);

export const ChallengeModel = model<IChallengeDocument>(
  'Challenge',
  challengeSchema
);
