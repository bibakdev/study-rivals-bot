// apps/backend/src/app.ts

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import challengeRoutes from '#modules/challenge/challenge.routes';
import timeLogRoutes from '#modules/time-log/time-log.routes';
import targetRoutes from '#modules/target/target.routes'; // 👈 امپورت روت‌های جدید ماژول تارگت روزانه چالش
import { errorHandler } from '#core/middlewares/errorHandler';

const app: Application = express();

/**
 * 🛡️ فعال‌سازی کلاینت متقاطع (CORS Configuration)
 */
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Tenant-Id',
      'ngrok-skip-browser-warning'
    ]
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// نگاشت روت‌های تجاری پلتفرم مونو‌ریپو
app.use('/api/challenges', challengeRoutes);
app.use('/api/time-logs', timeLogRoutes);
app.use('/api/targets', targetRoutes); // 👈 اتصال زیرساخت کانترکت تارگت به وب‌سرور

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'API is running',
      timestamp: new Date().toISOString()
    }
  });
});

app.use(errorHandler);

export default app;
