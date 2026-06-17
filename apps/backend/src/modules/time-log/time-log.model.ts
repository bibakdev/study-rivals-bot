// apps/backend/src/modules/time-log/time-log.model.ts

import { Schema, model, Document, Types } from 'mongoose';

export interface ITimeLogDocument extends Document {
  tenantId: Types.ObjectId;
  challengeId: Types.ObjectId;
  telegramId: number;
  date: Date;
  minutes: number;
  createdAt: Date;
  updatedAt: Date;
}

const timeLogSchema = new Schema<ITimeLogDocument>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true
    },
    challengeId: {
      type: Schema.Types.ObjectId,
      ref: 'Challenge',
      required: true,
      index: true
    },
    telegramId: { type: Number, required: true, index: true },
    date: { type: Date, required: true },
    minutes: { type: Number, required: true }
  },
  { timestamps: true, versionKey: false }
);

// جلوگیری از ثبت بیش از یک گزارش در یک روز برای هر چالش و کاربر
timeLogSchema.index(
  { challengeId: 1, telegramId: 1, date: 1 },
  { unique: true }
);

export const TimeLogModel = model<ITimeLogDocument>('TimeLog', timeLogSchema);
