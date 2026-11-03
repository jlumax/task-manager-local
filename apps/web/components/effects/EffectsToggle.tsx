'use client';

import { useTaskStore } from '@/store/taskStore';
import { Sparkles } from 'lucide-react';

export default function EffectsToggle() {
  const { effectsEnabled, toggleEffects } = useTaskStore();

  return (
    <button
      onClick={toggleEffects}
      title="开启/关闭动效"
      className={`celebration-toggle ${effectsEnabled ? 'active' : ''}`}
    >
      <span className="icon-label"><Sparkles size={15} />动效</span>
    </button>
  );
}
