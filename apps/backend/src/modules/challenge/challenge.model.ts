// apps/backend/src/modules/challenge/challenge.model.ts

import { Schema, model, Document, Types } from 'mongoose';
import { ChallengeTeam } from 'shared-types';

// 👈 تعریف اینترفیس محلی برای فیلد جدید
export interface IParticipantTarget {
  telegramId: number;
  target: number;
}

export interface IChallengeDocument extends Document {
  tenantId: Types.ObjectId;
  type: 'group' | 'individual';
  startDateText: string;
  startDate: Date;
  endDate: Date;
  durationDays: number;
  teams: ChallengeTeam[];
  participantTargets?: IParticipantTarget[]; // 👈 اضافه شدن فیلد جدید
  status: 'pending' | 'active' | 'completed';
  lastLeaderboardMessageId?: number;
  lastDividerMessageId?: number; // 👈 مقدار پیش‌فرض
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
        members: { type: [Number], default: [] } // Telegram IDs
      }
    ],
    // 👈 تعریف ساختار فیلد جدید در اسکیمای مونگوس
    participantTargets: {
      type: [
        {
          telegramId: { type: Number, required: true },
          target: { type: Number, required: true }
        }
      ],
      default: [] // برای سازگاری کامل با چالش‌های ساخته شده‌ی قبلی
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'completed'],
      default: 'pending'
    },
    lastLeaderboardMessageId: { type: Number, default: null },
    lastDividerMessageId: { type: Number, default: null } // 👈 مقدار پیش‌فرض
  },
  { timestamps: true, versionKey: false }
);

export const ChallengeModel = model<IChallengeDocument>(
  'Challenge',
  challengeSchema
);
