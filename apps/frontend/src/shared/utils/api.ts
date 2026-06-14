import axios, {
  type InternalAxiosRequestConfig,
  type AxiosError,
  type AxiosResponse
} from 'axios';
import type { TelegramWebApp } from '@providers/TelegramProvider';

// قراردادهای پاسخی که از سمت بک‌اند می‌آید
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000 // 👈 هندل کردن Edge Case: جلوگیری از معلق ماندن ریکوئست در صورت کندی سرور
});

// اینترسپتور درخواست
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const initData = (window.Telegram.WebApp as TelegramWebApp).initData;
      if (initData) {
        config.headers.Authorization = `Bearer ${initData}`;
      }
    }
    return config;
  },
  (error: unknown) => Promise.reject(error)
);

// اینترسپتور پاسخ
apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiSuccessResponse<unknown>>) => {
    // 👈 اصل DRY: ریکوئست‌های ما مستقیماً ساختار data را برمی‌گردانند.
    // نیازی نیست در کانتینرها مدام response.data.data بنویسیم.
    return response.data.data as any;
  },
  (error: AxiosError<ApiErrorResponse>) => {
    // 👈 مدیریت Edge Cases: سرور داون شده، تایم‌اوت، یا خطای ساختاری غیر منتظره
    const fallbackError = {
      code: 'NETWORK_ERROR',
      message: 'ارتباط با سرور برقرار نشد. لطفاً اینترنت خود را بررسی کنید.'
    };

    // اگر رسپانس استانداردی از بک‌اند ما برگشته باشد آن را می‌گیریم، در غیر اینصورت خطای Fallback
    const standardError = error.response?.data?.error || fallbackError;

    // اینجا فقط آبجکت خطا را ریجکت می‌کنیم تا React Query مستقیماً به message دسترسی داشته باشد
    return Promise.reject(standardError);
  }
);
