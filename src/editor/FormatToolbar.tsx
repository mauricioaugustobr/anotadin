// ---------------------------------------------------------------------------
// Barra de formatação flutuante (aparece ao selecionar texto)
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';
import { Bold, Code2, Eraser, Italic, Link2, Strikethrough, Underline } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import type { RichSegment } from '@/types';
import type { EditableApi } from './EditableText';

interface FormatToolbarProps {
  blockId: string;
  x: number;
  y: number;
  api: EditableApi | null;
  onClose: () => void;
  onOpenLink: () => void;
}

const BUTTONS: Array<{ key: keyof RichSegment; title: string; icon: React.ReactNode }> = [
  { key: 'bold', title: 'Negrito (Ctrl+B)', icon: <Bold size={15} /> },
  { key: 'italic', title: 'Itálico (Ctrl+I)', icon: <Italic size={15} /> },
  { key: 'underline', title: 'Sublinhado (Ctrl+U)', icon: <Underline size={15} /> },
  { key: 'strikethrough', title: 'Riscado', icon: <Strikethrough size={15} /> },
  { key: 'code', title: 'Código (Ctrl+E)', icon: <Code2 size={15} /> },
];

export function FormatToolbar({ blockId, x, y, api, onClose, onOpenLink }: FormatToolbarProps) {
  const content = useAppStore((s) => s.blocks[blockId]?.content);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let nx = x - rect.width / 2;
    let ny = y - rect.height - 10;
    nx = Math.max(8, Math.min(nx, window.innerWidth - rect.width - 8));
    if (ny < 8) ny = y + 14;
    setPos({ x: nx, y: ny });
  }, [x, y]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!api) return null;

  const caret = api.getCaret();
  const seg = content && caret ? content[Math.min(caret.idx, content.length - 1)] : undefined;

  const isActive = (key: keyof RichSegment) => !!seg && !!seg[key];

  return (
    <div
      ref={ref}
      className="format-toolbar"
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {BUTTONS.map((b) => (
        <button
          key={b.key}
          className={`tb-btn${isActive(b.key) ? ' is-active' : ''}`}
          title={b.title}
          onMouseDown={(e) => {
            e.preventDefault();
            api.applyFormat({ [b.key]: true } as Partial<RichSegment>);
          }}
        >
          {b.icon}
        </button>
      ))}
      <button
        className="tb-btn"
        title="Link (Ctrl+K)"
        onMouseDown={(e) => {
          e.preventDefault();
          onOpenLink();
        }}
      >
        <Link2 size={15} />
      </button>
      <span className="tb-sep" />
      <button
        className="tb-btn"
        title="Limpar formatação"
        onMouseDown={(e) => {
          e.preventDefault();
          api.clearFormat();
        }}
      >
        <Eraser size={15} />
      </button>
    </div>
  );
}
