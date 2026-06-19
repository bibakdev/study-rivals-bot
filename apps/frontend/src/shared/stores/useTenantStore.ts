// apps/frontend/src/shared/stores/useTenantStore.ts

import { create } from 'zustand';

interface TenantState {
  tenantId: string | null;
  setTenantId: (id: string | null) => void;
}

// استخراج اولیه شناسه از URL کلاینت تلگرام یا حافظه محلی مرورگر
const getInitialTenantId = (): string | null => {
  if (typeof window !== 'undefined') {
    // اولویت اول: خواندن مستقیم از پارامترهای آدرس لینک دعوت
    const params = new URLSearchParams(window.location.search);
    const urlTenantId = params.get('tenantId');
    if (urlTenantId) {
      localStorage.setItem('last_selected_tenant_id', urlTenantId);
      return urlTenantId;
    }

    // اولویت دوم: خواندن آخرین انتخاب کاربر از حافظه محلی
    return localStorage.getItem('last_selected_tenant_id');
  }
  return null;
};

export const useTenantStore = create<TenantState>((set) => ({
  tenantId: getInitialTenantId(),
  setTenantId: (id) =>
    set(() => {
      if (typeof window !== 'undefined') {
        if (id) {
          localStorage.setItem('last_selected_tenant_id', id);
        } else {
          localStorage.removeItem('last_selected_tenant_id');
        }
      }
      return { tenantId: id };
    })
}));
