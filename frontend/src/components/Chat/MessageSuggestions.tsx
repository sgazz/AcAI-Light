'use client';

import React, { useState, useEffect } from 'react';
import { FaLightbulb, FaTimes } from 'react-icons/fa';

interface MessageSuggestionsProps {
  messages: any[];
  onSuggestionClick: (suggestion: string) => void;
  onClose: () => void;
}

export default function MessageSuggestions({ 
  messages, 
  onSuggestionClick, 
  onClose 
}: MessageSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (messages.length > 0) {
      generateSuggestions();
    }
  }, [messages]);

  const generateSuggestions = async () => {
    setIsLoading(true);
    try {
      // Kreiraj kontekst iz poslednjih poruka
      const recentMessages = messages.slice(-5).map(msg => ({
        sender: msg.sender,
        content: msg.content
      }));

      const response = await fetch('/api/chat/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          history: recentMessages,
          topic: extractTopic(recentMessages),
          user_style: 'formal'
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          setSuggestions(data.data.suggestions || []);
        }
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const extractTopic = (messages: any[]): string => {
    // Jednostavna logika za izvlačenje teme
    const aiMessages = messages.filter(msg => msg.sender === 'ai');
    if (aiMessages.length > 0) {
      const lastAIMessage = aiMessages[aiMessages.length - 1];
      // Izvuci ključne reči iz poslednje AI poruke
      const words = lastAIMessage.content.split(' ').slice(0, 5);
      return words.join(' ');
    }
    return '';
  };

  if (suggestions.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="bg-slate-800/80 backdrop-blur-sm border border-white/10 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FaLightbulb className="text-yellow-400" size={14} />
          <span className="text-sm font-medium text-white">Predlozi za sledeću poruku</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded transition-colors"
        >
          <FaTimes size={12} className="text-slate-400" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-slate-400">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm">Generišem predloge...</span>
        </div>
      ) : (
        <div className="space-y-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onSuggestionClick(suggestion)}
              className="w-full text-left p-3 bg-slate-700/50 hover:bg-slate-700/70 rounded-lg transition-colors border border-white/5 hover:border-blue-500/30"
            >
              <span className="text-sm text-slate-300 leading-relaxed">
                {suggestion}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 