"use client";

import { useState, useEffect, useRef } from 'react';
import { Play, Save, FolderOpen, Download, Upload, RefreshCw, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useStudioStore } from '@/lib/store';

const CANVAS_PRESETS = [
  { label: '1280 × 720', w: 1280, h: 720 },
  { label: '1920 × 1080', w: 1920, h: 1080 },
  { label: '960 × 540', w: 960, h: 540 },
  { label: '2560 × 1440', w: 2560, h: 1440 },
];

export default function EditorHeader() {
  const {
    meta,
    pages,
    selectedPageId,
    mode,
    enterPlaytest,
    exitPlaytest,
    snapEnabled,
    setSnapEnabled,
    setSnappingGuide,
    exportProject,
    importProject,
    createNewProject,
    setProjectName,
    undoCanvas,
    redoCanvas,
    canvasHistory,
    canvasFuture,
    loadFromLocalStorage,
    canvasWidth,
    canvasHeight,
    setCanvasSize,
    resetPlaytestState,
    loadPlaytestProgress,
    clearPlaytestSave,
    playtestState,
    variables,
  } = useStudioStore();

  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'restored'>('saved');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [nowTick, setNowTick] = useState(0);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [customW, setCustomW] = useState(String(canvasWidth));
  const [customH, setCustomH] = useState(String(canvasHeight));
  const sizeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setNowTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const wasRestored = loadFromLocalStorage();
    if (wasRestored) {
      setSaveStatus('restored');
      toast.success('Проект восстановлен из сохранения');
      setTimeout(() => setSaveStatus('saved'), 2500);
    }
  }, [loadFromLocalStorage]);

  useEffect(() => {
    if (!showSizeMenu) return;
    const handler = (e: MouseEvent) => {
      if (sizeMenuRef.current && !sizeMenuRef.current.contains(e.target as Node)) {
        setShowSizeMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSizeMenu]);

  const getRelativeTime = (isoString: string | null): string => {
    if (!isoString) return 'ещё не сохранялся';
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    if (diffSec < 30) return 'только что';
    if (diffSec < 60) return `${diffSec} сек. назад`;
    if (diffMin < 60) return `${diffMin} мин. назад`;
    if (diffHour < 24) return `${diffHour} ч. назад`;
    return date.toLocaleDateString('ru-RU');
  };

  void nowTick;
  const lastSavedText = meta.lastSaved ? getRelativeTime(meta.lastSaved) : 'ещё не сохранялся';

  const startEditingName = () => { setEditingName(meta.name); setIsEditingName(true); };
  const commitProjectName = () => {
    const trimmed = editingName.trim();
    if (trimmed && trimmed !== meta.name) { setProjectName(trimmed); toast.success('Название проекта изменено'); }
    setIsEditingName(false);
  };
  const cancelEditingName = () => setIsEditingName(false);

  const currentPage = pages.find(p => p.id === selectedPageId);

  // Count variables that differ from their defaults in current playtest state
  const changedVarsCount = variables.filter(v => {
    const live = playtestState.variableValues[v.id];
    return live !== undefined && live !== v.defaultValue;
  }).length;

  const currentPreset = CANVAS_PRESETS.find(p => p.w === canvasWidth && p.h === canvasHeight);
  const sizeLabel = currentPreset ? currentPreset.label : `${canvasWidth} × ${canvasHeight}`;

  const applyCustomSize = () => {
    const w = parseInt(customW, 10);
    const h = parseInt(customH, 10);
    if (w >= 320 && h >= 180 && w <= 7680 && h <= 4320) {
      setCanvasSize(w, h);
      setShowSizeMenu(false);
      toast.success(`Холст: ${w} × ${h}`);
    } else {
      toast.error('Некорректный размер');
    }
  };

  return (
    <div className="flex h-14 items-center justify-between border-b border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] px-5">
      {/* Left: logo + project name */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-[var(--studio-accent)]" />
          <div>
            <span className="font-semibold tracking-tight">Slay Studio</span>
            <span className="ml-1.5 text-xs text-[var(--studio-text-muted)]">Alpha</span>
          </div>
        </div>
        <div className="ml-6 flex items-center gap-2 text-sm text-[var(--studio-text-secondary)]">
          <FolderOpen className="h-4 w-4 flex-shrink-0" />
          {isEditingName ? (
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={commitProjectName}
              onKeyDown={(e) => { if (e.key === 'Enter') commitProjectName(); if (e.key === 'Escape') cancelEditingName(); }}
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

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Save Status */}
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
            className={`rounded-md px-4 py-1.5 text-sm transition-all ${mode === 'editor' ? 'bg-[var(--studio-accent)] text-[#1C1814] font-medium' : 'hover:bg-[var(--studio-bg-elevated)]'}`}
          >
            Редактор
          </button>
          <button
            onClick={enterPlaytest}
            className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm transition-all ${mode === 'playtest' ? 'bg-[var(--studio-accent)] text-[#1C1814] font-medium' : 'hover:bg-[var(--studio-bg-elevated)]'}`}
          >
            <Play className="h-3.5 w-3.5" />
            Playtest
          </button>
        </div>

        {/* Playtest quick controls */}
        <div className="flex items-center gap-1 pl-3 border-l border-[var(--studio-border)]">
          <button
            onClick={() => {
              clearPlaytestSave();
              resetPlaytestState();
              toast.success('Плейтест сброшен');
            }}
            className="studio-btn flex items-center gap-1.5 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-2.5 py-1.5 text-xs hover:border-red-500/50 hover:text-red-400"
            title="Сбросить состояние плейтеста к дефолтным значениям"
          >
            <RotateCcw className="h-3 w-3" />
            Сброс
            {changedVarsCount > 0 && (
              <span className="rounded-full bg-[var(--studio-accent)]/20 px-1 text-[10px] text-[var(--studio-accent)]">
                {changedVarsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              const loaded = loadPlaytestProgress();
              if (loaded) {
                enterPlaytest();
                toast.success('Сохранение загружено');
              } else {
                toast.error('Нет сохранений');
              }
            }}
            className="studio-btn flex items-center gap-1.5 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-2.5 py-1.5 text-xs hover:border-[var(--studio-accent)]/60"
            title="Загрузить сохранение плейтеста и войти"
          >
            <Play className="h-3 w-3" />
            Загрузить
          </button>
        </div>

        {/* Page info */}
        {currentPage && (
          <div className="flex items-center gap-1.5 pl-3 border-l border-[var(--studio-border)]">
            <div className="flex flex-col items-end leading-none">
              <span className="text-xs font-medium text-[var(--studio-text-primary)] max-w-[140px] truncate" title={currentPage.title?.ru || currentPage.id}>
                {currentPage.title?.ru || '—'}
              </span>
              <span className="text-[10px] font-mono text-[var(--studio-text-muted)]" title={currentPage.id}>
                {currentPage.id}
              </span>
            </div>
          </div>
        )}

        {/* Canvas size selector */}
        <div className="relative pl-3 border-l border-[var(--studio-border)]" ref={sizeMenuRef}>
          <button
            onClick={() => { setCustomW(String(canvasWidth)); setCustomH(String(canvasHeight)); setShowSizeMenu(v => !v); }}
            className="studio-btn flex items-center gap-1.5 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-2.5 py-1.5 text-xs hover:border-[var(--studio-accent)]/60"
            title="Размер холста"
          >
            <span className="font-mono">{sizeLabel}</span>
            <span className="text-[var(--studio-text-muted)]">▾</span>
          </button>
          {showSizeMenu && (
            <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] shadow-xl py-1">
              {CANVAS_PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => { setCanvasSize(p.w, p.h); setShowSizeMenu(false); toast.success(`Холст: ${p.label}`); }}
                  className={`w-full px-3 py-1.5 text-left text-xs hover:bg-[var(--studio-bg-panel)] ${p.w === canvasWidth && p.h === canvasHeight ? 'text-[var(--studio-accent)]' : 'text-[var(--studio-text-secondary)]'}`}
                >
                  {p.label}
                </button>
              ))}
              <div className="border-t border-[var(--studio-border)] mt-1 pt-1 px-3 pb-2">
                <div className="text-[10px] text-[var(--studio-text-muted)] mb-1">Custom</div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={customW}
                    onChange={e => setCustomW(e.target.value)}
                    className="w-16 rounded border border-[var(--studio-border)] bg-[var(--studio-bg-base)] px-1.5 py-0.5 text-xs text-[var(--studio-text-primary)] focus:outline-none focus:border-[var(--studio-accent)]"
                    placeholder="1280"
                  />
                  <span className="text-[var(--studio-text-muted)] text-xs">×</span>
                  <input
                    type="number"
                    value={customH}
                    onChange={e => setCustomH(e.target.value)}
                    className="w-16 rounded border border-[var(--studio-border)] bg-[var(--studio-bg-base)] px-1.5 py-0.5 text-xs text-[var(--studio-text-primary)] focus:outline-none focus:border-[var(--studio-accent)]"
                    placeholder="720"
                    onKeyDown={e => { if (e.key === 'Enter') applyCustomSize(); }}
                  />
                  <button
                    onClick={applyCustomSize}
                    className="rounded bg-[var(--studio-accent)]/20 px-2 py-0.5 text-xs text-[var(--studio-accent)] hover:bg-[var(--studio-accent)]/30"
                  >
                    ОК
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Snapping Toggle */}
        <div className="flex items-center gap-2 pl-3 border-l border-[var(--studio-border)]">
          <span className="text-xs text-[var(--studio-text-muted)]">Прилипание</span>
          <button
            onClick={() => { const nv = !snapEnabled; setSnapEnabled(nv); if (!nv) setSnappingGuide(null); }}
            className={`relative inline-flex h-4.5 w-8 items-center rounded-full transition-colors ${snapEnabled ? 'bg-[var(--studio-accent)]' : 'bg-[var(--studio-border)]'}`}
            title="Вкл/выкл прилипание кнопок к направляющим"
          >
            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${snapEnabled ? 'translate-x-[17px]' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {/* Undo / Redo */}
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
          onClick={() => { exportProject(); setSaveStatus('saved'); toast.success('Проект экспортирован'); }}
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
                  const hasContent = pages.length > 1 || (pages[0]?.buttons.length ?? 0) > 0;
                  if (hasContent) {
                    const shouldProceed = confirm('Импорт заменит текущий проект.\n\nРекомендуется сначала экспортировать текущую работу.\n\nПродолжить импорт?');
                    if (!shouldProceed) { e.target.value = ''; return; }
                  }
                  const success = importProject(data);
                  if (success) { toast.success('Проект успешно импортирован'); setSaveStatus('restored'); }
                } catch {
                  toast.error('Не удалось прочитать файл проекта');
                }
                e.target.value = '';
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
            if (confirm(message)) { createNewProject(); setSaveStatus('saved'); toast.success('Создан новый проект'); }
          }}
          className="studio-btn flex items-center gap-2 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-4 py-2 text-sm hover:border-[var(--studio-accent)]"
        >
          <RefreshCw className="h-4 w-4" />
          Новый проект
        </button>
      </div>
    </div>
  );
}
