'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useCloudBaseAuth';
import { useTaskStore } from '@/store/taskStore';
import { workspacesApi, Workspace } from '@/lib/api';
import PlanBadge from '@/components/billing/PlanBadge';
import { ProjectColor } from '@/types';
import { Plus, Check, X, Edit3, Trash2, ChevronDown, Folder, Settings } from 'lucide-react';

const COLOR_MAP: Record<ProjectColor, string> = {
  blue: '#3b82f6',
  green: '#22c55e',
  orange: '#f97316',
  red: '#ef4444',
  purple: '#a855f7',
  cyan: '#06b6d4',
  pink: '#ec4899',
  gray: '#6b7280',
};

const PROJECT_COLORS: { key: ProjectColor; label: string }[] = [
  { key: 'blue', label: '蓝' },
  { key: 'green', label: '绿' },
  { key: 'orange', label: '橙' },
  { key: 'red', label: '红' },
  { key: 'purple', label: '紫' },
  { key: 'cyan', label: '青' },
  { key: 'pink', label: '粉' },
  { key: 'gray', label: '灰' },
];

export default function WorkspaceSelector() {
  const { isSignedIn } = useAuth();
  const {
    currentWorkspaceId,
    loadWorkspaceTasks,
    setCurrentWorkspaceId,
    setCurrentWorkspacePlan,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    // Project state & actions
    projects,
    currentProjectId,
    setCurrentProjectId,
    addProject,
    updateProject,
    deleteProject,
    loadProjects,
    isOnline,
  } = useTaskStore();

  // ---- workspace state ----
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ---- project state ----
  const [manageMode, setManageMode] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectColor, setProjectColor] = useState<ProjectColor>('blue');

  const ref = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await workspacesApi.list();
      setWorkspaces(list);
      setError('');
      return list;
    } catch (e: any) {
      setError(e?.message || '加载工作区失败');
      return [];
    }
  }, []);

  // 检查是否有 JWT（兼容 dev 模式或 auth provider 尚未就绪的场景）
  const hasJwt = typeof window !== 'undefined' && !!localStorage.getItem('task_manager_jwt');

  useEffect(() => {
    if (!isSignedIn && !hasJwt) {
      setWorkspaces([]);
      return;
    }
    let mounted = true;
    setLoading(true);
    refresh().then((list) => {
      if (!mounted) return;
      if (list.length > 0 && !currentWorkspaceId) {
        const personal = list.find((w) => w.plan === 'free') || list[0];
        setCurrentWorkspaceId(personal.id);
        setCurrentWorkspacePlan(personal.plan);
        loadWorkspaceTasks(personal.id);
      }
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [isSignedIn, hasJwt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-load projects when workspace changes
  useEffect(() => {
    if (isOnline && currentWorkspaceId) {
      loadProjects();
    }
  }, [currentWorkspaceId, isOnline]);

  // ---- click outside ----
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCreate(false);
        setEditingId(null);
        setDeletingId(null);
        setManageMode(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ---- workspace handlers ----
  const handleCreateWs = async () => {
    if (!newName.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      await createWorkspace(newName.trim());
      setNewName('');
      setShowCreate(false);
      await refresh();
    } catch (e: any) {
      setError(e?.message || '创建工作区失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleRenameWs = async (id: string) => {
    if (!editName.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      await updateWorkspace(id, { name: editName.trim() });
      setEditingId(null);
      setEditName('');
      await refresh();
    } catch (e: any) {
      setError(e?.message || '重命名失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWs = async (id: string) => {
    if (workspaces.length <= 1 || saving) return;
    setSaving(true);
    setError('');
    try {
      await deleteWorkspace(id);
      setDeletingId(null);
      await refresh();
    } catch (e: any) {
      setError(e?.message || '删除失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchWorkspace = (w: Workspace) => {
    if (w.id !== currentWorkspaceId) {
      setCurrentWorkspaceId(w.id);
      setCurrentWorkspacePlan(w.plan);
      loadWorkspaceTasks(w.id);
    }
  };

  // ---- project handlers ----
  const handleSelectProject = (id: string | null) => {
    setCurrentProjectId(id);
  };

  const openCreateProject = () => {
    setOpen(false);
    setEditingProjectId(null);
    setProjectName('');
    setProjectColor('blue');
    setShowProjectModal(true);
  };

  const openEditProject = (projectId: string) => {
    const p = projects.find((x) => x.id === projectId);
    if (!p) return;
    setOpen(false);
    setEditingProjectId(projectId);
    setProjectName(p.name);
    setProjectColor(p.color as ProjectColor);
    setShowProjectModal(true);
  };

  const handleSaveProject = async () => {
    const name = projectName.trim();
    if (!name) return;
    if (editingProjectId) {
      await updateProject(editingProjectId, { name, color: projectColor });
    } else {
      await addProject(name, projectColor);
    }
    setShowProjectModal(false);
    setProjectName('');
    setEditingProjectId(null);
  };

  const handleDeleteProject = async (id: string) => {
    await deleteProject(id);
  };

  // ---- visibility ----
  const isEmpty = !loading && workspaces.length === 0;
  useEffect(() => {
    if (isEmpty && !showCreate) setShowCreate(true);
  }, [isEmpty]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isSignedIn && !hasJwt) return null;

  const currentWs = workspaces.find((w) => w.id === currentWorkspaceId);
  const currentProject = projects.find((p) => p.id === currentProjectId);

  return (
    <div data-theme="btn-wrapper" ref={ref}>
      <button
        onClick={() => { setOpen(!open); setManageMode(false); setError(''); }}
        data-theme="btn"
        title={currentWs?.name || '选择工作区'}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span
            style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: currentProject ? COLOR_MAP[currentProject.color as ProjectColor] : '#9ca3af',
              flexShrink: 0,
            }}
          />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentWs?.name || (isEmpty ? '创建工作区' : '选择')}
          </span>
        </span>
      </button>

      {open && (
        <div
          data-theme="dropdown"
          className="show"
          style={{ minWidth: '220px', maxWidth: '280px', right: 0, left: 'auto', padding: 0 }}
        >
          {/* ======== 工作区 section ======== */}
          <div style={{ padding: '4px' }}>
            <div style={{ padding: '4px 10px 2px', fontSize: '0.68rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              工作区
            </div>
            {workspaces.map((w) => (
              <div key={w.id}>
                {editingId === w.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px' }}>
                    <input
                      id={`rename-workspace-${w.id}`}
                      name="workspace-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameWs(w.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      style={{
                        flex: 1,
                        fontSize: '0.82rem',
                        background: 'var(--accent)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        padding: '2px 8px',
                        outline: 'none',
                        color: 'var(--foreground)',
                      }}
                      autoFocus
                    />
                    <button onClick={() => handleRenameWs(w.id)} style={{ padding: '2px', color: '#22c55e', background: 'none', border: 'none', cursor: 'pointer' }}><Check size={14} /></button>
                    <button onClick={() => setEditingId(null)} style={{ padding: '2px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}><X size={14} /></button>
                  </div>
                ) : (
                  <div
                    onClick={() => { handleSwitchWorkspace(w); setOpen(false); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '5px 10px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: w.id === currentWorkspaceId ? 600 : 400,
                      background: w.id === currentWorkspaceId ? 'var(--accent)' : 'transparent',
                      color: 'var(--foreground)',
                    }}
                    onMouseEnter={(e) => { if (w.id !== currentWorkspaceId) e.currentTarget.style.background = 'var(--accent)'; }}
                    onMouseLeave={(e) => { if (w.id !== currentWorkspaceId) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</span>
                      {w.role === 'owner' && <span style={{ fontSize: '0.6rem', color: 'var(--muted)', background: 'var(--accent)', padding: '0 4px', borderRadius: '3px', flexShrink: 0 }}>创建者</span>}
                      <PlanBadge plan={w.plan} />
                    </div>
                    {w.id === currentWorkspaceId && <Check size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />}
                  </div>
                )}

                {deletingId === w.id && (
                  <div style={{ padding: '2px 10px 4px', fontSize: '0.72rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    确定删除「{w.name}」？
                    <button onClick={() => handleDeleteWs(w.id)} style={{ color: '#ef4444', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem' }}>删除</button>
                    <button onClick={() => setDeletingId(null)} style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem' }}>取消</button>
                  </div>
                )}
              </div>
            ))}

            {/* 新建工作区 */}
            {showCreate && (
              <div style={{ padding: '6px 10px', borderTop: '1px solid var(--border)', marginTop: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    id="new-workspace-name"
                    name="new-workspace-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreateWs(); }}
                    placeholder="新工作区名称"
                    style={{
                      flex: 1,
                      fontSize: '0.82rem',
                      background: 'var(--accent)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      outline: 'none',
                      color: 'var(--foreground)',
                    }}
                    autoFocus
                  />
                  <button
                    onClick={handleCreateWs}
                    disabled={!newName.trim() || saving}
                    style={{
                      padding: '2px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      background: 'var(--primary)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      opacity: !newName.trim() || saving ? 0.5 : 1,
                    }}
                  >
                    创建
                  </button>
                </div>
              </div>
            )}

            {/* 工作区底部操作 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px' }}>
              {!showCreate ? (
                <button
                  onClick={() => setShowCreate(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 6px', fontSize: '0.72rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                >
                  <Plus size={14} /> 新建工作区
                </button>
              ) : (
                <button
                  onClick={() => { setShowCreate(false); setNewName(''); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 6px', fontSize: '0.72rem', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  取消
                </button>
              )}
              {currentWs && currentWs.role === 'owner' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <button
                    onClick={() => { setEditingId(currentWs.id); setEditName(currentWs.name); }}
                    style={{ padding: '4px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                    title="重命名"
                  >
                    <Edit3 size={13} />
                  </button>
                  {workspaces.length > 1 && (
                    <button
                      onClick={() => setDeletingId(currentWs.id)}
                      style={{ padding: '4px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                      title="删除"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ======== 项目 section ======== */}
          <div style={{ borderTop: '1px solid var(--border)', padding: '4px' }}>
            <div style={{ padding: '4px 10px 2px', fontSize: '0.68rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              项目筛选
            </div>

            {/* 全部项目 */}
            <div
              onClick={() => handleSelectProject(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 10px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.82rem',
                fontWeight: currentProjectId === null ? 600 : 400,
                background: currentProjectId === null ? 'var(--accent)' : 'transparent',
                color: 'var(--foreground)',
              }}
              onMouseEnter={(e) => { if (currentProjectId !== null) e.currentTarget.style.background = 'var(--accent)'; }}
              onMouseLeave={(e) => { if (currentProjectId !== null) e.currentTarget.style.background = 'transparent'; }}
            >
              <Folder size={14} />
              全部项目
              {currentProjectId === null && (
                <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--primary)' }}>✓</span>
              )}
            </div>

            {/* 项目列表 */}
            {projects.length === 0 ? (
              <div style={{ padding: '8px 10px', fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'center' }}>
                暂无项目
              </div>
            ) : (
              <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                {projects.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => manageMode ? undefined : handleSelectProject(p.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      cursor: manageMode ? 'default' : 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: currentProjectId === p.id ? 600 : 400,
                      background: currentProjectId === p.id ? 'var(--accent)' : 'transparent',
                      color: 'var(--foreground)',
                    }}
                    onMouseEnter={(e) => { if (currentProjectId !== p.id && !manageMode) e.currentTarget.style.background = 'var(--accent)'; }}
                    onMouseLeave={(e) => { if (currentProjectId !== p.id && !manageMode) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: COLOR_MAP[p.color as ProjectColor] || '#9ca3af',
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                    </span>
                    {manageMode ? (
                      <span style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditProject(p.id); }}
                          style={{
                            fontSize: '0.7rem',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            border: '1px solid var(--border)',
                            background: 'transparent',
                            cursor: 'pointer',
                            color: 'var(--foreground)',
                          }}
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteProject(p.id); }}
                          style={{
                            fontSize: '0.7rem',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            border: '1px solid var(--border)',
                            background: 'transparent',
                            cursor: 'pointer',
                            color: '#ef4444',
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </span>
                    ) : (
                      currentProjectId === p.id && (
                        <Check size={13} style={{ color: 'var(--primary)' }} />
                      )
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 项目底部操作 */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '2px 6px' }}>
              <button
                onClick={openCreateProject}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 6px', fontSize: '0.72rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
              >
                <Plus size={14} /> 新建项目
              </button>
              {projects.length > 0 && (
                <button
                  onClick={() => setManageMode(!manageMode)}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 6px', fontSize: '0.72rem', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto' }}
                >
                  <Settings size={13} />{manageMode ? '完成' : '管理'}
                </button>
              )}
            </div>

            {/* 错误提示 */}
            {error && (
              <div style={{ padding: '6px 10px', borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: '#ef4444' }}>
                {error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======== 新建/编辑项目弹窗 ======== */}
      {showProjectModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.4)',
          }}
          onClick={() => setShowProjectModal(false)}
        >
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              borderRadius: '12px',
              padding: '20px',
              width: '320px',
              maxWidth: '90vw',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)' }}>
              {editingProjectId ? '编辑项目' : '新建项目'}
            </h3>

            <input
              id="project-name"
              name="project-name"
              type="text"
              placeholder="项目名称"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--input-bg)',
                color: 'var(--foreground)',
                fontSize: '0.9rem',
                marginBottom: '12px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveProject(); }}
            />

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '6px' }}>颜色</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setProjectColor(c.key)}
                    title={c.label}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: COLOR_MAP[c.key],
                      border: projectColor === c.key ? '2px solid var(--foreground)' : '2px solid transparent',
                      cursor: 'pointer',
                      padding: 0,
                      flexShrink: 0,
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowProjectModal(false)}
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
                onClick={handleSaveProject}
                disabled={!projectName.trim()}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--primary)',
                  color: '#fff',
                  fontSize: '0.85rem',
                  cursor: projectName.trim() ? 'pointer' : 'not-allowed',
                  opacity: projectName.trim() ? 1 : 0.5,
                }}
              >
                {editingProjectId ? '保存' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
