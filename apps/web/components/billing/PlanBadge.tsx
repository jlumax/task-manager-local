'use client';

interface PlanBadgeProps {
  plan: string;
}

const planStyles: Record<string, string> = {
  free: 'bg-muted/20 text-muted',
  pro: 'bg-primary/10 text-primary',
  team: 'bg-amber-500/10 text-amber-600',
};

const planNames: Record<string, string> = {
  free: '免费版',
  pro: '专业版',
  team: '团队版',
};

export default function PlanBadge({ plan }: PlanBadgeProps) {
  const style = planStyles[plan] || planStyles.free;
  const name = planNames[plan] || plan;

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>
      {name}
    </span>
  );
}
