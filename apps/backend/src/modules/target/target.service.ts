// apps/backend/src/modules/target/target.service.ts

import mongoose from 'mongoose';
import { TargetModel } from '#modules/target/target.model';
import { AppError } from '#utils/AppError';
import type { UpdateTargetRequestDto, TargetResponseDto } from 'shared-types';

export const setTargetService = async (
  telegramId: number,
  tenantId: string,
  data: UpdateTargetRequestDto
): Promise<TargetResponseDto> => {
  const tenantObjectId = new mongoose.Types.ObjectId(tenantId);
  const dailyMinutes = data.hours * 60 + data.minutes;

  const target = await TargetModel.findOneAndUpdate(
    { telegramId, tenantId: tenantObjectId },
    { $set: { dailyMinutes } },
    { upsert: true, new: true }
  );

  return {
    telegramId: target.telegramId,
    tenantId: target.tenantId.toString(),
    dailyMinutes: target.dailyMinutes
  };
};

export const getMyTargetService = async (
  telegramId: number,
  tenantId: string
): Promise<TargetResponseDto | null> => {
  const target = await TargetModel.findOne({
    telegramId,
    tenantId: new mongoose.Types.ObjectId(tenantId)
  }).lean();

  if (!target) return null;

  return {
    telegramId: target.telegramId,
    tenantId: target.tenantId.toString(),
    dailyMinutes: target.dailyMinutes
  };
};

export const deleteTargetService = async (
  telegramId: number,
  tenantId: string
): Promise<void> => {
  const tenantObjectId = new mongoose.Types.ObjectId(tenantId);

  const deletedTarget = await TargetModel.findOneAndDelete({
    telegramId,
    tenantId: tenantObjectId
  });

  if (!deletedTarget) {
    throw new AppError('تارگتی برای حذف یافت نشد.', 404, 'TARGET_NOT_FOUND');
  }
};
