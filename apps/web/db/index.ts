import Dexie, { Table } from 'dexie';
import { nanoid } from 'nanoid';
import { Project, Task } from '@/types';
import type { LocalLicense } from '@/types/license';

export type PendingSyncAction = 'create' | 'update' | 'delete';

export interface PendingSyncChange {
  id: string;
  workspaceId: string;
  taskId: string;
  action: PendingSyncAction;
  data?: Task;
  clientTs: string;
  retryCount: number;
  lastError?: string;
  createdAt: string;
}

export function generateTaskCode(createdAt: string): string {
  const d = new Date(createdAt);
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}-${pad(d.getMilliseconds(), 3)}-${random}`;
}

class TaskManagerDB extends Dexie {
  tasks!: Table<Task, string>;
  settings!: Table<{ key: string; value: string }, string>;
  pendingSync!: Table<PendingSyncChange, string>;
  projects!: Table<Project, string>;
  licenses!: Table<LocalLicense, string>;

  constructor() {
    super('TaskManagerDB');
    this.version(1).stores({
      tasks: 'id, title, completed, createdAt, completedAt, deadline, priority',
      settings: 'key',
    });
    this.version(2).stores({
      tasks: 'id, title, completed, createdAt, completedAt, deadline, priority',
      settings: 'key',
    }).upgrade(async (tx) => {
      const tasks = await tx.table('tasks').toArray();
      for (const task of tasks) {
        if (typeof task.id === 'number') {
          const oldId = task.id;
          const newTask = { ...task, id: nanoid() };
          await tx.table('tasks').delete(oldId);
          await tx.table('tasks').add(newTask);
        }
      }
    });

    this.version(3).stores({
      tasks: 'id, title, completed, stuck, pinned, createdAt, completedAt, deadline, priority',
      settings: 'key',
    }).upgrade(async (tx) => {
      const tasks = await tx.table('tasks').toArray();
      for (const task of tasks) {
        if (task.stuck === undefined || task.pinned === undefined) {
          await tx.table('tasks').update(task.id, {
            stuck: false,
            stuckAt: null,
            pinned: false,
            pinnedAt: null,
          });
        }
      }
    });

    this.version(4).stores({
      tasks: 'id, code, title, completed, stuck, pinned, createdAt, completedAt, deadline, priority',
      settings: 'key',
    }).upgrade(async (tx) => {
      const tasks = await tx.table('tasks').toArray();
      for (const task of tasks) {
        if (!task.code) {
          await tx.table('tasks').update(task.id, {
            code: generateTaskCode(task.createdAt),
          });
        }
      }
    });

    this.version(5).stores({
      tasks: 'id, code, title, completed, stuck, pinned, createdAt, completedAt, deadline, priority, projectId',
      settings: 'key',
    }).upgrade(async (tx) => {
      const tasks = await tx.table('tasks').toArray();
      for (const task of tasks) {
        if (task.projectId === undefined) {
          await tx.table('tasks').update(task.id, { projectId: null });
        }
      }
    });

    // Version 6: 添加 workspaceId 索引，支持按工作区查询，解决跨工作区任务乱串问题
    this.version(6).stores({
      tasks: 'id, code, title, completed, stuck, pinned, createdAt, completedAt, deadline, priority, projectId, workspaceId',
      settings: 'key',
    }).upgrade(async (tx) => {
      // 旧数据可能没有 workspaceId，不处理（会在 loadWorkspaceTasks 中补全）
    });

    this.version(7).stores({
      tasks: 'id, code, title, completed, stuck, pinned, createdAt, completedAt, deadline, priority, projectId, workspaceId',
      settings: 'key',
      pendingSync: 'id, workspaceId, taskId, action, clientTs',
    });

    this.version(8).stores({
      tasks: 'id, code, title, completed, stuck, pinned, createdAt, completedAt, deadline, priority, projectId, workspaceId',
      settings: 'key',
      pendingSync: 'id, workspaceId, taskId, action, clientTs',
      projects: 'id, workspaceId, order, archived, name',
    });

    this.version(9).stores({
      tasks: 'id, code, title, completed, stuck, pinned, createdAt, completedAt, deadline, priority, projectId, workspaceId',
      settings: 'key',
      pendingSync: 'id, workspaceId, taskId, action, clientTs',
      projects: 'id, workspaceId, order, archived, name',
      licenses: 'id, status, licenseId, activatedAt',
    });
  }
}

export const db = new TaskManagerDB();

export async function getAllTasks(): Promise<Task[]> {
  return db.tasks.toArray();
}

export async function getTasksByWorkspace(workspaceId: string): Promise<Task[]> {
  return db.tasks.where('workspaceId').equals(workspaceId).toArray();
}

export async function saveTask(task: Task): Promise<void> {
  await db.tasks.put(task);
}

export async function deleteTask(id: string): Promise<void> {
  await db.tasks.delete(id);
}

export async function bulkPutTasks(tasks: Task[]): Promise<void> {
  await db.tasks.bulkPut(tasks);
}

export async function clearAllTasks(): Promise<void> {
  await db.tasks.clear();
}

export async function getAllProjects(): Promise<Project[]> {
  return db.projects.orderBy('order').toArray();
}

export async function getProjectsByWorkspace(workspaceId: string): Promise<Project[]> {
  return db.projects.where('workspaceId').equals(workspaceId).sortBy('order');
}

export async function saveProject(project: Project): Promise<void> {
  await db.projects.put(project);
}

export async function deleteProject(id: string): Promise<void> {
  await db.projects.delete(id);
}

export async function bulkPutProjects(projects: Project[]): Promise<void> {
  await db.projects.bulkPut(projects);
}

export async function getAllSettings(): Promise<Array<{ key: string; value: string }>> {
  return db.settings.toArray();
}

export async function enqueuePendingSyncChange(
  workspaceId: string,
  action: PendingSyncAction,
  taskId: string,
  data?: Task,
): Promise<void> {
  const now = new Date().toISOString();
  const existing = await db.pendingSync
    .where('workspaceId')
    .equals(workspaceId)
    .filter((item) => item.taskId === taskId)
    .toArray();

  const latest = existing.sort((a, b) => a.clientTs.localeCompare(b.clientTs)).at(-1);

  if (latest) {
    if (latest.action === 'create' && action === 'update') {
      await db.pendingSync.update(latest.id, {
        data,
        clientTs: now,
        lastError: undefined,
      });
      return;
    }

    if (latest.action === 'create' && action === 'delete') {
      await db.pendingSync.bulkDelete(existing.map((item) => item.id));
      return;
    }

    if (action === 'update' || action === 'delete') {
      await db.pendingSync.bulkDelete(existing.map((item) => item.id));
    }
  }

  await db.pendingSync.add({
    id: nanoid(),
    workspaceId,
    taskId,
    action,
    data,
    clientTs: now,
    retryCount: 0,
    createdAt: now,
  });
}

export async function getPendingSyncChanges(workspaceId: string): Promise<PendingSyncChange[]> {
  return db.pendingSync.where('workspaceId').equals(workspaceId).sortBy('clientTs');
}

export async function getPendingSyncCount(workspaceId: string): Promise<number> {
  return db.pendingSync.where('workspaceId').equals(workspaceId).count();
}

export async function removePendingSyncChanges(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await db.pendingSync.bulkDelete(ids);
}

export async function markPendingSyncFailed(ids: string[], error: string): Promise<void> {
  await Promise.all(
    ids.map(async (id) => {
      const item = await db.pendingSync.get(id);
      if (!item) return;
      await db.pendingSync.update(id, {
        retryCount: item.retryCount + 1,
        lastError: error,
      });
    }),
  );
}

export async function getSetting(key: string): Promise<string | undefined> {
  const item = await db.settings.get(key);
  return item?.value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.settings.put({ key, value });
}
