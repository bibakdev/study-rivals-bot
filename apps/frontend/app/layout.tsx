// apps/frontend/app/layout.tsx

import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import Script from 'next/script';
import { TelegramProvider } from '@providers/TelegramProvider';
import { QueryProvider } from '@providers/QueryProvider';
import './globals.css';

const customFont = localFont({
  src: [
    {
      path: '../public/fonts/IRANSansDN-Bold.woff2',
      weight: '700',
      style: 'normal'
    },
    {
      path: '../public/fonts/IRANSansDN-Light.woff2',
      weight: '300',
      style: 'normal'
    },
    {
      path: '../public/fonts/IRANSansDN.woff2',
      weight: '400',
      style: 'normal'
    }
  ],
  variable: '--font-custom',
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'Study Rivals',
  description: 'پلتفرم مدیریت چالش‌های مطالعاتی'
};

// 👈 اضافه کردن Viewport برای مشکی کردن بخش‌های حاشیه‌ای مرورگر و تلگرام
export const viewport: Viewport = {
  themeColor: '#030712',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fa"
      dir="rtl"
      className={`${customFont.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <Script src="/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body
        className="min-h-full flex flex-col bg-background text-foreground"
        suppressHydrationWarning
      >
        <QueryProvider>
          <TelegramProvider>{children}</TelegramProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
