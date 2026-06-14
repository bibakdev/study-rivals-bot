'use client';

import {
  createContext,
  useEffect,
  useState,
  useMemo,
  type ReactNode
} from 'react';

// تایپ‌ها دقیقاً مشابه قبل حفظ می‌شوند...
export interface TelegramUser {
  id: number;
  is_bot?: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: { user?: TelegramUser };
  colorScheme: 'light' | 'dark';
  ready: () => void;
  onEvent: (eventType: string, callback: () => void) => void;
  offEvent: (eventType: string, callback: () => void) => void;
  // ... سایر فیلدها
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}

export interface TelegramContextType {
  webApp: TelegramWebApp | null;
  user: TelegramUser | null;
  isReady: boolean;
}

export const TelegramContext = createContext<TelegramContextType>({
  webApp: null,
  user: null,
  isReady: false
});

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const app = window.Telegram.WebApp;
      app.ready();
      setWebApp(app);
      setIsReady(true);

      // هندل کردن تغییرات تِم پلتفرم تلگرام به صورت لایو و جلوگیری از Memory Leak
      const handleThemeChange = () => {
        // فورس آپدیت استیت برای اعمال تغییرات لایو
        setWebApp({ ...window.Telegram!.WebApp });
      };

      app.onEvent('themeChanged', handleThemeChange);

      // Cleanup function برای جلوگیری از Memory Leak
      return () => {
        app.offEvent('themeChanged', handleThemeChange);
      };
    }
  }, []);

  // 👈 رفع مشکل Performance: جلوگیری از ساخته شدن مجدد آبجکت در رندرهای غیرمرتبط
  const contextValue = useMemo<TelegramContextType>(
    () => ({
      webApp,
      user: webApp?.initDataUnsafe?.user ?? null,
      isReady
    }),
    [webApp, isReady]
  );

  return (
    <TelegramContext.Provider value={contextValue}>
      {children}
    </TelegramContext.Provider>
  );
}
