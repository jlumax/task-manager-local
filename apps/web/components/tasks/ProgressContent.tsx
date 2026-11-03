'use client';

import { useMemo } from 'react';
import { renderMarkdown, highlightText } from '@/lib/markdown';

interface ProgressContentProps {
  content: string;
  searchTerm?: string;
}

export default function ProgressContent({ content, searchTerm = '' }: ProgressContentProps) {
  const html = useMemo(() => {
    const rendered = renderMarkdown(content);
    return searchTerm ? highlightText(rendered, searchTerm) : rendered;
  }, [content, searchTerm]);

  return (
    <div
      className="text-sm text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_li]:my-1 [&_code]:bg-accent [&_code]:px-1 [&_code]:rounded [&_strong]:font-semibold [&_em]:italic [&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:py-1 [&_blockquote]:my-2 [&_blockquote]:bg-accent/50 [&_blockquote]:rounded-r-lg [&_blockquote_p]:my-0"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
