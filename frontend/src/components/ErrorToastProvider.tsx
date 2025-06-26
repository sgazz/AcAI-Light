'use client';

import React, { createContext, useContext } from 'react';
import ErrorToast, { useToast } from './ErrorToast';

interface ErrorToastContextProps {
  showError: (message: string, title?: string, showRetry?: boolean, onRetry?: () => void) => void;
  showSuccess: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
}

const ErrorToastContext = createContext<ErrorToastContextProps | undefined>(undefined);

export function useErrorToast() {
  const ctx = useContext(ErrorToastContext);
  if (!ctx) throw new Error('useErrorToast must be used within ErrorToastProvider');
  return ctx;
}

export const ErrorToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const toast = useToast();

  return (
    <ErrorToastContext.Provider
      value={{
        showError: toast.showError,
        showSuccess: toast.showSuccess,
        showWarning: toast.showWarning,
        showInfo: toast.showInfo,
      }}
    >
      {children}
      {/* Render all active toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toast.toasts.map(t => (
          <ErrorToast key={t.id} {...t} />
        ))}
      </div>
    </ErrorToastContext.Provider>
  );
}; 