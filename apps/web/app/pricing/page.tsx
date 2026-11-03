'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { billingApi, type PlanInfo } from '@/lib/api';
import { useTaskStore } from '@/store/taskStore';
import PricingCard from '@/components/billing/PricingCard';

// plan key → Stripe price ID 映射（后续改数据库存储）
const PRICE_ID_MAP: Record<string, string | undefined> = {
  pro: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO,
  team: process.env.NEXT_PUBLIC_STRIPE_PRICE_TEAM,
};

export default function PricingPage() {
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    billingApi
      .getPlans()
      .then(setPlans)
      .catch(() => setError('加载套餐信息失败'))
      .finally(() => setLoading(false));
  }, []);

  const handleSelectPlan = async (plan: PlanInfo) => {
    if (plan.price === 0) return;
    setCheckoutLoading(true);
    try {
      const workspaceId = useTaskStore.getState().currentWorkspaceId;
      if (!workspaceId) {
        alert('请先登录后再订阅。');
        return;
      }

      const priceId = PRICE_ID_MAP[plan.id];
      if (!priceId) {
        alert('该套餐暂不可用，请联系管理员。');
        return;
      }

      const res = await billingApi.createCheckout(workspaceId, priceId, 'stripe');
      if (res.url) {
        window.location.href = res.url;
      }
    } catch (err: any) {
      alert(err?.message || '创建支付链接失败，请稍后重试。');
    } finally {
      setCheckoutLoading(false);
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
          <h1 className="text-lg font-semibold text-foreground">选择套餐</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-3">简单透明的定价</h2>
          <p className="text-muted max-w-lg mx-auto">
            选择适合您的套餐，随时升级或降级。所有套餐均包含基础云同步功能。
          </p>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        )}

        {error && (
          <div className="text-center py-20 text-red-500">{error}</div>
        )}

        {!loading && !error && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                onSelect={handleSelectPlan}
                loading={checkoutLoading}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
