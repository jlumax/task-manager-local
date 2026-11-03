'use client';

import { useCallback } from 'react';

export function useConfetti() {
  const trigger = useCallback((x: number, y: number) => {
    const colors = [
      '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7',
      '#dfe6e9', '#fd79a8', '#a29bfe', '#00b894', '#e17055',
    ];

    for (let i = 0; i < 30; i++) {
      const el = document.createElement('div');
      el.className = 'confetti';
      el.style.left = `${x + (Math.random() - 0.5) * 80}px`;
      el.style.top = `${y}px`;
      el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      el.style.transform = `rotate(${Math.random() * 360}deg)`;
      el.style.animationDelay = `${Math.random() * 0.2}s`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1200);
    }
  }, []);

  return trigger;
}
