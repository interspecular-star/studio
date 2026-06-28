"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Search, Star, Lock, Unlock, Copy, Trash2, Pencil, Plus,
  Download, Upload, Check, ChevronDown, MoreHorizontal,
  Layers, Package, BookOpen, Zap, Image, Layout, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

import { useStudioStore } from '@/lib/store';
import { usePresetsStore, BUILT_IN_PRESETS, type WidgetPreset, type PresetCategory, PRESET_CATEGORY_LABELS } from '@/lib/presetsStore';
import {
  WIDGET_CATALOG, WIDGET_CATEGORY_LABELS, catalogByCategory,
  makeWidgetFromDefinition, type WidgetCatalogCategory,
} from '@/lib/widgetCatalog';

// ─── Category icons ───────────────────────────────────────────────────────────

const WIDGET_CAT_ICONS: Record<WidgetCatalogCategory, React.ReactNode> = {
  dialogue: <BookOpen className="h-3.5 w-3.5" />,
  choice: <Zap className="h-3.5 w-3.5" />,
  media: <Image className="h-3.5 w-3.5" />,
  ui: <Layout className="h-3.5 w-3.5" />,
  effects: <Sparkles className="h-3.5 w-3.5" />,
};

const PRESET_CAT_ICONS: Record<PresetCategory, React.ReactNode> = {
  dialogue: <BookOpen className="h-3.5 w-3.5" />,
  choice: <Zap className="h-3.5 w-3.5" />,
  scene: <Layers className="h-3.5 w-3.5" />,
  cutscene: <Sparkles className="h-3.5 w-3.5" />,
  ui: <Layout className="h-3.5 w-3.5" />,
  custom: <Package className="h-3.5 w-3.5" />,
};

// ─── Context menu ─────────────────────────────────────────────────────────────

type CtxMenu = { presetId: string; x: number; y: number } | null;

// ─── Preset thumbnail placeholder ─────────────────────────────────────────────

function PresetThumbnail({ preset }: { preset: WidgetPreset }) {
  if (preset.thumbnail) {
    return <img src={preset.thumbnail} alt={preset.name} className="w-full h-full object-cover rounded-t-lg" />;
  }
  const emoji = PRESET_CAT_ICONS[preset.category];
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-1 rounded-t-lg bg-[var(--studio-bg-panel)]">
      <div className="text-2xl opacity-40">{['💬','🔘','🎬','✨','🖥️','📦'][Object.keys(PRESET_CATEGORY_LABELS).indexOf(preset.category)] ?? '📦'}</div>
      <div className="text-[10px] text-[var(--studio-text-muted)] text-center px-1 line-clamp-2 leading-tight">{preset.name}</div>
      {preset.widgets.length > 0 && (
        <div className="text-[9px] text-[var(--studio-text-muted)] opacity-60">{preset.widgets.length} виджетов</div>
      )}
    </div>
  );
}

// ─── Preset Card ──────────────────────────────────────────────────────────────

function PresetCard({
  preset,
  onApply,
  onApplyMerge,
  onContextMenu,
}: {
  preset: WidgetPreset;
  onApply: (p: WidgetPreset) => void;
  onApplyMerge: (p: WidgetPreset) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
}) {
  const { toggleFavorite } = usePresetsStore();

  return (
    <div
      className="group relative flex flex-col rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] overflow-hidden hover:border-[var(--studio-accent)] transition-all cursor-pointer"
      onDoubleClick={() => onApply(preset)}
    >
      {/* Thumbnail area */}
      <div className="h-24 relative overflow-hidden">
        <PresetThumbnail preset={preset} />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={e => { e.stopPropagation(); onApply(preset); }}
            className="rounded-md bg-[var(--studio-accent)] px-3 py-1.5 text-[11px] font-semibold text-[#1C1814] hover:brightness-110"
            title="Заменить виджеты страницы"
          >
            Применить
          </button>
          <button
            onClick={e => { e.stopPropagation(); onApplyMerge(preset); }}
            className="rounded-md border border-white/30 px-2 py-1.5 text-[11px] text-white hover:bg-white/10"
            title="Добавить поверх текущих виджетов"
          >
            + Добавить
          </button>
        </div>
        {/* Badges */}
        <div className="absolute top-1.5 left-1.5 flex gap-1">
          {preset.isDefault && (
            <span className="rounded bg-[var(--studio-accent)] px-1 py-0.5 text-[8px] font-bold text-[#1C1814]">DEF</span>
          )}
          {preset.isLocked && (
            <span className="rounded bg-black/50 px-1 py-0.5 text-[8px] text-white/70"><Lock className="h-2.5 w-2.5 inline" /></span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-1 px-2 py-1.5">
        <span className="flex-1 truncate text-[11px] font-medium text-[var(--studio-text-primary)]">{preset.name}</span>
        <button
          onClick={e => { e.stopPropagation(); toggleFavorite(preset.id); }}
          className={`p-0.5 rounded transition-colors flex-shrink-0 ${
            preset.isFavorite ? 'text-amber-400' : 'text-[var(--studio-text-muted)] opacity-0 group-hover:opacity-100'
          }`}
          title={preset.isFavorite ? 'Убрать из избранного' : 'В избранное'}
        >
          <Star className="h-3 w-3" fill={preset.isFavorite ? 'currentColor' : 'none'} />
        </button>
        <button
          onClick={e => onContextMenu(e, preset.id)}
          className="p-0.5 rounded text-[var(--studio-text-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--studio-text-primary)] transition-all flex-shrink-0"
          title="Действия"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Widget Card ──────────────────────────────────────────────────────────────

function WidgetCard({ def, onAdd }: { def: (typeof WIDGET_CATALOG)[number]; onAdd: () => void }) {
  return (
    <button
      onClick={onAdd}
      className="group flex flex-col items-center gap-1.5 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] p-3 hover:border-[var(--studio-accent)] hover:bg-[var(--studio-bg-panel)] transition-all text-center"
      title={def.description}
    >
      <span className="text-2xl">{def.emoji}</span>
      <span className="text-[11px] font-medium text-[var(--studio-text-primary)] leading-tight">{def.name}</span>
      <span className="text-[9px] text-[var(--studio-text-muted)] leading-tight line-clamp-2">{def.description}</span>
    </button>
  );
}

// ─── Context Menu Component ────────────────────────────────────────────────────

function ContextMenu({
  menu,
  onClose,
  onAction,
}: {
  menu: CtxMenu;
  onClose: () => void;
  onAction: (action: string, presetId: string) => void;
}) {
  const preset = usePresetsStore(s => s.presets.find(p => p.id === menu?.presetId));

  useEffect(() => {
    const handle = () => onClose();
    window.addEventListener('click', handle);
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') onClose(); });
    return () => window.removeEventListener('click', handle);
  }, [onClose]);

  if (!menu || !preset) return null;

  const items = [
    { id: 'apply', label: 'Применить (заменить)', icon: <Check className="h-3.5 w-3.5" /> },
    { id: 'merge', label: 'Добавить поверх', icon: <Plus className="h-3.5 w-3.5" /> },
    { id: 'sep1' },
    { id: 'edit', label: 'Редактировать', icon: <Pencil className="h-3.5 w-3.5" />, disabled: preset.isLocked },
    { id: 'rename', label: 'Переименовать', icon: <Pencil className="h-3.5 w-3.5" />, disabled: preset.isLocked },
    { id: 'duplicate', label: 'Дублировать', icon: <Copy className="h-3.5 w-3.5" /> },
    { id: 'sep2' },
    { id: 'favorite', label: preset.isFavorite ? 'Убрать из избранного' : 'В избранное', icon: <Star className="h-3.5 w-3.5" fill={preset.isFavorite ? 'currentColor' : 'none'} /> },
    { id: 'lock', label: preset.isLocked ? 'Снять блокировку' : 'Заблокировать', icon: preset.isLocked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" /> },
    { id: 'default', label: preset.isDefault ? 'Убрать дефолт' : 'Сделать дефолтным', icon: <Check className="h-3.5 w-3.5" />, accent: !preset.isDefault },
    { id: 'sep3' },
    { id: 'export', label: 'Экспортировать', icon: <Download className="h-3.5 w-3.5" /> },
    { id: 'delete', label: 'Удалить', icon: <Trash2 className="h-3.5 w-3.5" />, danger: true, disabled: preset.isLocked },
  ];

  return (
    <div
      className="fixed z-[200] min-w-[190px] rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] py-1 shadow-2xl"
      style={{ top: menu.y, left: menu.x }}
      onClick={e => e.stopPropagation()}
    >
      {items.map((item, i) => {
        if (item.id.startsWith('sep')) return <div key={i} className="my-1 border-t border-[var(--studio-border)]" />;
        return (
          <button
            key={item.id}
            disabled={item.disabled}
            onClick={() => { onAction(item.id, menu.presetId); onClose(); }}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-[12px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              item.danger
                ? 'text-[var(--danger)] hover:bg-red-500/10'
                : item.accent
                ? 'text-[var(--studio-accent)] hover:bg-[var(--studio-bg-panel)]'
                : 'text-[var(--studio-text-primary)] hover:bg-[var(--studio-bg-panel)]'
            }`}
          >
            <span className="flex-shrink-0 opacity-70">{item.icon}</span>
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

type NavSection = 'widgets' | 'presets';
type NavCategory = string; // WidgetCatalogCategory | PresetCategory | 'all' | 'favorites'

export default function WidgetLibrary() {
  const { isWidgetLibraryOpen, closeWidgetLibrary, selectedPageId, addUIWidget, pages } = useStudioStore();
  const {
    presets: userPresets, addPreset, updatePreset, deletePreset, duplicatePreset,
    setDefaultPreset, toggleFavorite, toggleLock,
    importPresetsFromJSON, exportPresetToJSON, exportAllToJSON,
  } = usePresetsStore();
  const presets = [...BUILT_IN_PRESETS, ...userPresets];

  const [section, setSection] = useState<NavSection>('presets');
  const [category, setCategory] = useState<NavCategory>('all');
  const [search, setSearch] = useState('');

  // Rename inline
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  // New preset form
  const [newPresetOpen, setNewPresetOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetCategory, setNewPresetCategory] = useState<PresetCategory>('custom');
  const [newPresetDesc, setNewPresetDesc] = useState('');

  // Context menu
  const [ctxMenu, setCtxMenu] = useState<CtxMenu>(null);

  const importRef = useRef<HTMLInputElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isWidgetLibraryOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeWidgetLibrary(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isWidgetLibraryOpen, closeWidgetLibrary]);

  // Reset state when opening
  useEffect(() => {
    if (isWidgetLibraryOpen) { setSearch(''); setCtxMenu(null); }
  }, [isWidgetLibraryOpen]);

  // ── filtered presets ──
  const filteredPresets = presets.filter(p => {
    if (search) {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.tags.some(t => t.includes(q));
    }
    if (category === 'favorites') return p.isFavorite;
    if (category !== 'all') return p.category === category;
    return true;
  });

  // ── filtered widgets ──
  const catalogGroups = catalogByCategory();
  const filteredWidgets = search
    ? WIDGET_CATALOG.filter(w => w.name.toLowerCase().includes(search.toLowerCase()) || w.description.toLowerCase().includes(search.toLowerCase()))
    : (category !== 'all' ? (catalogGroups[category as WidgetCatalogCategory] ?? []) : WIDGET_CATALOG);

  // ── apply preset ──
  const applyPreset = (preset: WidgetPreset, merge: boolean) => {
    if (!selectedPageId) { toast.error('Нет выбранной страницы'); return; }
    const page = pages.find(p => p.id === selectedPageId);
    if (!page) return;
    if (!merge) {
      // replace: delete existing widgets first (not exposed as bulk action, apply one-by-one via store)
      // We'll add all preset widgets; existing ones stay — user can handle via canvas
      toast.info('Виджеты добавлены. Удалите старые вручную если нужно заменить.');
    }
    for (const w of preset.widgets) {
      const { id: _id, ...rest } = w;
      addUIWidget(selectedPageId, rest);
    }
    toast.success(merge ? `Добавлено ${preset.widgets.length} виджетов` : `Применён пресет «${preset.name}»`);
    closeWidgetLibrary();
  };

  // ── add single widget ──
  const handleAddWidget = (def: (typeof WIDGET_CATALOG)[number]) => {
    if (!selectedPageId) { toast.error('Нет выбранной страницы'); return; }
    addUIWidget(selectedPageId, makeWidgetFromDefinition(def));
    toast.success(`Добавлен виджет «${def.name}»`);
    closeWidgetLibrary();
  };

  // ── save current page as preset ──
  const savePageAsPreset = () => {
    if (!selectedPageId) { toast.error('Нет выбранной страницы'); return; }
    const page = pages.find(p => p.id === selectedPageId);
    if (!page || !page.uiWidgets?.length) { toast.error('На странице нет виджетов'); return; }
    setNewPresetOpen(true);
    setNewPresetName(page.title?.ru || 'Новый пресет');
  };

  const commitNewPreset = () => {
    if (!newPresetName.trim()) { toast.error('Введите название'); return; }
    const page = selectedPageId ? pages.find(p => p.id === selectedPageId) : null;
    addPreset({
      name: newPresetName.trim(),
      description: newPresetDesc.trim(),
      category: newPresetCategory,
      tags: [],
      thumbnail: null,
      widgets: page?.uiWidgets ? [...page.uiWidgets] : [],
      isLocked: false,
      isDefault: false,
      isFavorite: false,
    });
    toast.success(`Пресет «${newPresetName.trim()}» сохранён`);
    setNewPresetOpen(false);
    setNewPresetName('');
    setNewPresetDesc('');
    setNewPresetCategory('custom');
    setSection('presets');
    setCategory('all');
  };

  // ── context menu actions ──
  const handleCtxAction = (action: string, presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;
    switch (action) {
      case 'apply': applyPreset(preset, false); break;
      case 'merge': applyPreset(preset, true); break;
      case 'rename': setRenamingId(presetId); setRenameDraft(preset.name); break;
      case 'edit': setRenamingId(presetId); setRenameDraft(preset.name); break;
      case 'duplicate': { const id = duplicatePreset(presetId); if (id) toast.success('Пресет дублирован'); break; }
      case 'favorite': toggleFavorite(presetId); break;
      case 'lock': toggleLock(presetId); break;
      case 'default': setDefaultPreset(preset.isDefault ? null : presetId); break;
      case 'export': {
        const json = exportPresetToJSON(presetId);
        if (!json) break;
        const a = document.createElement('a');
        a.href = `data:application/json,${encodeURIComponent(json)}`;
        a.download = `${preset.name.replace(/\s+/g, '_')}.preset.json`;
        a.click();
        break;
      }
      case 'delete': {
        if (preset.isLocked) { toast.error('Пресет заблокирован'); return; }
        deletePreset(presetId);
        toast.info('Пресет удалён');
        break;
      }
    }
  };

  // ── import ──
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const json = ev.target?.result as string;
      const { imported, skipped } = importPresetsFromJSON(json);
      toast.success(`Импортировано: ${imported}${skipped ? `, пропущено: ${skipped}` : ''}`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ── export all ──
  const handleExportAll = () => {
    const json = exportAllToJSON();
    const a = document.createElement('a');
    a.href = `data:application/json,${encodeURIComponent(json)}`;
    a.download = `slay_presets_${Date.now()}.json`;
    a.click();
  };

  // ── context menu position fix ──
  const openCtxMenu = (e: React.MouseEvent, presetId: string) => {
    e.preventDefault(); e.stopPropagation();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let x = e.clientX;
    let y = e.clientY;
    if (x + 200 > vw) x = vw - 210;
    if (y + 300 > vh) y = vh - 310;
    setCtxMenu({ presetId, x, y });
  };

  if (!isWidgetLibraryOpen) return null;

  const widgetCats = Object.keys(WIDGET_CATEGORY_LABELS) as WidgetCatalogCategory[];
  const presetCats = Object.keys(PRESET_CATEGORY_LABELS) as PresetCategory[];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px]"
        onClick={closeWidgetLibrary}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[110] flex items-center justify-center pointer-events-none">
        <div
          className="pointer-events-auto flex flex-col rounded-xl border border-[var(--studio-border)] bg-[var(--studio-bg-base)] shadow-2xl"
          style={{ width: 920, height: 620, maxWidth: '95vw', maxHeight: '90vh' }}
          onClick={e => { e.stopPropagation(); setCtxMenu(null); }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-[var(--studio-border)] px-5 py-3.5 flex-shrink-0">
            <Package className="h-4.5 w-4.5 text-[var(--studio-accent)]" />
            <span className="font-semibold text-[var(--studio-text-primary)]">Библиотека виджетов</span>
            <div className="flex items-center gap-2 rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] px-2 py-1 ml-2 flex-1 max-w-64">
              <Search className="h-3.5 w-3.5 text-[var(--studio-text-muted)] flex-shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Поиск..."
                className="flex-1 bg-transparent text-sm text-[var(--studio-text-primary)] outline-none placeholder:text-[var(--studio-text-muted)]"
              />
              {search && <button onClick={() => setSearch('')} className="text-[var(--studio-text-muted)] hover:text-[var(--studio-text-primary)]"><X className="h-3 w-3" /></button>}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button onClick={savePageAsPreset}
                className="flex items-center gap-1.5 rounded-md border border-[var(--studio-border)] px-3 py-1.5 text-[12px] text-[var(--studio-text-secondary)] hover:border-[var(--studio-accent)] hover:text-[var(--studio-accent)] transition-all">
                <Plus className="h-3.5 w-3.5" /> Из страницы
              </button>
              <button onClick={() => importRef.current?.click()}
                className="flex items-center gap-1.5 rounded-md border border-[var(--studio-border)] px-3 py-1.5 text-[12px] text-[var(--studio-text-secondary)] hover:border-[var(--studio-accent)] transition-all">
                <Upload className="h-3.5 w-3.5" /> Импорт
              </button>
              {presets.length > 0 && (
                <button onClick={handleExportAll}
                  className="flex items-center gap-1.5 rounded-md border border-[var(--studio-border)] px-3 py-1.5 text-[12px] text-[var(--studio-text-secondary)] hover:border-[var(--studio-accent)] transition-all">
                  <Download className="h-3.5 w-3.5" /> Экспорт всех
                </button>
              )}
              <button onClick={closeWidgetLibrary} className="p-1.5 rounded-lg text-[var(--studio-text-muted)] hover:text-[var(--studio-text-primary)] hover:bg-[var(--studio-bg-elevated)]">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-1 min-h-0">
            {/* Left nav */}
            <div className="w-48 flex-shrink-0 border-r border-[var(--studio-border)] overflow-y-auto py-2 px-2">
              {/* Widgets section */}
              <button
                onClick={() => { setSection('widgets'); setCategory('all'); }}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-semibold tracking-wider transition-colors ${
                  section === 'widgets' && category === 'all' ? 'bg-[var(--studio-bg-elevated)] text-[var(--studio-text-primary)]' : 'text-[var(--studio-text-muted)] hover:text-[var(--studio-text-primary)]'
                }`}
              >
                <Layers className="h-3.5 w-3.5" /> ВИДЖЕТЫ
              </button>
              {widgetCats.map(cat => (
                <button key={cat}
                  onClick={() => { setSection('widgets'); setCategory(cat); }}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-1 text-[12px] transition-colors mt-0.5 ${
                    section === 'widgets' && category === cat
                      ? 'bg-[var(--studio-accent)]/10 text-[var(--studio-accent)]'
                      : 'text-[var(--studio-text-muted)] hover:text-[var(--studio-text-primary)] hover:bg-[var(--studio-bg-elevated)]'
                  }`}
                >
                  {WIDGET_CAT_ICONS[cat]}
                  {WIDGET_CATEGORY_LABELS[cat]}
                </button>
              ))}

              <div className="my-3 border-t border-[var(--studio-border)]" />

              {/* Presets section */}
              <button
                onClick={() => { setSection('presets'); setCategory('all'); }}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-semibold tracking-wider transition-colors ${
                  section === 'presets' && category === 'all' ? 'bg-[var(--studio-bg-elevated)] text-[var(--studio-text-primary)]' : 'text-[var(--studio-text-muted)] hover:text-[var(--studio-text-primary)]'
                }`}
              >
                <Package className="h-3.5 w-3.5" /> ПРЕСЕТЫ
              </button>
              <button
                onClick={() => { setSection('presets'); setCategory('favorites'); }}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-1 text-[12px] transition-colors mt-0.5 ${
                  section === 'presets' && category === 'favorites'
                    ? 'bg-[var(--studio-accent)]/10 text-[var(--studio-accent)]'
                    : 'text-[var(--studio-text-muted)] hover:text-[var(--studio-text-primary)] hover:bg-[var(--studio-bg-elevated)]'
                }`}
              >
                <Star className="h-3.5 w-3.5" /> Избранные
              </button>
              {presetCats.map(cat => (
                <button key={cat}
                  onClick={() => { setSection('presets'); setCategory(cat); }}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-1 text-[12px] transition-colors mt-0.5 ${
                    section === 'presets' && category === cat
                      ? 'bg-[var(--studio-accent)]/10 text-[var(--studio-accent)]'
                      : 'text-[var(--studio-text-muted)] hover:text-[var(--studio-text-primary)] hover:bg-[var(--studio-bg-elevated)]'
                  }`}
                >
                  {PRESET_CAT_ICONS[cat]}
                  {PRESET_CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>

            {/* Main content */}
            <div className="flex-1 overflow-y-auto p-4">
              {section === 'widgets' && (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[12px] text-[var(--studio-text-muted)]">
                      {filteredWidgets.length} виджетов
                      {search ? ` по запросу «${search}»` : category !== 'all' ? ` · ${WIDGET_CATEGORY_LABELS[category as WidgetCatalogCategory]}` : ''}
                    </span>
                    {!selectedPageId && (
                      <span className="text-[11px] text-amber-500/80">Выберите страницу в левом сайдбаре</span>
                    )}
                  </div>
                  {filteredWidgets.length === 0 ? (
                    <div className="flex h-40 items-center justify-center text-[12px] text-[var(--studio-text-muted)]">Ничего не найдено</div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2.5">
                      {filteredWidgets.map(def => (
                        <WidgetCard key={def.type} def={def} onAdd={() => handleAddWidget(def)} />
                      ))}
                    </div>
                  )}
                </>
              )}

              {section === 'presets' && (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[12px] text-[var(--studio-text-muted)]">
                      {filteredPresets.length} пресетов
                      {search ? ` по запросу «${search}»` : category !== 'all' && category !== 'favorites' ? ` · ${PRESET_CATEGORY_LABELS[category as PresetCategory]}` : ''}
                    </span>
                    <button
                      onClick={() => setNewPresetOpen(true)}
                      className="flex items-center gap-1 rounded-md bg-[var(--studio-bg-elevated)] border border-[var(--studio-border)] px-2.5 py-1 text-[11px] text-[var(--studio-text-secondary)] hover:border-[var(--studio-accent)] hover:text-[var(--studio-accent)] transition-all"
                    >
                      <Plus className="h-3 w-3" /> Создать
                    </button>
                  </div>

                  {/* New preset form */}
                  {newPresetOpen && (
                    <div className="mb-4 rounded-lg border border-[var(--studio-accent)] bg-[var(--studio-bg-elevated)] p-4">
                      <div className="text-[12px] font-semibold text-[var(--studio-text-primary)] mb-3">Новый пресет</div>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="text-[11px] text-[var(--studio-text-muted)] mb-1 block">Название</label>
                          <input
                            autoFocus
                            value={newPresetName}
                            onChange={e => setNewPresetName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') commitNewPreset(); if (e.key === 'Escape') setNewPresetOpen(false); }}
                            placeholder="Название пресета..."
                            className="w-full rounded border border-[var(--studio-border)] bg-[var(--studio-bg-base)] px-2 py-1.5 text-[12px] text-[var(--studio-text-primary)] outline-none focus:border-[var(--studio-accent)]"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-[var(--studio-text-muted)] mb-1 block">Категория</label>
                          <select
                            value={newPresetCategory}
                            onChange={e => setNewPresetCategory(e.target.value as PresetCategory)}
                            className="w-full rounded border border-[var(--studio-border)] bg-[var(--studio-bg-base)] px-2 py-1.5 text-[12px] text-[var(--studio-text-primary)] outline-none focus:border-[var(--studio-accent)]"
                          >
                            {presetCats.map(c => <option key={c} value={c}>{PRESET_CATEGORY_LABELS[c]}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="text-[11px] text-[var(--studio-text-muted)] mb-1 block">Описание (опционально)</label>
                        <input
                          value={newPresetDesc}
                          onChange={e => setNewPresetDesc(e.target.value)}
                          placeholder="Краткое описание..."
                          className="w-full rounded border border-[var(--studio-border)] bg-[var(--studio-bg-base)] px-2 py-1.5 text-[12px] text-[var(--studio-text-primary)] outline-none focus:border-[var(--studio-accent)]"
                        />
                      </div>
                      <div className="text-[11px] text-[var(--studio-text-muted)] mb-3">
                        {selectedPageId
                          ? `Виджеты будут взяты с текущей страницы (${pages.find(p => p.id === selectedPageId)?.uiWidgets?.length ?? 0} шт.)`
                          : 'Пресет создастся пустым — добавьте виджеты позже через редактирование'}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={commitNewPreset} className="flex items-center gap-1 rounded bg-[var(--studio-accent)] px-3 py-1.5 text-[11px] font-semibold text-[#1C1814]">
                          <Check className="h-3 w-3" /> Сохранить
                        </button>
                        <button onClick={() => setNewPresetOpen(false)} className="rounded border border-[var(--studio-border)] px-3 py-1.5 text-[11px] text-[var(--studio-text-muted)]">
                          Отмена
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Inline rename */}
                  {filteredPresets.length === 0 && !newPresetOpen ? (
                    <div className="flex h-40 flex-col items-center justify-center gap-3 text-[var(--studio-text-muted)]">
                      <Package className="h-8 w-8 opacity-30" />
                      <span className="text-[12px]">{search ? 'Ничего не найдено' : 'Нет пресетов. Создайте первый!'}</span>
                      {!search && (
                        <button onClick={() => setNewPresetOpen(true)}
                          className="flex items-center gap-1 rounded-md bg-[var(--studio-accent)] px-3 py-1.5 text-[11px] font-semibold text-[#1C1814]">
                          <Plus className="h-3 w-3" /> Создать пресет
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-3">
                      {filteredPresets.map(preset => (
                        renamingId === preset.id ? (
                          <div key={preset.id} className="rounded-lg border border-[var(--studio-accent)] bg-[var(--studio-bg-elevated)] p-3 flex flex-col gap-2">
                            <input
                              autoFocus
                              value={renameDraft}
                              onChange={e => setRenameDraft(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') { updatePreset(preset.id, { name: renameDraft.trim() || preset.name }); setRenamingId(null); }
                                if (e.key === 'Escape') setRenamingId(null);
                              }}
                              className="w-full rounded border border-[var(--studio-border)] bg-[var(--studio-bg-base)] px-2 py-1 text-[12px] text-[var(--studio-text-primary)] outline-none focus:border-[var(--studio-accent)]"
                            />
                            <div className="flex gap-1">
                              <button onClick={() => { updatePreset(preset.id, { name: renameDraft.trim() || preset.name }); setRenamingId(null); }}
                                className="rounded bg-[var(--studio-accent)] px-2 py-0.5 text-[10px] font-semibold text-[#1C1814]">OK</button>
                              <button onClick={() => setRenamingId(null)}
                                className="rounded border border-[var(--studio-border)] px-2 py-0.5 text-[10px] text-[var(--studio-text-muted)]">Отмена</button>
                            </div>
                          </div>
                        ) : (
                          <PresetCard
                            key={preset.id}
                            preset={preset}
                            onApply={p => applyPreset(p, false)}
                            onApplyMerge={p => applyPreset(p, true)}
                            onContextMenu={openCtxMenu}
                          />
                        )
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Context menu */}
      <ContextMenu menu={ctxMenu} onClose={() => setCtxMenu(null)} onAction={handleCtxAction} />

      {/* Hidden file input for import */}
      <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
    </>
  );
}
