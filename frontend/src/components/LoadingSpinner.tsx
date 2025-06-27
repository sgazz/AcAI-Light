'use client';

import { FaSpinner } from 'react-icons/fa';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'dots' | 'pulse';
  text?: string;
  className?: string;
}

export default function LoadingSpinner({ 
  size = 'md', 
  variant = 'spinner', 
  text,
  className = '' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const renderSpinner = () => {
    switch (variant) {
      case 'dots':
        return (
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        );
      case 'pulse':
        return (
          <div className={`${sizeClasses[size]} bg-blue-400 rounded-full animate-pulse`}></div>
        );
      default:
        return (
          <div className={`animate-spin rounded-full border-2 border-[var(--border-color)] border-t-[var(--accent-blue)] ${sizeClasses[size]}`} />
        );
    }
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      {renderSpinner()}
      {text && (
        <span className="ml-3 text-sm text-[var(--text-secondary)]">{text}</span>
      )}
    </div>
  );
}

// Skeleton loading komponenta
interface SkeletonProps {
  className?: string;
  lines?: number;
}

export function Skeleton({ className = '', lines = 1 }: SkeletonProps) {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="h-4 bg-gray-700 rounded mb-2"
          style={{ 
            width: `${Math.random() * 40 + 60}%`,
            animationDelay: `${index * 0.1}s`
          }}
        ></div>
      ))}
    </div>
  );
}

// Loading overlay komponenta
interface LoadingOverlayProps {
  isVisible: boolean;
  text?: string;
  backdrop?: boolean;
}

export function LoadingOverlay({ isVisible, text = 'Učitavanje...', backdrop = true }: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${backdrop ? 'bg-black bg-opacity-50' : ''}`}>
      <div className="bg-[#1a2332] rounded-xl p-8 shadow-lg">
        <LoadingSpinner size="lg" text={text} />
      </div>
    </div>
  );
}

// Progress bar komponenta
interface ProgressBarProps {
  progress: number; // 0-100
  text?: string;
  className?: string;
}

export function ProgressBar({ progress, text, className = '' }: ProgressBarProps) {
  return (
    <div className={`w-full ${className}`}>
      {text && (
        <div className="flex justify-between text-sm text-gray-300 mb-2">
          <span>{text}</span>
          <span>{Math.round(progress)}%</span>
        </div>
      )}
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className="bg-blue-400 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
} 