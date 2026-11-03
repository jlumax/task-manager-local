'use client';

import { useState, useRef, useEffect } from 'react';
import { useTaskStore } from '@/store/taskStore';
import { Database, Download, Upload } from 'lucide-react';

function parseMarkdownTasks(markdown: string) {
  let count = 0;
  for (const line of markdown.split('\n')) {
    const trimmed = line.trim();
    // Match web: ### [x]/[ ] title, HTML: ### N. title
    if (/^###\s+(?:\[[x\s]\]|\d+\.)\s+.+/.test(trimmed)) {
      count++;
    }
  }
  return count;
}

export default function ExportImportButtons() {
  const { exportToMarkdown, importFromMarkdown, tasks, currentPlanLimits } = useTaskStore();
  const canExport = currentPlanLimits?.export ?? true;
  const canImport = currentPlanLimits?.import ?? true;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [pendingText, setPendingText] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const handleExport = () => {
    setShowMenu(false);
    const markdown = exportToMarkdown();
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `任务列表_${new Date().toLocaleDateString('zh-CN')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    setShowMenu(false);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const count = parseMarkdownTasks(text);
    if (count === 0) {
      alert('未识别到有效任务，请检查文件格式是否正确');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setPendingText(text);
    setPendingCount(count);
    setShowDialog(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const executeImport = async (mode: 'overwrite' | 'merge') => {
    setImporting(true);
    try {
      await importFromMarkdown(pendingText, mode);
      setShowDialog(false);
      setPendingText('');
      setPendingCount(0);
      if (mode === 'overwrite') {
        alert('任务导入覆盖成功');
      } else {
        alert('任务导入合并成功');
      }
    } catch (err: any) {
      alert(err?.message || '导入失败，请重试');
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <div ref={menuRef} style={{ position: 'relative', width: '100%' }}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="export-btn"
          style={{ width: '100%', padding: '10px 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          <span className="icon-label"><Database size={15} />数据</span>
        </button>
        {showMenu && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              right: 0,
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              zIndex: 100,
              minWidth: '100px',
              overflow: 'hidden',
            }}
          >
            {canExport && (
            <button
              onClick={handleExport}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 12px',
                background: 'transparent',
                border: 'none',
                color: 'var(--foreground)',
                cursor: 'pointer',
                fontSize: '0.9rem',
                textAlign: 'left',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.background = 'var(--accent)'; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'transparent'; }}
            >
              <span className="icon-label"><Download size={14} />导出</span>
            </button>
            )}
            {canImport && (
            <button
              onClick={handleImportClick}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 12px',
                background: 'transparent',
                border: 'none',
                color: 'var(--foreground)',
                cursor: 'pointer',
                fontSize: '0.9rem',
                textAlign: 'left',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.background = 'var(--accent)'; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'transparent'; }}
            >
              <span className="icon-label"><Upload size={14} />导入</span>
            </button>
            )}
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {showDialog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => !importing && setShowDialog(false)}
        >
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '24px',
              width: '360px',
              maxWidth: '90vw',
              boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem', color: 'var(--foreground)' }}>
              导入任务
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '0.9rem', color: 'var(--muted)', lineHeight: 1.6 }}>
              检测到 <strong style={{ color: 'var(--foreground)' }}>{pendingCount}</strong> 个有效任务。
              当前已有 <strong style={{ color: 'var(--foreground)' }}>{tasks.length}</strong> 个任务。
              <br />
              <br />
              <strong style={{ color: 'var(--foreground)' }}>覆盖</strong>：清空现有任务后导入新任务
              <br />
              <strong style={{ color: 'var(--foreground)' }}>合并</strong>：保留现有任务并追加新任务
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDialog(false)}
                disabled={importing}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--foreground)',
                  cursor: importing ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem',
                  opacity: importing ? 0.6 : 1,
                }}
              >
                取消
              </button>
              <button
                onClick={() => executeImport('merge')}
                disabled={importing}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--primary)',
                  background: 'var(--card)',
                  color: 'var(--primary)',
                  cursor: importing ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem',
                  opacity: importing ? 0.6 : 1,
                }}
              >
                {importing ? '导入中...' : '合并'}
              </button>
              <button
                onClick={() => executeImport('overwrite')}
                disabled={importing}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                  cursor: importing ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem',
                  opacity: importing ? 0.6 : 1,
                }}
              >
                {importing ? '导入中...' : '覆盖'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
