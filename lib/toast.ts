import { createRef } from 'react';

export interface ToastRef {
  show: (message: string, type: 'success' | 'error' | 'loading' | 'info', duration?: number) => void;
  hide: () => void;
}

export const toastRef = createRef<ToastRef>();

export const toast = {
  success: (message: string, duration?: number) => {
    toastRef.current?.show(message, 'success', duration);
  },
  error: (message: string, duration?: number) => {
    toastRef.current?.show(message, 'error', duration);
  },
  loading: (message: string, duration?: number) => {
    toastRef.current?.show(message, 'loading', duration);
  },
  info: (message: string, duration?: number) => {
    toastRef.current?.show(message, 'info', duration);
  },
  dismiss: () => {
    toastRef.current?.hide();
  }
};
