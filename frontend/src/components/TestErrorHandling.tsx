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
    <div className="bg-[var(--bg-secondary)] rounded-lg p-4 border border-[var(--border-color)]">
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Test Error Handling</h3>
      
      <div className="space-y-3">
        <button
          onClick={() => showError('Ovo je test greška', 'Test Greška')}
          className="w-full px-4 py-2 bg-[var(--accent-red)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--accent-red)]/80 transition-colors"
        >
          Testiraj Error Toast
        </button>
        
        <button
          onClick={() => showWarning('Ovo je test upozorenje', 'Test Upozorenje')}
          className="w-full px-4 py-2 bg-[var(--accent-yellow)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--accent-yellow)]/80 transition-colors"
        >
          Testiraj Warning Toast
        </button>
        
        <button
          onClick={() => showSuccess('Ovo je test uspeh', 'Test Uspeh')}
          className="w-full px-4 py-2 bg-[var(--accent-green)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--accent-green)]/80 transition-colors"
        >
          Testiraj Success Toast
        </button>
        
        <button
          onClick={() => {
            throw new Error('Ovo je test greška za Error Boundary');
          }}
          className="w-full px-4 py-2 bg-[var(--accent-red)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--accent-red)]/80 transition-colors"
        >
          Testiraj Error Boundary
        </button>
      </div>
    </div>
  );
} 