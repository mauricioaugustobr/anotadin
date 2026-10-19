// ---------------------------------------------------------------------------
// Editor de etiquetas da página
// ---------------------------------------------------------------------------

import { useMemo, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { collectTags, tagColor } from '@/lib/tags';
import type { Page } from '@/types';

export function TagEditor({ page }: { page: Page }) {
  const pages = useAppStore((s) => s.pages);
  const updatePage = useAppStore((s) => s.updatePage);
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const tags = page.tags ?? [];
  const suggestions = useMemo(() => collectTags(pages).map((t) => t.name), [pages]);

  const addTag = (raw: string) => {
    const name = raw.trim();
    if (!name) return;
    if (!tags.some((t) => t.toLowerCase() === name.toLowerCase())) {
      updatePage(page.id, { tags: [...tags, name] }, 'structural');
    }
    setValue('');
    setAdding(true);
    inputRef.current?.focus();
  };

  const removeTag = (name: string) => {
    updatePage(page.id, { tags: tags.filter((t) => t !== name) }, 'structural');
  };

  return (
    <div className="page-tags">
      {tags.map((tag) => (
        <span key={tag} className={`tag-chip tag-${tagColor(tag)}`}>
          {tag}
          <button className="tag-remove" title="Remover etiqueta" onClick={() => removeTag(tag)}>
            <X size={10} />
          </button>
        </span>
      ))}
      {adding ? (
        <span className="tag-input-wrap">
          <input
            ref={inputRef}
            className="tag-input"
            list="anotadin-tags"
            placeholder="Nova etiqueta…"
            value={value}
            autoFocus
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag(value);
              }
              if (e.key === 'Escape') {
                setAdding(false);
                setValue('');
              }
            }}
            onBlur={() => {
              if (!value.trim()) setAdding(false);
            }}
          />
          <datalist id="anotadin-tags">
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </span>
      ) : (
        <button className="tag-add" onClick={() => setAdding(true)}>
          <Plus size={11} /> Etiqueta
        </button>
      )}
    </div>
  );
}
