// apps/frontend/src/shared/stores/useTenantStore.ts

import { create } from 'zustand';

interface TenantState {
  tenantId: string | null;
  setTenantId: (id: string | null) => void;
}

// استخراج اولیه شناسه گروه از URL (اجرا فقط در سمت کلاینت)
const getInitialTenantId = (): string | null => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    return params.get('tenantId');
  }
  return null;
};

export const useTenantStore = create<TenantState>((set) => ({
  tenantId: getInitialTenantId(),
  setTenantId: (id) => set({ tenantId: id })
}));
