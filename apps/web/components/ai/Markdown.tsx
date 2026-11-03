'use client';

import { useMemo, useCallback } from 'react';
import { marked } from 'marked';
import { useTaskStore } from '@/store/taskStore';

marked.setOptions({
  breaks: true,
  gfm: true,
});

function renderMarkdown(text: string): string {
  return marked.parse(text) as string;
}

export default function Markdown({ content }: { content: string }) {
  const html = useMemo(() => renderMarkdown(content), [content]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const link = target.closest('a[data-task-link]') as HTMLAnchorElement | null;
    if (link) {
      e.preventDefault();
      const taskId = link.getAttribute('data-task-link')!;
      const { setExpandedTaskId, setHighlightTaskId, setCurrentView } = useTaskStore.getState();
      setExpandedTaskId(taskId);
      setHighlightTaskId(taskId);
      setCurrentView('list');
    }
  }, []);

  // Preserve the legacy task-reference marker, but render it as a text chip.
  const processedHtml = useMemo(() => {
    return html.replace(
      /📎\[([^\]]+)\]/g,
      (_match, taskId: string) =>
        `<a data-task-link="${taskId}" class="task-ref-link" title="点击跳转到任务笔记">关联任务</a>`,
    );
  }, [html]);

  return (
    <div
      onClick={handleClick}
      className="prose prose-sm dark:prose-invert max-w-none [&_pre]:bg-muted [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:overflow-x-auto [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-sm [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:bg-muted [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/30 [&_blockquote]:pl-3 [&_blockquote]:text-muted [&_.task-ref-link]:inline-flex [&_.task-ref-link]:items-center [&_.task-ref-link]:gap-0.5 [&_.task-ref-link]:px-1.5 [&_.task-ref-link]:py-0.5 [&_.task-ref-link]:rounded [&_.task-ref-link]:bg-accent [&_.task-ref-link]:text-primary [&_.task-ref-link]:text-xs [&_.task-ref-link]:font-medium [&_.task-ref-link]:cursor-pointer [&_.task-ref-link]:hover:underline [&_.task-ref-link]:no-underline [&_.task-ref-link]:transition-colors"
      dangerouslySetInnerHTML={{ __html: processedHtml }}
    />
  );
}
