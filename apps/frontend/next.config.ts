// apps/frontend/next.config.ts

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // اجازه دادن به دامنه ngrok فرانت‌اَند
  allowedDevOrigins: [
    'upper-eternal-stuffing.ngrok-free.dev',
    'outbid-ducky-tightly.ngrok-free.dev', // در صورت تغییر دامنه، دامنه‌های جدید را اینجا اضافه کنید
    'localhost:3000'
  ],

  // 🛡️ ترفند طلایی پروکسی: هدایت تمام درخواست‌های api/ به سمت بک‌اَند لوکال
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:3001/api/:path*' // استفاده از 127.0.0.1 به جای localhost برای جلوگیری از باگ‌های IPv6 در Node
      }
    ];
  }
};

export default nextConfig;
