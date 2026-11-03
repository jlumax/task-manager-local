'use client';

import { Check } from 'lucide-react';
import type { PlanInfo } from '@/lib/api';

interface PricingCardProps {
  plan: PlanInfo;
  currentPlan?: string;
  onSelect: (plan: PlanInfo) => void;
  loading?: boolean;
}

export default function PricingCard({ plan, currentPlan, onSelect, loading }: PricingCardProps) {
  const isCurrent = currentPlan === plan.id;
  const isFree = plan.price === 0;

  const formatPrice = (price: number) => {
    if (price === 0) return '免费';
    return `¥${price}`;
  };

  const limitText = (value: number, label: string) => {
    if (value < 0) return `无限${label}`;
    return `${value}${label}`;
  };

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
        isCurrent
          ? 'border-primary ring-1 ring-primary bg-card'
          : 'border-border bg-card hover:border-primary/50 hover:shadow-lg'
      }`}
    >
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
          当前套餐
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
        {plan.description && (
          <p className="mt-1 text-sm text-muted">{plan.description}</p>
        )}
      </div>

      <div className="mb-6">
        <span className="text-3xl font-bold text-foreground">{formatPrice(plan.price)}</span>
        {!isFree && <span className="text-muted text-sm">/月</span>}
        {plan.priceYearly && plan.priceYearly > 0 && (
          <div className="mt-1 text-sm text-muted">
            年付 ¥{plan.priceYearly}（省 {Math.round((1 - plan.priceYearly / (plan.price * 12)) * 100)}%）
          </div>
        )}
      </div>

      <div className="mb-4 space-y-1 text-sm text-muted">
        <p>{limitText(plan.limits.tasks, '任务')}</p>
        <p>{limitText(plan.limits.projects, '项目')}</p>
        <p>{limitText(plan.limits.members, '成员')}</p>
        {plan.limits.storageMB > 0 && (
          <p>{plan.limits.storageMB}MB 存储</p>
        )}
      </div>

      <ul className="mb-6 flex-1 space-y-2">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
            <Check size={16} className="mt-0.5 shrink-0 text-primary" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSelect(plan)}
        disabled={isCurrent || loading}
        className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
          isCurrent
            ? 'cursor-default bg-accent text-muted'
            : 'bg-primary text-primary-foreground hover:opacity-90'
        }`}
      >
        {isCurrent ? '当前套餐' : isFree ? '免费使用' : '选择此套餐'}
      </button>
    </div>
  );
}
