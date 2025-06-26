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
        className="fixed bottom-4 left-4 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-40"
        title="Test Error Handling"
      >
        <FaFlask size={20} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 bg-[#1a2332] rounded-xl p-4 shadow-lg max-w-md z-40 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <FaFlask className="text-blue-400" />
          Error Handling Test
        </h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          <FaTimes size={16} />
        </button>
      </div>

      <div className="space-y-2 mb-4">
        {testResults.map((result, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            {getStatusIcon(result.status)}
            <span className={`flex-1 ${getStatusColor(result.status)}`}>
              {result.name}
            </span>
            {result.message && (
              <span className="text-xs text-gray-500">
                {result.message}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={runTests}
          disabled={isRunning}
          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {isRunning ? 'Testiranje...' : 'Pokreni Testove'}
        </button>
        <button
          onClick={() => setTestResults([])}
          className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
        >
          Reset
        </button>
      </div>

      <div className="mt-3 text-xs text-gray-400">
        <p>• Testira toast notifikacije</p>
        <p>• Proverava retry funkcionalnost</p>
        <p>• Simulira različite tipove grešaka</p>
      </div>
    </div>
  );
} 