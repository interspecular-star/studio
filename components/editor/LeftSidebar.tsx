"use client";

import { useRef, useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Lock, Unlock, Search, ChevronDown, ChevronRight, Copy, Pencil, Check, X } from 'lucide-react';
import { useStudioStore, type StudioAct } from '@/lib/store';
import { toast } from 'sonner';

// ——— Drag state (stored in refs to avoid re-renders) ———
type DragItem =
  | { type: 'page'; pageId: string; fromActId: string | null }
  | { type: 'act'; actId: string; fromIdx: number };

type DropTarget =
  | { type: 'page-slot'; actId: string | null; index: number }
  | { type: 'act-slot'; index: number };

// ——— Inline page edit state ———
type EditDraft = { ru: string; en: string; id: string };

export default function LeftSidebar() {
  const {
    pages,
    selectedPageId,
    selectPage,
    acts,
    unassignedPageIds,
    leftSidebarCollapsed,
    leftSidebarLocked,
    toggleLeftSidebar,
    toggleLeftSidebarLocked,
    addPage,
    duplicatePage,
    deletePage,
    addAct,
    updateAct,
    deleteAct,
    duplicateAct,
    reorderActs,
    movePageToAct,
    toggleActCollapsed,
    renamePage,
  } = useStudioStore();

  const [search, setSearch] = useState('');
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft>({ ru: '', en: '', id: '' });
  const [editLang, setEditLang] = useState<'ru' | 'en'>('ru');
  const [editingActId, setEditingActId] = useState<string | null>(null);
  const [actTitleDraft, setActTitleDraft] = useState('');
  const [deleteActTarget, setDeleteActTarget] = useState<string | null>(null);

  // Drag state
  const dragItemRef = useRef<DragItem | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  // Auto-scroll to active page
  const activePageRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (selectedPageId) {
      activePageRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedPageId]);

  // ——— Search helpers ———
  const searchLower = search.toLowerCase().trim();
  const pageMatchesSearch = useCallback((pageId: string) => {
    if (!searchLower) return true;
    const page = pages.find((p) => p.id === pageId);
    if (!page) return false;
    return (
      page.title.ru.toLowerCase().includes(searchLower) ||
      page.title.en.toLowerCase().includes(searchLower) ||
      page.id.toLowerCase().includes(searchLower)
    );
  }, [pages, searchLower]);

  // ——— Inline page editing ———
  const startEditPage = (pageId: string) => {
    const page = pages.find((p) => p.id === pageId);
    if (!page) return;
    setEditingPageId(pageId);
    setEditDraft({ ru: page.title.ru, en: page.title.en, id: page.id });
    setEditLang('ru');
  };

  const commitEditPage = () => {
    if (!editingPageId) return;
    const draft = editDraft;
    const newId = draft.id.trim().replace(/\s+/g, '_');
    const idConflict = newId !== editingPageId && pages.some((p) => p.id === newId);
    if (idConflict) { toast.error('ID уже существует'); return; }
    if (!newId) { toast.error('ID не может быть пустым'); return; }
    renamePage(editingPageId, newId, { ru: draft.ru || 'Без названия', en: draft.en || 'Untitled' });
    setEditingPageId(null);
  };

  const cancelEditPage = () => setEditingPageId(null);

  // ——— Act title editing ———
  const startEditAct = (act: StudioAct) => {
    setEditingActId(act.id);
    setActTitleDraft(act.title);
  };
  const commitEditAct = () => {
    if (!editingActId) return;
    updateAct(editingActId, { title: actTitleDraft.trim() || 'Без названия' });
    setEditingActId(null);
  };

  // ——— Drag handlers ———
  const onDragStartPage = (e: React.DragEvent, pageId: string, fromActId: string | null) => {
    dragItemRef.current = { type: 'page', pageId, fromActId };
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDragStartAct = (e: React.DragEvent, actId: string, fromIdx: number) => {
    dragItemRef.current = { type: 'act', actId, fromIdx };
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDragEnd = () => {
    dragItemRef.current = null;
    setDropTarget(null);
  };

  const onDropPageSlot = (e: React.DragEvent, actId: string | null, index: number) => {
    e.preventDefault();
    const item = dragItemRef.current;
    if (!item || item.type !== 'page') return;
    setDropTarget(null);
    dragItemRef.current = null;
    movePageToAct(item.pageId, actId, index);
  };

  const onDropActSlot = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    const item = dragItemRef.current;
    if (!item || item.type !== 'act') return;
    setDropTarget(null);
    dragItemRef.current = null;
    if (item.fromIdx !== index && item.fromIdx !== index - 1) {
      reorderActs(item.fromIdx, index > item.fromIdx ? index - 1 : index);
    }
  };

  // ——— Handle add page ———
  const handleAddPage = (actId?: string | null) => {
    addPage(actId ?? null);
    toast.success('Страница создана');
  };

  // ——— Handle delete page ———
  const handleDeletePage = (pageId: string) => {
    if (pages.length === 1) { toast.error('Нельзя удалить последнюю страницу'); return; }
    deletePage(pageId);
    toast.info('Страница удалена');
  };

  // ——— Handle delete act ———
  const handleDeleteAct = (actId: string, mode: 'unassign' | 'delete-pages') => {
    deleteAct(actId, mode);
    setDeleteActTarget(null);
    toast.info(mode === 'delete-pages' ? 'Акт и страницы удалены' : 'Акт удалён, страницы перенесены');
  };

  // ——— Drop line component ———
  // h-4 (16px) hit area, 2px visual line — generous target, subtle look
  const DropLine = ({ actId, index }: { actId: string | null; index: number }) => {
    const isActive =
      dropTarget?.type === 'page-slot' &&
      dropTarget.actId === actId &&
      dropTarget.index === index;
    return (
      <div
        className="relative h-4 flex items-center px-3 -my-0.5 z-10"
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDropTarget({ type: 'page-slot', actId, index }); }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null); }}
        onDrop={(e) => { e.stopPropagation(); onDropPageSlot(e, actId, index); }}
      >
        <div className={`h-0.5 w-full rounded-full transition-all duration-75 ${isActive ? 'bg-[var(--studio-accent)] opacity-100' : 'opacity-0'}`} />
        {isActive && <div className="absolute left-2 w-2 h-2 rounded-full bg-[var(--studio-accent)] top-1/2 -translate-y-1/2" />}
      </div>
    );
  };

  // ——— Page row ———
  const PageRow = ({ pageId, actId }: { pageId: string; actId: string | null }) => {
    const page = pages.find((p) => p.id === pageId);
    if (!page) return null;
    const isActive = selectedPageId === pageId;
    const isEditing = editingPageId === pageId;
    const idInputRef = useRef<HTMLInputElement>(null);

    if (isEditing) {
      return (
        <div className="mx-2 mb-1 rounded-lg border border-[var(--studio-accent)] bg-[var(--studio-bg-elevated)] p-2">
          <div className="flex gap-1 mb-2">
            {(['ru', 'en'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setEditLang(lang)}
                className={`rounded px-2 py-0.5 text-[10px] font-medium transition-all ${editLang === lang ? 'bg-[var(--studio-accent)] text-[#1C1814]' : 'text-[var(--studio-text-muted)]'}`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
          <input
            autoFocus
            value={editLang === 'ru' ? editDraft.ru : editDraft.en}
            onChange={(e) => setEditDraft((d) => editLang === 'ru' ? { ...d, ru: e.target.value } : { ...d, en: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') commitEditPage(); if (e.key === 'Escape') cancelEditPage(); }}
            placeholder={editLang === 'ru' ? 'Название (RU)' : 'Title (EN)'}
            className="w-full rounded border border-[var(--studio-border)] bg-[var(--studio-bg-base)] px-2 py-1 text-xs text-[var(--studio-text-primary)] outline-none focus:border-[var(--studio-accent)] mb-1.5"
          />
          <div className="flex items-center gap-1 mb-2">
            <span className="text-[10px] text-[var(--studio-text-muted)] font-mono">ID:</span>
            <input
              ref={idInputRef}
              value={editDraft.id}
              onChange={(e) => setEditDraft((d) => ({ ...d, id: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') commitEditPage(); if (e.key === 'Escape') cancelEditPage(); }}
              className="flex-1 rounded border border-[var(--studio-border)] bg-[var(--studio-bg-base)] px-2 py-1 text-[10px] font-mono text-[var(--studio-text-secondary)] outline-none focus:border-[var(--studio-accent)]"
            />
          </div>
          <div className="flex gap-1">
            <button
              onClick={commitEditPage}
              className="flex items-center gap-1 rounded bg-[var(--studio-accent)] px-2 py-1 text-[10px] font-medium text-[#1C1814]"
            >
              <Check className="h-3 w-3" /> Сохранить
            </button>
            <button
              onClick={cancelEditPage}
              className="flex items-center gap-1 rounded border border-[var(--studio-border)] px-2 py-1 text-[10px] text-[var(--studio-text-muted)]"
            >
              <X className="h-3 w-3" /> Отмена
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        ref={isActive ? activePageRef : null}
        draggable
        onDragStart={(e) => onDragStartPage(e, pageId, actId)}
        onDragEnd={onDragEnd}
        className={`group flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm transition-all mb-0.5 mx-1 cursor-grab active:cursor-grabbing ${
          isActive
            ? 'bg-[var(--studio-accent)] text-[#1C1814] font-medium'
            : 'hover:bg-[var(--studio-bg-elevated)] text-[var(--studio-text-primary)]'
        }`}
      >
        {/* Drag handle */}
        <span className={`text-[10px] select-none opacity-0 group-hover:opacity-40 ${isActive ? 'text-[#1C1814]' : 'text-[var(--studio-text-muted)]'}`}>⠿</span>

        {/* Name + ID */}
        <button onClick={() => selectPage(pageId)} className="flex-1 text-left min-w-0">
          <div className="truncate text-[13px]">{page.title.ru || 'Без названия'}</div>
          <div className={`font-mono text-[10px] truncate mt-0.5 ${isActive ? 'opacity-60' : 'text-[var(--studio-text-muted)]'}`}>{page.id}</div>
        </button>

        {/* Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            title="Редактировать (название, ID)"
            onClick={(e) => { e.stopPropagation(); startEditPage(pageId); }}
            className={`p-1 rounded hover:bg-black/10 ${isActive ? 'text-[#1C1814]' : 'text-[var(--studio-text-muted)]'}`}
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            title="Дублировать страницу"
            onClick={(e) => { e.stopPropagation(); duplicatePage(pageId); }}
            className={`p-1 rounded hover:bg-black/10 ${isActive ? 'text-[#1C1814]' : 'text-[var(--studio-text-muted)]'}`}
          >
            <Copy className="h-3 w-3" />
          </button>
          <button
            title="Удалить страницу"
            onClick={(e) => { e.stopPropagation(); handleDeletePage(pageId); }}
            className={`p-1 rounded hover:bg-black/10 ${isActive ? 'text-[#1C1814] hover:text-red-900' : 'text-[var(--danger)]'}`}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  };

  // ——— Act section ———
  const ActSection = ({ act, actIdx }: { act: StudioAct; actIdx: number }) => {
    const matchingPageIds = act.pageIds.filter(pageMatchesSearch);
    const isOpen = searchLower ? matchingPageIds.length > 0 : !act.collapsed;
    const isEditingTitle = editingActId === act.id;
    const isDeleteConfirm = deleteActTarget === act.id;

    const hasPages = act.pageIds.length > 0;
    const visibleIds = searchLower ? matchingPageIds : act.pageIds;

    // h-5 (20px) hit area for act reordering drop zone
    const isActSlotActive = dropTarget?.type === 'act-slot' && dropTarget.index === actIdx;

    return (
      <>
        {/* Act drop zone (for act reordering) — generous hit area */}
        <div
          className="relative h-5 flex items-center px-2"
          onDragOver={(e) => {
            if (dragItemRef.current?.type === 'act') { e.preventDefault(); e.stopPropagation(); setDropTarget({ type: 'act-slot', index: actIdx }); }
          }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null); }}
          onDrop={(e) => { e.stopPropagation(); onDropActSlot(e, actIdx); }}
        >
          <div className={`h-0.5 w-full rounded-full transition-all duration-75 ${isActSlotActive ? 'bg-[var(--studio-accent)] opacity-100' : 'opacity-0'}`} />
          {isActSlotActive && <div className="absolute left-1 w-2 h-2 rounded-full bg-[var(--studio-accent)] top-1/2 -translate-y-1/2" />}
        </div>

        <div className="mx-1 mb-1 rounded-lg overflow-hidden border border-[var(--studio-border)]">
          {/* Act header */}
          <div
            className="flex items-center gap-1.5 px-2 py-2 bg-[var(--studio-bg-elevated)] cursor-grab active:cursor-grabbing select-none"
            draggable={!isEditingTitle}
            onDragStart={(e) => { if (!isEditingTitle) { e.stopPropagation(); onDragStartAct(e, act.id, actIdx); } }}
            onDragEnd={onDragEnd}
            onDragOver={(e) => {
              if (dragItemRef.current?.type === 'page') { e.preventDefault(); e.stopPropagation(); setDropTarget({ type: 'page-slot', actId: act.id, index: act.pageIds.length }); }
            }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null); }}
            onDrop={(e) => { if (dragItemRef.current?.type === 'page') { e.stopPropagation(); onDropPageSlot(e, act.id, act.pageIds.length); } }}
          >
            {/* Color dot */}
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-[var(--studio-border)] cursor-default"
              style={{ background: act.color || 'var(--studio-text-muted)' }}
            />

            {/* Collapse toggle — ONLY this toggles collapse */}
            {!searchLower && (
              <button
                onClick={(e) => { e.stopPropagation(); toggleActCollapsed(act.id); }}
                className="p-0.5 text-[var(--studio-text-muted)] hover:text-[var(--studio-text-primary)] flex-shrink-0"
                title={act.collapsed ? 'Развернуть' : 'Свернуть'}
              >
                {act.collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            )}

            {/* Title — double-click opens rename, single-click only expands if collapsed */}
            {isEditingTitle ? (
              <input
                autoFocus
                value={actTitleDraft}
                onChange={(e) => setActTitleDraft(e.target.value)}
                onBlur={commitEditAct}
                onKeyDown={(e) => { if (e.key === 'Enter') commitEditAct(); if (e.key === 'Escape') setEditingActId(null); }}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 rounded border border-[var(--studio-accent)] bg-[var(--studio-bg-base)] px-1.5 py-0.5 text-xs text-[var(--studio-text-primary)] outline-none cursor-text"
              />
            ) : (
              <span
                onDoubleClick={(e) => { e.stopPropagation(); startEditAct(act); }}
                onClick={(e) => { e.stopPropagation(); if (act.collapsed) toggleActCollapsed(act.id); }}
                className="flex-1 text-left text-xs font-medium text-[var(--studio-text-primary)] truncate cursor-pointer"
                title="Двойной клик — переименовать"
              >
                {act.title}
              </span>
            )}

            {/* Page count badge */}
            <span className="text-[10px] text-[var(--studio-text-muted)] bg-[var(--studio-bg-panel)] rounded px-1.5 py-0.5 flex-shrink-0">
              {act.pageIds.length}
            </span>

            {/* Color picker */}
            <label className="cursor-pointer flex-shrink-0" title="Цвет акта">
              <span className="sr-only">Цвет</span>
              <input
                type="color"
                value={act.color || '#7A6F5A'}
                onChange={(e) => updateAct(act.id, { color: e.target.value })}
                className="w-0 h-0 opacity-0 absolute"
              />
              <div
                className="w-2 h-4 rounded-sm border border-[var(--studio-border)] hover:border-[var(--studio-accent)] transition-all"
                style={{ background: act.color || 'var(--studio-border)' }}
              />
            </label>

            {/* Act actions */}
            {!isDeleteConfirm ? (
              <div className="flex items-center gap-0.5">
                <button
                  title="Добавить страницу в акт"
                  onClick={() => handleAddPage(act.id)}
                  className="p-1 rounded text-[var(--studio-text-muted)] hover:text-[var(--studio-accent)] hover:bg-[var(--studio-bg-panel)]"
                >
                  <Plus className="h-3 w-3" />
                </button>
                <button
                  title="Дублировать акт"
                  onClick={() => { duplicateAct(act.id); toast.success('Акт дублирован'); }}
                  className="p-1 rounded text-[var(--studio-text-muted)] hover:text-[var(--studio-text-primary)] hover:bg-[var(--studio-bg-panel)]"
                >
                  <Copy className="h-3 w-3" />
                </button>
                <button
                  title="Удалить акт"
                  onClick={() => setDeleteActTarget(act.id)}
                  className="p-1 rounded text-[var(--studio-text-muted)] hover:text-[var(--danger)]"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-[var(--studio-text-muted)]">Страницы:</span>
                <button
                  onClick={() => handleDeleteAct(act.id, 'unassign')}
                  className="text-[10px] rounded px-1.5 py-0.5 bg-[var(--studio-bg-panel)] border border-[var(--studio-border)] text-[var(--studio-text-secondary)] hover:border-[var(--studio-accent)]"
                  title="Сохранить страницы (перенести в Без акта)"
                >
                  Сохранить
                </button>
                <button
                  onClick={() => handleDeleteAct(act.id, 'delete-pages')}
                  className="text-[10px] rounded px-1.5 py-0.5 bg-[var(--danger)] text-white"
                  title="Удалить все страницы акта"
                >
                  Удалить всё
                </button>
                <button onClick={() => setDeleteActTarget(null)} className="p-0.5 text-[var(--studio-text-muted)]"><X className="h-3 w-3" /></button>
              </div>
            )}
          </div>

          {/* Pages within act */}
          {isOpen && (
            <div className="pt-1 pb-0.5 bg-[var(--studio-bg-base)]">
              <DropLine actId={act.id} index={0} />
              {visibleIds.map((pid, i) => (
                <div key={pid}>
                  <PageRow pageId={pid} actId={act.id} />
                  <DropLine actId={act.id} index={i + 1} />
                </div>
              ))}
              {visibleIds.length === 0 && !searchLower && (
                <div className="px-4 py-2 text-[11px] text-[var(--studio-text-muted)] italic">
                  Нет страниц — перетащите или нажмите +
                </div>
              )}
            </div>
          )}
        </div>
      </>
    );
  };

  // ——— Collapsed state ———
  if (leftSidebarCollapsed) {
    return (
      <div className="panel flex w-8 flex-shrink-0 flex-col items-center border-r pt-3 overflow-hidden">
        <button
          onClick={toggleLeftSidebar}
          className="rotate-90 text-[var(--studio-text-muted)] hover:text-[var(--studio-text-primary)] p-1 text-[10px] tracking-widest whitespace-nowrap"
          title="Развернуть панель страниц"
        >
          СТРАНИЦЫ
        </button>
        {leftSidebarLocked && (
          <div className="mt-2 text-[var(--studio-accent)] opacity-70">
            <Lock className="h-3 w-3" />
          </div>
        )}
      </div>
    );
  }

  const totalPages = pages.length;
  const actCount = acts.length;
  const unassignedVisible = unassignedPageIds.filter(pageMatchesSearch);

  return (
    <div className="panel flex w-72 flex-shrink-0 flex-col border-r overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-1 border-b border-[var(--studio-border)] px-3 py-2.5 flex-shrink-0">
        <button
          onClick={toggleLeftSidebar}
          className="p-1 -ml-0.5 text-[var(--studio-text-muted)] hover:text-[var(--studio-text-primary)]"
          title="Свернуть"
        >
          ◀
        </button>
        <span className="text-[11px] font-semibold tracking-widest text-[var(--studio-text-secondary)] flex-1">СТРАНИЦЫ</span>

        {/* Lock */}
        <button
          onClick={toggleLeftSidebarLocked}
          title={leftSidebarLocked ? 'Замок включён: сайдбар не сворачивается при Playtest' : 'Замок выключен: сайдбар сворачивается при Playtest'}
          className={`p-1 rounded transition-all ${leftSidebarLocked ? 'text-[var(--studio-accent)]' : 'text-[var(--studio-text-muted)] hover:text-[var(--studio-text-secondary)]'}`}
        >
          {leftSidebarLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
        </button>

        {/* Add act */}
        <button
          onClick={() => { addAct(); toast.success('Новый акт создан'); }}
          title="Добавить акт"
          className="p-1 rounded text-[var(--studio-text-muted)] hover:text-[var(--studio-accent)] hover:bg-[var(--studio-bg-elevated)]"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>

        {/* Add page (unassigned) */}
        <button
          onClick={() => handleAddPage(null)}
          title="Новая страница (без акта)"
          className="studio-btn flex items-center gap-1 rounded-md bg-[var(--studio-accent)] px-2 py-1 text-[10px] font-semibold text-[#1C1814] hover:bg-[var(--studio-accent-hover)]"
        >
          + Стр.
        </button>
      </div>

      {/* Search */}
      <div className="px-2 py-2 border-b border-[var(--studio-border)] flex-shrink-0">
        <div className="flex items-center gap-2 rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] px-2 py-1">
          <Search className="h-3.5 w-3.5 flex-shrink-0 text-[var(--studio-text-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
        {/* Acts */}
        {acts.map((act, actIdx) => (
          <ActSection key={act.id} act={act} actIdx={actIdx} />
        ))}

        {/* Final act drop zone — after last act */}
        {acts.length > 0 && (() => {
          const isActive = dropTarget?.type === 'act-slot' && dropTarget.index === acts.length;
          return (
            <div
              className="relative h-5 flex items-center px-2"
              onDragOver={(e) => {
                if (dragItemRef.current?.type === 'act') { e.preventDefault(); e.stopPropagation(); setDropTarget({ type: 'act-slot', index: acts.length }); }
              }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null); }}
              onDrop={(e) => { e.stopPropagation(); onDropActSlot(e, acts.length); }}
            >
              <div className={`h-0.5 w-full rounded-full transition-all duration-75 ${isActive ? 'bg-[var(--studio-accent)] opacity-100' : 'opacity-0'}`} />
              {isActive && <div className="absolute left-1 w-2 h-2 rounded-full bg-[var(--studio-accent)] top-1/2 -translate-y-1/2" />}
            </div>
          );
        })()}

        {/* Unassigned section */}
        {(unassignedPageIds.length > 0 || acts.length === 0) && (
          <div className="mt-1 mx-1">
            {acts.length > 0 && (
              <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
                <div className="flex-1 h-px bg-[var(--studio-border)]" />
                <span className="text-[10px] text-[var(--studio-text-muted)] font-medium">БЕЗ АКТА</span>
                <span className="text-[10px] text-[var(--studio-text-muted)] bg-[var(--studio-bg-elevated)] rounded px-1">{unassignedPageIds.length}</span>
                <div className="flex-1 h-px bg-[var(--studio-border)]" />
              </div>
            )}
            <DropLine actId={null} index={0} />
            {(searchLower ? unassignedVisible : unassignedPageIds).map((pid, i) => (
              <div key={pid}>
                <PageRow pageId={pid} actId={null} />
                <DropLine actId={null} index={i + 1} />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {pages.length === 0 && (
          <div className="px-4 py-6 text-center text-[11px] text-[var(--studio-text-muted)]">
            Нет страниц
          </div>
        )}

        {/* No search results */}
        {searchLower && acts.every((a) => a.pageIds.filter(pageMatchesSearch).length === 0) && unassignedVisible.length === 0 && (
          <div className="px-4 py-4 text-center text-[11px] text-[var(--studio-text-muted)]">
            Ничего не найдено
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[var(--studio-border)] px-3 py-2 text-[10px] text-[var(--studio-text-muted)] flex items-center justify-between flex-shrink-0">
        <span>{totalPages} страниц{totalPages === 1 ? 'а' : totalPages < 5 ? 'ы' : ''}</span>
        {actCount > 0 && <span>{actCount} акт{actCount === 1 ? '' : actCount < 5 ? 'а' : 'ов'}</span>}
      </div>
    </div>
  );
}
