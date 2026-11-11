import { Fragment, ReactNode } from 'react';

// Renderizador mínimo do Markdown que os relatórios da IA usam (títulos,
// negrito, itálico, listas — inclusive aninhadas —, citações, tabelas,
// parágrafos). Monta elementos React — nada de innerHTML — então o texto
// da IA nunca vira HTML executável.

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
const LIST_ITEM = /^(\s*)([-*]|\d+[.)])\s+(.*)$/;
const indentOf = (line: string) => line.match(/^\s*/)![0].replace(/\t/g, '  ').length;

interface ListNode {
  ordered: boolean;
  items: { text: string; children: ListNode | null }[];
}

// Lê uma lista a partir de `start`, usando o recuo para montar os níveis.
// Itens com recuo maior que o do primeiro viram sublista do item anterior.
function parseList(lines: string[], start: number): { node: ListNode; next: number } {
  const first = lines[start].match(LIST_ITEM)!;
  const baseIndent = indentOf(lines[start]);
  const node: ListNode = { ordered: /\d/.test(first[2]), items: [] };
  let i = start;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      // Linha em branco dentro da lista: continua só se a próxima for item.
      if (i + 1 < lines.length && LIST_ITEM.test(lines[i + 1]) && indentOf(lines[i + 1]) >= baseIndent) { i++; continue; }
      break;
    }
    const match = line.match(LIST_ITEM);
    if (!match) break;
    const indent = indentOf(line);
    if (indent < baseIndent) break;
    if (indent > baseIndent && node.items.length > 0) {
      const sub = parseList(lines, i);
      node.items[node.items.length - 1].children = sub.node;
      i = sub.next;
      continue;
    }
    node.items.push({ text: match[3], children: null });
    i++;
  }
  return { node, next: i };
}

function renderList(node: ListNode, key: string): ReactNode {
  const ListTag = node.ordered ? 'ol' : 'ul';
  return (
    <ListTag key={key} className={`${node.ordered ? 'list-decimal' : 'list-disc'} pl-5 space-y-1 my-1.5`}>
      {node.items.map((item, k) => (
        <li key={k}>
          {renderInline(item.text)}
          {item.children && renderList(item.children, `${key}-${k}`)}
        </li>
      ))}
    </ListTag>
  );
}

function renderBlocks(content: string): ReactNode[] {
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

    if (trimmed.startsWith('>')) {
      const quoted: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoted.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      blocks.push(
        <blockquote key={`q${i}`} className="border-l-4 border-gold-400 bg-white/70 rounded-r-lg pl-4 pr-3 py-1 my-3">
          {renderBlocks(quoted.join('\n'))}
        </blockquote>
      );
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

    if (LIST_ITEM.test(line)) {
      const { node, next } = parseList(lines, i);
      blocks.push(renderList(node, `l${i}`));
      i = next;
      continue;
    }

    const paragraph: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,4})\s+/.test(lines[i].trim()) &&
      !LIST_ITEM.test(lines[i]) &&
      !lines[i].trim().startsWith('|') &&
      !lines[i].trim().startsWith('>')
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

  return blocks;
}

export function SimpleMarkdown({ content }: { content: string }) {
  return <div className="text-sm text-dark/80 leading-relaxed">{renderBlocks(content)}</div>;
}

// Texto da seção cujo título (## ...) contém `titleMatch`, até o próximo
// título do mesmo nível ou acima. Usado pra copiar só a síntese do prontuário.
export function extractSection(content: string, titleMatch: RegExp): string | null {
  const lines = content.split('\n');
  const startIdx = lines.findIndex((l) => /^#{1,3}\s+/.test(l.trim()) && titleMatch.test(l));
  if (startIdx === -1) return null;
  const level = lines[startIdx].trim().match(/^#+/)![0].length;
  let end = lines.length;
  for (let j = startIdx + 1; j < lines.length; j++) {
    const h = lines[j].trim().match(/^(#+)\s+/);
    if (h && h[1].length <= level) { end = j; break; }
  }
  return lines.slice(startIdx + 1, end).join('\n').trim();
}

// Remove a marcação Markdown pra colar em prontuário/documento comum.
export function markdownToPlainText(content: string): string {
  return content
    .split('\n')
    .map((line) =>
      line
        .replace(/^\s*>\s?/, '')
        .replace(/^\s*#{1,6}\s+/, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/^(\s*)[-*]\s+/, '$1• ')
        .trimEnd()
    )
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
