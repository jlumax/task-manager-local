'use client';

import { useState, useEffect } from 'react';
import { Loader2, Check, X, Eye, EyeOff, Trash2 } from 'lucide-react';
import { aiApi } from '@/lib/api';

interface Props {
  workspaceId: string;
}

const PROVIDERS = [
  { value: 'deepseek', label: 'DeepSeek', baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' },
  { value: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
  { value: 'kimi', label: 'Kimi（月之暗面）', baseUrl: 'https://api.moonshot.cn/v1', model: 'kimi-k2.6' },
  { value: 'mimo', label: 'MiMo（小米）', baseUrl: 'https://api.xiaomimimo.com/v1', model: 'mimo-v2.5' },
  { value: 'anthropic', label: 'Anthropic Claude', baseUrl: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-6' },
  { value: 'custom', label: '自定义', baseUrl: '', model: '' },
];

export default function AiConfigForm({ workspaceId }: Props) {
  const [config, setConfig] = useState({
    provider: 'deepseek',
    baseUrl: 'https://api.deepseek.com',
    apiKey: '',
    model: 'deepseek-chat',
    enabled: false,
  });
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; model: string } | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefSaved, setPrefSaved] = useState(false);

  useEffect(() => {
    aiApi.getCustomKey(workspaceId).then((info) => {
      setConfig({
        provider: info.provider || 'deepseek',
        baseUrl: info.baseUrl || 'https://api.deepseek.com',
        apiKey: info.apiKey || '',
        model: info.model || 'deepseek-chat',
        enabled: info.enabled,
      });
    }).catch(() => {});
    aiApi.getPreferences(workspaceId).then((prefs) => {
      setCustomInstructions(prefs.customInstructions || '');
    }).catch(() => {});
  }, [workspaceId]);

  const handleSavePreferences = async () => {
    setSavingPrefs(true);
    try {
      await aiApi.savePreferences(workspaceId, { customInstructions });
      setPrefSaved(true);
      setTimeout(() => setPrefSaved(false), 2000);
    } catch { /* ignore */ }
    setSavingPrefs(false);
  };

  const handleProviderChange = (provider: string) => {
    const p = PROVIDERS.find((p) => p.value === provider);
    setConfig((prev) => ({
      ...prev,
      provider,
      baseUrl: p?.baseUrl || '',
      model: p?.model || '',
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await aiApi.saveCustomKey(workspaceId, {
        provider: config.provider,
        baseUrl: config.baseUrl,
        apiKey: config.apiKey || undefined,
        model: config.model,
        enabled: config.enabled,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
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
      const result = await aiApi.testCustomKey(workspaceId, {
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        model: config.model,
      });
      setTestResult(result);
    } catch {
      setTestResult({ success: false, model: '' });
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    await aiApi.deleteCustomKey(workspaceId);
    setConfig({ provider: 'deepseek', baseUrl: 'https://api.deepseek.com', apiKey: '', model: 'deepseek-chat', enabled: false });
    setTestResult(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5">
        <h4 className="mb-4 text-sm font-semibold text-foreground">自定义 API Key <span className="text-xs font-normal text-primary ml-1">Pro/Team 专属</span></h4>

        <div className="space-y-3">
          {/* Provider select */}
          <div>
            <label className="block text-xs text-muted mb-1">供应商</label>
            <select
              value={config.provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full rounded-lg border border-border bg-accent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Base URL */}
          <div>
            <label className="block text-xs text-muted mb-1">API Base URL</label>
            <input
              value={config.baseUrl}
              onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
              placeholder="https://api.deepseek.com"
              className="w-full rounded-lg border border-border bg-accent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="block text-xs text-muted mb-1">API Key</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full rounded-lg border border-border bg-accent px-3 py-2 pr-10 text-sm text-foreground outline-none focus:border-primary"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-foreground"
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Model */}
          <div>
            <label className="block text-xs text-muted mb-1">Model</label>
            <input
              value={config.model}
              onChange={(e) => setConfig({ ...config, model: e.target.value })}
              placeholder="deepseek-chat"
              className="w-full rounded-lg border border-border bg-accent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          {/* Enable toggle */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="text-sm text-foreground">启用自定义 Key</span>
              <p className="text-xs text-muted mt-0.5">启用后使用你自己的 API Key，不限额、不计入月配额</p>
            </div>
            <button
              onClick={() => setConfig({ ...config, enabled: !config.enabled })}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                config.enabled ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  config.enabled ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>

          {/* Test result */}
          {testResult && (
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
              testResult.success
                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            }`}>
              {testResult.success ? <Check size={14} /> : <X size={14} />}
              {testResult.success ? `连接成功 (模型: ${testResult.model})` : '连接失败，请检查配置'}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleTest}
              disabled={testing || !config.apiKey}
              className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs text-foreground hover:bg-accent transition-colors disabled:opacity-50"
            >
              {testing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              测试连接
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saved ? <Check size={14} /> : saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {saved ? '已保存' : '保存配置'}
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-auto"
            >
              <Trash2 size={14} />
              清除配置
            </button>
          </div>
        </div>
      </div>

      {/* AI 自定义指令 */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h4 className="mb-4 text-sm font-semibold text-foreground">AI 自定义指令</h4>
        <p className="text-xs text-muted mb-3">
          设置后会自动注入到每次 AI 对话中，跨对话持久生效。例如：回复风格、专业领域偏好等。
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-muted mb-1">自定义指令</label>
            <textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="例如：总是用表格回复、不要用 emoji、我是前端工程师请用技术术语、回复简洁扼要..."
              rows={4}
              className="w-full rounded-lg border border-border bg-accent px-3 py-2 text-sm text-foreground placeholder:text-muted outline-none focus:border-primary resize-y"
            />
          </div>
          <button
            onClick={handleSavePreferences}
            disabled={savingPrefs}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {prefSaved ? <Check size={14} /> : savingPrefs ? <Loader2 size={14} className="animate-spin" /> : null}
            {prefSaved ? '已保存' : '保存偏好'}
          </button>
        </div>
      </div>
    </div>
  );
}
