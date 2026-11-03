'use client';

import { useState, useRef, useEffect } from 'react';
import { useTaskStore } from '@/store/taskStore';
import { ThemeType } from '@/types';
import { Palette } from 'lucide-react';

const themes: { key: ThemeType; label: string; gradient: string }[] = [
  { key: 'default', label: '简洁白', gradient: 'linear-gradient(135deg, #ffffff 0%, #f6f8fa 50%, #0969da 100%)' },
  { key: 'starry', label: '星空黑', gradient: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 100%)' },
  { key: 'morandi', label: '莫兰迪咖', gradient: 'linear-gradient(135deg, #d4c5b9 0%, #b8a99a 100%)' },
  { key: 'morandi-green', label: '莫兰迪绿', gradient: 'linear-gradient(135deg, #a8b5a0 0%, #8a9a7a 100%)' },
  { key: 'morandi-blue', label: '莫兰迪蓝', gradient: 'linear-gradient(135deg, #9ab0c1 0%, #7a8fa3 100%)' },
  { key: 'morandi-multi', label: '莫兰迪多色', gradient: 'linear-gradient(135deg, #c9b8a8 0%, #a8b5a0 50%, #9ab0c1 100%)' },
  { key: 'rage', label: '暴走模式', gradient: 'linear-gradient(135deg, #fff5f5 0%, #dc2626 100%)' },
  { key: 'success', label: '上岸模式', gradient: 'linear-gradient(135deg, #dc2626 0%, #fbbf24 100%)' },
];

export default function ThemeSelector() {
  const { theme, setTheme } = useTaskStore();
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

  return (
    <div data-theme="btn-wrapper" ref={ref}>
      <button onClick={() => setOpen(!open)} data-theme="btn">
        <span className="icon-label"><Palette size={15} />主题</span>
      </button>

      <div data-theme="dropdown" className={open ? 'show' : ''}>
        {themes.map((t) => (
          <div
            key={t.key}
            onClick={() => {
              setTheme(t.key);
              setOpen(false);
            }}
            data-theme="option"
          >
            <div data-theme="preview" style={{ background: t.gradient }} />
            <span>{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
