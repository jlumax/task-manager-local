'use client';

import { useState, useRef, useEffect } from 'react';
import { useTaskStore } from '@/store/taskStore';
import { FontFamily } from '@/types';
import { Check, Type } from 'lucide-react';

const fonts: { key: FontFamily; label: string; preview: string }[] = [
  { key: 'noto-sans', label: '思源黑体', preview: '现代清晰，阅读舒适' },

  { key: 'wenkai', label: '霞鹜文楷', preview: '手写感，温暖治愈' },
  { key: 'longcang', label: '龙藏行书', preview: '行书流畅，潇洒自然' },
  { key: 'zen-old-mincho', label: '古典明体', preview: '日式典雅，浓郁人文' },
  { key: 'klee-one', label: '教科手写', preview: '硬笔质感，温暖质朴' },
  { key: 'system', label: '系统默认', preview: '原生字体，极速加载' },
];

export default function FontSelector() {
  const { fontFamily, setFontFamily } = useTaskStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentFont = fonts.find((f) => f.key === fontFamily) || fonts[0];

  return (
    <div data-theme="btn-wrapper" ref={ref}>
      <button onClick={() => setOpen(!open)} data-theme="btn">
        <span className="icon-label"><Type size={15} />字体</span>
      </button>

      <div data-theme="dropdown" className={open ? 'show' : ''}>
        {fonts.map((f) => (
          <div
            key={f.key}
            onClick={() => {
              setFontFamily(f.key);
              setOpen(false);
            }}
            data-theme="option"
            style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '2px', padding: '10px 14px' }}
          >
            <span style={{ fontSize: '0.9rem', fontWeight: fontFamily === f.key ? 700 : 500 }}>
              {f.label}
              {fontFamily === f.key && (
                <Check size={13} style={{ marginLeft: 6, color: 'var(--primary)' }} />
              )}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--muted)', letterSpacing: '0.02em' }}>
              {f.preview}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
