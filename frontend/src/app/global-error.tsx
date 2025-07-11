'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-2xl rounded-3xl border border-red-500/30 shadow-2xl p-8">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-white mb-3 bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                  Nešto je pošlo naopako
                </h1>
                <p className="text-slate-300 mb-8 leading-relaxed font-medium">
                  Došlo je do neočekivane greške u aplikaciji.
                </p>
                
                <div className="space-y-4">
                  <button
                    onClick={reset}
                    className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl hover:scale-105 transform"
                  >
                    Pokušaj ponovo
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-2xl hover:from-gray-600 hover:to-gray-700 transition-all duration-300 font-semibold shadow-lg"
                  >
                    Osveži stranicu
                  </button>
                </div>
                
                {error.digest && (
                  <details className="mt-8 text-left">
                    <summary className="text-sm text-slate-400 cursor-pointer hover:text-white transition-colors duration-300 font-medium">
                      Error ID: {error.digest}
                    </summary>
                    <div className="mt-4 p-4 bg-gradient-to-br from-slate-800/50 to-slate-700/50 rounded-2xl border border-white/10 backdrop-blur-sm">
                      <pre className="text-xs text-slate-300 overflow-auto leading-relaxed font-mono">
                        {error.message}
                      </pre>
                    </div>
                  </details>
                )}
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
} 