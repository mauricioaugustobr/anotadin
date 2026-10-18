// ---------------------------------------------------------------------------
// Menu flutuante genérico (menus de contexto e menus de bloco)
// ---------------------------------------------------------------------------

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface MenuItemSpec {
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  /** Submenu: renderizado no lugar da lista principal. */
  children?: MenuItemSpec[];
}

interface MenuProps {
  x: number;
  y: number;
  items: MenuItemSpec[];
  onClose: () => void;
  minWidth?: number;
}

export function Menu({ x, y, items, onClose, minWidth = 200 }: MenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });
  const [sub, setSub] = useState<{ title: string; items: MenuItemSpec[] } | null>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let nx = x;
    let ny = y;
    if (rect.bottom > window.innerHeight - 12) ny = Math.max(12, y - rect.height - 12);
    if (rect.right > window.innerWidth - 12) nx = Math.max(12, window.innerWidth - rect.width - 12);
    setPos({ x: nx, y: ny });
  }, [x, y, sub]);

  const shown = sub ? sub.items : items;

  return (
    <div
      ref={ref}
      className="menu"
      style={{ left: pos.x, top: pos.y, minWidth }}
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => e.stopPropagation()}
    >
      {sub && (
        <button className="menu-item menu-back" onClick={() => setSub(null)}>
          <ChevronLeft size={14} />
          <span>{sub.title}</span>
        </button>
      )}
      {shown.map((item, i) =>
        item.children ? (
          <button
            key={i}
            className="menu-item"
            onClick={() => setSub({ title: item.label, items: item.children! })}
          >
            {item.icon && <span className="menu-icon">{item.icon}</span>}
            <span className="menu-label">{item.label}</span>
            <ChevronRight size={14} className="menu-chevron" />
          </button>
        ) : (
          <button
            key={i}
            className={`menu-item${item.danger ? ' is-danger' : ''}${item.disabled ? ' is-disabled' : ''}`}
            disabled={item.disabled}
            onClick={() => {
              if (item.onClick) {
                onClose();
                item.onClick();
              }
            }}
          >
            {item.icon && <span className="menu-icon">{item.icon}</span>}
            <span className="menu-label">{item.label}</span>
          </button>
        )
      )}
    </div>
  );
}
