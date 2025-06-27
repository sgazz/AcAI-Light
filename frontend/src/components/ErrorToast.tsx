'use client';

import { useState, useEffect } from 'react';
import { FaTimes, FaExclamationTriangle, FaExclamationCircle, FaCheckCircle } from 'react-icons/fa';

export type ToastType = 'error' | 'warning' | 'info' | 'success';

interface ToastProps {
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
  onClose: () => void;
  showRetry?: boolean;
  onRetry?: () => void;
}

export default function ErrorToast({ 
  type, 
  message, 
  title, 
  duration = 5000, 
  onClose, 
  showRetry = false,
  onRetry 
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for animation
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getBgColor = () => {
    switch (type) {
      case 'error':
        return 'bg-[var(--accent-red)]/10 border-[var(--accent-red)]';
      case 'warning':
        return 'bg-[var(--accent-yellow)]/10 border-[var(--accent-yellow)]';
      case 'success':
        return 'bg-[var(--accent-green)]/10 border-[var(--accent-green)]';
      default:
        return 'bg-[var(--accent-green)]/10 border-[var(--accent-green)]';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'error':
        return <FaExclamationTriangle className="text-[var(--accent-red)]" size={20} />;
      case 'warning':
        return <FaExclamationCircle className="text-[var(--accent-yellow)]" size={20} />;
      case 'success':
        return <FaCheckCircle className="text-[var(--accent-green)]" size={20} />;
      default:
        return <FaExclamationCircle className="text-[var(--accent-blue)]" size={20} />;
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'error':
        return 'text-[var(--accent-red)]';
      case 'warning':
        return 'text-[var(--accent-yellow)]';
      case 'success':
        return 'text-[var(--accent-green)]';
      default:
        return 'text-[var(--accent-green)]';
    }
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 transform transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className={`${getBgColor()} border rounded-lg p-4 shadow-lg backdrop-blur-sm max-w-md`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {getIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className={`text-sm font-semibold ${getTextColor()} mb-1`}>
                {title}
              </h3>
            )}
            <p className="text-sm text-[var(--text-primary)] leading-relaxed">
              {message}
            </p>
            
            {showRetry && onRetry && (
              <button
                onClick={onRetry}
                className="mt-2 text-xs text-[var(--accent-blue)] hover:text-[var(--accent-blue)]/80 underline"
              >
                Pokušaj ponovo
              </button>
            )}
          </div>
          
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="flex-shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <FaTimes size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Toast manager hook
export function useToast() {
  const [toasts, setToasts] = useState<Array<ToastProps & { id: string }>>([]);

  const addToast = (toast: Omit<ToastProps, 'onClose'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id, onClose: () => removeToast(id) };
    setToasts(prev => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const showError = (message: string, title?: string, showRetry?: boolean, onRetry?: () => void) => {
    addToast({ type: 'error', message, title, showRetry, onRetry });
  };

  const showSuccess = (message: string, title?: string) => {
    addToast({ type: 'success', message, title });
  };

  const showWarning = (message: string, title?: string) => {
    addToast({ type: 'warning', message, title });
  };

  const showInfo = (message: string, title?: string) => {
    addToast({ type: 'info', message, title });
  };

  return {
    toasts,
    showError,
    showSuccess,
    showWarning,
    showInfo,
    removeToast
  };
} 