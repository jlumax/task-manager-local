import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import {
  Task,
  Project,
  ProgressItem,
  FilterType,
  ViewType,
  GanttMode,
  GanttFilter,
  ThemeType,
  FontFamily,
  CustomThemePalette,
} from '@/types';
import {
  getAllTasks,
  getTasksByWorkspace,
  saveTask,
  deleteTask as deleteTaskFromDB,
  bulkPutTasks,
  clearAllTasks,
  enqueuePendingSyncChange,
  getPendingSyncChanges,
  getPendingSyncCount,
  markPendingSyncFailed,
  removePendingSyncChanges,
  getSetting,
  setSetting,
  generateTaskCode,
  getProjectsByWorkspace,
  saveProject,
  deleteProject as deleteProjectFromDB,
} from '@/db';
import { sortTasks } from '@/lib/utils';
import { syncApi, tasksApi, billingApi, workspacesApi } from '@/lib/api';
import type { CloudTask, PlanInfo } from '@/lib/api';
import { celebrationTexts as defaultCelebrationTexts } from '@/components/effects/ThemeEffects';
import { isLocalMode, LOCAL_PLAN_LIMITS, LOCAL_WORKSPACE_ID } from '@/lib/app-mode';
import { createRefinedCustomPalette, isCustomThemePalette } from '@/lib/custom-theme';

interface TaskStore {
  tasks: Task[];
  currentFilter: FilterType;
  dateFilter: string | null;
  searchTerm: string;
  currentView: ViewType;
  completedTasksCollapsed: boolean;
  stuckTasksCollapsed: boolean;
  ganttMode: GanttMode;
  ganttOffset: number;
  ganttFilter: GanttFilter;
  theme: ThemeType;
  customThemeImage: string;
  customThemePalette: CustomThemePalette | null;
  fontFamily: FontFamily;
  effectsEnabled: boolean;
  appTitle: string;
  appSubtitle: string;
  celebrationTexts: string[];
  userNickname: string;
  userAvatar: string;
  isHydrated: boolean;
  highlightTaskId: string | null;
  expandedTaskId: string | null;
  isOnline: boolean;
  lastSyncAt: string | null;
  currentWorkspaceId: string | null;
  currentWorkspacePlan: string | null;
  currentPlanLimits: PlanInfo['limits'] | null;
  currentProjectId: string | null;
  projects: Project[];
  syncPending: boolean;
  syncStatus: 'idle' | 'loading' | 'syncing' | 'synced' | 'offline' | 'error';
  syncError: string | null;
  pendingSyncCount: number;

  // Actions
  loadTasks: () => Promise<void>;
  setHighlightTaskId: (id: string | null) => void;
  setExpandedTaskId: (id: string | null) => void;
  addTask: (title: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  addProgress: (taskId: string, content: string, images?: string[]) => Promise<void>;
  deleteProgress: (taskId: string, progressIndex: number) => Promise<void>;
  updateProgress: (taskId: string, progressIndex: number, content: string) => Promise<void>;
  updateDeadline: (taskId: string, value: string | null) => Promise<void>;
  updateCreatedAt: (taskId: string, value: string) => Promise<void>;
  updateStartDate: (taskId: string, value: string | null) => Promise<void>;
  setPriority: (taskId: string, priority: Task['priority']) => Promise<void>;
  updateTaskTitle: (taskId: string, title: string) => Promise<void>;
  setFilter: (filter: FilterType) => void;
  setDateFilter: (filter: string | null) => void;
  setSearchTerm: (term: string) => void;
  setCurrentView: (view: ViewType) => void;
  toggleCompletedTasks: () => void;
  toggleStuckTasks: () => void;
  toggleStuck: (taskId: string) => Promise<void>;
  togglePin: (taskId: string) => Promise<void>;
  moveTask: (taskId: string, targetWorkspaceId: string, targetProjectId?: string) => Promise<void>;
  setGanttMode: (mode: GanttMode) => void;
  changeGanttRange: (delta: number) => void;
  setGanttFilter: (filter: GanttFilter) => void;
  setTheme: (theme: ThemeType) => void;
  setCustomTheme: (image: string, palette: CustomThemePalette) => Promise<void>;
  clearCustomTheme: () => Promise<void>;
  setFontFamily: (fontFamily: FontFamily) => void;
  toggleEffects: () => void;
  setAppTitle: (title: string) => Promise<void>;
  setAppSubtitle: (subtitle: string) => Promise<void>;
  loadCelebrationTexts: () => Promise<void>;
  setCelebrationTexts: (texts: string[]) => Promise<void>;
  resetCelebrationTexts: () => Promise<void>;
  loadUserProfile: () => Promise<void>;
  setUserNickname: (nickname: string) => Promise<void>;
  setUserAvatar: (avatar: string) => Promise<void>;
  resetUserProfile: () => Promise<void>;
  exportToMarkdown: () => string;
  importFromMarkdown: (markdown: string, mode: 'overwrite' | 'merge') => Promise<void>;
  migrateFromLocalStorage: () => Promise<void>;
  setOnline: (online: boolean) => void;
  createWorkspace: (name: string) => Promise<void>;
  updateWorkspace: (id: string, data: { name?: string }) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  setCurrentWorkspaceId: (id: string | null) => void;
  setCurrentWorkspacePlan: (plan: string | null) => void;
  setCurrentProjectId: (id: string | null) => void;
  loadPlanLimits: () => Promise<void>;
  loadProjects: () => Promise<void>;
  addProject: (name: string, color?: string) => Promise<void>;
  updateProject: (id: string, data: { name?: string; color?: string }) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  syncFromCloud: () => Promise<void>;
  loadWorkspaceTasks: (workspaceId: string) => Promise<void>;
  retryPendingSync: () => Promise<void>;
  _pushChange: (action: 'create' | 'update' | 'delete', id: string, data?: Task) => Promise<void>;

  // Computed
  getFilteredTasks: () => Task[];
  getStats: () => {
    total: number;
    completed: number;
    stuck: number;
    active: number;
    high: number;
    overdue: number;
  };
}

function cloudTaskToLocalTask(task: CloudTask, workspaceId: string): Task {
  return {
    id: task.id,
    code: task.code || generateTaskCode(task.createdAt),
    title: task.title,
    completed: task.completed,
    stuck: task.stuck ?? false,
    stuckAt: task.stuckAt ?? null,
    pinned: task.pinned ?? false,
    pinnedAt: task.pinnedAt ?? null,
    createdAt: task.createdAt,
    completedAt: task.completedAt,
    startDate: task.startDate ?? null,
    progress: task.progress || [],
    deadline: task.deadline,
    priority: task.priority,
    projectId: task.projectId ?? null,
    workspaceId: task.workspaceId ?? workspaceId,
  };
}

function migrateLegacyTasks(data: unknown[]): Task[] {
  return data.map((item: unknown) => {
    const t = item as Record<string, unknown>;
    const createdAt = String(t.createdAt || new Date().toISOString());
    return {
      id: String(t.id || nanoid()),
      code: String(t.code || generateTaskCode(createdAt)),
      title: String(t.title || ''),
      completed: Boolean(t.completed),
      stuck: Boolean(t.stuck ?? false),
      stuckAt: t.stuckAt ? String(t.stuckAt) : null,
      pinned: Boolean(t.pinned ?? false),
      pinnedAt: t.pinnedAt ? String(t.pinnedAt) : null,
      createdAt,
      completedAt: t.completedAt ? String(t.completedAt) : null,
      startDate: t.startDate ? String(t.startDate) : null,
      progress: Array.isArray(t.progress)
        ? t.progress.map((p: unknown) => {
            const pr = p as Record<string, unknown>;
            return {
              content: String(pr.content || ''),
              time: String(pr.time || new Date().toISOString()),
              images: Array.isArray(pr.images) ? pr.images.map(String) : undefined,
            };
          })
        : [],
      deadline: t.deadline ? String(t.deadline) : null,
      priority: (t.priority as Task['priority']) || 'medium',
      projectId: t.projectId ? String(t.projectId) : null,
    };
  });
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: [],
      currentFilter: 'all',
      dateFilter: null,
      searchTerm: '',
      currentView: 'list',
      completedTasksCollapsed: false,
      stuckTasksCollapsed: false,
      ganttMode: 'week',
      ganttOffset: 0,
      ganttFilter: 'all',
      theme: 'default',
      customThemeImage: '',
      customThemePalette: null,
      fontFamily: 'noto-sans',
      effectsEnabled: true,
      appTitle: '任务进度管理器',
      appSubtitle: '高效管理您的每日任务，记录每一步进展',
      celebrationTexts: defaultCelebrationTexts,
      userNickname: '',
      userAvatar: '',
      isHydrated: false,
      highlightTaskId: null,
      expandedTaskId: null,
      isOnline: true,
      lastSyncAt: null,
      currentWorkspaceId: null,
      currentWorkspacePlan: null,
      currentProjectId: null,
      currentPlanLimits: null,
      projects: [],
      syncPending: false,
      syncStatus: 'idle',
      syncError: null,
      pendingSyncCount: 0,

      loadTasks: async () => {
        if (isLocalMode) {
          const [allTasks, customThemeImage, customThemePaletteRaw] = await Promise.all([
            getAllTasks(),
            getSetting('customThemeImage'),
            getSetting('customThemePalette'),
          ]);
          let customThemePalette: CustomThemePalette | null = null;
          if (customThemePaletteRaw) {
            try {
              const parsedPalette = JSON.parse(customThemePaletteRaw) as unknown;
              if (isCustomThemePalette(parsedPalette)) {
                customThemePalette = createRefinedCustomPalette(parsedPalette.dominant);
                await setSetting('customThemePalette', JSON.stringify(customThemePalette));
              }
            } catch {
              customThemePalette = null;
            }
          }
          const localTasks = allTasks.map((task) => ({
            ...task,
            workspaceId: LOCAL_WORKSPACE_ID,
          }));
          if (localTasks.some((task, index) => task.workspaceId !== allTasks[index]?.workspaceId)) {
            await bulkPutTasks(localTasks);
          }
          set({
            tasks: localTasks,
            currentWorkspaceId: LOCAL_WORKSPACE_ID,
            currentWorkspacePlan: 'local',
            currentPlanLimits: LOCAL_PLAN_LIMITS,
            syncStatus: 'synced',
            customThemeImage: customThemeImage || '',
            customThemePalette,
          });
          return;
        }
        const { currentWorkspaceId } = get();
        if (currentWorkspaceId) {
          // 有工作区时只加载当前工作区任务 + 保留其他工作区任务在内存
          const wsTasks = await getTasksByWorkspace(currentWorkspaceId);
          const allTasks = await getAllTasks();
          const otherTasks = allTasks.filter((t) => t.workspaceId && t.workspaceId !== currentWorkspaceId);
          set({ tasks: [...otherTasks, ...wsTasks] });
        } else {
          // 无工作区时加载全部（首次登录，等 WorkspaceSelector 初始化后会覆盖）
          const tasks = await getAllTasks();
          set({ tasks });
        }
      },

      setHighlightTaskId: (id) => set({ highlightTaskId: id }),
      setExpandedTaskId: (id) => set({ expandedTaskId: id }),

      setOnline: (online) => set({ isOnline: online, syncStatus: online ? 'idle' : 'offline' }),
      setCurrentWorkspaceId: (id) => set({ currentWorkspaceId: id, currentProjectId: null, projects: [] }),
      setCurrentProjectId: (id) => set({ currentProjectId: id }),
      setCurrentWorkspacePlan: (plan: string | null) => {
        if (isLocalMode) {
          set({ currentWorkspacePlan: 'local', currentPlanLimits: LOCAL_PLAN_LIMITS });
          return;
        }
        set({ currentWorkspacePlan: plan });
        if (plan) {
          billingApi
            .getPlans()
            .then((plans) => {
              const match = plans.find((p) => p.name.toLowerCase() === plan.toLowerCase() || p.id === plan);
              if (match) set({ currentPlanLimits: match.limits });
            })
            .catch(() => {});
        }
      },

      createWorkspace: async (name) => {
        const { setCurrentWorkspaceId, setCurrentWorkspacePlan } = get();
        const ws = await workspacesApi.create(name);
        setCurrentWorkspaceId(ws.id);
        setCurrentWorkspacePlan(ws.plan);
        await get().loadWorkspaceTasks(ws.id);
      },

      updateWorkspace: async (id, data) => {
        await workspacesApi.update(id, data);
      },

      deleteWorkspace: async (id) => {
        const { currentWorkspaceId, setCurrentWorkspaceId, setCurrentWorkspacePlan } = get();
        // Don't delete the last workspace
        const userWorkspaces = await workspacesApi.list();
        if (userWorkspaces.length <= 1) return;
        await workspacesApi.delete(id);
        if (currentWorkspaceId === id) {
          const next = userWorkspaces.find((w) => w.id !== id);
          if (next) {
            setCurrentWorkspaceId(next.id);
            setCurrentWorkspacePlan(next.plan);
            await get().loadWorkspaceTasks(next.id);
          }
        }
      },

      loadPlanLimits: async () => {
        if (isLocalMode) {
          set({ currentWorkspacePlan: 'local', currentPlanLimits: LOCAL_PLAN_LIMITS });
          return;
        }
        const { currentWorkspacePlan } = get();
        if (!currentWorkspacePlan) return;
        try {
          const plans = await billingApi.getPlans();
          const match = plans.find(
            (p) =>
              p.name.toLowerCase() === currentWorkspacePlan.toLowerCase() ||
              p.id === currentWorkspacePlan,
          );
          if (match) set({ currentPlanLimits: match.limits });
        } catch {}
      },

      loadProjects: async () => {
        const { currentWorkspaceId } = get();
        if (!currentWorkspaceId) return;
        if (isLocalMode) {
          let projects = await getProjectsByWorkspace(LOCAL_WORKSPACE_ID);
          if (projects.length === 0) {
            const project: Project = {
              id: nanoid(),
              name: '默认项目',
              color: 'green',
              order: 0,
              archived: false,
              workspaceId: LOCAL_WORKSPACE_ID,
              createdAt: new Date().toISOString(),
            };
            await saveProject(project);
            projects = [project];
          }
          set({ projects });
          return;
        }
        try {
          const { projectApi } = await import('@/lib/api');
          const projects = await projectApi.list(currentWorkspaceId);
          set({ projects });
        } catch {}
      },

      addProject: async (name, color = 'blue') => {
        const { currentWorkspaceId } = get();
        if (!currentWorkspaceId) return;
        if (isLocalMode) {
          const project: Project = {
            id: nanoid(),
            name: name.trim(),
            color: color as Project['color'],
            order: get().projects.length,
            archived: false,
            workspaceId: LOCAL_WORKSPACE_ID,
            createdAt: new Date().toISOString(),
          };
          await saveProject(project);
          set((state) => ({ projects: [...state.projects, project] }));
          return;
        }
        try {
          const { projectApi } = await import('@/lib/api');
          const project = await projectApi.create(currentWorkspaceId, { name, color });
          set((state) => ({ projects: [...state.projects, project] }));
        } catch (err: any) {
          alert(err?.message || '创建项目失败');
        }
      },

      updateProject: async (id, data) => {
        const { currentWorkspaceId, projects } = get();
        if (!currentWorkspaceId) return;
        if (isLocalMode) {
          const current = projects.find((project) => project.id === id);
          if (!current) return;
          const updated = { ...current, ...data } as Project;
          await saveProject(updated);
          set({ projects: projects.map((project) => project.id === id ? updated : project) });
          return;
        }
        try {
          const { projectApi } = await import('@/lib/api');
          const updated = await projectApi.update(currentWorkspaceId, id, data);
          set({ projects: projects.map((p) => (p.id === id ? updated : p)) });
        } catch (err: any) {
          alert(err?.message || '更新项目失败');
        }
      },

      deleteProject: async (id) => {
        const { currentWorkspaceId, projects, currentProjectId } = get();
        if (!currentWorkspaceId) return;
        if (isLocalMode) {
          const project = projects.find((item) => item.id === id);
          const projectTasks = get().tasks.filter((task) => task.projectId === id);
          const taskWarning = projectTasks.length > 0
            ? `\n\n该项目下的 ${projectTasks.length} 个任务及其全部进展记录也将被永久删除。`
            : '';
          if (!window.confirm(`确定删除项目“${project?.name || '未命名项目'}”吗？${taskWarning}\n\n此操作无法撤销。`)) return;
          await deleteProjectFromDB(id);
          const tasks = get().tasks.filter((task) => task.projectId !== id);
          set({
            tasks,
            projects: projects.filter((project) => project.id !== id),
            ...(currentProjectId === id ? { currentProjectId: null } : {}),
          });
          return;
        }
        if (!window.confirm('确定删除该项目吗？所属任务将变为未分类。')) return;
        try {
          const { projectApi } = await import('@/lib/api');
          await projectApi.delete(currentWorkspaceId, id);
          set({
            projects: projects.filter((p) => p.id !== id),
            ...(currentProjectId === id ? { currentProjectId: null } : {}),
          });
          // Also clear projectId from local tasks
          const tasks = get().tasks.map((t) => (t.projectId === id ? { ...t, projectId: null } : t));
          set({ tasks });
          for (const t of tasks) {
            if (t.projectId === null) {
              await saveTask(t);
            }
          }
        } catch (err: any) {
          alert(err?.message || '删除项目失败');
        }
      },

      reorderProjects: async (orderedIds: string[]) => {
        const { currentWorkspaceId, projects } = get();
        if (!currentWorkspaceId) return;
        const reordered = orderedIds
          .map((id: string, idx: number) => {
            const p = projects.find((x) => x.id === id);
            return p ? { ...p, order: idx } : null;
          })
          .filter(Boolean) as typeof projects;
        set({ projects: reordered });
        const { projectApi } = await import('@/lib/api');
        for (let i = 0; i < orderedIds.length; i++) {
          await projectApi.update(currentWorkspaceId, orderedIds[i], { order: i });
        }
      },

      syncFromCloud: async () => {
        if (isLocalMode) {
          set({ syncStatus: 'synced', syncPending: false, pendingSyncCount: 0, syncError: null });
          return;
        }
        const { currentWorkspaceId, lastSyncAt, tasks, syncPending } = get();
        if (!currentWorkspaceId || syncPending) return;
        if (!get().isOnline) {
          const pendingCount = await getPendingSyncCount(currentWorkspaceId);
          set({ syncStatus: 'offline', pendingSyncCount: pendingCount });
          return;
        }
        set({ syncPending: true, syncStatus: 'syncing', syncError: null });
        try {
          await get().retryPendingSync();

          // Refresh projects from server
          try {
            const { projectApi } = await import('@/lib/api');
            const projects = await projectApi.list(currentWorkspaceId);
            set({ projects });
          } catch (err) {
            console.warn('[sync] project refresh failed', err);
          }

          // 从 per-workspace lastSyncAt 获取时间（lastSyncAt 格式: "workspaceId:timestamp"）
          let wsLastSyncAt: string | undefined;
          if (lastSyncAt) {
            const prefix = `${currentWorkspaceId}:`;
            if (lastSyncAt.startsWith(prefix)) {
              wsLastSyncAt = lastSyncAt.slice(prefix.length);
            }
          }

          // 1. Pull server changes
          const result = await syncApi.pull(currentWorkspaceId, wsLastSyncAt);
          const serverTasks = result.tasks || [];
          const deletedIds = result.deletedIds || [];
          const pendingChanges = await getPendingSyncChanges(currentWorkspaceId);
          const pendingTaskIds = new Set(
            pendingChanges
              .filter((change) => change.action !== 'delete')
              .map((change) => change.taskId),
          );

          const serverIds = new Set(serverTasks.map((t) => t.id));

          if (serverTasks.length > 0 || deletedIds.length > 0) {
            // 只拿当前工作区的本地任务来合并，避免影响其他工作区
            const wsTasks = tasks.filter((t) => t.workspaceId === currentWorkspaceId);
            const otherTasks = tasks.filter((t) => t.workspaceId !== currentWorkspaceId);
            const taskMap = new Map(wsTasks.map((t) => [t.id, t]));
            const syncThreshold = wsLastSyncAt ? new Date(wsLastSyncAt) : new Date(0);
            for (const st of serverTasks) {
              if (pendingTaskIds.has(st.id)) continue;
              const local = taskMap.get(st.id);
              if (!local || new Date(st.updatedAt) > syncThreshold) {
                taskMap.set(st.id, cloudTaskToLocalTask(st, currentWorkspaceId));
              }
            }
            for (const id of deletedIds) {
              taskMap.delete(id);
            }
            // 合并：当前工作区任务 + 其他工作区任务
            const merged = [...otherTasks, ...Array.from(taskMap.values())];
            await bulkPutTasks(merged);
            set({ tasks: merged });
          }

          // 2. 首次全量同步时才补推本地独有任务；增量结果不是云端全量 ID 集合。
          if (!wsLastSyncAt) {
            const currentTasks = get().tasks.filter((t) => t.workspaceId === currentWorkspaceId);
            for (const localTask of currentTasks) {
              if (!serverIds.has(localTask.id)) {
                await get()._pushChange('create', localTask.id, localTask);
              }
            }
          }

          const pendingCount = await getPendingSyncCount(currentWorkspaceId);
          set({
            lastSyncAt: `${currentWorkspaceId}:${result.serverTs}`,
            syncStatus: pendingCount > 0 ? 'error' : 'synced',
            pendingSyncCount: pendingCount,
            syncError: pendingCount > 0 ? '仍有本地变更等待同步' : null,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : '同步失败';
          const pendingCount = await getPendingSyncCount(currentWorkspaceId);
          set({ syncStatus: 'error', syncError: message, pendingSyncCount: pendingCount });
        } finally {
          set({ syncPending: false });
        }
      },

      loadWorkspaceTasks: async (workspaceId) => {
        if (isLocalMode) {
          await get().loadTasks();
          await get().loadProjects();
          return;
        }
        set({ currentWorkspaceId: workspaceId, syncPending: true, syncStatus: 'loading', syncError: null });

        // 1. 先显示当前工作区的本地缓存任务，避免空屏等待
        const localTasks = await getTasksByWorkspace(workspaceId);
        // 同时加载其他工作区的任务（保留用于内存中，不显示）
        const allLocalTasks = await getAllTasks();
        const otherWsTasks = allLocalTasks.filter((t) => t.workspaceId && t.workspaceId !== workspaceId);
        // 迁移旧数据：没有 workspaceId 的任务归属到当前工作区
        const legacyTasks = allLocalTasks.filter((t) => !t.workspaceId);
        if (legacyTasks.length > 0) {
          const patched = legacyTasks.map((t) => ({ ...t, workspaceId }));
          await bulkPutTasks(patched);
          set({ tasks: [...otherWsTasks, ...localTasks, ...patched] });
        } else {
          set({ tasks: [...otherWsTasks, ...localTasks] });
        }
        set({ pendingSyncCount: await getPendingSyncCount(workspaceId) });

        try {
          if (get().isOnline) {
            await get().retryPendingSync();
          }

          // load projects for this workspace
          try {
            const { projectApi } = await import('@/lib/api');
            let projects = await projectApi.list(workspaceId);
            // 无项目时自动创建默认项目（兼容旧工作区）
            if (projects.length === 0) {
              const defaultProject = await projectApi.create(workspaceId, { name: '默认项目', color: 'blue' });
              projects = [defaultProject];
            }
            set({ projects });
            // 仅当之前选中的项目不在当前工作区时，才 fallback 到第一个项目
            const { currentProjectId } = get();
            if (currentProjectId && !projects.find((p) => p.id === currentProjectId)) {
              set({ currentProjectId: projects[0]?.id ?? null });
            }
          } catch (err) {
            console.warn('[sync] project load failed', err);
          }

          // 2. 拉取云端增量并合并（只处理当前工作区）
          const { lastSyncAt } = get();
          const prefix = `${workspaceId}:`;
          const wsLastSyncAt = lastSyncAt?.startsWith(prefix)
            ? lastSyncAt.slice(prefix.length)
            : undefined;
          const result = await syncApi.pull(workspaceId, wsLastSyncAt);
          const cloudTasks = result.tasks || [];
          const freshWsLocalTasks = await getTasksByWorkspace(workspaceId);
          const cloudIds = new Set(cloudTasks.map((t) => t.id));
          const pendingChanges = await getPendingSyncChanges(workspaceId);
          const pendingTaskIds = new Set(
            pendingChanges
              .filter((change) => change.action !== 'delete')
              .map((change) => change.taskId),
          );

          const taskMap = new Map<string, (typeof freshWsLocalTasks)[0]>();
          for (const local of freshWsLocalTasks) {
            taskMap.set(local.id, local.workspaceId ? local : { ...local, workspaceId });
          }
          for (const ct of cloudTasks) {
            if (!pendingTaskIds.has(ct.id)) {
              taskMap.set(ct.id, cloudTaskToLocalTask(ct, workspaceId));
            }
          }
          for (const id of result.deletedIds || []) {
            taskMap.delete(id);
          }

          // 首次全量同步时才补推本地独有任务；增量同步无法用返回 ID 判断云端是否存在。
          if (!wsLastSyncAt) {
            for (const local of freshWsLocalTasks) {
              if (!cloudIds.has(local.id)) {
                const patched = local.workspaceId
                  ? local
                  : { ...local, workspaceId };
                get()._pushChange('create', local.id, patched).catch(() => {});
              }
            }
          }

          const mergedWsTasks = Array.from(taskMap.values());
          // 合并：当前工作区（云端合并后）+ 其他工作区（本地原样保留）
          const allMerged = [...otherWsTasks, ...mergedWsTasks];

          await bulkPutTasks(allMerged);
          const pendingCount = await getPendingSyncCount(workspaceId);
          set({
            tasks: allMerged,
            lastSyncAt: `${workspaceId}:${result.serverTs}`,
            syncStatus: pendingCount > 0 ? 'error' : 'synced',
            pendingSyncCount: pendingCount,
            syncError: pendingCount > 0 ? '仍有本地变更等待同步' : null,
          });
        } catch (err) {
          // fall back to local tasks (already displayed above)
          const fallbackTasks = await getTasksByWorkspace(workspaceId);
          const pendingCount = await getPendingSyncCount(workspaceId);
          set({
            tasks: [...otherWsTasks, ...fallbackTasks],
            syncStatus: 'error',
            syncError: err instanceof Error ? err.message : '云端同步失败，已显示本地缓存',
            pendingSyncCount: pendingCount,
          });
        } finally {
          set({ syncPending: false });
        }
      },

      retryPendingSync: async () => {
        if (isLocalMode) {
          set({ syncStatus: 'synced', pendingSyncCount: 0, syncError: null });
          return;
        }
        const { currentWorkspaceId, isOnline } = get();
        if (!currentWorkspaceId) return;

        const pending = await getPendingSyncChanges(currentWorkspaceId);
        set({ pendingSyncCount: pending.length });
        if (!isOnline || pending.length === 0) {
          if (!isOnline) set({ syncStatus: 'offline' });
          return;
        }

        try {
          const result = await syncApi.push(
            currentWorkspaceId,
            pending.map((change) => ({
              id: change.taskId,
              action: change.action,
              data: change.data,
              clientTs: change.clientTs,
            })),
          );
          const successTaskIds = new Set(
            (result.results || []).filter((item) => item.success).map((item) => item.id),
          );
          const failed = (result.results || []).filter((item) => !item.success);
          const successQueueIds = pending
            .filter((change) => successTaskIds.has(change.taskId))
            .map((change) => change.id);
          await removePendingSyncChanges(successQueueIds);
          if (failed.length > 0) {
            const failedTaskIds = new Set(failed.map((item) => item.id));
            const failedQueueIds = pending
              .filter((change) => failedTaskIds.has(change.taskId))
              .map((change) => change.id);
            await markPendingSyncFailed(
              failedQueueIds,
              failed[0]?.error || '服务器拒绝了部分同步变更',
            );
          }
          const pendingCount = await getPendingSyncCount(currentWorkspaceId);
          set({
            lastSyncAt: `${currentWorkspaceId}:${result.serverTs}`,
            pendingSyncCount: pendingCount,
            syncStatus: pendingCount > 0 ? 'error' : 'synced',
            syncError: pendingCount > 0 ? '仍有本地变更等待同步' : null,
          });
        } catch (err) {
          const pendingIds = pending.map((change) => change.id);
          await markPendingSyncFailed(
            pendingIds,
            err instanceof Error ? err.message : '同步失败',
          );
          set({
            pendingSyncCount: await getPendingSyncCount(currentWorkspaceId),
            syncStatus: 'error',
            syncError: err instanceof Error ? err.message : '同步失败',
          });
        }
      },

      _pushChange: async (action: 'create' | 'update' | 'delete', id: string, data?: Task) => {
        if (isLocalMode) return;
        const { currentWorkspaceId, isOnline } = get();
        if (!currentWorkspaceId) return;
        await enqueuePendingSyncChange(currentWorkspaceId, action, id, data);
        set({ pendingSyncCount: await getPendingSyncCount(currentWorkspaceId) });
        if (!isOnline) {
          set({ syncStatus: 'offline' });
          return;
        }
        await get().retryPendingSync();
      },

      migrateFromLocalStorage: async () => {
        if (typeof window === 'undefined') return;
        const raw = localStorage.getItem('tasks');
        const title = localStorage.getItem('appTitle');
        const subtitle = localStorage.getItem('appSubtitle');

        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const migrated = migrateLegacyTasks(parsed);
              if (isLocalMode) {
                migrated.forEach((task) => { task.workspaceId = LOCAL_WORKSPACE_ID; });
              }
              await bulkPutTasks(migrated);
              set({ tasks: migrated });
              // Push migrated tasks to cloud so AI can read them
              for (const task of migrated) {
                await get()._pushChange('create', task.id, task);
              }
              localStorage.removeItem('tasks');
            }
          } catch {
            // ignore
          }
        }

        if (title) {
          await setSetting('appTitle', title);
          set({ appTitle: title });
          localStorage.removeItem('appTitle');
        }
        if (subtitle) {
          await setSetting('appSubtitle', subtitle);
          set({ appSubtitle: subtitle });
          localStorage.removeItem('appSubtitle');
        }
      },

      addTask: async (title) => {
        const createdAt = new Date().toISOString();
        const { currentProjectId, projects, currentWorkspaceId } = get();
        // 始终归属到一个项目：优先当前选中，其次第一个项目（默认项目）
        const effectiveProjectId = currentProjectId || projects[0]?.id || null;
        const task: Task = {
          id: String(Date.now()) + String(Math.floor(Math.random() * 10000)).padStart(4, '0'),
          code: generateTaskCode(createdAt),
          title: title.trim(),
          completed: false,
          stuck: false,
          stuckAt: null,
          pinned: false,
          pinnedAt: null,
          createdAt,
          completedAt: null,
          startDate: createdAt,
          progress: [],
          deadline: null,
          priority: 'medium',
          projectId: effectiveProjectId,
          workspaceId: currentWorkspaceId || undefined,
        };
        // UI 立即更新，持久化后台执行
        set((state) => ({ tasks: [task, ...state.tasks] }));
        await saveTask(task);
        await get()._pushChange('create', task.id, task);
      },

      deleteTask: async (id) => {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
        }));
        await deleteTaskFromDB(id);
        await get()._pushChange('delete', id);
      },

      toggleComplete: async (id) => {
        const task = get().tasks.find((t) => t.id === id);
        if (!task) return;
        const updated: Task = {
          ...task,
          completed: !task.completed,
          completedAt: !task.completed ? new Date().toISOString() : null,
        };
        // 如果任务被标记为完成，自动取消僵持状态
        if (updated.completed && updated.stuck) {
          updated.stuck = false;
          updated.stuckAt = null;
        }
        // UI 立即更新，持久化后台执行
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? updated : t)),
        }));
        await saveTask(updated);
        await get()._pushChange('update', id, updated);
      },

      addProgress: async (taskId, content, images) => {
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task) return;
        const progressItem: ProgressItem = {
          content: content.trim(),
          time: new Date().toISOString(),
          ...(images && images.length > 0 ? { images } : {}),
        };
        const updated: Task = {
          ...task,
          progress: [progressItem, ...task.progress],
        };
        // UI 立即更新，持久化后台执行
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === taskId ? updated : t)),
        }));
        await saveTask(updated);
        await get()._pushChange('update', taskId, updated);
      },

      deleteProgress: async (taskId, progressIndex) => {
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task) return;
        const updatedProgress = [...task.progress];
        updatedProgress.splice(progressIndex, 1);
        const updated: Task = { ...task, progress: updatedProgress };
        // UI 立即更新，持久化后台执行
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === taskId ? updated : t)),
        }));
        await saveTask(updated);
        await get()._pushChange('update', taskId, updated);
      },

      updateProgress: async (taskId, progressIndex, content) => {
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task) return;
        const updatedProgress = [...task.progress];
        updatedProgress[progressIndex] = {
          ...updatedProgress[progressIndex],
          content: content.trim(),
        };
        const updated: Task = { ...task, progress: updatedProgress };
        // UI 立即更新，持久化后台执行
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === taskId ? updated : t)),
        }));
        await saveTask(updated);
        await get()._pushChange('update', taskId, updated);
      },

      updateDeadline: async (taskId, value) => {
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task) return;
        const updated: Task = { ...task, deadline: value || null };
        // UI 立即更新，持久化后台执行
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === taskId ? updated : t)),
        }));
        await saveTask(updated);
        await get()._pushChange('update', taskId, updated);
      },

      updateCreatedAt: async (taskId, value) => {
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task || !value) return;
        const updated: Task = {
          ...task,
          createdAt: new Date(value).toISOString(),
        };
        // UI 立即更新，持久化后台执行
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === taskId ? updated : t)),
        }));
        await saveTask(updated);
        await get()._pushChange('update', taskId, updated);
      },

      updateStartDate: async (taskId, value) => {
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task) return;
        const updated: Task = {
          ...task,
          startDate: value || null,
        };
        // UI 立即更新，持久化后台执行
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === taskId ? updated : t)),
        }));
        await saveTask(updated);
        await get()._pushChange('update', taskId, updated);
      },

      setPriority: async (taskId, priority) => {
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task) return;
        const updated: Task = { ...task, priority };
        // UI 立即更新，持久化后台执行
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === taskId ? updated : t)),
        }));
        await saveTask(updated);
        await get()._pushChange('update', taskId, updated);
      },

      updateTaskTitle: async (taskId, title) => {
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task) return;
        const updated: Task = { ...task, title: title.trim() };
        // UI 立即更新，持久化后台执行
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === taskId ? updated : t)),
        }));
        await saveTask(updated);
        await get()._pushChange('update', taskId, updated);
      },

      setFilter: (filter) => set({ currentFilter: filter }),
      setDateFilter: (filter) => set({ dateFilter: filter }),
      setSearchTerm: (term) => set({ searchTerm: term }),
      setCurrentView: (view) => set({ currentView: view }),
      toggleCompletedTasks: () =>
        set((state) => ({
          completedTasksCollapsed: !state.completedTasksCollapsed,
        })),
      toggleStuckTasks: () =>
        set((state) => ({
          stuckTasksCollapsed: !state.stuckTasksCollapsed,
        })),
      toggleStuck: async (taskId) => {
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task) return;
        const updated: Task = {
          ...task,
          stuck: !task.stuck,
          stuckAt: !task.stuck ? new Date().toISOString() : null,
        };
        // 标记为僵持中时，同步取消已完成状态，避免状态冲突
        if (updated.stuck) {
          updated.completed = false;
          updated.completedAt = null;
        }
        // UI 立即更新，持久化后台执行
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === taskId ? updated : t)),
        }));
        await saveTask(updated);
        await get()._pushChange('update', taskId, updated);
      },
      togglePin: async (taskId) => {
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task) return;
        const updated: Task = {
          ...task,
          pinned: !task.pinned,
          pinnedAt: !task.pinned ? new Date().toISOString() : null,
        };
        // UI 立即更新，持久化后台执行
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === taskId ? updated : t)),
        }));
        await saveTask(updated);
        await get()._pushChange('update', taskId, updated);
      },
      moveTask: async (taskId, targetWorkspaceId, targetProjectId) => {
        const { currentWorkspaceId, tasks } = get();
        if (!currentWorkspaceId) return;
        if (isLocalMode) {
          const task = tasks.find((item) => item.id === taskId);
          if (!task) return;
          const updated = { ...task, projectId: targetProjectId || null };
          await saveTask(updated);
          set({ tasks: tasks.map((item) => item.id === taskId ? updated : item) });
          return;
        }
        try {
          await tasksApi.move(currentWorkspaceId, taskId, targetWorkspaceId, targetProjectId);
          if (targetWorkspaceId !== currentWorkspaceId) {
            // 跨工作区移动：从当前列表移除
            set({ tasks: tasks.filter((t) => t.id !== taskId) });
          } else {
            // 同工作区移动：仅更新 projectId
            set({
              tasks: tasks.map((t) =>
                t.id === taskId ? { ...t, projectId: targetProjectId || null } : t
              ),
            });
          }
        } catch (err: any) {
          throw new Error(err.message || '移动失败');
        }
      },
      setGanttMode: (mode) => set({ ganttMode: mode }),
      changeGanttRange: (delta) =>
        set((state) => ({ ganttOffset: state.ganttOffset + delta })),
      setGanttFilter: (filter) => set({ ganttFilter: filter }),

      setTheme: (theme) => {
        set({ theme });
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', theme);
        }
      },

      setCustomTheme: async (image, palette) => {
        await Promise.all([
          setSetting('customThemeImage', image),
          setSetting('customThemePalette', JSON.stringify(palette)),
        ]);
        set({ customThemeImage: image, customThemePalette: palette, theme: 'custom' });
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', 'custom');
        }
      },

      clearCustomTheme: async () => {
        await Promise.all([
          setSetting('customThemeImage', ''),
          setSetting('customThemePalette', ''),
        ]);
        const nextTheme = get().theme === 'custom' ? 'starry' : get().theme;
        set({ customThemeImage: '', customThemePalette: null, theme: nextTheme });
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', nextTheme);
        }
      },

      setFontFamily: (fontFamily) => {
        set({ fontFamily });
      },

      toggleEffects: () =>
        set((state) => ({ effectsEnabled: !state.effectsEnabled })),

      setAppTitle: async (title) => {
        await setSetting('appTitle', title);
        set({ appTitle: title });
        if (typeof document !== 'undefined') {
          document.title = title.replace(/📋\s*/, '') + ' - 任务管理';
        }
      },

      setAppSubtitle: async (subtitle) => {
        await setSetting('appSubtitle', subtitle);
        set({ appSubtitle: subtitle });
      },

      loadCelebrationTexts: async () => {
        const raw = await getSetting('celebrationTexts');
        if (raw) {
          try {
            const texts = JSON.parse(raw);
            if (Array.isArray(texts) && texts.length > 0) {
              set({ celebrationTexts: texts });
            }
          } catch { /* use defaults */ }
        }
      },

      setCelebrationTexts: async (texts) => {
        await setSetting('celebrationTexts', JSON.stringify(texts));
        set({ celebrationTexts: texts });
      },

      resetCelebrationTexts: async () => {
        await setSetting('celebrationTexts', JSON.stringify(defaultCelebrationTexts));
        set({ celebrationTexts: defaultCelebrationTexts });
      },

      loadUserProfile: async () => {
        const raw = await getSetting('userProfile');
        if (raw) {
          try {
            const profile = JSON.parse(raw);
            set({
              userNickname: profile.nickname || '',
              userAvatar: profile.avatar || '',
            });
          } catch { /* use defaults */ }
        }
      },

      setUserNickname: async (nickname) => {
        const { userAvatar } = get();
        set({ userNickname: nickname });
        await setSetting('userProfile', JSON.stringify({ nickname, avatar: userAvatar }));
      },

      setUserAvatar: async (avatar) => {
        const { userNickname } = get();
        set({ userAvatar: avatar });
        await setSetting('userProfile', JSON.stringify({ nickname: userNickname, avatar }));
      },

      resetUserProfile: async () => {
        set({ userNickname: '', userAvatar: '' });
        await setSetting('userProfile', '{}');
      },

      exportToMarkdown: () => {
        const state = get();
        const { tasks } = state;

        // Metadata header
        const config = {
          appTitle: state.appTitle,
          appSubtitle: state.appSubtitle,
          userNickname: state.userNickname,
          userAvatar: state.userAvatar,
          effectsEnabled: state.effectsEnabled,
          fontFamily: state.fontFamily,
        };
        let markdown = `<!-- task-manager-config\n${JSON.stringify(config)}\n-->\n\n`;
        markdown += `# ${state.appTitle}\n\n${state.appSubtitle}\n\n`;
        markdown += `---\n\n`;
        markdown += `## 任务列表（共 ${tasks.length} 项）\n\n`;

        tasks.forEach((task) => {
          const status = task.completed ? '[x]' : '[ ]';
          const project = state.projects.find((p) => p.id === task.projectId);
          markdown += `### ${status} ${task.title}\n\n`;
          markdown += `- **ID**: ${task.id}\n`;
          markdown += `- **编码**: ${task.code}\n`;
          markdown += `- **优先级**: ${task.priority}\n`;
          markdown += `- **创建时间**: ${task.createdAt}\n`;
          if (task.startDate) {
            markdown += `- **开始时间**: ${task.startDate}\n`;
          }
          markdown += `- **状态**: ${task.completed ? '已完成' : task.stuck ? '僵持中' : '进行中'}\n`;
          markdown += `- **置顶**: ${task.pinned ? '是' : '否'}\n`;
          if (task.workspaceId) {
            markdown += `- **工作区ID**: ${task.workspaceId}\n`;
          }
          if (project) {
            markdown += `- **项目**: ${project.name}\n`;
          }
          if (task.projectId) {
            markdown += `- **项目ID**: ${task.projectId}\n`;
          }
          if (task.deadline) {
            markdown += `- **截止日期**: ${task.deadline}\n`;
          }
          if (task.completedAt) {
            markdown += `- **完成时间**: ${task.completedAt}\n`;
          }
          if (task.progress.length > 0) {
            markdown += `\n**进展记录**：\n`;
            task.progress.forEach((p) => {
              markdown += `- [${p.time}]\n`;
              markdown += `\`\`\`\n${p.content}\n\`\`\`\n`;
            });
            markdown += `\n`;
          }
          markdown += `\n`;
        });

        return markdown;
      },

      importFromMarkdown: async (markdown, mode) => {
        const lines = markdown.split('\n');
        const importedTasks: Task[] = [];
        let currentTask: Task | null = null;
        let inProgressSection = false;
        let currentSection: 'active' | 'stuck' | 'completed' | null = null;
        let importedConfig: Record<string, unknown> | null = null;

        const normalizeDate = (s: string) => {
          if (/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) {
            return new Date(s.replace(' ', 'T') + ':00').toISOString();
          }
          const d = new Date(s);
          if (!isNaN(d.getTime())) return d.toISOString();
          return s;
        };

        for (let i = 0; i < lines.length; i++) {
          const trimmed = lines[i].trim();

          // Parse config metadata comment
          if (trimmed.startsWith('<!-- task-manager-config')) {
            try {
              const jsonStr = trimmed.replace('<!-- task-manager-config', '').replace('-->', '').trim();
              // Support multi-line: join with next line if needed
              let cfgStr = jsonStr;
              if (!cfgStr.endsWith('}') && i + 1 < lines.length) {
                cfgStr += lines[i + 1].trim();
                i++;
              }
              importedConfig = JSON.parse(cfgStr);
            } catch { /* ignore malformed config */ }
            continue;
          }
          // Skip the --> closing line if config was multi-line
          if (trimmed === '-->' && importedConfig) continue;

          // H2: section header (not a task)
          if (trimmed.startsWith('## ') && !trimmed.startsWith('### ')) {
            if (currentTask) { importedTasks.push(currentTask); currentTask = null; }
            inProgressSection = false;
            if (trimmed.includes('进行中')) currentSection = 'active';
            else if (trimmed.includes('僵持')) currentSection = 'stuck';
            else if (trimmed.includes('已完成') || trimmed.includes('✅')) currentSection = 'completed';
            else currentSection = null;
            continue;
          }

          // H3: task header
          if (trimmed.startsWith('### ')) {
            if (currentTask) importedTasks.push(currentTask);
            inProgressSection = false;

            const checkboxMatch = trimmed.match(/^###\s+\[([x\s])\]\s+(.+)$/);
            const numberedMatch = trimmed.match(/^###\s+\d+\.\s+(.+)$/);

            let title: string;
            let completed: boolean;

            if (checkboxMatch) {
              title = checkboxMatch[2].trim();
              completed = checkboxMatch[1] === 'x';
            } else if (numberedMatch) {
              title = numberedMatch[1].trim();
              completed = currentSection === 'completed';
            } else {
              title = trimmed.replace(/^###\s+/, '').trim();
              completed = currentSection === 'completed';
            }

            currentTask = {
              id: String(Date.now()) + String(Math.floor(Math.random() * 10000)).padStart(4, '0'),
              code: '',
              title,
              completed,
              stuck: currentSection === 'stuck',
              stuckAt: currentSection === 'stuck' ? new Date().toISOString() : null,
              pinned: false,
              pinnedAt: null,
              createdAt: new Date().toISOString(),
              completedAt: null,
              startDate: null,
              progress: [],
              deadline: null,
              priority: 'medium',
              projectId: null,
            };
            continue;
          }

          if (trimmed.startsWith('- **')) {
            if (!currentTask) continue;
            if (trimmed.startsWith('- **ID**:')) {
              const idMatch = trimmed.match(/ID\*\*:\s*(\d+)/);
              if (idMatch) currentTask.id = idMatch[1];
            } else if (trimmed.startsWith('- **编码**:')) {
              const codeMatch = trimmed.match(/编码\*\*:\s*(.+)/);
              if (codeMatch) currentTask.code = codeMatch[1];
            } else if (trimmed.startsWith('- **优先级**:')) {
              const priorityMatch = trimmed.match(/优先级\*\*:\s*(\w+)/);
              if (priorityMatch) currentTask.priority = priorityMatch[1] as Task['priority'];
            } else if (trimmed.startsWith('- **创建时间**:')) {
              const timeMatch = trimmed.match(/创建时间\*\*:\s*(.+)/);
              if (timeMatch) currentTask.createdAt = normalizeDate(timeMatch[1]);
            } else if (trimmed.startsWith('- **开始时间**:')) {
              const timeMatch = trimmed.match(/开始时间\*\*:\s*(.+)/);
              if (timeMatch) currentTask.startDate = normalizeDate(timeMatch[1]);
            } else if (trimmed.startsWith('- **截止日期**:')) {
              const deadlineMatch = trimmed.match(/截止日期\*\*:\s*(.+)/);
              if (deadlineMatch) currentTask.deadline = deadlineMatch[1];
            } else if (trimmed.startsWith('- **完成时间**:')) {
              const completedMatch = trimmed.match(/完成时间\*\*:\s*(.+)/);
              if (completedMatch) {
                currentTask.completedAt = normalizeDate(completedMatch[1]);
                currentTask.completed = true;
              }
            } else if (trimmed.startsWith('- **状态**:')) {
              if (trimmed.includes('已完成') || trimmed.includes('✅')) {
                currentTask.completed = true;
              } else if (trimmed.includes('僵持')) {
                currentTask.stuck = true;
              }
            } else if (trimmed.startsWith('- **置顶**:')) {
              currentTask.pinned = trimmed.includes('是');
              if (currentTask.pinned) {
                currentTask.pinnedAt = new Date().toISOString();
              }
            } else if (trimmed.startsWith('- **项目**:')) {
              const pm = trimmed.match(/项目\*\*:\s*(.+)/);
              if (pm) (currentTask as any)._importProjectName = pm[1].trim();
            } else if (trimmed.startsWith('- **项目ID**:')) {
              const pm = trimmed.match(/项目ID\*\*:\s*(.+)/);
              if (pm) (currentTask as any)._importProjectId = pm[1].trim();
            } else if (trimmed.startsWith('- **工作区ID**:')) {
              const wm = trimmed.match(/工作区ID\*\*:\s*(.+)/);
              if (wm) currentTask.workspaceId = wm[1].trim();
            }
            continue;
          }

          // Detect progress section start
          if (trimmed === '**进展记录**：' || trimmed === '**进展记录**:') {
            inProgressSection = true;
            continue;
          }

          // Progress items: - [timestamp] (new format: followed by code fence, old format: inline content)
          if (currentTask && inProgressSection && trimmed.startsWith('- [')) {
            const progressMatch = trimmed.match(/-\s*\[([^\]]+)\]\s*(.*)/);
            if (progressMatch) {
              const time = new Date(progressMatch[1].replace(' ', 'T'));
              if (!isNaN(time.getTime())) {
                const inlineContent = progressMatch[2];
                // New format: content in fenced code block after the timestamp line
                if (!inlineContent && i + 1 < lines.length && lines[i + 1].trim().startsWith('```')) {
                  i += 1; // skip opening ```
                  const contentLines: string[] = [];
                  while (i + 1 < lines.length && !lines[i + 1].trim().startsWith('```')) {
                    i++;
                    contentLines.push(lines[i]);
                  }
                  i++; // skip closing ```
                  currentTask.progress.push({
                    content: contentLines.join('\n'),
                    time: time.toISOString(),
                  });
                } else if (inlineContent) {
                  // Old format: inline content on the same line
                  currentTask.progress.push({
                    content: inlineContent,
                    time: time.toISOString(),
                  });
                }
              }
            }
            continue;
          }
        }

        if (currentTask) importedTasks.push(currentTask);

        if (importedTasks.length === 0) {
          throw new Error('未识别到有效任务，请检查文件格式');
        }

        // 为没有编码的旧格式任务补生成编码
        for (const t of importedTasks) {
          if (!t.code) {
            t.code = generateTaskCode(t.createdAt);
          }
        }

        // 解析导入的项目名称，匹配/创建当前工作区下的项目
        const { currentWorkspaceId: importWsId, projects: existingProjects } = get();
        if (importWsId && !isLocalMode) {
          const { projectApi } = await import('@/lib/api');
          const projectNameMap = new Map(existingProjects.map((p) => [p.name, p.id]));
          for (const t of importedTasks) {
            const importName = (t as any)._importProjectName as string | undefined;
            const importId = (t as any)._importProjectId as string | undefined;
            if (importName && !projectNameMap.has(importName)) {
              // 创建缺失的项目
              try {
                const created = await projectApi.create(importWsId, { name: importName, color: 'blue' });
                projectNameMap.set(created.name, created.id);
              } catch {
                // 创建失败则忽略
              }
            }
            // 优先按名称匹配，其次按ID匹配，否则不指定
            if (importName && projectNameMap.has(importName)) {
              t.projectId = projectNameMap.get(importName)!;
            } else if (importId && existingProjects.find((p) => p.id === importId)) {
              t.projectId = importId;
            }
            delete (t as any)._importProjectName;
            delete (t as any)._importProjectId;
          }
        }

        if (mode === 'overwrite') {
          const existingTasks = get().tasks;
          if (existingTasks.length > 0) {
            await clearAllTasks();
          }
          await bulkPutTasks(importedTasks);
          set({ tasks: importedTasks });
        } else {
          const existingTasks = get().tasks;
          const existingByCode = new Map(existingTasks.map((t) => [t.code, t]));
          const existingByTitle = new Map(existingTasks.map((t) => [t.title, t]));
          const tasksToAdd: Task[] = [];
          const tasksToUpdate: Task[] = [];

          for (const imported of importedTasks) {
            // 优先用编码匹配，其次用标题匹配
            const existing = existingByCode.get(imported.code) || existingByTitle.get(imported.title);
            if (!existing) {
              tasksToAdd.push(imported);
            } else {
              const mergedProgress = [...existing.progress];
              const seen = new Set(mergedProgress.map((p) => `${p.time}|${p.content}`));
              for (const p of imported.progress) {
                const key = `${p.time}|${p.content}`;
                if (!seen.has(key)) {
                  mergedProgress.push(p);
                  seen.add(key);
                }
              }
              mergedProgress.sort(
                (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
              );
              if (mergedProgress.length !== existing.progress.length) {
                const updated = { ...existing, progress: mergedProgress };
                tasksToUpdate.push(updated);
              }
            }
          }

          if (tasksToUpdate.length > 0) {
            await bulkPutTasks(tasksToUpdate);
          }
          if (tasksToAdd.length > 0) {
            await bulkPutTasks(tasksToAdd);
          }

          set((state) => {
            const updatedMap = new Map(tasksToUpdate.map((t) => [t.id, t]));
            return {
              tasks: [
                ...tasksToAdd,
                ...state.tasks.map((t) => updatedMap.get(t.id) || t),
              ],
            };
          });
        }

        const { currentWorkspaceId, isOnline } = get();
        if (currentWorkspaceId && isOnline && !isLocalMode) {
          try {
            await syncApi.push(
              currentWorkspaceId,
              importedTasks.map((t) => ({
                id: t.id,
                action: 'create' as const,
                data: t,
                clientTs: new Date().toISOString(),
              }))
            );
            set({ lastSyncAt: `${currentWorkspaceId}:${new Date().toISOString()}` });
          } catch {
            // ignore
          }
        }

        // Apply imported config metadata
        if (importedConfig) {
          const state = get();
          try {
            if (typeof importedConfig.appTitle === 'string' && importedConfig.appTitle) {
              await state.setAppTitle(importedConfig.appTitle);
            }
            if (typeof importedConfig.appSubtitle === 'string' && importedConfig.appSubtitle) {
              await state.setAppSubtitle(importedConfig.appSubtitle);
            }
            if (typeof importedConfig.userNickname === 'string' && importedConfig.userNickname) {
              await state.setUserNickname(importedConfig.userNickname);
            }
            if (typeof importedConfig.userAvatar === 'string' && importedConfig.userAvatar) {
              await state.setUserAvatar(importedConfig.userAvatar);
            }
            if (typeof importedConfig.effectsEnabled === 'boolean') {
              const currentEffects = state.effectsEnabled;
              if (importedConfig.effectsEnabled !== currentEffects) {
                state.toggleEffects();
              }
            }
            if (typeof importedConfig.fontFamily === 'string') {
              state.setFontFamily(importedConfig.fontFamily as FontFamily);
            }
          } catch {
            // ignore config application errors
          }
        }
      },

      getFilteredTasks: () => {
        const { tasks, currentFilter, searchTerm, dateFilter, currentProjectId, currentWorkspaceId } = get();
        let filtered = [...tasks];

        // 工作区筛选：只显示当前工作区的任务
        // 无 workspaceId 的旧数据只在没有任何工作区标记时显示（会在 loadWorkspaceTasks 中补全）
        if (currentWorkspaceId) {
          filtered = filtered.filter(
            (task) => task.workspaceId === currentWorkspaceId || !task.workspaceId
          );
        }

        // 项目筛选：有选中项目时只显示该项目任务
        if (currentProjectId) {
          filtered = filtered.filter((task) => task.projectId === currentProjectId);
        }

        if (currentFilter !== 'all') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          filtered = filtered.filter((task) => {
            switch (currentFilter) {
              case 'active':
                return !task.completed && !task.stuck;
              case 'completed':
                return task.completed && !task.stuck;
              case 'stuck':
                return task.stuck;
              case 'high':
                return task.priority === 'high' && !task.completed && !task.stuck;
              case 'overdue':
                if (task.completed || task.stuck || !task.deadline) return false;
                const deadline = new Date(task.deadline);
                deadline.setHours(0, 0, 0, 0);
                return deadline < today;
              default:
                return true;
            }
          });
        }

        if (dateFilter) {
          filtered = filtered.filter((task) => {
            const date = new Date(task.startDate || task.createdAt);
            const taskYear = String(date.getFullYear());
            const taskMonth = String(date.getMonth() + 1).padStart(2, '0');
            const taskDay = String(date.getDate()).padStart(2, '0');
            const taskDate = `${taskYear}-${taskMonth}-${taskDay}`;

            if (dateFilter.includes('..')) {
              const [rawStart, rawEnd] = dateFilter.split('..');
              const start = rawStart || rawEnd;
              const end = rawEnd || rawStart;
              if (!start || !end) return true;
              const rangeStart = start <= end ? start : end;
              const rangeEnd = start <= end ? end : start;
              return taskDate >= rangeStart && taskDate <= rangeEnd;
            }

            const parts = dateFilter.split('-');
            const filterYear = parts[0];
            const filterMonth = parts[1];
            const filterDay = parts[2];
            if (filterDay) {
              return taskDate === dateFilter;
            }
            if (filterMonth) {
              return `${taskYear}-${taskMonth}` === `${filterYear}-${filterMonth}`;
            }
            return taskYear === filterYear;
          });
        }

        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          filtered = filtered.filter(
            (task) =>
              task.title.toLowerCase().includes(term) ||
              task.progress.some((p) =>
                p.content.toLowerCase().includes(term)
              )
          );
        }

        return sortTasks(filtered);
      },

      getStats: () => {
        const { tasks, currentProjectId, currentWorkspaceId } = get();
        let scoped = tasks;
        if (currentWorkspaceId) {
          scoped = scoped.filter((t) => t.workspaceId === currentWorkspaceId || !t.workspaceId);
        }
        if (currentProjectId) {
          scoped = scoped.filter((t) => t.projectId === currentProjectId);
        }
        const total = scoped.length;
        const stuck = scoped.filter((t) => t.stuck).length;
        const completed = scoped.filter((t) => t.completed && !t.stuck).length;
        const active = total - stuck - completed;
        const high = scoped.filter(
          (t) => t.priority === 'high' && !t.completed && !t.stuck
        ).length;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const overdue = scoped.filter((t) => {
          if (t.completed || t.stuck || !t.deadline) return false;
          const deadline = new Date(t.deadline);
          deadline.setHours(0, 0, 0, 0);
          return deadline < today;
        }).length;
        return { total, completed, stuck, active, high, overdue };
      },
    }),
    {
      name: 'task-manager-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentFilter: state.currentFilter,
        dateFilter: state.dateFilter,
        currentView: state.currentView,
        currentProjectId: state.currentProjectId,
        completedTasksCollapsed: state.completedTasksCollapsed,
        stuckTasksCollapsed: state.stuckTasksCollapsed,
        ganttMode: state.ganttMode,
        ganttOffset: state.ganttOffset,
        ganttFilter: state.ganttFilter,
        theme: state.theme,
        fontFamily: state.fontFamily,
        effectsEnabled: state.effectsEnabled,
        appTitle: state.appTitle,
        appSubtitle: state.appSubtitle,
        currentWorkspaceId: state.currentWorkspaceId,
        currentWorkspacePlan: state.currentWorkspacePlan,
        lastSyncAt: state.lastSyncAt,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isHydrated = true;
        }
      },
    }
  )
);

// Initialize theme on client
if (typeof document !== 'undefined') {
  const stored = localStorage.getItem('task-manager-storage');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      let theme = parsed.state?.theme;
      // Migrate removed 'spring' theme to starry
      if (theme === 'spring') {
        theme = 'starry';
        parsed.state.theme = 'starry';
        localStorage.setItem('task-manager-storage', JSON.stringify(parsed));
      }
      if (theme) {
        document.documentElement.setAttribute('data-theme', theme);
      }
    } catch {
      // ignore
    }
  }
}
