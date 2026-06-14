// apps/backend/src/app.ts

import express, { Application, Request, Response } from 'express';

const app: Application = express();

// Middlewares پایه
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// یک روت تستی برای بررسی سلامت سرور (Health Check) با رعایت استاندارد پاسخ‌های API
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'API is running',
      timestamp: new Date().toISOString()
    }
  });
});

export default app;
