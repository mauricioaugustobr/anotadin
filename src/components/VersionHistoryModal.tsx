// ---------------------------------------------------------------------------
// Histórico de versões da página (visualizar e restaurar)
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState } from 'react';
import { Clock, History, RotateCcw, X } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { formatDateTime } from '@/lib/utils';

interface VersionHistoryModalProps {
  pageId: string;
  onClose: () => void;
}

export function VersionHistoryModal({ pageId, onClose }: VersionHistoryModalProps) {
  const versions = useAppStore((s) => s.versions[pageId] ?? []);
  const page = useAppStore((s) => s.pages[pageId]);
  const restoreVersion = useAppStore((s) => s.restoreVersion);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const sizes = useMemo(
    () =>
      versions.map((v) => {
        let chars = 0;
        for (const b of Object.values(v.blocks)) {
          chars += b.content.reduce((acc, s) => acc + s.text.length, 0);
          if (b.table) chars += b.table.cells.flat().join('').length;
          if (b.columns) chars += b.columns.reduce((acc, c) => acc + c.text.reduce((a, s) => a + s.text.length, 0), 0);
        }
        return Math.max(1, Math.round(chars / 5));
      }),
    [versions]
  );

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="version-modal">
        <div className="version-head">
          <span className="version-title">
            <History size={16} /> Histórico de versões
          </span>
          <span className="version-subtitle">{page?.title || 'Sem título'}</span>
          <button className="search-close" onClick={onClose} title="Fechar">
            <X size={15} />
          </button>
        </div>

        <div className="version-list">
          {versions.length === 0 && (
            <div className="version-empty">
              Nenhuma versão ainda. As versões são criadas automaticamente enquanto você edita
              (a cada minuto de atividade).
            </div>
          )}
          {versions.map((v, i) => (
            <div key={v.id} className="version-item">
              <span className="version-icon">
                <Clock size={14} />
              </span>
              <span className="version-info">
                <span className="version-when">
                  {formatDateTime(v.at)} {i === 0 && <span className="version-badge">mais recente</span>}
                </span>
                <span className="version-meta">
                  {v.title || 'Sem título'} · ~{sizes[i]} palavras
                </span>
              </span>
              <button
                className={`version-restore${confirmId === v.id ? ' is-confirm' : ''}`}
                onClick={() => {
                  if (confirmId === v.id) {
                    restoreVersion(pageId, v.id);
                    onClose();
                  } else {
                    setConfirmId(v.id);
                  }
                }}
                onBlur={() => setConfirmId(null)}
                title="Restaurar esta versão"
              >
                <RotateCcw size={13} />
                {confirmId === v.id ? 'Confirmar?' : 'Restaurar'}
              </button>
            </div>
          ))}
        </div>

        <div className="version-footer">
          Restaurar substitui o conteúdo atual (dá para desfazer com Ctrl+Z).
        </div>
      </div>
    </div>
  );
}
