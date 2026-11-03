'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Task } from '@/types';
import { useTaskStore } from '@/store/taskStore';
import { renderMarkdown, highlightText } from '@/lib/markdown';
import MarkdownEditor from '@/components/editor/MarkdownEditor';
import ImageLightbox from '@/components/files/ImageLightbox';
import TaskShareMenu from './TaskShareMenu';
import { triggerFireworks } from '@/lib/fireworks';
import { workspacesApi, projectApi, Workspace } from '@/lib/api';
import { Project } from '@/types';
import { isLocalMode } from '@/lib/app-mode';
import { Check, MoveUpRight, Pencil, Pin, Plus, Trash2, X } from 'lucide-react';

export function TaskDetailModal({
  task,
  searchTerm,
  onClose,
  isAiOpen = false,
  onNavigateTask,
}: {
  task: Task;
  searchTerm: string;
  onClose: () => void;
  isAiOpen?: boolean;
  onNavigateTask: (taskId: string) => void;
}) {
  const { toggleComplete, togglePin, updateTaskTitle, updateProgress, addProgress, deleteProgress, effectsEnabled, moveTask, currentWorkspaceId } = useTaskStore();
  const priorityClass = `priority-${task.priority}`;
  const titleRef = useRef<HTMLSpanElement>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingProgressIndex, setEditingProgressIndex] = useState<number | null>(null);
  const [editingProgressContent, setEditingProgressContent] = useState('');
  const [showProgressEditor, setShowProgressEditor] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [targetProjects, setTargetProjects] = useState<Project[]>([]);
  const [targetWorkspaceId, setTargetWorkspaceId] = useState('');
  const [targetProjectId, setTargetProjectId] = useState('');
  const [moving, setMoving] = useState(false);
  const [moveLoading, setMoveLoading] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [moveSuccess, setMoveSuccess] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ images: string[]; initialIndex: number } | null>(null);

  const handleAddProgress = (content: string) => {
    if (content.trim()) {
      addProgress(task.id, content);
    }
    setShowProgressEditor(false);
  };

  const handleTitleBlur = () => {
    const newTitle = titleRef.current?.textContent?.trim();
    if (newTitle && newTitle !== task.title) {
      updateTaskTitle(task.id, newTitle);
    } else if (!newTitle && titleRef.current) {
      titleRef.current.textContent = task.title;
    }
    setIsEditingTitle(false);
  };

  const openMoveDialog = async () => {
    setShowMoveDialog(true);
    setMoveLoading(true);
    setMoveError(null);
    setMoveSuccess(null);
    try {
      const list = await workspacesApi.list();
      setWorkspaces(list);
      const tw = list.find((w) => w.id === currentWorkspaceId)?.id || list[0]?.id || '';
      setTargetWorkspaceId(tw);
      if (tw) {
        const ps = await projectApi.list(tw);
        setTargetProjects(ps);
      } else {
        setTargetProjects([]);
      }
    } catch (err) {
      setMoveError(err instanceof Error ? err.message : '加载工作区失败');
    } finally {
      setMoveLoading(false);
    }
  };

  const sortedProgress = useMemo(
    () =>
      task.progress
        .map((p, originalIdx) => ({ ...p, originalIdx }))
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()),
    [task.progress]
  );

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !lightbox) onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [lightbox, onClose]);

  return (
    <>
      {createPortal(
        <div
          className="note-modal-overlay"
          style={{ right: isAiOpen ? 420 : 0, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
          onClick={onClose}
        >
          <div
            className={`note-card ${priorityClass}`}
            style={{
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative',
              margin: 0,
              cursor: 'default',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="note-header">
              <button
                className={`note-status-btn ${task.completed ? 'completed' : ''}`}
                onClick={() => {
                  if (!task.completed && effectsEnabled) {
                    triggerFireworks();
                  }
                  toggleComplete(task.id);
                }}
                title={task.completed ? '标记为未完成' : '标记为已完成'}
              >
                {task.completed ? <Check size={14} /> : ''}
              </button>
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
              <button
                className={`note-pin-btn ${task.pinned ? 'pinned' : ''}`}
                onClick={() => togglePin(task.id)}
                title={task.pinned ? '取消置顶' : '置顶任务'}
              >
                <Pin size={14} fill={task.pinned ? 'currentColor' : 'none'} />
              </button>
              {!isLocalMode && <button
                onClick={openMoveDialog}
                title="移动到其他工作区/项目"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  marginLeft: '6px',
                }}
              >
                <MoveUpRight size={15} />
              </button>}
              <TaskShareMenu task={task} triggerClassName="note-share-btn" />
              <button
                onClick={onClose}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  fontSize: '1.4rem',
                  lineHeight: 1,
                  padding: '4px 8px',
                  marginLeft: 'auto',
                }}
                title="关闭"
              >
                <X size={18} />
              </button>
            </div>

            <div className="note-meta" style={{ justifyContent: 'space-between' }}>
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

            {sortedProgress.length > 0 && (
              <div className="note-body">
                <div className="note-progress-list">
                  {sortedProgress.map((item, idx) => {
                    const html = renderMarkdown(item.content);
                    const highlighted = searchTerm
                      ? highlightText(html, searchTerm)
                      : html;

                    return (
                      <div key={idx} className="note-progress-item">
                        <button
                          className="progress-delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!window.confirm('确定删除这条进展记录吗？')) return;
                            deleteProgress(task.id, item.originalIdx);
                          }}
                          title="删除此进展记录"
                        >
                            <Trash2 size={12} />
                        </button>
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
                              return;
                            }
                            setEditingProgressIndex(item.originalIdx);
                            setEditingProgressContent(item.content);
                          }}
                          style={{ cursor: 'pointer' }}
                          title="点击编辑进展"
                        />
                        {item.images && item.images.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {item.images.map((image, imageIndex) => (
                              <button
                                key={imageIndex}
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setLightbox({ images: item.images || [], initialIndex: imageIndex });
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
            )}
            <button
              onClick={() => setShowProgressEditor(true)}
              style={{
                display: 'block',
                width: '100%',
                padding: '10px',
                marginTop: '12px',
                background: 'var(--accent)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--foreground)',
                cursor: 'pointer',
                fontSize: '0.9rem',
                textAlign: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = '0.85'; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = '1'; }}
            >
              <span className="icon-label" style={{ justifyContent: 'center' }}><Plus size={15} />记录新进展</span>
            </button>
          </div>
        </div>,
        document.body
      )}
      {createPortal(
        <MarkdownEditor
          isOpen={editingProgressIndex !== null}
          initialValue={editingProgressContent}
          title="编辑进展"
          placeholder="在此输入进展内容..."
          overlayStyle={{ right: isAiOpen ? 420 : 0 }}
          onConfirm={(val) => {
            if (editingProgressIndex !== null) {
              updateProgress(task.id, editingProgressIndex, val);
            }
            setEditingProgressIndex(null);
            setEditingProgressContent('');
          }}
          onCancel={() => {
            setEditingProgressIndex(null);
            setEditingProgressContent('');
          }}
        />,
        document.body
      )}
      {createPortal(
        <MarkdownEditor
          isOpen={showProgressEditor}
          initialValue=""
          title="记录新进展"
          placeholder="在此输入进展内容..."
          overlayStyle={{ right: isAiOpen ? 420 : 0 }}
          onConfirm={handleAddProgress}
          onCancel={() => setShowProgressEditor(false)}
        />,
        document.body
      )}
      {lightbox && createPortal(
        <ImageLightbox
          images={lightbox.images}
          initialIndex={lightbox.initialIndex}
          onClose={() => setLightbox(null)}
        />,
        document.body
      )}
      {!isLocalMode && showMoveDialog && createPortal(
        <div
	          className="note-modal-overlay"
	          style={{ right: isAiOpen ? 420 : 0, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
	          onClick={() => {
              setShowMoveDialog(false);
              setMoveError(null);
              setMoveSuccess(null);
            }}
        >
          <div
            style={{
              background: 'var(--card)',
              borderRadius: '12px',
              padding: '20px',
              width: '360px',
              maxWidth: '90vw',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)' }}>
              移动任务
            </h3>
            {moveLoading && (
              <p style={{ margin: '0 0 12px', color: 'var(--muted)', fontSize: '0.85rem' }}>
                正在加载工作区和项目...
              </p>
            )}
            {moveError && (
              <p style={{ margin: '0 0 12px', color: '#dc2626', fontSize: '0.85rem' }}>
                {moveError}
              </p>
            )}
            {moveSuccess && (
              <p style={{ margin: '0 0 12px', color: '#16a34a', fontSize: '0.85rem' }}>
                {moveSuccess}
              </p>
            )}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '4px' }}>目标工作区</label>
              <select
                value={targetWorkspaceId}
                onChange={async (e) => {
	                  const wid = e.target.value;
	                  setTargetWorkspaceId(wid);
	                  setTargetProjectId('');
                    setMoveError(null);
                    setMoveLoading(true);
	                  if (wid) {
                      try {
	                      const ps = await projectApi.list(wid);
	                      setTargetProjects(ps);
                      } catch {
                        setTargetProjects([]);
                        setMoveError('项目列表加载失败，可先移动到未指定项目');
                      } finally {
                        setMoveLoading(false);
                      }
                    } else {
                      setTargetProjects([]);
                      setMoveLoading(false);
	                  }
	                }}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--input-bg)',
                  color: 'var(--foreground)',
                  fontSize: '0.9rem',
                }}
              >
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '4px' }}>目标项目</label>
              <select
                value={targetProjectId}
                onChange={(e) => setTargetProjectId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--input-bg)',
                  color: 'var(--foreground)',
                  fontSize: '0.9rem',
                }}
              >
                <option value="">（不指定项目）</option>
                {targetProjects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
	              <button
	                onClick={() => {
                    setShowMoveDialog(false);
                    setMoveError(null);
                    setMoveSuccess(null);
                  }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--foreground)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                取消
              </button>
              <button
                onClick={async () => {
	                  if (!targetWorkspaceId) return;
	                  setMoving(true);
                    setMoveError(null);
	                  try {
	                    await moveTask(task.id, targetWorkspaceId, targetProjectId || undefined);
                      setMoveSuccess('移动成功');
                      window.setTimeout(() => {
	                      setShowMoveDialog(false);
	                      onClose();
                      }, 300);
	                  } catch (err) {
	                    setMoveError(err instanceof Error ? err.message : '移动失败');
	                  } finally {
                    setMoving(false);
                  }
                }}
                disabled={moving || !targetWorkspaceId}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--primary)',
                  color: '#fff',
                  fontSize: '0.85rem',
                  cursor: moving || !targetWorkspaceId ? 'not-allowed' : 'pointer',
                  opacity: moving || !targetWorkspaceId ? 0.5 : 1,
                }}
              >
                {moving ? '移动中...' : '确认移动'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
