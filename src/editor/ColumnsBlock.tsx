// ---------------------------------------------------------------------------
// Bloco de colunas de texto lado a lado
// ---------------------------------------------------------------------------

import { Plus, X } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { uid } from '@/lib/id';
import { emptyText, isEmptyContent, type Caret } from '@/lib/richText';
import type { Block, ColumnData, RichText } from '@/types';
import { EditableText } from './EditableText';

export function ColumnsBlock({ block }: { block: Block }) {
  const updateBlock = useAppStore((s) => s.updateBlock);
  const columns = block.columns ?? [];

  const setColumns = (next: ColumnData[]) => {
    updateBlock(block.id, { columns: next });
  };

  const setText = (index: number, text: RichText, _caret: Caret) => {
    void _caret;
    setColumns(columns.map((col, i) => (i === index ? { ...col, text } : col)));
  };

  const addColumn = () => {
    if (columns.length >= 4) return;
    setColumns([...columns, { id: uid(), text: emptyText() }]);
  };

  const removeColumn = (index: number) => {
    if (columns.length <= 1) return;
    setColumns(columns.filter((_, i) => i !== index));
  };

  return (
    <div className="columns-block">
      <div className="columns-row">
        {columns.map((col, i) => (
          <div key={col.id} className="column-item">
            <EditableText
              blockId={`${block.id}::col${i}`}
              value={col.text}
              onInput={(value) => setText(i, value, { idx: 0, offset: 0 })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.preventDefault();
              }}
              className={`column-editable${isEmptyContent(col.text) ? ' is-empty' : ''}`}
              placeholder={`Coluna ${i + 1}`}
            />
            {columns.length > 1 && (
              <button
                className="column-remove"
                title="Remover coluna"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => removeColumn(i)}
              >
                <X size={11} />
              </button>
            )}
          </div>
        ))}
        {columns.length < 4 && (
          <button className="column-add" title="Adicionar coluna" onClick={addColumn}>
            <Plus size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
