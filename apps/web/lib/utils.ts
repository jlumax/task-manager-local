import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Task } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(date: string | Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatShortTime(date: string | Date): string {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
}

export function getCurrentDateString(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  };
  return now.toLocaleDateString('zh-CN', options);
}

export function formatRelativeDate(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000);

  switch (diffDays) {
    case 0: return '今天';
    case 1: return '昨天';
    case 2: return '前天';
    case 3: return '三天前';
    default: {
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${month}-${day}`;
    }
  }
}

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    // 置顶任务排在最前面
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;

    // 优先级：进行中 > 僵持中 > 已完成
    const aState = a.stuck ? 1 : (a.completed ? 2 : 0);
    const bState = b.stuck ? 1 : (b.completed ? 2 : 0);
    if (aState !== bState) return aState - bState;

    if (a.stuck) {
      const timeA = a.stuckAt || a.createdAt;
      const timeB = b.stuckAt || b.createdAt;
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    }
    if (a.completed) {
      const timeA = a.completedAt || a.createdAt;
      const timeB = b.completedAt || b.createdAt;
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    }
    const aTime = a.startDate || a.createdAt;
    const bTime = b.startDate || b.createdAt;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });
}
