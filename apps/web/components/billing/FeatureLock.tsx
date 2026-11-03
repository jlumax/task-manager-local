'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';

interface FeatureLockProps {
  requiredPlan?: string;
  featureName?: string;
}

export default function FeatureLock({ requiredPlan = 'pro', featureName }: FeatureLockProps) {
  return (
    <div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-card/80"
      style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
    >
      <div className="flex flex-col items-center gap-3 p-6 text-center"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10"
        >
          <Lock size={20} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground"
          >
            {featureName ? `「${featureName}」功能已锁定` : '此功能需要升级套餐'}
          </p>
          <p className="mt-1 text-xs text-muted"
          >
            升级至 {requiredPlan === 'pro' ? '专业版' : requiredPlan === 'team' ? '团队版' : requiredPlan} 即可使用
          </p>
        </div>
        <Link
          href="/pricing"
          className="mt-1 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          立即升级
        </Link>
      </div>
    </div>
  );
}
