'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { FaEdit, FaUndo, FaThumbsUp, FaThumbsDown, FaCopy, FaCheck } from 'react-icons/fa';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MessageRendererProps {
  content: string;
  sender: 'user' | 'ai';
  timestamp?: string;
  messageId?: string;
  onReaction?: (messageId: string, reaction: 'like' | 'dislike') => void;
  initialReaction?: 'like' | 'dislike' | null;
}

const markdownComponents = {
  code({ node, inline, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || '');
    return !inline && match ? (
      <SyntaxHighlighter
        style={oneDark}
        language={match[1]}
        PreTag="div"
        className="rounded-lg my-4"
        {...props}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    ) : (
      <code className="bg-slate-800/50 px-2 py-1 rounded text-sm font-mono" {...props}>
        {children}
      </code>
    );
  },
  p: ({ children }: any) => <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>,
  h1: ({ children }: any) => <h1 className="text-2xl font-bold mb-4 mt-6">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-xl font-bold mb-3 mt-5">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-lg font-bold mb-2 mt-4">{children}</h3>,
  ul: ({ children }: any) => <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>,
  li: ({ children }: any) => <li className="ml-4">{children}</li>,
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-blue-500 pl-4 italic bg-blue-500/10 py-2 rounded-r-lg mb-4">
      {children}
    </blockquote>
  ),
  table: ({ children }: any) => (
    <div className="overflow-x-auto mb-4">
      <table className="min-w-full border border-slate-600 rounded-lg">
        {children}
      </table>
    </div>
  ),
  th: ({ children }: any) => (
    <th className="border border-slate-600 px-4 py-2 bg-slate-700 font-semibold">
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td className="border border-slate-600 px-4 py-2">
      {children}
    </td>
  ),
};

export default function MessageRenderer({ 
  content, 
  sender, 
  timestamp, 
  messageId,
  onReaction,
  initialReaction,
  isLastUserMessage = false,
  aiTyping = false,
  onEdit,
  onUndo,
  editing = false,
  editInput = '',
  setEditInput,
  saveEdit
}: MessageRendererProps & {
  isLastUserMessage?: boolean;
  aiTyping?: boolean;
  onEdit?: (id: string) => void;
  onUndo?: (id: string) => void;
  editing?: boolean;
  editInput?: string;
  setEditInput?: (v: string) => void;
  saveEdit?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [reaction, setReaction] = useState<'like' | 'dislike' | null>(initialReaction || null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleReaction = (newReaction: 'like' | 'dislike') => {
    const finalReaction = reaction === newReaction ? null : newReaction;
    setReaction(finalReaction);
    if (onReaction && messageId && finalReaction) {
      onReaction(messageId, finalReaction);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto mb-6">
      <div className={`
        bg-white/5 backdrop-blur-sm rounded-lg border transition-all duration-300
        ${sender === 'user' 
          ? 'border-blue-500/30 bg-blue-500/5' 
          : 'border-white/10 bg-slate-800/30'
        }
        hover:bg-white/10 hover:border-white/20
      `}>
        {/* Message Header */}
        <div className="flex items-center justify-between p-4 pb-2">
          <div className="flex items-center gap-3">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold
              ${sender === 'user' 
                ? 'bg-gradient-to-br from-blue-500 to-purple-600' 
                : 'bg-gradient-to-br from-green-500 to-emerald-600'
              }
            `}>
              {sender === 'user' ? 'U' : '🤖'}
            </div>
            <div>
              <div className="font-semibold text-white">
                {sender === 'user' ? 'Vi' : 'AI Asistent'}
              </div>
              {timestamp && (
                <div className="text-xs text-slate-400">
                  {new Date(timestamp).toLocaleString('sr-RS')}
                </div>
              )}
            </div>
          </div>
          
          {/* Message Actions */}
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
              title="Kopiraj poruku"
              aria-label="Kopiraj poruku u clipboard"
              tabIndex={0}
            >
              {copied ? <FaCheck size={14} className="text-green-400" aria-hidden="true" /> : <FaCopy size={14} aria-hidden="true" />}
            </button>
            
            {/* Edit/Undo for user messages */}
            {sender === 'user' && (
              <>
                {onEdit && messageId && (
                  <button
                    onClick={() => onEdit(messageId)}
                    className="p-2 text-slate-400 hover:text-yellow-400 hover:bg-yellow-500/20 rounded-lg transition-colors"
                    title="Izmeni poruku"
                    aria-label="Izmeni ovu poruku"
                    tabIndex={0}
                  >
                    <FaEdit size={14} aria-hidden="true" />
                  </button>
                )}
                {onUndo && messageId && (
                  <button
                    onClick={() => onUndo(messageId)}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                    title="Poništi poruku"
                    aria-label="Poništi ovu poruku"
                    tabIndex={0}
                  >
                    <FaUndo size={14} aria-hidden="true" />
                  </button>
                )}
              </>
            )}
            
            {/* Reactions for AI messages */}
            {sender === 'ai' && onReaction && messageId && (
              <div className="flex items-center gap-1" role="group" aria-label="Reakcije na poruku">
                <button
                  onClick={() => handleReaction('like')}
                  className={`p-2 rounded-lg transition-colors ${
                    reaction === 'like'
                      ? 'text-green-400 bg-green-500/20'
                      : 'text-slate-400 hover:text-green-400 hover:bg-green-500/20'
                  }`}
                  title="Sviđa mi se"
                  aria-label={reaction === 'like' ? 'Ukloni sviđa mi se' : 'Sviđa mi se'}
                  aria-pressed={reaction === 'like'}
                  tabIndex={0}
                >
                  <FaThumbsUp size={14} aria-hidden="true" />
                </button>
                <button
                  onClick={() => handleReaction('dislike')}
                  className={`p-2 rounded-lg transition-colors ${
                    reaction === 'dislike'
                      ? 'text-red-400 bg-red-500/20'
                      : 'text-slate-400 hover:text-red-400 hover:bg-red-500/20'
                  }`}
                  title="Ne sviđa mi se"
                  aria-label={reaction === 'dislike' ? 'Ukloni ne sviđa mi se' : 'Ne sviđa mi se'}
                  aria-pressed={reaction === 'dislike'}
                  tabIndex={0}
                >
                  <FaThumbsDown size={14} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Message Content */}
        <div className="px-4 pb-4">
          {editing ? (
            <div className="space-y-3">
              <textarea
                value={editInput}
                onChange={e => setEditInput && setEditInput(e.target.value)}
                className="w-full bg-slate-800 text-white rounded-lg p-3 border border-slate-600 focus:border-blue-500 focus:outline-none resize-none"
                rows={Math.max(3, editInput.split('\n').length)}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={saveEdit}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Sačuvaj
                </button>
                <button
                  onClick={() => onEdit && messageId && onEdit(messageId)}
                  className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Otkaži
                </button>
              </div>
            </div>
          ) : (
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown components={markdownComponents}>
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 