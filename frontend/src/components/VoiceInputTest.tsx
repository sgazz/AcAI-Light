'use client';

import { useState } from 'react';
import VoiceInput from './VoiceInput';
import { useErrorToast } from './ErrorToastProvider';

export default function VoiceInputTest() {
  const [testTranscripts, setTestTranscripts] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('sr-RS');
  const { showSuccess, showError } = useErrorToast();

  const handleTranscript = (text: string) => {
    setTestTranscripts(prev => [...prev, text]);
    showSuccess(`Prepoznat tekst: ${text}`, 'Voice Test');
  };

  const handleStart = () => {
    showSuccess('Snimanje započeto', 'Voice Test');
  };

  const handleStop = () => {
    showSuccess('Snimanje zaustavljeno', 'Voice Test');
  };

  const clearTranscripts = () => {
    setTestTranscripts([]);
  };

  const getLanguageName = (code: string) => {
    const languageNames: { [key: string]: string } = {
      'sr-RS': 'Serbian',
      'en-US': 'English (US)',
      'en-GB': 'English (UK)',
      'de-DE': 'German',
      'fr-FR': 'French',
      'es-ES': 'Spanish',
      'it-IT': 'Italian',
      'pt-BR': 'Portuguese',
      'ru-RU': 'Russian',
      'ja-JP': 'Japanese',
      'ko-KR': 'Korean',
      'zh-CN': 'Chinese'
    };
    return languageNames[code] || code;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Voice Input Test</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Testirajte funkcionalnost prepoznavanja govora
        </p>
      </div>

      {/* Language Selection */}
      <div className="flex items-center justify-center gap-4">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Test jezik:
        </label>
        <select
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
          className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="sr-RS">Serbian (Српски)</option>
          <option value="en-US">English (US)</option>
          <option value="en-GB">English (UK)</option>
          <option value="de-DE">German (Deutsch)</option>
          <option value="fr-FR">French (Français)</option>
          <option value="es-ES">Spanish (Español)</option>
          <option value="it-IT">Italian (Italiano)</option>
          <option value="pt-BR">Portuguese (Português)</option>
          <option value="ru-RU">Russian (Русский)</option>
          <option value="ja-JP">Japanese (日本語)</option>
          <option value="ko-KR">Korean (한국어)</option>
          <option value="zh-CN">Chinese (中文)</option>
        </select>
      </div>

      <VoiceInput
        onTranscript={handleTranscript}
        onStart={handleStart}
        onStop={handleStop}
        isEnabled={true}
        showTTS={true}
        defaultLanguage={selectedLanguage}
      />

      {testTranscripts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Test Transcripts ({getLanguageName(selectedLanguage)})
            </h3>
            <button
              onClick={clearTranscripts}
              className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded"
            >
              Obriši sve
            </button>
          </div>
          
          <div className="max-h-60 overflow-y-auto space-y-2">
            {testTranscripts.map((transcript, index) => (
              <div
                key={index}
                className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="text-green-900 dark:text-green-100">
                    {index + 1}. {transcript}
                  </span>
                  <span className="text-xs text-green-600 dark:text-green-400">
                    {new Date().toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
          Test Instrukcije ({getLanguageName(selectedLanguage)}):
        </h4>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• Kliknite "Započni snimanje" da aktivirate mikrofon</li>
          <li>• Govorite jasno i glasno na izabranom jeziku</li>
          <li>• Prepoznati tekst će se prikazati u realnom vremenu</li>
          <li>• Kliknite "Zaustavi snimanje" da prekinete</li>
          <li>• Koristite TTS dugme da čujete prepoznati tekst</li>
          <li>• Promenite jezik iznad za testiranje različitih jezika</li>
        </ul>
      </div>
    </div>
  );
} 