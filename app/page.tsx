"use client";

import { useState, useEffect } from 'react';
import { Plus, Play, Save, FolderOpen, Trash2, Upload, Download, RefreshCw } from 'lucide-react';
import { Toaster, toast } from 'sonner';

import { useStudioStore, useCurrentPage, type Item, type Variable } from '@/lib/store';
import KonvaCanvas from '@/components/editor/KonvaCanvas';
import CanvasWithRulers from '@/components/editor/CanvasWithRulers';
import ActionEditor from '@/components/editor/ActionEditor';
import PlaytestStatePanel from '@/components/editor/PlaytestStatePanel';

export default function SlayStudio() {
  const {
    pages,
    selectedPageId,
    selectedButtonId,
    selectPage,
    selectButton,
    addPage,
    deletePage,
    updatePage,
    addButton,
    deleteButton,
    updateButton,
    updateButtonLayout,
    copyButtonCoordinates,
    pasteButtonCoordinates,
    coordinateClipboard,
    meta,
    loadFromLocalStorage,
    exportProject,
    importProject,
    createNewProject,
    setProjectName,
    guides,
    addGuide,
    removeGuide,
    clearGuides,
    snapEnabled,
    setSnapEnabled,
    setSnappingGuide,
    items,
    addItem,
    updateItem,
    deleteItem,
    variables,
    addVariable,
    updateVariable,
    deleteVariable,
    playtestState,
    resetPlaytestState,
    mode,
    setMode,
    enterPlaytest,
    exitPlaytest,
    leftSidebarCollapsed,
    rightSidebarCollapsed,
    toggleLeftSidebar,
    toggleRightSidebar,
    saveCanvasSnapshot,
    undoCanvas,
    redoCanvas,
    canvasHistory,
    canvasFuture,
    renamePage,
    addDefaultPlayerStats,
    playerStatsCollapsed,
    togglePlayerStatsCollapsed,
  } = useStudioStore();

  const currentPage = useCurrentPage();

  // Keep editingPageId in sync when switching pages
  useEffect(() => {
    if (currentPage) {
      setEditingPageId(currentPage.id);
    }
  }, [currentPage?.id]);

  // Helper: only number variables (for item quantity linking)
  const numberVariables = variables.filter(v => v.type === 'number');
  const [langTab, setLangTab] = useState<'ru' | 'en'>('ru');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'restored'>('saved');

  // Project name editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState('');

  // Page ID editing (local state for controlled input + confirmation flow)
  const [editingPageId, setEditingPageId] = useState('');

  // Load project from localStorage on first mount
  useEffect(() => {
    const wasRestored = loadFromLocalStorage();
    if (wasRestored) {
      setSaveStatus('restored');
      toast.success('Проект восстановлен из сохранения');
      // Reset status after a few seconds
      setTimeout(() => setSaveStatus('saved'), 2500);
    }
  }, [loadFromLocalStorage]);

  // Project name editing handlers
  const startEditingName = () => {
    setEditingName(meta.name);
    setIsEditingName(true);
  };

  const commitProjectName = () => {
    const trimmed = editingName.trim();
    if (trimmed && trimmed !== meta.name) {
      setProjectName(trimmed);
      toast.success('Название проекта изменено');
    }
    setIsEditingName(false);
  };

  const cancelEditingName = () => {
    setIsEditingName(false);
  };

  // Relative time formatter (Russian) + live update
  const [nowTick, setNowTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setNowTick(t => t + 1), 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const getRelativeTime = (isoString: string | null): string => {
    if (!isoString) return 'ещё не сохранялся';

    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);

    if (diffSec < 30) return 'только что';
    if (diffSec < 60) return `${diffSec} сек. назад`;
    if (diffMin < 60) return `${diffMin} мин. назад`;
    if (diffHour < 24) return `${diffHour} ч. назад`;
    return date.toLocaleDateString('ru-RU');
  };

  const lastSavedText = meta.lastSaved ? getRelativeTime(meta.lastSaved) : 'ещё не сохранялся';

  const selectedButton = currentPage?.buttons.find((b) => b.id === selectedButtonId) ?? null;

  // === Handlers ===
  const handleAddPage = () => {
    addPage();
    toast.success('Новая страница создана');
  };

  const handleDeletePage = (id: string) => {
    if (pages.length === 1) {
      toast.error('Нельзя удалить последнюю страницу');
      return;
    }
    deletePage(id);
    toast.info('Страница удалена');
  };

  const handleAddButton = () => {
    if (!selectedPageId) return;
    addButton(selectedPageId);
    toast.success('Кнопка добавлена');
  };

  const handleDeleteButton = (buttonId: string) => {
    if (!selectedPageId) return;
    deleteButton(selectedPageId, buttonId);
    toast.info('Кнопка удалена');
  };

  const updateCurrentPage = (updates: any) => {
    if (!selectedPageId) return;
    updatePage(selectedPageId, updates);
  };

  const updateSelectedButton = (updates: any) => {
    if (!selectedPageId || !selectedButtonId) return;
    updateButton(selectedPageId, selectedButtonId, updates);
  };

  const updateSelectedButtonLayout = (layoutUpdates: Partial<any>) => {
    if (!selectedPageId || !selectedButtonId) return;
    updateButtonLayout(selectedPageId, selectedButtonId, layoutUpdates);
  };

  const handleCopyCoordinates = () => {
    if (!selectedPageId || !selectedButtonId) return;
    copyButtonCoordinates(selectedPageId, selectedButtonId);
    toast.success('Координаты кнопки скопированы');
  };

  const handlePasteCoordinates = () => {
    if (!selectedPageId || !selectedButtonId) return;
    pasteButtonCoordinates(selectedPageId, selectedButtonId);
    toast.success('Координаты применены');
  };

  return (
    <div className="studio-container flex h-screen flex-col overflow-hidden">
      <Toaster position="top-center" richColors closeButton />

      {/* Top Bar */}
      <div className="flex h-14 items-center justify-between border-b border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] px-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-[var(--studio-accent)]" />
            <div>
              <span className="font-semibold tracking-tight">Slay Studio</span>
              <span className="ml-1.5 text-xs text-[var(--studio-text-muted)]">Alpha</span>
            </div>
          </div>
          {/* Editable Project Name */}
          <div className="ml-6 flex items-center gap-2 text-sm text-[var(--studio-text-secondary)]">
            <FolderOpen className="h-4 w-4 flex-shrink-0" />
            {isEditingName ? (
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={commitProjectName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitProjectName();
                  if (e.key === 'Escape') cancelEditingName();
                }}
                className="w-64 rounded border border-[var(--studio-accent)] bg-[var(--studio-bg-base)] px-2 py-0.5 text-[var(--studio-text-primary)] focus:outline-none"
                autoFocus
              />
            ) : (
              <button
                onClick={startEditingName}
                className="max-w-[280px] truncate rounded px-1.5 py-0.5 text-left hover:bg-[var(--studio-bg-elevated)] hover:text-[var(--studio-text-primary)]"
                title="Нажмите, чтобы переименовать проект"
              >
                {meta.name}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Save Status Indicator - much more informative */}
          <div className="flex items-center gap-2 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-3 py-1 text-xs">
            {saveStatus === 'unsaved' ? (
              <span className="text-amber-400">Есть несохранённые изменения</span>
            ) : saveStatus === 'restored' ? (
              <span className="flex items-center gap-1.5 text-[var(--studio-accent)]">
                <RefreshCw className="h-3.5 w-3.5" />
                Проект восстановлен
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[var(--studio-text-secondary)]">
                <Save className="h-3.5 w-3.5" />
                Сохранено: <span className="font-mono text-[var(--studio-text-muted)]">{lastSavedText}</span>
              </span>
            )}
          </div>

          {/* Mode Switch */}
          <div className="flex rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] p-0.5">
            <button
              onClick={exitPlaytest}
              className={`rounded-md px-4 py-1.5 text-sm transition-all ${mode === 'editor'
                ? 'bg-[var(--studio-accent)] text-[#1C1814] font-medium'
                : 'hover:bg-[var(--studio-bg-elevated)]'
                }`}
            >
              Редактор
            </button>
            <button
              onClick={enterPlaytest}
              className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm transition-all ${mode === 'playtest'
                ? 'bg-[var(--studio-accent)] text-[#1C1814] font-medium'
                : 'hover:bg-[var(--studio-bg-elevated)]'
                }`}
            >
              <Play className="h-3.5 w-3.5" />
              Playtest
            </button>
          </div>

          {/* Canvas Undo / Redo - only for canvas button positions */}
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={undoCanvas}
              disabled={canvasHistory.length === 0}
              className="studio-btn flex items-center gap-1.5 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-3 py-2 text-sm hover:border-[var(--studio-accent)] disabled:opacity-40 disabled:cursor-not-allowed"
              title="Отменить последнее изменение на холсте (Ctrl+Z)"
            >
              ↩ Отменить
            </button>
            <button
              onClick={redoCanvas}
              disabled={canvasFuture.length === 0}
              className="studio-btn flex items-center gap-1.5 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-3 py-2 text-sm hover:border-[var(--studio-accent)] disabled:opacity-40 disabled:cursor-not-allowed"
              title="Повторить (Ctrl+Shift+Z)"
            >
              Redo ↪
            </button>
          </div>

          {/* Project Actions */}
          <button
            onClick={() => {
              exportProject();
              setSaveStatus('saved');
              toast.success('Проект экспортирован');
            }}
            className="studio-btn flex items-center gap-2 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-4 py-2 text-sm hover:border-[var(--studio-accent)]"
            title="Экспортировать проект в JSON файл"
          >
            <Download className="h-4 w-4" />
            Экспорт
          </button>

          <label className="studio-btn flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-4 py-2 text-sm hover:border-[var(--studio-accent)]">
            <Upload className="h-4 w-4" />
            Импорт
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (event) => {
                  try {
                    const data = JSON.parse(event.target?.result as string);

                    // Safety check before replacing current work
                    const hasContent = pages.length > 1 || (pages[0]?.buttons.length ?? 0) > 0;

                    if (hasContent) {
                      const shouldProceed = confirm(
                        'Импорт заменит текущий проект.\n\nРекомендуется сначала экспортировать текущую работу.\n\nПродолжить импорт?'
                      );
                      if (!shouldProceed) {
                        e.target.value = '';
                        return;
                      }
                    }

                    const success = importProject(data);
                    if (success) {
                      toast.success('Проект успешно импортирован');
                      setSaveStatus('restored');
                    }
                  } catch {
                    toast.error('Не удалось прочитать файл проекта');
                  }
                  e.target.value = ''; // reset input
                };
                reader.readAsText(file);
              }}
            />
          </label>

          <button
            onClick={() => {
              const hasContent = pages.length > 1 || (pages[0]?.buttons.length ?? 0) > 0;
              const message = hasContent
                ? 'Создать новый проект?\n\nТекущий проект будет заменён (рекомендуется сначала экспортировать его).'
                : 'Создать новый чистый проект?';

              if (confirm(message)) {
                createNewProject();
                setSaveStatus('saved');
                toast.success('Создан новый проект');
              }
            }}
            className="studio-btn flex items-center gap-2 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-4 py-2 text-sm hover:border-[var(--studio-accent)]"
          >
            <RefreshCw className="h-4 w-4" />
            Новый проект
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Pages */}
        <div className={`panel flex flex-shrink-0 flex-col border-r transition-all duration-200 overflow-hidden ${leftSidebarCollapsed ? 'w-8' : 'w-72'}`}>
          {leftSidebarCollapsed ? (
            // Collapsed state - thin vertical bar
            <div className="flex flex-col h-full items-center pt-3 border-b border-[var(--studio-border)]">
              <button
                onClick={toggleLeftSidebar}
                className="rotate-90 text-[var(--studio-text-muted)] hover:text-[var(--studio-text-primary)] p-1 text-xs tracking-widest"
                title="Развернуть панель страниц"
              >
                СТРАНИЦЫ
              </button>
            </div>
          ) : (
            // Expanded state
            <>
              {/* Small control bar when left sidebar is expanded */}
              <div className="flex justify-start border-b border-[var(--studio-border)] px-2 py-1">
                <button
                  onClick={toggleLeftSidebar}
                  className="text-[var(--studio-text-muted)] hover:text-[var(--studio-text-primary)] p-1"
                  title="Свернуть панель страниц"
                >
                  ◀
                </button>
              </div>

              <div className="flex items-center justify-between border-b border-[var(--studio-border)] px-4 py-3">
                <span className="text-sm font-medium text-[var(--studio-text-secondary)]">СТРАНИЦЫ</span>
                <button
                  onClick={handleAddPage}
                  className="studio-btn flex items-center gap-1.5 rounded-md bg-[var(--studio-accent)] px-3 py-1 text-xs font-medium text-[#1C1814] hover:bg-[var(--studio-accent-hover)]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Новая
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {pages.map((page) => (
                  <div
                    key={page.id}
                    className={`group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all mb-1 ${selectedPageId === page.id
                      ? 'bg-[var(--studio-accent)] text-[#1C1814] font-medium'
                      : 'hover:bg-[var(--studio-bg-elevated)] text-[var(--studio-text-primary)]'
                      }`}
                  >
                    <button
                      onClick={() => selectPage(page.id)}
                      className="flex-1 text-left"
                    >
                      {page.title.ru}
                      <div className="font-mono text-[10px] opacity-60 mt-0.5">{page.id}</div>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeletePage(page.id); }}
                      className="ml-2 opacity-0 group-hover:opacity-60 hover:opacity-100 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="border-t border-[var(--studio-border)] p-3 text-[10px] text-[var(--studio-text-muted)]">
                <span>{pages.length} страниц</span>
              </div>
            </>
          )}
        </div>

        {/* CENTER: Canvas */}
        <div className="flex flex-1 flex-col">
          {/* Playtest Mode Banner */}
          {mode === 'playtest' && (
            <div className="flex items-center justify-between bg-[#C25D3A] px-4 py-2 text-sm text-white shadow-inner">
              <div className="flex items-center gap-2">
                <span className="font-semibold">▶ PLAYTEST РЕЖИМ</span>
                <span className="opacity-90">— Кнопки выполняют действия. Состояние не сохраняется.</span>
              </div>
              <button
                onClick={exitPlaytest}
                className="rounded-md bg-white/20 px-3 py-1 text-sm font-medium hover:bg-white/30 active:bg-white/40 transition-colors"
              >
                Выйти в редактор
              </button>
            </div>
          )}

          <div className="flex items-center justify-between border-b border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] px-4 py-2 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-medium">{currentPage?.title.ru}</span>
              <span className="rounded bg-[var(--studio-bg-panel)] px-2 py-0.5 font-mono text-[var(--studio-text-muted)]">
                {selectedPageId}
              </span>
            </div>
            <div className="text-[var(--studio-text-muted)]">960 × 600</div>
          </div>

          <div className="flex flex-1 items-center justify-center bg-[#161310] p-6 overflow-auto">
            <CanvasWithRulers width={960} height={600}>
              <KonvaCanvas width={960} height={600} />
            </CanvasWithRulers>
          </div>
        </div>

        {/* RIGHT: Inspector — Balanced & Useful */}
        <div className={`panel flex flex-shrink-0 flex-col border-l transition-all duration-200 overflow-hidden ${rightSidebarCollapsed ? 'w-8' : 'w-80'}`}>
          {rightSidebarCollapsed ? (
            // Collapsed thin bar on the right
            <div className="flex flex-col h-full items-center pt-3 border-b border-[var(--studio-border)]">
              <button
                onClick={toggleRightSidebar}
                className="-rotate-90 text-[var(--studio-text-muted)] hover:text-[var(--studio-text-primary)] p-1 text-xs tracking-widest"
                title="Развернуть правую панель"
              >
                {mode === 'playtest' ? 'СОСТОЯНИЕ' : 'СВОЙСТВА'}
              </button>
            </div>
          ) : (
            <>
              {/* Small control bar when right sidebar is expanded */}
              <div className="flex justify-end border-b border-[var(--studio-border)] px-2 py-1">
                <button
                  onClick={toggleRightSidebar}
                  className="text-[var(--studio-text-muted)] hover:text-[var(--studio-text-primary)] p-1"
                  title="Свернуть правую панель"
                >
                  ▶
                </button>
              </div>

              {mode === 'playtest' ? (
                <PlaytestStatePanel />
              ) : (
                <>
                  <div className="border-b border-[var(--studio-border)] px-4 py-3">
                    <span className="text-sm font-medium text-[var(--studio-text-secondary)]">СВОЙСТВА</span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Snapping Toggle - always visible and independent */}
            <div className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--studio-text-secondary)]">ПРИЛИПАНИЕ</span>
                <button
                  onClick={() => {
                    const newValue = !snapEnabled;
                    setSnapEnabled(newValue);
                    if (!newValue) {
                      setSnappingGuide(null);
                    }
                  }}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    snapEnabled ? 'bg-[var(--studio-accent)]' : 'bg-[var(--studio-border)]'
                  }`}
                  role="switch"
                  aria-checked={snapEnabled}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      snapEnabled ? 'translate-x-[18px]' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
              <p className="mt-2 text-[11px] leading-snug text-[var(--studio-text-muted)]">
                При перетаскивании кнопки автоматически прилипают к направляющим.
              </p>
            </div>

            {/* === ХАРАКТЕРИСТИКИ ГГ (постоянный блок) === */}
            <div className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] p-3">
              <button
                onClick={togglePlayerStatsCollapsed}
                className="flex w-full items-center justify-between text-sm font-medium text-[var(--studio-text-secondary)]"
              >
                <span>ХАРАКТЕРИСТИКИ ГГ</span>
                <span className="text-xs">{playerStatsCollapsed ? '▶' : '▼'}</span>
              </button>

              {!playerStatsCollapsed && (
                <div className="mt-3 space-y-1.5 text-sm">
                  {variables.filter(v => v.category === 'player').length === 0 ? (
                    <p className="text-[11px] text-[var(--studio-text-muted)] italic">
                      Нажмите «+ Характеристики ГГ» выше, чтобы добавить.
                    </p>
                  ) : (
                    variables
                      .filter(v => v.category === 'player')
                      .sort((a, b) => {
                        const order = ['health', 'health_max', 'mana', 'mana_max', 'strength', 'agility', 'endurance', 'defense', 'souls', 'level', 'exp'];
                        const ia = order.indexOf(a.name);
                        const ib = order.indexOf(b.name);
                        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
                      })
                      .map((variable) => {
                        const currentValue = playtestState.variableValues[variable.id] ?? variable.defaultValue;

                        // Special row for health and mana (current / max)
                        if (variable.name === 'health' || variable.name === 'mana') {
                          const maxVar = variables.find(v => v.name === `${variable.name}_max`);
                          const maxValue = maxVar ? (playtestState.variableValues[maxVar.id] ?? maxVar.defaultValue) : currentValue;

                          return (
                            <div key={variable.id} className="flex items-center justify-between gap-2 rounded border border-[var(--studio-border)] bg-[#1C1814] px-3 py-1.5">
                              <span className="text-[var(--studio-text-secondary)]">{variable.displayName.ru}</span>
                              <div className="flex items-center gap-1 font-mono text-[var(--studio-accent)]">
                                <input
                                  type="number"
                                  value={currentValue as number}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    updateVariable(variable.id, { defaultValue: val });
                                  }}
                                  className="w-14 rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-1 py-0.5 text-xs text-right"
                                />
                                <span>/</span>
                                {maxVar ? (
                                  <input
                                    type="number"
                                    value={maxValue as number}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value) || 0;
                                      updateVariable(maxVar.id, { defaultValue: val });
                                    }}
                                    className="w-14 rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-1 py-0.5 text-xs text-right"
                                  />
                                ) : (
                                  <span>{maxValue}</span>
                                )}
                              </div>
                            </div>
                          );
                        }

                        // Skip _max versions (they are shown paired with health/mana)
                        if (variable.name.endsWith('_max')) return null;

                        return (
                          <div key={variable.id} className="flex items-center justify-between gap-2 rounded border border-[var(--studio-border)] bg-[#1C1814] px-3 py-1.5">
                            <span className="text-[var(--studio-text-secondary)]">{variable.displayName.ru}</span>
                            <input
                              type="number"
                              value={currentValue as number}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                updateVariable(variable.id, { defaultValue: val });
                              }}
                              className="w-16 rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-1 py-0.5 text-xs text-right font-mono text-[var(--studio-accent)]"
                            />
                          </div>
                        );
                      })
                  )}
                </div>
              )}
            </div>

            {/* === VARIABLES / ПЕРЕМЕННЫЕ === */}
            <div className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[var(--studio-text-secondary)]">ПЕРЕМЕННЫЕ</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => resetPlaytestState()}
                    className="text-[10px] px-2 py-0.5 rounded border border-[var(--studio-border)] hover:bg-[var(--studio-bg-panel)]"
                    title="Сбросить все значения превью к дефолтным"
                  >
                    Сбросить
                  </button>
                  <button
                    onClick={() => {
                      const newVar: Omit<Variable, 'id'> = {
                        name: `custom_var_${Date.now().toString(36)}`,
                        displayName: { ru: 'Новая переменная', en: 'New Variable' },
                        type: 'number',
                        defaultValue: 0,
                        category: 'custom',
                      };
                      addVariable(newVar);
                    }}
                    className="flex items-center gap-1 rounded bg-[var(--studio-accent)] px-2 py-0.5 text-xs font-medium text-[#1C1814] hover:bg-[var(--studio-accent-hover)]"
                  >
                    + Добавить
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Добавить стандартные характеристики Главного Героя?')) {
                        addDefaultPlayerStats();
                      }
                    }}
                    className="flex items-center gap-1 rounded border border-[var(--studio-border)] px-2 py-0.5 text-xs hover:bg-[var(--studio-bg-panel)]"
                    title="Добавить здоровье, ману, силу, ловкость и другие базовые характеристики"
                  >
                    + Характеристики ГГ
                  </button>
                </div>
              </div>

              {variables.length === 0 && (
                <p className="text-[11px] text-[var(--studio-text-muted)] italic">
                  Нет переменных. Создайте первую, чтобы использовать в условиях.
                </p>
              )}

              <div className="space-y-2 max-h-72 overflow-auto pr-1">
                {variables
                  .filter(v => v.category !== 'player') // Player stats are shown in their own block above
                  .map((variable) => (
                  <div key={variable.id} className="rounded border border-[var(--studio-border)] bg-[#1C1814] p-2 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {/* Display Name RU */}
                        <input
                          value={variable.displayName.ru}
                          onChange={(e) =>
                            updateVariable(variable.id, {
                              displayName: { ...variable.displayName, ru: e.target.value },
                            })
                          }
                          className="w-full bg-transparent font-medium focus:outline-none"
                          placeholder="Название (RU)"
                        />
                        {/* Internal Name + Live Value */}
                        <div className="flex justify-between text-[10px] text-[var(--studio-text-muted)] font-mono mt-0.5">
                          <span>{variable.name}</span>
                          <span className="text-[var(--studio-accent)]">
                            {playtestState.variableValues[variable.id] ?? variable.defaultValue}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm('Удалить эту переменную?')) {
                            deleteVariable(variable.id);
                          }
                        }}
                        className="text-[var(--studio-danger)] hover:text-red-400 text-sm leading-none"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      {/* Type */}
                      <select
                        value={variable.type}
                        onChange={(e) =>
                          updateVariable(variable.id, {
                            type: e.target.value as Variable['type'],
                            defaultValue: e.target.value === 'boolean' ? false : e.target.value === 'string' ? '' : 0,
                          })
                        }
                        className="rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-2 py-1"
                      >
                        <option value="number">Число</option>
                        <option value="boolean">Да/Нет</option>
                        <option value="string">Текст</option>
                      </select>

                      {/* Category */}
                      <select
                        value={variable.category}
                        onChange={(e) =>
                          updateVariable(variable.id, {
                            category: e.target.value as Variable['category'],
                          })
                        }
                        className="rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-2 py-1"
                      >
                        <option value="custom">Кастомная</option>
                        <option value="player">Игрок</option>
                        <option value="resources">Ресурсы</option>
                        <option value="reputation">Репутация</option>
                        <option value="relationships">Отношения</option>
                        <option value="inventory">Инвентарь</option>
                      </select>
                    </div>

                    {/* Default Value */}
                    <div className="mt-2">
                      <label className="text-[10px] text-[var(--studio-text-muted)]">Значение по умолчанию</label>
                      {variable.type === 'boolean' ? (
                        <select
                          value={String(variable.defaultValue)}
                          onChange={(e) =>
                            updateVariable(variable.id, {
                              defaultValue: e.target.value === 'true',
                            })
                          }
                          className="mt-1 w-full rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-2 py-1 text-sm"
                        >
                          <option value="true">Да</option>
                          <option value="false">Нет</option>
                        </select>
                      ) : (
                        <input
                          type={variable.type === 'number' ? 'number' : 'text'}
                          value={variable.defaultValue as any}
                          onChange={(e) => {
                            let val: any = e.target.value;
                            if (variable.type === 'number') {
                              val = parseFloat(e.target.value) || 0;
                            }
                            updateVariable(variable.id, { defaultValue: val });
                          }}
                          className="mt-1 w-full rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-2 py-1 text-sm"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Page Properties */}
            <div className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[var(--studio-text-secondary)]">ПРЕДМЕТЫ</span>
                <button
                  onClick={() => {
                    const newItem: Omit<Item, 'id'> = {
                      name: { ru: 'Новый предмет', en: 'New Item' },
                      description: { ru: '', en: '' },
                    };
                    addItem(newItem);
                  }}
                  className="flex items-center gap-1 rounded bg-[var(--studio-accent)] px-2 py-0.5 text-xs font-medium text-[#1C1814] hover:bg-[var(--studio-accent-hover)]"
                >
                  + Добавить
                </button>
              </div>

              {items.length === 0 && (
                <p className="text-[11px] text-[var(--studio-text-muted)] italic">
                  Нет предметов. Добавьте первый, чтобы использовать в действиях и условиях.
                </p>
              )}

              <div className="space-y-2 max-h-60 overflow-auto pr-1">
                {items.map((item) => (
                  <div key={item.id} className="rounded border border-[var(--studio-border)] bg-[#1C1814] p-2 text-sm">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <input
                          value={item.name.ru}
                          onChange={(e) =>
                            updateItem(item.id, {
                              name: { ...item.name, ru: e.target.value },
                            })
                          }
                          className="w-full bg-transparent font-medium focus:outline-none text-sm"
                          placeholder="Название (RU)"
                        />
                        <input
                          value={item.name.en}
                          onChange={(e) =>
                            updateItem(item.id, {
                              name: { ...item.name, en: e.target.value },
                            })
                          }
                          className="w-full bg-transparent text-[10px] text-[var(--studio-text-muted)] focus:outline-none"
                          placeholder="Name (EN)"
                        />
                      </div>
                      <button
                        onClick={() => {
                          if (confirm('Удалить этот предмет?')) deleteItem(item.id);
                        }}
                        className="text-[var(--studio-danger)] hover:text-red-400 ml-1 text-sm leading-none"
                      >
                        ✕
                      </button>
                    </div>

                    <textarea
                      value={item.description.ru}
                      onChange={(e) =>
                        updateItem(item.id, {
                          description: { ...item.description, ru: e.target.value },
                        })
                      }
                      placeholder="Описание (RU)"
                      className="mt-1 w-full resize-y bg-transparent text-xs focus:outline-none"
                      rows={2}
                    />

                    {/* Quantity Variable Linking */}
                    <div className="mt-3 pt-2 border-t border-[var(--studio-border)]">
                      <label className="text-[10px] text-[var(--studio-text-muted)] block mb-1">
                        Количество хранится в переменной
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={item.quantityVariableId || ''}
                          onChange={(e) => {
                            updateItem(item.id, {
                              quantityVariableId: e.target.value || undefined,
                            });
                          }}
                          className="flex-1 rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-2 py-1 text-xs"
                        >
                          <option value="">— Не отслеживать количество —</option>
                          {numberVariables.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.displayName.ru} ({v.name})
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => {
                            const suggestedName = `item_${item.name.ru.toLowerCase().replace(/\s+/g, '_')}`;
                            const newVar: Omit<Variable, 'id'> = {
                              name: suggestedName,
                              displayName: { ru: `Кол-во: ${item.name.ru}`, en: `Qty: ${item.name.en}` },
                              type: 'number',
                              defaultValue: 0,
                              category: 'inventory',
                            };
                            addVariable(newVar);
                            // Link it immediately
                            const createdVar = variables.find(v => v.name === suggestedName) || 
                                              useStudioStore.getState().variables.find(v => v.name === suggestedName);
                            if (createdVar) {
                              updateItem(item.id, { quantityVariableId: createdVar.id });
                            }
                          }}
                          className="text-[10px] px-2 py-1 rounded border border-[var(--studio-border)] hover:bg-[var(--studio-bg-panel)] whitespace-nowrap"
                          title="Создать новую переменную для количества этого предмета"
                        >
                          + Переменная
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Page Properties */}
            <div className="space-y-4">
              {/* Page Name + ID */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--studio-text-secondary)]">НАЗВАНИЕ СТРАНИЦЫ</label>
                <div className="space-y-1.5">
                  <input
                    value={currentPage?.title.ru || ''}
                    onChange={(e) =>
                      renamePage(currentPage!.id, currentPage!.id, {
                        ...currentPage!.title,
                        ru: e.target.value,
                      })
                    }
                    placeholder="Название (РУ)"
                    className="w-full rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--studio-accent)]"
                  />
                  <input
                    value={currentPage?.title.en || ''}
                    onChange={(e) =>
                      renamePage(currentPage!.id, currentPage!.id, {
                        ...currentPage!.title,
                        en: e.target.value,
                      })
                    }
                    placeholder="Title (EN)"
                    className="w-full rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--studio-accent)]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--studio-text-secondary)]">
                  ID СТРАНИЦЫ <span className="text-[var(--studio-danger)]">(осторожно!)</span>
                </label>
                <input
                  value={editingPageId}
                  onChange={(e) => setEditingPageId(e.target.value)}
                  onBlur={() => {
                    const newId = editingPageId.trim();
                    if (newId && currentPage && newId !== currentPage.id) {
                      if (confirm(`Изменить ID страницы с "${currentPage.id}" на "${newId}"?\nВсе ссылки (goToPage) на эту страницу будут автоматически обновлены.`)) {
                        renamePage(currentPage.id, newId);
                      } else {
                        // revert to original ID
                        setEditingPageId(currentPage.id);
                      }
                    } else if (currentPage) {
                      // If no change or empty, reset to current
                      setEditingPageId(currentPage.id);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    }
                    if (e.key === 'Escape' && currentPage) {
                      setEditingPageId(currentPage.id);
                      e.currentTarget.blur();
                    }
                  }}
                  className="w-full rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[var(--studio-accent)]"
                />
                <p className="mt-1 text-[10px] text-[var(--studio-text-muted)]">
                  Используется в действиях "Перейти на страницу". Изменение обновит все ссылки.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--studio-text-secondary)]">ФОН СЦЕНЫ</label>
                <select
                  value={currentPage?.background}
                  onChange={(e) => updateCurrentPage({ background: e.target.value })}
                  className="w-full rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--studio-accent)]"
                >
                  <option value="village_morning">Деревня — утро</option>
                  <option value="tavern">Таверна</option>
                  <option value="cave">Пещера Слэя</option>
                  <option value="forest">Лес у Границы</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--studio-text-secondary)]">КТО ГОВОРИТ</label>
                <select
                  value={currentPage?.speaker}
                  onChange={(e) => updateCurrentPage({ speaker: e.target.value })}
                  className="w-full rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--studio-accent)]"
                >
                  <option value="narrator">Рассказчик</option>
                  <option value="slay">Слэй</option>
                  <option value="mila">Мила</option>
                  <option value="zyrk">Зырк</option>
                  <option value="zosya">Зося</option>
                  <option value="burmil">Бурмил</option>
                </select>
              </div>

              {/* Bilingual Text */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-medium text-[var(--studio-text-secondary)]">ТЕКСТ ДИАЛОГА</label>
                  <div className="flex text-[10px]">
                    <button
                      onClick={() => setLangTab('ru')}
                      className={`rounded px-2 py-0.5 ${langTab === 'ru' ? 'bg-[var(--studio-accent)] text-[#1C1814] font-medium' : 'hover:bg-[var(--studio-bg-elevated)]'}`}
                    >
                      РУ
                    </button>
                    <button
                      onClick={() => setLangTab('en')}
                      className={`rounded px-2 py-0.5 ${langTab === 'en' ? 'bg-[var(--studio-accent)] text-[#1C1814] font-medium' : 'hover:bg-[var(--studio-bg-elevated)]'}`}
                    >
                      EN
                    </button>
                  </div>
                </div>

                <textarea
                  value={langTab === 'ru' ? currentPage?.text.ru : currentPage?.text.en}
                  onChange={(e) => {
                    const field = langTab === 'ru' ? 'ru' : 'en';
                    updateCurrentPage({
                      text: { ...currentPage!.text, [field]: e.target.value },
                    });
                  }}
                  className="h-24 w-full resize-y rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--studio-accent)]"
                  placeholder={langTab === 'ru' ? 'Текст на русском...' : 'English text...'}
                />
              </div>
            </div>

            {/* Buttons Section */}
            <div className="border-t border-[var(--studio-border)] pt-5">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-medium text-[var(--studio-text-secondary)]">
                  КНОПКИ ({currentPage?.buttons.length ?? 0})
                </div>
                <button
                  onClick={handleAddButton}
                  className="flex items-center gap-1 rounded bg-[var(--studio-accent)] px-2.5 py-1 text-xs font-medium text-[#1C1814] hover:bg-[var(--studio-accent-hover)]"
                >
                  <Plus className="h-3 w-3" /> Добавить
                </button>
              </div>

              {/* Buttons list */}
              <div className="space-y-1.5 mb-4">
                {currentPage?.buttons.length === 0 && (
                  <div className="text-xs text-[var(--studio-text-muted)] py-2">Кнопок пока нет</div>
                )}
                {currentPage?.buttons.map((btn) => (
                  <div
                    key={btn.id}
                    onClick={() => selectButton(btn.id)}
                    className={`group flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${selectedButtonId === btn.id
                      ? 'border-[var(--studio-accent)] bg-[var(--studio-bg-elevated)]'
                      : 'border-[var(--studio-border)] hover:border-[var(--studio-border-strong)]'
                      }`}
                  >
                    <span className="truncate pr-2">{btn.text.ru}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteButton(btn.id); }}
                      className="opacity-40 hover:opacity-100 p-0.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Selected Button Inspector */}
              {selectedButton && (
                <div className="space-y-4 rounded-xl border border-[var(--studio-accent)]/40 bg-[var(--studio-bg-elevated)] p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium text-[var(--studio-accent)]">РЕДАКТИРОВАНИЕ КНОПКИ</div>
                    <button
                      onClick={() => handleDeleteButton(selectedButton.id)}
                      className="text-[var(--studio-danger)] hover:text-red-400"
                      title="Удалить кнопку"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Button text */}
                  <div>
                    <label className="mb-1 block text-[10px] text-[var(--studio-text-secondary)]">Текст кнопки (РУ)</label>
                    <input
                      value={selectedButton.text.ru}
                      onChange={(e) => updateSelectedButton({ text: { ...selectedButton.text, ru: e.target.value } })}
                      className="w-full rounded-md border border-[var(--studio-border)] bg-[#1C1814] px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--studio-accent)]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] text-[var(--studio-text-secondary)]">Текст кнопки (EN)</label>
                    <input
                      value={selectedButton.text.en}
                      onChange={(e) => updateSelectedButton({ text: { ...selectedButton.text, en: e.target.value } })}
                      className="w-full rounded-md border border-[var(--studio-border)] bg-[#1C1814] px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--studio-accent)]"
                    />
                  </div>

                  {/* === COORDINATES + COPY/PASTE (User request) === */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-[10px] font-medium text-[var(--studio-text-secondary)]">КООРДИНАТЫ И РАЗМЕР</label>
                      <div className="flex gap-1">
                        <button
                          onClick={handleCopyCoordinates}
                          className="rounded border border-[var(--studio-border)] px-2 py-0.5 text-[10px] hover:border-[var(--studio-accent)]"
                          title="Скопировать координаты и размер этой кнопки"
                        >
                          Копировать
                        </button>
                        <button
                          onClick={handlePasteCoordinates}
                          disabled={!coordinateClipboard}
                          className="rounded border border-[var(--studio-border)] px-2 py-0.5 text-[10px] hover:border-[var(--studio-accent)] disabled:cursor-not-allowed disabled:opacity-40"
                          title="Вставить скопированные координаты и размер"
                        >
                          Вставить
                        </button>
                      </div>
                    </div>

                    {coordinateClipboard && (
                      <div className="mb-2 rounded bg-[var(--studio-accent)]/10 px-2 py-1 text-[10px] text-[var(--studio-accent)]">
                        В буфере: X {coordinateClipboard.x}% / Y {coordinateClipboard.y}%
                      </div>
                    )}

                    {/* Editable coordinates - very useful for precision */}
                    <div className="grid grid-cols-4 gap-2 text-center">
                      {[
                        { label: 'X', key: 'x' as const },
                        { label: 'Y', key: 'y' as const },
                        { label: 'Ширина', key: 'width' as const },
                        { label: 'Высота', key: 'height' as const },
                      ].map(({ label, key }) => (
                        <div key={key}>
                          <div className="text-[9px] text-[var(--studio-text-muted)]">{label}</div>
                          <input
                            type="number"
                            step="0.5"
                            min="1"
                            max={key === 'x' || key === 'y' ? 90 : 60}
                            value={selectedButton.layout[key]}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val)) {
                                updateSelectedButtonLayout({ [key]: Math.max(4, Math.min(90, val)) });
                              }
                            }}
                            className="w-full rounded border border-[var(--studio-border)] bg-[#1C1814] px-2 py-1 text-center text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[var(--studio-accent)]"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="mt-1 text-center text-[9px] text-[var(--studio-text-muted)]">
                      Можно вводить точные значения вручную
                    </div>
                  </div>

                  {/* Style */}
                  <div>
                    <label className="mb-1 block text-[10px] text-[var(--studio-text-secondary)]">Стиль кнопки</label>
                    <select
                      value={selectedButton.layout.style}
                      onChange={(e) => updateSelectedButton({ layout: { ...selectedButton.layout, style: e.target.value } })}
                      className="w-full rounded-md border border-[var(--studio-border)] bg-[#1C1814] px-3 py-1.5 text-sm"
                    >
                      <option value="default">Обычная</option>
                      <option value="important">Важная (выделяется)</option>
                      <option value="danger">Опасная / негативная</option>
                      <option value="subtle">Тонкая / малозаметная</option>
                    </select>
                  </div>

                  {/* Action - Advanced */}
                  <div>
                    <label className="mb-1 block text-[10px] text-[var(--studio-text-secondary)]">Что делает кнопка</label>
                    
                    <ActionEditor
                      action={selectedButton.action}
                      onChange={(newAction) => updateSelectedButton({ action: newAction })}
                      variables={variables}
                      items={items}
                    />
                  </div>
                </div>
              )}

              {/* === УСЛОВИЯ (Простой редактор) === */}
              {selectedButton && (
                <div className="space-y-4 pt-4 border-t border-[var(--studio-border)]">
                  <div className="text-xs font-medium text-[var(--studio-accent)]">УСЛОВИЯ</div>

                  {/* visibleWhen */}
                  <ConditionEditor
                    label="Видимость кнопки"
                    condition={selectedButton.visibleWhen}
                    onChange={(newCondition) =>
                      updateSelectedButton({ visibleWhen: newCondition })
                    }
                    variables={variables}
                    items={items}
                  />

                  {/* enabledWhen */}
                  <ConditionEditor
                    label="Доступность кнопки"
                    condition={selectedButton.enabledWhen}
                    onChange={(newCondition) =>
                      updateSelectedButton({ enabledWhen: newCondition })
                    }
                    variables={variables}
                    items={items}
                  />
                </div>
              )}

              {!selectedButton && currentPage && currentPage.buttons.length > 0 && (
                <div className="text-center text-xs text-[var(--studio-text-muted)] py-3">
                  Выбери кнопку на холсте или в списке
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-[var(--studio-border)] p-3 text-center text-[10px] text-[var(--studio-text-muted)]">
            Перетаскивай кнопки прямо на холсте
          </div>

          {/* === GUIDES PANEL (Variant A) - only show when there are guides */}
          {(guides.horizontal.length > 0 || guides.vertical.length > 0) && (
          <div className="border-t border-[var(--studio-border)] mt-6 pt-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--studio-text-secondary)]">НАПРАВЛЯЮЩИЕ</span>
              <div className="flex gap-1">
                <button
                  onClick={() => addGuide('horizontal', 25)}
                  className="px-2 py-0.5 text-[10px] rounded bg-[var(--studio-bg-elevated)] hover:bg-[var(--studio-border)] border border-[var(--studio-border)]"
                  title="Добавить горизонтальную на 25%"
                >
                  25%
                </button>
                <button
                  onClick={() => addGuide('horizontal', 50)}
                  className="px-2 py-0.5 text-[10px] rounded bg-[var(--studio-bg-elevated)] hover:bg-[var(--studio-border)] border border-[var(--studio-border)]"
                  title="Добавить горизонтальную на 50%"
                >
                  50%
                </button>
                <button
                  onClick={() => addGuide('horizontal', 75)}
                  className="px-2 py-0.5 text-[10px] rounded bg-[var(--studio-bg-elevated)] hover:bg-[var(--studio-border)] border border-[var(--studio-border)]"
                  title="Добавить горизонтальную на 75%"
                >
                  75%
                </button>
              </div>
            </div>

            {/* Horizontal Guides */}
            <div className="mb-4">
              <div className="text-[10px] text-[var(--studio-text-muted)] mb-1.5">Горизонтальные (влияют на Y)</div>
              {guides.horizontal.length === 0 && (
                <div className="text-[10px] text-[var(--studio-text-muted)] italic py-1">Нет направляющих</div>
              )}
              {guides.horizontal.map((pos, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-1.5">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={pos}
                    onChange={(e) => {
                      const newVal = parseFloat(e.target.value);
                      if (!isNaN(newVal)) {
                        removeGuide('horizontal', pos);
                        addGuide('horizontal', Math.max(0, Math.min(100, newVal)));
                      }
                    }}
                    className="w-16 rounded border border-[var(--studio-border)] bg-[#1C1814] px-2 py-1 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[var(--studio-accent)]"
                  />
                  <span className="text-xs text-[var(--studio-text-muted)]">%</span>
                  <button
                    onClick={() => removeGuide('horizontal', pos)}
                    className="ml-auto text-[var(--studio-danger)] hover:text-red-400 p-1"
                    title="Удалить"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Vertical Guides */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[10px] text-[var(--studio-text-muted)]">Вертикальные (влияют на X)</div>
                <div className="flex gap-1">
                  <button
                    onClick={() => addGuide('vertical', 25)}
                    className="px-1.5 py-0.5 text-[10px] rounded bg-[var(--studio-bg-elevated)] hover:bg-[var(--studio-border)] border border-[var(--studio-border)]"
                  >
                    25
                  </button>
                  <button
                    onClick={() => addGuide('vertical', 50)}
                    className="px-1.5 py-0.5 text-[10px] rounded bg-[var(--studio-bg-elevated)] hover:bg-[var(--studio-border)] border border-[var(--studio-border)]"
                  >
                    50
                  </button>
                  <button
                    onClick={() => addGuide('vertical', 75)}
                    className="px-1.5 py-0.5 text-[10px] rounded bg-[var(--studio-bg-elevated)] hover:bg-[var(--studio-border)] border border-[var(--studio-border)]"
                  >
                    75
                  </button>
                </div>
              </div>

              {guides.vertical.length === 0 && (
                <div className="text-[10px] text-[var(--studio-text-muted)] italic py-1">Нет направляющих</div>
              )}
              {guides.vertical.map((pos, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-1.5">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={pos}
                    onChange={(e) => {
                      const newVal = parseFloat(e.target.value);
                      if (!isNaN(newVal)) {
                        removeGuide('vertical', pos);
                        addGuide('vertical', Math.max(0, Math.min(100, newVal)));
                      }
                    }}
                    className="w-16 rounded border border-[var(--studio-border)] bg-[#1C1814] px-2 py-1 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[var(--studio-accent)]"
                  />
                  <span className="text-xs text-[var(--studio-text-muted)]">%</span>
                  <button
                    onClick={() => removeGuide('vertical', pos)}
                    className="ml-auto text-[var(--studio-danger)] hover:text-red-400 p-1"
                    title="Удалить"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => clearGuides()}
              className="mt-3 w-full text-[10px] text-[var(--studio-text-muted)] hover:text-[var(--studio-danger)] border border-[var(--studio-border)] rounded py-1 hover:border-[var(--studio-danger)]/50"
            >
              Удалить все направляющие
            </button>
          </div>
          )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// === Простой редактор одного условия ===
function ConditionEditor({
  label,
  condition,
  onChange,
  variables,
  items,
}: {
  label: string;
  condition?: any;
  onChange: (condition?: any) => void;
  variables: any[];
  items: any[];
}) {
  const hasCondition = !!condition;

  const toggleCondition = () => {
    if (hasCondition) {
      onChange(undefined);
    } else {
      const firstVar = variables.find((v: any) => v.type === 'number') || variables[0];
      if (firstVar) {
        onChange({
          type: 'variable',
          variableId: firstVar.id,
          operator: '>=',
          value: firstVar.type === 'number' ? 1 : true,
        });
      } else {
        onChange({
          type: 'variable',
          variableId: '',
          operator: '>=',
          value: 0,
        });
      }
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[10px] font-medium text-[var(--studio-text-secondary)]">{label}</label>
        <button
          onClick={toggleCondition}
          className={`text-[10px] px-2 py-0.5 rounded transition ${
            hasCondition
              ? 'bg-[var(--studio-accent)] text-[#1C1814]'
              : 'border border-[var(--studio-border)] hover:bg-[var(--studio-bg-panel)]'
          }`}
        >
          {hasCondition ? 'Есть условие' : 'Всегда'}
        </button>
      </div>

      {hasCondition && (
        <div className="space-y-2 rounded border border-[var(--studio-border)] bg-[#1C1814] p-2">
          <select
            value={condition.type}
            onChange={(e) => {
              const newType = e.target.value as any;

              if (['variable', 'itemQuantity', 'relationship', 'reputation', 'playerStat', 'resource'].includes(newType)) {
                // Leaf types (existing logic)
                if (newType === 'variable') {
                  const firstVar = variables.find((v: any) => v.type === 'number') || variables[0];
                  onChange({ type: 'variable', variableId: firstVar?.id || '', operator: '>=', value: firstVar?.type === 'number' ? 1 : true });
                } else if (newType === 'itemQuantity') {
                  onChange({ type: 'itemQuantity', itemId: items[0]?.id || '', operator: '>=', value: 1 });
                } else if (newType === 'relationship') {
                  onChange({ type: 'relationship', characterId: 'mila', operator: '>=', value: 0 });
                } else if (newType === 'reputation') {
                  onChange({ type: 'reputation', operator: '>=', value: 0 });
                } else if (newType === 'playerStat') {
                  onChange({ type: 'playerStat', stat: 'level', operator: '>=', value: 1 });
                } else if (newType === 'resource') {
                  onChange({ type: 'resource', resource: 'coins', operator: '>=', value: 0 });
                }
              } else if (newType === 'and' || newType === 'or') {
                // Create logical group. If current condition exists, wrap it.
                const children = condition ? [condition] : [];
                onChange({ type: newType, conditions: children });
              } else if (newType === 'not') {
                onChange({ type: 'not', condition: condition || { type: 'variable', variableId: '', operator: '>=', value: 0 } });
              }
            }}
            className="w-full rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-2 py-1 text-xs"
          >
            <option value="variable">Переменная</option>
            <option value="itemQuantity">Количество предмета</option>
            <option value="relationship">Отношения с персонажем</option>
            <option value="reputation">Репутация в городе</option>
            <option value="playerStat">Характеристика игрока</option>
            <option value="resource">Ресурс</option>
            <option value="and">Группа И (AND)</option>
            <option value="or">Группа ИЛИ (OR)</option>
            <option value="not">Отрицание (NOT)</option>
          </select>

          {/* Variable */}
          {condition.type === 'variable' && (
            <div className="grid grid-cols-3 gap-1">
              <select value={condition.variableId} onChange={(e) => onChange({ ...condition, variableId: e.target.value })} className="rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-1 py-1 text-xs">
                {variables.length === 0 && <option value="">Нет переменных</option>}
                {variables.map((v: any) => <option key={v.id} value={v.id}>{v.displayName.ru}</option>)}
              </select>
              <select value={condition.operator} onChange={(e) => onChange({ ...condition, operator: e.target.value })} className="rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-1 py-1 text-xs">
                <option value=">=">&gt;=</option><option value="<=">&lt;=</option><option value="==">=</option><option value=">">&gt;</option><option value="<">&lt;</option><option value="!=">≠</option>
              </select>
              <input type={variables.find((v:any)=>v.id===condition.variableId)?.type==='number'?'number':'text'} value={condition.value} onChange={(e) => { const vt = variables.find((v:any)=>v.id===condition.variableId)?.type; onChange({...condition, value: vt==='number' ? parseFloat(e.target.value)||0 : e.target.value}); }} className="rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-2 py-1 text-xs" />
            </div>
          )}

          {/* Item Quantity */}
          {condition.type === 'itemQuantity' && (
            <div className="grid grid-cols-3 gap-1">
              <select value={condition.itemId} onChange={(e)=>onChange({...condition, itemId:e.target.value})} className="rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-1 py-1 text-xs">
                {items.length===0 && <option value="">Нет предметов</option>}
                {items.map((i:any)=><option key={i.id} value={i.id}>{i.name.ru}</option>)}
              </select>
              <select value={condition.operator} onChange={(e)=>onChange({...condition, operator:e.target.value})} className="rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-1 py-1 text-xs">
                <option value=">=">&gt;=</option><option value="<=">&lt;=</option><option value="==">=</option>
              </select>
              <input type="number" value={condition.value} onChange={(e)=>onChange({...condition, value:parseInt(e.target.value)||0})} className="rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-2 py-1 text-xs" />
            </div>
          )}

          {/* Relationship */}
          {condition.type === 'relationship' && (
            <div className="grid grid-cols-3 gap-1">
              <input value={condition.characterId} onChange={(e)=>onChange({...condition, characterId:e.target.value})} placeholder="mila / zyrk / ..." className="rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-2 py-1 text-xs" />
              <select value={condition.operator} onChange={(e)=>onChange({...condition, operator:e.target.value})} className="rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-1 py-1 text-xs">
                <option value=">=">&gt;=</option><option value="<=">&lt;=</option><option value="==">=</option>
              </select>
              <input type="number" value={condition.value} onChange={(e)=>onChange({...condition, value:parseInt(e.target.value)||0})} className="rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-2 py-1 text-xs" />
            </div>
          )}

          {/* Reputation / PlayerStat / Resource */}
          {(['reputation','playerStat','resource'] as const).includes(condition.type) && (
            <div className="grid grid-cols-3 gap-1">
              {condition.type === 'playerStat' && (
                <select value={condition.stat} onChange={(e)=>onChange({...condition, stat:e.target.value})} className="rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-1 py-1 text-xs">
                  <option value="level">Уровень</option><option value="strength">Сила</option>
                </select>
              )}
              {condition.type === 'resource' && (
                <select value={condition.resource} onChange={(e)=>onChange({...condition, resource:e.target.value})} className="rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-1 py-1 text-xs">
                  <option value="coins">Монеты</option><option value="gasoline">Бензин</option><option value="gems">Драгоценности</option>
                </select>
              )}
              {condition.type === 'reputation' && <div className="text-xs text-[var(--studio-text-muted)] self-center">Репутация</div>}

              <select value={condition.operator} onChange={(e)=>onChange({...condition, operator:e.target.value})} className="rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-1 py-1 text-xs">
                <option value=">=">&gt;=</option><option value="<=">&lt;=</option><option value="==">=</option>
              </select>
              <input type="number" value={condition.value} onChange={(e)=>onChange({...condition, value:parseInt(e.target.value)||0})} className="rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-2 py-1 text-xs" />
            </div>
          )}

          {/* Logical Groups: AND / OR */}
          {(condition.type === 'and' || condition.type === 'or') && (
            <div className="space-y-2 border-l-2 border-[var(--studio-accent)] pl-3">
              <div className="text-[10px] font-medium text-[var(--studio-accent)]">
                {condition.type === 'and' ? 'И (все условия должны быть истинны)' : 'ИЛИ (хотя бы одно условие истинно)'}
              </div>

              {(condition.conditions || []).map((subCondition: any, index: number) => (
                <div key={index} className="rounded border border-[var(--studio-border)] bg-[#161310] p-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-[var(--studio-text-muted)]">Условие #{index + 1}</span>
                    <button
                      onClick={() => {
                        const newConditions = [...condition.conditions];
                        newConditions.splice(index, 1);
                        onChange({ ...condition, conditions: newConditions.length > 0 ? newConditions : undefined });
                      }}
                      className="text-[var(--studio-danger)] text-xs hover:underline"
                    >
                      Удалить
                    </button>
                  </div>
                  <ConditionEditor
                    label=""
                    condition={subCondition}
                    onChange={(updatedSub) => {
                      const newConditions = [...condition.conditions];
                      newConditions[index] = updatedSub;
                      onChange({ ...condition, conditions: newConditions });
                    }}
                    variables={variables}
                    items={items}
                  />
                </div>
              ))}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    const firstVar = variables.find((v: any) => v.type === 'number') || variables[0];
                    const newCond = firstVar
                      ? { type: 'variable', variableId: firstVar.id, operator: '>=', value: firstVar.type === 'number' ? 0 : false }
                      : { type: 'variable', variableId: '', operator: '>=', value: 0 };

                    onChange({
                      ...condition,
                      conditions: [...(condition.conditions || []), newCond],
                    });
                  }}
                  className="text-[10px] px-2 py-0.5 rounded border border-[var(--studio-border)] hover:bg-[var(--studio-bg-panel)]"
                >
                  + Условие
                </button>
                <button
                  onClick={() => {
                    onChange({
                      ...condition,
                      conditions: [...(condition.conditions || []), { type: 'and', conditions: [] }],
                    });
                  }}
                  className="text-[10px] px-2 py-0.5 rounded border border-[var(--studio-border)] hover:bg-[var(--studio-bg-panel)]"
                >
                  + Группа И
                </button>
                <button
                  onClick={() => {
                    onChange({
                      ...condition,
                      conditions: [...(condition.conditions || []), { type: 'or', conditions: [] }],
                    });
                  }}
                  className="text-[10px] px-2 py-0.5 rounded border border-[var(--studio-border)] hover:bg-[var(--studio-bg-panel)]"
                >
                  + Группа ИЛИ
                </button>
              </div>
            </div>
          )}

          {/* NOT */}
          {condition.type === 'not' && (
            <div className="border-l-2 border-[var(--studio-danger)] pl-3">
              <div className="text-[10px] text-[var(--studio-danger)] mb-1">НЕ (отрицание)</div>
              <ConditionEditor
                label=""
                condition={condition.condition}
                onChange={(updated) => onChange({ ...condition, condition: updated })}
                variables={variables}
                items={items}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
