import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 👈 اضافه کردن این بخش برای اجازه دادن به تونل
  allowedDevOrigins: [
    'upper-eternal-stuffing.ngrok-free.dev', // آدرس فعلی تونل شما
    'localhost:3000'
  ]
};

export default nextConfig;
