/**
 * Lightweight Markdown parser.
 * Supports: headings, bold, italic, links, images, code blocks,
 * inline code, blockquotes, unordered/ordered lists, horizontal rules, paragraphs.
 */
function parseMarkdown(md) {
  if (!md) return '';

  let html = '';
  const lines = md.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block (fenced)
    if (line.trim().startsWith('```')) {
      let code = '';
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code += escapeHtml(lines[i]) + '\n';
        i++;
      }
      i++; // skip closing ```
      html += `<pre><code>${code.trimEnd()}</code></pre>\n`;
      continue;
    }

    // Blank line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      html += `<h${level}>${inlineFormat(headingMatch[2])}</h${level}>\n`;
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|_{3,}|\*{3,})\s*$/.test(line.trim())) {
      html += '<hr>\n';
      i++;
      continue;
    }

    // Blockquote
    if (line.trim().startsWith('>')) {
      let quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      html += `<blockquote><p>${inlineFormat(quoteLines.join(' '))}</p></blockquote>\n`;
      continue;
    }

    // Unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      html += '<ul>\n';
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        const content = lines[i].replace(/^\s*[-*+]\s+/, '');
        html += `  <li>${inlineFormat(content)}</li>\n`;
        i++;
      }
      html += '</ul>\n';
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      html += '<ol>\n';
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        const content = lines[i].replace(/^\s*\d+\.\s+/, '');
        html += `  <li>${inlineFormat(content)}</li>\n`;
        i++;
      }
      html += '</ol>\n';
      continue;
    }

    // Paragraph (collect consecutive non-empty lines)
    let para = [];
    while (i < lines.length && lines[i].trim() !== '' &&
           !lines[i].trim().startsWith('#') &&
           !lines[i].trim().startsWith('>') &&
           !lines[i].trim().startsWith('```') &&
           !/^\s*[-*+]\s+/.test(lines[i]) &&
           !/^\s*\d+\.\s+/.test(lines[i]) &&
           !/^(-{3,}|_{3,}|\*{3,})\s*$/.test(lines[i].trim())) {
      para.push(lines[i]);
      i++;
    }
    if (para.length > 0) {
      html += `<p>${inlineFormat(para.join(' '))}</p>\n`;
    }
  }

  return html;
}

function inlineFormat(text) {
  // Images: ![alt](src)
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px;margin:0.5rem 0;">');

  // Links: [text](url)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // Bold + italic: ***text*** or ___text___
  text = text.replace(/\*{3}(.+?)\*{3}/g, '<strong><em>$1</em></strong>');
  text = text.replace(/_{3}(.+?)_{3}/g, '<strong><em>$1</em></strong>');

  // Bold: **text** or __text__
  text = text.replace(/\*{2}(.+?)\*{2}/g, '<strong>$1</strong>');
  text = text.replace(/_{2}(.+?)_{2}/g, '<strong>$1</strong>');

  // Italic: *text* or _text_
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  text = text.replace(/_(.+?)_/g, '<em>$1</em>');

  // Inline code: `code`
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

  return text;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
