// ---------------------------------------------------------------------------
// Bloco de tabela editável (células em texto simples)
// ---------------------------------------------------------------------------

import { useRef } from 'react';
import { Plus } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import type { Block } from '@/types';

interface CellPos {
  r: number;
  c: number;
}

export function TableBlock({
  block,
  onCellFocus,
}: {
  block: Block;
  onCellFocus: (pos: CellPos | null) => void;
}) {
  const updateBlock = useAppStore((s) => s.updateBlock);
  const cells = block.table?.cells ?? [];
  const cols = cells[0]?.length ?? 0;
  const gridRef = useRef<HTMLDivElement>(null);

  const commit = (next: string[][]) => {
    updateBlock(block.id, { table: { cells: next } });
  };

  const setCell = (r: number, c: number, value: string) => {
    const next = cells.map((row) => [...row]);
    if (!next[r]) return;
    next[r][c] = value;
    commit(next);
  };

  const addRow = () => {
    commit([...cells.map((row) => [...row]), new Array(cols).fill('')]);
  };

  const addCol = () => {
    commit(cells.map((row) => [...row, '']));
  };

  const focusCell = (r: number, c: number) => {
    const el = gridRef.current?.querySelector<HTMLInputElement>(
      `input[data-cell="${r}-${c}"]`
    );
    if (el) {
      el.focus();
      el.select();
    }
  };

  const handleEnter = (e: React.KeyboardEvent<HTMLInputElement>, r: number, c: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (r + 1 < cells.length) focusCell(r + 1, c);
      else {
        addRow();
        requestAnimationFrame(() => focusCell(r + 1, c));
      }
    }
  };

  return (
    <div className="table-block">
      <div
        ref={gridRef}
        className="table-grid"
        style={{ gridTemplateColumns: `repeat(${Math.max(cols, 1)}, minmax(90px, 1fr))` }}
      >
        {cells.map((row, r) =>
          row.map((value, c) => (
            <input
              key={`${r}-${c}`}
              data-cell={`${r}-${c}`}
              className={`table-cell${r === 0 ? ' is-header' : ''}`}
              value={value}
              placeholder={r === 0 ? 'Cabeçalho' : ''}
              onFocus={() => onCellFocus({ r, c })}
              onBlur={() => onCellFocus(null)}
              onChange={(e) => setCell(r, c, e.target.value)}
              onKeyDown={(e) => handleEnter(e, r, c)}
            />
          ))
        )}
      </div>
      <div className="table-tools">
        <button className="table-tool" onClick={addRow}>
          <Plus size={12} /> Linha
        </button>
        <button className="table-tool" onClick={addCol}>
          <Plus size={12} /> Coluna
        </button>
      </div>
    </div>
  );
}

/** Operações de tabela usadas pelo menu do bloco. */
export function tableOps(block: Block) {
  const cells = block.table?.cells ?? [];
  const rows = cells.length;
  const cols = cells[0]?.length ?? 0;
  return {
    cells,
    rows,
    cols,
    addRowAt: (after: number): string[][] => {
      const next = cells.map((row) => [...row]);
      next.splice(after + 1, 0, new Array(cols).fill(''));
      return next;
    },
    addColAt: (after: number): string[][] =>
      cells.map((row) => {
        const next = [...row];
        next.splice(after + 1, 0, '');
        return next;
      }),
    removeRowAt: (r: number): string[][] =>
      rows > 1 ? cells.filter((_, i) => i !== r).map((row) => [...row]) : cells.map((row) => [...row]),
    removeColAt: (c: number): string[][] =>
      cols > 1 ? cells.map((row) => row.filter((_, i) => i !== c)) : cells.map((row) => [...row]),
  };
}
