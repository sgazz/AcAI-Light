'use client';

import { useState } from 'react';
import { FaThumbsUp, FaThumbsDown } from 'react-icons/fa';

type ReactionType = '👍' | '👎' | '❤️' | '🤔';

interface MessageReactionsProps {
  messageId: string;
  initialReactions?: ReactionType[];
  onReactionChange?: (messageId: string, reactions: ReactionType[]) => void;
}

export default function MessageReactions({ messageId, initialReactions = [], onReactionChange }: MessageReactionsProps) {
  const [reactions, setReactions] = useState<ReactionType[]>(initialReactions);

  const handleReaction = (reaction: ReactionType) => {
    setReactions(prev => {
      const newReactions = prev.includes(reaction)
        ? prev.filter(r => r !== reaction)
        : [...prev, reaction];
      
      onReactionChange?.(messageId, newReactions);
      return newReactions;
    });
  };

  return (
    <div className="flex items-center gap-1 mt-2">
      <button
        onClick={() => handleReaction('👍')}
        className={`p-1 rounded transition-colors ${
          reactions.includes('👍')
            ? 'bg-[var(--accent-green)]/20 text-[var(--accent-green)]'
            : 'text-[var(--text-muted)] hover:text-[var(--accent-green)] hover:bg-[var(--accent-green)]/10'
        }`}
        title="Sviđa mi se"
      >
        👍
      </button>
      
      <button
        onClick={() => handleReaction('👎')}
        className={`p-1 rounded transition-colors ${
          reactions.includes('👎')
            ? 'bg-[var(--accent-red)]/20 text-[var(--accent-red)]'
            : 'text-[var(--text-muted)] hover:text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10'
        }`}
        title="Ne sviđa mi se"
      >
        👎
      </button>
      
      <button
        onClick={() => handleReaction('❤️')}
        className={`p-1 rounded transition-colors ${
          reactions.includes('❤️')
            ? 'bg-[var(--accent-red)]/20 text-[var(--accent-red)]'
            : 'text-[var(--text-muted)] hover:text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10'
        }`}
        title="Volim"
      >
        ❤️
      </button>
      
      <button
        onClick={() => handleReaction('🤔')}
        className={`p-1 rounded transition-colors ${
          reactions.includes('🤔')
            ? 'bg-[var(--accent-yellow)]/20 text-[var(--accent-yellow)]'
            : 'text-[var(--text-muted)] hover:text-[var(--accent-yellow)] hover:bg-[var(--accent-yellow)]/10'
        }`}
        title="Razmišljam"
      >
        🤔
      </button>
      
      {reactions.length > 0 && (
        <span className="text-xs text-[var(--text-muted)] ml-2">
          {reactions.length}
        </span>
      )}
    </div>
  );
} 