'use client';

import { useState } from 'react';
import { FaFlask, FaCheck, FaTimes } from 'react-icons/fa';
import { useErrorToast } from './ErrorToastProvider';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
}

export default function TestErrorHandling() {
  const [isVisible, setIsVisible] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { showError, showSuccess, showWarning, showInfo } = useErrorToast();

  const tests = [
    {
      name: 'Error Toast - Osnovna greška',
      test: () => showError('Ovo je test greške', 'Test Greška')
    },
    {
      name: 'Error Toast - Sa retry opcijom',
      test: () => showError('Greška sa retry opcijom', 'Test Retry', true, () => {
        showSuccess('Retry uspešan!', 'Retry Test');
      })
    },
    {
      name: 'Success Toast',
      test: () => showSuccess('Ovo je uspešna operacija', 'Test Uspeh')
    },
    {
      name: 'Warning Toast',
      test: () => showWarning('Ovo je upozorenje', 'Test Upozorenje')
    },
    {
      name: 'Info Toast',
      test: () => showInfo('Ovo je informacija', 'Test Info')
    },
    {
      name: 'Multiple Toasts',
      test: () => {
        showError('Prva greška', 'Test 1');
        setTimeout(() => showSuccess('Prvi uspeh', 'Test 2'), 500);
        setTimeout(() => showWarning('Prvo upozorenje', 'Test 3'), 1000);
        setTimeout(() => showInfo('Prva informacija', 'Test 4'), 1500);
      }
    }
  ];

  const runTests = async () => {
    setIsRunning(true);
    setTestResults(tests.map(test => ({ name: test.name, status: 'pending' })));

    for (let i = 0; i < tests.length; i++) {
      try {
        await new Promise<void>((resolve) => {
          tests[i].test();
          setTimeout(resolve, 100);
        });
        
        setTestResults(prev => 
          prev.map((result, index) => 
            index === i 
              ? { ...result, status: 'success', message: 'Test prošao' }
              : result
          )
        );
      } catch (error: any) {
        setTestResults(prev => 
          prev.map((result, index) => 
            index === i 
              ? { ...result, status: 'error', message: error.message }
              : result
          )
        );
      }
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-4 h-4 bg-gray-400 rounded-full animate-pulse" />;
      case 'success':
        return <FaCheck className="text-green-400" size={14} />;
      case 'error':
        return <FaTimes className="text-red-400" size={14} />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return 'text-gray-400';
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 left-4 relative group z-40"
        title="Test Error Handling"
      >
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        {/* Main button */}
        <div className="relative p-3 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full shadow-2xl hover:shadow-xl transition-all duration-300 hover:scale-110 transform">
          <FaFlask size={20} />
        </div>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-40 relative group">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      {/* Main container */}
      <div className="relative bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl min-w-80">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 animate-pulse"></div>
          <div className="absolute top-1/4 right-1/4 w-16 h-16 bg-blue-400/10 rounded-full blur-xl animate-bounce"></div>
        </div>

        <div className="relative">
          {/* Premium Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                <FaFlask className="text-white" size={20} />
              </div>
              <h3 className="text-lg font-bold text-white bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Test Error Handling
              </h3>
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300"
            >
              <FaTimes size={16} />
            </button>
          </div>
          
          {/* Premium Test Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => showError('Ovo je test greška', 'Test Greška')}
              className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl hover:scale-105 transform"
            >
              Testiraj Error Toast
            </button>
            
            <button
              onClick={() => showWarning('Ovo je test upozorenje', 'Test Upozorenje')}
              className="w-full px-4 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl hover:from-yellow-600 hover:to-orange-600 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl hover:scale-105 transform"
            >
              Testiraj Warning Toast
            </button>
            
            <button
              onClick={() => showSuccess('Ovo je test uspeh', 'Test Uspeh')}
              className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl hover:scale-105 transform"
            >
              Testiraj Success Toast
            </button>
            
            <button
              onClick={() => {
                throw new Error('Ovo je test greška za Error Boundary');
              }}
              className="w-full px-4 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl hover:scale-105 transform"
            >
              Testiraj Error Boundary
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 