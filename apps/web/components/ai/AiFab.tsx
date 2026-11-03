'use client';

import { Sparkles } from 'lucide-react';

interface Props {
  onClick: () => void;
  visible: boolean;
}

export default function AiFab({ onClick, visible }: Props) {
  if (!visible) return null;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-24 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg hover:scale-105 hover:shadow-xl active:scale-95 transition-all duration-200 sm:bottom-8"
      title="AI 助手"
    >
      <Sparkles size={22} />
      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-purple-500 text-[10px] font-bold text-white">
        AI
      </span>
    </button>
  );
}
