import type { Metadata } from 'next';
import localFont from 'next/font/local';
import Script from 'next/script';
import { TelegramProvider } from '@providers/TelegramProvider';
import { QueryProvider } from '@providers/QueryProvider';
import './globals.css';

const customFont = localFont({
  src: [
    {
      path: '../public/fonts/IRANSansDN-Bold.woff2', // مسیر فایل وزن معمولی
      weight: '700',
      style: 'normal'
    },
    {
      path: '../public/fonts/IRANSansDN-Light.woff2', // مسیر فایل وزن بولد
      weight: '300',
      style: 'normal'
    },
    {
      path: '../public/fonts/IRANSansDN.woff2', // مسیر فایل وزن بولد
      weight: '400',
      style: 'normal'
    }
  ],
  variable: '--font-custom', // یک نام دلخواه برای متغیر CSS فونت
  display: 'swap' // جلوگیری از نامرئی شدن متن در زمان لود فونت
});

export const metadata: Metadata = {
  title: 'Study Rivals',
  description: 'پلتفرم مدیریت چالش‌های مطالعاتی'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 👇 ۱. اضافه کردن suppressHydrationWarning به تگ html
    <html
      lang="fa"
      dir="rtl"
      className={`${customFont.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      {/* 👇 ۲. اضافه کردن suppressHydrationWarning به تگ body */}
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
