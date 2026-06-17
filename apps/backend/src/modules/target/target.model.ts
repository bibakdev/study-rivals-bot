// apps/backend/src/modules/target/target.model.ts

import { Schema, model, Document, Types } from 'mongoose';

export interface ITargetDocument extends Document {
  tenantId: Types.ObjectId;
  telegramId: number;
  dailyMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

const targetSchema = new Schema<ITargetDocument>(
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
    dailyMinutes: {
      type: Number,
      required: true,
      min: 1
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// اطمینان از اینکه هر کاربر در هر گروه فقط یک تارگت فعال دارد
targetSchema.index({ tenantId: 1, telegramId: 1 }, { unique: true });

export const TargetModel = model<ITargetDocument>('Target', targetSchema);
