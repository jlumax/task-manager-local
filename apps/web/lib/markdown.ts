export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function renderMarkdown(text: string): string {
  if (!text) return '';
  const lines = text.split('\n');
  const out: string[] = [];
  const para: string[] = [];

  const fmt = (s: string) =>
    escapeHtml(s)
      .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="max-w-full rounded-lg my-2" />')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>');

  const flushPara = () => {
    if (para.length > 0) {
      const content = para.map((l) => fmt(l)).join('<br>');
      out.push(`<p>${content}</p>`);
      para.length = 0;
    }
  };

  let listDepth = 0;
  let listType: 'ul' | 'ol' | null = null;

  const closeList = (targetDepth = 0) => {
    if (listDepth === 0) return;
    const tag = listType || 'ul';
    if (listDepth === 2) out.push(`</li></${tag}>`);
    if (listDepth >= 1) out.push(`</li></${tag}>`);
    listDepth = targetDepth;
    listType = null;
  };

  // Table buffer — accumulate consecutive pipe-delimited rows
  let tableRows: string[][] = [];

  const flushTable = () => {
    if (tableRows.length < 2) {
      // Not a valid table — treat rows as normal paragraphs
      for (const row of tableRows) {
        para.push(row.join(' | '));
      }
      tableRows = [];
      return;
    }
    const header = tableRows[0];
    const alignRow = tableRows[1];
    const body = tableRows.slice(2);

    // Detect alignment from separator row
    const aligns: string[] = [];
    for (const cell of alignRow) {
      const t = cell.trim();
      if (t.startsWith(':') && t.endsWith(':')) aligns.push('center');
      else if (t.endsWith(':')) aligns.push('right');
      else aligns.push('left');
    }

    const renderRow = (cells: string[], tag: 'th' | 'td') => {
      const cols = cells.map((cell, ci) => {
        const align = aligns[ci] ? ` style="text-align:${aligns[ci]}"` : '';
        return `<${tag}${align}>${fmt(cell)}</${tag}>`;
      }).join('');
      return `<tr>${cols}</tr>`;
    };

    out.push('<table>');
    out.push(`<thead>${renderRow(header, 'th')}</thead>`);
    if (body.length > 0) {
      out.push(`<tbody>${body.map((row) => renderRow(row, 'td')).join('')}</tbody>`);
    }
    out.push('</table>');
    tableRows = [];
  };

  // Two-pass: extract code blocks first, then process remaining lines
  const fragments: ({ kind: 'text'; lines: string[] } | { kind: 'code'; lang: string; code: string })[] = [];
  let currentTextLines: string[] = [];
  let inCodeBlock = false;
  let codeLang = '';
  let codeLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!inCodeBlock && trimmed.startsWith('```')) {
      // Materialize current text fragment
      if (currentTextLines.length > 0) {
        fragments.push({ kind: 'text', lines: currentTextLines });
        currentTextLines = [];
      }
      inCodeBlock = true;
      codeLang = trimmed.slice(3).trim();
      codeLines = [];
    } else if (inCodeBlock && trimmed.startsWith('```')) {
      inCodeBlock = false;
      fragments.push({ kind: 'code', lang: codeLang, code: codeLines.join('\n') });
      codeLines = [];
    } else if (inCodeBlock) {
      codeLines.push(line);
    } else {
      currentTextLines.push(line);
    }
  }
  if (inCodeBlock) {
    // Unclosed code block — treat as regular text
    fragments.push({ kind: 'text', lines: ['```' + codeLang, ...codeLines] });
  }
  if (currentTextLines.length > 0) {
    fragments.push({ kind: 'text', lines: currentTextLines });
  }

  // Process each text fragment line by line
  for (const frag of fragments) {
    if (frag.kind === 'code') {
      flushPara();
      closeList();
      const langAttr = frag.lang ? ` data-lang="${escapeHtml(frag.lang)}"` : '';
      out.push(`<pre${langAttr}><code>${escapeHtml(frag.code)}</code></pre>`);
      continue;
    }

    for (const line of frag.lines) {
      const t = line.trim();
      const ind = line.length - line.trimStart().length;

      // Horizontal rule
      if (/^(---|\*\*\*|___)\s*$/.test(t)) {
        flushPara();
        closeList();
        flushTable();
        out.push('<hr>');
        continue;
      }

      // Heading (must be before blockquote check)
      const headingMatch = t.match(/^(#{1,6})\s+(.+)/);
      if (headingMatch) {
        flushPara();
        closeList();
        flushTable();
        const level = headingMatch[1].length;
        out.push(`<h${level}>${fmt(headingMatch[2])}</h${level}>`);
        continue;
      }

      // Blockquote
      if (t.startsWith('> ')) {
        flushPara();
        closeList();
        flushTable();
        out.push(`<blockquote><p>${fmt(t.slice(2))}</p></blockquote>`);
        continue;
      }

      // Empty line — flush paragraph, list, and table
      if (t === '') {
        flushPara();
        closeList();
        flushTable();
        continue;
      }

      // Unordered list
      if (t.startsWith('- ') || t.startsWith('* ')) {
        flushPara();
        flushTable();
        const depth = ind >= 2 ? 2 : 1;
        if (depth === listDepth && listType === 'ul') {
          out.push('</li><li>');
        } else if (depth > listDepth) {
          out.push('<ul><li>');
        } else {
          if (listDepth === 2) out.push('</li></ul>');
          if (listDepth >= 1) out.push(`</li></${listType || 'ul'}>`);
          out.push('<ul><li>');
        }
        listDepth = depth;
        listType = 'ul';
        out.push(fmt(t.slice(2)));
        continue;
      }

      // Ordered list
      const orderedMatch = t.match(/^(\d+)\.\s+(.+)/);
      if (orderedMatch) {
        flushPara();
        flushTable();
        const depth = ind >= 2 ? 2 : 1;
        if (depth === listDepth && listType === 'ol') {
          out.push('</li><li>');
        } else if (depth > listDepth) {
          out.push('<ol><li>');
        } else {
          if (listDepth === 2) out.push('</li></ol>');
          if (listDepth >= 1) out.push(`</li></${listType || 'ol'}>`);
          out.push('<ol><li>');
        }
        listDepth = depth;
        listType = 'ol';
        out.push(fmt(orderedMatch[2]));
        continue;
      }

      // Table row (pipe-delimited, at least 2 cells)
      if (t.includes('|')) {
        const cells = t.split('|').map((c) => c.trim());
        // Strip leading/trailing empty cells from `| ... |` pattern
        if (cells[0] === '') cells.shift();
        if (cells.length > 0 && cells[cells.length - 1] === '') cells.pop();
        if (cells.length >= 2) {
          flushPara();
          closeList();
          tableRows.push(cells);
          continue;
        }
      }
      // If we had table rows buffered but this line isn't a table, flush then re-process
      if (tableRows.length > 0) {
        flushTable();
        // Re-process this line now that table is flushed
        if (t === '') continue;
        if (t.startsWith('- ') || t.startsWith('* ')) {
          // fall through to list handling below — but we already passed it...
          // Simple reprocess: just handle as list or paragraph
        }
      }

      // Normal paragraph text
      closeList();
      para.push(t);
    }
  }

  flushPara();
  // Close any remaining open list
  if (listDepth >= 1) {
    const tag = listType || 'ul';
    if (listDepth === 2) out.push(`</li></${tag}>`);
    out.push(`</li></${tag}>`);
  }

  const html = out.join('');

  // Preserve the legacy task-reference marker, but render it as a professional text chip.
  return html.replace(
    /📎\[([^\]]+)\]/g,
    (_match, taskId: string) =>
      `<a data-task-link="${taskId}" class="task-ref-link" title="点击跳转到任务笔记">关联任务</a>`,
  );
}

export function highlightText(
  html: string,
  searchTerm: string
): string {
  if (!searchTerm || typeof document === 'undefined') return html;
  const div = document.createElement('div');
  div.innerHTML = html;
  const walker = document.createTreeWalker(div, NodeFilter.SHOW_TEXT, null);
  const textNodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    textNodes.push(node as Text);
  }

  const escapedTerm = escapeHtml(searchTerm);
  const regex = new RegExp(
    '(' + escapedTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')',
    'gi'
  );

  textNodes.forEach((textNode) => {
    const text = textNode.textContent || '';
    if (text.toLowerCase().includes(searchTerm.toLowerCase())) {
      const span = document.createElement('span');
      span.innerHTML = escapeHtml(text).replace(
        regex,
        '<span class="bg-amber-400/60 px-1 rounded">$1</span>'
      );
      const fragment = document.createDocumentFragment();
      while (span.firstChild) {
        fragment.appendChild(span.firstChild);
      }
      textNode.parentNode?.replaceChild(fragment, textNode);
    }
  });

  return div.innerHTML;
}

export function getHighlightedTextParts(
  text: string,
  searchTerm: string
): { text: string; highlight: boolean }[] {
  if (!searchTerm) return [{ text, highlight: false }];
  const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  const lowerSearch = searchTerm.toLowerCase();
  return parts.map((part) => ({
    text: part,
    highlight: part.toLowerCase() === lowerSearch,
  }));
}
