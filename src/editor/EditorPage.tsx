// ---------------------------------------------------------------------------
// Página do editor: cabeçalho (capa, ícone, título, tags, datas) + blocos
// ---------------------------------------------------------------------------

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { History, ImagePlus, MoreHorizontal, Star } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { formatDate } from '@/lib/utils';
import { textOf } from '@/lib/richText';
import { countWordsInBlocks } from '@/lib/words';
import type { Page, PageCover, RichText } from '@/types';
import { BlocksArea } from './BlocksArea';
import { EditableText } from './EditableText';
import { EmojiPicker } from '@/components/EmojiPicker';
import { CoverPicker, coverStyle } from '@/components/CoverPicker';
import { TagEditor } from '@/components/TagEditor';
import { VersionHistoryModal } from '@/components/VersionHistoryModal';
import { Menu } from '@/components/Menu';

// Intervalos para o histórico automático de versões.
const lastSnapshotTimes: Record<string, number> = {};
const SNAPSHOT_COOLDOWN = 60_000;
const SNAPSHOT_DEBOUNCE = 10_000;

export function EditorPage({ pageId }: { pageId: string }) {
  const page = useAppStore((s) => s.pages[pageId]);

  useEffect(() => {
    document.title = page ? `${page.title || 'Sem título'} · ANOTADIN` : 'ANOTADIN';
  }, [page?.title]);

  // Cria versões automáticas enquanto a página é editada.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = useAppStore.subscribe(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const now = Date.now();
        if (now - (lastSnapshotTimes[pageId] ?? 0) < SNAPSHOT_COOLDOWN) return;
        lastSnapshotTimes[pageId] = now;
        useAppStore.getState().snapshotPage(pageId);
      }, SNAPSHOT_DEBOUNCE);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsub();
    };
  }, [pageId]);

  if (!page) return null;

  return (
    <div className="page">
      <div className="page-content">
        <PageHeader page={page} />
        <BlocksArea key={pageId} page={page} />
        <div className="page-bottom-spacer" />
      </div>
    </div>
  );
}

const PageHeader = memo(function PageHeader({ page }: { page: Page }) {
  const updatePage = useAppStore((s) => s.updatePage);
  const blocks = useAppStore((s) => s.blocks);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [coverPicker, setCoverPicker] = useState<{ x: number; y: number } | null>(null);
  const [pageMenu, setPageMenu] = useState<{ x: number; y: number } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  const wordCount = useMemo(() => countWordsInBlocks(blocks, page), [blocks, page]);
  const hasIcon = !!page.icon || !!page.iconImage;

  // Fecha o seletor de emojis ao clicar fora.
  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.page-icon-row')) setPickerOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [pickerOpen]);

  const setIcon = useCallback(
    (emoji: string) => {
      updatePage(page.id, { icon: emoji, iconImage: null }, 'structural');
      setPickerOpen(false);
    },
    [page.id, updatePage]
  );

  const setIconImage = useCallback(
    (url: string) => {
      updatePage(page.id, { iconImage: url, icon: null }, 'structural');
      setPickerOpen(false);
    },
    [page.id, updatePage]
  );

  const removeIcon = useCallback(() => {
    updatePage(page.id, { icon: null, iconImage: null }, 'structural');
    setPickerOpen(false);
  }, [page.id, updatePage]);

  const randomIcon = useCallback(() => {
    const pool = ['📝', '📌', '📚', '💡', '🚀', '🎯', '🌱', '⭐', '🔥', '🧠', '🗂️', '✨'];
    const next = pool[Math.floor(Math.random() * pool.length)];
    updatePage(page.id, { icon: next, iconImage: null }, 'structural');
    setPickerOpen(false);
  }, [page.id, updatePage]);

  const setCover = useCallback(
    (cover: PageCover) => {
      updatePage(page.id, { cover }, 'structural');
      setCoverPicker(null);
    },
    [page.id, updatePage]
  );

  const removeCover = useCallback(() => {
    updatePage(page.id, { cover: null }, 'structural');
    setCoverPicker(null);
  }, [page.id, updatePage]);

  const toggleFavorite = useCallback(() => {
    updatePage(page.id, { favorite: !page.favorite }, 'structural');
  }, [page.id, page.favorite, updatePage]);

  const openPageMenu = () => {
    const rect = menuBtnRef.current?.getBoundingClientRect();
    if (rect) setPageMenu({ x: rect.left, y: rect.bottom + 4 });
  };

  const openCoverPicker = () => {
    const rect = menuBtnRef.current?.getBoundingClientRect();
    if (rect) setCoverPicker({ x: rect.right, y: rect.bottom + 4 });
    setPageMenu(null);
  };

  const menuItems = [
    page.cover
      ? { label: 'Alterar capa', icon: <ImagePlus size={14} />, onClick: openCoverPicker }
      : { label: 'Adicionar capa', icon: <ImagePlus size={14} />, onClick: openCoverPicker },
    ...(page.cover
      ? [{ label: 'Remover capa', onClick: removeCover }]
      : []),
    {
      label: 'Histórico de versões',
      icon: <History size={14} />,
      onClick: () => setHistoryOpen(true),
    },
    {
      label: page.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos',
      icon: <Star size={14} />,
      onClick: toggleFavorite,
    },
  ];

  const titleValue = useMemo(() => [{ text: page.title }], [page.title]);

  const handleTitleInput = useCallback(
    (value: RichText) => {
      updatePage(page.id, { title: textOf(value) });
    },
    [page.id, updatePage]
  );

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (document.activeElement as HTMLElement | null)?.blur();
      const editable = document.querySelector<HTMLElement>('.blocks [data-editable="true"]');
      editable?.focus();
      const sel = window.getSelection();
      if (sel && editable) {
        sel.selectAllChildren(editable);
        sel.collapseToEnd();
      }
    }
  }, []);

  return (
    <header className="page-header">
      {page.cover && (
        <div className="page-cover" style={coverStyle(page.cover)}>
          <div className="page-cover-actions">
            <button onClick={openCoverPicker}>Alterar capa</button>
            <button onClick={removeCover}>Remover</button>
          </div>
        </div>
      )}

      <div className="page-icon-row">
        <div className="page-icon-slot">
          {hasIcon ? (
            <button className="page-icon has-icon" title="Alterar ícone" onClick={() => setPickerOpen((v) => !v)}>
              {page.iconImage ? (
                <img src={page.iconImage} alt="" className="page-icon-img" />
              ) : (
                <span className="page-icon-emoji">{page.icon}</span>
              )}
              <span className="page-icon-edit">Alterar ícone</span>
            </button>
          ) : (
            <button
              className="page-icon is-empty"
              title="Adicionar ícone ou capa"
              onClick={() => setPickerOpen((v) => !v)}
            >
              <span className="page-icon-emoji">😀</span>
              <span>Adicionar ícone</span>
            </button>
          )}
          <button className="page-cover-add" title="Adicionar capa" onClick={openCoverPicker}>
            <ImagePlus size={13} /> Capa
          </button>
        </div>

        <div className="page-head-actions">
          {page.favorite && (
            <span className="page-fav-indicator" title="Página favorita">
              <Star size={14} fill="currentColor" />
            </span>
          )}
          <button ref={menuBtnRef} className="page-menu-btn" title="Menu da página" onClick={openPageMenu}>
            <MoreHorizontal size={17} />
          </button>
        </div>

        {pickerOpen && (
          <EmojiPicker
            onSelect={setIcon}
            onRemove={hasIcon ? removeIcon : undefined}
            onUploadImage={setIconImage}
            onRandom={randomIcon}
          />
        )}
      </div>

      <EditableText
        blockId="page-title"
        value={titleValue}
        onInput={handleTitleInput}
        onKeyDown={handleTitleKeyDown}
        className={`page-title${page.title.length === 0 ? ' is-empty' : ''}`}
        placeholder="Sem título"
        spellCheck={false}
      />

      <TagEditor page={page} />

      <div className="page-meta">
        Criado em {formatDate(page.createdAt)}
        {page.updatedAt - page.createdAt > 60_000 && ` · Editado em ${formatDate(page.updatedAt)}`}
        {` · ${wordCount} ${wordCount === 1 ? 'palavra' : 'palavras'}`}
      </div>

      {pageMenu && (
        <Menu x={pageMenu.x} y={pageMenu.y} items={menuItems} onClose={() => setPageMenu(null)} />
      )}
      {coverPicker && (
        <CoverPicker
          x={coverPicker.x}
          y={coverPicker.y}
          onSelect={setCover}
          onRemove={removeCover}
          onClose={() => setCoverPicker(null)}
        />
      )}
      {historyOpen && <VersionHistoryModal pageId={page.id} onClose={() => setHistoryOpen(false)} />}
    </header>
  );
});
