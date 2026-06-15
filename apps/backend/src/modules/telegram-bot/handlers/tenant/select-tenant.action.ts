// apps/backend/src/modules/telegram-bot/handlers/tenant/select-tenant.action.ts

import { Context } from 'telegraf';
import { env } from '#core/config/env';
import { logger } from '#utils/logger';

// برای اینکه تایپ اسکریپت `match` را از ریجکس اکشن دریافت کند، از یک اینترفیس تقاطعی استفاده می‌کنیم
export const handleSelectTenant = async (
  ctx: Context & { match: RegExpExecArray }
): Promise<void> => {
  try {
    // استخراج tenantId که در standard.action.ts با الگوی select_tenant_xxx ارسال شده بود
    const tenantId = ctx.match[1];

    if (!tenantId) {
      await ctx.answerCbQuery('❌ خطایی در تشخیص شناسه گروه رخ داد.', {
        show_alert: true
      });
      return;
    }

    // اضافه کردن پارامتر به URL با روش استاندارد و ایمن
    const miniAppUrl = new URL(env.MINI_APP_URL);
    miniAppUrl.searchParams.set('tenantId', tenantId);
    const finalUrl = miniAppUrl.toString();

    // تغییر دکمه اصلی ربات برای این کاربر خاص
    await ctx.setChatMenuButton({
      type: 'web_app',
      text: 'Open',
      web_app: { url: finalUrl }
    });

    // بستن حالت لودینگ دکمه شیشه‌ای
    await ctx.answerCbQuery('✅ گروه تنظیم شد!');

    // ارسال پیام نهایی درخواست ورود
    await ctx.reply(
      '✅ گروه انتخاب شد. حالا روی دکمه آبی‌رنگ **Open** کلیک کنید.',
      { parse_mode: 'Markdown' }
    );

    logger.info(
      `User ${ctx.from?.id} dynamically selected tenant ${tenantId} via inline keyboard.`
    );
  } catch (error) {
    logger.error('Error handling dynamic tenant selection:', error);
    await ctx.answerCbQuery('⚠️ خطایی رخ داد. لطفا دوباره تلاش کنید.', {
      show_alert: true
    });
  }
};
