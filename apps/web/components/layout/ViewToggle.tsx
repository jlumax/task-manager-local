'use client';

import { useEffect, type ReactNode } from 'react';
import { BarChart3, ListTodo, NotebookText } from 'lucide-react';
import { useTaskStore } from '@/store/taskStore';
import { ViewType } from '@/types';

const allViews: { key: ViewType; label: ReactNode; feature?: string }[] = [
  { key: 'list', label: <span className="icon-label"><ListTodo size={15} />列表</span> },
  { key: 'notes', label: <span className="icon-label"><NotebookText size={15} />笔记</span> },
  { key: 'gantt', label: <span className="icon-label"><BarChart3 size={15} style={{ transform: 'rotate(90deg)' }} />甘特图</span>, feature: 'gantt' },
];

export default function ViewToggle() {
  const { currentView, setCurrentView, currentPlanLimits } = useTaskStore();

  const views = allViews.filter((v) => {
    if (v.feature === 'gantt' && currentPlanLimits && !currentPlanLimits.gantt) return false;
    return true;
  });

  // 如果当前视图因计划限制不可用，自动切回列表
  useEffect(() => {
    if (currentView === 'gantt' && currentPlanLimits && !currentPlanLimits.gantt) {
      setCurrentView('list');
    }
  }, [currentView, currentPlanLimits, setCurrentView]);

  return (
    <>
      {views.map((v) => (
        <button
          key={v.key}
          onClick={() => setCurrentView(v.key)}
          className={`view-btn ${currentView === v.key ? 'active' : ''}`}
        >
          {v.label}
        </button>
      ))}
    </>
  );
}
