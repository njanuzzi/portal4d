import { Fragment, ReactNode } from 'react';

// Renderizador mínimo do Markdown que os relatórios da IA usam (títulos,
// negrito, itálico, listas, tabelas, parágrafos). Monta elementos React —
// nada de innerHTML — então o texto da IA nunca vira HTML executável.

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={i} className="font-semibold text-dark">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function splitRow(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

const isTableSeparator = (line: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);

export function SimpleMarkdown({ content }: { content: string }) {
  const lines = content.split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) { i++; continue; }

    const heading = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      const className = level <= 2
        ? 'font-serif font-semibold text-dark text-base mt-5 mb-2'
        : 'font-semibold text-dark text-sm mt-4 mb-1.5';
      blocks.push(<p key={i} className={className}>{renderInline(heading[2])}</p>);
      i++;
      continue;
    }

    if (trimmed.startsWith('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const header = splitRow(trimmed);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      blocks.push(
        <div key={`t${i}`} className="overflow-x-auto my-3">
          <table className="w-full text-sm border border-beige-200 rounded-lg">
            <thead className="bg-beige-100">
              <tr>
                {header.map((cell, c) => (
                  <th key={c} className="text-left font-semibold text-dark px-3 py-2 border-b border-beige-200">{renderInline(cell)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r} className="border-b border-beige-100 last:border-0 align-top">
                  {row.map((cell, c) => <td key={c} className="px-3 py-2">{renderInline(cell)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (/^[-*]\s+/.test(trimmed) || /^\d+[.)]\s+/.test(trimmed)) {
      const ordered = /^\d+[.)]\s+/.test(trimmed);
      const items: string[] = [];
      while (i < lines.length && (ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*]\s+/).test(lines[i])) {
        items.push(lines[i].trim().replace(ordered ? /^\d+[.)]\s+/ : /^[-*]\s+/, ''));
        i++;
      }
      const ListTag = ordered ? 'ol' : 'ul';
      blocks.push(
        <ListTag key={`l${i}`} className={`${ordered ? 'list-decimal' : 'list-disc'} pl-5 space-y-1 my-2`}>
          {items.map((item, k) => <li key={k}>{renderInline(item)}</li>)}
        </ListTag>
      );
      continue;
    }

    const paragraph: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,4})\s+/.test(lines[i].trim()) &&
      !/^\s*([-*]|\d+[.)])\s+/.test(lines[i]) &&
      !lines[i].trim().startsWith('|')
    ) {
      paragraph.push(lines[i].trim());
      i++;
    }
    if (paragraph.length === 0) {
      // Linha que não casou com nenhum bloco (ex.: "|" solto) — mostra como texto.
      blocks.push(<p key={i} className="my-2">{renderInline(trimmed)}</p>);
      i++;
      continue;
    }
    blocks.push(<p key={i} className="my-2">{renderInline(paragraph.join(' '))}</p>);
  }

  return <div className="text-sm text-dark/80 leading-relaxed">{blocks}</div>;
}
