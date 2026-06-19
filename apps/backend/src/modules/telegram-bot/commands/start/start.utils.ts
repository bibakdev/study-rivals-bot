import { Context } from 'telegraf';
import {
  getStartKeyboard,
  getWebAppMenuButton
} from '#modules/telegram-bot/utils/keyboards.util';

export const grantDashboardAccess = async (
  ctx: Context,
  welcomeMessage: string,
  role: 'mother' | 'main_admin' | 'sub_admin' | 'user' | 'guest',
  tenantId?: string // 👈 پارامتر جدید اضافه شد
): Promise<void> => {
  await ctx.setChatMenuButton(getWebAppMenuButton(tenantId)); // 👈 تزریق شناسه
  await ctx.reply(welcomeMessage, { reply_markup: getStartKeyboard(role) });
};
