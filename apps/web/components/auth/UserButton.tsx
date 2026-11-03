'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/hooks/useCloudBaseAuth';
import { useTaskStore } from '@/store/taskStore';
import { workspacesApi, aiApi, wechatApi } from '@/lib/api';
import Link from 'next/link';
import { celebrationTexts as defaultCelebrationTexts } from '@/components/effects/ThemeEffects';
import { PRESET_AVATARS, PRESET_NICKNAMES, randomPresetAvatar, randomPresetNickname } from '@/lib/presets';
import {
  LogOut,
  User,
  LogIn,
  RefreshCw,
  Upload,
  Download,
  Keyboard,
  X,
  Plus,
  Trash2,
  Pencil,
  Check,
  RotateCcw,
  Sparkles,
  Eye,
  EyeOff,
  Loader2,
  Coffee,
  Gem,
  PartyPopper,
  Smartphone,
} from 'lucide-react';

const planNames: Record<string, string> = {
  free: '免费版',
  pro: '专业版',
  team: '团队版',
};

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

function CoffeeModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1001, padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: '12px', padding: '30px',
          maxWidth: '360px', width: '100%',
          textAlign: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '12px', right: '12px',
            background: 'transparent', border: 'none',
            color: 'var(--muted)', cursor: 'pointer',
            fontSize: '1.4rem', lineHeight: 1, padding: '4px',
          }}
        >
          <X size={20} />
        </button>
        <p style={{ margin: '0 0 20px', fontSize: '1rem', color: 'var(--foreground)', lineHeight: 1.6 }}>
          很荣幸这个工具能帮到你
        </p>
        <img
          src="/qr-code.jpg"
          alt="收款二维码"
          style={{
            width: '240px', height: '240px',
            margin: '0 auto',
            borderRadius: '12px',
            objectFit: 'contain',
          }}
        />
      </div>
    </div>
  , document.body);
}

function ProfileEditor({
  nickname,
  avatar,
  onSaveNickname,
  onSaveAvatar,
  onReset,
  onClose,
}: {
  nickname: string;
  avatar: string;
  onSaveNickname: (n: string) => void;
  onSaveAvatar: (a: string) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const [editNickname, setEditNickname] = useState(nickname);
  const [selectedAvatar, setSelectedAvatar] = useState(avatar);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleSave = () => {
    if (editNickname.trim()) onSaveNickname(editNickname.trim());
    if (selectedAvatar) onSaveAvatar(selectedAvatar);
    onClose();
  };

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: '12px', padding: '24px',
          maxWidth: '420px', width: '100%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Pencil size={18} /> 编辑资料
        </h3>

        {/* Avatar preview */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ marginBottom: '8px', fontSize: '0.85rem', color: 'var(--muted)' }}>选择头像</div>
          {selectedAvatar ? (
            <img
              src={selectedAvatar}
              alt=""
              style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 12px' }}
            />
          ) : (
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '2rem' }}>
              {editNickname.slice(0, 1) || <User size={26} />}
            </div>
          )}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {PRESET_AVATARS.map((av, i) => (
              <button
                key={i}
                onClick={() => setSelectedAvatar(av)}
                style={{
                  width: '44px', height: '44px', borderRadius: '50%',
                  border: selectedAvatar === av ? '3px solid var(--primary)' : '3px solid transparent',
                  padding: '0', cursor: 'pointer', overflow: 'hidden',
                  opacity: selectedAvatar === av ? 1 : 0.7,
                  transition: 'all 0.15s',
                }}
              >
                <img src={av} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </button>
            ))}
          </div>
        </div>

        {/* Nickname */}
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--foreground)', marginBottom: '6px' }}>
          昵称
        </label>
        <input
          type="text"
          value={editNickname}
          onChange={(e) => setEditNickname(e.target.value)}
          placeholder="输入昵称..."
          style={{
            width: '100%', padding: '8px 12px', borderRadius: '8px',
            border: '1px solid var(--border)', background: 'var(--input)',
            color: 'var(--foreground)', fontSize: '0.9rem', outline: 'none',
            marginBottom: '20px', boxSizing: 'border-box',
          }}
        />

        {/* Preset nickname quick picks */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '8px' }}>快捷选择</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {PRESET_NICKNAMES.map((n) => (
              <button
                key={n}
                onClick={() => setEditNickname(n)}
                style={{
                  padding: '4px 10px', borderRadius: '14px',
                  border: editNickname === n ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                  background: editNickname === n ? 'var(--primary)' : 'transparent',
                  color: editNickname === n ? 'var(--primary-foreground)' : 'var(--foreground)',
                  cursor: 'pointer', fontSize: '0.8rem',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
          <button
            onClick={() => { onReset(); onClose(); }}
            style={{
              padding: '8px 14px', borderRadius: '8px',
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--muted)', cursor: 'pointer', fontSize: '0.85rem',
            }}
          >
            恢复默认
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px', borderRadius: '8px',
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--foreground)', cursor: 'pointer', fontSize: '0.85rem',
              }}
            >
              取消
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '8px 20px', borderRadius: '8px', border: 'none',
                background: 'var(--primary)', color: 'var(--primary-foreground)',
                cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
              }}
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  , document.body);
}

function CelebrationEditor({
  texts,
  onSave,
  onReset,
  onClose,
}: {
  texts: string[];
  onSave: (texts: string[]) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const [localTexts, setLocalTexts] = useState<string[]>([...texts]);
  const [newText, setNewText] = useState('');
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingVal, setEditingVal] = useState('');

  // Sync from parent if texts change externally
  useEffect(() => {
    setLocalTexts([...texts]);
  }, [texts]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editingIdx === null) onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose, editingIdx]);

  const handleAdd = () => {
    const v = newText.trim();
    if (!v) return;
    const updated = [...localTexts, v];
    setLocalTexts(updated);
    onSave(updated);
    setNewText('');
  };

  const handleDelete = (idx: number) => {
    const updated = localTexts.filter((_, i) => i !== idx);
    setLocalTexts(updated);
    onSave(updated);
    if (editingIdx === idx) setEditingIdx(null);
  };

  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditingVal(localTexts[idx]);
  };

  const saveEdit = () => {
    if (editingIdx !== null && editingVal.trim()) {
      const updated = [...localTexts];
      updated[editingIdx] = editingVal.trim();
      setLocalTexts(updated);
      onSave(updated);
    }
    setEditingIdx(null);
    setEditingVal('');
  };

  const handleReset = () => {
    setLocalTexts([...defaultCelebrationTexts]);
    onReset();
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={editingIdx === null ? onClose : undefined}
    >
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '520px',
          width: '100%',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 4px', fontSize: '1.15rem', color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PartyPopper size={19} /> 庆祝语自定义
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: 'var(--muted)' }}>
          完成任务时随机展示的庆祝文案，共 {localTexts.length} 条
        </p>

        {/* Add new */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
            placeholder="输入新的庆祝语..."
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--input)',
              color: 'var(--foreground)',
              fontSize: '0.9rem',
              outline: 'none',
            }}
          />
          <button
            onClick={handleAdd}
            disabled={!newText.trim()}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--primary)',
              color: 'var(--primary-foreground)',
              cursor: newText.trim() ? 'pointer' : 'not-allowed',
              fontSize: '0.85rem',
              opacity: newText.trim() ? 1 : 0.5,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
            }}
          >
            <Plus size={14} />
            添加
          </button>
        </div>

        {/* List */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            marginBottom: '16px',
            border: '1px solid var(--border)',
            borderRadius: '8px',
          }}
        >
          {localTexts.length === 0 ? (
            <p style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>
              暂无庆祝语，请添加
            </p>
          ) : (
            localTexts.map((text, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderBottom: idx < localTexts.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                {editingIdx === idx ? (
                  <input
                    type="text"
                    value={editingVal}
                    onChange={(e) => setEditingVal(e.target.value)}
                    onBlur={saveEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit();
                      if (e.key === 'Escape') setEditingIdx(null);
                    }}
                    autoFocus
                    style={{
                      flex: 1,
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--primary)',
                      background: 'var(--input)',
                      color: 'var(--foreground)',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                ) : (
                  <span
                    style={{
                      flex: 1,
                      fontSize: '0.85rem',
                      color: 'var(--foreground)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {text}
                  </span>
                )}
                <button
                  onClick={() => (editingIdx === idx ? saveEdit() : startEdit(idx))}
                  style={{
                    padding: '4px',
                    borderRadius: '4px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title={editingIdx === idx ? '保存' : '编辑'}
                >
                  {editingIdx === idx ? <Check size={14} /> : <Pencil size={14} />}
                </button>
                <button
                  onClick={() => handleDelete(idx)}
                  style={{
                    padding: '4px',
                    borderRadius: '4px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="删除"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
          <button
            onClick={handleReset}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="恢复默认庆祝语"
          >
            <RotateCcw size={14} />
            恢复默认
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--primary)',
              color: 'var(--primary-foreground)',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  , document.body);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>
        {title}
      </h4>
      <div style={{ display: 'grid', gap: '6px' }}>
        {children}
      </div>
    </div>
  );
}

function SectionItem({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div style={{ fontSize: '0.85rem', lineHeight: 1.55 }}>
      <span style={{ marginRight: '6px' }}>{emoji}</span>
      <strong style={{ color: 'var(--foreground)' }}>{title}</strong>
      <span style={{ color: 'var(--muted)' }}> — {desc}</span>
    </div>
  );
}

function MarkdownItem({ label, code }: { label: string; code: string }) {
  return (
    <div style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.8 }}>
      {label} <code style={{ background: 'var(--accent)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.82rem', color: 'var(--foreground)' }}>{code}</code>
    </div>
  );
}

function KbdRow({ label, keys, raw }: { label: string; keys?: string; raw?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--muted)' }}>
      <span>{label}</span>
      {keys && (
        <span style={{ display: 'flex', gap: '4px' }}>
          {keys.split(' + ').map((k) => (
            <kbd key={k} style={{ background: 'var(--accent)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--foreground)' }}>{k}</kbd>
          ))}
        </span>
      )}
      {raw && <code style={{ background: 'var(--accent)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>{raw}</code>}
    </div>
  );
}

export default function UserButton({ onShowLogin, buttonClassName }: { onShowLogin?: () => void; buttonClassName?: string }) {
  const { isSignedIn, user, signOut } = useAuth();
  const {
    lastSyncAt,
    syncFromCloud,
    exportToMarkdown,
    importFromMarkdown,
    tasks,
    currentWorkspaceId,
    currentWorkspacePlan,
    celebrationTexts,
    setCelebrationTexts,
    resetCelebrationTexts,
    userNickname,
    userAvatar,
    loadUserProfile,
    setUserNickname,
    setUserAvatar,
    resetUserProfile,
  } = useTaskStore();

  const [open, setOpen] = useState(false);

  const [showCoffee, setShowCoffee] = useState(false);
  const [showCelebrationEditor, setShowCelebrationEditor] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [showAiSettings, setShowAiSettings] = useState(false);
  const [showAiUpsell, setShowAiUpsell] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string; plan: string }[]>([]);

  // WeChat 绑定
  const [showWechatBind, setShowWechatBind] = useState(false);

  // Import/Export states (migrated from ExportImportButtons)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [pendingText, setPendingText] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [importing, setImporting] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Load workspaces for plan badge
  useEffect(() => {
    if (!isSignedIn) {
      setWorkspaces([]);
      return;
    }
    workspacesApi.list().then((list) => {
      setWorkspaces(list.map((w) => ({ id: w.id, name: w.name, plan: w.plan })));
    }).catch(() => {
      // ignore
    });
  }, [isSignedIn]);

  // Load user profile and auto-assign presets for non-WeChat users
  useEffect(() => {
    if (!isSignedIn) return;
    loadUserProfile().then(() => {
      const state = useTaskStore.getState();
      // If no saved nickname, auto-assign
      if (!state.userNickname) {
        const name = user?.nickName || randomPresetNickname();
        setUserNickname(name);
      }
      // If no saved avatar, use WeChat if available, else random preset
      if (!state.userAvatar) {
        const avatar = user?.avatarUrl || randomPresetAvatar();
        setUserAvatar(avatar);
      }
    });
  }, [isSignedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentPlan = workspaces.find((w) => w.id === currentWorkspaceId)?.plan || currentWorkspacePlan || 'free';

  // Storage estimation
  const storageInfo = useMemo(() => {
    let bytes = 0;
    for (const task of tasks) {
      bytes += JSON.stringify(task).length * 2; // UTF-16 estimate
      for (const p of task.progress) {
        if (p.images) {
          for (const img of p.images) {
            bytes += img.length * 2;
          }
        }
      }
    }
    const mb = bytes / (1024 * 1024);
    const planLimitMB = currentPlan === 'pro' ? 100 : currentPlan === 'team' ? 500 : 0;
    return {
      usedMB: mb,
      usedText: mb < 1 ? `${(mb * 1024).toFixed(0)}KB` : `${mb.toFixed(1)}MB`,
      limitMB: planLimitMB,
      percent: planLimitMB > 0 ? Math.min((mb / planLimitMB) * 100, 100) : 0,
    };
  }, [tasks, currentPlan]);

  const handleSync = useCallback(async () => {
    if (syncing || !currentWorkspaceId) return;
    setSyncing(true);
    try {
      await syncFromCloud();
    } catch {
      // ignore
    } finally {
      setSyncing(false);
    }
  }, [syncFromCloud, syncing, currentWorkspaceId]);

  const handleExport = () => {
    setOpen(false);
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
    setOpen(false);
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
    setShowImportDialog(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const executeImport = async (mode: 'overwrite' | 'merge') => {
    setImporting(true);
    try {
      await importFromMarkdown(pendingText, mode);
      setShowImportDialog(false);
      setPendingText('');
      setPendingCount(0);
      alert(mode === 'overwrite' ? '任务导入覆盖成功' : '任务导入合并成功');
    } catch (err: any) {
      alert(err?.message || '导入失败，请重试');
    } finally {
      setImporting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
  };

  const formatSyncTime = (ts: string | null) => {
    if (!ts) return '未同步';
    const d = new Date(ts);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Trigger button for non-signed-in
  if (!isSignedIn) {
    return (
      <div ref={menuRef} style={{ position: 'relative' }} data-theme="btn-wrapper">
        <button
          onClick={() => setOpen(!open)}
          className={buttonClassName || "flex items-center justify-center w-8 h-8 rounded-full bg-accent border border-border text-foreground hover:bg-border transition-colors"}
          data-theme="btn"
          title="我的"
        >
          {userAvatar ? (
            <img src={userAvatar} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
          ) : buttonClassName ? (
            <span className="flex items-center gap-1"><User size={14} />我的</span>
          ) : (
            <User size={16} />
          )}
        </button>

        {open && (
          <div data-theme="dropdown" className="show" style={{ width: '260px', overflow: 'hidden' }}>
            {/* Guest header */}
            <div className="px-3 py-3 border-b border-border">
              <p className="text-sm font-medium text-foreground">
                {userNickname || '游客模式'}
              </p>
              <p className="text-xs text-muted mt-0.5">数据仅保存在本地</p>
            </div>

            {/* Profile & Auth */}
            <div className="py-1">
              <button onClick={() => { setOpen(false); setShowProfileEditor(true); }} className="user-menu-item">
                <span className="flex items-center gap-2"><Pencil size={14} />编辑资料</span>
              </button>
              <button onClick={() => { setOpen(false); onShowLogin?.(); }} className="user-menu-item">
                <LogIn size={14} />
                登录 / 注册
              </button>
            </div>

            {/* AI Settings */}
            {currentWorkspacePlan && currentWorkspacePlan !== 'free' && (
              <div className="py-1 border-t border-border">
                <button
                  onClick={() => { setOpen(false); setShowAiSettings(true); }}
                  className="user-menu-item"
                >
                  <span className="flex items-center gap-2"><Sparkles size={14} />AI 设置</span>
                </button>
              </div>
            )}

            {/* WeChat Binding */}
            <div className="py-1 border-t border-border">
              <button
                onClick={() => { setOpen(false); setShowWechatBind(true); }}
                className="user-menu-item"
              >
                <span className="flex items-center gap-2"><Smartphone size={14} />微信任务收集</span>
              </button>
            </div>

            {/* Data */}
            <div className="py-1 border-t border-border">
              <button onClick={handleExport} className="user-menu-item">
                <Upload size={14} />
                导出数据
              </button>
              <button onClick={handleImportClick} className="user-menu-item">
                <Download size={14} />
                导入数据
              </button>
            </div>

            {/* Preferences */}
            <div className="py-1 border-t border-border">
              <button onClick={() => { setOpen(false); setShowCelebrationEditor(true); }} className="user-menu-item">
                <span className="flex items-center gap-2"><PartyPopper size={14} />庆祝语</span>
              </button>
            </div>

            {/* Help */}
            <div className="py-1 border-t border-border">
              <Link href="/help" onClick={() => setOpen(false)} className="user-menu-item">
                <Keyboard size={14} />
                帮助
              </Link>
              <button onClick={() => { setOpen(false); setShowCoffee(true); }} className="user-menu-item">
                <Coffee size={14} />
                请作者喝杯咖啡
              </button>
            </div>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept=".md,.markdown" onChange={handleFileChange} style={{ display: 'none' }} />

        {showCoffee && <CoffeeModal onClose={() => setShowCoffee(false)} />}
        {showCelebrationEditor && (
          <CelebrationEditor
            texts={celebrationTexts}
            onSave={(texts) => setCelebrationTexts(texts)}
            onReset={() => resetCelebrationTexts()}
            onClose={() => setShowCelebrationEditor(false)}
          />
        )}
        {showProfileEditor && (
          <ProfileEditor
            nickname={userNickname}
            avatar={userAvatar}
            onSaveNickname={(n) => setUserNickname(n)}
            onSaveAvatar={(a) => setUserAvatar(a)}
            onReset={() => resetUserProfile()}
            onClose={() => setShowProfileEditor(false)}
          />
        )}
        {showAiSettings && currentWorkspaceId && (
          <AiSettingsModal
            workspaceId={currentWorkspaceId}
            onClose={() => setShowAiSettings(false)}
          />
        )}
        {showAiUpsell && (
          <AiUpsellModal onClose={() => setShowAiUpsell(false)} />
        )}
        {showWechatBind && (
          <WechatBindModal
            onClose={() => setShowWechatBind(false)}
          />
        )}
        {showImportDialog && (
          <ImportDialog
            pendingCount={pendingCount}
            tasksLength={tasks.length}
            importing={importing}
            onCancel={() => setShowImportDialog(false)}
            onMerge={() => executeImport('merge')}
            onOverwrite={() => executeImport('overwrite')}
          />
        )}
      </div>
    );
  }

  // Signed-in menu
  return (
    <div ref={menuRef} style={{ position: 'relative' }} data-theme="btn-wrapper">
      <button
        onClick={() => setOpen(!open)}
        className={buttonClassName || "flex items-center justify-center w-8 h-8 rounded-full bg-accent border border-border text-foreground hover:bg-border transition-colors"}
        data-theme="btn"
        title="我的"
      >
        {buttonClassName ? (
          <span className="flex items-center gap-1">
            {(user?.avatarUrl || userAvatar) ? (
              <img
                src={user?.avatarUrl || userAvatar}
                alt=""
                style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <span className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-[10px] text-primary font-medium">
                {(userNickname || user?.nickName || '我').slice(0, 1)}
              </span>
            )}
            {userNickname || user?.nickName || '我的'}
          </span>
        ) : (user?.avatarUrl || userAvatar) ? (
          <img
            src={user?.avatarUrl || userAvatar}
            alt=""
            style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : user?.nickName || userNickname ? (
          <span className="text-sm font-medium">{(userNickname || user?.nickName || '我').slice(0, 1)}</span>
        ) : (
          <User size={16} />
        )}
      </button>

      {open && (
        <div data-theme="dropdown" className="show" style={{ width: '260px', overflow: 'hidden' }}>
          {/* User info */}
          <div className="px-3 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              {(user?.avatarUrl || userAvatar) ? (
                <img
                  src={user?.avatarUrl || userAvatar}
                  alt=""
                  style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                  {(userNickname || user?.nickName || '用').slice(0, 1)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {userNickname || user?.nickName || '用户'}
                </p>
                {user?.phone && (
                  <p className="text-xs text-muted truncate">{user.phone}</p>
                )}
              </div>
              <span className={`plan-badge-${currentPlan}`}>
                {planNames[currentPlan] || currentPlan}
              </span>
            </div>

            {/* Storage */}
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-muted mb-1">
                <span>存储</span>
                <span>
                  {storageInfo.usedText}
                  {storageInfo.limitMB > 0 ? ` / ${storageInfo.limitMB}MB` : ' / 无配额'}
                </span>
              </div>
              <div className="storage-bar-bg">
                <div
                  className="storage-bar-fill"
                  style={{ width: `${storageInfo.percent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Profile edit */}
          <div className="py-1 border-t border-border">
            <button
              onClick={() => { setOpen(false); setShowProfileEditor(true); }}
              className="user-menu-item"
            >
              <span className="flex items-center gap-2"><Pencil size={14} />编辑资料</span>
            </button>
          </div>

          {/* Sync & Data */}
          <div className="py-1">
            <div className="user-menu-item justify-between">
              <span className="flex items-center gap-2">
                <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                同步
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">{formatSyncTime(lastSyncAt)}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleSync(); }}
                  disabled={syncing}
                  className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                >
                  {syncing ? '同步中' : '立即'}
                </button>
              </div>
            </div>
            <button onClick={handleExport} className="user-menu-item">
              <Download size={14} />
              导出数据
            </button>
            <button onClick={handleImportClick} className="user-menu-item">
              <Upload size={14} />
              导入数据
            </button>
            <Link
              href="/settings/billing"
              onClick={() => setOpen(false)}
              className="user-menu-item"
            >
              <span className="flex items-center gap-2"><Gem size={14} />订阅管理</span>
            </Link>
          </div>

          {/* AI Settings */}
          <div className="py-1 border-t border-border">
            <button
              onClick={() => {
                setOpen(false);
                if (currentWorkspacePlan === 'free') {
                  setShowAiUpsell(true);
                } else {
                  setShowAiSettings(true);
                }
              }}
              className="user-menu-item"
            >
              <span className="flex items-center gap-2"><Sparkles size={14} />AI 设置</span>
              {currentWorkspacePlan === 'free' && (
                <span style={{ fontSize: '0.7rem', color: 'var(--primary)', marginLeft: 'auto' }}>PRO</span>
              )}
            </button>
          </div>

          {/* Preferences */}
          <div className="py-1 border-t border-border">
            <button onClick={() => { setOpen(false); setShowCelebrationEditor(true); }} className="user-menu-item">
              <span className="flex items-center gap-2"><PartyPopper size={14} />庆祝语</span>
            </button>
          </div>

          {/* Help */}
          <div className="py-1 border-t border-border">
            <Link href="/help" onClick={() => setOpen(false)} className="user-menu-item">
              <Keyboard size={14} />
              快捷键
            </Link>
            <button onClick={() => { setOpen(false); setShowCoffee(true); }} className="user-menu-item">
              <Coffee size={14} />
              请作者喝杯咖啡
            </button>
          </div>

          {/* Sign out */}
          <div className="py-1 border-t border-border">
            <button onClick={handleSignOut} className="user-menu-item" style={{ color: '#dc2626' }} onMouseEnter={(e) => { (e.target as HTMLElement).style.color = '#b91c1c'; }} onMouseLeave={(e) => { (e.target as HTMLElement).style.color = '#dc2626'; }}>
              <LogOut size={14} />
              退出登录
            </button>
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept=".md,.markdown" onChange={handleFileChange} style={{ display: 'none' }} />

      {showCoffee && <CoffeeModal onClose={() => setShowCoffee(false)} />}
      {showCelebrationEditor && (
        <CelebrationEditor
          texts={celebrationTexts}
          onSave={(texts) => setCelebrationTexts(texts)}
          onReset={() => resetCelebrationTexts()}
          onClose={() => setShowCelebrationEditor(false)}
        />
      )}
      {showProfileEditor && (
        <ProfileEditor
          nickname={userNickname}
          avatar={userAvatar}
          onSaveNickname={(n) => setUserNickname(n)}
          onSaveAvatar={(a) => setUserAvatar(a)}
          onReset={() => resetUserProfile()}
          onClose={() => setShowProfileEditor(false)}
        />
      )}
      {showAiSettings && currentWorkspaceId && (
        <AiSettingsModal
          workspaceId={currentWorkspaceId}
          onClose={() => setShowAiSettings(false)}
        />
      )}
      {showAiUpsell && (
        <AiUpsellModal onClose={() => setShowAiUpsell(false)} />
      )}
      {showImportDialog && (
        <ImportDialog
          pendingCount={pendingCount}
          tasksLength={tasks.length}
          importing={importing}
          onCancel={() => setShowImportDialog(false)}
          onMerge={() => executeImport('merge')}
          onOverwrite={() => executeImport('overwrite')}
        />
      )}
    </div>
  );
}

function AiUpsellModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1001, padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: '16px', padding: '32px',
          maxWidth: '380px', width: '100%',
          textAlign: 'center',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'transparent', border: 'none',
            color: 'var(--muted)', cursor: 'pointer',
            fontSize: '1.4rem', lineHeight: 1, padding: '4px',
          }}
        >
          <X size={20} />
        </button>
        <Sparkles size={42} strokeWidth={1.5} style={{ margin: '0 auto 16px', color: 'var(--primary)' }} />
        <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem', fontWeight: 700, color: 'var(--foreground)' }}>
          AI 智能助手
        </h3>
        <p style={{ margin: '0 0 8px', fontSize: '0.9rem', color: 'var(--muted)', lineHeight: 1.6 }}>
          AI 任务是 <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Pro 专属</span> 功能
        </p>
        <p style={{ margin: '0 0 24px', fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.5 }}>
          升级 Pro 即可解锁：AI 对话助手、每日/周/月报告自动生成、任务智能分析、对话保存为笔记
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 24px', borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--foreground)',
              cursor: 'pointer', fontSize: '0.9rem',
            }}
          >
            以后再说
          </button>
          <Link
            href="/pricing"
            onClick={onClose}
            style={{
              padding: '10px 24px', borderRadius: '8px',
              border: 'none',
              background: 'var(--primary)', color: 'var(--primary-foreground)',
              cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600,
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
            }}
          >
            查看 Pro 方案
          </Link>
        </div>
      </div>
    </div>
  , document.body);
}

function WechatBindModal({ onClose }: { onClose: () => void }) {
  const [bound, setBound] = useState<boolean | null>(null);
  const [bindCode, setBindCode] = useState('');
  const [bindExpires, setBindExpires] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    wechatApi.getStatus().then((s) => {
      setBound(s.bound);
    }).catch(() => setBound(false));
  }, []);

  const handleGetBindCode = async () => {
    setLoading(true);
    try {
      const { code, expiresAt } = await wechatApi.getBindCode();
      setBindCode(code);
      setBindExpires(expiresAt);
    } catch (err: any) {
      alert(err.message || '获取绑定码失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUnbind = async () => {
    if (!confirm('确定要解绑微信吗？解绑后将无法通过微信创建任务。')) return;
    setLoading(true);
    try {
      await wechatApi.unbind();
      setBound(false);
      setBindCode('');
    } catch (err: any) {
      alert(err.message || '解绑失败');
    } finally {
      setLoading(false);
    }
  };

  const expiresText = bindExpires
    ? new Date(bindExpires).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    : '';

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1001, padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: '16px', padding: '28px',
          maxWidth: '380px', width: '100%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '14px', right: '14px',
            background: 'transparent', border: 'none',
            color: 'var(--muted)', cursor: 'pointer',
            fontSize: '1.2rem', lineHeight: 1,
          }}
        >
          ✕
        </button>
        <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><Smartphone size={18} />微信任务收集</div>

        {bound === null ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', textAlign: 'center' }}>加载中...</p>
        ) : bound ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', flexShrink: 0 }}></span>
              <span style={{ fontWeight: 500 }}>已绑定微信</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.6 }}>
              向公众号发送任意消息，将自动在「微信任务收集」工作区的「默认」项目下创建任务。
            </p>
            <button
              onClick={handleUnbind}
              disabled={loading}
              style={{
                marginTop: '16px', padding: '8px 16px', borderRadius: '8px',
                border: '1px solid var(--border)', background: 'var(--card)', cursor: 'pointer',
                color: '#ef4444', fontSize: '0.85rem', fontWeight: 500,
              }}
            >
              {loading ? '处理中...' : '解绑微信'}
            </button>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '16px' }}>
              向公众号发送绑定码即可完成绑定。绑定后，通过微信发送的消息会自动创建为任务。
            </p>
            {bindCode ? (
              <div>
                <div
                  style={{
                    textAlign: 'center', padding: '20px', background: 'var(--bg)',
                    borderRadius: '12px', border: '2px dashed var(--primary)',
                    marginBottom: '12px',
                  }}
                >
                  <div style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '8px', fontFamily: 'monospace', color: 'var(--primary)' }}>
                    {bindCode}
                  </div>
                  {expiresText && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '8px' }}>
                      有效期至 {expiresText}
                    </div>
                  )}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'center' }}>
                  请将上方验证码发送给公众号
                </p>
              </div>
            ) : (
              <button
                onClick={handleGetBindCode}
                disabled={loading}
                style={{
                  width: '100%', padding: '10px', borderRadius: '8px',
                  border: 'none', background: 'var(--primary)', cursor: 'pointer',
                  color: '#fff', fontSize: '0.9rem', fontWeight: 500,
                }}
              >
                {loading ? '生成中...' : '获取绑定码'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  , document.body);
}

function AiSettingsModal({ workspaceId, onClose }: { workspaceId: string; onClose: () => void }) {
  const [mode, setMode] = useState<'builtin' | 'custom'>('builtin');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'fail' | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    aiApi.getCustomKey(workspaceId).then((info) => {
      if (info.provider && info.baseUrl) {
        setMode('custom');
        setBaseUrl(info.baseUrl);
        setApiKey(info.apiKey || '');
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [workspaceId]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (mode === 'builtin') {
        await aiApi.deleteCustomKey(workspaceId);
      } else {
        await aiApi.saveCustomKey(workspaceId, {
          provider: 'deepseek',
          baseUrl,
          apiKey: apiKey || undefined,
          model: 'deepseek-chat',
          enabled: true,
        });
      }
      onClose();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await aiApi.testCustomKey(workspaceId, { baseUrl, apiKey, model: 'deepseek-chat' });
      setTestResult('success');
    } catch {
      setTestResult('fail');
    } finally {
      setTesting(false);
    }
  };

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1001, padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: '16px', padding: '28px',
          maxWidth: '420px', width: '100%',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'transparent', border: 'none',
            color: 'var(--muted)', cursor: 'pointer',
            fontSize: '1.4rem', lineHeight: 1, padding: '4px',
          }}
        >
          <X size={20} />
        </button>

        <h3 style={{ margin: '0 0 24px', fontSize: '1.1rem', fontWeight: 700, color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} style={{ color: 'var(--primary)' }} />
          AI 设置
        </h3>

        {!loaded ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--muted)' }} />
          </div>
        ) : (
          <>
            {/* Mode selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              <label
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: mode === 'builtin' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  cursor: 'pointer',
                  background: mode === 'builtin' ? 'var(--primary)/5' : 'transparent',
                  transition: 'all 0.2s',
                }}
              >
                <input
                  type="radio"
                  name="ai-mode"
                  checked={mode === 'builtin'}
                  onChange={() => setMode('builtin')}
                  style={{ accentColor: 'var(--primary)' }}
                />
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--foreground)' }}>内置 DeepSeek</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '2px' }}>使用任务管理器自带的 AI，消耗月度配额</div>
                </div>
              </label>

              <label
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: mode === 'custom' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  cursor: 'pointer',
                  background: mode === 'custom' ? 'var(--primary)/5' : 'transparent',
                  transition: 'all 0.2s',
                }}
              >
                <input
                  type="radio"
                  name="ai-mode"
                  checked={mode === 'custom'}
                  onChange={() => setMode('custom')}
                  style={{ accentColor: 'var(--primary)' }}
                />
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--foreground)' }}>自定义 API</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '2px' }}>使用你自己的 API Key，不限量、不限额</div>
                </div>
              </label>
            </div>

            {/* Custom API fields */}
            {mode === 'custom' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: 'var(--foreground)', marginBottom: '6px' }}>API 请求网址</label>
                  <input
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api.deepseek.com"
                    style={{
                      width: '100%', padding: '10px 12px',
                      borderRadius: '8px', border: '1px solid var(--border)',
                      background: 'var(--accent)', color: 'var(--foreground)',
                      fontSize: '0.9rem', outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: 'var(--foreground)', marginBottom: '6px' }}>API Key</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      style={{
                        width: '100%', padding: '10px 40px 10px 12px',
                        borderRadius: '8px', border: '1px solid var(--border)',
                        background: 'var(--accent)', color: 'var(--foreground)',
                        fontSize: '0.9rem', outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      onClick={() => setShowKey(!showKey)}
                      style={{
                        position: 'absolute', right: '8px', top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent', border: 'none',
                        color: 'var(--muted)', cursor: 'pointer',
                        padding: '4px',
                      }}
                    >
                      {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Test result */}
                {testResult && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 12px', borderRadius: '8px', fontSize: '0.82rem',
                    background: testResult === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    color: testResult === 'success' ? '#16a34a' : '#dc2626',
                  }}>
                    {testResult === 'success' ? <Check size={14} /> : <X size={14} />}
                    {testResult === 'success' ? '连接成功' : '连接失败，请检查配置'}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleTest}
                    disabled={testing || !apiKey}
                    style={{
                      padding: '8px 16px', borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'transparent', color: 'var(--foreground)',
                      cursor: testing || !apiKey ? 'not-allowed' : 'pointer',
                      fontSize: '0.85rem', opacity: testing || !apiKey ? 0.5 : 1,
                      display: 'flex', alignItems: 'center', gap: '6px',
                    }}
                  >
                    {testing ? <Loader2 size={14} className="animate-spin" /> : null}
                    测试连接
                  </button>
                </div>
              </div>
            )}

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                width: '100%', padding: '12px',
                borderRadius: '10px', border: 'none',
                background: 'var(--primary)', color: 'var(--primary-foreground)',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '0.95rem', fontWeight: 600,
                opacity: saving ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              {saving ? '保存中...' : '保存设置'}
            </button>
          </>
        )}
      </div>
    </div>
  , document.body);
}

function ImportDialog({
  pendingCount,
  tasksLength,
  importing,
  onCancel,
  onMerge,
  onOverwrite,
}: {
  pendingCount: number;
  tasksLength: number;
  importing: boolean;
  onCancel: () => void;
  onMerge: () => void;
  onOverwrite: () => void;
}) {
  return (
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
      onClick={() => !importing && onCancel()}
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
        <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem', color: 'var(--foreground)' }}>导入任务</h3>
        <p style={{ margin: '0 0 20px', fontSize: '0.9rem', color: 'var(--muted)', lineHeight: 1.6 }}>
          检测到 <strong style={{ color: 'var(--foreground)' }}>{pendingCount}</strong> 个有效任务。
          当前已有 <strong style={{ color: 'var(--foreground)' }}>{tasksLength}</strong> 个任务。
          <br /><br />
          <strong style={{ color: 'var(--foreground)' }}>覆盖</strong>：清空现有任务后导入
          <br />
          <strong style={{ color: 'var(--foreground)' }}>合并</strong>：保留现有任务并追加
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            disabled={importing}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--foreground)',
              cursor: importing ? 'not-allowed' : 'pointer', fontSize: '0.9rem', opacity: importing ? 0.6 : 1,
            }}
          >
            取消
          </button>
          <button
            onClick={onMerge}
            disabled={importing}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--primary)',
              background: 'var(--card)', color: 'var(--primary)',
              cursor: importing ? 'not-allowed' : 'pointer', fontSize: '0.9rem', opacity: importing ? 0.6 : 1,
            }}
          >
            {importing ? '导入中...' : '合并'}
          </button>
          <button
            onClick={onOverwrite}
            disabled={importing}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              background: 'var(--primary)', color: 'var(--primary-foreground)',
              cursor: importing ? 'not-allowed' : 'pointer', fontSize: '0.9rem', opacity: importing ? 0.6 : 1,
            }}
          >
            {importing ? '导入中...' : '覆盖'}
          </button>
        </div>
      </div>
    </div>
  );
}
