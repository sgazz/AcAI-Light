'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FaCopy, FaCheck } from 'react-icons/fa';
import MessageReactions from './MessageReactions';

interface MessageRendererProps {
  content: string;
  sender: 'user' | 'ai';
  timestamp?: string;
  messageId?: string;
  onReaction?: (messageId: string, reaction: 'like' | 'dislike') => void;
  initialReaction?: 'like' | 'dislike' | null;
}

export default function MessageRenderer({ 
  content, 
  sender, 
  timestamp, 
  messageId,
  onReaction,
  initialReaction 
}: MessageRendererProps) {
  const [copied, setCopied] = useState(false);

  // Debug logging
  if (sender === 'ai') {
    console.log('AI message renderer:', { messageId, sender, hasOnReaction: !!onReaction });
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Greška pri kopiranju:', error);
    }
  };

  const markdownComponents = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <div className="relative">
          <div className="flex items-center justify-between p-2 bg-[var(--bg-tertiary)] border-b border-[var(--border-color)] rounded-t-lg">
            <span className="text-xs text-[var(--text-muted)]">{match[1]}</span>
            <button
              onClick={() => copyToClipboard(String(children).replace(/\n$/, ''))}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--accent-blue)] transition-colors"
              title="Kopiraj kod"
            >
              <FaCopy size={12} />
            </button>
          </div>
          <SyntaxHighlighter
            style={tomorrow}
            language={match[1]}
            PreTag="div"
            className="rounded-b-lg"
            customStyle={{
              margin: 0,
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderTop: 'none'
            }}
            {...props}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        </div>
      ) : (
        <code className="bg-[var(--bg-tertiary)] text-[var(--accent-blue)] px-1 py-0.5 rounded text-sm" {...props}>
          {children}
        </code>
      );
    },
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-[var(--accent-blue)] bg-[var(--accent-blue)]/10 pl-4 py-2 my-4 rounded-r-lg">
        {children}
      </blockquote>
    ),
    a: ({ href, children }: any) => (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-[var(--accent-blue)] hover:text-[var(--accent-blue)]/80 underline"
      >
        {children}
      </a>
    ),
    ul: ({ children }: any) => <ul className="list-disc list-inside space-y-1 text-[var(--text-primary)]">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal list-inside space-y-1 text-[var(--text-primary)]">{children}</ol>,
    li: ({ children }: any) => <li className="text-[var(--text-primary)]">{children}</li>,
    strong: ({ children }: any) => <strong className="font-semibold text-[var(--text-primary)]">{children}</strong>,
    em: ({ children }: any) => <em className="italic text-[var(--text-primary)]">{children}</em>,
    h1: ({ children }: any) => <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{children}</h3>,
    p: ({ children }: any) => <p className="text-[var(--text-primary)] mb-3 leading-relaxed">{children}</p>,
  };

  return (
    <div className={`group relative p-6 rounded-2xl transition-all duration-300 hover:scale-[1.02] ${
      sender === 'user' 
        ? 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 ml-8 shadow-lg shadow-blue-500/20' 
        : 'bg-gradient-to-r from-slate-800/50 to-slate-700/50 border border-white/10 mr-8 shadow-lg hover:shadow-xl'
    }`}>
      {/* Hover glow effect */}
      <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
        sender === 'user' 
          ? 'bg-gradient-to-r from-blue-500/5 to-purple-500/5' 
          : 'bg-gradient-to-r from-slate-700/20 to-slate-600/20'
      }`}></div>

      <div className="relative">
        {/* Premium Header sa timestamp i copy button */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${
              sender === 'user' 
                ? 'bg-gradient-to-br from-blue-500 to-purple-600' 
                : 'bg-gradient-to-br from-green-500 to-emerald-600'
            } shadow-lg`}>
              <span className={`text-sm font-bold text-white`}>
                {sender === 'user' ? 'Vi' : 'AI'}
              </span>
            </div>
            {timestamp && (
              <span className="text-xs text-slate-400 bg-slate-800/50 px-2 py-1 rounded-lg border border-white/10">
                {new Date(timestamp).toLocaleTimeString('sr-RS')}
              </span>
            )}
          </div>
          
          {/* Premium Copy button samo za AI poruke */}
          {sender === 'ai' && (
            <button
              onClick={() => copyToClipboard(content)}
              className={`group/copy relative p-3 rounded-xl transition-all duration-300 hover:scale-110 ${
                copied 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg' 
                  : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50 border border-white/10 hover:border-green-500/30'
              }`}
              title={copied ? 'Kopirano!' : 'Kopiraj poruku'}
            >
              {copied ? <FaCheck size={14} /> : <FaCopy size={14} />}
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl opacity-0 group-hover/copy:opacity-100 transition-opacity duration-300"></div>
            </button>
          )}
        </div>

        {/* Premium Message content */}
        <div className="prose prose-invert max-w-none">
          {sender === 'user' ? (
            <div className="text-white whitespace-pre-wrap leading-relaxed font-medium">{content}</div>
          ) : (
            <ReactMarkdown components={markdownComponents}>
              {content}
            </ReactMarkdown>
          )}
        </div>

        {/* Premium Message reactions samo za AI poruke */}
        {sender === 'ai' && messageId && (
          <div className="mt-4">
            <MessageReactions
              messageId={messageId}
              initialReactions={initialReaction ? [initialReaction === 'like' ? '👍' : '👎'] : []}
              onReactionChange={(messageId, reactions) => {
                const hasLike = reactions.includes('👍');
                const hasDislike = reactions.includes('👎');
                if (hasLike && onReaction) onReaction(messageId, 'like');
                else if (hasDislike && onReaction) onReaction(messageId, 'dislike');
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
} 