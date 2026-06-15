// apps/backend/src/modules/telegram-bot/utils/keyboards.util.ts

import { env } from '#config/env';

export const getWebAppMenuButton = () => ({
  type: 'web_app' as const,
  text: 'Open',
  web_app: { url: env.MINI_APP_URL }
});

export const getStartKeyboard = (
  role: 'mother' | 'main_admin' | 'sub_admin' | 'user' | 'guest'
) => {
  // هندل کردن وضعیت مهمان (بدون گروه)
  if (role === 'guest') {
    return {
      inline_keyboard: [
        [
          {
            text: '➕ اضافه کردن ربات به گروه خودم',
            callback_data: 'action_add_to_group'
          }
        ]
      ]
    };
  }

  const baseKeyboard = [
    [
      { text: '👤 پروفایل تلگرامی من', callback_data: 'action_profile' },
      { text: '❓ راهنمای چالش‌ها', callback_data: 'action_help' }
    ]
  ];

  if (role === 'mother') {
    return {
      inline_keyboard: [
        ...baseKeyboard,
        [
          {
            text: '🔑 تولید لایسنس ۱ ساعته',
            callback_data: 'action_generate_license'
          }
        ]
      ]
    };
  }

  return { inline_keyboard: baseKeyboard };
};
