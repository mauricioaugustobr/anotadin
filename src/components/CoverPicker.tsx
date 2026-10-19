// ---------------------------------------------------------------------------
// Seletor de capa: gradientes prontos ou imagem enviada
// ---------------------------------------------------------------------------

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ImagePlus, Trash2, X } from 'lucide-react';
import { readFileAsDataURL } from '@/lib/files';
import type { PageCover } from '@/types';

export const COVER_GRADIENTS: Array<{ id: string; css: string }> = [
  { id: 'aurora', css: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { id: 'sunset', css: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { id: 'oceano', css: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { id: 'floresta', css: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
  { id: 'chama', css: 'linear-gradient(135deg, #f83600 0%, #f9d423 100%)' },
  { id: 'lavanda', css: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' },
  { id: 'ceu', css: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)' },
  { id: 'areia', css: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)' },
  { id: 'noite', css: 'linear-gradient(135deg, #232526 0%, #414345 100%)' },
  { id: 'rosa', css: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)' },
];

export function coverStyle(cover: PageCover): React.CSSProperties {
  if (cover.type === 'image') {
    return {
      backgroundImage: `url(${cover.value})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }
  const preset = COVER_GRADIENTS.find((g) => g.id === cover.value);
  return { background: preset?.css ?? cover.value };
}

interface CoverPickerProps {
  x: number;
  y: number;
  onSelect: (cover: PageCover) => void;
  onRemove: () => void;
  onClose: () => void;
}

export function CoverPicker({ x, y, onSelect, onRemove, onClose }: CoverPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState({ x, y });

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
    let nx = x - rect.width;
    let ny = y;
    if (nx < 12) nx = 12;
    if (rect.bottom > window.innerHeight - 12) ny = Math.max(12, y - rect.height - 40);
    setPos({ x: nx, y: ny });
  }, [x, y]);

  return (
    <div
      ref={ref}
      className="cover-picker"
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="cover-picker-head">
        <span>Capa da página</span>
        <button className="lp-close" onClick={onClose} title="Fechar">
          <X size={13} />
        </button>
      </div>
      <div className="cover-grid">
        {COVER_GRADIENTS.map((g) => (
          <button
            key={g.id}
            className="cover-swatch"
            style={{ background: g.css }}
            title={g.id}
            onClick={() => onSelect({ type: 'gradient', value: g.id })}
          />
        ))}
      </div>
      <div className="cover-picker-actions">
        <button className="lp-btn" onClick={() => fileRef.current?.click()}>
          <ImagePlus size={13} /> Enviar imagem
        </button>
        <button className="lp-btn is-danger" onClick={onRemove}>
          <Trash2 size={13} /> Remover capa
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden-file"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            const url = await readFileAsDataURL(file);
            onSelect({ type: 'image', value: url });
          }
          e.target.value = '';
        }}
      />
    </div>
  );
}
