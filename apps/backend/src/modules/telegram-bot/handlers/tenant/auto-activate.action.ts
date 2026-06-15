import { Context } from 'telegraf';
import { Update } from 'telegraf/types';
import mongoose from 'mongoose';
import { TenantModel } from '#modules/tenant/tenant.model';
import { logger } from '#utils/logger';
import { generateEnrollmentKeyboard } from './tenant.utils';

export const handleAutoActivate = async (
  ctx: Context<Update>,
  chatId: number,
  telegramId: number,
  extractedTopicId: number | undefined,
  botUsername: string,
  replyOptions: object
): Promise<void> => {
  try {
    const autoMotherLicense = `MOTH-AUTO-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    const tenant = await TenantModel.findOneAndUpdate(
      { chatId },
      {
        $set: {
          topicId: extractedTopicId,
          isBound: true,
          isActive: true,
          activatedAt: new Date()
        },
        $setOnInsert: {
          licenseCode: autoMotherLicense,
          mainAdminId: telegramId
        }
      },
      { upsert: true, new: true }
    );

    logger.info(`Auto-activation by Mother Account. ChatId: ${chatId}`);
    await ctx.reply(
      '👑 **تشخیص هویت: اکانت مادر**\n' +
        'گروه و تاپیک شما با موفقیت شناسایی و به صورت اتوماتیک در سیستم فعال گردید.\n\n' +
        '🎯 اعضای محترم گروه جهت ثبت‌نام و ورود به پنل چالش مطالعاتی می‌توانند از لینک اختصاصی زیر استفاده کنند:',
      {
        ...replyOptions,
        reply_markup: generateEnrollmentKeyboard(
          botUsername,
          tenant._id as mongoose.Types.ObjectId
        )
      }
    );
  } catch (error: unknown) {
    logger.error('Error during Mother auto-binding:', error);
  }
};
