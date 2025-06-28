'use client';

import { useState, useEffect } from 'react';
import { FaMicrophone, FaVolumeUp, FaCog, FaKeyboard, FaInfoCircle } from 'react-icons/fa';
import VoiceInput from './VoiceInput';
import { useErrorToast } from './ErrorToastProvider';

interface AudioModeProps {
  onSendMessage: (message: string) => void;
  onTTSResponse?: (text: string) => void;
  isEnabled?: boolean;
}

interface VoiceSettings {
  autoSend: boolean;
  autoTTS: boolean;
  language: string;
  voiceSpeed: number;
  voicePitch: number;
  voiceVolume: number;
}

export default function AudioMode({ 
  onSendMessage, 
  onTTSResponse, 
  isEnabled = true 
}: AudioModeProps) {
  const [isActive, setIsActive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    autoSend: true,
    autoTTS: false,
    language: 'sr-RS',
    voiceSpeed: 0.9,
    voicePitch: 1.0,
    voiceVolume: 0.8
  });
  const [voiceCommands, setVoiceCommands] = useState<string[]>([]);
  const { showError, showSuccess, showInfo } = useErrorToast();

  // Voice commands
  const commands = [
    { phrase: 'pošalji', action: 'send' },
    { phrase: 'obriši', action: 'clear' },
    { phrase: 'nova sesija', action: 'new_session' },
    { phrase: 'pomoć', action: 'help' },
    { phrase: 'zaustavi', action: 'stop' }
  ];

  const handleTranscript = (text: string) => {
    // Proveri voice commands
    const lowerText = text.toLowerCase();
    const command = commands.find(cmd => lowerText.includes(cmd.phrase));
    
    if (command) {
      handleVoiceCommand(command.action, text);
    } else {
      // Dodaj u voice commands listu
      setVoiceCommands(prev => [...prev, text]);
      
      // Auto-send ako je omogućeno
      if (voiceSettings.autoSend) {
        onSendMessage(text);
        showSuccess('Poruka poslata glasom', 'Audio Mode');
      }
    }
  };

  const handleVoiceCommand = (action: string, originalText: string) => {
    switch (action) {
      case 'send':
        if (voiceCommands.length > 0) {
          const lastCommand = voiceCommands[voiceCommands.length - 1];
          onSendMessage(lastCommand);
          showSuccess('Poslednja poruka poslata', 'Voice Command');
        }
        break;
      case 'clear':
        setVoiceCommands([]);
        showInfo('Voice commands obrisani', 'Voice Command');
        break;
      case 'new_session':
        // Ovo će biti implementirano kroz callback
        showInfo('Nova sesija će biti kreirana', 'Voice Command');
        break;
      case 'help':
        showInfo('Dostupne komande: pošalji, obriši, nova sesija, pomoć, zaustavi', 'Voice Commands');
        break;
      case 'stop':
        setIsActive(false);
        showInfo('Audio mode zaustavljen', 'Voice Command');
        break;
    }
  };

  const handleTTSChange = (enabled: boolean) => {
    setVoiceSettings(prev => ({ ...prev, autoTTS: enabled }));
    
    if (enabled) {
      showSuccess('Text-to-Speech aktiviran', 'Audio Mode');
    } else {
      showInfo('Text-to-Speech deaktiviran', 'Audio Mode');
    }
  };

  const updateVoiceSetting = (key: keyof VoiceSettings, value: any) => {
    setVoiceSettings(prev => ({ ...prev, [key]: value }));
  };

  const clearVoiceCommands = () => {
    setVoiceCommands([]);
    showSuccess('Voice commands obrisani', 'Audio Mode');
  };

  if (!isEnabled) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <FaMicrophone className="text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300">
            Audio Mode
          </h3>
        </div>
        <p className="text-gray-500 dark:text-gray-400">
          Audio Mode je trenutno onemogućen.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isActive ? 'bg-blue-500' : 'bg-gray-500'}`}>
            <FaMicrophone className={`text-white ${isActive ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Audio Mode
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Govorni unos i izlaz za interakciju sa AI asistentom
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
            title="Podešavanja"
          >
            <FaCog />
          </button>
          <button
            onClick={() => showInfo('Dostupne komande: pošalji, obriši, nova sesija, pomoć, zaustavi', 'Voice Commands')}
            className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
            title="Pomoć"
          >
            <FaInfoCircle />
          </button>
        </div>
      </div>

      {/* Voice Input */}
      <VoiceInput
        onTranscript={handleTranscript}
        onStart={() => setIsActive(true)}
        onStop={() => setIsActive(false)}
        isEnabled={isEnabled}
        showTTS={true}
        onTTSChange={handleTTSChange}
      />

      {/* Voice Commands History */}
      {voiceCommands.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Voice Commands
            </h3>
            <button
              onClick={clearVoiceCommands}
              className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              Obriši sve
            </button>
          </div>
          
          <div className="max-h-40 overflow-y-auto space-y-2">
            {voiceCommands.map((command, index) => (
              <div
                key={index}
                className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="text-blue-900 dark:text-blue-100">{command}</span>
                  <button
                    onClick={() => onSendMessage(command)}
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Pošalji
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Audio Podešavanja
          </h3>
          
          <div className="space-y-4">
            {/* Auto Send */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Automatsko slanje
              </label>
              <input
                type="checkbox"
                checked={voiceSettings.autoSend}
                onChange={(e) => updateVoiceSetting('autoSend', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>

            {/* Auto TTS */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Automatski TTS odgovori
              </label>
              <input
                type="checkbox"
                checked={voiceSettings.autoTTS}
                onChange={(e) => updateVoiceSetting('autoTTS', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>

            {/* Voice Speed */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Brzina govora: {voiceSettings.voiceSpeed}
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={voiceSettings.voiceSpeed}
                onChange={(e) => updateVoiceSetting('voiceSpeed', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
            </div>

            {/* Voice Pitch */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Visina glasa: {voiceSettings.voicePitch}
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={voiceSettings.voicePitch}
                onChange={(e) => updateVoiceSetting('voicePitch', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
            </div>

            {/* Voice Volume */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Glasnoća: {voiceSettings.voiceVolume}
              </label>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.1"
                value={voiceSettings.voiceVolume}
                onChange={(e) => updateVoiceSetting('voiceVolume', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
            </div>
          </div>
        </div>
      )}

      {/* Quick Tips */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
          <FaKeyboard className="inline mr-2" />
          Voice Commands
        </h4>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• "pošalji" - pošalji poslednju poruku</li>
          <li>• "obriši" - obriši voice commands</li>
          <li>• "nova sesija" - kreiraj novu sesiju</li>
          <li>• "pomoć" - prikaži dostupne komande</li>
          <li>• "zaustavi" - zaustavi audio mode</li>
        </ul>
      </div>
    </div>
  );
} 