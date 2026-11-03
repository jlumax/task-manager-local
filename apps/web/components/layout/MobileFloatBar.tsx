'use client';

import { useState, useEffect } from 'react';
import { useTaskStore } from '@/store/taskStore';
import { Plus, ArrowUp, LayoutList, BarChart3 } from 'lucide-react';
import MarkdownEditor from '@/components/editor/MarkdownEditor';

export default function MobileFloatBar() {
  const { addTask, currentView, setCurrentView } = useTaskStore();
  const [showEditor, setShowEditor] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (!isMobile) return null;

  const handleAdd = (content: string) => {
    if (content.trim()) addTask(content);
    setShowEditor(false);
  };

  return (
    <>
      <div className="mobile-float-bar">
        <button onClick={() => setShowEditor(true)}>
          <Plus size={18} className="inline mr-1" />
          新建
        </button>
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <ArrowUp size={18} className="inline mr-1" />
          顶部
        </button>
        <button onClick={() => setCurrentView(currentView === 'list' ? 'gantt' : 'list')}>
          {currentView === 'list' ? (
            <>
              <BarChart3 size={18} className="inline mr-1" />
              甘特图
            </>
          ) : (
            <>
              <LayoutList size={18} className="inline mr-1" />
              列表
            </>
          )}
        </button>
      </div>

      <MarkdownEditor
        isOpen={showEditor}
        initialValue=""
        title="添加新任务"
        placeholder="在此输入任务内容..."
        onConfirm={handleAdd}
        onCancel={() => setShowEditor(false)}
      />
    </>
  );
}
