"use client";

import { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileDown, FileType, ChevronDown, Loader2 } from 'lucide-react';

interface NoteExportData {
  title: string;
  category: string;
  content: string;
  createdAt?: string;
  updatedAt?: string;
}

// ─── HTML → Markdown ──────────────────────────────────────────────────────────
function nodeToMd(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  const children = () => Array.from(el.childNodes).map(nodeToMd).join('');

  switch (tag) {
    case 'h1': return `# ${children()}\n\n`;
    case 'h2': return `## ${children()}\n\n`;
    case 'h3': return `### ${children()}\n\n`;
    case 'h4': return `#### ${children()}\n\n`;
    case 'h5': return `##### ${children()}\n\n`;
    case 'h6': return `###### ${children()}\n\n`;
    case 'p':  return `${children()}\n\n`;
    case 'br': return '\n';
    case 'hr': return `---\n\n`;
    case 'strong': case 'b': return `**${children()}**`;
    case 'em':     case 'i': return `*${children()}*`;
    case 's': case 'del':    return `~~${children()}~~`;
    case 'u':                return `<u>${children()}</u>`;
    case 'code': {
      const parent = el.parentElement?.tagName.toLowerCase();
      if (parent === 'pre') return el.textContent || '';
      return `\`${children()}\``;
    }
    case 'pre': {
      const codeEl = el.querySelector('code');
      const lang   = codeEl?.className?.replace(/language-/, '') || '';
      const code   = codeEl ? codeEl.textContent || '' : children();
      return `\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
    }
    case 'blockquote': {
      const inner = children().trim().split('\n').map(l => `> ${l}`).join('\n');
      return `${inner}\n\n`;
    }
    case 'ul': {
      const items = Array.from(el.children).map(li =>
        `- ${Array.from(li.childNodes).map(nodeToMd).join('').trim()}`
      ).join('\n');
      return `${items}\n\n`;
    }
    case 'ol': {
      const items = Array.from(el.children).map((li, i) =>
        `${i + 1}. ${Array.from(li.childNodes).map(nodeToMd).join('').trim()}`
      ).join('\n');
      return `${items}\n\n`;
    }
    case 'li': return children();
    case 'a': {
      const href = el.getAttribute('href') || '#';
      return `[${children()}](${href})`;
    }
    case 'img': {
      const src = el.getAttribute('src') || '';
      const alt = el.getAttribute('alt') || 'image';
      return `![${alt}](${src})\n\n`;
    }
    case 'table': {
      const rows = Array.from(el.querySelectorAll('tr'));
      if (!rows.length) return '';
      const header = Array.from(rows[0].querySelectorAll('th, td')).map(c => c.textContent?.trim() || '');
      const sep    = header.map(() => '---');
      const body   = rows.slice(1).map(r =>
        Array.from(r.querySelectorAll('td')).map(c => c.textContent?.trim() || '').join(' | ')
      );
      return [
        `| ${header.join(' | ')} |`,
        `| ${sep.join(' | ')} |`,
        ...body.map(r => `| ${r} |`),
      ].join('\n') + '\n\n';
    }
    default: return children();
  }
}

function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return Array.from(doc.body.childNodes).map(nodeToMd).join('').replace(/\n{3,}/g, '\n\n').trim();
}

// ─── HTML → Plain Text ────────────────────────────────────────────────────────
function nodeToText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  const children = () => Array.from(el.childNodes).map(nodeToText).join('');

  switch (tag) {
    case 'h1': return `\n${children()}\n${'═'.repeat(Math.min(children().length, 50))}\n\n`;
    case 'h2': return `\n${children()}\n${'─'.repeat(Math.min(children().length, 50))}\n\n`;
    case 'h3': case 'h4': case 'h5': case 'h6': return `\n${children().toUpperCase()}\n\n`;
    case 'p':  return `${children()}\n\n`;
    case 'br': return '\n';
    case 'hr': return `${'─'.repeat(40)}\n\n`;
    case 'li': return `  • ${children()}\n`;
    case 'ul': case 'ol': return `${children()}\n`;
    case 'blockquote': return `  "${children().trim()}"\n\n`;
    case 'pre': return `${el.textContent}\n\n`;
    case 'img': return `[Gambar: ${el.getAttribute('alt') || 'untitled'}]\n`;
    default: return children();
  }
}

function htmlToPlainText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return Array.from(doc.body.childNodes).map(nodeToText).join('').replace(/\n{3,}/g, '\n\n').trim();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function safeFilename(title: string) {
  return title.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '-').toLowerCase() || 'note';
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ExportButton({ note }: { note: NoteExportData }) {
  const [isOpen,  setIsOpen]  = useState(false);
  const [loading, setLoading] = useState<'pdf' | 'md' | 'txt' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const dateStr     = note.createdAt ? new Date(note.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const filename    = safeFilename(note.title);

  const exportAsTxt = () => {
    setLoading('txt');
    setIsOpen(false);
    try {
      const body = htmlToPlainText(note.content);
      const sep  = '─'.repeat(40);
      const text = [
        note.title,
        '═'.repeat(note.title.length),
        `Kategori : ${note.category}`,
        dateStr ? `Tanggal  : ${dateStr}` : '',
        '',
        sep,
        '',
        body,
        '',
        sep,
        `Diekspor dari Tananotes · ${new Date().toLocaleDateString('id-ID')}`,
      ].filter(l => l !== null).join('\n');
      downloadBlob(text, `${filename}.txt`, 'text/plain');
    } finally { setLoading(null); }
  };

  const exportAsMarkdown = () => {
    setLoading('md');
    setIsOpen(false);
    try {
      const body = htmlToMarkdown(note.content);
      const fm   = [
        '---',
        `title: "${note.title}"`,
        `category: "${note.category}"`,
        dateStr ? `date: "${dateStr}"` : '',
        `exported: "${new Date().toLocaleDateString('id-ID')}"`,
        '---',
        '',
      ].filter(Boolean).join('\n');
      downloadBlob(`${fm}\n# ${note.title}\n\n${body}`, `${filename}.md`, 'text/markdown');
    } finally { setLoading(null); }
  };

  const exportAsPDF = async () => {
    setLoading('pdf');
    setIsOpen(false);

    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);

      // Build an off-screen styled container
      const el = document.createElement('div');
      el.style.cssText = [
        'position:fixed', 'top:-99999px', 'left:-99999px',
        'width:794px', 'background:#ffffff',
        'padding:56px 64px',
        'font-family:Arial,Helvetica,sans-serif',
        'font-size:15px', 'line-height:1.8', 'color:#111111',
        'word-break:break-word',
      ].join(';');

      el.innerHTML = `
        <div style="padding-bottom:20px;margin-bottom:24px;border-bottom:2px solid #111">
          <h1 style="font-size:28px;font-weight:800;margin:0 0 12px;line-height:1.25">${note.title}</h1>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <span style="background:#111;color:#fff;padding:4px 14px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:.03em">${note.category}</span>
            ${dateStr ? `<span style="font-size:13px;color:#666;font-weight:600">${dateStr}</span>` : ''}
          </div>
        </div>
        <div style="font-size:15px;line-height:1.85;color:#222">
          <style>
            h1{font-size:24px;font-weight:800;margin:24px 0 10px}
            h2{font-size:20px;font-weight:700;margin:20px 0 8px}
            h3{font-size:17px;font-weight:700;margin:16px 0 6px}
            p{margin:0 0 12px}
            ul,ol{padding-left:24px;margin:0 0 12px}
            li{margin-bottom:4px}
            blockquote{border-left:4px solid #ccc;padding:8px 16px;color:#555;margin:14px 0;font-style:italic;background:#fafafa}
            code{background:#f3f4f6;padding:1px 6px;border-radius:4px;font-family:'Courier New',monospace;font-size:13px;color:#c0392b}
            pre{background:#f3f4f6;padding:16px;border-radius:8px;margin-bottom:12px;overflow-wrap:break-word}
            pre code{background:none;padding:0;color:#111}
            img{max-width:100%;height:auto;border-radius:8px;margin:12px 0;display:block}
            strong,b{font-weight:700}
            em,i{font-style:italic}
            hr{border:none;border-top:2px solid #e5e7eb;margin:20px 0}
            table{width:100%;border-collapse:collapse;margin-bottom:12px;font-size:14px}
            th,td{border:1px solid #d1d5db;padding:8px 10px;text-align:left}
            th{background:#f3f4f6;font-weight:700}
          </style>
          ${note.content}
        </div>
        <div style="margin-top:48px;padding-top:14px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center">
          Diekspor dari Tananotes &nbsp;·&nbsp; ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      `;

      document.body.appendChild(el);

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 794,
      });

      document.body.removeChild(el);

      const imgData  = canvas.toDataURL('image/png');
      const pdf      = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW     = pdf.internal.pageSize.getWidth();
      const pdfH     = pdf.internal.pageSize.getHeight();
      const imgH     = (canvas.height * pdfW) / canvas.width;

      let left = imgH;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfW, imgH);
      left -= pdfH;
      while (left > 0) {
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -(imgH - left), pdfW, imgH);
        left -= pdfH;
      }

      pdf.save(`${filename}.pdf`);

    } catch (err) {
      console.error('PDF export error:', err);
      alert('Gagal mengekspor PDF. Silakan coba lagi.');
    } finally {
      setLoading(null);
    }
  };

  const ITEMS = [
    {
      key:     'pdf' as const,
      label:   'PDF Document',
      desc:    'Download langsung sebagai .pdf',
      icon:    FileText,
      iconBg:  'bg-red-50',
      iconCl:  'text-red-500',
      action:  exportAsPDF,
    },
    {
      key:     'md' as const,
      label:   'Markdown (.md)',
      desc:    'Kompatibel dengan Obsidian, Notion',
      icon:    FileDown,
      iconBg:  'bg-blue-50',
      iconCl:  'text-blue-500',
      action:  exportAsMarkdown,
    },
    {
      key:     'txt' as const,
      label:   'Plain Text (.txt)',
      desc:    'Universal, ringan',
      icon:    FileType,
      iconBg:  'bg-green-50',
      iconCl:  'text-green-600',
      action:  exportAsTxt,
    },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(v => !v)}
        disabled={loading !== null}
        className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-black font-bold text-[13px] transition-all select-none
          ${isOpen
            ? 'bg-black text-white shadow-none translate-y-[1px]'
            : 'bg-white shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:-translate-y-[1px]'}
          disabled:opacity-60 disabled:cursor-not-allowed`}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} />
        ) : (
          <Download className="w-4 h-4" strokeWidth={2.5} />
        )}
        Export
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-white border-2 border-black rounded-2xl overflow-hidden shadow-[5px_5px_0px_rgba(0,0,0,1)] z-50 min-w-[230px]">
          <div className="px-4 py-2.5 bg-gray-50 border-b-2 border-black">
            <p className="text-[10px] font-extrabold text-gray-400 tracking-widest uppercase">Export sebagai</p>
          </div>

          {ITEMS.map(({ key, label, desc, icon: Icon, iconBg, iconCl, action }, idx) => (
            <button
              key={key}
              onClick={action}
              className={`w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-gray-50 transition-colors
                ${idx < ITEMS.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${iconCl}`} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold leading-tight">{label}</p>
                <p className="text-[11px] text-gray-400 font-semibold mt-0.5">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
