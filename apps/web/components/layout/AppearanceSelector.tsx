'use client';

import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { useTaskStore } from '@/store/taskStore';
import { ThemeType, FontFamily } from '@/types';
import { Check, ImagePlus, Palette, Sparkles, Trash2, Upload } from 'lucide-react';
import { processCustomThemeImage } from '@/lib/custom-theme';

const themes: { key: ThemeType; label: string; gradient: string }[] = [
  { key: 'default', label: '简洁白', gradient: 'linear-gradient(135deg, #ffffff 0%, #e7efeb 100%)' },
  { key: 'starry', label: '极光星空', gradient: 'linear-gradient(135deg, #28b984 0%, #0b8fa0 38%, #3b82c4 68%, #d74d91 100%)' },
  { key: 'morandi', label: '莫兰迪咖', gradient: 'linear-gradient(135deg, #d8cec5 0%, #a99584 100%)' },
  { key: 'morandi-blue', label: '莫兰迪蓝', gradient: 'linear-gradient(135deg, #b7c4cc 0%, #718999 100%)' },
  { key: 'morandi-multi', label: '莫兰迪多色', gradient: 'linear-gradient(135deg, #cbbdaf 0%, #b2c2ad 50%, #aabdc4 100%)' },
  { key: 'rage', label: '暴走模式', gradient: '#b42318' },
  { key: 'success', label: '上岸模式', gradient: '#671a19' },
  { key: 'custom', label: '图片主题', gradient: 'linear-gradient(135deg, #d7dfda 0%, #6f8d7e 100%)' },
];

const fonts: { key: FontFamily; label: string }[] = [
  { key: 'noto-sans', label: '思源黑体' },

  { key: 'wenkai', label: '霞鹜文楷' },
  { key: 'longcang', label: '龙藏行书' },
  { key: 'zen-old-mincho', label: '古典明体' },
  { key: 'klee-one', label: '教科手写' },
  { key: 'system', label: '系统默认' },
];

export default function AppearanceSelector() {
  const {
    theme,
    setTheme,
    customThemeImage,
    setCustomTheme,
    clearCustomTheme,
    fontFamily,
    setFontFamily,
    effectsEnabled,
    toggleEffects,
  } = useTaskStore();
  const [open, setOpen] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  const [imageMessage, setImageMessage] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const dropdownStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '6px',
    padding: '12px',
    width: '280px',
  };

  const selectTheme = (nextTheme: ThemeType) => {
    if (nextTheme === 'custom' && !customThemeImage) {
      imageInputRef.current?.click();
      return;
    }
    setTheme(nextTheme);
    setOpen(false);
  };

  const handleImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      setProcessingImage(true);
      setImageMessage('正在压缩图片并提取主色…');
      const { image, palette } = await processCustomThemeImage(file);
      await setCustomTheme(image, palette);
      setImageMessage('图片主题已应用');
      setOpen(false);
    } catch (error) {
      setImageMessage(error instanceof Error ? error.message : '图片处理失败');
    } finally {
      setProcessingImage(false);
    }
  };

  return (
    <div data-theme="btn-wrapper" ref={ref}>
      <button onClick={() => setOpen(!open)} data-theme="btn">
        <span className="icon-label"><Palette size={15} />外观</span>
      </button>

      <div data-theme="dropdown" className={open ? 'show' : ''} style={{ minWidth: '280px' }}>
        <input
          ref={imageInputRef}
          hidden
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={handleImage}
        />
        {/* 主题 — 4列色块网格 */}
        <div style={{ padding: '6px 12px 2px', fontSize: '0.68rem', color: 'var(--muted)', letterSpacing: '0.06em' }}>
          主题
        </div>
        <div style={dropdownStyle}>
          {themes.map((t) => (
            <div
              key={t.key}
              onClick={() => selectTheme(t.key)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 2px',
                borderRadius: '8px',
                cursor: 'pointer',
                background: theme === t.key ? 'var(--accent)' : 'transparent',
                border: theme === t.key ? '1px solid var(--primary)' : '1px solid transparent',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => {
                if (theme !== t.key) e.currentTarget.style.background = 'var(--accent)';
              }}
              onMouseLeave={(e) => {
                if (theme !== t.key) e.currentTarget.style.background = 'transparent';
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: t.key === 'custom' && customThemeImage
                    ? `url("${customThemeImage}") center / cover`
                    : t.gradient,
                  border: t.key === 'default' ? '1px solid #d0d7de' : '1px solid transparent',
                  boxShadow: theme === t.key ? '0 0 0 2px var(--primary)' : undefined,
                  flexShrink: 0,
                }}
              />
              <span style={{
                fontSize: '0.62rem',
                color: 'var(--foreground)',
                fontWeight: theme === t.key ? 600 : 400,
                whiteSpace: 'nowrap',
                lineHeight: 1,
              }}>
                {t.label}
              </span>
            </div>
          ))}
        </div>

        <div style={{ padding: '0 12px 8px' }}>
          <button
            type="button"
            disabled={processingImage}
            onClick={() => imageInputRef.current?.click()}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '7px 10px',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--foreground)',
              background: 'var(--card)',
              cursor: processingImage ? 'wait' : 'pointer',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            {customThemeImage ? <Upload size={13} /> : <ImagePlus size={13} />}
            {processingImage ? '正在处理…' : customThemeImage ? '更换背景图片' : '导入背景图片'}
          </button>
          {customThemeImage && (
            <button
              type="button"
              onClick={() => clearCustomTheme()}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                marginTop: '5px',
                padding: '4px 8px',
                border: 0,
                color: 'var(--muted)',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '0.68rem',
              }}
            >
              <Trash2 size={12} />移除自定义背景
            </button>
          )}
          {imageMessage && (
            <p role="status" style={{ margin: '5px 0 0', color: 'var(--muted)', fontSize: '0.66rem', textAlign: 'center' }}>
              {imageMessage}
            </p>
          )}
        </div>

        {/* 分隔线 */}
        <div style={{ height: '1px', background: 'var(--border)', margin: '2px 12px' }} />

        {/* 动效开关 */}
        <div style={{ padding: '6px 12px 2px', fontSize: '0.68rem', color: 'var(--muted)', letterSpacing: '0.06em' }}>
          动效
        </div>
        <div style={{ padding: '6px 12px 4px' }}>
          <div
            onClick={toggleEffects}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '5px 8px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: 500,
              color: 'var(--foreground)',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span className="icon-label"><Sparkles size={14} />动效 <span style={{ fontSize: '0.6rem', color: 'var(--muted)', fontWeight: 400 }}>如电脑卡顿可关闭</span></span>
            <span style={{
              fontSize: '0.68rem',
              padding: '1px 8px',
              borderRadius: '4px',
              background: effectsEnabled ? 'var(--primary)' : 'var(--muted)',
              color: '#fff',
              fontWeight: 600,
            }}>
              {effectsEnabled ? '开' : '关'}
            </span>
          </div>
        </div>

        {/* 分隔线 */}
        <div style={{ height: '1px', background: 'var(--border)', margin: '2px 12px' }} />

        {/* 字体 — 紧凑单行 */}
        <div style={{ padding: '6px 12px 2px', fontSize: '0.68rem', color: 'var(--muted)', letterSpacing: '0.06em' }}>
          字体
        </div>
        <div style={{ padding: '6px 12px 10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {fonts.map((f) => (
            <div
              key={f.key}
              onClick={() => { setFontFamily(f.key); setOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 8px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.82rem',
                fontWeight: fontFamily === f.key ? 600 : 400,
                color: 'var(--foreground)',
                background: fontFamily === f.key ? 'var(--accent)' : 'transparent',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => {
                if (fontFamily !== f.key) e.currentTarget.style.background = 'var(--accent)';
              }}
              onMouseLeave={(e) => {
                if (fontFamily !== f.key) e.currentTarget.style.background = 'transparent';
              }}
            >
              {f.label}
              {fontFamily === f.key && (
                <Check size={13} style={{ marginLeft: 'auto', color: 'var(--primary)' }} />
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
