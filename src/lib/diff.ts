// Diff de texto por palavras (Myers), usado para mostrar o que mudou entre
// duas revisões de um relatório. Sem dependência externa — projeto não usa
// nenhuma lib de diff.

export type DiffOp = { type: 'equal' | 'insert' | 'delete'; value: string };

function tokenize(text: string): string[] {
  return text.split(/(\s+)/).filter((t) => t.length > 0);
}

export function diffWords(oldText: string, newText: string): DiffOp[] {
  const a = tokenize(oldText);
  const b = tokenize(newText);
  const n = a.length;
  const m = b.length;
  const max = n + m;

  const v: Record<number, number> = { 1: 0 };
  const trace: Record<number, number>[] = [];
  let d = 0;

  outer: for (d = 0; d <= max; d++) {
    trace.push({ ...v });
    for (let k = -d; k <= d; k += 2) {
      let x: number;
      if (k === -d || (k !== d && v[k - 1] < v[k + 1])) {
        x = v[k + 1];
      } else {
        x = v[k - 1] + 1;
      }
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v[k] = x;
      if (x >= n && y >= m) break outer;
    }
  }

  const ops: DiffOp[] = [];
  let x = n;
  let y = m;

  for (let depth = d; depth > 0; depth--) {
    const vPrev = trace[depth];
    const k = x - y;
    const prevK = k === -depth || (k !== depth && vPrev[k - 1] < vPrev[k + 1]) ? k + 1 : k - 1;
    const prevX = vPrev[prevK];
    const prevY = prevX - prevK;

    while (x > prevX && y > prevY) {
      ops.push({ type: 'equal', value: a[x - 1] });
      x--;
      y--;
    }

    if (x === prevX) {
      ops.push({ type: 'insert', value: b[y - 1] });
      y--;
    } else {
      ops.push({ type: 'delete', value: a[x - 1] });
      x--;
    }
  }
  while (x > 0 && y > 0) {
    ops.push({ type: 'equal', value: a[x - 1] });
    x--;
    y--;
  }

  ops.reverse();

  const merged: DiffOp[] = [];
  for (const op of ops) {
    const last = merged[merged.length - 1];
    if (last && last.type === op.type) {
      last.value += op.value;
    } else {
      merged.push({ ...op });
    }
  }
  return merged;
}
