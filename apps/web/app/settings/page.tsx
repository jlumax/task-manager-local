'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, CreditCard, Sparkles, Loader2, Smartphone } from 'lucide-react';
import { useTaskStore } from '@/store/taskStore';
import { aiApi, type AiQuotaInfo } from '@/lib/api';
import { useAuth } from '@/hooks/useCloudBaseAuth';
import AiConfigForm from '@/components/ai/AiConfigForm';

type Tab = 'billing' | 'ai' | 'account';

export default function SettingsPage() {
  const { currentWorkspaceId, currentWorkspacePlan } = useTaskStore();
  const [tab, setTab] = useState<Tab>('billing');
  const [quota, setQuota] = useState<AiQuotaInfo | null>(null);
  const [loadingQuota, setLoadingQuota] = useState(false);

  const hasAi = currentWorkspacePlan === 'pro' || currentWorkspacePlan === 'team';

  useEffect(() => {
    if (hasAi && currentWorkspaceId) {
      setLoadingQuota(true);
      aiApi.getQuota(currentWorkspaceId)
        .then(setQuota)
        .catch(() => {})
        .finally(() => setLoadingQuota(false));
    }
  }, [hasAi, currentWorkspaceId]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto flex items-center gap-4 px-4 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft size={18} />
            返回首页
          </Link>
          <h1 className="text-lg font-semibold text-foreground">设置</h1>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="container mx-auto flex gap-0 px-4">
          <button
            onClick={() => setTab('billing')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === 'billing'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            <CreditCard size={16} />
            套餐与账单
          </button>
          {hasAi && (
            <button
              onClick={() => setTab('ai')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === 'ai'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted hover:text-foreground'
              }`}
            >
              <Sparkles size={16} />
              AI 配置
            </button>
          )}
          <button
            onClick={() => setTab('account')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === 'account'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            <Smartphone size={16} />
            账号绑定
          </button>
        </div>
      </div>

      <main className="container mx-auto max-w-2xl px-4 py-8">
        {tab === 'billing' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-2 text-sm font-semibold text-foreground">当前套餐</h3>
              <p className="text-2xl font-bold text-foreground capitalize">{currentWorkspacePlan || 'free'}</p>
              <p className="mt-1 text-sm text-muted">
                {currentWorkspacePlan === 'free'
                  ? '免费套餐，可升级至 Pro 解锁更多功能。'
                  : '感谢订阅！'}
              </p>
              <Link
                href="/pricing"
                className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                查看套餐详情 →
              </Link>
            </div>

            {hasAi && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="mb-1 text-sm font-semibold text-foreground">AI 使用额度</h3>
                <p className="text-xs text-muted mb-3">内置 DeepSeek 的月配额使用情况</p>
                {loadingQuota && (
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <Loader2 size={16} className="animate-spin" />
                    加载中...
                  </div>
                )}
                {quota && !loadingQuota && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-foreground">{quota.used} / {quota.limit} 次</span>
                      <span className="text-xs text-muted">
                        {quota.hasCustomKey ? '当前使用自定义 Key' : '使用内置 Key'}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-accent overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${quota.limit > 0 ? Math.min((quota.used / quota.limit) * 100, 100) : 0}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-2 text-sm font-semibold text-foreground">管理订阅</h3>
              <p className="text-sm text-muted mb-3">
                在 Stripe 客户门户中查看账单历史、更新支付方式或取消订阅。
              </p>
              <Link
                href="/settings/billing"
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
              >
                前往账单管理
              </Link>
            </div>
          </div>
        )}

        {tab === 'ai' && hasAi && currentWorkspaceId && (
          <div>
            {/* Quota progress */}
            {quota && !loadingQuota && (
              <div className="rounded-xl border border-border bg-card p-5 mb-4">
                <h3 className="mb-1 text-sm font-semibold text-foreground">内置 DeepSeek 配额</h3>
                <div className="flex items-center justify-between mb-2 mt-3">
                  <span className="text-2xl font-bold text-foreground">{quota.used} <span className="text-sm font-normal text-muted">/ {quota.limit} 次</span></span>
                  <span className="text-xs text-muted">每月 1 号重置</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-accent overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${quota.limit > 0 ? Math.min((quota.used / quota.limit) * 100, 100) : 0}%` }}
                  />
                </div>
                {quota.used >= quota.limit && quota.limit > 0 && (
                  <p className="mt-3 text-sm text-orange-600 dark:text-orange-400">
                    月配额已用完。请配置自定义 API Key 继续使用 AI 功能。
                  </p>
                )}
              </div>
            )}

            <AiConfigForm workspaceId={currentWorkspaceId} />
          </div>
        )}

        {tab === 'account' && <AccountBindPanel />}
      </main>
    </div>
  );
}

function AccountBindPanel() {
  const { user, bindPhone, sendBindPhoneCode } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [binding, setBinding] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendCode = async () => {
    if (!phone || phone.length < 11) {
      setError('请输入正确的手机号');
      return;
    }
    setError('');
    setSending(true);
    try {
      await sendBindPhoneCode(phone);
      setCountdown(60);
      setSuccess('验证码已发送，请查看手机短信');
    } catch (e: any) {
      setError(e?.message || '发送失败');
    } finally {
      setSending(false);
    }
  };

  const handleBind = async () => {
    if (!phone || !code) {
      setError('请填写手机号和验证码');
      return;
    }
    setError('');
    setBinding(true);
    try {
      await bindPhone(phone, code);
      setSuccess('手机号绑定成功！');
      setPhone('');
      setCode('');
    } catch (e: any) {
      setError(e?.message || '绑定失败');
    } finally {
      setBinding(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-2 text-sm font-semibold text-foreground">当前登录信息</h3>
        <div className="space-y-1 text-sm text-muted">
          <p>邮箱: {user?.email || '未绑定'}</p>
          <p>手机号: {user?.phone || '未绑定'}</p>
          <p>用户ID: {user?.uid || ''}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold text-foreground">绑定手机号</h3>
        <p className="text-xs text-muted mb-4">
          绑定后可用手机号直接登录，并自动合并该手机号下的任务数据。
        </p>

        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="请输入手机号"
              maxLength={11}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={handleSendCode}
              disabled={sending || countdown > 0}
              className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap"
            >
              {countdown > 0 ? `${countdown}s` : sending ? '发送中...' : '获取验证码'}
            </button>
          </div>

          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="请输入验证码"
            maxLength={6}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
          />

          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && <p className="text-sm text-green-600 dark:text-green-400">{success}</p>}

          <button
            onClick={handleBind}
            disabled={binding}
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {binding ? '绑定中...' : '确认绑定'}
          </button>
        </div>
      </div>
    </div>
  );
}
