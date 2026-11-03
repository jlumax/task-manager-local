'use client';

import { useEffect, useRef, useState } from 'react';
import { Archive, Database, Download, FileText, HardDrive, ShieldCheck, Upload, X } from 'lucide-react';
import { useTaskStore } from '@/store/taskStore';
import {
  downloadJsonBackup,
  downloadMarkdownExport,
  downloadZipBackup,
  getLocalStorageStatus,
  readLocalBackup,
  requestPersistentStorage,
  restoreLocalBackup,
} from '@/lib/local-backup';

function formatBytes(value: number) {
  if (!value) return '0 MB';
  return `${(value / 1024 / 1024).toFixed(value > 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

export default function LocalDataPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const exportToMarkdown = useTaskStore((state) => state.exportToMarkdown);
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState({ usage: 0, quota: 0, persistent: false });
  const [message, setMessage] = useState('');
  const lastBackupAt = typeof window === 'undefined' ? null : localStorage.getItem('task-manager-last-backup-at');

  useEffect(() => {
    if (open) getLocalStorageStatus().then(setStatus);
  }, [open]);

  if (!open) return null;

  const handleRestore = async (file?: File) => {
    if (!file) return;
    if (!window.confirm('导入将覆盖当前本地数据。建议先导出一份备份，是否继续？')) return;
    try {
      setMessage('正在校验并恢复备份…');
      const backup = await readLocalBackup(file);
      await restoreLocalBackup(backup);
      setMessage('恢复完成，正在重新加载…');
      window.setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '恢复失败');
    }
  };

  return (
    <div className="local-modal-backdrop" onClick={onClose}>
      <section className="local-data-panel" onClick={(event) => event.stopPropagation()} aria-modal="true" role="dialog" aria-label="本地数据">
        <header>
          <div>
            <span className="local-kicker">DATA CUSTODY</span>
            <h2>本地数据</h2>
          </div>
          <button className="local-icon-button" onClick={onClose} aria-label="关闭"><X size={18} /></button>
        </header>

        <div className="local-storage-card">
          <div className="local-storage-icon"><HardDrive size={22} /></div>
          <div>
            <strong>{formatBytes(status.usage)} 已使用</strong>
            <span>浏览器可用空间 {formatBytes(status.quota)}</span>
          </div>
          <span className={`local-persistence ${status.persistent ? 'active' : ''}`}>
            {status.persistent ? '已保护' : '标准存储'}
          </span>
        </div>

        <div className="local-data-grid">
          <button onClick={() => downloadJsonBackup().then(() => setMessage('JSON 备份已下载'))}>
            <Download size={19} /><strong>导出 JSON</strong><span>可读的完整数据快照</span>
          </button>
          <button onClick={() => {
            downloadMarkdownExport(exportToMarkdown());
            setMessage('Markdown 文件已下载');
          }}>
            <FileText size={19} /><strong>导出 Markdown</strong><span>便于阅读和文本迁移</span>
          </button>
          <button onClick={() => downloadZipBackup().then(() => setMessage('ZIP 备份已下载'))}>
            <Archive size={19} /><strong>导出 ZIP</strong><span>便于归档和跨设备迁移</span>
          </button>
          <button onClick={() => fileRef.current?.click()}>
            <Upload size={19} /><strong>恢复备份</strong><span>支持 JSON 或 ZIP</span>
          </button>
          <button style={{ gridColumn: '1 / -1' }} onClick={async () => {
            const persistent = await requestPersistentStorage();
            setStatus((current) => ({ ...current, persistent }));
            setMessage(persistent ? '已获得持久存储保护' : '浏览器未授予持久存储，请定期备份');
          }}>
            <ShieldCheck size={19} /><strong>保护本地数据</strong><span>请求浏览器不自动清理</span>
          </button>
        </div>

        <input ref={fileRef} hidden type="file" accept=".json,.zip,application/json,application/zip" onChange={(event) => handleRestore(event.target.files?.[0])} />
        <footer>
          <Database size={15} />
          <span>{lastBackupAt ? `上次备份 ${new Date(lastBackupAt).toLocaleString('zh-CN')}` : '尚未备份，建议现在导出一份 ZIP'}</span>
        </footer>
        {message && <p className="local-data-message">{message}</p>}
      </section>
    </div>
  );
}
