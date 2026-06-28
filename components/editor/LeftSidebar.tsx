"use client";

import React, { useRef, useState, useEffect, useContext, createContext, useCallback } from 'react';
import { Plus, Trash2, Lock, Unlock, Search, ChevronDown, ChevronRight, Copy, Pencil, Check, X } from 'lucide-react';
import { useStudioStore, type StudioAct, type StudioPage } from '@/lib/store';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type DragItem =
  | { type: 'page'; pageId: string; fromActId: string | null }
  | { type: 'act'; actId: string; fromIdx: number };

type DropTarget =
  | { type: 'page-slot'; actId: string | null; index: number }
  | { type: 'act-slot'; index: number };

type EditDraft = { ru: string; en: string; id: string };

// ─── DnD Context ──────────────────────────────────────────────────────────────
// Shared via context so module-level sub-components can access drag state
// without needing prop drilling that would cause re-mounts.

type DndCtx = {
  dragItemRef: React.MutableRefObject<DragItem | null>;
  dropTarget: DropTarget | null;
  setDropTarget: React.Dispatch<React.SetStateAction<DropTarget | null>>;
  onDragEnd: () => void;
};

const DndContext = createContext<DndCtx>(null!);

// ─── Page Edit Context ─────────────────────────────────────────────────────────

type EditCtx = {
  editingPageId: string | null;
  editDraft: EditDraft;
  editLang: 'ru' | 'en';
  setEditDraft: React.Dispatch<React.SetStateAction<EditDraft>>;
  setEditLang: React.Dispatch<React.SetStateAction<'ru' | 'en'>>;
  startEditPage: (pageId: string) => void;
  commitEditPage: () => void;
  cancelEditPage: () => void;
};

const EditContext = createContext<EditCtx>(null!);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isInTopHalf(e: React.DragEvent): boolean {
  const rect = e.currentTarget.getBoundingClientRect();
  return e.clientY < rect.top + rect.height / 2;
}

function clearDropOnLeave(
  e: React.DragEvent,
  setDropTarget: React.Dispatch<React.SetStateAction<DropTarget | null>>,
) {
  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
    setDropTarget(null);
  }
}

// ─── PageRow ──────────────────────────────────────────────────────────────────
// MUST be at module level — defining components inside render functions
// causes React to remount them on every parent re-render, which kills active drags.

type PageRowProps = {
  pageId: string;
  actId: string | null;
  ownIndex: number;
};

const PageRow = React.memo(function PageRow({ pageId, actId, ownIndex }: PageRowProps) {
  const page = useStudioStore(s => s.pages.find(p => p.id === pageId)) as StudioPage | undefined;
  const selectedPageId = useStudioStore(s => s.selectedPageId);
  const selectPage = useStudioStore(s => s.selectPage);
  const duplicatePage = useStudioStore(s => s.duplicatePage);
  const deletePage = useStudioStore(s => s.deletePage);
  const movePageToAct = useStudioStore(s => s.movePageToAct);

  const { dragItemRef, dropTarget, setDropTarget, onDragEnd } = useContext(DndContext);
  const { editingPageId, editDraft, editLang, setEditDraft, setEditLang, startEditPage, commitEditPage, cancelEditPage } = useContext(EditContext);

  const activeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selectedPageId === pageId) {
      activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedPageId, pageId]);

  if (!page) return null;

  const isActive = selectedPageId === pageId;
  const isEditing = editingPageId === pageId;

  const showTop = dropTarget?.type === 'page-slot' && dropTarget.actId === actId && dropTarget.index === ownIndex;
  const showBot = dropTarget?.type === 'page-slot' && dropTarget.actId === actId && dropTarget.index === ownIndex + 1;

  const handleDragStart = (e: React.DragEvent) => {
    dragItemRef.current = { type: 'page', pageId, fromActId: actId };
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation();
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (dragItemRef.current?.type !== 'page') return;
    e.preventDefault();
    e.stopPropagation();
    const targetIdx = isInTopHalf(e) ? ownIndex : ownIndex + 1;
    setDropTarget({ type: 'page-slot', actId, index: targetIdx });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const item = dragItemRef.current;
    if (!item || item.type !== 'page') return;
    const targetIdx = isInTopHalf(e) ? ownIndex : ownIndex + 1;
    setDropTarget(null);
    dragItemRef.current = null;
    movePageToAct(item.pageId, actId, targetIdx);
  };

  if (isEditing) {
    return (
      <div className="mx-2 mb-1 rounded-lg border border-[var(--studio-accent)] bg-[var(--studio-bg-elevated)] p-2">
        <div className="flex gap-1 mb-2">
          {(['ru', 'en'] as const).map(lang => (
            <button key={lang} onClick={() => setEditLang(lang)}
              className={`rounded px-2 py-0.5 text-[10px] font-medium transition-all ${
                editLang === lang ? 'bg-[var(--studio-accent)] text-[#1C1814]' : 'text-[var(--studio-text-muted)]'
              }`}>
              {lang.toUpperCase()}
            </button>
          ))}
        </div>
        <input
          autoFocus
          value={editLang === 'ru' ? editDraft.ru : editDraft.en}
          onChange={e => setEditDraft(d => editLang === 'ru' ? { ...d, ru: e.target.value } : { ...d, en: e.target.value })}
          onKeyDown={e => { if (e.key === 'Enter') commitEditPage(); if (e.key === 'Escape') cancelEditPage(); }}
          placeholder={editLang === 'ru' ? 'Название (RU)' : 'Title (EN)'}
          className="w-full rounded border border-[var(--studio-border)] bg-[var(--studio-bg-base)] px-2 py-1 text-xs text-[var(--studio-text-primary)] outline-none focus:border-[var(--studio-accent)] mb-1.5"
        />
        <div className="flex items-center gap-1 mb-2">
          <span className="text-[10px] text-[var(--studio-text-muted)] font-mono">ID:</span>
          <input
            value={editDraft.id}
            onChange={e => setEditDraft(d => ({ ...d, id: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter') commitEditPage(); if (e.key === 'Escape') cancelEditPage(); }}
            className="flex-1 rounded border border-[var(--studio-border)] bg-[var(--studio-bg-base)] px-2 py-1 text-[10px] font-mono text-[var(--studio-text-secondary)] outline-none focus:border-[var(--studio-accent)]"
          />
        </div>
        <div className="flex gap-1">
          <button onClick={commitEditPage}
            className="flex items-center gap-1 rounded bg-[var(--studio-accent)] px-2 py-1 text-[10px] font-medium text-[#1C1814]">
            <Check className="h-3 w-3" /> Сохранить
          </button>
          <button onClick={cancelEditPage}
            className="flex items-center gap-1 rounded border border-[var(--studio-border)] px-2 py-1 text-[10px] text-[var(--studio-text-muted)]">
            <X className="h-3 w-3" /> Отмена
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={activeRef}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={e => clearDropOnLeave(e, setDropTarget)}
      onDrop={handleDrop}
      className={`group relative flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm transition-colors mx-1 cursor-grab active:cursor-grabbing ${
        isActive
          ? 'bg-[var(--studio-accent)] text-[#1C1814] font-medium'
          : 'hover:bg-[var(--studio-bg-elevated)] text-[var(--studio-text-primary)]'
      }`}
    >
      {/* Drop indicators: pointer-events:none so they never intercept drag events */}
      {showTop && (
        <div className="pointer-events-none absolute inset-x-1 top-0 h-0.5 rounded-full bg-[var(--studio-accent)] z-20" />
      )}
      {showBot && (
        <div className="pointer-events-none absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-[var(--studio-accent)] z-20" />
      )}

      <span className={`text-[10px] select-none opacity-0 group-hover:opacity-30 flex-shrink-0 ${
        isActive ? 'text-[#1C1814]' : 'text-[var(--studio-text-muted)]'
      }`}>⠿</span>

      <button onClick={() => selectPage(pageId)} className="flex-1 text-left min-w-0">
        <div className="truncate text-[13px]">{page.title.ru || 'Без названия'}</div>
        <div className={`font-mono text-[10px] truncate mt-0.5 ${
          isActive ? 'opacity-60' : 'text-[var(--studio-text-muted)]'
        }`}>{page.id}</div>
      </button>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button title="Редактировать" onClick={e => { e.stopPropagation(); startEditPage(pageId); }}
          className={`p-1 rounded hover:bg-black/10 ${isActive ? 'text-[#1C1814]' : 'text-[var(--studio-text-muted)]'}`}>
          <Pencil className="h-3 w-3" />
        </button>
        <button title="Дублировать" onClick={e => { e.stopPropagation(); duplicatePage(pageId); }}
          className={`p-1 rounded hover:bg-black/10 ${isActive ? 'text-[#1C1814]' : 'text-[var(--studio-text-muted)]'}`}>
          <Copy className="h-3 w-3" />
        </button>
        {page.protected ? (
          <span title="Системная страница — удаление заблокировано"
            className={`p-1 rounded ${isActive ? 'text-[#1C1814]/40' : 'text-[var(--studio-text-muted)]/40'}`}>
            <Lock className="h-3 w-3" />
          </span>
        ) : (
          <button title="Удалить" onClick={e => { e.stopPropagation(); deletePage(pageId); toast.info('Страница удалена'); }}
            className={`p-1 rounded hover:bg-black/10 ${isActive ? 'text-[#1C1814] hover:text-red-900' : 'text-[var(--danger)]'}`}>
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
});

// ─── ActSection ───────────────────────────────────────────────────────────────
// MUST be at module level for same reason as PageRow.

type ActSectionProps = {
  act: StudioAct;
  actIdx: number;
  searchLower: string;
  pageMatchesSearch: (id: string) => boolean;
};

const ActSection = React.memo(function ActSection({ act, actIdx, searchLower, pageMatchesSearch }: ActSectionProps) {
  const updateAct = useStudioStore(s => s.updateAct);
  const deleteAct = useStudioStore(s => s.deleteAct);
  const duplicateAct = useStudioStore(s => s.duplicateAct);
  const toggleActCollapsed = useStudioStore(s => s.toggleActCollapsed);
  const movePageToAct = useStudioStore(s => s.movePageToAct);
  const reorderActs = useStudioStore(s => s.reorderActs);
  const addPage = useStudioStore(s => s.addPage);

  const { dragItemRef, dropTarget, setDropTarget, onDragEnd } = useContext(DndContext);

  const [editingActId, setEditingActId] = useState<string | null>(null);
  const [actTitleDraft, setActTitleDraft] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const matchingPageIds = act.pageIds.filter(pageMatchesSearch);
  const isOpen = searchLower ? matchingPageIds.length > 0 : !act.collapsed;
  const isEditingTitle = editingActId === act.id;
  const visibleIds = searchLower ? matchingPageIds : act.pageIds;

  const showActTop = dropTarget?.type === 'act-slot' && dropTarget.index === actIdx;
  const showActBot = dropTarget?.type === 'act-slot' && dropTarget.index === actIdx + 1;

  const startEditAct = () => { setEditingActId(act.id); setActTitleDraft(act.title); };
  const commitEditAct = () => {
    updateAct(act.id, { title: actTitleDraft.trim() || 'Без названия' });
    setEditingActId(null);
  };

  const handleHeaderDragStart = (e: React.DragEvent) => {
    if (isEditingTitle) { e.preventDefault(); return; }
    dragItemRef.current = { type: 'act', actId: act.id, fromIdx: actIdx };
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation();
  };

  const handleHeaderDragOver = (e: React.DragEvent) => {
    const item = dragItemRef.current;
    if (!item) return;
    e.preventDefault();
    e.stopPropagation();
    if (item.type === 'page') {
      const idx = isInTopHalf(e) ? 0 : act.pageIds.length;
      setDropTarget({ type: 'page-slot', actId: act.id, index: idx });
    } else if (item.type === 'act' && item.actId !== act.id) {
      setDropTarget({ type: 'act-slot', index: isInTopHalf(e) ? actIdx : actIdx + 1 });
    }
  };

  const handleHeaderDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const item = dragItemRef.current;
    if (!item) return;
    setDropTarget(null);
    dragItemRef.current = null;
    if (item.type === 'page') {
      const idx = isInTopHalf(e) ? 0 : act.pageIds.length;
      movePageToAct(item.pageId, act.id, idx);
    } else if (item.type === 'act' && item.actId !== act.id) {
      const rawIdx = isInTopHalf(e) ? actIdx : actIdx + 1;
      const adjusted = rawIdx > item.fromIdx ? rawIdx - 1 : rawIdx;
      if (adjusted !== item.fromIdx) reorderActs(item.fromIdx, adjusted);
    }
  };

  const handleDeleteAct = (mode: 'unassign' | 'delete-pages') => {
    deleteAct(act.id, mode);
    setDeleteConfirm(false);
    toast.info(mode === 'delete-pages' ? 'Акт и страницы удалены' : 'Акт удалён, страницы перенесены');
  };

  const emptyBodyIsTarget = dropTarget?.type === 'page-slot' && dropTarget.actId === act.id;

  return (
    <div className="mx-1 mb-1">
      <div className="relative rounded-lg overflow-hidden border border-[var(--studio-border)]">
        {showActTop && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-[var(--studio-accent)] z-20" />
        )}
        {showActBot && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-[var(--studio-accent)] z-20" />
        )}

        {/* Act header — drag source + drop target */}
        <div
          draggable={!isEditingTitle}
          onDragStart={handleHeaderDragStart}
          onDragEnd={onDragEnd}
          onDragOver={handleHeaderDragOver}
          onDragLeave={e => clearDropOnLeave(e, setDropTarget)}
          onDrop={handleHeaderDrop}
          className="flex items-center gap-1.5 px-2 py-2 bg-[var(--studio-bg-elevated)] cursor-grab active:cursor-grabbing select-none"
        >
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-[var(--studio-border)]"
            style={{ background: act.color || 'var(--studio-text-muted)' }}
          />

          {!searchLower && (
            <button
              onClick={e => { e.stopPropagation(); toggleActCollapsed(act.id); }}
              className="p-0.5 text-[var(--studio-text-muted)] hover:text-[var(--studio-text-primary)] flex-shrink-0"
              title={act.collapsed ? 'Развернуть' : 'Свернуть'}
            >
              {act.collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}

          {isEditingTitle ? (
            <input
              autoFocus
              value={actTitleDraft}
              onChange={e => setActTitleDraft(e.target.value)}
              onBlur={commitEditAct}
              onKeyDown={e => { if (e.key === 'Enter') commitEditAct(); if (e.key === 'Escape') setEditingActId(null); }}
              onClick={e => e.stopPropagation()}
              className="flex-1 rounded border border-[var(--studio-accent)] bg-[var(--studio-bg-base)] px-1.5 py-0.5 text-xs text-[var(--studio-text-primary)] outline-none cursor-text"
            />
          ) : (
            <span
              onDoubleClick={e => { e.stopPropagation(); startEditAct(); }}
              onClick={e => { e.stopPropagation(); if (act.collapsed) toggleActCollapsed(act.id); }}
              className="flex-1 text-xs font-medium text-[var(--studio-text-primary)] truncate"
              title="Двойной клик — переименовать"
            >
              {act.title}
            </span>
          )}

          <span className="text-[10px] text-[var(--studio-text-muted)] bg-[var(--studio-bg-panel)] rounded px-1.5 py-0.5 flex-shrink-0">
            {act.pageIds.length}
          </span>

          <label className="cursor-pointer flex-shrink-0 relative" title="Цвет акта">
            <input
              type="color"
              value={act.color || '#7A6F5A'}
              onChange={e => updateAct(act.id, { color: e.target.value })}
              className="w-0 h-0 opacity-0 absolute"
            />
            <div
              className="w-2 h-4 rounded-sm border border-[var(--studio-border)] hover:border-[var(--studio-accent)] transition-all"
              style={{ background: act.color || 'var(--studio-border)' }}
            />
          </label>

          {!deleteConfirm ? (
            <div className="flex items-center gap-0.5">
              <button title="Добавить страницу" onClick={() => { addPage(act.id); toast.success('Страница создана'); }}
                className="p-1 rounded text-[var(--studio-text-muted)] hover:text-[var(--studio-accent)] hover:bg-[var(--studio-bg-panel)]">
                <Plus className="h-3 w-3" />
              </button>
              <button title="Дублировать акт" onClick={() => { duplicateAct(act.id); toast.success('Акт дублирован'); }}
                className="p-1 rounded text-[var(--studio-text-muted)] hover:text-[var(--studio-text-primary)] hover:bg-[var(--studio-bg-panel)]">
                <Copy className="h-3 w-3" />
              </button>
              <button title="Удалить акт" onClick={() => setDeleteConfirm(true)}
                className="p-1 rounded text-[var(--studio-text-muted)] hover:text-[var(--danger)]">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-[var(--studio-text-muted)]">Стр.:</span>
              <button onClick={() => handleDeleteAct('unassign')}
                className="text-[10px] rounded px-1.5 py-0.5 bg-[var(--studio-bg-panel)] border border-[var(--studio-border)] text-[var(--studio-text-secondary)] hover:border-[var(--studio-accent)]">
                Оставить
              </button>
              <button onClick={() => handleDeleteAct('delete-pages')}
                className="text-[10px] rounded px-1.5 py-0.5 bg-[var(--danger)] text-white">
                Удалить всё
              </button>
              <button onClick={() => setDeleteConfirm(false)} className="p-0.5 text-[var(--studio-text-muted)]">
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Pages list */}
        {isOpen && (
          <div className="pt-1 pb-1 bg-[var(--studio-bg-base)]">
            {visibleIds.map((pid, i) => (
              <PageRow key={pid} pageId={pid} actId={act.id} ownIndex={i} />
            ))}
            {visibleIds.length === 0 && !searchLower && (
              <div
                className={`mx-2 py-3 text-[11px] text-center rounded border border-dashed transition-colors ${
                  emptyBodyIsTarget
                    ? 'border-[var(--studio-accent)] text-[var(--studio-accent)]'
                    : 'border-[var(--studio-border)] text-[var(--studio-text-muted)] italic'
                }`}
                onDragOver={e => {
                  if (dragItemRef.current?.type !== 'page') return;
                  e.preventDefault(); e.stopPropagation();
                  setDropTarget({ type: 'page-slot', actId: act.id, index: 0 });
                }}
                onDragLeave={e => clearDropOnLeave(e, setDropTarget)}
                onDrop={e => {
                  e.preventDefault(); e.stopPropagation();
                  const item = dragItemRef.current;
                  if (!item || item.type !== 'page') return;
                  setDropTarget(null); dragItemRef.current = null;
                  movePageToAct(item.pageId, act.id, 0);
                }}
              >
                Нет страниц — перетащите или нажмите +
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

// ─── LeftSidebar ──────────────────────────────────────────────────────────────

export default function LeftSidebar() {
  const {
    pages,
    acts, unassignedPageIds,
    leftSidebarCollapsed, leftSidebarLocked,
    toggleLeftSidebar, toggleLeftSidebarLocked,
    addPage, duplicatePage, deletePage,
    addAct, renamePage, movePageToAct,
  } = useStudioStore();

  // ── Search ──
  const [search, setSearch] = useState('');
  const searchLower = search.toLowerCase().trim();

  const pageMatchesSearch = useCallback((pageId: string) => {
    if (!searchLower) return true;
    const page = pages.find(p => p.id === pageId);
    if (!page) return false;
    return (
      page.title.ru.toLowerCase().includes(searchLower) ||
      page.title.en.toLowerCase().includes(searchLower) ||
      page.id.toLowerCase().includes(searchLower)
    );
  }, [pages, searchLower]);

  // ── Page editing ──
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft>({ ru: '', en: '', id: '' });
  const [editLang, setEditLang] = useState<'ru' | 'en'>('ru');

  const startEditPage = useCallback((pageId: string) => {
    const page = pages.find(p => p.id === pageId);
    if (!page) return;
    setEditingPageId(pageId);
    setEditDraft({ ru: page.title.ru, en: page.title.en, id: page.id });
    setEditLang('ru');
  }, [pages]);

  const commitEditPage = useCallback(() => {
    if (!editingPageId) return;
    const newId = editDraft.id.trim().replace(/\s+/g, '_');
    if (!newId) { toast.error('ID не может быть пустым'); return; }
    if (newId !== editingPageId && pages.some(p => p.id === newId)) { toast.error('ID уже существует'); return; }
    renamePage(editingPageId, newId, { ru: editDraft.ru || 'Без названия', en: editDraft.en || 'Untitled' });
    setEditingPageId(null);
  }, [editingPageId, editDraft, pages, renamePage]);

  const cancelEditPage = useCallback(() => setEditingPageId(null), []);

  // ── DnD ──
  const dragItemRef = useRef<DragItem | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  const onDragEnd = useCallback(() => {
    dragItemRef.current = null;
    setDropTarget(null);
  }, []);

  // Stable context objects — only recreate when values change
  const dndCtx = React.useMemo<DndCtx>(
    () => ({ dragItemRef, dropTarget, setDropTarget, onDragEnd }),
    [dropTarget, onDragEnd],
  );

  const editCtx = React.useMemo<EditCtx>(
    () => ({ editingPageId, editDraft, editLang, setEditDraft, setEditLang, startEditPage, commitEditPage, cancelEditPage }),
    [editingPageId, editDraft, editLang, startEditPage, commitEditPage, cancelEditPage],
  );

  // ── Unassigned area drop ──
  const handleUnassignedDragOver = (e: React.DragEvent) => {
    if (dragItemRef.current?.type !== 'page') return;
    e.preventDefault();
    e.stopPropagation();
    setDropTarget({ type: 'page-slot', actId: null, index: unassignedPageIds.length });
  };

  const handleUnassignedDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const item = dragItemRef.current;
    if (!item || item.type !== 'page') return;
    setDropTarget(null);
    dragItemRef.current = null;
    movePageToAct(item.pageId, null, unassignedPageIds.length);
  };

  // ── Collapsed state ──
  if (leftSidebarCollapsed) {
    return (
      <div className="panel flex w-8 flex-shrink-0 flex-col items-center border-r pt-3 overflow-hidden">
        <button
          onClick={toggleLeftSidebar}
          className="rotate-90 text-[var(--studio-text-muted)] hover:text-[var(--studio-text-primary)] p-1 text-[10px] tracking-widest whitespace-nowrap"
          title="Развернуть">
          СТРАНИЦЫ
        </button>
        {leftSidebarLocked && (
          <div className="mt-2 text-[var(--studio-accent)] opacity-70"><Lock className="h-3 w-3" /></div>
        )}
      </div>
    );
  }

  const unassignedVisible = unassignedPageIds.filter(pageMatchesSearch);
  const noSearchResults = searchLower
    && acts.every(a => a.pageIds.filter(pageMatchesSearch).length === 0)
    && unassignedVisible.length === 0;

  return (
    <DndContext.Provider value={dndCtx}>
      <EditContext.Provider value={editCtx}>
        <div className="panel flex w-72 flex-shrink-0 flex-col border-r overflow-hidden">

          {/* Header */}
          <div className="flex items-center gap-1 border-b border-[var(--studio-border)] px-3 py-2.5 flex-shrink-0">
            <button onClick={toggleLeftSidebar}
              className="p-1 -ml-0.5 text-[var(--studio-text-muted)] hover:text-[var(--studio-text-primary)]"
              title="Свернуть">◀</button>
            <span className="text-[11px] font-semibold tracking-widest text-[var(--studio-text-secondary)] flex-1">СТРАНИЦЫ</span>
            <button
              onClick={toggleLeftSidebarLocked}
              title={leftSidebarLocked ? 'Замок: сайдбар не сворачивается при Playtest' : 'Замок выключен'}
              className={`p-1 rounded transition-all ${
                leftSidebarLocked ? 'text-[var(--studio-accent)]' : 'text-[var(--studio-text-muted)] hover:text-[var(--studio-text-secondary)]'
              }`}>
              {leftSidebarLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => { addAct(); toast.success('Новый акт создан'); }}
              title="Добавить акт"
              className="p-1 rounded text-[var(--studio-text-muted)] hover:text-[var(--studio-accent)] hover:bg-[var(--studio-bg-elevated)]">
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => { addPage(null); toast.success('Страница создана'); }}
              title="Новая страница (без акта)"
              className="flex items-center gap-1 rounded-md bg-[var(--studio-accent)] px-2 py-1 text-[10px] font-semibold text-[#1C1814] hover:bg-[var(--studio-accent-hover)]">
              + Стр.
            </button>
          </div>

          {/* Search */}
          <div className="px-2 py-2 border-b border-[var(--studio-border)] flex-shrink-0">
            <div className="flex items-center gap-2 rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] px-2 py-1">
              <Search className="h-3.5 w-3.5 flex-shrink-0 text-[var(--studio-text-muted)]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Поиск по страницам..."
                className="flex-1 bg-transparent text-xs text-[var(--studio-text-primary)] outline-none placeholder:text-[var(--studio-text-muted)]"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-[var(--studio-text-muted)] hover:text-[var(--studio-text-primary)]">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto py-1">
            {acts.map((act, actIdx) => (
              <ActSection
                key={act.id}
                act={act}
                actIdx={actIdx}
                searchLower={searchLower}
                pageMatchesSearch={pageMatchesSearch}
              />
            ))}

            {/* Unassigned section */}
            {(unassignedPageIds.length > 0 || acts.length === 0) && (
              <div className="mt-1">
                {acts.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5">
                    <div className="flex-1 h-px bg-[var(--studio-border)]" />
                    <span className="text-[10px] text-[var(--studio-text-muted)] font-medium">БЕЗ АКТА</span>
                    <span className="text-[10px] text-[var(--studio-text-muted)] bg-[var(--studio-bg-elevated)] rounded px-1">
                      {unassignedPageIds.length}
                    </span>
                    <div className="flex-1 h-px bg-[var(--studio-border)]" />
                  </div>
                )}
                <div
                  onDragOver={handleUnassignedDragOver}
                  onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null); }}
                  onDrop={handleUnassignedDrop}
                >
                  {(searchLower ? unassignedVisible : unassignedPageIds).map((pid, i) => (
                    <PageRow key={pid} pageId={pid} actId={null} ownIndex={i} />
                  ))}
                  {unassignedPageIds.length === 0 && !searchLower && (
                    <div className={`mx-2 py-3 text-[11px] text-center rounded border border-dashed transition-colors ${
                      dropTarget?.type === 'page-slot' && dropTarget.actId === null
                        ? 'border-[var(--studio-accent)] text-[var(--studio-accent)]'
                        : 'border-[var(--studio-border)] text-[var(--studio-text-muted)] italic'
                    }`}>
                      Перетащите страницу сюда
                    </div>
                  )}
                </div>
              </div>
            )}

            {noSearchResults && (
              <div className="px-4 py-4 text-center text-[11px] text-[var(--studio-text-muted)]">
                Ничего не найдено
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[var(--studio-border)] px-3 py-2 text-[10px] text-[var(--studio-text-muted)] flex items-center justify-between flex-shrink-0">
            <span>{pages.length} стр.</span>
            {acts.length > 0 && (
              <span>{acts.length} {acts.length === 1 ? 'акт' : acts.length < 5 ? 'акта' : 'актов'}</span>
            )}
          </div>
        </div>
      </EditContext.Provider>
    </DndContext.Provider>
  );
}
