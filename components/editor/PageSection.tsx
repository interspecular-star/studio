'use client';

import React, { useState } from 'react';
import { Plus, Trash2, History, RotateCcw } from 'lucide-react';
import { useStudioStore } from '@/lib/store';
import ActionEditor from './ActionEditor';
import ConditionEditor from './ConditionEditor';
import type { UIWidget } from '@/lib/store';

interface PageSectionProps {
  currentPage: any;
  renamePage: (oldId: string, newId: string, title?: any) => void;
  updateCurrentPage: (updates: any) => void;
  editingPageId: string;
  setEditingPageId: (id: string) => void;
  langTab: 'ru' | 'en';
  setLangTab: (tab: 'ru' | 'en') => void;
  handleAddButton: () => void;
  selectedButtonId: string | null;
  selectButton: (id: string | null) => void;
  handleDeleteButton: (id: string) => void;
  selectedButton: any;
  updateSelectedButton: (updates: any) => void;
  updateSelectedButtonLayout: (updates: any) => void;
  handleCopyCoordinates: () => void;
  handlePasteCoordinates: () => void;
  coordinateClipboard: any;
  variables: any[];
  items: any[];
}

export default function PageSection({
  currentPage,
  renamePage,
  updateCurrentPage,
  editingPageId,
  setEditingPageId,
  langTab,
  setLangTab,
  handleAddButton,
  selectedButtonId,
  selectButton,
  handleDeleteButton,
  selectedButton,
  updateSelectedButton,
  updateSelectedButtonLayout,
  handleCopyCoordinates,
  handlePasteCoordinates,
  coordinateClipboard,
  variables,
  items,
}: PageSectionProps) {
  const { backgrounds } = useStudioStore();
  const [collapsed, setCollapsed] = useState(false);

  if (!currentPage) return null;

  return (
    <div className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] p-3">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between text-sm font-medium text-[var(--studio-text-secondary)] mb-2"
      >
        <span>СТРАНИЦА</span>
        <span className="text-xs">{collapsed ? '▶' : '▼'}</span>
      </button>

      {!collapsed && (
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
                    setEditingPageId(currentPage.id);
                  }
                } else if (currentPage) {
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
              {backgrounds.length === 0 ? (
                <option value="">Нет фонов</option>
              ) : (
                backgrounds.map((bg) => (
                  <option key={bg.id} value={bg.id}>
                    {bg.name.ru} {bg.url ? '(изображение)' : '(градиент)'}
                  </option>
                ))
              )}
            </select>
            <p className="mt-1 text-[9px] text-[var(--studio-text-muted)]">
              Для гибких настроек (масштаб, параллакс, яркость) — см. блок «ФОНЫ» в сайдбаре. Встроенных градиентов больше нет.
            </p>
            <button
              onClick={() => {
                const nameRu = prompt('Название фона (РУ):', 'Мой новый фон') || 'Новый фон';
                const url = prompt('URL изображения (от корня public, с / в начале):', '/bg/intro_forest.png');
                if (url) {
                  const { addBackground } = useStudioStore.getState();
                  let finalUrl = url.trim().replace(/\\/g, '/');
                  if (finalUrl && !finalUrl.startsWith('http') && !finalUrl.startsWith('/')) {
                    finalUrl = '/' + finalUrl;
                  }
                  addBackground({
                    name: { ru: nameRu, en: nameRu },
                    url: finalUrl,
                    settings: {
                      scale: 1,
                      offsetX: 0,
                      offsetY: 0,
                      brightness: 1,
                      opacity: 1,
                      fitMode: 'cover',
                      parallax: { enabled: false, speedX: 0.5, speedY: 0.3, reverse: false },
                    },
                  });
                  // auto select the new one for current page
                  const newId = useStudioStore.getState().backgrounds.slice(-1)[0]?.id;
                  if (newId) updateCurrentPage({ background: newId });
                }
              }}
              className="mt-1 text-[10px] px-2 py-0.5 rounded border border-[var(--studio-border)] hover:bg-[var(--studio-bg-elevated)]"
            >
              + Добавить свой фон (изображение)
            </button>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--studio-text-secondary)]">КТО ГОВОРИТ</label>
            <select
              value={currentPage?.speaker || 'none'}
              onChange={(e) => {
                const val = e.target.value;
                const updates: any = { speaker: val };
                if (!val || val === 'none') {
                  // Switching to "no dialog / game" mode → make it a proper gameplay page with HUD
                  updates.sceneType = 'exploration';
                  updates.showTopResourceBar = true;
                  // Optional: clear placeholder dialog text so it's clean
                  if (currentPage) {
                    updates.text = { ru: '', en: '' };
                  }
                }
                updateCurrentPage(updates);
              }}
              className="w-full rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--studio-accent)]"
            >
              <option value="none">Нет диалога / Игровой режим</option>
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

          {/* === ДИАЛОГ UI: WIDGETS (Phase 1) - позиционируемые элементы ===
              Автоматически сидируются при выборе говорящего. Редактируйте % координаты здесь.
              Позже: drag on canvas, ассеты, пресеты, conditions. */}
          <div className="pt-1 border-t border-[var(--studio-border)] mt-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-[var(--studio-text-secondary)]">ДИАЛОГ UI — ВИДЖЕТЫ ({(currentPage?.uiWidgets || []).length})</label>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    const { addUIWidget, applyUILayoutPreset } = useStudioStore.getState();
                    if (!currentPage) return;
                    applyUILayoutPreset(currentPage.id, 'classic_vn');
                  }}
                  className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--studio-border)] hover:bg-[var(--studio-bg-elevated)]"
                >
                  Классика
                </button>
                <button
                  onClick={() => {
                    const { addUIWidget } = useStudioStore.getState();
                    if (!currentPage) return;
                    addUIWidget(currentPage.id, {
                      type: 'dialogueBox',
                      layout: { x: 16, y: 78, width: 68, height: 12, z: 20 },
                      style: 'default',
                    });
                  }}
                  className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--studio-border)] hover:bg-[var(--studio-bg-elevated)]"
                >
                  + Текст
                </button>
                <button
                  onClick={() => {
                    const { addUIWidget } = useStudioStore.getState();
                    if (!currentPage) return;
                    addUIWidget(currentPage.id, {
                      type: 'textLabel',
                      layout: { x: 42, y: 58, width: 16, height: 3, z: 15 },
                      style: 'default',
                      data: { speakerId: currentPage.speaker },
                    });
                  }}
                  className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--studio-border)] hover:bg-[var(--studio-bg-elevated)]"
                >
                  + Имя
                </button>
              </div>
            </div>

            {(currentPage?.uiWidgets || []).length === 0 && (
              <div className="text-[10px] text-[var(--studio-text-muted)] mb-2">Нет виджетов (выбери говорящего — добавятся автоматически)</div>
            )}

            <div className="space-y-2">
              {(currentPage?.uiWidgets || []).map((w: any, idx: number) => (
                <div key={w.id} className="rounded border border-[var(--studio-border)] bg-[#161310] p-2 text-[10px]">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono text-[var(--studio-accent)]">{w.type}</span>
                    <button
                      onClick={() => {
                        const store = useStudioStore.getState();
                        if (currentPage) store.deleteUIWidget(currentPage.id, w.id);
                      }}
                      className="text-[var(--studio-danger)] opacity-70 hover:opacity-100"
                    >
                      ×
                    </button>
                  </div>

                  {/* Layout editor (manual % for Phase 1; later canvas drag) */}
                  <div className="grid grid-cols-4 gap-1">
                    {(['x', 'y', 'width', 'height'] as const).map((k) => (
                      <div key={k}>
                        <div className="text-[9px] text-[var(--studio-text-muted)]">{k}</div>
                        <input
                          type="number"
                          step="0.5"
                          min={0}
                          max={k === 'x' || k === 'y' ? 95 : 80}
                          value={w.layout[k] ?? 10}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (isNaN(val) || !currentPage) return;
                            const store = useStudioStore.getState();
                            store.updateUIWidget(currentPage.id, w.id, {
                              layout: { ...w.layout, [k]: Math.max(2, Math.min(95, val)) },
                            });
                          }}
                          className="w-full bg-[#1C1814] border border-[var(--studio-border)] px-1 py-0.5 text-center font-mono"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="text-[9px] text-[var(--studio-text-muted)] mt-0.5">Z: {w.layout.z ?? 0} (слой)</div>
                </div>
              ))}
            </div>
            <p className="mt-1 text-[9px] text-[var(--studio-text-muted)]">
              Виджеты видны на холсте. Меняй % — позиция обновляется сразу. (Позже drag&amp;drop + ассеты)
            </p>
          </div>

          {/* Per-scene Top Resource Bar visibility (ported + extended) */}
          <div className="pt-1">
            <label className="mb-1 flex items-center gap-2 text-xs font-medium text-[var(--studio-text-secondary)]">
              <input
                type="checkbox"
                checked={currentPage?.showTopResourceBar !== false}
                onChange={(e) => updateCurrentPage({ showTopResourceBar: e.target.checked })}
                className="accent-[var(--studio-accent)]"
              />
              Показывать HUD ресурсов по умолчанию на этой сцене
            </label>
            <div className="text-[9px] text-[var(--studio-text-muted)] pl-5">
              Это — дизайнерское намерение для финальной игры. 
              Во время Playtest есть отдельная кнопка «HUD: force show» над холстом — она позволяет видеть бар на любой странице независимо от этих настроек (удобно для тестирования).
            </div>

            {/* sceneType (bonus for smart defaults + future logic) */}
            <div className="mt-2 pl-5">
              <label className="text-[9px] text-[var(--studio-text-muted)] mr-1">Тип сцены:</label>
              <select
                value={currentPage?.sceneType || 'exploration'}
                onChange={(e) => updateCurrentPage({ sceneType: e.target.value as any })}
                className="rounded border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] px-1.5 py-0.5 text-[10px]"
              >
                <option value="exploration">Простой / Исследование</option>
                <option value="dialog">Диалог / Кат-сцена</option>
                <option value="combat">Бой</option>
                <option value="menu">Меню / Интерфейс</option>
              </select>
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
              {currentPage?.buttons.map((btn: any) => (
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
                  <div className="flex items-center gap-1">
                    {/* Version history - ported from old visual editor per-button history */}
                    <button
                      onClick={() => {
                        const store = useStudioStore.getState();
                        if ((selectedButton.history?.length ?? 0) > 0) {
                          store.restoreButtonFromHistory(currentPage.id, selectedButton.id, 0);
                        }
                      }}
                      disabled={(selectedButton.history?.length ?? 0) === 0}
                      className="text-[var(--studio-text-muted)] hover:text-[var(--studio-accent)] p-1 disabled:opacity-40 disabled:cursor-not-allowed"
                      title={(selectedButton.history?.length ?? 0) > 0 ? "Восстановить предыдущую позицию этой кнопки" : "История пока пуста — переместите кнопку на холсте"}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteButton(selectedButton.id)}
                      className="text-[var(--studio-danger)] hover:text-red-400"
                      title="Удалить кнопку"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Mini history list - always visible for visibility (inspired by old VersionHistory.tsx) */}
                <div className="mt-2 mb-3 border border-[var(--studio-border)] rounded p-2 bg-[#161310] text-[10px]">
                  <div className="flex items-center gap-1 mb-1 text-[var(--studio-text-muted)]">
                    <History className="h-3 w-3" /> История позиций 
                    {(selectedButton.history?.length ?? 0) > 0 ? `(последние ${Math.min(5, selectedButton.history!.length)})` : '(пока пуста)'}
                  </div>
                  {(selectedButton.history?.length ?? 0) > 0 ? (
                    <div className="space-y-1 max-h-20 overflow-auto">
                      {selectedButton.history!.slice(-5).reverse().map((entry: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-[var(--studio-text-muted)]">
                          <span className="font-mono">
                            x:{entry.layout.x.toFixed(0)} y:{entry.layout.y.toFixed(0)}
                          </span>
                          <button
                            onClick={() => {
                              const store = useStudioStore.getState();
                              store.restoreButtonFromHistory(currentPage.id, selectedButton.id, idx);
                            }}
                            className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--studio-border)] hover:bg-[var(--studio-bg-panel)]"
                          >
                            Восст.
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[9px] text-[var(--studio-text-muted)]">Переместите кнопку на холсте (drag или редактируйте координаты), чтобы записать предыдущие позиции для отката.</div>
                  )}
                  <div className="text-[9px] text-[var(--studio-text-muted)] mt-1">Позиции сохраняются автоматически при перемещении/изменении layout</div>
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

                {/* Coordinates */}
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

                {/* Action */}
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

            {/* Conditions */}
            {selectedButton && (
              <div className="space-y-4 pt-4 border-t border-[var(--studio-border)]">
                <div className="text-xs font-medium text-[var(--studio-accent)]">УСЛОВИЯ</div>

                <ConditionEditor
                  label="Видимость кнопки"
                  condition={selectedButton.visibleWhen}
                  onChange={(newCondition) =>
                    updateSelectedButton({ visibleWhen: newCondition })
                  }
                  variables={variables}
                  items={items}
                />

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
      )}
    </div>
  );
}
