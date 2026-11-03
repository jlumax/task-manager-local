'use client';

import { useState, useRef, useEffect } from 'react';
import { useTaskStore } from '@/store/taskStore';
import { ProjectColor } from '@/types';
import { Check, Folder, Pencil, Plus, Settings, Trash2 } from 'lucide-react';

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

const COLORS: { key: ProjectColor; label: string }[] = [
  { key: 'blue', label: '蓝' },
  { key: 'green', label: '绿' },
  { key: 'orange', label: '橙' },
  { key: 'red', label: '红' },
  { key: 'purple', label: '紫' },
  { key: 'cyan', label: '青' },
  { key: 'pink', label: '粉' },
  { key: 'gray', label: '灰' },
];

export default function ProjectSelector() {
  const {
    projects,
    currentProjectId,
    setCurrentProjectId,
    addProject,
    updateProject,
    deleteProject,
    loadProjects,
    isOnline,
    currentWorkspaceId,
  } = useTaskStore();

  const [open, setOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [manageMode, setManageMode] = useState(false);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectColor, setProjectColor] = useState<ProjectColor>('blue');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-load projects when workspace changes
  useEffect(() => {
    if (isOnline && currentWorkspaceId) {
      loadProjects();
    }
  }, [currentWorkspaceId, isOnline]);

  const currentProject = projects.find((p) => p.id === currentProjectId);

  const handleSelect = (id: string | null) => {
    setCurrentProjectId(id);
    setOpen(false);
  };

  const openCreate = () => {
    setEditingProject(null);
    setProjectName('');
    setProjectColor('blue');
    setManageMode(false);
    setShowModal(true);
    setOpen(false);
  };

  const openEdit = (projectId: string) => {
    const p = projects.find((x) => x.id === projectId);
    if (!p) return;
    setEditingProject(projectId);
    setProjectName(p.name);
    setProjectColor(p.color as ProjectColor);
    setManageMode(false);
    setShowModal(true);
    setOpen(false);
  };

  const handleSave = async () => {
    const name = projectName.trim();
    if (!name) return;
    if (editingProject) {
      await updateProject(editingProject, { name, color: projectColor });
    } else {
      await addProject(name, projectColor);
    }
    setShowModal(false);
    setProjectName('');
    setEditingProject(null);
  };

  const handleDelete = async (id: string) => {
    await deleteProject(id);
  };

  const dropdownBg = 'var(--card, #ffffff)';

  return (
    <>
      <div data-theme="btn-wrapper" ref={ref}>
        <button
          onClick={() => setOpen(!open)}
          data-theme="btn"
          title={currentProject ? currentProject.name : '全部项目'}
        >
          <span
            style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: currentProject ? COLOR_MAP[currentProject.color as ProjectColor] : '#9ca3af',
              marginRight: '6px',
              verticalAlign: 'middle',
            }}
          />
          <span style={{ verticalAlign: 'middle' }}>
            {currentProject ? currentProject.name : <span className="icon-label"><Folder size={14} />全部项目</span>}
          </span>
        </button>

        <div data-theme="dropdown" className={open ? 'show' : ''} style={{ minWidth: '180px' }}>
          {/* 全部项目 */}
          <div
            onClick={() => handleSelect(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 12px',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: currentProjectId === null ? 600 : 400,
              background: currentProjectId === null ? 'var(--accent)' : 'transparent',
              color: 'var(--foreground)',
              borderBottom: '1px solid var(--border)',
            }}
            onMouseEnter={(e) => { if (currentProjectId !== null) e.currentTarget.style.background = 'var(--accent)'; }}
            onMouseLeave={(e) => { if (currentProjectId !== null) e.currentTarget.style.background = 'transparent'; }}
          >
            <Folder size={14} />
            全部项目
            {currentProjectId === null && (
              <Check size={13} style={{ marginLeft: 'auto', color: 'var(--primary)' }} />
            )}
          </div>

          {/* 项目列表 */}
          {projects.length === 0 ? (
            <div style={{ padding: '10px 12px', fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'center' }}>
              暂无项目
            </div>
          ) : (
            <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
              {projects.map((p) => (
                <div
                  key={p.id}
                  onClick={() => manageMode ? undefined : handleSelect(p.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 12px',
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
                        onClick={(e) => { e.stopPropagation(); openEdit(p.id); }}
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
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                        style={{
                          fontSize: '0.7rem',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          border: '1px solid var(--border)',
                          background: 'transparent',
                          cursor: 'pointer',
                          color: 'var(--danger, #ef4444)',
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

          {/* 底部操作 */}
          <div style={{ borderTop: '1px solid var(--border)', padding: '6px 0' }}>
            <div
              onClick={openCreate}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '0.78rem',
                color: 'var(--primary)',
                fontWeight: 500,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Plus size={14} /> 新建项目
            </div>
            {projects.length > 0 && (
              <div
                onClick={() => { setManageMode(!manageMode); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  color: 'var(--muted)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Settings size={14} /> {manageMode ? '完成管理' : '管理项目'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 新建/编辑项目弹窗 */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.4)',
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: dropdownBg,
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '20px',
              width: '320px',
              maxWidth: '90vw',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)' }}>
              {editingProject ? '编辑项目' : '新建项目'}
            </h3>

            <input
              type="text"
              placeholder="项目名称"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              autoFocus
              className="project-name-input"
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--accent)',
                color: 'var(--foreground)',
                fontSize: '0.9rem',
                marginBottom: '12px',
                outline: 'none',
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            />

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '6px' }}>颜色</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {COLORS.map((c) => (
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
                onClick={() => setShowModal(false)}
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
                onClick={handleSave}
                disabled={!projectName.trim()}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--primary)',
                  color: 'var(--primary-foreground, #fff)',
                  fontSize: '0.85rem',
                  cursor: projectName.trim() ? 'pointer' : 'not-allowed',
                  opacity: projectName.trim() ? 1 : 0.5,
                }}
              >
                {editingProject ? '保存' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
