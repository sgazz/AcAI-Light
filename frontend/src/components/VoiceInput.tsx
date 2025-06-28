'use client';

// TypeScript definicije za Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

import { useState, useEffect, useRef } from 'react';
import { FaMicrophone, FaMicrophoneSlash, FaVolumeUp, FaVolumeMute, FaGlobe } from 'react-icons/fa';
import { useErrorToast } from './ErrorToastProvider';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onStart?: () => void;
  onStop?: () => void;
  isEnabled?: boolean;
  showTTS?: boolean;
  onTTSChange?: (enabled: boolean) => void;
  defaultLanguage?: string;
}

type Language = {
  code: string;
  name: string;
  nativeName: string;
};

const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'sr-RS', name: 'Serbian', nativeName: 'Српски' },
  { code: 'en-US', name: 'English (US)', nativeName: 'English' },
  { code: 'en-GB', name: 'English (UK)', nativeName: 'English' },
  { code: 'de-DE', name: 'German', nativeName: 'Deutsch' },
  { code: 'fr-FR', name: 'French', nativeName: 'Français' },
  { code: 'es-ES', name: 'Spanish', nativeName: 'Español' },
  { code: 'it-IT', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português' },
  { code: 'ru-RU', name: 'Russian', nativeName: 'Русский' },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko-KR', name: 'Korean', nativeName: '한국어' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '中文' },
];

export default function VoiceInput({ 
  onTranscript, 
  onStart, 
  onStop, 
  isEnabled = true,
  showTTS = true,
  onTTSChange,
  defaultLanguage = 'sr-RS'
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isTTSEnabled, setIsTTSEnabled] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [recognition, setRecognition] = useState<any>(null);
  const [tts, setTts] = useState<any>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState(defaultLanguage);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const { showError, showSuccess, showWarning } = useErrorToast();

  // Inicijalizacija Web Speech API
  useEffect(() => {
    const initSpeechRecognition = () => {
      try {
        // Proveri da li je u browser environment
        if (typeof window === 'undefined') {
          setIsSupported(false);
          setError('Web Speech API nije dostupan u server environment');
          return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
          setIsSupported(false);
          setError('Web Speech API nije podržan u ovom browseru. Pokušajte sa Chrome, Edge ili Safari.');
          return;
        }

        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = true;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = selectedLanguage;
        
        recognitionInstance.onstart = () => {
          setIsListening(true);
          setTranscript('');
          setInterimTranscript('');
          setError(null);
          onStart?.();
          showSuccess('Mikrofon aktiviran', 'Voice Input');
        };

        recognitionInstance.onresult = (event: any) => {
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript) {
            setTranscript(prev => prev + finalTranscript);
            onTranscript(finalTranscript);
          }
          
          setInterimTranscript(interimTranscript);
        };

        recognitionInstance.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          
          let errorMessage = 'Greška prepoznavanja govora';
          
          switch (event.error) {
            case 'no-speech':
              errorMessage = 'Nije detektovan govor. Pokušajte ponovo.';
              showWarning(errorMessage, 'Voice Input');
              break;
            case 'audio-capture':
              errorMessage = 'Greška pri snimanju zvuka. Proverite mikrofon.';
              showError(errorMessage, 'Voice Input');
              break;
            case 'not-allowed':
              errorMessage = 'Pristup mikrofonu nije dozvoljen. Dozvolite pristup u browser podešavanjima.';
              showError(errorMessage, 'Voice Input');
              break;
            case 'network':
              errorMessage = 'Greška mreže. Proverite internet konekciju.';
              showError(errorMessage, 'Voice Input');
              break;
            case 'service-not-allowed':
              errorMessage = 'Speech recognition servis nije dostupan.';
              showError(errorMessage, 'Voice Input');
              break;
            case 'bad-grammar':
              errorMessage = 'Greška u gramatici. Proverite jezik podešavanja.';
              showError(errorMessage, 'Voice Input');
              break;
            case 'language-not-supported':
              errorMessage = 'Izabrani jezik nije podržan.';
              showError(errorMessage, 'Voice Input');
              break;
            default:
              errorMessage = `Greška prepoznavanja govora: ${event.error}`;
              showError(errorMessage, 'Voice Input');
          }
          
          setError(errorMessage);
        };

        recognitionInstance.onend = () => {
          setIsListening(false);
          onStop?.();
        };

        setRecognition(recognitionInstance);
        setIsSupported(true);
        setError(null);
        
      } catch (err: any) {
        console.error('Error initializing speech recognition:', err);
        setIsSupported(false);
        setError(`Greška pri inicijalizaciji: ${err.message}`);
        showError('Greška pri inicijalizaciji Web Speech API', 'Voice Input');
      }
    };

    // Inicijalizacija TTS
    const initTTS = () => {
      try {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          setTts(window.speechSynthesis);
        } else {
          console.warn('Speech Synthesis nije podržan u ovom browseru');
        }
      } catch (err) {
        console.error('Error initializing TTS:', err);
      }
    };

    initSpeechRecognition();
    initTTS();
  }, [selectedLanguage, onStart, onStop, onTranscript, showError, showSuccess, showWarning]);

  // Audio level monitoring
  useEffect(() => {
    if (isListening && isEnabled) {
      startAudioLevelMonitoring();
    } else {
      stopAudioLevelMonitoring();
    }
  }, [isListening, isEnabled]);

  const startAudioLevelMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      analyserRef.current.fftSize = 256;
      microphoneRef.current.connect(analyserRef.current);
      
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      const updateAudioLevel = () => {
        if (analyserRef.current && isListening) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average);
          requestAnimationFrame(updateAudioLevel);
        }
      };
      
      updateAudioLevel();
    } catch (error) {
      console.error('Greška pri audio level monitoring:', error);
    }
  };

  const stopAudioLevelMonitoring = () => {
    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
      microphoneRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  };

  const toggleListening = () => {
    if (!isSupported || !isEnabled) return;

    if (isListening) {
      recognition?.stop();
    } else {
      try {
        recognition?.start();
      } catch (err: any) {
        console.error('Error starting recognition:', err);
        showError(`Greška pri pokretanju: ${err.message}`, 'Voice Input');
      }
    }
  };

  const toggleTTS = () => {
    const newTTSState = !isTTSEnabled;
    setIsTTSEnabled(newTTSState);
    onTTSChange?.(newTTSState);
    
    if (newTTSState) {
      showSuccess('Text-to-Speech aktiviran', 'Voice Input');
    } else {
      showWarning('Text-to-Speech deaktiviran', 'Voice Input');
    }
  };

  const speakText = (text: string) => {
    if (tts && isTTSEnabled) {
      try {
        tts.cancel(); // Prekini prethodni govor
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = selectedLanguage;
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 0.8;
        
        tts.speak(utterance);
      } catch (err: any) {
        console.error('Error with TTS:', err);
        showError('Greška pri TTS reprodukciji', 'Voice Input');
      }
    }
  };

  const clearTranscript = () => {
    setTranscript('');
    setInterimTranscript('');
  };

  const changeLanguage = (languageCode: string) => {
    setSelectedLanguage(languageCode);
    setShowLanguageSelector(false);
    
    // Restart recognition ako je aktivan
    if (isListening && recognition) {
      recognition.stop();
      setTimeout(() => {
        recognition.lang = languageCode;
        recognition.start();
      }, 100);
    }
    
    showSuccess(`Jezik promenjen na: ${SUPPORTED_LANGUAGES.find(l => l.code === languageCode)?.name}`, 'Voice Input');
  };

  const getCurrentLanguageName = () => {
    return SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name || selectedLanguage;
  };

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <FaMicrophoneSlash className="text-red-500" />
        <div>
          <span className="text-sm text-red-700 dark:text-red-300 font-medium">
            Web Speech API nije podržan
          </span>
          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Voice Input Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={toggleListening}
          disabled={!isEnabled}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
            isListening
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg scale-105'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          } ${!isEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isListening ? (
            <>
              <FaMicrophone className="animate-pulse" />
              <span>Zaustavi snimanje</span>
            </>
          ) : (
            <>
              <FaMicrophone />
              <span>Započni snimanje</span>
            </>
          )}
        </button>

        {/* Language Selector */}
        <div className="relative">
          <button
            onClick={() => setShowLanguageSelector(!showLanguageSelector)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <FaGlobe />
            <span className="text-sm">{getCurrentLanguageName()}</span>
          </button>
          
          {showLanguageSelector && (
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
              {SUPPORTED_LANGUAGES.map((language) => (
                <button
                  key={language.code}
                  onClick={() => changeLanguage(language.code)}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    selectedLanguage === language.code ? 'bg-blue-100 dark:bg-blue-900' : ''
                  }`}
                >
                  <div className="font-medium">{language.name}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{language.nativeName}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {showTTS && (
          <button
            onClick={toggleTTS}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors ${
              isTTSEnabled
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-gray-500 hover:bg-gray-600 text-white'
            }`}
          >
            {isTTSEnabled ? <FaVolumeUp /> : <FaVolumeMute />}
            <span className="text-sm">TTS</span>
          </button>
        )}

        {transcript && (
          <button
            onClick={clearTranscript}
            className="px-3 py-2 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Obriši
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Audio Level Visualizer */}
      {isListening && (
        <div className="flex items-center gap-2">
          <div className="flex gap-1 h-8 items-end">
            {Array.from({ length: 10 }, (_, i) => (
              <div
                key={i}
                className="w-1 bg-blue-500 rounded-full transition-all duration-100"
                style={{
                  height: `${Math.max(4, (audioLevel / 255) * 32 * (i + 1) / 10)}px`,
                  opacity: isListening ? 1 : 0.3
                }}
              />
            ))}
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Snimanje... ({getCurrentLanguageName()})
          </span>
        </div>
      )}

      {/* Transcript Display */}
      {(transcript || interimTranscript) && (
        <div className="space-y-2">
          {transcript && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-800 dark:text-green-200">
                  Prepoznati tekst:
                </span>
                <button
                  onClick={() => speakText(transcript)}
                  disabled={!isTTSEnabled}
                  className="text-sm text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200 disabled:opacity-50"
                >
                  <FaVolumeUp />
                </button>
              </div>
              <p className="text-green-900 dark:text-green-100">{transcript}</p>
            </div>
          )}
          
          {interimTranscript && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Trenutno prepoznavanje:
              </span>
              <p className="text-blue-900 dark:text-blue-100 italic">{interimTranscript}</p>
            </div>
          )}
        </div>
      )}

      {/* Status Indicators */}
      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
          <span>{isListening ? 'Snimanje aktivno' : 'Spremno za snimanje'}</span>
        </div>
        
        <div className="flex items-center gap-1">
          <FaGlobe className="text-xs" />
          <span>{getCurrentLanguageName()}</span>
        </div>
        
        {showTTS && (
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${isTTSEnabled ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span>TTS {isTTSEnabled ? 'aktivan' : 'neaktivan'}</span>
          </div>
        )}
      </div>
    </div>
  );
} 