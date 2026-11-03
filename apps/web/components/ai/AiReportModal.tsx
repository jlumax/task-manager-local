'use client';

import { X, Copy, Check, Loader2 } from 'lucide-react';
import Markdown from './Markdown';
import { useState } from 'react';

interface Props {
  open: boolean;
  markdown: string;
  loading: boolean;
  onClose: () => void;
}

export default function AiReportModal({ open, markdown, loading, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50"
      style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-card border border-border rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-lg font-semibold text-foreground">AI 报告</h3>
          <div className="flex items-center gap-1">
            {markdown && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-muted hover:bg-accent transition-colors"
              >
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                {copied ? '已复制' : '复制'}
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted hover:bg-accent transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex flex-col items-center gap-3 py-16">
              <Loader2 size={32} className="animate-spin text-primary" />
              <p className="text-sm text-muted">正在生成报告...</p>
            </div>
          )}
          {!loading && markdown && <Markdown content={markdown} />}
          {!loading && !markdown && (
            <p className="text-center text-muted py-16">暂无内容</p>
          )}
        </div>
      </div>
    </div>
  );
}
