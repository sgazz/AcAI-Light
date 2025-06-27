'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { FaExclamationTriangle, FaRedo, FaHome } from 'react-icons/fa';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
          <div className="bg-[var(--bg-secondary)] rounded-xl p-8 max-w-md w-full text-center border border-[var(--border-color)]">
            <div className="text-[var(--accent-red)] mb-4">
              <FaExclamationTriangle size={48} />
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">
              Nešto je pošlo naopako
            </h1>
            <p className="text-[var(--text-secondary)] mb-6">
              Došlo je do neočekivane greške. Molimo vas da osvežite stranicu ili kontaktirajte podršku.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-[var(--accent-blue)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--accent-blue)]/80 transition-colors"
              >
                Osveži stranicu
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: undefined })}
                className="w-full px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
              >
                Pokušaj ponovo
              </button>
            </div>
            {this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-sm text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-primary)]">
                  Detalji greške
                </summary>
                <pre className="mt-2 p-3 bg-[var(--bg-tertiary)] rounded text-xs text-[var(--text-secondary)] overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
} 