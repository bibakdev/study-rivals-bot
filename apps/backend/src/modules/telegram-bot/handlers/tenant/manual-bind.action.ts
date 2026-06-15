// apps/backend/src/modules/telegram-bot/handlers/tenant/manual-bind.action.ts

import { Context } from 'telegraf';
import { Update } from 'telegraf/types';
import mongoose from 'mongoose';
import { TenantModel } from '#modules/tenant/tenant.model';
import { logger } from '#utils/logger';
import { promoteToAdmin, generateEnrollmentKeyboard } from './tenant.utils';

export const handleManualBind = async (
  ctx: Context<Update>,
  chatId: number,
  telegramId: number,
  extractedTopicId: number | undefined,
  botUsername: string,
  replyOptions: object
): Promise<void> => {
  try {
    const boundLicense = await TenantModel.findOneAndUpdate(
      { mainAdminId: telegramId, isBound: false, isActive: false },
      {
        $set: {
          chatId,
          topicId: extractedTopicId,
          isBound: true,
          isActive: true,
          activatedAt: new Date()
        }
      },
      { new: true }
    );

    if (!boundLicense) {
      const existingActive = await TenantModel.findOne({
        chatId,
        isActive: true
      }).lean();

      if (existingActive) {
        await ctx.reply(
          '🤖 ربات پیش از این در این گروه فعال و پیکربندی شده است.',
          replyOptions
        );
      } else {
        await ctx.reply(
          '⚠️ **لایسنس معتبری یافت نشد!**\nشما هیچ لایسنس رزرو شده‌ای ندارید. لطفاً ابتدا لایسنس خود را در **پی‌وی ربات** ارسال کنید.',
          replyOptions
        );
      }
      return;
    }

    // آپدیت معماری: انتقال شناسه مستأجر برای ایجاد رکورد نقش اختصاصی گروه
    await promoteToAdmin(
      telegramId,
      ctx,
      boundLicense._id as mongoose.Types.ObjectId
    );

    logger.info(
      `Tenant bound from reservation. ChatId: ${chatId}, TopicId: ${extractedTopicId}`
    );

    await ctx.reply(
      '🚀 **ربات مطالعاتی با موفقیت فعال و متصل شد!**\n\n' +
        `این تاپیک به عنوان کانال رسمی اعلان‌های پلتفرم قفل گردید.\n\n` +
        '🎯 کاربران محترم این گروه می‌توانند با کلیک روی دکمه اختصاصی زیر، فرآیند احراز هویت و دریافت پنل مینی‌اپ خود را آغاز کنند:',
      {
        ...replyOptions,
        reply_markup: generateEnrollmentKeyboard(
          botUsername,
          boundLicense._id as mongoose.Types.ObjectId
        )
      }
    );
  } catch (mongoError: unknown) {
    const dbError = mongoError as { code?: number };
    if (dbError.code === 11000) {
      await ctx.reply(
        '❌ این گروه قبلاً توسط شخص یا لایسنس دیگری فعال شده است و امکان اتصال مجدد وجود ندارد.',
        replyOptions
      );
    } else {
      throw mongoError;
    }
  }
};
