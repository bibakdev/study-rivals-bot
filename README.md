# Telegram Study Challenge Platform (Monorepo)

این سیستم یک پلتفرم مبتنی بر ربات تلگرام و Mini-App برای مدیریت رقابت‌ها و چالش‌های مطالعاتی است که به صورت Multi-Tenant طراحی شده است.

## ساختار مونو‌ریپو

پروژه به بخش‌های زیر تقسیم شده است:

- **`apps/frontend`**: مینی‌اپ تلگرام توسعه‌یافته با Next.js (App Router) و Tailwind CSS v4.
- **`apps/backend`**: سرویس هسته و ربات تلگرام توسعه‌یافته با Express.js و Telegraf (متصل به MongoDB).
- **`packages/shared-types`**: قراردادهای API (DTOs) و تایپ‌های اشتراکی بین بک‌اند و فرانت‌اند برای حفظ یکپارچگی.

## پیش‌نیازها

- Node.js >= 20.0.0
- MongoDB
- توکن ربات تلگرام

## نصب و راه‌اندازی

۱. نصب وابستگی‌های تمام پکیج‌ها و برنامه‌ها:
\`\`\`bash
npm install
\`\`\`

۲. اجرای پروژه در محیط توسعه (Development):
\`\`\`bash

# اجرای همزمان تمامی سرویس‌ها

npm run dev

# اجرای مجزای سرویس‌ها

npm run dev:frontend
npm run dev:backend
\`\`\`
