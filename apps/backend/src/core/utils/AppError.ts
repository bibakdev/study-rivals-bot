// apps/backend/src/core/utils/AppError.ts

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number,
    errorCode: string = 'INTERNAL_ERROR',
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;

    // حفظ Stack Trace برای دیباگ دقیق‌تر
    Error.captureStackTrace(this, this.constructor);
  }
}
