// apps/backend/src/modules/telegram-bot/models/bot-state.model.ts

import { Schema, model, Document } from 'mongoose';

export interface IBotStateDocument extends Document {
  telegramId: number;
  action: string;
  payload: Record<string, any>;
  createdAt: Date;
}

const botStateSchema = new Schema<IBotStateDocument>(
  {
    telegramId: {
      type: Number,
      required: true,
      unique: true, // هر کاربر در لحظه فقط یک وضعیت فعال می‌تواند داشته باشد
      index: true
    },
    action: {
      type: String,
      required: true
    },
    payload: {
      type: Schema.Types.Mixed,
      default: {}
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 3600 // TTL: وضعیت پس از ۱ ساعت در صورت عدم فعالیت منقضی و حذف می‌شود
    }
  },
  { versionKey: false }
);

export const BotStateModel = model<IBotStateDocument>(
  'BotState',
  botStateSchema
);
