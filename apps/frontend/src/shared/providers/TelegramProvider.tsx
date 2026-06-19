// apps/frontend/src/shared/providers/TelegramProvider.tsx

'use client';

import {
  createContext,
  useEffect,
  useState,
  useMemo,
  type ReactNode
} from 'react';

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
  expand: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  onEvent: (eventType: string, callback: () => void) => void;
  offEvent: (eventType: string, callback: () => void) => void;
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

      // 👈 یکپارچه‌سازی رنگ هدر و فوتر بومی تلگرام با تم اپلیکیشن
      try {
        app.setHeaderColor('#030712');
        app.setBackgroundColor('#030712');
      } catch (error) {
        console.warn('Failed to set Telegram theme colors', error);
      }

      setWebApp(app);
      setIsReady(true);

      const handleThemeChange = () => {
        // اعمال مجدد در صورت تغییر تم تلگرام توسط کاربر
        try {
          app.setHeaderColor('#030712');
          app.setBackgroundColor('#030712');
        } catch (e) {}

        setWebApp({ ...window.Telegram!.WebApp });
      };

      app.onEvent('themeChanged', handleThemeChange);

      return () => {
        app.offEvent('themeChanged', handleThemeChange);
      };
    }
  }, []);

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
