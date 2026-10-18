// ---------------------------------------------------------------------------
// Popover de link: criar, editar, visitar, copiar e remover
// ---------------------------------------------------------------------------

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ExternalLink, Trash2, X } from 'lucide-react';
import type { EditableApi } from './EditableText';

interface LinkPopoverProps {
  blockId: string;
  x: number;
  y: number;
  initialUrl: string | null;
  api: EditableApi | null;
  onClose: () => void;
}

export function LinkPopover({ blockId, x, y, initialUrl, api, onClose }: LinkPopoverProps) {
  const [url, setUrl] = useState(initialUrl ?? '');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState({ x, y });

  useEffect(() => {
    inputRef.current?.focus();
    if (initialUrl) inputRef.current?.select();
  }, [initialUrl]);

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
    if (rect.right > window.innerWidth - 12) nx = Math.max(12, window.innerWidth - rect.width - 12);
    if (rect.bottom > window.innerHeight - 12) ny = Math.max(12, y - rect.height - 40);
    setPos({ x: nx, y: ny });
  }, [x, y]);

  void blockId;

  const apply = () => {
    api?.applyFormat({ link: url.trim() || undefined });
    onClose();
  };

  const remove = () => {
    api?.applyFormat({ link: undefined });
    onClose();
  };

  const visit = () => {
    if (initialUrl) window.open(initialUrl, '_blank', 'noopener');
    onClose();
  };

  const copy = async () => {
    if (initialUrl) {
      try {
        await navigator.clipboard.writeText(initialUrl);
      } catch {
        /* clipboard indisponível */
      }
    }
    onClose();
  };

  return (
    <div
      ref={ref}
      className="link-popover"
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="link-popover-head">
        <span className="link-popover-title">{initialUrl ? 'Editar link' : 'Adicionar link'}</span>
        <button className="lp-close" title="Fechar" onClick={onClose}>
          <X size={13} />
        </button>
      </div>
      <input
        ref={inputRef}
        className="link-popover-input"
        type="url"
        placeholder="https://…"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') apply();
          if (e.key === 'Escape') onClose();
        }}
      />
      <div className="link-popover-actions">
        <button className="lp-btn" onClick={apply} disabled={!url.trim() && !initialUrl}>
          Aplicar
        </button>
        {initialUrl && (
          <>
            <button className="lp-btn" title="Visitar" onClick={visit}>
              <ExternalLink size={13} />
            </button>
            <button className="lp-btn" title="Copiar link" onClick={copy}>
              Copiar
            </button>
            <button className="lp-btn is-danger" title="Remover link" onClick={remove}>
              <Trash2 size={13} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
