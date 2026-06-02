'use client';

import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import ActionEditor from './ActionEditor';
import ConditionEditor from './ConditionEditor';

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
