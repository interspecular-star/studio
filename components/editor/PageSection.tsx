'use client';

import React, { useState } from 'react';
import { useStudioStore } from '@/lib/store';
import ActionEditor from './ActionEditor';
import ConditionEditor from './ConditionEditor';
import type { UIWidget } from '@/lib/store';

// ── Per-slot editor for choiceButton group ─────────────────────────────────────
function SlotEditor({
  index, item, variables, items, widgets, speakers = [], quests = [],
  onTextChange, onActionsChange, onConditionChange, onRemove,
}: {
  index: number;
  item: any;
  variables: any[];
  items: any[];
  widgets: any[];
  speakers?: any[];
  quests?: any[];
  onTextChange: (ru: string) => void;
  onActionsChange: (acts: any[]) => void;
  onConditionChange: (cond: any) => void;
  onRemove?: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const acts: any[] = item.actions || [];

  return (
    <div className="rounded border border-[var(--studio-border)] bg-[#161310]">
      <div
        className="flex items-center justify-between px-2 py-1 cursor-pointer hover:bg-[var(--studio-bg-panel)]"
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-[var(--studio-accent)]">{index + 1}</span>
          <span className="text-[10px] text-[var(--studio-text-secondary)] truncate max-w-[120px]">
            {item.text?.ru || `Выбор ${index + 1}`}
          </span>
          {acts.length > 0 && <span className="text-[9px] rounded bg-[var(--studio-accent)] px-1 text-[#1C1814]">{acts.length}</span>}
          {item.visibleWhen && <span className="text-[9px] text-[var(--studio-text-muted)]">◈</span>}
        </div>
        <div className="flex items-center gap-1">
          {onRemove && (
            <button
              onClick={e => { e.stopPropagation(); onRemove(); }}
              className="text-[10px] text-[var(--studio-danger,#ef4444)] hover:underline px-1"
            >
              ✕
            </button>
          )}
          <span className="text-[10px] text-[var(--studio-text-muted)]">{collapsed ? '▸' : '▾'}</span>
        </div>
      </div>
      {!collapsed && (
        <div className="px-2 pb-2 space-y-2 border-t border-[var(--studio-border)]">
          <div className="pt-1.5">
            <label className="text-[10px] text-[var(--studio-text-secondary)] block mb-0.5">Текст</label>
            <input
              value={item.text?.ru || ''}
              onChange={e => onTextChange(e.target.value)}
              className="w-full text-xs px-2 py-1 bg-[#1C1814] border border-[var(--studio-border)] rounded"
              placeholder={`Выбор ${index + 1}`}
            />
          </div>
          <ConditionEditor
            label="Видим когда"
            condition={item.visibleWhen}
            onChange={onConditionChange}
            variables={variables}
            items={items}
            quests={quests}
            speakers={speakers}
          />
          <div>
            <label className="text-[10px] text-[var(--studio-text-secondary)] block mb-1">ДЕЙСТВИЯ</label>
            <div className="space-y-1.5">
              {acts.map((act: any, ai: number) => (
                <div key={ai} className="rounded border border-[var(--studio-border)] bg-[#1C1814] p-1.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-[var(--studio-text-muted)]">#{ai + 1}</span>
                    <button
                      onClick={() => { const next = [...acts]; next.splice(ai, 1); onActionsChange(next); }}
                      className="text-[9px] text-[var(--studio-danger,#ef4444)] hover:underline"
                    >
                      Удалить
                    </button>
                  </div>
                  <ActionEditor
                    action={act}
                    onChange={(a: any) => { const next = [...acts]; next[ai] = a; onActionsChange(next); }}
                    variables={variables}
                    items={items}
                    widgets={widgets}
                    speakers={speakers}
                    quests={quests}
                  />
                </div>
              ))}
            </div>
            <button
              onClick={() => onActionsChange([...acts, { type: 'goToPage', pageId: '' }])}
              className="w-full mt-1 text-[10px] px-2 py-1 bg-[var(--studio-bg-base)] border border-dashed border-[var(--studio-border)] rounded hover:border-[var(--studio-accent)] text-[var(--studio-text-muted)] hover:text-[var(--studio-accent)] transition-colors"
            >
              + Действие
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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
  quests?: any[];
  noCard?: boolean;
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
  quests = [],
  noCard = false,
}: PageSectionProps) {
  const { backgrounds, selectedWidgetId: currentSelectedWidgetId, speakers } = useStudioStore();
  const [collapsed, setCollapsed] = useState(false);
  const [onEnterCollapsed, setOnEnterCollapsed] = useState(false);
  const [onDialogueEndCollapsed, setOnDialogueEndCollapsed] = useState(false);
  const editorDialoguePreviewLine = useStudioStore(s => s.editorDialoguePreviewLine);
  const setEditorDialoguePreview = useStudioStore(s => s.setEditorDialoguePreview);

  if (!currentPage) return null;

  return (
    <div className={noCard ? undefined : 'rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] p-3'}>
      {!noCard && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-between text-sm font-medium text-[var(--studio-text-secondary)] mb-2"
        >
          <span>СТРАНИЦА</span>
          <span className="text-xs">{collapsed ? '▶' : '▼'}</span>
        </button>
      )}

      {(noCard || !collapsed) && (
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
              {speakers.map((s) => (
                <option key={s.id} value={s.id}>{s.displayName.ru}</option>
              ))}
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

          {/* === ПРИ ВХОДЕ: автоматические действия === */}
          {(() => {
            const onEnterActions: any[] = currentPage?.onEnter || [];
            const addAction = () => {
              const firstCustomVar = variables.find((v: any) => v.category === 'custom') || variables[0];
              updateCurrentPage({ onEnter: [...onEnterActions, { type: 'setVariable', variableId: firstCustomVar?.id || '', value: true }] });
            };
            const updateAction = (index: number, action: any) => {
              const next = [...onEnterActions];
              next[index] = action;
              updateCurrentPage({ onEnter: next });
            };
            const removeAction = (index: number) => {
              updateCurrentPage({ onEnter: onEnterActions.filter((_, i) => i !== index) });
            };

            return (
              <div className="border-t border-[var(--studio-border)] pt-3">
                <button
                  onClick={() => setOnEnterCollapsed(!onEnterCollapsed)}
                  className="flex w-full items-center justify-between text-xs font-medium text-[var(--studio-text-secondary)] mb-2"
                >
                  <span className="flex items-center gap-1.5">
                    ПРИ ВХОДЕ
                    {onEnterActions.length > 0 && (
                      <span className="rounded-full bg-[var(--studio-accent)] text-[#1C1814] text-[9px] font-bold px-1.5 py-0.5 leading-none">
                        {onEnterActions.length}
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] opacity-50">{onEnterCollapsed ? '▶' : '▼'}</span>
                </button>

                {!onEnterCollapsed && (
                  <div className="space-y-2">
                    {onEnterActions.length === 0 && (
                      <p className="text-[10px] text-[var(--studio-text-muted)] italic">
                        Действия выполняются автоматически когда игрок попадает на эту страницу
                      </p>
                    )}

                    {onEnterActions.map((action: any, i: number) => (
                      <div key={i} className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-base)] p-2 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-[var(--studio-text-muted)] font-mono">#{i + 1}</span>
                          <button
                            onClick={() => removeAction(i)}
                            className="text-[10px] text-[var(--studio-danger,#ef4444)] hover:underline"
                          >
                            Удалить
                          </button>
                        </div>
                        <ActionEditor
                          action={action}
                          onChange={(a: any) => updateAction(i, a)}
                          variables={variables}
                          items={items}
                          widgets={currentPage?.uiWidgets || []}
                          speakers={speakers}
                          quests={quests}
                        />
                      </div>
                    ))}

                    <button
                      onClick={addAction}
                      className="w-full text-xs px-2 py-1.5 border border-dashed border-[var(--studio-border)] rounded-lg hover:border-[var(--studio-accent)] text-[var(--studio-text-muted)] hover:text-[var(--studio-accent)] transition-colors"
                    >
                      + Добавить действие
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* === ПО ОКОНЧАНИИ ДИАЛОГА === */}
          {(currentPage?.dialogueLines?.length > 0) && (() => {
            const onEndActions: any[] = currentPage?.onDialogueEnd || [];
            const addAction = () => {
              updateCurrentPage({ onDialogueEnd: [...onEndActions, { type: 'showItemReward', items: [] }] });
            };
            const updateAction = (index: number, action: any) => {
              const next = [...onEndActions]; next[index] = action;
              updateCurrentPage({ onDialogueEnd: next });
            };
            const removeAction = (index: number) => {
              updateCurrentPage({ onDialogueEnd: onEndActions.filter((_, i) => i !== index) });
            };
            return (
              <div className="border-t border-[var(--studio-border)] pt-3">
                <button
                  onClick={() => setOnDialogueEndCollapsed(!onDialogueEndCollapsed)}
                  className="flex w-full items-center justify-between text-xs font-medium text-[var(--studio-text-secondary)] mb-2"
                >
                  <span className="flex items-center gap-1.5">
                    КОНЕЦ ДИАЛОГА
                    {onEndActions.length > 0 && (
                      <span className="rounded-full bg-[var(--studio-accent)] text-[#1C1814] text-[9px] font-bold px-1.5 py-0.5 leading-none">
                        {onEndActions.length}
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] opacity-50">{onDialogueEndCollapsed ? '▶' : '▼'}</span>
                </button>
                {!onDialogueEndCollapsed && (
                  <div className="space-y-2">
                    {onEndActions.length === 0 && (
                      <p className="text-[10px] text-[var(--studio-text-muted)] italic">
                        Срабатывает когда игрок кликает после последней реплики
                      </p>
                    )}
                    {onEndActions.map((action: any, i: number) => (
                      <div key={i} className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-base)] p-2 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-[var(--studio-text-muted)] font-mono">#{i + 1}</span>
                          <button onClick={() => removeAction(i)} className="text-[10px] text-[var(--studio-danger,#ef4444)] hover:underline">Удалить</button>
                        </div>
                        <ActionEditor action={action} onChange={(a: any) => updateAction(i, a)} variables={variables} items={items} widgets={currentPage?.uiWidgets || []} speakers={speakers} quests={quests} />
                      </div>
                    ))}
                    <button
                      onClick={addAction}
                      className="w-full text-xs px-2 py-1.5 border border-dashed border-[var(--studio-border)] rounded-lg hover:border-[var(--studio-accent)] text-[var(--studio-text-muted)] hover:text-[var(--studio-accent)] transition-colors"
                    >
                      + Добавить действие
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* === ДИАЛОГ UI: ВИДЖЕТЫ === */}
          <div className="pt-1 border-t border-[var(--studio-border)] mt-2">
            <div className="flex items-center justify-between mb-2">
              <label title="Перетаскивай виджеты на холсте. Выбери в списке — редактируй свойства ниже." className="text-xs font-medium text-[var(--studio-text-secondary)] cursor-help">
                ВИДЖЕТЫ ({(currentPage?.uiWidgets || []).length})
              </label>
              <button
                title="Открыть библиотеку виджетов и пресетов (W)"
                onClick={() => useStudioStore.getState().openWidgetLibrary()}
                className="flex items-center gap-1 rounded-md bg-[var(--studio-accent)] px-2 py-0.5 text-[10px] font-semibold text-[#1C1814] hover:brightness-110 transition-all"
              >
                + Библиотека
              </button>
            </div>

            {(currentPage?.uiWidgets || []).length === 0 && (
              <div className="text-[10px] text-[var(--studio-text-muted)] mb-2">Нет виджетов (выбери говорящего — добавятся автоматически)</div>
            )}

            <div className="space-y-2">
              {[...(currentPage?.uiWidgets || [])]
                .sort((a:any, b:any) => (b.layout.z||0) - (a.layout.z||0))
                .map((w: any) => {
                const st = useStudioStore.getState();
                const isSel = st.selectedWidgetId === w.id;
                const isDyn = st.mode === 'playtest' && !!st.playtestState.widgetOverrides[w.id];
                return (
                <div
                  key={w.id}
                  onClick={() => {
                    const st = useStudioStore.getState();
                    st.selectWidget(w.id);
                    st.selectButton(null);
                  }}
                  className={`rounded border px-2 py-2 text-[10px] cursor-pointer ${isSel ? 'border-[var(--studio-accent)] bg-[var(--studio-bg-elevated)]' : 'border-[var(--studio-border)] bg-[#161310] hover:border-[var(--studio-border-strong)]'}`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono text-[var(--studio-accent)]">{w.type} <span className="text-[8px] opacity-60">z:{w.layout.z??0}</span>{st.mode==='playtest' && st.playtestState.widgetOverrides[w.id] ? ' (dyn)' : ''}</span>
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

                  {/* Basic asset link (Phase 2) */}
                  <div className="mt-1">
                    <label className="text-[9px] text-[var(--studio-text-muted)]">Ассет (опц.)</label>
                    <select
                      value={w.assetId || ''}
                      onChange={(e) => {
                        const store = useStudioStore.getState();
                        store.updateUIWidget(currentPage.id, w.id, { assetId: e.target.value || undefined });
                      }}
                      className="w-full text-[10px] bg-[#1C1814] border border-[var(--studio-border)] px-1 py-0.5"
                    >
                      <option value="">— нет —</option>
                      {(useStudioStore.getState().uiAssets || []).map((a: any) => (
                        <option key={a.id} value={a.id}>{a.name.ru}</option>
                      ))}
                    </select>
                  </div>
                </div>
                );
              })}
            </div>

            {/* Selected Widget Inspector */}
            {(() => {
              let selW = (currentPage?.uiWidgets || []).find((ww: any) => ww.id === currentSelectedWidgetId);
              const st = useStudioStore.getState();
              if (st.mode === 'playtest' && selW && st.playtestState.widgetOverrides[selW.id]) {
                const ov = st.playtestState.widgetOverrides[selW.id];
                selW = {
                  ...selW,
                  ...ov,
                  data: { ...(selW.data || {}), ...(ov.data || {}) },
                };
              }
              if (!selW || !currentPage) return null;
              const w = selW;

              const updateW = (updates: any) => { st.updateUIWidget(currentPage.id, w.id, updates); };

              return (
                <div className="mt-2 space-y-3 rounded-xl border border-[var(--studio-accent)]/40 bg-[var(--studio-bg-elevated)] p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[var(--studio-accent)]">ВИДЖЕТ: {w.type.toUpperCase()}</span>
                    <button onClick={() => st.deleteUIWidget(currentPage.id, w.id)} className="text-[var(--studio-danger)] text-xs hover:underline">Удалить</button>
                  </div>

                  <div>
                    <div className="text-[10px] mb-1 text-[var(--studio-text-secondary)]">РАЗМЕРЫ (%)</div>
                    <div className="grid grid-cols-5 gap-1">
                      {(['x','y','width','height','z'] as const).map((k) => (
                        <div key={k}>
                          <div className="text-[9px] text-[var(--studio-text-muted)]">{k}</div>
                          <input type="number" step="0.5" value={w.layout[k] ?? (k==='z' ? 0 : 10)} onChange={(e) => {
                            const v = parseFloat(e.target.value); if (isNaN(v)) return;
                            updateW({ layout: { ...w.layout, [k]: v } });
                          }} className="w-full bg-[#1C1814] border border-[var(--studio-border)] px-1 py-0.5 text-center text-xs font-mono" />
                        </div>
                      ))}
                    </div>
                    {/* Z-order controls */}
                    <div className="flex gap-1 mt-1 text-[9px]">
                      <button onClick={() => {
                        const allZ = (currentPage?.uiWidgets || []).map((ww:any)=>ww.layout.z||0);
                        const maxZ = Math.max(0, ...allZ);
                        updateW({ layout: { ...w.layout, z: maxZ + 10 } });
                      }} className="px-1 py-0.5 border border-[var(--studio-border)] rounded hover:bg-[var(--studio-bg-elevated)]">На передний</button>
                      <button onClick={() => {
                        const allZ = (currentPage?.uiWidgets || []).map((ww:any)=>ww.layout.z||0).filter((zz:number)=>zz < (w.layout.z||0));
                        const nextZ = allZ.length ? Math.max(...allZ) + 1 : (w.layout.z||0) - 1;
                        updateW({ layout: { ...w.layout, z: Math.max(0, nextZ) } });
                      }} className="px-1 py-0.5 border border-[var(--studio-border)] rounded hover:bg-[var(--studio-bg-elevated)]">Вверх</button>
                      <button onClick={() => {
                        const allZ = (currentPage?.uiWidgets || []).map((ww:any)=>ww.layout.z||0).filter((zz:number)=>zz > (w.layout.z||0));
                        const nextZ = allZ.length ? Math.min(...allZ) - 1 : (w.layout.z||0) + 1;
                        updateW({ layout: { ...w.layout, z: Math.max(0, nextZ) } });
                      }} className="px-1 py-0.5 border border-[var(--studio-border)] rounded hover:bg-[var(--studio-bg-elevated)]">Вниз</button>
                      <button onClick={() => {
                        const minZ = Math.min(0, ... (currentPage?.uiWidgets || []).map((ww:any)=>ww.layout.z||0));
                        updateW({ layout: { ...w.layout, z: minZ - 10 } });
                      }} className="px-1 py-0.5 border border-[var(--studio-border)] rounded hover:bg-[var(--studio-bg-elevated)]">На задний</button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-[var(--studio-text-secondary)]">АССЕТ</label>
                    <select value={w.assetId || ''} onChange={e => updateW({ assetId: e.target.value || undefined })} className="w-full text-xs px-2 py-1 bg-[#1C1814] border border-[var(--studio-border)]">
                      <option value="">— нет —</option>
                      {(st.uiAssets || []).map((a: any) => <option key={a.id} value={a.id}>{a.name.ru}</option>)}
                    </select>
                  </div>

                  {/* General text for applicable widgets (legacy single choiceButton or textLabel) */}
                  {(w.type === 'textLabel' || (w.type === 'choiceButton' && !w.data?.items)) && (
                    <div>
                      <label className="text-[10px] text-[var(--studio-text-secondary)]">Текст (РУ)</label>
                      <input value={w.text?.ru || ''} onChange={e => updateW({ text: { ...(w.text||{ru:'',en:''}), ru: e.target.value } })} className="w-full text-xs px-2 py-1 bg-[#1C1814] border border-[var(--studio-border)]" />
                    </div>
                  )}

                  {w.type === 'portrait' && (
                    <div>
                      <label className="text-[10px]">Speaker ID</label>
                      <input value={w.data?.speakerId || ''} onChange={e=>updateW({data:{... (w.data||{}), speakerId: e.target.value}})} className="w-full text-xs px-2 py-1 bg-[#1C1814] border border-[var(--studio-border)]" />
                      <label className="text-[10px] mt-1 block">Variant</label>
                      <select value={w.data?.variant || 'default'} onChange={e=>updateW({data:{... (w.data||{}), variant: e.target.value}})} className="w-full text-xs px-2 py-1 bg-[#1C1814] border border-[var(--studio-border)]">
                        <option value="default">default</option>
                        <option value="neutral">neutral</option>
                        <option value="angry">angry</option>
                        <option value="happy">happy</option>
                        <option value="sad">sad</option>
                      </select>
                      <div className="text-[9px] text-[var(--studio-text-muted)] mt-0.5">Или введи свой</div>
                    </div>
                  )}
                  {w.type === 'choiceButton' && (() => {
                    const items: any[] = w.data?.items || [];
                    const isNewFormat = !!w.data?.items;

                    const updateItems = (next: any[]) =>
                      updateW({ data: { ...(w.data || {}), items: next, count: next.length } });

                    const addSlot = () => {
                      const n = items.length + 1;
                      const newItem = { id: `ci_${Date.now()}`, text: { ru: `Выбор ${n}`, en: `Choice ${n}` }, actions: [] };
                      updateItems([...items, newItem]);
                    };

                    const removeSlot = (i: number) => {
                      const next = [...items]; next.splice(i, 1); updateItems(next);
                    };

                    const updateSlotText = (i: number, ru: string) => {
                      const next = [...items];
                      next[i] = { ...next[i], text: { ...(next[i].text || {}), ru } };
                      updateItems(next);
                    };

                    const updateSlotActions = (i: number, acts: any[]) => {
                      const next = [...items];
                      next[i] = { ...next[i], actions: acts };
                      updateItems(next);
                    };

                    const updateSlotCondition = (i: number, cond: any) => {
                      const next = [...items];
                      next[i] = { ...next[i], visibleWhen: cond };
                      updateItems(next);
                    };

                    if (!isNewFormat) {
                      // Legacy widget — show migration prompt
                      return (
                        <div className="space-y-2">
                          <div className="rounded border border-amber-600/40 bg-amber-600/10 p-2 text-[10px] text-amber-400">
                            Старый формат (1 кнопка). Для авто-центрирования группы обнови до нового.
                          </div>
                          <button
                            onClick={() => {
                              const existingActions = w.actions ?? (w.action ? [w.action] : []);
                              updateW({
                                data: {
                                  ...(w.data || {}),
                                  items: [{ id: `ci_${Date.now()}`, text: { ru: w.text?.ru || 'Выбор 1', en: w.text?.en || 'Choice 1' }, actions: existingActions, visibleWhen: w.visibleWhen }],
                                  count: 1,
                                },
                                action: undefined,
                                actions: undefined,
                                visibleWhen: undefined,
                              });
                            }}
                            className="w-full text-xs px-2 py-1.5 bg-amber-600/20 border border-amber-600/50 rounded hover:bg-amber-600/30 text-amber-300 transition-colors"
                          >
                            Обновить до группы
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2">
                        {/* Slot count selector */}
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] text-[var(--studio-text-secondary)] shrink-0">СЛОТЫ</label>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(n => (
                              <button
                                key={n}
                                onClick={() => {
                                  if (n > items.length) {
                                    const toAdd = n - items.length;
                                    const newItems = [...items];
                                    for (let k = 0; k < toAdd; k++) {
                                      const idx = newItems.length + 1;
                                      newItems.push({ id: `ci_${Date.now()}_${k}`, text: { ru: `Выбор ${idx}`, en: `Choice ${idx}` }, actions: [] });
                                    }
                                    updateItems(newItems);
                                  } else if (n < items.length) {
                                    updateItems(items.slice(0, n));
                                  }
                                }}
                                className={`w-6 h-6 text-[11px] rounded border transition-colors ${items.length === n ? 'border-[var(--studio-accent)] text-[var(--studio-accent)] bg-[var(--studio-accent)]/10' : 'border-[var(--studio-border)] text-[var(--studio-text-muted)] hover:border-[var(--studio-accent)]'}`}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                          <label className="flex items-center gap-1 text-[10px] cursor-pointer select-none ml-auto">
                            <input type="checkbox" checked={!!w.data?.imageOnly} onChange={e => updateW({ data: { ...(w.data || {}), imageOnly: e.target.checked } })} className="accent-[var(--studio-accent)]" />
                            Img only
                          </label>
                        </div>

                        {/* Per-slot editors */}
                        {items.map((item: any, i: number) => (
                          <SlotEditor
                            key={item.id || i}
                            index={i}
                            item={item}
                            variables={st.variables || []}
                            items={st.items || []}
                            widgets={currentPage?.uiWidgets || []}
                            speakers={speakers}
                            quests={quests}
                            onTextChange={(ru) => updateSlotText(i, ru)}
                            onActionsChange={(acts) => updateSlotActions(i, acts)}
                            onConditionChange={(cond) => updateSlotCondition(i, cond)}
                            onRemove={items.length > 1 ? () => removeSlot(i) : undefined}
                          />
                        ))}

                        {items.length < 5 && (
                          <button
                            onClick={addSlot}
                            className="w-full text-xs px-2 py-1 bg-[var(--studio-bg-base)] border border-dashed border-[var(--studio-border)] rounded hover:border-[var(--studio-accent)] text-[var(--studio-text-muted)] hover:text-[var(--studio-accent)] transition-colors"
                          >
                            + Слот
                          </button>
                        )}
                      </div>
                    );
                  })()}
                  {w.type === 'intensityBar' && (
                    <div>
                      <label className="text-[10px]">Value variable ID</label>
                      <input value={w.data?.valueVar || ''} onChange={e=>updateW({data:{...(w.data||{}), valueVar: e.target.value}})} className="w-full text-xs px-2 py-1 bg-[#1C1814] border border-[var(--studio-border)]" placeholder="souls" />
                      <label className="text-[10px] mt-1 block">Parts (1-5)</label>
                      <input type="number" value={w.data?.parts || 3} onChange={e=>updateW({data:{...(w.data||{}), parts: parseInt(e.target.value)||3 }})} className="w-full text-xs px-2 py-1 bg-[#1C1814] border border-[var(--studio-border)]" />
                    </div>
                  )}
                  {w.type === 'quickAction' && (
                    <div>
                      <label className="text-[10px]">Тип действия</label>
                      <select value={w.data?.actionType || 'custom'} onChange={e=>updateW({data:{...(w.data||{}), actionType: e.target.value}})} className="w-full text-xs px-2 py-1 bg-[#1C1814] border border-[var(--studio-border)]">
                        <option value="inventory">Инвентарь</option>
                        <option value="map">Карта</option>
                        <option value="skills">Навыки</option>
                        <option value="custom">Другое</option>
                      </select>
                    </div>
                  )}
                  {w.type === 'container' && (
                    <div>
                      <label className="text-[10px]">Заголовок (опц.)</label>
                      <input value={w.data?.title || ''} onChange={e=>updateW({data:{...(w.data||{}), title: e.target.value}})} className="w-full text-xs px-2 py-1 bg-[#1C1814] border border-[var(--studio-border)]" placeholder="Левая панель" />
                    </div>
                  )}
                  {w.type === 'speechBubble' && (
                    <div className="space-y-1.5">
                      <div>
                        <label className="text-[10px] block">Хвостик</label>
                        <select value={w.data?.tailDirection || 'bottom'} onChange={e=>updateW({data:{...(w.data||{}), tailDirection: e.target.value as any}})} className="w-full text-xs px-2 py-1 bg-[#1C1814] border border-[var(--studio-border)]">
                          <option value="bottom">↓ Снизу</option>
                          <option value="left">← Слева</option>
                          <option value="right">→ Справа</option>
                          <option value="none">— Нет</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] block">Текст (переопределить)</label>
                        <textarea value={w.text?.ru || ''} onChange={e=>updateW({text:{...(w.text||{ru:'',en:''}), ru: e.target.value}})} rows={2} className="w-full text-xs px-2 py-1 bg-[#1C1814] border border-[var(--studio-border)] resize-none" placeholder="пусто = текст страницы" />
                      </div>
                    </div>
                  )}
                  {w.type === 'dialogueBox' && (() => {
                    const store = useStudioStore.getState();
                    const dlLines = currentPage?.dialogueLines || [];
                    const previewIdx = editorDialoguePreviewLine;
                    const setPreview = setEditorDialoguePreview;
                    return (
                      <div className="space-y-2">
                        <div>
                          <label className="text-[10px]">Имя говорящего (оверрайд)</label>
                          <input value={w.data?.speakerName || ''} onChange={e=>updateW({data:{...(w.data||{}), speakerName: e.target.value}})} className="w-full text-xs px-2 py-1 bg-[#1C1814] border border-[var(--studio-border)]" placeholder="из страницы" />
                        </div>
                        <div>
                          <label className="text-[10px] block">Источник текста</label>
                          <select value={w.data?.textSource || 'page'} onChange={e=>updateW({data:{...(w.data||{}), textSource: e.target.value}})} className="w-full text-xs px-2 py-1 bg-[#1C1814] border border-[var(--studio-border)]">
                            <option value="page">Из страницы</option>
                            <option value="custom">Свой текст виджета</option>
                          </select>
                          {w.data?.textSource === 'custom' && (
                            <textarea value={w.text?.ru || ''} onChange={e=>updateW({text: { ...(w.text||{ru:'',en:''}), ru: e.target.value }})} rows={2} className="w-full text-xs mt-1 px-2 py-1 bg-[#1C1814] border border-[var(--studio-border)] resize-none" placeholder="Текст диалога" />
                          )}
                        </div>
                        <div>
                          <label className="text-[10px] block">Стиль</label>
                          <select value={w.style || 'default'} onChange={e=>updateW({style: e.target.value})} className="w-full text-xs px-2 py-1 bg-[#1C1814] border border-[var(--studio-border)]">
                            <option value="default">Обычный</option>
                            <option value="important">Важный</option>
                          </select>
                        </div>
                        <label className="flex items-center gap-2 text-[10px] cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={w.data?.clickable !== false}
                            onChange={e => updateW({ data: { ...(w.data || {}), clickable: e.target.checked } })}
                            className="accent-[var(--studio-accent)]"
                          />
                          <span>Кликабельно <span className="text-[var(--studio-text-muted)]">(клик переключает реплику)</span></span>
                        </label>

                        {/* Dialogue Lines (очередь реплик) */}
                        <div className="border-t border-[var(--studio-border)] pt-2">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-medium text-[var(--studio-text-secondary)]">
                              РЕПЛИКИ ({dlLines.length})
                            </label>
                            <button
                              onClick={() => store.addDialogueLine(currentPage.id)}
                              className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--studio-border)] hover:bg-[var(--studio-bg-elevated)]"
                            >+ Добавить</button>
                          </div>
                          {dlLines.length === 0 ? (
                            <p className="text-[9px] text-[var(--studio-text-muted)] leading-tight">
                              Нет реплик — показывается статичный текст страницы. Реплики запускаются действием «Продвинуть диалог».
                            </p>
                          ) : (
                            <div className="flex items-center gap-1 mb-1.5">
                              <span className="text-[9px] text-[var(--studio-text-muted)]">Превью:</span>
                              <button
                                onClick={() => setPreview(null)}
                                className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${previewIdx === null ? 'bg-[var(--studio-accent)] text-[#1C1814] border-[var(--studio-accent)]' : 'border-[var(--studio-border)] hover:bg-[var(--studio-bg-elevated)]'}`}
                                title="Показать статичный текст страницы"
                              >текст</button>
                              {dlLines.map((_: any, i: number) => (
                                <button
                                  key={i}
                                  onClick={() => setPreview(i)}
                                  className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${previewIdx === i ? 'bg-[var(--studio-accent)] text-[#1C1814] border-[var(--studio-accent)]' : 'border-[var(--studio-border)] hover:bg-[var(--studio-bg-elevated)]'}`}
                                  title={`Превью реплики ${i + 1}`}
                                >{i + 1}</button>
                              ))}
                            </div>
                          )}
                          {dlLines.map((line: any, idx: number) => (
                            <div key={line.id} className="mb-2 rounded border border-[var(--studio-border)] bg-[#1C1814] p-1.5">
                              <div className="flex items-center gap-1 mb-1">
                                <span className="text-[9px] text-[var(--studio-text-muted)] w-4 shrink-0">{idx + 1}.</span>
                                <select
                                  value={line.speaker || ''}
                                  onChange={e => store.updateDialogueLine(currentPage.id, line.id, { speaker: e.target.value || undefined })}
                                  className="flex-1 text-[10px] px-1 py-0.5 bg-[#252018] border border-[var(--studio-border)] min-w-0"
                                  title="Спикер этой реплики"
                                >
                                  <option value="">— спикер страницы —</option>
                                  {speakers.map((s: any) => (
                                    <option key={s.id} value={s.id}>{s.displayName.ru}</option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => store.deleteDialogueLine(currentPage.id, line.id)}
                                  className="text-[10px] opacity-40 hover:opacity-100 hover:text-red-400 px-1 shrink-0"
                                  title="Удалить реплику"
                                >✕</button>
                              </div>
                              <textarea
                                value={line.text?.ru || ''}
                                onChange={e => store.updateDialogueLine(currentPage.id, line.id, { text: { ru: e.target.value, en: line.text?.en || '' } })}
                                rows={2}
                                className="w-full text-xs px-1.5 py-1 bg-[#252018] border border-[var(--studio-border)] resize-none"
                                placeholder={`Реплика ${idx + 1}…`}
                              />
                              <input
                                value={line.portraitVariant || ''}
                                onChange={e => store.updateDialogueLine(currentPage.id, line.id, { portraitVariant: e.target.value || undefined })}
                                className="w-full text-[10px] mt-1 px-1.5 py-0.5 bg-[#252018] border border-[var(--studio-border)]"
                                placeholder="Вариант портрета (angry, happy…)"
                                title="Вариант портрета для этой реплики"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {!(w.type === 'choiceButton' && w.data?.items) && (
                    <div className="pt-2 border-t border-[var(--studio-border)]">
                      <ConditionEditor label="Видим когда" condition={w.visibleWhen} onChange={(c) => updateW({ visibleWhen: c })} variables={variables} items={items} quests={quests} speakers={speakers} />
                    </div>
                  )}
                </div>
              );
            })()}

            <p className="mt-1 text-[9px] text-[var(--studio-text-muted)]">Выбери виджет в списке выше или на холсте. Перетаскивание работает на canvas.</p>
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
              HUD всегда виден в редакторе и в плейтесте. Выключи, чтобы скрыть на этой сцене.
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

        </div>
      )}
    </div>
  );
}
