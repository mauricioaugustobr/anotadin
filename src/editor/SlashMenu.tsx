// ---------------------------------------------------------------------------
// Menu de comandos "/" — popover com lista filtrada de tipos de bloco
// ---------------------------------------------------------------------------

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronRight,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  LayoutGrid,
  Lightbulb,
  List,
  ListCollapse,
  ListOrdered,
  ListTodo,
  Minus,
  Quote,
  Table,
  Type,
} from 'lucide-react';
import type { BlockType } from '@/types';
import { filterSlash } from './slashCommands';
import type { SlashCommand } from './slashCommands';

const ICONS: Record<BlockType, React.ReactNode> = {
  paragraph: <Type size={16} />,
  heading_1: <Heading1 size={16} />,
  heading_2: <Heading2 size={16} />,
  heading_3: <Heading3 size={16} />,
  toggle_heading_1: <ChevronRight size={16} />,
  toggle_heading_2: <ChevronRight size={16} />,
  toggle_heading_3: <ChevronRight size={16} />,
  bulleted_list: <List size={16} />,
  numbered_list: <ListOrdered size={16} />,
  to_do: <ListTodo size={16} />,
  toggle: <ListCollapse size={16} />,
  quote: <Quote size={16} />,
  callout: <Lightbulb size={16} />,
  code: <Code2 size={16} />,
  image: <ImageIcon size={16} />,
  table: <Table size={16} />,
  columns: <LayoutGrid size={16} />,
  divider: <Minus size={16} />,
};

interface SlashMenuProps {
  x: number;
  y: number;
  query: string;
  active: number;
  onActiveChange: (index: number) => void;
  onSelect: (cmd: SlashCommand) => void;
  onClose: () => void;
}

export function SlashMenu({ x, y, query, active, onActiveChange, onSelect, onClose }: SlashMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });
  const cmds = useMemo(() => filterSlash(query), [query]);
  const safeActive = Math.min(active, Math.max(0, cmds.length - 1));

  // Fecha ao clicar fora.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);

  // Ajusta a posição ao viewport.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let nx = x;
    let ny = y;
    if (rect.bottom > window.innerHeight - 12) ny = Math.max(12, y - rect.height - 40);
    if (rect.right > window.innerWidth - 12) nx = Math.max(12, window.innerWidth - rect.width - 12);
    setPos({ x: nx, y: ny });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x, y, query]);

  // Mantém o item ativo visível.
  useEffect(() => {
    const el = ref.current?.querySelector('.slash-item.is-active');
    el?.scrollIntoView({ block: 'nearest' });
  }, [safeActive]);

  return (
    <div
      ref={ref}
      className="slash-menu"
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="slash-title">Blocos básicos</div>
      {cmds.length === 0 ? (
        <div className="slash-empty">Sem resultados para “{query}”</div>
      ) : (
        cmds.map((c, i) => (
          <button
            key={c.type}
            className={`slash-item${i === safeActive ? ' is-active' : ''}`}
            onMouseEnter={() => onActiveChange(i)}
            onClick={() => onSelect(c)}
          >
            <span className="slash-item-icon">{ICONS[c.type]}</span>
            <span className="slash-item-label">{c.label}</span>
          </button>
        ))
      )}
    </div>
  );
}
