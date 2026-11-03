'use client';

import { SearchX, SquarePen } from 'lucide-react';

interface EmptyStateProps {
  searchTerm?: string;
  title?: string;
  hint?: string;
}

export default function EmptyState({ searchTerm, title, hint }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '300px',
      padding: '60px 24px',
      textAlign: 'center',
    }}>
      <div className="empty-state-icon">{searchTerm ? <SearchX size={28} /> : <SquarePen size={28} />}</div>
      <p style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '4px', color: 'var(--foreground)' }}>
        {searchTerm ? '未找到匹配任务' : (title || '暂无任务')}
      </p>
      <p style={{ fontSize: '0.9rem', opacity: 0.7, color: 'var(--muted)' }}>
        {searchTerm ? '请尝试其他关键词' : (hint || '点击上方的“+”按钮创建第一个任务')}
      </p>
    </div>
  );
}
