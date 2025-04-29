"use client";

import { X } from 'lucide-react';
import React from 'react';
import { cn } from '@/lib/utils';
import { Toast as ToastType, ToastVariant } from './use-toast';

interface ToastProps extends Omit<ToastType, 'id'> {
  id: string;
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({
  id,
  title,
  description,
  variant = 'default',
  onDismiss,
}) => {
  const variantStyles: Record<ToastVariant, string> = {
    default: 'bg-white border-gray-200',
    success: 'bg-green-50 border-green-200 text-green-600',
    error: 'bg-red-50 border-red-200 text-red-600',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
  };

  return (
    <div
      className={cn(
        'w-full max-w-md rounded-lg border p-4 shadow-lg',
        variantStyles[variant]
      )}
      role="alert"
    >
      <div className="flex items-start justify-between">
        <div>
          {title && <h3 className="font-medium">{title}</h3>}
          {description && <p className="mt-1 text-sm">{description}</p>}
        </div>
        <button
          type="button"
          className="ml-4 inline-flex shrink-0 rounded-md p-1 hover:bg-gray-100"
          onClick={() => onDismiss(id)}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Закрыть</span>
        </button>
      </div>
    </div>
  );
};

export const ToastContainer: React.FC<{ toasts: ToastType[]; onDismiss: (id: string) => void }> = ({
  toasts,
  onDismiss,
}) => {
  return (
    <div className="fixed bottom-0 right-0 z-50 m-4 flex flex-col space-y-4">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          title={toast.title}
          description={toast.description}
          variant={toast.variant}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}; 