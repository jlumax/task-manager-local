'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Check, Clipboard, FileDown, Image, Share2 } from 'lucide-react';
import { Task } from '@/types';
import { useTaskStore } from '@/store/taskStore';
import {
  generateSingleTaskMarkdown,
  captureShareCard,
  downloadBlob,
  generateQRCodeDataURL,
  printTaskCard,
} from '@/lib/taskShare';
import TaskShareCard from './TaskShareCard';

interface TaskShareMenuProps {
  task: Task;
  triggerClassName?: string;
}

const menuStyle: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    display: 'inline-block',
  },
  trigger: {
    background: 'transparent',
    border: 'none',
    color: 'var(--muted)',
    cursor: 'pointer',
    padding: '2px 4px',
    fontSize: '0.95rem',
    lineHeight: 1,
    opacity: 0,
    transition: 'opacity 0.2s, color 0.2s',
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    right: 0,
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
    zIndex: 200,
    minWidth: '160px',
    width: '160px',
    overflow: 'hidden',
  },
  item: {
    display: 'block',
    width: '100%',
    padding: '10px 16px',
    background: 'transparent',
    border: 'none',
    color: 'var(--foreground)',
    cursor: 'pointer',
    fontSize: '0.9rem',
    textAlign: 'left' as const,
    whiteSpace: 'nowrap' as const,
    transition: 'background 0.15s',
  },
};

export default function TaskShareMenu({ task, triggerClassName }: TaskShareMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [shareCardVisible, setShareCardVisible] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<string | null>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const appTitle = useTaskStore((s) => s.appTitle);
  const appSubtitle = useTaskStore((s) => s.appSubtitle);
  const fontFamilyKey = useTaskStore((s) => s.fontFamily);

  const fontMap: Record<string, string> = {
    'noto-sans': "'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    'noto-serif': "'Noto Serif SC', 'Songti SC', 'SimSun', serif",
    'wenkai': "'LXGW WenKai', 'KaiTi', 'STKaiti', serif",
    'system': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  };
  const fontFamily = fontMap[fontFamilyKey] || fontMap['noto-sans'];

  // Click outside (dropdown is portaled, check trigger + dropdown refs)
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleCopyMarkdown = useCallback(async () => {
    setMenuOpen(false);
    const md = generateSingleTaskMarkdown(task);
    try {
      await navigator.clipboard.writeText(md);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = md;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 1500);
  }, [task]);

  const ensureQRCode = useCallback(async () => {
    if (!qrRef.current) {
      qrRef.current = await generateQRCodeDataURL(window.location.href);
    }
    return qrRef.current;
  }, []);

  const handleShareImage = useCallback(async () => {
    setMenuOpen(false);
    setCapturing(true);
    setShareCardVisible(true);
    try {
      const qrDataURL = await ensureQRCode();
      // Wait for React to render the portal
      await new Promise((r) => setTimeout(r, 100));
      if (!cardRef.current) throw new Error('卡片渲染失败');
      const blob = await captureShareCard(cardRef.current);
      const filename = `${task.title.slice(0, 30)}_分享卡片.png`;
      downloadBlob(blob, filename);
    } catch (err: any) {
      alert('图片生成失败: ' + (err.message || '未知错误'));
    } finally {
      setShareCardVisible(false);
      setCapturing(false);
      qrRef.current = null; // Reset to regenerate with fresh URL
    }
  }, [task, ensureQRCode]);

  const handleExportPDF = useCallback(async () => {
    setMenuOpen(false);
    const qrDataURL = await ensureQRCode();
    printTaskCard({
      task,
      appTitle,
      appSubtitle,
      appUrl: window.location.href,
      qrCodeDataURL: qrDataURL,
      fontFamily,
    });
  }, [task, ensureQRCode, appTitle, appSubtitle, fontFamily]);

  return (
    <div ref={menuRef} style={menuStyle.container}>
      <button
        className={triggerClassName || 'task-share-btn'}
        style={!triggerClassName ? menuStyle.trigger : undefined}
        onClick={() => {
            if (!menuOpen && triggerRef.current) {
              const rect = triggerRef.current.getBoundingClientRect();
              setDropdownStyle({
                position: 'fixed',
                top: rect.bottom + 4,
                left: rect.left,
                zIndex: 9999,
              });
            }
            setMenuOpen(!menuOpen);
          }}
          ref={triggerRef}
        title="分享任务"
        disabled={capturing}
      >
        {copyFeedback ? <Check size={16} /> : <Share2 size={16} />}
      </button>

      {menuOpen &&
        createPortal(
        <div ref={dropdownRef} style={{ ...menuStyle.dropdown, ...dropdownStyle }}>
          <button
            style={menuStyle.item}
            onClick={handleCopyMarkdown}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = 'transparent';
            }}
          >
            <span className="icon-label"><Clipboard size={15} />复制 Markdown</span>
          </button>
          <button
            style={menuStyle.item}
            onClick={handleShareImage}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = 'transparent';
            }}
          >
            <span className="icon-label"><Image size={15} />分享图片</span>
          </button>
          <button
            style={menuStyle.item}
            onClick={handleExportPDF}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = 'transparent';
            }}
          >
            <span className="icon-label"><FileDown size={15} />导出 PDF</span>
          </button>
        </div>,
        document.body
      )}

      {shareCardVisible &&
        createPortal(
          <div
            ref={cardRef}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              zIndex: 99999,
              background: '#fff',
            }}
          >
            <TaskShareCard
              task={task}
              appTitle={appTitle}
              appSubtitle={appSubtitle}
              appUrl={window.location.href}
              qrCodeDataURL={qrRef.current || ''}
              fontFamily={fontFamily}
            />
          </div>,
          document.body
        )}
    </div>
  );
}
