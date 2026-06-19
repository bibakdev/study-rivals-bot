// apps/backend/src/modules/telegram-bot/utils/keyboards.util.ts

import { env } from '#config/env';

export const getWebAppMenuButton = (tenantId?: string) => {
  let finalUrl = env.MINI_APP_URL;

  if (tenantId) {
    const miniAppUrl = new URL(env.MINI_APP_URL);
    miniAppUrl.searchParams.set('tenantId', tenantId);
    finalUrl = miniAppUrl.toString();
  }

  return {
    type: 'web_app' as const,
    text: 'Open',
    web_app: { url: finalUrl }
  };
};

// ۱. کیبورد اصلی ربات (اضافه شدن دکمه مینی‌اپ در صدر کیبورد)
export const getStartKeyboard = (role: 'mother' | 'user' | string) => {
  // استفاده از any[][] برای جلوگیری از خطای تایپ‌اسکریپت بخاطر تفاوت ساختار دکمه‌های web_app و callback_data
  const baseKeyboard: any[][] = [
    [
      {
        text: '📱 ورود به مینی‌اپ',
        web_app: { url: env.MINI_APP_URL }
      }
    ],
    [
      {
        text: '⚙️ مدیریت گروه‌ها',
        callback_data: 'action_manage_groups'
      }
    ]
  ];

  // دکمه اختصاصی اکانت مادر همچنان حفظ می‌شود
  if (role === 'mother') {
    baseKeyboard.push([
      {
        text: '🔑 تولید لایسنس ۱ ساعته',
        callback_data: 'action_generate_license'
      }
    ]);
  }

  return { inline_keyboard: baseKeyboard };
};

// ۲. کیبورد زیرمنوی مدیریت گروه‌ها
export const getManageGroupsSubMenu = () => {
  return {
    inline_keyboard: [
      [
        {
          text: '➕ اضافه کردن ربات به گروه',
          callback_data: 'action_add_to_group'
        }
      ],
      [{ text: '👥 گروه‌های من', callback_data: 'action_my_groups' }],
      [{ text: '🔙 بازگشت به منوی اصلی', callback_data: 'action_back_to_main' }]
    ]
  };
};
