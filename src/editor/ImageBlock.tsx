// ---------------------------------------------------------------------------
// Bloco de imagem: enviar, substituir e legenda
// ---------------------------------------------------------------------------

import { useRef } from 'react';
import { ImagePlus, RefreshCw } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { readFileAsDataURL } from '@/lib/files';
import type { Block } from '@/types';

export function ImageBlock({ block }: { block: Block }) {
  const updateBlock = useAppStore((s) => s.updateBlock);
  const fileRef = useRef<HTMLInputElement>(null);
  const src = block.image?.src ?? '';
  const caption = block.image?.caption ?? '';

  const applyFile = async (file: File | undefined) => {
    if (!file) return;
    const url = await readFileAsDataURL(file);
    updateBlock(block.id, { image: { src: url, caption } });
  };

  return (
    <div className="image-block">
      {src ? (
        <div className="image-frame">
          <img src={src} alt={caption} />
          <button
            className="image-replace"
            title="Substituir imagem"
            onClick={() => fileRef.current?.click()}
          >
            <RefreshCw size={13} /> Substituir
          </button>
        </div>
      ) : (
        <button className="image-empty" onClick={() => fileRef.current?.click()}>
          <ImagePlus size={22} />
          <span>Escolher imagem</span>
        </button>
      )}
      {(src || caption) && (
        <input
          className="image-caption"
          value={caption}
          placeholder="Escreva uma legenda…"
          onChange={(e) => updateBlock(block.id, { image: { src, caption: e.target.value } })}
        />
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden-file"
        onChange={async (e) => {
          await applyFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
