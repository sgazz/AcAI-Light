'use client';

import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FaCopy, FaCheck } from 'react-icons/fa';
import MessageReactions from './MessageReactions';
import { useClipboard } from '../utils/clipboard';
import { motion } from 'framer-motion';

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
  const { copyToClipboard, copied } = useClipboard();

  // Debug logging
  console.log('MessageRenderer props:', { 
    messageId, 
    sender, 
    isLastUserMessage, 
    aiTyping, 
    editing,
    hasOnEdit: !!onEdit,
    hasOnUndo: !!onUndo
  });

  // Debug logging
  if (sender === 'ai') {
    console.log('AI message renderer:', { messageId, sender, hasOnReaction: !!onReaction });
  }

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex items-end ${sender === 'user' ? 'justify-end' : 'justify-start'} w-full`}
    >
      {sender === 'ai' && (
        <img src="/globe.svg" alt="AI" className="w-8 h-8 rounded-full mr-2" />
      )}
      <div
        className={`
          max-w-4xl px-4 py-3 rounded-2xl shadow
          ${sender === 'user'
            ? 'bg-blue-600 text-white rounded-br-md ml-auto'
            : 'bg-slate-700 text-slate-100 rounded-bl-md mr-auto'}
        `}
        style={{ wordBreak: 'break-word' }}
      >
        {editing ? (
          <input
            value={editInput}
            onChange={e => setEditInput && setEditInput(e.target.value)}
            onBlur={saveEdit}
            className="w-full bg-slate-800 text-white rounded p-2 mb-2"
            autoFocus
          />
        ) : (
          <ReactMarkdown components={markdownComponents}>
            {content}
          </ReactMarkdown>
        )}
        {/* Edit/Undo dugmad za poslednju korisničku poruku */}
        {sender === 'user' && (
          <div className="flex gap-2 mt-2 justify-end">
            <button 
              onClick={() => {
                console.log('Edit clicked for message:', messageId);
                onEdit && messageId && onEdit(messageId);
              }} 
              className="text-xs text-yellow-300 hover:underline"
            >
              Izmeni
            </button>
            <button 
              onClick={() => {
                console.log('Undo clicked for message:', messageId);
                onUndo && messageId && onUndo(messageId);
              }} 
              className="text-xs text-red-300 hover:underline"
            >
              Poništi
            </button>
          </div>
        )}
      </div>
      {sender === 'user' && (
        <img src="/window.svg" alt="Vi" className="w-8 h-8 rounded-full ml-2" />
      )}
    </motion.div>
  );
} 