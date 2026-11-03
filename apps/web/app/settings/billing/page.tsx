'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, ExternalLink, CreditCard } from 'lucide-react';
import { billingApi, type PlanInfo, type SubscriptionInfo } from '@/lib/api';
import { useTaskStore } from '@/store/taskStore';

export default function BillingSettingsPage() {
  const { currentWorkspaceId } = useTaskStore();
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    Promise.all([billingApi.getPlans(), currentWorkspaceId ? billingApi.getSubscription(currentWorkspaceId) : Promise.resolve(null)])
      .then(([p, s]) => {
        setPlans(p);
        setSubscription(s);
      })
      .catch(() => {
        // ignore
      })
      .finally(() => setLoading(false));
  }, [currentWorkspaceId]);

  const currentPlan = plans.find((p) => p.id === subscription?.plan);

  const handleManageSubscription = async () => {
    if (!currentWorkspaceId) return;
    setPortalLoading(true);
    try {
      const res = await billingApi.createPortal(currentWorkspaceId);
      if (res.url) {
        window.location.href = res.url;
      }
    } catch {
      alert('无法打开订阅管理页面，请稍后重试。');
    } finally {
      setPortalLoading(false);
    }
  };

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
          <h1 className="text-lg font-semibold text-foreground">订阅管理</h1>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-12">
        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        )}

        {!loading && currentPlan && (
          <div className="space-y-8">
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{currentPlan.name}</h2>
                  <p className="text-sm text-muted mt-1">
                    {currentPlan.price === 0 ? '免费版，可随时升级' : '订阅有效期内畅享全部功能'}
                  </p>
                </div>
                <div className="rounded-full bg-primary/10 px-4 py-2 text-primary font-medium">
                  {currentPlan.price === 0 ? '免费' : `¥${currentPlan.price}/月`}
                </div>
              </div>

              {subscription?.subscription && (
                <div className="text-sm text-muted mb-4">
                  状态：{subscription.subscription.status === 'active' ? '生效中' : subscription.subscription.status}
                  {subscription.subscription.currentPeriodEnd && (
                    <span className="ml-2">
                      （有效期至 {new Date(subscription.subscription.currentPeriodEnd).toLocaleDateString('zh-CN')}）
                    </span>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                {currentPlan.price > 0 ? (
                  <button
                    onClick={handleManageSubscription}
                    disabled={portalLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    <CreditCard size={16} />
                    {portalLoading ? '加载中...' : '管理订阅'}
                  </button>
                ) : (
                  <Link
                    href="/pricing"
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    <ExternalLink size={16} />
                    升级套餐
                  </Link>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-base font-semibold text-foreground mb-4">当前权益</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-accent p-3">
                  <div className="text-xs text-muted">任务数量</div>
                  <div className="text-sm font-medium text-foreground mt-1">
                    {currentPlan.limits.tasks < 0 ? '无限' : currentPlan.limits.tasks}
                  </div>
                </div>
                <div className="rounded-lg bg-accent p-3">
                  <div className="text-xs text-muted">项目数量</div>
                  <div className="text-sm font-medium text-foreground mt-1">
                    {currentPlan.limits.projects < 0 ? '无限' : currentPlan.limits.projects}
                  </div>
                </div>
                <div className="rounded-lg bg-accent p-3">
                  <div className="text-xs text-muted">团队成员</div>
                  <div className="text-sm font-medium text-foreground mt-1">
                    {currentPlan.limits.members < 0 ? '无限' : currentPlan.limits.members}
                  </div>
                </div>
                <div className="rounded-lg bg-accent p-3">
                  <div className="text-xs text-muted">存储空间</div>
                  <div className="text-sm font-medium text-foreground mt-1">
                    {currentPlan.limits.storageMB <= 0 ? '无' : `${currentPlan.limits.storageMB}MB`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
