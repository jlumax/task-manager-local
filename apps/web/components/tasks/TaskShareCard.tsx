'use client';

import { forwardRef } from 'react';
import { Task } from '@/types';
import { formatTime, formatDate } from '@/lib/utils';

const PRIORITY_COLORS: Record<string, string> = {
  high: '#cf222e',
  medium: '#f59e0b',
  low: '#2ea043',
};
const PRIORITY_LABELS: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
};
const PRIORITY_BG: Record<string, string> = {
  high: '#cf222e18',
  medium: '#f59e0b18',
  low: '#2ea04318',
};

interface TaskShareCardProps {
  task: Task;
  appTitle: string;
  appSubtitle: string;
  appUrl: string;
  qrCodeDataURL: string;
  fontFamily: string;
}

const S = {
  card: {
    width: '650px',
    background: '#ffffff',
    borderRadius: '16px',
    padding: '40px 44px',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC', sans-serif",
    color: '#1a1a2e',
    lineHeight: 1.6,
    borderLeft: '6px solid #3b82f6',
    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
    position: 'relative' as const,
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,

  title: {
    fontSize: '24px',
    fontWeight: 700,
    margin: '0 0 6px 0',
    color: '#1a1a2e',
    lineHeight: 1.3,
    wordBreak: 'break-word' as const,
  },

  codeBadge: {
    display: 'inline-block',
    fontSize: '12px',
    color: '#666',
    background: '#f3f4f6',
    padding: '2px 8px',
    borderRadius: '4px',
    marginBottom: '20px',
    fontFamily: "'SF Mono', 'Menlo', monospace",
  },

  metaGrid: {
    display: 'grid' as const,
    gridTemplateColumns: '1fr 1fr',
    gap: '8px 24px',
    marginBottom: '24px',
    padding: '16px 20px',
    background: '#fafafa',
    borderRadius: '10px',
  } as React.CSSProperties,

  metaItem: {
    display: 'flex',
    gap: '8px',
    fontSize: '14px',
    lineHeight: 1.8,
  } as React.CSSProperties,

  metaLabel: {
    color: '#888',
    flexShrink: 0,
    fontWeight: 500,
  } as React.CSSProperties,

  metaValue: {
    color: '#1a1a2e',
  } as React.CSSProperties,

  priorityBadge: (p: string) => ({
    display: 'inline-block',
    padding: '1px 10px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: 600,
    color: PRIORITY_COLORS[p] || '#666',
    background: PRIORITY_BG[p] || '#f3f4f6',
  }) as React.CSSProperties,

  sectionTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#1a1a2e',
    margin: '0 0 16px 0',
    paddingBottom: '8px',
    borderBottom: '1px solid #eee',
  } as React.CSSProperties,

  emptyProgress: {
    fontSize: '14px',
    color: '#aaa',
    fontStyle: 'italic' as const,
  } as React.CSSProperties,

  progressList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0',
    paddingLeft: '8px',
    marginBottom: '28px',
  } as React.CSSProperties,

  progressItem: {
    position: 'relative' as const,
    padding: '10px 0 10px 20px',
    borderLeft: '2px solid #e5e7eb',
  } as React.CSSProperties,

  progressItemFirst: {
    paddingTop: '2px',
  } as React.CSSProperties,

  progressItemLast: {
    borderLeftColor: 'transparent',
    paddingBottom: '0',
  } as React.CSSProperties,

  progressDot: (first?: boolean) => ({
    position: 'absolute' as const,
    left: '-5.5px',
    top: first ? '6px' : '14px',
    width: '9px',
    height: '9px',
    borderRadius: '50%',
    background: '#3b82f6',
    border: '2px solid #ffffff',
  }) as React.CSSProperties,

  progressTime: {
    fontSize: '12px',
    color: '#888',
    marginBottom: '4px',
    fontWeight: 500 as const,
  } as React.CSSProperties,

  progressContent: {
    fontSize: '14px',
    color: '#333',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  } as React.CSSProperties,

  divider: {
    border: 'none',
    borderTop: '1px solid #e5e7eb',
    margin: '0 0 20px 0',
  } as React.CSSProperties,

  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  } as React.CSSProperties,

  footerBrand: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  } as React.CSSProperties,

  footerAppName: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#1a1a2e',
  } as React.CSSProperties,

  footerSlogan: {
    fontSize: '13px',
    color: '#888',
  } as React.CSSProperties,

  footerUrl: {
    fontSize: '12px',
    color: '#aaa',
    fontFamily: "'SF Mono', 'Menlo', monospace",
  } as React.CSSProperties,

  qrCode: {
    width: '72px',
    height: '72px',
    borderRadius: '6px',
    border: '1px solid #eee',
  } as React.CSSProperties,

  strikethrough: {
    textDecoration: 'line-through',
    color: '#999',
  } as React.CSSProperties,
};

const TaskShareCard = forwardRef<HTMLDivElement, TaskShareCardProps>(
  function TaskShareCard({ task, appTitle, appSubtitle, appUrl, qrCodeDataURL, fontFamily }, ref) {
    const sortedProgress = [...task.progress].sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
    );

    const statusText = task.completed
      ? '已完成'
      : task.stuck
      ? '僵持中'
      : '进行中';
    const statusColor = task.completed
      ? '#2ea043'
      : task.stuck
      ? '#d29922'
      : '#3b82f6';

    const cardBorderColor = task.completed
      ? '#2ea043'
      : task.stuck
      ? '#d29922'
      : PRIORITY_COLORS[task.priority] || '#3b82f6';

    return (
      <div
        ref={ref}
        style={{
          ...S.card,
          fontFamily,
          borderLeftColor: cardBorderColor,
        }}
      >
        {/* Title */}
        <h1 style={task.completed ? { ...S.title, ...S.strikethrough } : S.title}>
          {task.title}
        </h1>
        <span style={S.codeBadge}>{task.code}</span>

        {/* Meta grid */}
        <div style={S.metaGrid}>
          <div style={S.metaItem}>
            <span style={S.metaLabel}>优先级</span>
            <span style={S.priorityBadge(task.priority)}>
              {PRIORITY_LABELS[task.priority]}
            </span>
          </div>
          <div style={S.metaItem}>
            <span style={S.metaLabel}>状态</span>
            <span style={{ ...S.metaValue, color: statusColor, fontWeight: 600 }}>
              {statusText}
            </span>
          </div>
          <div style={S.metaItem}>
            <span style={S.metaLabel}>创建时间</span>
            <span style={S.metaValue}>{formatTime(task.createdAt)}</span>
          </div>
          {task.deadline ? (
            <div style={S.metaItem}>
              <span style={S.metaLabel}>截止日期</span>
              <span style={S.metaValue}>{formatDate(task.deadline)}</span>
            </div>
          ) : (
            <div style={S.metaItem}>
              <span style={S.metaLabel}>截止日期</span>
              <span style={{ ...S.metaValue, color: '#aaa' }}>未设置</span>
            </div>
          )}
          {task.completedAt && (
            <div style={S.metaItem}>
              <span style={S.metaLabel}>完成时间</span>
              <span style={S.metaValue}>{formatTime(task.completedAt)}</span>
            </div>
          )}
          <div style={S.metaItem}>
            <span style={S.metaLabel}>进展记录</span>
            <span style={S.metaValue}>{task.progress.length} 条</span>
          </div>
        </div>

        {/* Progress records */}
        {sortedProgress.length > 0 ? (
          <>
            <h3 style={S.sectionTitle}>进展记录</h3>
            <div style={S.progressList}>
              {sortedProgress.map((p, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === sortedProgress.length - 1;
                return (
                  <div
                    key={idx}
                    style={{
                      ...S.progressItem,
                      ...(isFirst ? S.progressItemFirst : {}),
                      ...(isLast ? S.progressItemLast : {}),
                    }}
                  >
                    <div style={S.progressDot(isFirst)} />
                    <div style={S.progressTime}>{formatTime(p.time)}</div>
                    <div style={S.progressContent}>{p.content}</div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <h3 style={S.sectionTitle}>进展记录</h3>
            <div style={S.emptyProgress}>暂无进展记录</div>
          </>
        )}

        {/* Footer */}
        <hr style={S.divider} />
        <div style={S.footer}>
          <div style={S.footerBrand}>
            <span style={S.footerAppName}>{appTitle.replace(/📋\s*/, '')}</span>
            <span style={S.footerSlogan}>{appSubtitle}</span>
            <span style={S.footerUrl}>{appUrl}</span>
          </div>
          {qrCodeDataURL ? (
            <img
              src={qrCodeDataURL}
              alt="QR"
              style={S.qrCode}
            />
          ) : (
            <div style={S.qrCode} />
          )}
        </div>
      </div>
    );
  }
);

export default TaskShareCard;
