import JSZip from 'jszip';
import { db, getAllProjects, getAllSettings, getAllTasks } from '@/db';
import type { Project, Task } from '@/types';

export const LOCAL_BACKUP_VERSION = 1;

export interface LocalBackup {
  format: 'task-manager-local-backup';
  version: number;
  exportedAt: string;
  appVersion: string;
  data: {
    tasks: Task[];
    projects: Project[];
    settings: Array<{ key: string; value: string }>;
    preferences: string | null;
  };
}

export async function createLocalBackup(): Promise<LocalBackup> {
  const [tasks, projects, settings] = await Promise.all([
    getAllTasks(),
    getAllProjects(),
    getAllSettings(),
  ]);

  return {
    format: 'task-manager-local-backup',
    version: LOCAL_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: 'local-v1',
    data: {
      tasks,
      projects,
      settings,
      preferences: localStorage.getItem('task-manager-storage'),
    },
  };
}

function assertBackup(value: unknown): asserts value is LocalBackup {
  const backup = value as Partial<LocalBackup>;
  if (
    backup?.format !== 'task-manager-local-backup' ||
    backup.version !== LOCAL_BACKUP_VERSION ||
    !backup.data ||
    !Array.isArray(backup.data.tasks) ||
    !Array.isArray(backup.data.projects) ||
    !Array.isArray(backup.data.settings)
  ) {
    throw new Error('备份文件格式不受支持');
  }
}

export async function readLocalBackup(file: File): Promise<LocalBackup> {
  let raw: string;
  if (file.name.toLowerCase().endsWith('.zip')) {
    const zip = await JSZip.loadAsync(file);
    const entry = zip.file('task-manager-backup.json');
    if (!entry) throw new Error('ZIP 中缺少 task-manager-backup.json');
    raw = await entry.async('string');
  } else {
    raw = await file.text();
  }

  const parsed = JSON.parse(raw) as unknown;
  assertBackup(parsed);
  return parsed;
}

export async function restoreLocalBackup(backup: LocalBackup): Promise<void> {
  assertBackup(backup);
  await db.transaction('rw', db.tasks, db.projects, db.settings, db.pendingSync, async () => {
    await Promise.all([
      db.tasks.clear(),
      db.projects.clear(),
      db.settings.clear(),
      db.pendingSync.clear(),
    ]);
    await db.tasks.bulkPut(backup.data.tasks);
    await db.projects.bulkPut(backup.data.projects);
    await db.settings.bulkPut(backup.data.settings);
  });

  if (backup.data.preferences) {
    localStorage.setItem('task-manager-storage', backup.data.preferences);
  }
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function backupFileStem(exportedAt: string) {
  return `task-manager-${exportedAt.slice(0, 10)}`;
}

export async function downloadJsonBackup() {
  const backup = await createLocalBackup();
  downloadBlob(
    new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
    `${backupFileStem(backup.exportedAt)}.json`,
  );
  localStorage.setItem('task-manager-last-backup-at', backup.exportedAt);
}

export function downloadMarkdownExport(markdown: string) {
  const exportedAt = new Date().toISOString();
  downloadBlob(
    new Blob([markdown], { type: 'text/markdown;charset=utf-8' }),
    `${backupFileStem(exportedAt)}.md`,
  );
}

export async function downloadZipBackup() {
  const backup = await createLocalBackup();
  const zip = new JSZip();
  zip.file('task-manager-backup.json', JSON.stringify(backup, null, 2));
  zip.file(
    'README.txt',
    '任务进度管理器 Local 版完整备份。\n请在应用的“本地数据”面板中导入此 ZIP。\n图片以 data URL 形式嵌入 JSON，无需额外文件。\n',
  );
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  downloadBlob(blob, `${backupFileStem(backup.exportedAt)}.zip`);
  localStorage.setItem('task-manager-last-backup-at', backup.exportedAt);
}

export async function getLocalStorageStatus() {
  const estimate = await navigator.storage?.estimate?.();
  const persistent = await navigator.storage?.persisted?.();
  return {
    usage: estimate?.usage ?? 0,
    quota: estimate?.quota ?? 0,
    persistent: persistent ?? false,
  };
}

export async function requestPersistentStorage() {
  return navigator.storage?.persist ? navigator.storage.persist() : false;
}
