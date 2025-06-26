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
        <div className="min-h-screen bg-[#10182a] flex items-center justify-center p-4">
          <div className="bg-[#1a2332] rounded-xl p-8 max-w-md w-full text-center">
            <div className="text-red-400 text-6xl mb-4">
              <FaExclamationTriangle className="mx-auto" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">
              Ups! Nešto je pošlo naopako
            </h1>
            <p className="text-gray-400 mb-6">
              Došlo je do neočekivane greške. Molimo pokušajte ponovo.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left mb-6">
                <summary className="text-blue-400 cursor-pointer mb-2">
                  Detalji greške (samo za razvoj)
                </summary>
                <div className="bg-[#151c2c] p-4 rounded-lg text-sm text-red-300 font-mono overflow-auto">
                  <div className="mb-2">
                    <strong>Greška:</strong> {this.state.error.message}
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <strong>Stack trace:</strong>
                      <pre className="mt-2 text-xs">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
            
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FaRedo size={14} />
                Pokušaj ponovo
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <FaHome size={14} />
                Početna strana
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
} 