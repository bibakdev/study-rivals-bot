// apps/frontend/src/shared/utils/api.ts

import axios, {
  type InternalAxiosRequestConfig,
  type AxiosError,
  type AxiosResponse
} from 'axios';
import type { TelegramWebApp } from '@providers/TelegramProvider';
import { useTenantStore } from '@stores/useTenantStore';

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

// 🛡️ تغییر حیاتی: اگر متغیر محیطی خالی بود، از مسیر نسبی ('') استفاده کن
// با این کار Axios تمام درخواست‌ها را به همان آدرس ngrok فرانت‌اَند شلیک می‌کند
const baseURL = process.env.NEXT_PUBLIC_API_URL || '';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000
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

    const tenantId = useTenantStore.getState().tenantId;
    if (tenantId) {
      config.headers['X-Tenant-Id'] = tenantId;
    }

    return config;
  },
  (error: unknown) => Promise.reject(error)
);

// اینترسپتور پاسخ
apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiSuccessResponse<unknown>>) => {
    return response.data.data as any;
  },
  (error: AxiosError<ApiErrorResponse>) => {
    const fallbackError = {
      code: 'NETWORK_ERROR',
      message: 'ارتباط با سرور برقرار نشد. لطفاً اینترنت خود را بررسی کنید.'
    };

    const standardError = error.response?.data?.error || fallbackError;
    return Promise.reject(standardError);
  }
);
