'use client';

import { useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X, Check } from 'lucide-react';

interface MarkdownEditorProps {
  isOpen: boolean;
  initialValue: string;
  title?: string;
  placeholder?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  extra?: ReactNode;
  onPasteImage?: (files: File[]) => void;
  overlayStyle?: React.CSSProperties;
}

function extractImageFiles(dataTransfer: DataTransfer | null): File[] {
  if (!dataTransfer) return [];
  const files: File[] = [];
  for (const item of Array.from(dataTransfer.items)) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) files.push(file);
    }
  }
  if (files.length === 0) {
    for (const file of Array.from(dataTransfer.files)) {
      if (file.type.startsWith('image/')) files.push(file);
    }
  }
  return files;
}

export default function MarkdownEditor({
  isOpen,
  initialValue,
  title = '编辑内容',
  placeholder = '在此输入...',
  onConfirm,
  onCancel,
  extra,
  onPasteImage,
  overlayStyle,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(initialValue);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
      setDragOver(false);
      setTimeout(() => {
        const el = textareaRef.current;
        if (el) {
          el.focus();
          el.style.height = 'auto';
          el.style.height = Math.min(el.scrollHeight, 360) + 'px';
        }
      }, 50);
    }
  }, [isOpen, initialValue]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onCancel]);

  const imageUrlRegex = /\.(jpg|jpeg|png|gif|webp|bmp|svg|heic|heif)$/i;

  const handlePaste = (e: React.ClipboardEvent) => {
    const files = extractImageFiles(e.clipboardData);
    if (files.length > 0) {
      if (onPasteImage) {
        e.preventDefault();
        onPasteImage(files);
      }
      return;
    }

    // 检测粘贴的文本是否为图床图片链接，自动转为 Markdown 图片语法
    const text = e.clipboardData.getData('text/plain');
    if (text && imageUrlRegex.test(text.trim())) {
      e.preventDefault();
      const ta = textareaRef.current;
      if (ta) {
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const imgMd = `![](${text.trim()})`;
        setValue((prev) => prev.slice(0, start) + imgMd + prev.slice(end));
        // 粘贴后将光标移到插入内容之后
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + imgMd.length;
        });
      } else {
        setValue((prev) => prev + `![](${text.trim()})`);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!onPasteImage) return;
    const files = extractImageFiles(e.dataTransfer);
    if (files.length > 0) {
      onPasteImage(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.currentTarget === containerRef.current) {
      setDragOver(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="markdown-editor-overlay"
      style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', ...overlayStyle }}
    >
      <div
        ref={containerRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`w-full max-w-xl bg-card border rounded-xl shadow-2xl p-5 animate-in fade-in zoom-in-95 duration-200 ${
          dragOver ? 'border-primary ring-2 ring-primary/30' : 'border-border'
        }`}
      >
        <h3 className="text-lg font-semibold text-foreground mb-1">
          {title}
        </h3>
        <p className="text-xs text-muted mb-3">
          支持 Markdown：**粗体** *斜体* `代码` - 列表
        </p>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              onConfirm(value);
            }
          }}
          placeholder={placeholder}
          className="w-full bg-accent border border-border rounded-lg p-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-sans"
          style={{
            minHeight: 180,
            maxHeight: 360,
            height: 'auto',
            overflowY: 'auto',
            resize: 'none',
          }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = 'auto';
            el.style.height = Math.min(el.scrollHeight, 360) + 'px';
          }}
        />
        {extra && <div className="mt-3">{extra}</div>}
        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            onClick={() => onConfirm(value)}
            className="flex items-center gap-1 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Check size={16} />
            确认
          </button>
          <button
            onClick={onCancel}
            className="flex items-center gap-1 px-4 py-2 text-sm rounded-lg bg-accent text-foreground border border-border hover:bg-border transition-colors"
          >
            <X size={16} />
            取消
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
