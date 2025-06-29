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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-red-500/20 via-orange-500/20 to-pink-500/20 animate-pulse"></div>
            <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-red-400/10 rounded-full blur-3xl animate-bounce"></div>
            <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-orange-400/10 rounded-full blur-3xl animate-pulse"></div>
          </div>

          <div className="relative max-w-md w-full">
            {/* Premium Glassmorphism Error Container */}
            <div className="relative group">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              {/* Main container */}
              <div className="relative bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-2xl rounded-3xl border border-red-500/30 shadow-2xl p-8 card-hover-profi">
                {/* Animated Background Pattern */}
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-red-500/20 via-orange-500/20 to-pink-500/20 animate-pulse"></div>
                  <div className="absolute top-1/4 right-1/4 w-16 h-16 bg-red-400/10 rounded-full blur-xl animate-bounce"></div>
                </div>

                <div className="relative text-center">
                  {/* Premium Error Icon */}
                  <div className="relative inline-block mb-6">
                    <div className="p-4 bg-gradient-to-br from-red-500 to-orange-600 rounded-3xl shadow-2xl">
                      <FaExclamationTriangle className="text-white" size={48} />
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-400 rounded-full animate-pulse border-2 border-slate-900"></div>
                  </div>
                  
                  {/* Error Content */}
                  <h1 className="text-2xl font-bold text-white mb-3 bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                    Nešto je pošlo naopako
                  </h1>
                  <p className="text-slate-300 mb-8 leading-relaxed font-medium">
                    Došlo je do neočekivane greške. Molimo vas da osvežite stranicu ili kontaktirajte podršku.
                  </p>
                  
                  {/* Premium Action Buttons */}
                  <div className="space-y-4">
                    <button
                      onClick={() => window.location.reload()}
                      className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl hover:scale-105 transform"
                    >
                      Osveži stranicu
                    </button>
                    <button
                      onClick={this.handleRetry}
                      className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl hover:from-blue-600 hover:to-purple-700 btn-hover-profi font-semibold shadow-lg"
                    >
                      Pokušaj ponovo
                    </button>
                  </div>
                  
                  {/* Error Details */}
                  {this.state.error && (
                    <details className="mt-8 text-left group/details">
                      <summary className="text-sm text-slate-400 cursor-pointer hover:text-white transition-colors duration-300 font-medium group-open/details:text-white">
                        Detalji greške
                      </summary>
                      <div className="mt-4 p-4 bg-gradient-to-br from-slate-800/50 to-slate-700/50 rounded-2xl border border-white/10 backdrop-blur-sm">
                        <pre className="text-xs text-slate-300 overflow-auto leading-relaxed font-mono">
                          {this.state.error.toString()}
                        </pre>
                      </div>
                    </details>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
} 