// ---------------------------------------------------------------------------
// Seletor de emojis / ícone por imagem
// ---------------------------------------------------------------------------

import { useRef } from 'react';
import { Dices, ImagePlus, X } from 'lucide-react';
import { readFileAsDataURL } from '@/lib/files';

export const EMOJIS = [
  '📝', '📌', '📚', '📅', '📊', '📈', '📋', '🗂️', '📁', '📄', '📃', '✏️', '🖊️', '🗒️',
  '💡', '💭', '🧠', '⚡', '✨', '🔥', '⭐', '🌟', '💎', '🎯', '🎨', '🎵', '🎮', '🧩',
  '🚀', '🌱', '🍀', '🌈', '🌍', '🌙', '☀️', '☕', '🍕', '💼', '🏠', '💰', '🛒', '✅',
  '❗', '❓', '🔍', '🔒', '🔓', '🔖', '🏷️', '🧷', '📍', '🚩', '🎁', '🏆', '🥇', '❤️',
  '👍', '👏', '🙌', '💪', '🎉', '🐣', '🦄', '🐙', '🦋', '🌊', '🧭', '🔧', '🛠️', '🗓️',
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onRemove?: () => void;
  onUploadImage?: (dataUrl: string) => void;
  onRandom?: () => void;
}

export function EmojiPicker({ onSelect, onRemove, onUploadImage, onRandom }: EmojiPickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="emoji-picker" onMouseDown={(e) => e.preventDefault()}>
      <div className="emoji-picker-head">
        <span>Ícone</span>
        <div className="emoji-picker-tools">
          {onRandom && (
            <button
              className="emoji-random"
              title="Ícone aleatório"
              onClick={(e) => {
                e.stopPropagation();
                onRandom();
              }}
            >
              <Dices size={14} /> Aleatório
            </button>
          )}
          {onUploadImage && (
            <button
              className="emoji-random"
              title="Enviar uma imagem como ícone"
              onClick={(e) => {
                e.stopPropagation();
                fileRef.current?.click();
              }}
            >
              <ImagePlus size={14} /> Imagem
            </button>
          )}
        </div>
      </div>
      <div className="emoji-grid">
        {EMOJIS.map((em) => (
          <button key={em} className="emoji-cell" onClick={() => onSelect(em)}>
            {em}
          </button>
        ))}
      </div>
      {onRemove && (
        <button className="emoji-remove" onClick={onRemove}>
          <X size={13} /> Remover ícone
        </button>
      )}
      {onUploadImage && (
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden-file"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              const url = await readFileAsDataURL(file);
              onUploadImage(url);
            }
            e.target.value = '';
          }}
        />
      )}
    </div>
  );
}
