'use client';

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download } from 'lucide-react';

interface ImageLightboxProps {
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

function LightboxButton({ onClick, title, children }: { onClick?: () => void; title: string; children: ReactNode }) {
  return (
    <button
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      className="rounded-lg p-2 text-muted hover:bg-accent hover:text-foreground active:opacity-70 transition-colors"
      title={title}
    >
      {children}
    </button>
  );
}

export default function ImageLightbox({ images, initialIndex = 0, onClose }: ImageLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(images.length - 1, i + 1));
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose, images.length]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    setScale((s) => Math.max(0.5, Math.min(5, s - e.deltaY * 0.002)));
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setDragging(false);

  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const zoomIn = () => setScale((s) => Math.min(5, s + 0.25));
  const zoomOut = () => setScale((s) => Math.max(0.5, s - 0.25));

  const currentImage = images[index];

  return (
    <div
      className="fixed inset-0 z-[200] grid place-items-center p-3 backdrop-blur-sm select-none sm:p-6"
      style={{ background: 'color-mix(in srgb, var(--primary) 14%, rgba(7, 12, 11, .58))' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="图片预览"
        className="relative flex max-h-[720px] flex-col overflow-hidden rounded-2xl border border-border bg-card text-foreground"
        style={{
          width: 'min(88vw, 960px)',
          height: 'min(78vh, 720px)',
          boxShadow: '0 32px 90px color-mix(in srgb, var(--primary) 18%, rgba(0, 0, 0, .28))',
        }}
        onClick={(event) => event.stopPropagation()}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >

      {/* 顶部栏 */}
      <div className="relative z-10 flex items-center justify-between border-b border-border px-4 py-3">
        <div className="text-sm text-muted">
          {index + 1} / {images.length}
        </div>
        <div className="flex items-center gap-1">
          <LightboxButton onClick={zoomOut} title="缩小"><ZoomOut size={18} /></LightboxButton>
          <LightboxButton onClick={zoomIn} title="放大"><ZoomIn size={18} /></LightboxButton>
          <LightboxButton onClick={resetView} title="重置">
            <RotateCw size={18} />
          </LightboxButton>
          <a
            href={currentImage}
            download
            className="rounded-lg p-2 text-muted hover:bg-accent hover:text-foreground active:opacity-70 transition-colors"
            title="下载原图"
            onClick={(e) => e.stopPropagation()}
          >
            <Download size={18} />
          </a>
          <LightboxButton onClick={onClose} title="关闭"><X size={18} /></LightboxButton>
        </div>
      </div>

      {/* 图片区域 */}
      <div
        className="relative z-10 flex flex-1 items-center justify-center overflow-hidden"
        style={{ background: 'color-mix(in srgb, var(--accent) 72%, var(--card))' }}
        onClick={onClose}
      >
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); setIndex((i) => Math.max(0, i - 1)); resetView(); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-border bg-card p-2 text-muted shadow-md hover:bg-accent hover:text-foreground transition-colors"
            >
              ‹
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setIndex((i) => Math.min(images.length - 1, i + 1)); resetView(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-border bg-card p-2 text-muted shadow-md hover:bg-accent hover:text-foreground transition-colors"
            >
              ›
            </button>
          </>
        )}
        <img
          ref={imgRef}
          src={currentImage}
          alt=""
          className="max-h-full max-w-full object-contain"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: dragging ? 'none' : 'transform 0.15s ease',
            cursor: dragging ? 'grabbing' : 'grab',
          }}
          draggable={false}
          onClick={(event) => event.stopPropagation()}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
        />
      </div>

      {/* 底部工具栏 */}
      <div className="relative z-10 flex items-center justify-center gap-2 border-t border-border px-4 py-2">
        <div className="flex items-center gap-1 rounded-full border border-border bg-accent px-3 py-1.5">
          <LightboxButton onClick={zoomOut} title="缩小"><ZoomOut size={16} /></LightboxButton>
          <span className="text-xs text-muted min-w-[3ch] text-center">{Math.round(scale * 100)}%</span>
          <LightboxButton onClick={zoomIn} title="放大"><ZoomIn size={16} /></LightboxButton>
          <span className="mx-1 text-border">|</span>
          <LightboxButton onClick={resetView} title="重置"><RotateCw size={16} /></LightboxButton>
          <a
            href={currentImage}
            download
            className="rounded-lg p-2 text-muted hover:bg-card hover:text-foreground active:opacity-70 transition-colors"
            title="下载原图"
            onClick={(e) => e.stopPropagation()}
          >
            <Download size={16} />
          </a>
          <span className="mx-1 text-border">|</span>
          <LightboxButton onClick={onClose} title="关闭"><X size={16} /></LightboxButton>
        </div>
      </div>

      {/* 缩略图 */}
      {images.length > 1 && (
        <div className="relative z-10 flex justify-center gap-2 px-4 pb-3">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                setIndex(i);
                resetView();
              }}
              className={`h-12 w-12 shrink-0 rounded-lg border-2 overflow-hidden ${
                i === index ? 'border-primary' : 'border-border'
              }`}
            >
              <img src={img} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
