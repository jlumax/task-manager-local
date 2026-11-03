'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Plus, Pencil, Save, Trash2, X, Eye, Shield, LogIn, CreditCard, Megaphone, Key, UserCog, Search, ChevronLeft, ChevronRight, Mail, Calendar } from 'lucide-react';
import { adminApi, adminAnnouncementsApi, type AdminPlan, type Announcement, type KeyPoolEntry, type AdminUser, type AdminUserDetail, type AdminUserList } from '@/lib/api';
import { renderMarkdown } from '@/lib/markdown';

/* ================================================================
   后台登录凭证 —— 通过环境变量配置，提供默认值
   NEXT_PUBLIC_ADMIN_USER / NEXT_PUBLIC_ADMIN_PASS
   ================================================================ */
const ADMIN_USER = process.env.NEXT_PUBLIC_ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.NEXT_PUBLIC_ADMIN_PASS || 'taskmanager2026';
const AUTH_KEY = 'admin_authed';

/* ================================================================
   套餐管理常量
   ================================================================ */
const emptyPlan: Partial<AdminPlan> = {
  key: '',
  name: '',
  description: '',
  price: 0,
  priceYearly: 0,
  currency: 'CNY',
  sortOrder: 0,
  isActive: true,
  limits: {
    id: '',
    maxTasks: 100,
    maxProjects: 2,
    maxMembers: 1,
    maxStorageMB: 0,
    enableGantt: false,
    enableAi: false,
    enableApi: false,
    enableExport: false,
    enableImport: false,
    enableAnimation: false,
    enableCloudSync: true,
    enableProgressImage: false,
    aiQuotaMonthly: 0,
    aiCustomKey: false,
  },
};

/* ================================================================
   公告管理常量
   ================================================================ */
const PLAN_OPTIONS = [
  { key: 'free', label: '免费用户' },
  { key: 'pro', label: 'Pro 用户' },
  { key: 'team', label: '团队用户' },
];

const emptyAnnouncement = {
  title: '',
  content: '',
  imageUrl: '',
  targetPlans: [] as string[],
  isActive: true,
  priority: 0,
  startDate: '',
  endDate: '',
  dismissible: true,
};

/* ================================================================
   登录表单
   ================================================================ */
function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      sessionStorage.setItem(AUTH_KEY, '1');
      onLogin();
    } else {
      setError('账号或密码错误');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--background)',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '40px 32px',
          width: '100%',
          maxWidth: '380px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '14px',
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
            }}
          >
            <Shield size={28} style={{ color: 'var(--foreground)' }} />
          </div>
          <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: 'var(--foreground)' }}>
            后台管理
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>
            请输入管理密码
          </p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.8rem',
              fontWeight: 500,
              color: 'var(--foreground)',
              marginBottom: '6px',
            }}
          >
            账号
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(''); }}
            autoFocus
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'var(--input)',
              color: 'var(--foreground)',
              fontSize: '0.95rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.8rem',
              fontWeight: 500,
              color: 'var(--foreground)',
              marginBottom: '6px',
            }}
          >
            密码
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'var(--input)',
              color: 'var(--foreground)',
              fontSize: '0.95rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {error && (
          <p style={{ color: '#ef4444', fontSize: '0.82rem', margin: '0 0 14px', textAlign: 'center' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '10px',
            border: 'none',
            background: 'var(--primary)',
            color: 'var(--primary-foreground)',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <LogIn size={18} />
          登录
        </button>
      </form>
    </div>
  );
}

/* ================================================================
   套餐管理面板
   ================================================================ */
function PlansPanel() {
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminPlan | null>(null);
  const [saving, setSaving] = useState(false);

  const loadPlans = useCallback(() => {
    setLoading(true);
    adminApi
      .getPlans()
      .then(setPlans)
      .catch(() => alert('加载失败'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      if (editing.id) {
        await adminApi.updatePlan(editing.id, editing);
      } else {
        await adminApi.createPlan(editing as Omit<AdminPlan, 'id' | 'createdAt' | 'updatedAt'>);
      }
      setEditing(null);
      loadPlans();
    } catch {
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此套餐？')) return;
    try {
      await adminApi.deletePlan(id);
      loadPlans();
    } catch {
      alert('删除失败');
    }
  };

  const updateLimit = (key: string, value: unknown) => {
    if (!editing) return;
    setEditing({
      ...editing,
      limits: { ...(editing.limits || emptyPlan.limits), [key]: value } as any,
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: 'var(--foreground)' }}>
          套餐配置
        </h2>
        <button
          onClick={() => setEditing({ ...emptyPlan } as AdminPlan)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            borderRadius: '8px',
            background: 'var(--primary)',
            color: 'var(--primary-foreground)',
            border: 'none',
            padding: '8px 16px',
            fontSize: '0.85rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <Plus size={16} />
          新增套餐
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : plans.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
          暂无套餐配置
        </div>
      ) : (
        plans.map((plan) => (
          <div
            key={plan.id}
            style={{
              marginBottom: '12px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              background: 'var(--card)',
              padding: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--foreground)' }}>
                  {plan.name}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{plan.key}</span>
                {!plan.isActive && (
                  <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', background: '#fef2f2', color: '#dc2626' }}>
                    已停用
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setEditing(plan)}
                  title="编辑"
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--foreground)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.8rem',
                  }}
                >
                  <Pencil size={14} />
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(plan.id)}
                  title="删除"
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'transparent',
                    color: '#ef4444',
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            {/* 数字指标 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', marginBottom: '12px' }}>
              {[
                { label: '价格', value: plan.price === 0 ? '免费' : `¥${(plan.price / 100).toFixed(0)}/月` },
                { label: '任务上限', value: (plan.limits?.maxTasks ?? 0) === -1 ? '无限' : plan.limits?.maxTasks ?? '-' },
                { label: '项目上限', value: (plan.limits?.maxProjects ?? 0) === -1 ? '无限' : plan.limits?.maxProjects ?? '-' },
                { label: '成员上限', value: (plan.limits?.maxMembers ?? 0) === -1 ? '无限' : plan.limits?.maxMembers ?? '-' },
                { label: '云存储', value: (plan.limits?.maxStorageMB ?? 0) <= 0 ? '不限制' : `${plan.limits?.maxStorageMB}MB` },
                { label: 'AI月配额', value: (plan.limits?.aiQuotaMonthly ?? 0) <= 0 ? '无' : `${plan.limits?.aiQuotaMonthly}次` },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    borderRadius: '8px',
                    background: 'var(--accent)',
                    padding: '8px 10px',
                  }}
                >
                  <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginBottom: '2px' }}>{item.label}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {/* 功能开关：左边已启用，右边未启用 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-start' }}>
              {(() => {
                const features = [
                  { key: 'enableGantt', label: '甘特图' },
                  { key: 'enableAi', label: 'AI 助手' },
                  { key: 'enableApi', label: 'API 访问' },
                  { key: 'enableExport', label: '数据导出' },
                  { key: 'enableImport', label: '数据导入' },
                  { key: 'enableAnimation', label: '动态效果' },
                  { key: 'enableCloudSync', label: '云同步' },
                  { key: 'enableProgressImage', label: '进展贴图' },
                  { key: 'aiCustomKey', label: '自定义 Key' },
                ] as { key: string; label: string }[];
                const enabled = features.filter((f) => !!(plan.limits as any)?.[f.key]);
                const disabled = features.filter((f) => !(plan.limits as any)?.[f.key]);
                return (
                  <>
                    {enabled.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {enabled.map((f) => (
                          <span
                            key={f.key}
                            style={{
                              padding: '3px 10px',
                              borderRadius: '10px',
                              fontSize: '0.72rem',
                              fontWeight: 500,
                              background: 'rgba(34,197,94,0.12)',
                              color: '#16a34a',
                              border: '1px solid rgba(34,197,94,0.25)',
                            }}
                          >
                            ✓ {f.label}
                          </span>
                        ))}
                      </div>
                    )}
                    {disabled.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {disabled.map((f) => (
                          <span
                            key={f.key}
                            style={{
                              padding: '3px 10px',
                              borderRadius: '10px',
                              fontSize: '0.72rem',
                              fontWeight: 400,
                              background: 'transparent',
                              color: 'var(--muted)',
                              border: '1px dashed var(--border)',
                              opacity: 0.55,
                            }}
                          >
                            ✗ {f.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        ))
      )}

      {/* Edit Modal */}
      {editing && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            padding: '20px',
          }}
          onClick={() => setEditing(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '720px',
              maxHeight: '90vh',
              overflow: 'auto',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--foreground)' }}>
                {editing.id ? '编辑套餐' : '新增套餐'}
              </h3>
              <button
                onClick={() => setEditing(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>唯一标识 key</label>
                  <input
                    value={editing.key || ''}
                    onChange={(e) => setEditing({ ...editing, key: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>名称</label>
                  <input
                    value={editing.name || ''}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>描述</label>
                <input
                  value={editing.description || ''}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                {[
                  { key: 'price', label: '月付价格（分）' },
                  { key: 'priceYearly', label: '年付价格（分）' },
                  { key: 'sortOrder', label: '排序' },
                ].map((f) => (
                  <div key={f.key}>
                    <label style={labelStyle}>{f.label}</label>
                    <input
                      type="number"
                      value={(editing as any)[f.key] ?? 0}
                      onChange={(e) => setEditing({ ...editing, [f.key]: Number(e.target.value) })}
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {[
                  { key: 'maxTasks', label: '最大任务数 (-1=无限)' },
                  { key: 'maxProjects', label: '最大项目数 (-1=无限)' },
                  { key: 'maxMembers', label: '最大成员数 (-1=无限)' },
                  { key: 'maxStorageMB', label: '存储空间 (MB)' },
                  { key: 'aiQuotaMonthly', label: 'AI 月配额 (次)' },
                ].map((f) => (
                  <div key={f.key}>
                    <label style={{ ...labelStyle, fontSize: '0.72rem' }}>{f.label}</label>
                    <input
                      type="number"
                      value={(editing.limits as any)?.[f.key] ?? 0}
                      onChange={(e) => updateLimit(f.key, Number(e.target.value))}
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {[
                  { key: 'enableGantt', label: '甘特图' },
                  { key: 'enableAi', label: 'AI 助手' },
                  { key: 'enableApi', label: 'API 访问' },
                  { key: 'enableExport', label: '数据导出' },
                  { key: 'enableImport', label: '数据导入' },
                  { key: 'enableAnimation', label: '动态效果' },
                  { key: 'enableCloudSync', label: '云同步' },
                  { key: 'enableProgressImage', label: '进展贴图' },
                  { key: 'aiCustomKey', label: '自定义 AI Key' },
                ].map((f) => (
                  <label
                    key={f.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--accent)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      color: 'var(--foreground)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!(editing.limits as any)?.[f.key]}
                      onChange={(e) => updateLimit(f.key, e.target.checked)}
                      style={{ width: '15px', height: '15px' }}
                    />
                    {f.label}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => setEditing(null)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--foreground)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem',
                  opacity: saving ? 0.5 : 1,
                }}
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   API Key 池预设
   ================================================================ */
const PROVIDER_PRESETS: Record<string, { baseUrl: string; models: string[] }> = {
  deepseek: { baseUrl: 'https://api.deepseek.com', models: ['deepseek-v4-flash', 'deepseek-v4-pro', 'deepseek-chat', 'deepseek-reasoner'] },
  openai: { baseUrl: 'https://api.openai.com/v1', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'o4-mini'] },
  anthropic: { baseUrl: 'https://api.anthropic.com/v1', models: ['claude-sonnet-4-6', 'claude-opus-4-7', 'claude-haiku-4-5'] },
};

const PROVIDER_LABELS: Record<string, string> = {
  deepseek: 'DeepSeek', openai: 'OpenAI', anthropic: 'Anthropic', custom: '自定义',
};

/* ================================================================
   API Key 池管理面板
   ================================================================ */
function KeyPoolPanel() {
  const [keys, setKeys] = useState<KeyPoolEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<KeyPoolEntry> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.getKeyPool()
      .then(setKeys)
      .catch(() => setKeys([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!editing || !editing.provider || !editing.apiKey || !editing.model || !editing.baseUrl) {
      alert('请填写完整信息（供应商、API地址、Key、模型均必填）');
      return;
    }
    setSaving(true);
    try {
      if (editing.id) {
        await adminApi.updateKeyPool(editing.id, {
          provider: editing.provider,
          baseUrl: editing.baseUrl,
          apiKey: editing.apiKey,
          model: editing.model,
          enabled: editing.enabled,
          priority: editing.priority,
        });
      } else {
        await adminApi.createKeyPool({
          provider: editing.provider!,
          baseUrl: editing.baseUrl!,
          apiKey: editing.apiKey!,
          model: editing.model!,
          enabled: editing.enabled,
          priority: editing.priority,
        });
      }
      setEditing(null);
      load();
    } catch (err: any) {
      alert('保存失败: ' + (err?.message || err?.toString?.() || '请检查网络连接和服务是否启动'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此 API Key？')) return;
    try {
      await adminApi.deleteKeyPool(id);
      load();
    } catch { alert('删除失败'); }
  };

  const openNew = (presetProvider?: string) => {
    const preset = presetProvider ? PROVIDER_PRESETS[presetProvider] : null;
    setEditing({
      provider: presetProvider || 'custom',
      baseUrl: preset?.baseUrl || '',
      apiKey: '',
      model: '',
      enabled: true,
      priority: 0,
    });
  };

  const handleProviderChange = (provider: string) => {
    if (!editing) return;
    const preset = PROVIDER_PRESETS[provider];
    setEditing({
      ...editing,
      provider,
      baseUrl: preset?.baseUrl || '',
      model: '',
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: 'var(--foreground)' }}>
          API Key 池
        </h2>
        <div style={{ display: 'flex', gap: '6px' }}>
          {Object.entries(PROVIDER_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => openNew(key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                borderRadius: '8px',
                background: 'var(--accent)',
                color: 'var(--foreground)',
                border: '1px solid var(--border)',
                padding: '7px 14px',
                fontSize: '0.8rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <Plus size={14} />
              {PROVIDER_LABELS[key]}
            </button>
          ))}
          <button
            onClick={() => openNew()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              borderRadius: '8px',
              background: 'var(--accent)',
              color: 'var(--foreground)',
              border: '1px solid var(--border)',
              padding: '7px 14px',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Plus size={14} />
            自定义
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : keys.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
          暂无 API Key，点击上方按钮添加
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {keys.map((k) => (
            <div
              key={k.id}
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '14px',
                opacity: k.enabled ? 1 : 0.5,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>
                    {PROVIDER_LABELS[k.provider] || k.provider}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'monospace' }}>
                    {k.model}
                  </span>
                  {!k.enabled && (
                    <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', background: '#fef2f2', color: '#dc2626' }}>
                      已停用
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontFamily: 'monospace' }}>
                    {k.apiKey}
                  </span>
                  <button
                    onClick={() => setEditing({ ...k })}
                    title="编辑"
                    style={{
                      padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border)',
                      background: 'transparent', color: 'var(--foreground)', cursor: 'pointer', fontSize: '0.78rem',
                    }}
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(k.id)}
                    title="删除"
                    style={{ padding: '5px', borderRadius: '6px', border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'flex', gap: '16px' }}>
                <span>优先级: {k.priority}</span>
                <span>{k.baseUrl}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', padding: '20px',
          }}
          onClick={() => setEditing(null)}
        >
          <div
            style={{
              width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto',
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: '16px', padding: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--foreground)' }}>
                {editing.id ? '编辑 API Key' : '新增 API Key'}
              </h3>
              <button onClick={() => setEditing(null)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={labelStyle}>供应商</label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {Object.entries(PROVIDER_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleProviderChange(key)}
                      style={{
                        padding: '6px 14px', borderRadius: '8px', border: `1.5px solid ${editing.provider === key ? 'var(--primary)' : 'var(--border)'}`,
                        background: editing.provider === key ? 'var(--primary)' : 'transparent',
                        color: editing.provider === key ? 'var(--primary-foreground)' : 'var(--foreground)',
                        cursor: 'pointer', fontSize: '0.82rem', fontWeight: editing.provider === key ? 600 : 400,
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {editing.provider && PROVIDER_PRESETS[editing.provider] && (
                <>
                  <div>
                    <label style={labelStyle}>API 地址</label>
                    <input
                      value={editing.baseUrl || ''}
                      onChange={(e) => setEditing({ ...editing, baseUrl: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>模型</label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                      {PROVIDER_PRESETS[editing.provider].models.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setEditing({ ...editing, model: m })}
                          style={{
                            padding: '5px 12px', borderRadius: '6px', border: `1.5px solid ${editing.model === m ? 'var(--primary)' : 'var(--border)'}`,
                            background: editing.model === m ? 'var(--primary)' : 'transparent',
                            color: editing.model === m ? 'var(--primary-foreground)' : 'var(--foreground)',
                            cursor: 'pointer', fontSize: '0.78rem', fontWeight: editing.model === m ? 600 : 400,
                          }}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                    <input
                      value={editing.model || ''}
                      onChange={(e) => setEditing({ ...editing, model: e.target.value })}
                      placeholder="或手动输入模型名称"
                      style={{ ...inputStyle, marginBottom: 0 }}
                    />
                  </div>
                </>
              )}

              {editing.provider === 'custom' && (
                <>
                  <div>
                    <label style={labelStyle}>API 地址</label>
                    <input
                      value={editing.baseUrl || ''}
                      onChange={(e) => setEditing({ ...editing, baseUrl: e.target.value })}
                      placeholder="https://api.example.com/v1"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>模型名称</label>
                    <input
                      value={editing.model || ''}
                      onChange={(e) => setEditing({ ...editing, model: e.target.value })}
                      placeholder="model-name"
                      style={inputStyle}
                    />
                  </div>
                </>
              )}

              <div>
                <label style={labelStyle}>API Key</label>
                <input
                  type="password"
                  value={editing.apiKey || ''}
                  onChange={(e) => setEditing({ ...editing, apiKey: e.target.value })}
                  placeholder={editing.id ? '留空则不修改' : 'sk-...'}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>优先级（越大越优先）</label>
                  <input
                    type="number"
                    value={editing.priority ?? 0}
                    onChange={(e) => setEditing({ ...editing, priority: Number(e.target.value) })}
                    style={inputStyle}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', paddingTop: '22px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--foreground)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={editing.enabled !== false}
                      onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })}
                    />
                    启用
                  </label>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setEditing(null)} style={{
                padding: '8px 20px', borderRadius: '8px', border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--foreground)', cursor: 'pointer', fontSize: '0.85rem',
              }}>
                取消
              </button>
              <button onClick={handleSave} disabled={saving} style={{
                padding: '8px 20px', borderRadius: '8px', border: 'none',
                background: 'var(--primary)', color: 'var(--primary-foreground)',
                cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.85rem',
                opacity: saving ? 0.5 : 1,
              }}>
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   公告管理面板
   ================================================================ */
function AnnouncementsPanel() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<(typeof emptyAnnouncement & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminAnnouncementsApi
      .list()
      .then(setAnnouncements)
      .catch(() => setAnnouncements([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => setEditing({ ...emptyAnnouncement });

  const openEdit = (a: Announcement) => {
    setEditing({
      id: a.id,
      title: a.title,
      content: a.content,
      imageUrl: a.imageUrl || '',
      targetPlans: [...(a.targetPlans as string[])],
      isActive: a.isActive,
      priority: a.priority,
      startDate: a.startDate ? a.startDate.slice(0, 10) : '',
      endDate: a.endDate ? a.endDate.slice(0, 10) : '',
      dismissible: a.dismissible,
    });
  };

  const handleSave = async () => {
    if (!editing || !editing.title.trim() || !editing.content.trim()) {
      alert('请填写标题和内容');
      return;
    }
    setSaving(true);
    try {
      const data = {
        title: editing.title.trim(),
        content: editing.content.trim(),
        imageUrl: editing.imageUrl.trim() || undefined,
        targetPlans: editing.targetPlans,
        isActive: editing.isActive,
        priority: editing.priority,
        startDate: editing.startDate || undefined,
        endDate: editing.endDate || undefined,
        dismissible: editing.dismissible,
      };
      if (editing.id) {
        await adminAnnouncementsApi.update(editing.id, data);
      } else {
        await adminAnnouncementsApi.create(data);
      }
      setEditing(null);
      await load();
    } catch (e: any) {
      alert('保存失败：' + (e?.message || '请重试'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此公告？')) return;
    try {
      await adminAnnouncementsApi.remove(id);
      await load();
    } catch (e: any) {
      alert('删除失败：' + (e?.message || '请重试'));
    }
  };

  const togglePlan = (key: string) => {
    if (!editing) return;
    setEditing({
      ...editing,
      targetPlans: editing.targetPlans.includes(key)
        ? editing.targetPlans.filter((p) => p !== key)
        : [...editing.targetPlans, key],
    });
  };

  const planLabel = (plans: unknown) => {
    const arr = (plans as string[]) || [];
    if (arr.length === 0) return '全部用户';
    return arr.map((p) => PLAN_OPTIONS.find((o) => o.key === p)?.label || p).join('、');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: 'var(--foreground)' }}>
          公告列表
        </h2>
        <button
          onClick={openNew}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            borderRadius: '8px',
            background: 'var(--primary)',
            color: 'var(--primary-foreground)',
            border: 'none',
            padding: '8px 16px',
            fontSize: '0.85rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <Plus size={16} />
          新建公告
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : announcements.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
          暂无公告
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {announcements.map((a) => (
            <div
              key={a.id}
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '14px',
                opacity: a.isActive ? 1 : 0.5,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                {a.imageUrl && (
                  <img
                    src={a.imageUrl}
                    alt=""
                    style={{
                      width: '56px',
                      height: '56px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      flexShrink: 0,
                    }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <strong style={{ color: 'var(--foreground)', fontSize: '0.9rem' }}>{a.title}</strong>
                    {!a.isActive && (
                      <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: 'var(--muted)', color: 'var(--card)' }}>
                        已停用
                      </span>
                    )}
                    <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                      ({planLabel(a.targetPlans)})
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--muted)',
                      lineHeight: 1.5,
                      marginBottom: '8px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {a.content.slice(0, 120).replace(/[#*`![\]>_-]/g, '') + (a.content.length > 120 ? '...' : '')}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', fontSize: '0.7rem', color: 'var(--muted)', flexWrap: 'wrap' }}>
                    <span>优先级: {a.priority}</span>
                    {a.startDate && <span>{a.startDate.slice(0, 10)} ~</span>}
                    {a.endDate && <span>{a.endDate.slice(0, 10)}</span>}
                    <span>{a.dismissible ? '可关闭' : '不可关闭'}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  <button
                    onClick={() => openEdit(a)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      background: 'transparent',
                      color: 'var(--foreground)',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                    }}
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    style={{
                      padding: '5px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--muted)',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setEditing(null)}
        >
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '24px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--foreground)' }}>
                {editing.id ? '编辑公告' : '新建公告'}
              </h3>
              <button
                onClick={() => setEditing(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <label style={labelStyle}>标题</label>
            <input
              type="text"
              value={editing.title}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              placeholder="公告标题"
              style={inputStyle}
            />

            <label style={labelStyle}>内容（支持 Markdown）</label>
            <textarea
              value={editing.content}
              onChange={(e) => setEditing({ ...editing, content: e.target.value })}
              placeholder={`公告正文内容，支持 Markdown：
**粗体** *斜体* \`代码\`
![图片描述](https://...)
- 列表项
> 引用`}
              rows={6}
              style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.82rem' }}
            />

            <label style={labelStyle}>头图 URL（可选）</label>
            <input
              type="text"
              value={editing.imageUrl}
              onChange={(e) => setEditing({ ...editing, imageUrl: e.target.value })}
              placeholder="https://..."
              style={inputStyle}
            />

            <label style={labelStyle}>推送对象</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
              {PLAN_OPTIONS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => togglePlan(p.key)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '8px',
                    border: `1.5px solid ${editing.targetPlans.includes(p.key) ? 'var(--primary)' : 'var(--border)'}`,
                    background: editing.targetPlans.includes(p.key) ? 'var(--primary)' : 'transparent',
                    color: editing.targetPlans.includes(p.key) ? 'var(--primary-foreground)' : 'var(--foreground)',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: editing.targetPlans.includes(p.key) ? 600 : 400,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={labelStyle}>优先级</label>
                <input
                  type="number"
                  value={editing.priority}
                  onChange={(e) => setEditing({ ...editing, priority: Number(e.target.value) })}
                  style={inputStyle}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '22px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--foreground)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editing.isActive}
                    onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                  />
                  启用
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--foreground)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editing.dismissible}
                    onChange={(e) => setEditing({ ...editing, dismissible: e.target.checked })}
                  />
                  允许用户关闭
                </label>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>开始日期（可选）</label>
                <input
                  type="date"
                  value={editing.startDate}
                  onChange={(e) => setEditing({ ...editing, startDate: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>结束日期（可选）</label>
                <input
                  type="date"
                  value={editing.endDate}
                  onChange={(e) => setEditing({ ...editing, endDate: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <button
                onClick={() => setEditing(null)}
                disabled={saving}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--foreground)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  opacity: saving ? 0.5 : 1,
                }}
              >
                取消
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setPreview(true)}
                  disabled={saving}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--primary)',
                    background: 'transparent',
                    color: 'var(--primary)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: saving ? 0.5 : 1,
                  }}
                >
                  <Eye size={16} />
                  预览
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'var(--primary)',
                    color: 'var(--primary-foreground)',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: saving ? 0.5 : 1,
                  }}
                >
                  {saving ? (
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Save size={16} />
                  )}
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {preview && editing && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
          }}
          onClick={() => setPreview(false)}
        >
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {editing.imageUrl && (
              <img
                src={editing.imageUrl}
                alt=""
                style={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: '200px',
                  objectFit: 'cover',
                  borderRadius: '16px 16px 0 0',
                }}
              />
            )}
            <button
              onClick={() => setPreview(false)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(0,0,0,0.5)',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '0.7rem',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: 'var(--accent)',
                    color: 'var(--muted)',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Eye size={12} />预览模式</span>
                </span>
                {editing.targetPlans.map((p) => (
                  <span
                    key={p}
                    style={{
                      fontSize: '0.7rem',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: 'var(--primary)',
                      color: 'var(--primary-foreground)',
                      opacity: 0.7,
                    }}
                  >
                    {p === 'free' ? '免费' : p === 'pro' ? 'Pro' : '团队'}
                  </span>
                ))}
              </div>
              <h2
                style={{
                  margin: '0 0 12px',
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  color: 'var(--foreground)',
                  lineHeight: 1.4,
                }}
              >
                {editing.title || '(未填写标题)'}
              </h2>
              <div
                style={{
                  color: 'var(--foreground)',
                  opacity: 0.85,
                  lineHeight: 1.7,
                  fontSize: '0.92rem',
                }}
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(editing.content) || '<p style="color:var(--muted)">(未填写内容)</p>',
                }}
              />
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setPreview(false)}
                  style={{
                    padding: '8px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'var(--primary)',
                    color: 'var(--primary-foreground)',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                  }}
                >
                  关闭预览
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   用户管理面板
   ================================================================ */
function UsersPanel() {
  const [data, setData] = useState<AdminUserList | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [detailUser, setDetailUser] = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [planLoading, setPlanLoading] = useState<string | null>(null);
  const [userPlanLoading, setUserPlanLoading] = useState(false);
  const limit = 20;

  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async (p?: number, s?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.getUsers({ page: p ?? page, limit, search: s ?? search });
      setData(result);
    } catch (err: any) {
      setData(null);
      setError(err?.message || '加载失败，请检查网络或权限');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { loadUsers(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => { setPage(1); loadUsers(1, search); };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    loadUsers(newPage, search);
  };

  const openDetail = async (userId: string) => {
    setDetailLoading(true);
    try {
      const user = await adminApi.getUserDetail(userId);
      setDetailUser(user);
    } catch { alert('加载用户详情失败'); }
    finally { setDetailLoading(false); }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('确定删除此用户？此操作不可撤销。')) return;
    try {
      await adminApi.deleteUser(userId);
      loadUsers();
    } catch (err: any) {
      alert('删除失败: ' + (err?.message || '请重试'));
    }
  };

  const handleSaveUser = async () => {
    if (!editingUser || !editingUser.name.trim()) {
      alert('请输入用户名');
      return;
    }
    setSaving(true);
    try {
      await adminApi.updateUser(editingUser.id, {
        name: editingUser.name.trim(),
        email: editingUser.email.trim() || undefined,
      });
      setEditingUser(null);
      loadUsers();
    } catch (err: any) {
      alert('保存失败: ' + (err?.message || '请重试'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDisabled = async (userId: string, disabled: boolean) => {
    if (!confirm(disabled ? '确定禁用此账户？用户将无法登录。' : '确定启用此账户？')) return;
    try {
      await adminApi.setUserDisabled(userId, disabled);
      loadUsers();
      if (detailUser && detailUser.id === userId) {
        setDetailUser({ ...detailUser, disabled });
      }
    } catch (err: any) {
      alert('操作失败: ' + (err?.message || '请重试'));
    }
  };

  const handleChangePlan = async (workspaceId: string, newPlan: string) => {
    setPlanLoading(workspaceId);
    try {
      const updated = await adminApi.updateWorkspacePlan(workspaceId, newPlan);
      // 刷新列表
      loadUsers();
      // 更新详情弹窗中的数据
      if (detailUser) {
        setDetailUser({
          ...detailUser,
          workspaces: detailUser.workspaces.map((ws) =>
            ws.id === workspaceId ? { ...ws, plan: updated.plan } : ws
          ),
        });
      }
    } catch (err: any) {
      alert('套餐切换失败: ' + (err?.message || '请重试'));
    } finally {
      setPlanLoading(null);
    }
  };

  const handleChangeUserPlan = async (userId: string, newPlan: string) => {
    setUserPlanLoading(true);
    try {
      const updated = await adminApi.updateUserPlan(userId, newPlan);
      // 刷新列表
      loadUsers();
      // 更新详情弹窗中的数据
      if (detailUser) {
        setDetailUser({
          ...detailUser,
          plan: updated.plan,
          workspaces: detailUser.workspaces.map((ws) => ({ ...ws, plan: updated.plan })),
        });
      }
    } catch (err: any) {
      alert('用户套餐切换失败: ' + (err?.message || '请重试'));
    } finally {
      setUserPlanLoading(false);
    }
  };

  const formatLastLogin = (t: string | null) => {
    if (!t) return '从未登录';
    const d = new Date(t);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return '刚刚';
    if (diffMin < 60) return `${diffMin} 分钟前`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} 小时前`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 30) return `${diffDay} 天前`;
    return d.toLocaleDateString('zh-CN');
  };

  const roleLabel = (role: string) => {
    const map: Record<string, string> = { owner: '所有者', admin: '管理员', editor: '编辑者', viewer: '只读' };
    return map[role] || role;
  };

  const planLabel = (plan: string) => {
    const map: Record<string, string> = { free: '免费', pro: 'Pro', team: '团队' };
    return map[plan] || plan;
  };

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: 'var(--foreground)' }}>
          用户管理
        </h2>
      </div>

      {/* 搜索栏 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="搜索用户名、邮箱或手机号..."
          style={{
            flex: 1,
            padding: '9px 14px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'var(--input)',
            color: 'var(--foreground)',
            fontSize: '0.85rem',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <button
          onClick={handleSearch}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '9px 16px',
            borderRadius: '8px',
            border: 'none',
            background: 'var(--primary)',
            color: 'var(--primary-foreground)',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 500,
          }}
        >
          <Search size={16} />
          搜索
        </button>
      </div>

      {/* 用户列表 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#ef4444' }}>
          <p style={{ marginBottom: '12px', fontSize: '0.9rem' }}>错误：{error}</p>
          <button
            onClick={() => loadUsers()}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: '1px solid #ef4444',
              background: 'transparent',
              color: '#ef4444',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            重试
          </button>
        </div>
      ) : !data || data.users.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
          {search ? '未找到匹配用户' : '暂无用户'}
        </div>
      ) : (
        <>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '12px' }}>
            共 {data.total} 个用户，第 {data.page} / {totalPages} 页
          </div>
          <div style={{ display: 'grid', gap: '8px' }}>
            {data.users.map((user) => (
              <div
                key={user.id}
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        background: user.avatar ? `url(${user.avatar}) center/cover` : 'var(--accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, color: 'var(--foreground)', fontSize: '0.9rem', fontWeight: 600,
                        opacity: user.disabled ? 0.4 : 1,
                      }}
                    >
                      {!user.avatar && (user.name?.[0] || user.email?.[0] || '?')}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--foreground)' }}>
                          {user.name || '未命名用户'}
                        </span>
                        {user.disabled && (
                          <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '10px', background: '#fef2f2', color: '#dc2626', fontWeight: 500 }}>
                            已禁用
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--muted)', flexWrap: 'wrap', marginBottom: '4px' }}>
                        {user.email && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Mail size={12} /> {user.email}
                          </span>
                        )}
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} /> {user.createdAt.slice(0, 10)}
                        </span>
                        <span>{user.workspaceCount} 个工作区</span>
                      </div>
                      {/* 统计指标栏 */}
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '4px' }}>
                        {/* 任务完成率 */}
                        {user.totalTasks > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                              完成率 {user.completionRate}%
                            </span>
                            <div style={{ width: '60px', height: '4px', borderRadius: '2px', background: 'var(--border)', overflow: 'hidden' }}>
                              <div style={{
                                width: `${user.completionRate}%`, height: '100%', borderRadius: '2px',
                                background: user.completionRate >= 80 ? '#16a34a' : user.completionRate >= 40 ? '#f59e0b' : '#ef4444',
                              }} />
                            </div>
                          </div>
                        )}
                        {user.totalTasks === 0 && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>暂无任务</span>
                        )}
                        {/* AI 用量 */}
                        {user.aiQuotaUsed > 0 && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            AI: {user.aiQuotaUsed} 次
                          </span>
                        )}
                        {/* 用户套餐 */}
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 500, padding: '1px 6px', borderRadius: '6px',
                          background: user.plan === 'pro' ? 'rgba(99,102,241,0.12)' : user.plan === 'team' ? 'rgba(245,158,11,0.12)' : 'var(--accent)',
                          color: user.plan === 'pro' ? '#6366f1' : user.plan === 'team' ? '#f59e0b' : 'var(--foreground)',
                        }}>
                          {planLabel(user.plan)}
                        </span>
                        {/* 最后登录 */}
                        <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                          {user.lastLoginAt ? `最近: ${formatLastLogin(user.lastLoginAt)}` : '从未登录'}
                        </span>
                      </div>
                      {user.workspaces.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                          {user.workspaces.map((ws) => (
                            <span
                              key={ws.id}
                              style={{
                                padding: '2px 8px', borderRadius: '10px', fontSize: '0.68rem',
                                background: 'var(--accent)', color: 'var(--foreground)', border: '1px solid var(--border)',
                              }}
                            >
                              {ws.name} · {planLabel(ws.plan)} · {roleLabel(ws.role)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0, marginLeft: '12px', alignItems: 'center' }}>
                    <button
                      onClick={() => openDetail(user.id)}
                      style={{
                        padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border)',
                        background: 'transparent', color: 'var(--foreground)', cursor: 'pointer', fontSize: '0.78rem',
                      }}
                    >
                      详情
                    </button>
                    <button
                      onClick={() => setEditingUser({ id: user.id, name: user.name || '', email: user.email || '' })}
                      style={{
                        padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border)',
                        background: 'transparent', color: 'var(--foreground)', cursor: 'pointer', fontSize: '0.78rem',
                      }}
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleToggleDisabled(user.id, !user.disabled)}
                      style={{
                        padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border)',
                        background: 'transparent',
                        color: user.disabled ? '#16a34a' : '#f59e0b',
                        cursor: 'pointer', fontSize: '0.78rem',
                      }}
                      title={user.disabled ? '启用账户' : '禁用账户'}
                    >
                      {user.disabled ? '启用' : '禁用'}
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      style={{
                        padding: '5px', borderRadius: '6px', border: 'none',
                        background: 'transparent', color: '#ef4444', cursor: 'pointer',
                      }}
                      title="删除用户"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '20px' }}>
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: page <= 1 ? 'var(--muted)' : 'var(--foreground)',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  opacity: page <= 1 ? 0.4 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.82rem',
                }}
              >
                <ChevronLeft size={16} />
                上一页
              </button>
              <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: page >= totalPages ? 'var(--muted)' : 'var(--foreground)',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  opacity: page >= totalPages ? 0.4 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.82rem',
                }}
              >
                下一页
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* 用户详情弹窗 */}
      {detailLoading && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.3)',
          }}
        >
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--foreground)' }} />
        </div>
      )}

      {detailUser && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', padding: '20px',
          }}
          onClick={() => setDetailUser(null)}
        >
          <div
            style={{
              width: '100%', maxWidth: '560px', maxHeight: '85vh', overflow: 'auto',
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: '16px', padding: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--foreground)' }}>
                用户详情
              </h3>
              <button onClick={() => setDetailUser(null)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '56px', height: '56px', borderRadius: '50%',
                    background: detailUser.avatar ? `url(${detailUser.avatar}) center/cover` : 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.2rem', fontWeight: 700, color: 'var(--foreground)',
                    opacity: detailUser.disabled ? 0.4 : 1,
                  }}
                >
                  {!detailUser.avatar && (detailUser.name?.[0] || detailUser.email?.[0] || '?')}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--foreground)' }}>
                      {detailUser.name || '未命名用户'}
                    </span>
                    <select
                      value={detailUser.plan}
                      disabled={userPlanLoading}
                      onChange={(e) => handleChangeUserPlan(detailUser.id, e.target.value)}
                      style={{
                        padding: '2px 20px 2px 8px',
                        borderRadius: '10px',
                        fontSize: '0.68rem',
                        fontWeight: 500,
                        border: '1px solid var(--border)',
                        backgroundColor: detailUser.plan === 'pro' ? 'rgba(99,102,241,0.12)' : detailUser.plan === 'team' ? 'rgba(245,158,11,0.12)' : 'var(--accent)',
                        color: detailUser.plan === 'pro' ? '#6366f1' : detailUser.plan === 'team' ? '#f59e0b' : 'var(--foreground)',
                        cursor: 'pointer',
                        outline: 'none',
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%23999' d='M0 0l5 6 5-6z'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 6px center',
                      }}
                    >
                      {PLAN_OPTIONS.map((p) => (
                        <option key={p.key} value={p.key}>{p.label}</option>
                      ))}
                    </select>
                    {detailUser.disabled && (
                      <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', background: '#fef2f2', color: '#dc2626', fontWeight: 500 }}>
                        已禁用
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                    {detailUser.email || '无邮箱'}
                  </div>
                </div>
              </div>

              {/* 基本字段 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { label: '用户 ID', value: detailUser.id },
                  { label: '手机号', value: detailUser.phone || '-' },
                  { label: 'CloudBase UID', value: detailUser.cloudbaseUid || '-' },
                  { label: '注册时间', value: detailUser.createdAt.slice(0, 10) },
                ].map((item) => (
                  <div key={item.label} style={{ padding: '8px 12px', borderRadius: '8px', background: 'var(--accent)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginBottom: '2px' }}>{item.label}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--foreground)', fontFamily: item.label === '用户 ID' ? 'monospace' : undefined, wordBreak: 'break-all' }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* 活跃 + 统计 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'var(--accent)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginBottom: '2px' }}>最后登录</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--foreground)' }}>
                    {detailUser.lastLoginAt ? formatLastLogin(detailUser.lastLoginAt) : '从未登录'}
                  </div>
                </div>
                <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'var(--accent)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginBottom: '2px' }}>任务完成率</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--foreground)', fontWeight: 600 }}>
                    {detailUser.totalTasks > 0
                      ? `${detailUser.completionRate}% (${detailUser.completedTasks}/${detailUser.totalTasks})`
                      : '无任务'}
                  </div>
                </div>
                <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'var(--accent)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginBottom: '2px' }}>AI 用量</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--foreground)', fontWeight: 600 }}>
                    {detailUser.aiQuotaUsed > 0 ? `${detailUser.aiQuotaUsed} 次` : '未使用'}
                  </div>
                </div>
              </div>

              {detailUser.workspaces.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '8px' }}>
                    工作区 ({detailUser.workspaces.length})
                  </div>
                  <div style={{ display: 'grid', gap: '6px' }}>
                    {detailUser.workspaces.map((ws) => (
                      <div
                        key={ws.id}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--foreground)' }}>
                            {ws.name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '2px' }}>
                            {ws.taskCount} 任务 · {ws.projectCount} 项目
                            {ws.aiQuotaUsed > 0 && ` · AI ${ws.aiQuotaUsed}次`}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <select
                            value={ws.plan}
                            disabled={planLoading === ws.id}
                            onChange={(e) => handleChangePlan(ws.id, e.target.value)}
                            style={{
                              padding: '3px 22px 3px 8px',
                              borderRadius: '10px',
                              fontSize: '0.68rem',
                              fontWeight: 500,
                              border: '1px solid var(--border)',
                              backgroundColor: ws.plan === 'pro' ? 'rgba(99,102,241,0.12)' : ws.plan === 'team' ? 'rgba(245,158,11,0.12)' : 'var(--accent)',
                              color: ws.plan === 'pro' ? '#6366f1' : ws.plan === 'team' ? '#f59e0b' : 'var(--foreground)',
                              cursor: 'pointer',
                              outline: 'none',
                              appearance: 'none',
                              WebkitAppearance: 'none',
                              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%23999' d='M0 0l5 6 5-6z'/%3E%3C/svg%3E")`,
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'right 8px center',
                            }}
                          >
                            {PLAN_OPTIONS.map((p) => (
                              <option key={p.key} value={p.key}>{p.label}</option>
                            ))}
                          </select>
                          <span style={{
                            padding: '3px 8px', borderRadius: '10px', fontSize: '0.68rem',
                            background: 'var(--accent)', color: 'var(--foreground)',
                          }}>
                            {roleLabel(ws.role)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 编辑用户弹窗 */}
      {editingUser && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', padding: '20px',
          }}
          onClick={() => setEditingUser(null)}
        >
          <div
            style={{
              width: '100%', maxWidth: '420px',
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: '16px', padding: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--foreground)' }}>
                编辑用户
              </h3>
              <button onClick={() => setEditingUser(null)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={labelStyle}>用户名</label>
                <input
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>邮箱</label>
                <input
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setEditingUser(null)} style={{
                padding: '8px 20px', borderRadius: '8px', border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--foreground)', cursor: 'pointer', fontSize: '0.85rem',
              }}>
                取消
              </button>
              <button onClick={handleSaveUser} disabled={saving} style={{
                padding: '8px 20px', borderRadius: '8px', border: 'none',
                background: 'var(--primary)', color: 'var(--primary-foreground)',
                cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.85rem',
                opacity: saving ? 0.5 : 1,
              }}>
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   侧边栏菜单定义（在此扩展新菜单项）
   ================================================================ */
interface MenuItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  disabled?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  { key: 'plans', label: '套餐管理', icon: CreditCard },
  { key: 'announcements', label: '公告管理', icon: Megaphone },
  { key: 'keypool', label: 'API Key 池', icon: Key },
  { key: 'users', label: '用户管理', icon: UserCog },
];

const PANEL_MAP: Record<string, React.ComponentType> = {
  plans: PlansPanel,
  announcements: AnnouncementsPanel,
  keypool: KeyPoolPanel,
  users: UsersPanel,
};

/* ================================================================
   主页面
   ================================================================ */
export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState('plans');
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(AUTH_KEY) === '1') {
      setAuthed(true);
    }
    setChecked(true);
  }, []);

  if (!checked) return null;

  if (!authed) {
    return <LoginForm onLogin={() => setAuthed(true)} />;
  }

  const Panel = PANEL_MAP[tab] || PlansPanel;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header
        style={{
          borderBottom: '1px solid var(--border)',
          background: 'var(--card)',
          flexShrink: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '0 24px',
            height: '52px',
          }}
        >
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.82rem',
              color: 'var(--muted)',
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={18} />
            首页
          </Link>
          <h1
            style={{
              margin: 0,
              fontSize: '1.05rem',
              fontWeight: 700,
              color: 'var(--foreground)',
              flex: 1,
            }}
          >
            后台管理
          </h1>

          <button
            onClick={() => {
              sessionStorage.removeItem(AUTH_KEY);
              setAuthed(false);
            }}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontSize: '0.78rem',
            }}
          >
            退出
          </button>
        </div>
      </header>

      {/* Body: sidebar + content */}
      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar */}
        <aside
          style={{
            width: '200px',
            flexShrink: 0,
            borderRight: '1px solid var(--border)',
            background: 'var(--card)',
            padding: '16px 0',
          }}
        >
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 8px' }}>
            {MENU_ITEMS.map((item) => {
              const active = tab === item.key;
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => !item.disabled && setTab(item.key)}
                  disabled={item.disabled}
                  title={item.disabled ? '即将推出' : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: active ? 'var(--primary)' : 'transparent',
                    color: active ? 'var(--primary-foreground)' : item.disabled ? 'var(--muted)' : 'var(--foreground)',
                    cursor: item.disabled ? 'not-allowed' : 'pointer',
                    fontSize: '0.84rem',
                    fontWeight: active ? 600 : 400,
                    opacity: item.disabled ? 0.45 : 1,
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  <Icon size={18} />
                  {item.label}
                  {item.disabled && (
                    <span style={{ fontSize: '0.65rem', marginLeft: 'auto', opacity: 0.6 }}>即将</span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <main style={{ flex: 1, padding: '24px 28px', minWidth: 0 }}>
          <Panel />
        </main>
      </div>
    </div>
  );
}

/* ================================================================
   共享样式
   ================================================================ */
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.82rem',
  fontWeight: 500,
  color: 'var(--foreground)',
  marginBottom: '5px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  background: 'var(--input)',
  color: 'var(--foreground)',
  fontSize: '0.88rem',
  outline: 'none',
  marginBottom: '12px',
  boxSizing: 'border-box',
};
