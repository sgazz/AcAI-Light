'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FaPaperPlane, FaMicrophone, FaStop, FaPaperclip, FaMagic } from 'react-icons/fa';
import { useErrorToast } from '../ErrorToastProvider';

interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
  sessionId?: string;
  useRAG?: boolean;
}

export default function ChatInput({ onSendMessage, isLoading, sessionId, useRAG = true }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { showInfo } = useErrorToast();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    await onSendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSubmit(e as any);
    }
    
    // New line on Shift+Enter
    if (e.key === 'Enter' && e.shiftKey) {
      return; // Allow default behavior
    }
  };

  const handleRecordingToggle = () => {
    showInfo('Ova funkcija će omogućiti slanje glasovnih poruka.', 'Snimanje glasa');
    setIsRecording(!isRecording);
    // TODO: Implement voice recording
  };

  const handleFileUpload = () => {
    showInfo('Ova funkcija će omogućiti upload i deljenje fajlova u chatu.', 'Priloži fajl');
    // TODO: Implement file upload
    console.log('File upload clicked');
  };

  const handleAIFeatures = () => {
    showInfo('Ovde će biti AI predlozi, automatsko dovršavanje i pomoć pri pisanju poruka.', 'AI funkcionalnosti');
    // TODO: Implement AI features (suggestions, auto-complete, etc.)
    console.log('AI features clicked');
  };

  return (
    <div className="p-4">
      <form onSubmit={handleSubmit} className="relative">
        {/* Input Container */}
        <div className="relative flex items-end gap-3">
          {/* File Upload Button */}
          <button
            type="button"
            onClick={handleFileUpload}
            className="flex-shrink-0 p-3 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            title="Priloži fajl"
          >
            <FaPaperclip size={16} />
          </button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 focus-within:opacity-100 transition-opacity duration-300"></div>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder={useRAG ? "Upišite poruku za RAG..." : "Upišite poruku..."}
              className="relative w-full px-4 py-3 bg-slate-700/50 border border-white/10 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 backdrop-blur-sm transition-all duration-300 resize-none overflow-hidden min-h-[48px] max-h-[200px]"
              disabled={isLoading}
              rows={1}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* AI Features Button */}
            <button
              type="button"
              onClick={handleAIFeatures}
              className="flex-shrink-0 p-3 text-slate-400 hover:text-purple-400 hover:bg-purple-500/20 rounded-xl transition-colors"
              title="AI funkcionalnosti"
            >
              <FaMagic size={16} />
            </button>

            {/* Voice Recording Button */}
            <button
              type="button"
              onClick={handleRecordingToggle}
              className={`flex-shrink-0 p-3 rounded-xl transition-colors ${
                isRecording 
                  ? 'text-red-400 bg-red-500/20' 
                  : 'text-slate-400 hover:text-blue-400 hover:bg-blue-500/20'
              }`}
              title={isRecording ? 'Zaustavi snimanje' : 'Snimi glas'}
            >
              {isRecording ? <FaStop size={16} /> : <FaMicrophone size={16} />}
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={`flex-shrink-0 p-3 rounded-xl transition-all duration-200 ${
                input.trim() && !isLoading
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
              }`}
              title="Pošalji poruku"
            >
              <FaPaperPlane size={16} />
            </button>
          </div>
        </div>

        {/* Keyboard Shortcuts Help */}
        <div className="mt-2 text-xs text-slate-500 text-center">
          <span className="hidden sm:inline">
            Enter za slanje • Shift+Enter za novi red • Ctrl+K za novu sesiju
          </span>
        </div>
      </form>
    </div>
  );
} 