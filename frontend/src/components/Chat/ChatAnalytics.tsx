'use client';

import React, { useState, useEffect } from 'react';
import { FaChartBar, FaComments, FaUser, FaRobot, FaClock, FaThumbsUp } from 'react-icons/fa';

interface ChatAnalyticsProps {
  sessionId: string;
  onClose: () => void;
}

interface AnalyticsData {
  total_messages: number;
  user_messages: number;
  ai_messages: number;
  avg_message_length: number;
  topics: string[];
  sentiment: string;
  engagement_score: number;
  session_duration: {
    minutes: number;
    seconds: number;
  };
  response_time_stats: {
    avg_response_time: number;
    min_response_time: number;
    max_response_time: number;
  };
}

export default function ChatAnalytics({ sessionId, onClose }: ChatAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [sessionId]);

  const loadAnalytics = async () => {
    try {
      const response = await fetch(`/api/chat/analytics/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          setAnalytics(data.data.analytics);
        }
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-slate-800/90 backdrop-blur-sm border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-2 text-slate-400">Učitavam analitiku...</span>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-slate-800/90 backdrop-blur-sm border border-white/10 rounded-xl p-6">
        <div className="text-center text-slate-400">
          Nema podataka za analitiku
        </div>
      </div>
    );
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-400';
      case 'negative': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return '😊';
      case 'negative': return '😞';
      default: return '😐';
    }
  };

  return (
    <div className="bg-slate-800/90 backdrop-blur-sm border border-white/10 rounded-xl p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FaChartBar className="text-blue-400" size={18} />
          <h3 className="text-lg font-semibold text-white">Analitika sesije</h3>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <span className="text-slate-400 hover:text-white">✕</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Total Messages */}
        <div className="bg-slate-700/50 rounded-lg p-4 border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <FaComments className="text-blue-400" size={14} />
            <span className="text-xs text-slate-400">Ukupno poruka</span>
          </div>
          <div className="text-2xl font-bold text-white">{analytics.total_messages}</div>
        </div>

        {/* User Messages */}
        <div className="bg-slate-700/50 rounded-lg p-4 border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <FaUser className="text-green-400" size={14} />
            <span className="text-xs text-slate-400">Korisnik</span>
          </div>
          <div className="text-2xl font-bold text-white">{analytics.user_messages}</div>
        </div>

        {/* AI Messages */}
        <div className="bg-slate-700/50 rounded-lg p-4 border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <FaRobot className="text-purple-400" size={14} />
            <span className="text-xs text-slate-400">AI</span>
          </div>
          <div className="text-2xl font-bold text-white">{analytics.ai_messages}</div>
        </div>

        {/* Engagement Score */}
        <div className="bg-slate-700/50 rounded-lg p-4 border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <FaThumbsUp className="text-yellow-400" size={14} />
            <span className="text-xs text-slate-400">Engagement</span>
          </div>
          <div className="text-2xl font-bold text-white">{analytics.engagement_score}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Session Duration */}
        <div className="bg-slate-700/50 rounded-lg p-4 border border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <FaClock className="text-cyan-400" size={14} />
            <span className="text-sm font-medium text-white">Trajanje sesije</span>
          </div>
          <div className="text-lg text-slate-300">
            {analytics.session_duration.minutes}m {analytics.session_duration.seconds}s
          </div>
        </div>

        {/* Average Message Length */}
        <div className="bg-slate-700/50 rounded-lg p-4 border border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <FaComments className="text-orange-400" size={14} />
            <span className="text-sm font-medium text-white">Prosečna dužina</span>
          </div>
          <div className="text-lg text-slate-300">
            {analytics.avg_message_length} karaktera
          </div>
        </div>

        {/* Sentiment */}
        <div className="bg-slate-700/50 rounded-lg p-4 border border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">{getSentimentIcon(analytics.sentiment)}</span>
            <span className="text-sm font-medium text-white">Sentiment</span>
          </div>
          <div className={`text-lg font-medium ${getSentimentColor(analytics.sentiment)}`}>
            {analytics.sentiment === 'positive' ? 'Pozitivan' : 
             analytics.sentiment === 'negative' ? 'Negativan' : 'Neutralan'}
          </div>
        </div>

        {/* Response Time */}
        <div className="bg-slate-700/50 rounded-lg p-4 border border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <FaClock className="text-green-400" size={14} />
            <span className="text-sm font-medium text-white">Vreme odgovora</span>
          </div>
          <div className="text-lg text-slate-300">
            {analytics.response_time_stats.avg_response_time}s
          </div>
        </div>
      </div>

      {/* Topics */}
      {analytics.topics.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-white mb-3">Teme razgovora</h4>
          <div className="flex flex-wrap gap-2">
            {analytics.topics.map((topic, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 