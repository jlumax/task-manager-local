'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Task } from '@/types';
import { useTaskStore } from '@/store/taskStore';
import {
  formatTime,
  formatDate,
  formatShortTime,
  formatRelativeDate,
} from '@/lib/utils';
import { getHighlightedTextParts } from '@/lib/markdown';
import MarkdownEditor from '@/components/editor/MarkdownEditor';
import ProgressContent from './ProgressContent';
import ProgressImageUploader from '@/components/files/ProgressImageUploader';
import ImageLightbox from '@/components/files/ImageLightbox';
import TaskShareMenu from './TaskShareMenu';
import { filesApi, workspacesApi, ApiError } from '@/lib/api';
import { useAuth } from '@/hooks/useCloudBaseAuth';
import { triggerFireworks } from '@/lib/fireworks';
import { isLocalMode } from '@/lib/app-mode';
import { BarChart3, Ban, CalendarDays, ChevronDown, Clock3, Flag, NotebookText, Pin, RotateCcw, Trash2 } from 'lucide-react';

interface TaskItemProps {
  task: Task;
  defaultExpanded?: boolean;
  searchTerm?: string;
  highlight?: boolean;
  onClickDetail?: () => void;
}

export default function TaskItem({ task, defaultExpanded = false, searchTerm = '', highlight = false, onClickDetail }: TaskItemProps) {
  const { isSignedIn } = useAuth();
  const {
    toggleComplete,
    deleteTask,
    toggleStuck,
    togglePin,
    addProgress,
    deleteProgress,
    updateProgress,
    updateDeadline,
    updateCreatedAt,
    updateStartDate,
    setPriority,
    updateTaskTitle,
    effectsEnabled,
    currentWorkspacePlan,
    currentPlanLimits,
    expandedTaskId,
    setExpandedTaskId,
  } = useTaskStore();

  const imageUploadBlocked = isLocalMode ? false : !isSignedIn || !(currentPlanLimits?.progressImage ?? false);

  const [expanded, setExpanded] = useState(defaultExpanded);
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [editStartDate, setEditStartDate] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showProgressEditor, setShowProgressEditor] = useState(false);
  const [editingProgressIndex, setEditingProgressIndex] = useState<number | null>(null);
  const [editingProgressContent, setEditingProgressContent] = useState('');
  const [pendingProgressImages, setPendingProgressImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[] | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const titleRef = useRef<HTMLSpanElement>(null);
  const itemRef = useRef<HTMLLIElement>(null);
  const deadlineRef = useRef<HTMLDivElement>(null);
  const startDateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlight && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      itemRef.current.style.animation = 'highlight 1.5s ease';
      const timer = setTimeout(() => {
        if (itemRef.current) {
          itemRef.current.style.animation = '';
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [highlight]);

  // Click outside to close date pickers
  useEffect(() => {
    if (!showDeadlinePicker && !showStartDatePicker) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        (!deadlineRef.current || !deadlineRef.current.contains(target)) &&
        (!startDateRef.current || !startDateRef.current.contains(target))
      ) {
        setShowDeadlinePicker(false);
        setShowStartDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showDeadlinePicker, showStartDatePicker]);

  useEffect(() => {
    if (expandedTaskId === task.id) {
      setExpanded(true);
      setTimeout(() => {
        itemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      setExpandedTaskId(null);
    }
  }, [expandedTaskId, task.id]);

  const priorityClass = task.priority || 'medium';
  const priorityLabel =
    priorityClass === 'high' ? '高' : priorityClass === 'low' ? '低' : '中';

  const lastUpdateTime =
    task.progress.length > 0
      ? task.progress[0].time
      : task.completed && task.completedAt
      ? task.completedAt
      : task.createdAt;

  const isOverdue = (() => {
    if (task.completed || !task.deadline) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(task.deadline);
    deadline.setHours(0, 0, 0, 0);
    return deadline < today;
  })();

  const handleAddProgress = (content: string) => {
    if (content.trim() || pendingProgressImages.length > 0) {
      addProgress(task.id, content, pendingProgressImages.length > 0 ? pendingProgressImages : undefined);
      setExpanded(true);
    }
    setShowProgressEditor(false);
    setPendingProgressImages([]);
    setUploadingImages(false);
  };

  const handleUploadFiles = useCallback(
    async (files: File[]) => {
      if (isLocalMode) {
        const imageFiles = files.filter((file) => file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg|heic|heif)$/i.test(file.name));
        setUploadingImages(true);
        try {
          const urls = await Promise.all(imageFiles.map((file) => new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = reject;
            reader.readAsDataURL(file);
          })));
          setPendingProgressImages((previous) => [...previous, ...urls]);
        } finally {
          setUploadingImages(false);
        }
        return;
      }
      const state = useTaskStore.getState();
      let wsId = state.currentWorkspaceId;

      // 兜底：若 store 中无工作区 ID，尝试实时拉取
      if (!wsId) {
        try {
          const workspaces = await workspacesApi.list();
          if (workspaces.length > 0) {
            wsId = workspaces[0].id;
            state.setCurrentWorkspaceId(wsId);
            state.setCurrentWorkspacePlan(workspaces[0].plan);
          }
        } catch {
          // ignore
        }
      }

      // Pro 功能检查：图片上传仅限 Pro 套餐用户
      const plan = state.currentWorkspacePlan;
      if (!isSignedIn || plan !== 'pro') {
        if (!isSignedIn) {
          alert('请先登录后再使用图片上传功能');
        } else {
          alert('图片上传是 Pro 功能，请升级套餐以使用');
        }
        return;
      }

      const imageFiles = Array.from(files).filter((f) => {
        const isImage = f.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg|heic|heif)$/i.test(f.name);
        console.log('handleUploadFiles filter:', f.name, 'type:', f.type, '| isImage:', isImage);
        return isImage;
      });
      if (imageFiles.length === 0) { console.log('handleUploadFiles: no image files found'); return; }

      setUploadingImages(true);
      const urls: string[] = [];

      if (!wsId) {
        // 访客模式：转为 base64 直接嵌入进展记录
        for (const file of imageFiles) {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          console.log('handleUploadFiles base64 done, length:', dataUrl.length);
          urls.push(dataUrl);
        }
      } else {
        // 登录模式：上传到后端
        for (const file of imageFiles) {
          try {
            const res = await filesApi.upload(wsId, file);
            urls.push(res.url);
          } catch (err: any) {
            if (err instanceof ApiError && err.code === 'FEATURE_LOCKED') {
              alert('进展记录贴图是 Pro 功能，请升级套餐以使用');
            } else {
              const msg = err?.message || '上传失败';
              alert(`图片上传失败: ${msg}`);
            }
          }
        }
      }

      console.log('handleUploadFiles setting pendingProgressImages, urls count:', urls.length);
      setPendingProgressImages((prev) => [...prev, ...urls]);
      setUploadingImages(false);
    },
    [isSignedIn],
  );

  const handleRemoveImage = (idx: number) => {
    setPendingProgressImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleEditProgress = (index: number, content: string) => {
    if (content.trim()) {
      updateProgress(task.id, index, content);
    }
    setShowProgressEditor(false);
    setEditingProgressIndex(null);
  };

  const handleTitleBlur = () => {
    const newTitle = titleRef.current?.textContent?.trim();
    if (newTitle && newTitle !== task.title) {
      updateTaskTitle(task.id, newTitle);
    }
    setIsEditingTitle(false);
  };

  const titleParts = useMemo(() =>
    getHighlightedTextParts(task.title, searchTerm),
    [task.title, searchTerm]
  );

  const handleToggleComplete = () => {
    if (!task.completed && effectsEnabled) {
      triggerFireworks();
    }
    toggleComplete(task.id);
  };

  const handleProgressInputFocus = () => {
    setShowProgressEditor(true);
  };

  return (
    <>
      <li
        ref={itemRef}
        id={`task-${task.id}`}
        className={`task-item ${task.completed ? 'completed' : ''} ${task.stuck ? 'stuck' : ''} priority-${priorityClass} ${task.progress.length === 0 ? 'no-progress' : ''} ${onClickDetail ? 'clickable-detail' : ''}`}
        onClick={(e) => {
          if (!onClickDetail) return;
          const target = e.target as HTMLElement;
          if (
            target.closest('button') ||
            target.closest('input') ||
            target.closest('select') ||
            target.closest('[contenteditable]') ||
            target.closest('a') ||
            target.closest('.deadline-container') ||
            target.closest('.createdat-container') ||
            target.closest('.progress-section')
          ) {
            return;
          }
          onClickDetail();
        }}
      >
        <button
          className={`task-pin-btn ${task.pinned ? 'pinned' : ''}`}
          onClick={() => togglePin(task.id)}
          title={task.pinned ? '取消置顶' : '置顶任务'}
        >
          <Pin size={14} fill={task.pinned ? 'currentColor' : 'none'} />
        </button>
        <div className="task-header">
          <div className="task-title-section">
            <input
              type="checkbox"
              className="task-checkbox"
              checked={task.completed}
              onChange={handleToggleComplete}
            />
            <div className="priority-selector-inline">
              <div
                className={`priority-dot high ${priorityClass === 'high' ? 'active' : ''}`}
                onClick={() => setPriority(task.id, 'high')}
                title="高优先级"
              />
              <div
                className={`priority-dot medium ${priorityClass === 'medium' ? 'active' : ''}`}
                onClick={() => setPriority(task.id, 'medium')}
                title="中优先级"
              />
              <div
                className={`priority-dot low ${priorityClass === 'low' ? 'active' : ''}`}
                onClick={() => setPriority(task.id, 'low')}
                title="低优先级"
              />
            </div>
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
              className="task-title"
            >
              {titleParts.map((part, i) =>
                part.highlight ? (
                  <span key={i} className="highlight">
                    {part.text}
                  </span>
                ) : (
                  <span key={i}>{part.text}</span>
                )
              )}
            </span>
          </div>

          <div className="task-meta-section">
            <span className={`priority-badge ${priorityClass}`}>{priorityLabel}</span>
            <div className="createdat-container" ref={startDateRef}>
              <span
                className="task-time"
                onClick={() => {
                  const val = (task.startDate || task.createdAt).slice(0, 10);
                  setEditStartDate(val);
                  setShowStartDatePicker(!showStartDatePicker);
                  setShowDeadlinePicker(false);
                }}
              >
                <CalendarDays size={13} /> {formatShortTime(task.startDate || task.createdAt)}
              </span>
              <div className={`createdat-input-wrapper ${showStartDatePicker ? 'active' : ''}`}>
                <input
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  onBlur={() => {
                    const currentVal = (task.startDate || '').slice(0, 10);
                    if (editStartDate && editStartDate !== currentVal) {
                      updateStartDate(task.id, editStartDate);
                    }
                    setShowStartDatePicker(false);
                  }}
                  autoFocus
                />
              </div>
            </div>
            <div className="deadline-container" ref={deadlineRef}>
              {task.deadline ? (
                <span
                  className={`deadline-display-value ${isOverdue ? 'overdue' : ''}`}
                  onClick={() => {
                    setShowDeadlinePicker(!showDeadlinePicker);
                    setShowStartDatePicker(false);
                  }}
                >
                  <Flag size={13} fill="currentColor" /> {formatDate(task.deadline)}
                </span>
              ) : (
                <span
                  className="deadline-flag"
                  onClick={() => {
                    setShowDeadlinePicker(!showDeadlinePicker);
                    setShowStartDatePicker(false);
                  }}
                >
                  <Flag size={14} />
                </span>
              )}
              <TaskShareMenu task={task} triggerClassName="task-share-btn" />
              <button
                className="task-stuck-btn"
                onClick={() => toggleStuck(task.id)}
                title={task.stuck ? '取消僵持' : '标记为僵持'}
              >
                {task.stuck ? <RotateCcw size={14} /> : <Ban size={14} />}
              </button>
              <div
                className={`deadline-input-wrapper ${showDeadlinePicker ? 'active' : ''}`}
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="date"
                  defaultValue={task.deadline || ''}
                  onChange={(e) => {
                    updateDeadline(task.id, e.target.value);
                    setShowDeadlinePicker(false);
                  }}
                  autoFocus
                />
              </div>
            </div>
          </div>

          <div className="task-actions-inline">
            <div className="task-progress-input-group">
              <input
                type="text"
                readOnly
                placeholder="记录进展..."
                onFocus={handleProgressInputFocus}
              />
            </div>
            <button
              className="task-delete-btn"
              onClick={() => {
                if (window.confirm('确定删除该任务吗？')) {
                  deleteTask(task.id);
                }
              }}
              title="删除任务"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div className={`progress-section ${task.progress.length === 0 ? 'empty' : ''}`}>
          {task.progress.length > 0 && (
            <>
              <div className="progress-header" onClick={() => setExpanded(!expanded)}>
                <div className="progress-header-left">
                  <span className={`progress-toggle-btn ${expanded ? '' : 'collapsed'}`}><ChevronDown size={13} /></span>
                  <span className="icon-label"><BarChart3 size={14} />进展记录 ({task.progress.length} 条)</span>
                </div>
                <div className="last-update-time" title={`上次更新时间：${formatTime(lastUpdateTime)}`}>
                  <span className="icon-label"><Clock3 size={13} />{formatRelativeDate(lastUpdateTime)}</span>
                </div>
              </div>
              <div className={`progress-list ${expanded ? '' : 'collapsed'}`}>
                {task.progress.map((p, idx) => (
                  <div key={idx} className="progress-item">
                    <button
                      className="progress-delete-btn"
                      onClick={() => {
                        if (window.confirm('确定删除该条进展记录吗？')) {
                          deleteProgress(task.id, idx);
                        }
                      }}
                      title="删除进展"
                    >
                      <Trash2 size={12} />
                    </button>
                    <div className="progress-time"><span className="icon-label"><CalendarDays size={12} />{formatTime(p.time)}</span></div>
                    <div className="progress-content">
                      <ProgressContent content={p.content} searchTerm={searchTerm} />
                    </div>
                    {p.images && p.images.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {p.images.map((img, imgIdx) => (
                          <button
                            key={imgIdx}
                            onClick={() => {
                              setLightboxImages(p.images || []);
                              setLightboxIndex(imgIdx);
                            }}
                            className="overflow-hidden rounded-lg border border-border hover:border-primary transition-colors"
                          >
                            <img
                              src={img}
                              alt=""
                              className="h-16 w-16 object-cover"
                              loading="lazy"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          className="task-goto-btn"
          onClick={(e) => {
            e.stopPropagation();
            const { setHighlightTaskId, setCurrentView } = useTaskStore.getState();
            setHighlightTaskId(task.id);
            setCurrentView('notes');
          }}
          title="跳转到笔记视图"
          style={{ left: 2 }}
        >
          <NotebookText size={14} />
        </button>
        <button
          className="task-goto-btn"
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
      </li>

      <MarkdownEditor
        isOpen={showProgressEditor}
        initialValue=""
        title="记录新进展"
        placeholder="在此输入进展内容..."
        onConfirm={handleAddProgress}
        onCancel={() => {
          setShowProgressEditor(false);
          setPendingProgressImages([]);
          setUploadingImages(false);
        }}
        onPasteImage={handleUploadFiles}
        extra={
          <ProgressImageUploader
            images={pendingProgressImages}
            uploading={uploadingImages}
            onSelectFiles={handleUploadFiles}
            onRemove={handleRemoveImage}
            imageUploadBlocked={imageUploadBlocked}
          />
        }
      />

      <MarkdownEditor
        isOpen={editingProgressIndex !== null}
        initialValue={editingProgressContent}
        title="编辑进展"
        placeholder="在此输入进展内容..."
        onConfirm={(val) => {
          if (editingProgressIndex !== null) {
            handleEditProgress(editingProgressIndex, val);
          }
        }}
        onCancel={() => {
          setEditingProgressIndex(null);
          setEditingProgressContent('');
        }}
      />

      {lightboxImages && (
        <ImageLightbox
          images={lightboxImages}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxImages(null)}
        />
      )}
    </>
  );
}
