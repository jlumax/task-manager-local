import { Task } from '@/types';
import { formatTime, formatDate } from '@/lib/utils';
import { toBlob } from 'html-to-image';
import QRCode from 'qrcode';

export function generateSingleTaskMarkdown(task: Task): string {
  const status = task.completed ? '[x]' : '[ ]';
  const statusText = task.completed ? '已完成' : task.stuck ? '僵持中' : '进行中';
  const priorityMap = { high: '高', medium: '中', low: '低' };
  const priorityText = priorityMap[task.priority] || task.priority;

  let md = `# ${status} ${task.title}\n\n`;
  md += `- **编号**: ${task.code}\n`;
  md += `- **优先级**: ${priorityText}\n`;
  md += `- **状态**: ${statusText}\n`;
  md += `- **创建时间**: ${formatTime(task.createdAt)}\n`;
  if (task.deadline) {
    md += `- **截止日期**: ${formatDate(task.deadline)}\n`;
  }
  if (task.completedAt) {
    md += `- **完成时间**: ${formatTime(task.completedAt)}\n`;
  }
  if (task.pinned) {
    md += `- **置顶**: 是\n`;
  }

  if (task.progress.length > 0) {
    const sorted = [...task.progress].sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
    );
    md += `\n## 进展记录（${sorted.length} 条）\n\n`;
    sorted.forEach((p) => {
      md += `### ${formatTime(p.time)}\n\n${p.content}\n\n`;
    });
  }

  return md;
}

export async function captureShareCard(element: HTMLElement): Promise<Blob> {
  const blob = await toBlob(element, { pixelRatio: 2, quality: 0.95 });
  if (!blob) throw new Error('截图失败');
  return blob;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

let cachedQRDataURL: string | null = null;

export async function generateQRCodeDataURL(url: string): Promise<string> {
  if (cachedQRDataURL) return cachedQRDataURL;
  cachedQRDataURL = await QRCode.toDataURL(url, { width: 128, margin: 1 });
  return cachedQRDataURL;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: '#cf222e',
  medium: '#f59e0b',
  low: '#2ea043',
};
const PRIORITY_LABELS: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

export interface PrintTaskCardParams {
  task: Task;
  appTitle: string;
  appSubtitle: string;
  appUrl: string;
  qrCodeDataURL: string;
  fontFamily: string;
}

export function printTaskCard(params: PrintTaskCardParams): void {
  const { task, appTitle, appSubtitle, appUrl, qrCodeDataURL, fontFamily } = params;

  const sortedProgress = [...task.progress].sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
  );

  const statusText = task.completed ? '已完成' : task.stuck ? '僵持中' : '进行中';
  const statusColor = task.completed ? '#2ea043' : task.stuck ? '#d29922' : '#3b82f6';
  const cardBorderColor = task.completed
    ? '#2ea043'
    : task.stuck
    ? '#d29922'
    : PRIORITY_COLORS[task.priority] || '#3b82f6';

  const title = appTitle.replace(/📋\s*/, '');

  const progressHTML = sortedProgress.length > 0
    ? sortedProgress.map((p, idx) => {
        const isLast = idx === sortedProgress.length - 1;
        return `<div style="position:relative;padding:10px 0 10px 20px;border-left:2px solid ${isLast ? 'transparent' : '#e5e7eb'};${idx === 0 ? 'padding-top:2px;' : ''}${isLast ? 'padding-bottom:0;' : ''}">
          <div style="position:absolute;left:-5.5px;top:${idx === 0 ? '6px' : '14px'};width:9px;height:9px;border-radius:50%;background:#3b82f6;border:2px solid #fff;"></div>
          <div style="font-size:12px;color:#888;margin-bottom:4px;">${formatTime(p.time)}</div>
          <div style="font-size:14px;color:#333;line-height:1.6;white-space:pre-wrap;word-break:break-word;">${p.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        </div>`;
      }).join('')
    : '<div style="font-size:14px;color:#aaa;font-style:italic;">暂无进展记录</div>';

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: ${fontFamily}; color: #1a1a2e; line-height: 1.6; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page { margin: 20mm; size: A4; }
  }
</style>
</head>
<body>
<div style="max-width:650px;margin:0 auto;padding:40px 44px;border-left:6px solid ${cardBorderColor};">
  <h1 style="font-size:24px;font-weight:700;margin-bottom:6px;line-height:1.3;word-break:break-word;${task.completed ? 'text-decoration:line-through;color:#999;' : ''}">${task.title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h1>
  <span style="display:inline-block;font-size:12px;color:#666;background:#f3f4f6;padding:2px 8px;border-radius:4px;margin-bottom:20px;font-family:monospace;">${task.code}</span>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;margin-bottom:24px;padding:16px 20px;background:#fafafa;border-radius:10px;">
    <div style="display:flex;gap:8px;font-size:14px;"><span style="color:#888;flex-shrink:0;">优先级</span><span style="display:inline-block;padding:1px 10px;border-radius:12px;font-size:13px;font-weight:600;color:${PRIORITY_COLORS[task.priority]};background:${PRIORITY_COLORS[task.priority]}18;">${PRIORITY_LABELS[task.priority]}</span></div>
    <div style="display:flex;gap:8px;font-size:14px;"><span style="color:#888;flex-shrink:0;">状态</span><span style="font-weight:600;color:${statusColor};">${statusText}</span></div>
    <div style="display:flex;gap:8px;font-size:14px;"><span style="color:#888;flex-shrink:0;">创建时间</span><span>${formatTime(task.createdAt)}</span></div>
    <div style="display:flex;gap:8px;font-size:14px;"><span style="color:#888;flex-shrink:0;">截止日期</span><span${!task.deadline ? ' style="color:#aaa;"' : ''}>${task.deadline ? formatDate(task.deadline) : '未设置'}</span></div>
    ${task.completedAt ? `<div style="display:flex;gap:8px;font-size:14px;"><span style="color:#888;flex-shrink:0;">完成时间</span><span>${formatTime(task.completedAt)}</span></div>` : ''}
    <div style="display:flex;gap:8px;font-size:14px;"><span style="color:#888;flex-shrink:0;">进展记录</span><span>${task.progress.length} 条</span></div>
  </div>

  <h3 style="font-size:16px;font-weight:700;margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid #eee;">进展记录</h3>
  <div style="padding-left:8px;margin-bottom:28px;">${progressHTML}</div>

  <hr style="border:none;border-top:1px solid #e5e7eb;margin-bottom:20px;">
  <div style="display:flex;justify-content:space-between;align-items:flex-end;">
    <div>
      <div style="font-size:16px;font-weight:700;">${title}</div>
      <div style="font-size:13px;color:#888;margin-top:4px;">${appSubtitle}</div>
      <div style="font-size:12px;color:#aaa;font-family:monospace;margin-top:2px;">${appUrl}</div>
    </div>
    ${qrCodeDataURL ? `<img src="${qrCodeDataURL}" alt="QR" style="width:72px;height:72px;border-radius:6px;border:1px solid #eee;">` : ''}
  </div>
</div>
<script>
  // 等待图片加载后再打印
  window.onload = function() {
    setTimeout(function() { window.print(); }, 200);
  };
</script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=800,height=600');
  if (!w) {
    alert('弹窗被浏览器拦截，请允许弹窗后重试');
    return;
  }
  w.document.write(html);
  w.document.close();
}
