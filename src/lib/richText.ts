// ---------------------------------------------------------------------------
// Texto rico: serialização DOM, caret e aplicação de formatação inline
// ---------------------------------------------------------------------------

import type { RichSegment, RichText } from '@/types';

export interface Caret {
  /** Índice do segmento. */
  idx: number;
  /** Deslocamento em caracteres dentro do segmento. */
  offset: number;
}

export function emptyText(): RichText {
  return [{ text: '' }];
}

export function fromPlainText(text: string): RichText {
  return text.length > 0 ? [{ text }] : emptyText();
}

export function textOf(rt: RichText): string {
  return rt.map((s) => s.text).join('');
}

export function isEmptyText(rt: RichText): boolean {
  return rt.length === 0 || (rt.length === 1 && rt[0].text === '');
}

export function isEmptyContent(rt: RichText): boolean {
  return textOf(rt).length === 0;
}

// ---------------------------------------------------------------------------
// Normalização
// ---------------------------------------------------------------------------

function sameStyle(a: RichSegment, b: RichSegment): boolean {
  return (
    !!a.bold === !!b.bold &&
    !!a.italic === !!b.italic &&
    !!a.underline === !!b.underline &&
    !!a.strikethrough === !!b.strikethrough &&
    !!a.code === !!b.code &&
    (a.link ?? null) === (b.link ?? null)
  );
}

/** Junta segmentos adjacentes com o mesmo estilo e garante ≥ 1 segmento. */
export function normalize(rt: RichText): RichText {
  const out: RichText = [];
  for (const seg of rt) {
    const prev = out[out.length - 1];
    if (prev && sameStyle(prev, seg)) {
      prev.text += seg.text;
    } else {
      out.push({ ...seg });
    }
  }
  if (out.length === 0) out.push({ text: '' });
  return out;
}

// ---------------------------------------------------------------------------
// Conversões posição absoluta <-> caret
// ---------------------------------------------------------------------------

export function caretToAbsolute(content: RichText, caret: Caret): number {
  let abs = 0;
  for (let i = 0; i < caret.idx; i++) abs += content[i].text.length;
  return abs + caret.offset;
}

export function absoluteToCaret(content: RichText, abs: number): Caret {
  let pos = Math.max(0, abs);
  for (let i = 0; i < content.length; i++) {
    const len = content[i].text.length;
    if (pos <= len) return { idx: i, offset: pos };
    pos -= len;
  }
  const last = content.length - 1;
  return { idx: last, offset: content[last].text.length };
}

// ---------------------------------------------------------------------------
// Serialização DOM -> modelo
// ---------------------------------------------------------------------------

/**
 * Reconstrói o modelo de texto rico a partir do DOM do contentEditable.
 * Cada <span data-idx="i"> corresponde ao segmento i do modelo base; os
 * estilos são herdados do modelo (o DOM nunca altera estilos sozinho).
 */
export function domToRichText(root: HTMLElement, base: RichText): RichText {
  const out: RichText = [];
  let idx = 0;

  const walk = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = (node.textContent ?? '').replace(/\u200B/g, '');
      if (t) {
        if (out.length === 0) {
          out.push({ ...(base[0] ?? { text: '' }), text: '' });
        }
        out[out.length - 1].text += t;
      }
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const attr = el.getAttribute('data-idx');
    if (attr !== null) {
      idx = Number(attr);
      out.push({ ...(base[idx] ?? { text: '' }), text: '' });
    }
    node.childNodes.forEach(walk);
  };

  walk(root);

  const result = normalize(out);
  // Remove quebras de linha finais que alguns navegadores inserem.
  while (result.length > 0 && result[result.length - 1].text.endsWith('\n')) {
    const last = result[result.length - 1];
    last.text = last.text.slice(0, -1);
    if (last.text === '') result.pop();
  }
  return result.length > 0 ? result : emptyText();
}

// ---------------------------------------------------------------------------
// Caret: leitura e escrita no DOM
// ---------------------------------------------------------------------------

/**
 * Converte um nó DOM + deslocamento em um Caret relativo ao modelo.
 * Retorna null se o ponto estiver fora da raiz.
 */
export function caretFromDom(root: HTMLElement, node: Node | null, offset: number): Caret | null {
  if (!node || !root.contains(node)) return null;

  // Descontar espaços de largura zero (placeholders de segmentos vazios).
  const zwspBefore = (s: string, upto: number): number => {
    let c = 0;
    const max = Math.min(upto, s.length);
    for (let i = 0; i < max; i++) if (s[i] === '\u200B') c++;
    return c;
  };
  const clean = (s: string | null | undefined) => (s ?? '').replace(/\u200B/g, '');

  // Sobe até encontrar o <span data-idx> que contém o ponto.
  let span: HTMLElement | null = null;
  let cur: Node | null = node;
  while (cur && cur !== root) {
    if (cur.nodeType === Node.ELEMENT_NODE) {
      const el = cur as HTMLElement;
      if (el.getAttribute('data-idx') !== null) {
        span = el;
        break;
      }
    }
    cur = cur.parentNode;
  }

  if (!span) {
    // Ponto diretamente na raiz (ex.: bloco vazio recém-focado).
    let off = 0;
    if (node === root) {
      const kids = root.childNodes;
      for (let i = 0; i < offset && i < kids.length; i++) {
        off += clean(kids[i].textContent).length;
      }
    } else {
      let n: Node | null = node.previousSibling;
      while (n) {
        off += clean(n.textContent).length;
        n = n.previousSibling;
      }
      off += offset - zwspBefore(node.textContent ?? '', offset);
    }
    return { idx: 0, offset: off };
  }

  const idx = Number(span.getAttribute('data-idx'));
  let off = 0;
  if (node === span) {
    const kids = span.childNodes;
    for (let i = 0; i < offset && i < kids.length; i++) {
      off += clean(kids[i].textContent).length;
    }
  } else {
    const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT);
    let tn = walker.nextNode();
    while (tn) {
      if (tn === node) {
        off += offset - zwspBefore(tn.textContent ?? '', offset);
        break;
      }
      off += clean(tn.textContent).length;
      tn = walker.nextNode();
    }
  }
  return { idx, offset: off };
}

export function getCaret(root: HTMLElement): Caret | null {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  return caretFromDom(root, sel.anchorNode, sel.anchorOffset);
}

/** Posiciona o caret na raiz conforme o Caret (deslocamentos são limitados). */
export function setCaret(root: HTMLElement, caret: Caret): void {
  const spans = root.querySelectorAll('[data-idx]');
  const span = (spans[caret.idx] ?? spans[spans.length - 1]) as HTMLElement | undefined;
  if (!span) {
    setCaretAtEnd(root);
    return;
  }
  const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT);
  let tn = walker.nextNode();
  let remaining = Math.max(0, caret.offset);
  let target: Node = span;
  let off = 0;
  while (tn) {
    const len = tn.textContent?.length ?? 0;
    if (remaining <= len) {
      target = tn;
      off = remaining;
      break;
    }
    remaining -= len;
    tn = walker.nextNode();
  }
  if (target === span) {
    // Sem nós de texto suficientes: posiciona no final do span.
    const last = span.lastChild;
    target = last && last.nodeType === Node.TEXT_NODE ? last : span;
    off = target === span ? 0 : target.textContent?.length ?? 0;
  }
  const range = document.createRange();
  range.setStart(target, off);
  range.collapse(true);
  const sel = window.getSelection();
  if (sel) {
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

export function setCaretAtEnd(root: HTMLElement): void {
  const spans = root.querySelectorAll('[data-idx]');
  const last = spans[spans.length - 1];
  const range = document.createRange();
  if (last) {
    range.selectNodeContents(last);
    range.collapse(false);
  } else {
    range.selectNodeContents(root);
    range.collapse(false);
  }
  const sel = window.getSelection();
  if (sel) {
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

export function setCaretAtStart(root: HTMLElement): void {
  const spans = root.querySelectorAll('[data-idx]');
  const first = spans[0];
  const range = document.createRange();
  if (first) {
    range.selectNodeContents(first);
    range.collapse(true);
  } else {
    range.selectNodeContents(root);
    range.collapse(true);
  }
  const sel = window.getSelection();
  if (sel) {
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

// ---------------------------------------------------------------------------
// Edição de conteúdo
// ---------------------------------------------------------------------------

export interface EditResult {
  content: RichText;
  caret: Caret;
}

/** Insere texto simples na posição do caret. */
export function insertTextAt(content: RichText, caret: Caret, text: string): EditResult {
  const abs = caretToAbsolute(content, caret);
  const idx = Math.min(caret.idx, content.length - 1);
  const seg = { ...content[idx] };
  const off = Math.min(caret.offset, seg.text.length);
  seg.text = seg.text.slice(0, off) + text + seg.text.slice(off);
  const next = [...content];
  next[idx] = seg;
  const normalized = normalize(next);
  return { content: normalized, caret: absoluteToCaret(normalized, abs + text.length) };
}

export interface SelectionRange {
  anchor: Caret;
  focus: Caret;
}

/**
 * Aplica um patch de estilo ao intervalo selecionado.
 * - Valores `true` alternam (liga/desliga) o estilo.
 * - Valores `undefined` forçam a remoção do estilo.
 */
export function applyFormat(
  content: RichText,
  anchor: Caret,
  focus: Caret,
  patch: Partial<RichSegment>
): EditResult {
  let a = anchor;
  let b = focus;
  if (a.idx > b.idx || (a.idx === b.idx && a.offset > b.offset)) {
    a = focus;
    b = anchor;
  }

  // Seleção colapsada: alterna o estilo no segmento inteiro sob o caret.
  if (a.idx === b.idx && a.offset === b.offset) {
    const seg = content[a.idx] ?? { text: '' };
    const nextPatch: Record<string, string | boolean | undefined> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) {
        // `undefined` força a remoção do estilo.
        nextPatch[k] = undefined;
      } else {
        // Valores definidos alternam (liga/desliga).
        nextPatch[k] = (seg[k as keyof RichSegment] ?? undefined) === v ? undefined : v;
      }
    }
    const next = [...content];
    next[a.idx] = { ...seg, ...(nextPatch as Partial<RichSegment>) };
    return { content: normalize(next), caret: { idx: a.idx, offset: a.offset } };
  }

  const endAbs = caretToAbsolute(content, b);
  const out: RichText = [];

  content.forEach((seg, i) => {
    if (i < a.idx || i > b.idx) {
      out.push(seg);
      return;
    }
    const s = i === a.idx ? Math.min(a.offset, seg.text.length) : 0;
    const e = i === b.idx ? Math.min(b.offset, seg.text.length) : seg.text.length;
    if (s === e && i !== b.idx) {
      out.push(seg);
      return;
    }
    if (i === a.idx && s > 0) {
      out.push({ ...seg, text: seg.text.slice(0, s) });
    }
    if (e > s) {
      out.push({ ...seg, ...patch, text: seg.text.slice(s, e) });
    }
    if (i === b.idx && e < seg.text.length) {
      out.push({ ...seg, text: seg.text.slice(e) });
    }
  });

  const normalized = normalize(out);
  return { content: normalized, caret: absoluteToCaret(normalized, endAbs) };
}

/** Remove todos os estilos do intervalo selecionado. */
export function clearFormat(content: RichText, anchor: Caret, focus: Caret): EditResult {
  return applyFormat(content, anchor, focus, {
    bold: undefined,
    italic: undefined,
    underline: undefined,
    strikethrough: undefined,
    code: undefined,
    link: undefined,
  });
}

/** Divide o conteúdo em dois na posição do caret. */
export function splitContent(content: RichText, caret: Caret): { left: RichText; right: RichText } {
  const left: RichText = [];
  const right: RichText = [];
  content.forEach((seg, i) => {
    if (i < caret.idx) {
      left.push({ ...seg });
    } else if (i > caret.idx) {
      right.push({ ...seg });
    } else {
      const off = Math.min(caret.offset, seg.text.length);
      const l = seg.text.slice(0, off);
      const r = seg.text.slice(off);
      if (l) left.push({ ...seg, text: l });
      if (r) right.push({ ...seg, text: r });
    }
  });
  return { left: left.length ? left : emptyText(), right: right.length ? right : emptyText() };
}

/** Remove o intervalo entre dois carets e normaliza o resultado. */
export function deleteRange(content: RichText, anchor: Caret, focus: Caret): RichText {
  let a = anchor;
  let b = focus;
  if (a.idx > b.idx || (a.idx === b.idx && a.offset > b.offset)) {
    a = focus;
    b = anchor;
  }
  const out: RichText = [];
  content.forEach((seg, i) => {
    if (i < a.idx || i > b.idx) {
      out.push(seg);
      return;
    }
    const s = i === a.idx ? Math.min(a.offset, seg.text.length) : 0;
    const e = i === b.idx ? Math.min(b.offset, seg.text.length) : seg.text.length;
    const t = seg.text.slice(0, s) + seg.text.slice(e);
    if (t || (i !== a.idx && i !== b.idx)) out.push({ ...seg, text: t });
  });
  return normalize(out);
}

/** Expande um caret colapsado para os limites da palavra sob ele. */
export function expandToWord(content: RichText, caret: Caret): SelectionRange {
  const full = textOf(content);
  const abs = Math.min(caretToAbsolute(content, caret), full.length);
  const isWordChar = (c: string) => /[\p{L}\p{N}_\-]/u.test(c);
  let s = abs;
  let e = abs;
  while (s > 0 && isWordChar(full[s - 1] ?? '')) s--;
  while (e < full.length && isWordChar(full[e] ?? '')) e++;
  return {
    anchor: absoluteToCaret(content, s),
    focus: absoluteToCaret(content, e),
  };
}

/** Classe CSS de um segmento (usada na renderização). */
export function segmentClass(s: RichSegment): string {
  return [
    s.bold && 'b',
    s.italic && 'i',
    s.underline && 'u',
    s.strikethrough && 's',
    s.code && 'c',
  ]
    .filter(Boolean)
    .join(' ');
}
