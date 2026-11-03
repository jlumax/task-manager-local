'use client';

import { useState } from 'react';
import { Bot, User, Wrench, ChevronDown, ChevronRight, Circle, CheckCircle } from 'lucide-react';
import Markdown from './Markdown';

interface Props {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolName?: string;
  toolResult?: string;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
}

export default function ChatBubble({ role, content, toolName, toolResult, selectable, selected, onToggle }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (role === 'tool') {
    return (
      <div className="flex gap-2.5 items-start">
        {selectable && <div className="w-5 shrink-0 mt-0.5" />}
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 mt-0.5">
          <Wrench size={13} />
        </div>
        <div className="max-w-[85%]">
          <div className="text-xs text-muted italic">
            {content}
            {toolResult && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] text-muted/60 hover:text-muted transition-colors"
              >
                {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                {expanded ? '收起' : '详情'}
              </button>
            )}
          </div>
          {expanded && toolResult && (
            <div className="mt-1 rounded-lg bg-accent/50 px-2.5 py-2 text-[11px] text-muted max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {toolResult}
            </div>
          )}
        </div>
      </div>
    );
  }

  const isUser = role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Selection checkbox */}
      {selectable && (
        <button
          onClick={onToggle}
          className="shrink-0 self-center text-muted hover:text-primary transition-colors"
        >
          {selected ? (
            <CheckCircle size={20} className="text-primary" />
          ) : (
            <Circle size={20} />
          )}
        </button>
      )}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? 'bg-primary text-primary-foreground' : 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
        }`}
      >
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-md'
            : 'bg-accent text-foreground rounded-tl-md'
        }`}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap">{content}</div>
        ) : (
          <Markdown content={content} />
        )}
      </div>
    </div>
  );
}
