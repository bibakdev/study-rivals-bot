// apps/backend/src/modules/telegram-bot/handlers/tenant.handler.ts

import { Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { TenantModel } from '#modules/tenant/tenant.model';
import { UserModel } from '#modules/auth/user.model';
import { logger } from '#utils/logger';

// یوتیلیتی استخراج امن TopicId (رعایت DRY)
const getTopicId = (ctx: Context): number | null => {
  if (ctx.message && 'message_thread_id' in ctx.message) {
    const threadId = (ctx.message as any).message_thread_id;
    return typeof threadId === 'number' ? threadId : null;
  }
  return null;
};

// یوتیلیتی آپسرت امن ادمین در دیتابیس کاربران
const promoteToAdmin = async (telegramId: number, ctx: Context) => {
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
  ctx: Context
): Promise<void> => {
  if (!ctx.has(message('text')) || !ctx.chat) return;

  const chatType = ctx.chat.type;
  if (chatType !== 'group' && chatType !== 'supergroup') return;

  const chatId = ctx.chat.id;
  const telegramId = ctx.from?.id;
  const rawText = ctx.message.text.trim().toUpperCase();

  if (!telegramId) return;
  if (rawText !== 'START' && rawText !== '/START') return;

  try {
    const extractedTopicId = getTopicId(ctx);
    const replyOptions = { message_thread_id: extractedTopicId || undefined };

    const currentUser = await UserModel.findOne({ telegramId });
    const isMother = currentUser?.role === 'mother';

    // ------------------------------------------------------------------
    // جریان اکانت مادر: Upsert اتمیک
    // ------------------------------------------------------------------
    if (isMother) {
      try {
        const autoMotherLicense = `MOTH-AUTO-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

        await TenantModel.findOneAndUpdate(
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
            'گروه و تاپیک شما با موفقیت شناسایی و به صورت اتوماتیک در سیستم فعال گردید.',
          replyOptions
        );
        return;
      } catch (error) {
        logger.error('Error during Mother auto-binding:', error);
        return;
      }
    }

    // ------------------------------------------------------------------
    // جریان کاربران عادی: بایندینگ اتمیک رزرو (جلوگیری از Race Condition دوال‌گروپ)
    // ------------------------------------------------------------------
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
        // چک کردن اینکه آیا شاید این کاربر قبلاً همین گروه را فعال کرده؟
        const existingActive = await TenantModel.findOne({
          chatId,
          isActive: true
        });
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
          `این تاپیک به عنوان کانال رسمی اعلان‌های پلتفرم قفل گردید.\n` +
          '📥 جهت شرکت در چالش‌ها و ثبت آمار، به پیوی ربات یا مینی‌اپ مراجعه فرمایید.',
        replyOptions
      );
    } catch (mongoError: any) {
      // هندل کردن خطای مسابقه پردازش: اختصاص یک لایسنس به گروهی که قبلاً اکتیو شده
      if (mongoError.code === 11000) {
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
