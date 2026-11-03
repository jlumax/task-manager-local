'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { useTaskStore } from '@/store/taskStore';
import { renderMarkdown, highlightText } from '@/lib/markdown';
import { Task, FilterType } from '@/types';
import DateFilterButton from '@/components/DateFilterButton';
import EmptyState from '@/components/ui/EmptyState';
import ImageLightbox from '@/components/files/ImageLightbox';
import TaskShareMenu from '@/components/tasks/TaskShareMenu';
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal';
import { BarChart3, ChevronsDown, ChevronsUp, ListTodo, NotebookText, Pencil, Pin } from 'lucide-react';

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const filterLabels: Record<FilterType, string> = {
  all: '全部',
  active: '进行中',
  completed: '已完成',
  stuck: '僵持中',
  high: '高优先级',
  overdue: '已逾期',
};

function NoteCard({ task, searchTerm, onClick, onNavigateTask, onOpenImages, collapsed: forceCollapsed }: { task: Task; searchTerm: string; onClick: () => void; onNavigateTask: (taskId: string) => void; onOpenImages: (images: string[], initialIndex: number) => void; collapsed?: boolean }) {
  const { togglePin, updateTaskTitle, effectsEnabled } = useTaskStore();
  const priorityClass = `priority-${task.priority}`;
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const [isExpandable, setIsExpandable] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const handleTitleBlur = () => {
    const newTitle = titleRef.current?.textContent?.trim();
    if (newTitle && newTitle !== task.title) {
      updateTaskTitle(task.id, newTitle);
    }
    setIsEditingTitle(false);
  };

  const sortedProgress = useMemo(
    () =>
      task.progress
        .map((p, originalIdx) => ({ ...p, originalIdx }))
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()),
    [task.progress]
  );

  useEffect(() => {
    if (!bodyRef.current) return;
    const checkHeight = () => {
      if (!bodyRef.current) return;
      const halfScreen = window.innerHeight / 2;
      setIsExpandable(bodyRef.current.scrollHeight > halfScreen);
    };
    checkHeight();
    const observer = new ResizeObserver(checkHeight);
    observer.observe(bodyRef.current);
    window.addEventListener('resize', checkHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', checkHeight);
    };
  }, [task.progress.length, task.title]);

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('[contenteditable]') ||
      target.closest('a')
    ) {
      return;
    }
    onClick();
  };

  return (
    <div className={`note-card ${priorityClass}`} onClick={handleCardClick} data-task-id={task.id}>
      <button
        className={`note-pin-btn ${task.pinned ? 'pinned' : ''}`}
        onClick={() => togglePin(task.id)}
        title={task.pinned ? '取消置顶' : '置顶任务'}
      >
        <Pin size={14} fill={task.pinned ? 'currentColor' : 'none'} />
      </button>
      <div className="note-header">
        <span
          ref={titleRef}
          contentEditable
          suppressContentEditableWarning
          onFocus={() => setIsEditingTitle(true)}
          onBlur={handleTitleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleTitleBlur();
              (e.target as HTMLElement).blur();
            }
          }}
          className="note-title"
        >
          {task.title}
        </span>
      </div>

      <div
        className="note-meta"
        style={{
          justifyContent: 'space-between',
          ...(forceCollapsed ? { borderBottom: 'none', paddingBottom: 0, marginBottom: 0 } : {}),
        }}
      >
        <span>
          {new Date(task.startDate || task.createdAt).toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          })}
        </span>
        {task.progress.length > 0 && (
          <span>
            {(() => {
              const updateTime = task.progress.reduce((latest, p) =>
                new Date(p.time) > new Date(latest.time) ? p : latest
              ).time;
              const d = new Date(updateTime);
              const pad = (n: number) => String(n).padStart(2, '0');
              return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
            })()}
            {' '}
            <Pencil size={12} />
          </span>
        )}
      </div>

      <div className="note-share-wrapper">
        <TaskShareMenu task={task} triggerClassName="note-share-btn card-hover-btn" />
      </div>

      <button
        className="note-goto-btn"
        onClick={(e) => {
          e.stopPropagation();
          const { setExpandedTaskId, setHighlightTaskId, setCurrentView } = useTaskStore.getState();
          setExpandedTaskId(task.id);
          setHighlightTaskId(task.id);
          setCurrentView('list');
        }}
        title="跳转到任务列表"
        style={{ left: 2 }}
      >
        <ListTodo size={14} />
      </button>
      <button
        className="note-goto-btn"
        onClick={(e) => {
          e.stopPropagation();
          const { setHighlightTaskId, setCurrentView } = useTaskStore.getState();
          setHighlightTaskId(task.id);
          setCurrentView('gantt');
        }}
        title="跳转到甘特图"
        style={{ right: 2 }}
      >
        <BarChart3 size={14} style={{ transform: 'rotate(90deg)' }} />
      </button>

      {sortedProgress.length > 0 && !forceCollapsed && (
        <>
          <div
            ref={bodyRef}
            className={`note-body ${isExpandable && !isExpanded ? 'folded' : ''}`}
          >
            <div className="note-progress-list">
              {sortedProgress.map((item, idx) => {
                const html = renderMarkdown(item.content);
                const highlighted = searchTerm
                  ? highlightText(html, searchTerm)
                  : html;

                return (
                  <div key={idx} className="note-progress-item">
                    <div className="note-progress-time">
                      {new Date(item.time).toLocaleString('zh-CN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    <div
                      className="note-progress-content"
                      dangerouslySetInnerHTML={{ __html: highlighted }}
                      onClick={(e) => {
                        const link = (e.target as HTMLElement).closest('a[data-task-link]');
                        if (link) {
                          e.preventDefault();
                          e.stopPropagation();
                          const tid = link.getAttribute('data-task-link')!;
                          onNavigateTask(tid);
                        }
                      }}
                    />
                    {item.images && item.images.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {item.images.map((image, imageIndex) => (
                          <button
                            key={imageIndex}
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onOpenImages(item.images || [], imageIndex);
                            }}
                            className="overflow-hidden rounded-lg border border-border hover:border-primary transition-colors"
                            title={`查看进展图片 ${imageIndex + 1}`}
                          >
                            <img
                              src={image}
                              alt={`进展图片 ${imageIndex + 1}`}
                              className="h-16 w-16 object-cover"
                              loading="lazy"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          {isExpandable && (
            <button
              className="note-expand-btn"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? '折叠' : '展开'}
            >
              {isExpanded ? '⌃' : '⌄'}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function NotesView({ isAiOpen = false }: { isAiOpen?: boolean }) {
  const {
    tasks,
    getFilteredTasks,
    searchTerm,
    currentFilter,
    setFilter,
    setDateFilter,
    getStats,
    dateFilter,
    highlightTaskId,
    setHighlightTaskId,
  } = useTaskStore();

  const [modalTaskId, setModalTaskId] = useState<string | null>(null);
  const modalTask = useMemo(() => tasks.find((t) => t.id === modalTaskId), [tasks, modalTaskId]);
  const [collapseProgress, setCollapseProgress] = useState(false);
  const [lightbox, setLightbox] = useState<{ images: string[]; initialIndex: number } | null>(null);
  const todayFilter = useMemo(() => {
    const today = formatLocalDate(new Date());
    return `${today}..${today}`;
  }, []);

  const filteredTasks = getFilteredTasks();
  const stats = getStats();

  // 排序：置顶优先，其次按更新时间倒序（有进展取最新进展时间，无进展取创建时间）
  const sortedTasks = useMemo(() => {
    const getUpdateTime = (task: Task) => {
      if (task.progress.length > 0) {
        return Math.max(...task.progress.map((p) => new Date(p.time).getTime()));
      }
      return new Date(task.createdAt).getTime();
    };
    return [...filteredTasks].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return getUpdateTime(b) - getUpdateTime(a);
    });
  }, [filteredTasks]);

  useEffect(() => {
    if (!highlightTaskId) return;
    const el = document.querySelector(`[data-task-id="${highlightTaskId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('note-card-highlight');
      const timer = setTimeout(() => {
        el.classList.remove('note-card-highlight');
        setHighlightTaskId(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [highlightTaskId, setHighlightTaskId]);

  return (
    <>
      <div className="tasks-container">
      <div className="tasks-header">
        <h2 className="icon-heading"><NotebookText size={20} />笔记卡片</h2>
        <div className="filter-tabs">
          {(
            ['all', 'active', 'completed', 'stuck', 'high', 'overdue'] as FilterType[]
          ).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`filter-tab ${currentFilter === f ? 'active' : ''}`}
            >
              {filterLabels[f]}
              <span className="count">
                {f === 'all' && stats.total}
                {f === 'active' && stats.active}
                {f === 'completed' && stats.completed}
                {f === 'stuck' && stats.stuck}
                {f === 'high' && stats.high}
                {f === 'overdue' && stats.overdue}
              </span>
            </button>
          ))}
          <button
            onClick={() => setCollapseProgress(!collapseProgress)}
            className={`filter-tab ${collapseProgress ? 'active' : ''}`}
            title={collapseProgress ? '展开进展记录' : '折叠进展记录'}
          >
            <span className="icon-label">{collapseProgress ? <ChevronsDown size={14} /> : <ChevronsUp size={14} />}{collapseProgress ? '展开' : '折叠'}</span>
          </button>
          <button
            onClick={() => setDateFilter(dateFilter === todayFilter ? null : todayFilter)}
            className={`filter-tab ${dateFilter === todayFilter ? 'active' : ''}`}
            title="筛选今日任务"
          >
            今日
          </button>
          <DateFilterButton />
        </div>
      </div>

      {sortedTasks.length === 0 ? (
        <EmptyState title="暂无笔记卡片" hint="添加任务并记录进展，即可在此查看笔记卡片" />
      ) : (
        <div className="notes-container">
          {sortedTasks.map((task) => (
            <NoteCard
              key={task.id}
              task={task}
              searchTerm={searchTerm}
              onClick={() => setModalTaskId(task.id)}
              onNavigateTask={setModalTaskId}
              onOpenImages={(images, initialIndex) => setLightbox({ images, initialIndex })}
              collapsed={collapseProgress}
            />
          ))}
        </div>
      )}

      {modalTask && (
        <TaskDetailModal
          task={modalTask}
          searchTerm={searchTerm}
          onClose={() => setModalTaskId(null)}
          isAiOpen={isAiOpen}
          onNavigateTask={setModalTaskId}
        />
      )}
      </div>

      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          initialIndex={lightbox.initialIndex}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}
