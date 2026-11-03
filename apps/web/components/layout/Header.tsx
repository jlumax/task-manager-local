'use client';

import { useTaskStore } from '@/store/taskStore';
import { useHydration } from '@/hooks/useHydration';
import { getCurrentDateString } from '@/lib/utils';
import { useState, useRef } from 'react';
import MarkdownEditor from '@/components/editor/MarkdownEditor';
import { HardDrive, RefreshCw, Search } from 'lucide-react';
import { isLocalMode } from '@/lib/app-mode';

interface HeaderProps {
  onShowLogin?: () => void;
  isAiOpen?: boolean;
}

export default function Header({ onShowLogin, isAiOpen = false }: HeaderProps) {
  const hydrated = useHydration();
  const {
    appTitle,
    appSubtitle,
    setAppTitle,
    setAppSubtitle,
    addTask,
    setSearchTerm,
    searchTerm,
    syncStatus,
    syncPending,
    syncError,
    pendingSyncCount,
    retryPendingSync,
  } = useTaskStore();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingSubtitle, setIsEditingSubtitle] = useState(false);
  const [showTaskEditor, setShowTaskEditor] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const displayTitle = appTitle.replace(/^📋\s*/, '');
  const syncTone = isLocalMode ? 'synced' :
    syncStatus === 'offline'
      ? 'unsynced'
      : syncStatus === 'error' || pendingSyncCount > 0
        ? 'unsynced'
        : syncPending || syncStatus === 'loading' || syncStatus === 'syncing'
          ? 'syncing'
          : syncStatus === 'synced'
            ? 'synced'
            : 'idle';
  const syncLabel = isLocalMode ? '已保存到本地' :
    syncStatus === 'offline'
      ? pendingSyncCount
        ? `离线 · ${pendingSyncCount} 条待同步`
        : '离线'
      : syncPending || syncStatus === 'loading' || syncStatus === 'syncing'
        ? '正在同步'
        : pendingSyncCount > 0
          ? `${pendingSyncCount} 条待同步`
          : syncStatus === 'synced'
            ? '已同步'
            : '本地已加载';

  const handleAddTask = (val: string) => {
    if (val.trim()) {
      addTask(val);
    }
    setShowTaskEditor(false);
  };

  const saveTitle = () => {
    const newTitle = titleRef.current?.textContent?.trim();
    if (newTitle) {
      setAppTitle(newTitle);
    }
    setIsEditingTitle(false);
  };

  const saveSubtitle = () => {
    const newSubtitle = subtitleRef.current?.textContent?.trim();
    if (newSubtitle) {
      setAppSubtitle(newSubtitle);
    }
    setIsEditingSubtitle(false);
  };

  if (!hydrated) {
    return (
      <header>
        <div style={{ height: '60px' }} />
        <div className="animate-pulse h-10 w-64 bg-accent rounded mx-auto mb-4" />
        <div className="animate-pulse h-5 w-96 bg-accent rounded mx-auto mb-3" />
        <div className="animate-pulse h-6 w-32 bg-accent rounded-full mx-auto" />
      </header>
    );
  }

  return (
    <>
      <header>
        <div className="header-actions-left">
          <div className="add-task-mini">
            <input
              type="text"
              readOnly
              onClick={() => setShowTaskEditor(true)}
              placeholder="添加新任务..."
            />
            <button onClick={() => setShowTaskEditor(true)}>+</button>
          </div>
        </div>

        <div className="header-actions-right">
          <div className="search-box">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索任务..."
            />
            <button onClick={() => setSearchTerm(searchTerm)} aria-label="执行搜索"><Search size={17} /></button>
          </div>
        </div>

        <h1
          ref={titleRef}
          contentEditable
          suppressContentEditableWarning
          onFocus={() => setIsEditingTitle(true)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              saveTitle();
              (e.target as HTMLElement).blur();
            }
          }}
        >
          {displayTitle}
        </h1>

        <p
          ref={subtitleRef}
          contentEditable
          suppressContentEditableWarning
          onFocus={() => setIsEditingSubtitle(true)}
          onBlur={saveSubtitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              saveSubtitle();
              (e.target as HTMLElement).blur();
            }
          }}
        >
          {appSubtitle}
        </p>

        <div className="header-meta-row">
          <div className="date-display">{getCurrentDateString()}</div>
          <button
            type="button"
            className={`sync-status-button ${syncTone}`}
            onClick={() => { if (!isLocalMode) retryPendingSync(); }}
            data-tooltip={syncError || syncLabel}
            aria-label={`${isLocalMode ? '保存' : '同步'}状态：${syncLabel}`}
          >
            {isLocalMode
              ? <HardDrive size={16} strokeWidth={2.2} aria-hidden="true" />
              : <RefreshCw size={16} strokeWidth={2.2} aria-hidden="true" />}
          </button>
        </div>
      </header>

      <MarkdownEditor
        isOpen={showTaskEditor}
        initialValue=""
        title="添加新任务"
        placeholder="在此输入任务内容..."
        onConfirm={handleAddTask}
        onCancel={() => setShowTaskEditor(false)}
        overlayStyle={isAiOpen ? { right: 420 } : undefined}
      />
    </>
  );
}
