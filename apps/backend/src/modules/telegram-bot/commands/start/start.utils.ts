import { Context } from 'telegraf';
import {
  getStartKeyboard,
  getWebAppMenuButton
} from '#modules/telegram-bot/utils/keyboards.util';

export const grantDashboardAccess = async (
  ctx: Context,
  welcomeMessage: string,
  role: 'mother' | 'main_admin' | 'sub_admin' | 'user' | 'guest'
): Promise<void> => {
  await ctx.setChatMenuButton(getWebAppMenuButton());
  await ctx.reply(welcomeMessage, { reply_markup: getStartKeyboard(role) });
};
