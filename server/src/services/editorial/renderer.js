/**
 * Editorial Markdown to HTML Rendering & Sanitization
 */

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function formatContentToHtml(rawContent) {
  if (!rawContent) return '';
  let cleanRaw = String(rawContent)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const codeBlocks = [];
  cleanRaw = cleanRaw.replace(/(?:^|\n)(?:```|~~~)([a-zA-Z0-9_-]*)\r?\n([\s\S]*?)\r?\n(?:```|~~~)/g, (_match, lang, code) => {
    const token = `\n\nWRITONCODEBLOCK${codeBlocks.length}TOKEN\n\n`;
    codeBlocks.push({ lang: (lang || '').trim(), code });
    return token;
  });

  function formatInline(str) {
    const escaped = escapeHtml(str);
    return escaped
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }

  const lines = cleanRaw.split('\n');
  const output = [];
  let inList = false;
  let listType = null;
  let inBlockquote = false;
  let blockquoteLines = [];

  function flushList() {
    if (inList) {
      output.push(listType === 'ol' ? '</ol>' : '</ul>');
      inList = false;
      listType = null;
    }
  }

  function flushBlockquote() {
    if (inBlockquote) {
      output.push(`<blockquote><p>${blockquoteLines.map(formatInline).join('<br>')}</p></blockquote>`);
      inBlockquote = false;
      blockquoteLines = [];
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      flushBlockquote();
      continue;
    }

    const tokenMatch = trimmed.match(/^WRITONCODEBLOCK(\d+)TOKEN$/);
    if (tokenMatch) {
      flushList();
      flushBlockquote();
      const idx = parseInt(tokenMatch[1], 10);
      const item = codeBlocks[idx] || { lang: '', code: '' };
      output.push(`<pre><code class="language-${escapeHtml(item.lang)}">${escapeHtml(item.code)}</code></pre>`);
      continue;
    }

    if (trimmed.startsWith('### ')) {
      flushList(); flushBlockquote();
      output.push(`<h3>${formatInline(trimmed.slice(4))}</h3>`);
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flushList(); flushBlockquote();
      output.push(`<h2>${formatInline(trimmed.slice(3))}</h2>`);
      continue;
    }
    if (trimmed.startsWith('# ')) {
      flushList(); flushBlockquote();
      output.push(`<h1>${formatInline(trimmed.slice(2))}</h1>`);
      continue;
    }

    if (trimmed.startsWith('> ')) {
      flushList();
      inBlockquote = true;
      blockquoteLines.push(trimmed.slice(2));
      continue;
    } else {
      flushBlockquote();
    }

    const ulMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      if (!inList || listType !== 'ul') {
        flushList();
        output.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      output.push(`  <li>${formatInline(ulMatch[1])}</li>`);
      continue;
    }

    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      if (!inList || listType !== 'ol') {
        flushList();
        output.push('<ol>');
        inList = true;
        listType = 'ol';
      }
      output.push(`  <li>${formatInline(olMatch[2])}</li>`);
      continue;
    }

    flushList();
    output.push(`<p>${formatInline(trimmed)}</p>`);
  }

  flushList();
  flushBlockquote();

  return output.join('\n');
}
