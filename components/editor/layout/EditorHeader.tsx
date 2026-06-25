"use client";

import { useState, useEffect } from 'react';
import { Play, Save, FolderOpen, Download, Upload, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useStudioStore } from '@/lib/store';

export default function EditorHeader() {
  const {
    meta,
    pages,
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
  } = useStudioStore();

  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'restored'>('saved');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [nowTick, setNowTick] = useState(0);

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

  // suppress lint — nowTick is intentionally read to trigger re-render every 30s
  void nowTick;
  const lastSavedText = meta.lastSaved ? getRelativeTime(meta.lastSaved) : 'ещё не сохранялся';

  const startEditingName = () => { setEditingName(meta.name); setIsEditingName(true); };
  const commitProjectName = () => {
    const trimmed = editingName.trim();
    if (trimmed && trimmed !== meta.name) { setProjectName(trimmed); toast.success('Название проекта изменено'); }
    setIsEditingName(false);
  };
  const cancelEditingName = () => setIsEditingName(false);

  return (
    <div className="flex h-14 items-center justify-between border-b border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] px-5">
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

        {/* Snapping Toggle */}
        <div className="flex items-center gap-2 ml-2 pl-3 border-l border-[var(--studio-border)]">
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
