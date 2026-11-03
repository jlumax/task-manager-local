'use client';

import { Plus, Trash2, Check, MessageSquare } from 'lucide-react';
import type { AiConversationItem } from '@/lib/api';

interface Props {
  conversations: AiConversationItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

export default function ConversationList({ conversations, activeId, onSelect, onDelete, onNew }: Props) {
  return (
    <div className="flex h-full flex-col border-r border-border bg-muted/30">
      <div className="flex items-center justify-between border-b border-border px-3 py-3">
        <span className="text-sm font-medium text-foreground">对话记录</span>
        <button
          onClick={onNew}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-primary hover:bg-accent transition-colors"
        >
          <Plus size={14} />
          新对话
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {conversations.length === 0 && (
          <div className="px-3 py-8 text-center text-xs text-muted">
            暂无对话记录
          </div>
        )}
        {conversations.map((conv) => (
          <div
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`group cursor-pointer rounded-lg px-3 py-2.5 transition-colors ${
              activeId === conv.id
                ? 'bg-accent'
                : 'hover:bg-accent/50'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <MessageSquare size={14} className="shrink-0 text-muted" />
                <span className="text-sm text-foreground truncate">{conv.title}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conv.id);
                }}
                className="shrink-0 rounded p-0.5 text-muted opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted">
              <span>{conv.messageCount} 条消息</span>
              {conv.savedAsTask && (
                <span className="flex items-center gap-0.5 text-green-600 dark:text-green-400">
                  <Check size={12} />
                  已保存
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
