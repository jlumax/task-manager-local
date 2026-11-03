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

const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/avif': 'avif',
  'image/bmp': 'bmp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
};

const EXTENSION_MIME_TYPES: Record<string, string> = Object.fromEntries(
  Object.entries(IMAGE_EXTENSIONS).map(([mimeType, extension]) => [extension, mimeType]),
);

function decodeImageDataUrl(value: string): { bytes: Uint8Array; extension: string } | null {
  const match = /^data:(image\/[^;,]+)((?:;[^,]*)*),([\s\S]*)$/.exec(value);
  if (!match) return null;

  const [, mimeType, parameters, payload] = match;
  const extension = IMAGE_EXTENSIONS[mimeType.toLowerCase()] || 'bin';
  if (parameters.toLowerCase().includes(';base64')) {
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return { bytes, extension };
  }

  return { bytes: new TextEncoder().encode(decodeURIComponent(payload)), extension };
}

function imageMimeType(path: string) {
  const extension = path.split('.').pop()?.toLowerCase() || '';
  return EXTENSION_MIME_TYPES[extension] || 'application/octet-stream';
}

function bytesToDataUrl(bytes: Uint8Array, mimeType: string) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
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
  let zip: JSZip | null = null;
  if (file.name.toLowerCase().endsWith('.zip')) {
    zip = await JSZip.loadAsync(file);
    const entry = zip.file('task-manager-backup.json');
    if (!entry) throw new Error('ZIP 中缺少 task-manager-backup.json');
    raw = await entry.async('string');
  } else {
    raw = await file.text();
  }

  const parsed = JSON.parse(raw) as unknown;
  assertBackup(parsed);

  if (zip) {
    const restoreImage = async (value: string) => {
      if (!value.startsWith('images/')) return value;
      const entry = zip?.file(value);
      if (!entry) throw new Error(`ZIP 中缺少图片文件: ${value}`);
      const bytes = await entry.async('uint8array');
      return bytesToDataUrl(bytes, imageMimeType(value));
    };

    parsed.data.tasks = await Promise.all(parsed.data.tasks.map(async (task) => ({
      ...task,
      progress: await Promise.all(task.progress.map(async (item) => ({
        ...item,
        images: item.images ? await Promise.all(item.images.map(restoreImage)) : undefined,
      }))),
    })));
    parsed.data.settings = await Promise.all(parsed.data.settings.map(async (setting) => ({
      ...setting,
      value: await restoreImage(setting.value),
    })));
  }

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
  const archivedImages = new Map<string, string>();
  let imageIndex = 0;

  const archiveImage = (value: string) => {
    const decoded = decodeImageDataUrl(value);
    if (!decoded) return value;
    const existingPath = archivedImages.get(value);
    if (existingPath) return existingPath;

    imageIndex += 1;
    const path = `images/image-${String(imageIndex).padStart(4, '0')}.${decoded.extension}`;
    zip.file(path, decoded.bytes);
    archivedImages.set(value, path);
    return path;
  };

  const archiveBackup: LocalBackup = {
    ...backup,
    data: {
      ...backup.data,
      tasks: backup.data.tasks.map((task) => ({
        ...task,
        progress: task.progress.map((item) => ({
          ...item,
          images: item.images?.map(archiveImage),
        })),
      })),
      settings: backup.data.settings.map((setting) => ({
        ...setting,
        value: archiveImage(setting.value),
      })),
    },
  };

  zip.file('task-manager-backup.json', JSON.stringify(archiveBackup, null, 2));
  zip.file(
    'README.txt',
    '任务进度管理器 Local 版完整备份。\n请在应用的“本地数据”面板中导入此 ZIP。\n数据保存在 task-manager-backup.json，原始图片保存在 images/ 目录。\n',
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
