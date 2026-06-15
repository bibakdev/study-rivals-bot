// apps/backend/src/modules/telegram-bot/handlers/tenant.handler.ts

import { Context } from 'telegraf';
import { message } from 'telegraf/filters';
import mongoose from 'mongoose';
import { TenantModel } from '#modules/tenant/tenant.model';
import { UserModel } from '#modules/auth/user.model';
import { logger } from '#utils/logger';
import { Update } from 'telegraf/types';

interface ThreadMessage {
  message_thread_id?: number;
}

// مدیریت Edge Case: برگرداندن undefined به جای null جهت پیشگیری از خطای تایپ در Mongoose
const getTopicId = (ctx: Context<Update>): number | undefined => {
  if (ctx.message && 'message_thread_id' in ctx.message) {
    const msg = ctx.message as ThreadMessage;
    return typeof msg.message_thread_id === 'number'
      ? msg.message_thread_id
      : undefined;
  }
  return undefined;
};

// رعایت DRY: ماژولار کردن تولید لینک عمیق برای گروه‌ها
const generateEnrollmentKeyboard = (
  botUsername: string,
  tenantId: mongoose.Types.ObjectId
) => {
  if (!botUsername) throw new Error('CRITICAL: Bot username is undefined');
  return {
    inline_keyboard: [
      [
        {
          text: '🎯 ثبت‌نام و ورود به چالش',
          url: `https://t.me/${botUsername}?start=ref_${tenantId.toString()}`
        }
      ]
    ]
  };
};

const promoteToAdmin = async (
  telegramId: number,
  ctx: Context<Update>
): Promise<void> => {
  await UserModel.findOneAndUpdate(
    { telegramId },
    {
      $set: { role: 'main_admin' },
      $setOnInsert: {
        firstName: ctx.from?.first_name || 'ادمین',
        lastName: ctx.from?.last_name,
        username: ctx.from?.username,
        languageCode: ctx.from?.language_code
      }
    },
    { upsert: true }
  );
};

export const handleGroupTenantMessages = async (
  ctx: Context<Update>,
  next: () => Promise<void>
): Promise<void> => {
  if (!ctx.has(message('text')) || !ctx.chat) return next();

  const chatType = ctx.chat.type;
  if (chatType !== 'group' && chatType !== 'supergroup') return next();

  const chatId = ctx.chat.id;
  const telegramId = ctx.from?.id;
  const rawText = ctx.message.text.trim().toUpperCase();

  if (!telegramId) return next();
  if (rawText !== 'START' && rawText !== '/START') return next();

  try {
    const extractedTopicId = getTopicId(ctx);
    const replyOptions = { message_thread_id: extractedTopicId };

    const botUsername = ctx.botInfo?.username;
    if (!botUsername) {
      logger.error(
        'Bot info is missing from context. Cannot generate deep link.'
      );
      return;
    }

    const currentUser = await UserModel.findOne({ telegramId }).lean();
    const isMother = currentUser?.role === 'mother';

    if (isMother) {
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
        return;
      } catch (error: unknown) {
        logger.error('Error during Mother auto-binding:', error);
        return;
      }
    }

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

      await promoteToAdmin(telegramId, ctx);

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
  } catch (error) {
    logger.error(
      'Critical Error during group tenant single-step binding:',
      error
    );
  }
};
