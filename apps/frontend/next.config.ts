import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // اجازه دادن به دامنه ngrok فرانت‌اَند
  allowedDevOrigins: ['outbid-ducky-tightly.ngrok-free.dev', 'localhost:3000'],

  // 🛡️ ترفند طلایی پروکسی: هدایت تمام درخواست‌های api/ به سمت بک‌اَند لوکال فقط در محیط توسعه
  async rewrites() {
    // در محیط پروداکشن (ورسل) هیچ پروکسی‌ای اعمال نمی‌شود تا درخواست مستقیم به Render برود
    if (process.env.NODE_ENV === 'production') {
      return [];
    }

    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:3001/api/:path*'
      }
    ];
  }
};

export default nextConfig;
