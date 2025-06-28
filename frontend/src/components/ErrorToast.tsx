'use client';

import { useState, useEffect } from 'react';
import { FaTimes, FaExclamationTriangle, FaExclamationCircle, FaCheckCircle, FaInfoCircle } from 'react-icons/fa';

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

  const getToastConfig = () => {
    switch (type) {
      case 'error':
        return {
          bgGradient: 'from-red-500/20 to-red-600/20',
          borderColor: 'border-red-500/30',
          iconBg: 'from-red-500 to-red-600',
          icon: <FaExclamationTriangle className="text-white" size={20} />,
          titleColor: 'text-red-400',
          glowColor: 'from-red-500/20 to-red-600/20'
        };
      case 'warning':
        return {
          bgGradient: 'from-yellow-500/20 to-orange-500/20',
          borderColor: 'border-yellow-500/30',
          iconBg: 'from-yellow-500 to-orange-500',
          icon: <FaExclamationCircle className="text-white" size={20} />,
          titleColor: 'text-yellow-400',
          glowColor: 'from-yellow-500/20 to-orange-500/20'
        };
      case 'success':
        return {
          bgGradient: 'from-green-500/20 to-emerald-500/20',
          borderColor: 'border-green-500/30',
          iconBg: 'from-green-500 to-emerald-600',
          icon: <FaCheckCircle className="text-white" size={20} />,
          titleColor: 'text-green-400',
          glowColor: 'from-green-500/20 to-emerald-500/20'
        };
      default:
        return {
          bgGradient: 'from-blue-500/20 to-purple-500/20',
          borderColor: 'border-blue-500/30',
          iconBg: 'from-blue-500 to-purple-600',
          icon: <FaInfoCircle className="text-white" size={20} />,
          titleColor: 'text-blue-400',
          glowColor: 'from-blue-500/20 to-purple-500/20'
        };
    }
  };

  const config = getToastConfig();

  return (
    <div
      className={`fixed top-4 right-4 z-50 transform transition-all duration-500 ease-out ${
        isVisible ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'
      }`}
      style={{ animationDelay: '0ms' }}
    >
      {/* Premium Toast sa Glassmorphism */}
      <div className={`relative group max-w-md`}>
        {/* Glow effect */}
        <div className={`absolute inset-0 bg-gradient-to-r ${config.glowColor} rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
        
        {/* Main toast container */}
        <div className={`relative bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-2xl rounded-2xl border ${config.borderColor} shadow-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl`}>
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 animate-pulse"></div>
            <div className="absolute top-1/4 right-1/4 w-16 h-16 bg-blue-400/10 rounded-full blur-xl animate-bounce"></div>
          </div>

          <div className="relative flex items-start gap-4">
            {/* Premium Icon */}
            <div className="relative flex-shrink-0">
              <div className={`p-3 bg-gradient-to-br ${config.iconBg} rounded-2xl shadow-lg`}>
                {config.icon}
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-pulse"></div>
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              {title && (
                <h3 className={`text-lg font-bold ${config.titleColor} mb-2 bg-gradient-to-r ${config.titleColor} bg-clip-text text-transparent`}>
                  {title}
                </h3>
              )}
              <p className="text-sm text-white leading-relaxed font-medium">
                {message}
              </p>
              
              {showRetry && onRetry && (
                <button
                  onClick={onRetry}
                  className="mt-3 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 font-semibold text-xs shadow-lg hover:shadow-xl hover:scale-105"
                >
                  Pokušaj ponovo
                </button>
              )}
            </div>
            
            {/* Close button */}
            <button
              onClick={() => {
                setIsVisible(false);
                setTimeout(onClose, 300);
              }}
              className="flex-shrink-0 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300 group/close"
              title="Zatvori"
            >
              <FaTimes size={16} className="group-hover/close:rotate-90 transition-transform duration-300" />
            </button>
          </div>
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