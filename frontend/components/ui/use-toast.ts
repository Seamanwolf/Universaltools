"use client";

import { useToast as useToastProvider } from './toast-provider';

export type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

export const useToast = () => {
  const { toast, dismiss, toasts } = useToastProvider();

  return {
    toast: (props: Omit<Toast, 'id'>) => toast(props),
    dismiss,
    toasts,
  };
}; 