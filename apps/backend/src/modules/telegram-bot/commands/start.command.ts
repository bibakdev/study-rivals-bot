import { Context } from 'telegraf';

export const startCommand = async (ctx: Context): Promise<void> => {
  // آدرس مینی‌اپ خود را اینجا قرار دهید (مثلاً آدرس ngrok در زمان توسعه)
  const miniAppUrl = process.env.MINI_APP_URL || 'https://google.com';

  await ctx.reply('به سرزمین چالش ها خوش امدید', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🎯 ورود به اپلیکیشن', web_app: { url: miniAppUrl } }]
      ]
    }
  });
};
