// ---------------------------------------------------------------------------
// EditableText — contentEditable de texto rico, com caret estável,
// formatação inline, atalhos de teclado e colagem controlada.
// ---------------------------------------------------------------------------

import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import {
  applyFormat,
  caretFromDom,
  domToRichText,
  expandToWord,
  getCaret,
  insertTextAt,
  segmentClass,
  setCaret,
  setCaretAtEnd,
  setCaretAtStart,
  type Caret,
  type SelectionRange,
} from '@/lib/richText';
import type { RichSegment, RichText } from '@/types';

/** Caret no fim do conteúdo — usado apenas quando a posição é desconhecida. */
function endCaretOf(content: RichText): Caret {
  const last = content.length > 0 ? content.length - 1 : 0;
  return { idx: last, offset: content[last]?.text.length ?? 0 };
}

export interface EditableApi {
  el: HTMLDivElement;
  focusStart: () => void;
  focusEnd: () => void;
  focusAt: (caret: Caret) => void;
  applyFormat: (patch: Partial<RichSegment>) => void;
  clearFormat: () => void;
  getCaret: () => Caret | null;
  getSelection: () => SelectionRange | null;
  getCaretRect: () => DOMRect | null;
  insertPlainText: (text: string) => void;
  setPendingCaret: (caret: Caret) => void;
}

interface EditableTextProps {
  blockId: string;
  value: RichText;
  onInput: (value: RichText, caret: Caret) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>, caret: Caret | null) => void;
  onPasteMultiline?: (text: string) => void;
  onPasteFiles?: (files: File[]) => void;
  onLinkClick?: (url: string, x: number, y: number) => void;
  onLinkShortcut?: () => void;
  onFocusChanged?: (focused: boolean) => void;
  className?: string;
  placeholder?: string;
  spellCheck?: boolean;
}

export const EditableText = forwardRef<EditableApi, EditableTextProps>(function EditableText(
  props,
  ref
) {
  const {
    blockId,
    value,
    onInput,
    onKeyDown,
    onPasteMultiline,
    onPasteFiles,
    onLinkClick,
    onLinkShortcut,
    onFocusChanged,
    className,
    placeholder,
    spellCheck,
  } = props;

  const rootRef = useRef<HTMLDivElement>(null);
  const pendingCaretRef = useRef<Caret | null>(null);
  const composingRef = useRef(false);

  // Refs espelho para callbacks ficarem sempre atualizados sem re-registrar.
  const valueRef = useRef(value);
  const onInputRef = useRef(onInput);
  const onKeyDownRef = useRef(onKeyDown);
  const onPasteMultilineRef = useRef(onPasteMultiline);
  const onPasteFilesRef = useRef(onPasteFiles);
  const onLinkClickRef = useRef(onLinkClick);
  const onLinkShortcutRef = useRef(onLinkShortcut);
  const onFocusChangedRef = useRef(onFocusChanged);
  valueRef.current = value;
  onInputRef.current = onInput;
  onKeyDownRef.current = onKeyDown;
  onPasteMultilineRef.current = onPasteMultiline;
  onPasteFilesRef.current = onPasteFiles;
  onLinkClickRef.current = onLinkClick;
  onLinkShortcutRef.current = onLinkShortcut;
  onFocusChangedRef.current = onFocusChanged;

  /**
   * Envia o novo conteúdo ao modelo. Quando `caret` é nulo (posição
   * desconhecida), o caret NÃO é reposto — jamais cai no início do bloco,
   * o que invertia a digitação.
   */
  const commit = (next: RichText, caret: Caret | null) => {
    pendingCaretRef.current = caret;
    onInputRef.current(next, caret ?? endCaretOf(next));
  };

  const selectionOf = (): SelectionRange | null => {
    const root = rootRef.current;
    const sel = window.getSelection();
    if (!root || !sel || !sel.rangeCount) return null;
    const a = caretFromDom(root, sel.anchorNode, sel.anchorOffset);
    const f = caretFromDom(root, sel.focusNode, sel.focusOffset);
    if (!a || !f) return null;
    return { anchor: a, focus: f };
  };

  const applyFormatLocal = (patch: Partial<RichSegment>) => {
    const sel = selectionOf();
    if (!sel) return;
    let a = sel.anchor;
    let f = sel.focus;
    const collapsed = a.idx === f.idx && a.offset === f.offset;
    // Criar link com o caret colapsado aplica à palavra sob o cursor.
    if (collapsed && typeof patch.link === 'string' && patch.link !== '') {
      const ex = expandToWord(valueRef.current, a);
      a = ex.anchor;
      f = ex.focus;
    }
    const res = applyFormat(valueRef.current, a, f, patch);
    commit(res.content, res.caret);
  };

  useImperativeHandle(ref, () => ({
    get el() {
      return rootRef.current as HTMLDivElement;
    },
    focusStart() {
      const root = rootRef.current;
      if (!root) return;
      root.focus();
      setCaretAtStart(root);
    },
    focusEnd() {
      const root = rootRef.current;
      if (!root) return;
      root.focus();
      setCaretAtEnd(root);
    },
    focusAt(caret) {
      const root = rootRef.current;
      if (!root) return;
      root.focus();
      setCaret(root, caret);
    },
    applyFormat: applyFormatLocal,
    clearFormat() {
      const sel = selectionOf();
      if (!sel) return;
      applyFormatLocal({
        bold: undefined,
        italic: undefined,
        underline: undefined,
        strikethrough: undefined,
        code: undefined,
        link: undefined,
      });
    },
    getCaret() {
      const root = rootRef.current;
      return root ? getCaret(root) : null;
    },
    getSelection: selectionOf,
    getCaretRect() {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return null;
      const r = sel.getRangeAt(0).getBoundingClientRect();
      return r.width === 0 && r.height === 0 ? null : r;
    },
    insertPlainText(text) {
      const caret =
        getCaret(rootRef.current as HTMLDivElement) ??
        ({
          idx: Math.max(0, valueRef.current.length - 1),
          offset: valueRef.current[valueRef.current.length - 1]?.text.length ?? 0,
        } as Caret);
      const res = insertTextAt(valueRef.current, caret, text);
      commit(res.content, res.caret);
    },
    setPendingCaret(caret) {
      pendingCaretRef.current = caret;
    },
  }));

  // Restaura SEMPRE o caret após o re-render. O Chrome zera a seleção para
  // a posição 0 quando o React escreve `nodeValue` no nó focado, então a
  // seleção pós-commit do navegador não é confiável — reafirmamos a
  // posição conhecida (medida no evento de input, após a inserção).
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    // Remove nós "estrangeiros" que o navegador inseriu diretamente na
    // raiz (ex.: teclado móvel compondo fora dos spans). O React não os
    // gerencia; o conteúdo já foi absorvido pelo modelo na serialização.
    for (const child of Array.from(root.childNodes)) {
      const isSpan =
        child.nodeType === Node.ELEMENT_NODE &&
        (child as HTMLElement).getAttribute('data-idx') !== null;
      if (!isSpan) child.remove();
    }
    const pending = pendingCaretRef.current;
    pendingCaretRef.current = null;
    if (pending === null) return;
    if (document.activeElement !== root) return;
    setCaret(root, pending);
  });

  const syncFromDom = () => {
    const root = rootRef.current;
    if (!root) return;
    const next = domToRichText(root, valueRef.current);
    // Se o caret não puder ser determinado, NÃO o repõe (nunca cair no
    // início do bloco — isso invertia a digitação em teclados móveis).
    const caret = getCaret(root);
    commit(next, caret);
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const native = e.nativeEvent as InputEvent;
    if (native.isComposing) {
      composingRef.current = true;
      return;
    }
    composingRef.current = false;
    syncFromDom();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const mod = e.ctrlKey || e.metaKey;

    // Caret no nível da raiz (acontece ao clicar em bloco vazio ou após
    // colapsos do navegador): move para dentro do span ANTES da inserção
    // padrão do navegador, para o texto nunca nascer fora dos spans.
    const root = rootRef.current;
    if (root) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && sel.anchorNode === root) {
        const mapped = getCaret(root);
        if (mapped) setCaret(root, mapped);
      }
    }

    if (mod && !e.altKey && !e.shiftKey) {
      const k = e.key.toLowerCase();
      if (k === 'b' || k === 'i' || k === 'u' || k === 'e') {
        e.preventDefault();
        const patch: Partial<RichSegment> =
          k === 'b' ? { bold: true } : k === 'i' ? { italic: true } : k === 'u' ? { underline: true } : { code: true };
        applyFormatLocal(patch);
        return;
      }
      if (k === 'k') {
        e.preventDefault();
        onLinkShortcutRef.current?.();
        return;
      }
    }
    const caret = rootRef.current ? getCaret(rootRef.current) : null;
    onKeyDownRef.current?.(e, caret);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const files = Array.from(e.clipboardData.files ?? []);
    if (files.length > 0 && onPasteFilesRef.current) {
      e.preventDefault();
      onPasteFilesRef.current(files);
      return;
    }
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    if (!text) return;
    if (text.includes('\n')) {
      onPasteMultilineRef.current?.(text);
      return;
    }
    const root = rootRef.current;
    const caret =
      (root && getCaret(root)) ??
      ({
        idx: Math.max(0, valueRef.current.length - 1),
        offset: valueRef.current[valueRef.current.length - 1]?.text.length ?? 0,
      } as Caret);
    const res = insertTextAt(valueRef.current, caret, text);
    commit(res.content, res.caret);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const link = target.closest('a');
    if (link) {
      e.preventDefault();
      const href = link.getAttribute('href') ?? '';
      onLinkClickRef.current?.(href, e.clientX, e.clientY);
    }
  };

  const segs = value.length > 0 ? value : [{ text: '' }];

  return (
    <div
      ref={rootRef}
      className={`editable${className ? ` ${className}` : ''}`}
      contentEditable
      suppressContentEditableWarning
      spellCheck={spellCheck ?? true}
      data-editable="true"
      data-block-id={blockId}
      data-placeholder={placeholder ?? ''}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onMouseDown={handleMouseDown}
      onCompositionStart={() => {
        composingRef.current = true;
      }}
      onCompositionEnd={() => {
        composingRef.current = false;
        syncFromDom();
      }}
      onFocus={() => onFocusChangedRef.current?.(true)}
      onBlur={() => {
        pendingCaretRef.current = null;
        onFocusChangedRef.current?.(false);
      }}
    >
      {segs.map((seg, i) => (
        <span key={i} data-idx={i} className={segmentClass(seg)}>
          {seg.link ? (
            <a href={seg.link} rel="noreferrer">
              {seg.text || '\u200B'}
            </a>
          ) : (
            seg.text || '\u200B'
          )}
        </span>
      ))}
    </div>
  );
});
