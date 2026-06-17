// apps/backend/src/modules/telegram-bot/handlers/tenant/my-groups.action.ts

import { Context, Markup } from 'telegraf';
import { getUserActiveTenants } from '#modules/telegram-bot/services/user-tenants.service';
import { logger } from '#utils/logger';

export const handleMyGroupsRequest = async (ctx: Context): Promise<void> => {
  try {
    const telegramId = ctx.from?.id;

    if (!telegramId) {
      await ctx
        .answerCbQuery('❌ خطای احراز هویت.', { show_alert: true })
        .catch(() => {});
      return;
    }

    const tenants = await getUserActiveTenants(telegramId);

    // بستن حالت لودینگ دکمه شیشه‌ای
    await ctx.answerCbQuery().catch((err) => {
      logger.warn(
        `Ignored answerCbQuery error in my-groups: ${err.description}`
      );
    });

    if (tenants.length === 0) {
      await ctx
        .editMessageText(
          '❌ شما در حال حاضر در هیچ چالشی عضو نیستید.\n\nاز طریق منوی قبل می‌توانید ربات را به گروه خود اضافه کنید.',
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '🔙 بازگشت به منوی اصلی',
                    callback_data: 'action_back_to_main'
                  }
                ]
              ]
            }
          }
        )
        .catch((err) => {
          if (!err.description?.includes('message is not modified')) {
            throw err;
          }
        });
      return;
    }

    // استفاده از Promise.all برای دریافت همزمان نام تمام گروه‌ها از سرور تلگرام
    const buttons = await Promise.all(
      tenants.map(async (tenant, index) => {
        let groupName = `چالش ${index + 1}`;

        // اگر چت آیدی وجود داشت، نام واقعی گروه را از تلگرام می‌گیریم
        if (tenant.chatId) {
          try {
            const chatInfo = await ctx.telegram.getChat(tenant.chatId);
            if ('title' in chatInfo) {
              groupName = chatInfo.title;
            } else {
              groupName = `گروه ${tenant.chatId}`;
            }
          } catch (error) {
            // در صورتی که ربات از گروه حذف شده باشد یا دسترسی نداشته باشد
            groupName = `گروه ${tenant.chatId}`;
          }
        }

        return [
          Markup.button.callback(
            groupName,
            `select_tenant_${tenant._id.toString()}`
          )
        ];
      })
    );

    // اضافه کردن دکمه بازگشت به انتهای لیست
    buttons.push([
      Markup.button.callback('🔙 بازگشت به منوی اصلی', 'action_back_to_main')
    ]);

    // ویرایش پیام فعلی
    await ctx
      .editMessageText(
        '👥 **لیست چالش‌های شما:**\nلطفاً گروه مورد نظر خود را برای ورود انتخاب کنید:',
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons }
        }
      )
      .catch((err) => {
        // 👈 نادیده گرفتن خطای بی‌خطر یکسان بودن پیام
        if (!err.description?.includes('message is not modified')) {
          throw err;
        }
      });
  } catch (error) {
    logger.error('Error handling my groups action:', error);
    await ctx
      .answerCbQuery('⚠️ خطایی رخ داد. لطفا دوباره تلاش کنید.', {
        show_alert: true
      })
      .catch(() => {});
  }
};
