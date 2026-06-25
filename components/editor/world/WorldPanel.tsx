"use client";

import { useState } from 'react';
import { toast } from 'sonner';
import { useStudioStore, DIALOGUE_THEME_PRESETS, type Variable, type StatModifier, type Speaker } from '@/lib/store';
import ItemCreationModal from '@/components/editor/ItemCreationModal';

const protectedPlayerStats = [
  'health', 'health_max',
  'mana', 'mana_max',
  'strength', 'agility', 'endurance', 'defense',
  'souls', 'level', 'exp',
  'crit_chance', 'crit_damage',
];

export default function WorldPanel() {
  const {
    variables,
    items,
    speakers,
    backgrounds,
    uiAssets,
    playtestState,
    startingInventory,
    playerStatsCollapsed,
    togglePlayerStatsCollapsed,
    resourcesCollapsed,
    toggleResourcesCollapsed,
    inventoryCollapsed,
    toggleInventoryCollapsed,
    variablesCollapsed,
    toggleVariablesCollapsed,
    itemsCollapsed,
    toggleItemsCollapsed,
    backgroundsCollapsed,
    toggleBackgroundsCollapsed,
    collapsedItemIds,
    toggleItemCollapsed,
    addDefaultPlayerStats,
    addDefaultResources,
    addVariable,
    updateVariable,
    deleteVariable,
    addItem,
    updateItem,
    deleteItem,
    renameItem,
    addSpeaker,
    updateSpeaker,
    deleteSpeaker,
    addBackground,
    updateBackground,
    deleteBackground,
    addUIAsset,
    updateUIAsset,
    deleteUIAsset,
    addToStartingInventory,
    removeFromStartingInventory,
    setStartingInventoryQuantity,
    setPlaytestVariableValue,
    resetPlaytestState,
    dialogueTheme,
    updateDialogueTheme,
    mode,
  } = useStudioStore();

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingBackgroundId, setEditingBackgroundId] = useState<string | null>(null);
  const [editingUIAssetId, setEditingUIAssetId] = useState<string | null>(null);
  const [editingItemIds, setEditingItemIds] = useState<Record<string, string>>({});
  const [uiAssetsCollapsed, setUiAssetsCollapsed] = useState(false);
  const [speakersCollapsed, setSpeakersCollapsed] = useState(false);

  const numberVariables = variables.filter(v => v.type === 'number');

  const updatePlayerStatValue = (varId: string, val: number) => {
    updateVariable(varId, { defaultValue: val });
    if (mode === 'playtest') {
      setPlaytestVariableValue(varId, val);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">

      {/* === ХАРАКТЕРИСТИКИ === */}
      <div className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] p-3">
        <div
          onClick={togglePlayerStatsCollapsed}
          className="flex w-full cursor-pointer items-center justify-between text-sm font-medium text-[var(--studio-text-secondary)]"
        >
          <span>ХАРАКТЕРИСТИКИ</span>
          <span className="text-xs">{playerStatsCollapsed ? '▶' : '▼'}</span>
        </div>

        {!playerStatsCollapsed && (
          <div className="mt-3 space-y-1.5 text-sm">
            {variables.filter(v => v.category === 'player').length === 0 ? (
              <div>
                <p className="text-[11px] text-[var(--studio-text-muted)] italic mb-2">
                  Нет характеристик ГГ.
                </p>
                <button
                  onClick={() => {
                    if (confirm('Добавить стандартные характеристики Главного Героя?')) {
                      addDefaultPlayerStats();
                    }
                  }}
                  className="text-xs px-3 py-1 rounded border border-[var(--studio-border)] hover:bg-[var(--studio-bg-panel)]"
                >
                  + Характеристики ГГ
                </button>
              </div>
            ) : (
              variables
                .filter(v => v.category === 'player')
                .sort((a, b) => {
                  const order = ['health', 'health_max', 'mana', 'mana_max', 'strength', 'agility', 'endurance', 'defense', 'souls', 'crit_chance', 'crit_damage', 'level', 'exp'];
                  const ia = order.indexOf(a.name);
                  const ib = order.indexOf(b.name);
                  return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
                })
                .map((variable) => {
                  const currentValue = playtestState.variableValues[variable.id] ?? variable.defaultValue;

                  if (variable.name === 'health' || variable.name === 'mana') {
                    const maxVar = variables.find(v => v.name === `${variable.name}_max`);
                    const maxValue = maxVar ? (playtestState.variableValues[maxVar.id] ?? maxVar.defaultValue) : currentValue;
                    const isProtected = protectedPlayerStats.includes(variable.name) || protectedPlayerStats.includes(variable.name.replace('_max', ''));

                    return (
                      <div key={variable.id} className="flex items-center justify-between gap-2 rounded border border-[var(--studio-border)] bg-[#1C1814] px-3 py-1.5">
                        <span className="text-[var(--studio-text-secondary)]">{variable.displayName.ru}</span>
                        <div className="flex items-center gap-1 font-mono text-[var(--studio-accent)]">
                          <input
                            type="number"
                            value={currentValue as number}
                            onChange={(e) => updatePlayerStatValue(variable.id, parseInt(e.target.value) || 0)}
                            className="w-14 rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-1 py-0.5 text-xs text-right"
                          />
                          <span>/</span>
                          {maxVar ? (
                            <input
                              type="number"
                              value={maxValue as number}
                              onChange={(e) => updatePlayerStatValue(maxVar.id, parseInt(e.target.value) || 0)}
                              className="w-14 rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-1 py-0.5 text-xs text-right"
                            />
                          ) : (
                            <span>{maxValue}</span>
                          )}
                          {!isProtected && (
                            <button
                              onClick={() => { if (confirm(`Удалить характеристику "${variable.displayName.ru}"?`)) deleteVariable(variable.id); }}
                              className="ml-2 text-[var(--studio-danger)] hover:text-red-400 text-xs"
                            >✕</button>
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (variable.name.endsWith('_max')) return null;

                  const isProtected = protectedPlayerStats.includes(variable.name);

                  if (variable.name === 'crit_chance') {
                    return (
                      <div key={variable.id} className="flex items-center justify-between gap-2 rounded border border-[var(--studio-border)] bg-[#1C1814] px-3 py-1.5">
                        <span className="text-[var(--studio-text-secondary)]">{variable.displayName.ru}</span>
                        <div className="flex items-center gap-1 font-mono text-[var(--studio-accent)]">
                          <input
                            type="number"
                            value={currentValue as number}
                            onChange={(e) => updatePlayerStatValue(variable.id, parseInt(e.target.value) || 0)}
                            className="w-14 rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-1 py-0.5 text-xs text-right"
                          />
                          <span>%</span>
                          {!isProtected && (
                            <button
                              onClick={() => { if (confirm(`Удалить характеристику "${variable.displayName.ru}"?`)) deleteVariable(variable.id); }}
                              className="ml-1 text-[var(--studio-danger)] hover:text-red-400 text-xs"
                            >✕</button>
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (variable.name === 'crit_damage') {
                    return (
                      <div key={variable.id} className="flex items-center justify-between gap-2 rounded border border-[var(--studio-border)] bg-[#1C1814] px-3 py-1.5">
                        <span className="text-[var(--studio-text-secondary)]">{variable.displayName.ru}</span>
                        <div className="flex items-center gap-1 font-mono text-[var(--studio-accent)]">
                          <span>x</span>
                          <input
                            type="number"
                            step="0.1"
                            value={currentValue as number}
                            onChange={(e) => updatePlayerStatValue(variable.id, parseFloat(e.target.value) || 1)}
                            className="w-14 rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-1 py-0.5 text-xs text-right"
                          />
                          {!isProtected && (
                            <button
                              onClick={() => { if (confirm(`Удалить характеристику "${variable.displayName.ru}"?`)) deleteVariable(variable.id); }}
                              className="ml-1 text-[var(--studio-danger)] hover:text-red-400 text-xs"
                            >✕</button>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={variable.id} className="flex items-center justify-between gap-2 rounded border border-[var(--studio-border)] bg-[#1C1814] px-3 py-1.5">
                      <span className="text-[var(--studio-text-secondary)]">{variable.displayName.ru}</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={currentValue as number}
                          onChange={(e) => updatePlayerStatValue(variable.id, parseInt(e.target.value) || 0)}
                          className="w-16 rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-1 py-0.5 text-xs text-right font-mono text-[var(--studio-accent)]"
                        />
                        {!isProtected && (
                          <button
                            onClick={() => { if (confirm(`Удалить характеристику "${variable.displayName.ru}"?`)) deleteVariable(variable.id); }}
                            className="ml-1 text-[var(--studio-danger)] hover:text-red-400 text-xs"
                          >✕</button>
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        )}
      </div>

      {/* === РЕСУРСЫ === */}
      <div className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] p-3">
        <button
          onClick={toggleResourcesCollapsed}
          className="flex w-full items-center justify-between text-sm font-medium text-[var(--studio-text-secondary)]"
        >
          <span>РЕСУРСЫ</span>
          <span className="text-xs">{resourcesCollapsed ? '▶' : '▼'}</span>
        </button>

        {!resourcesCollapsed && (
          <div className="mt-3 space-y-1.5 text-sm">
            {variables.filter(v => v.category === 'resources').length === 0 ? (
              <div>
                <p className="text-[11px] text-[var(--studio-text-muted)] italic mb-2">
                  Ресурсы (монеты, бензин, драгоценности) отсутствуют.
                </p>
                <button
                  onClick={() => {
                    if (confirm('Добавить стандартные расходники (монеты, бензин, драгоценности)?')) {
                      addDefaultResources();
                    }
                  }}
                  className="flex items-center gap-1 rounded border border-[var(--studio-border)] px-2 py-0.5 text-xs hover:bg-[var(--studio-bg-panel)]"
                >
                  + Добавить
                </button>
              </div>
            ) : (
              variables.filter(v => v.category === 'resources').map((resource) => {
                const value = playtestState.variableValues[resource.id] ?? resource.defaultValue;
                return (
                  <div key={resource.id} className="flex items-center justify-between rounded border border-[var(--studio-border)] bg-[#1C1814] px-3 py-1.5">
                    <span className="text-[var(--studio-text-secondary)]">{resource.displayName.ru}</span>
                    <input
                      type="number"
                      value={value as number}
                      onChange={(e) => updateVariable(resource.id, { defaultValue: parseInt(e.target.value) || 0 })}
                      className="w-16 rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-1 py-0.5 text-xs text-right font-mono text-[var(--studio-accent)]"
                    />
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* === ИНВЕНТАРЬ (стартовые предметы) === */}
      <div className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] p-3">
        <button
          onClick={toggleInventoryCollapsed}
          className="flex w-full items-center justify-between text-sm font-medium text-[var(--studio-text-secondary)]"
        >
          <span>ИНВЕНТАРЬ</span>
          <span className="text-xs">{inventoryCollapsed ? '▶' : '▼'}</span>
        </button>

        {!inventoryCollapsed && (
          <div className="mt-3 space-y-1.5 text-sm">
            {Object.keys(startingInventory).length === 0 ? (
              <p className="text-[11px] text-[var(--studio-text-muted)] italic">
                Здесь будут предметы, с которыми игрок начинает игру.
                Добавляйте их кнопкой «В инвентарь» в списке предметов ниже.
              </p>
            ) : (
              Object.entries(startingInventory).map(([itemId, qty]) => {
                const item = items.find(i => i.id === itemId);
                if (!item) return null;
                return (
                  <div key={itemId} className="flex items-center justify-between rounded border border-[var(--studio-border)] bg-[#1C1814] px-3 py-1.5">
                    <span className="truncate text-[var(--studio-text-secondary)]">{item.name.ru}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={qty}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setStartingInventoryQuantity(itemId, val);
                          const linkedItem = items.find(i => i.id === itemId);
                          if (linkedItem?.quantityVariableId) {
                            updateVariable(linkedItem.quantityVariableId, { defaultValue: val });
                          }
                        }}
                        className="w-14 rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-1 py-0.5 text-xs text-right font-mono text-[var(--studio-accent)]"
                      />
                      <button
                        onClick={() => removeFromStartingInventory(itemId)}
                        className="text-[var(--studio-danger)] hover:text-red-400 text-xs"
                        title="Убрать из стартового инвентаря"
                      >✕</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* === ПЕРЕМЕННЫЕ === */}
      <div className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] p-3">
        <button
          onClick={toggleVariablesCollapsed}
          className="flex w-full items-center justify-between text-sm font-medium text-[var(--studio-text-secondary)] mb-2"
        >
          <span>ПЕРЕМЕННЫЕ</span>
          <span className="text-xs">{variablesCollapsed ? '▶' : '▼'}</span>
        </button>

        {!variablesCollapsed && (
          <>
            <div className="flex gap-1 mb-2">
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
            </div>

            {variables.length === 0 && (
              <p className="text-[11px] text-[var(--studio-text-muted)] italic">
                Нет переменных. Создайте первую, чтобы использовать в условиях.
              </p>
            )}

            <div className="space-y-2 max-h-72 overflow-auto pr-1">
              {variables
                .filter(v => v.category !== 'player' && v.category !== 'resources')
                .map((variable) => (
                  <div key={variable.id} className="rounded border border-[var(--studio-border)] bg-[#1C1814] p-2 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <input
                          value={variable.displayName.ru}
                          onChange={(e) => updateVariable(variable.id, { displayName: { ...variable.displayName, ru: e.target.value } })}
                          className="w-full bg-transparent font-medium focus:outline-none"
                          placeholder="Название (RU)"
                        />
                        <div className="flex justify-between text-[10px] text-[var(--studio-text-muted)] font-mono mt-0.5">
                          <span>{variable.name}</span>
                          <span className="text-[var(--studio-accent)]">
                            {playtestState.variableValues[variable.id] ?? variable.defaultValue}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => { if (confirm('Удалить эту переменную?')) deleteVariable(variable.id); }}
                        className="text-[var(--studio-danger)] hover:text-red-400 text-sm leading-none"
                      >✕</button>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <select
                        value={variable.type}
                        onChange={(e) => updateVariable(variable.id, {
                          type: e.target.value as Variable['type'],
                          defaultValue: e.target.value === 'boolean' ? false : e.target.value === 'string' ? '' : 0,
                        })}
                        className="rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-2 py-1"
                      >
                        <option value="number">Число</option>
                        <option value="boolean">Да/Нет</option>
                        <option value="string">Текст</option>
                      </select>

                      <select
                        value={variable.category}
                        onChange={(e) => updateVariable(variable.id, { category: e.target.value as Variable['category'] })}
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

                    <div className="mt-2">
                      <label className="text-[10px] text-[var(--studio-text-muted)]">Значение по умолчанию</label>
                      {variable.type === 'boolean' ? (
                        <select
                          value={String(variable.defaultValue)}
                          onChange={(e) => updateVariable(variable.id, { defaultValue: e.target.value === 'true' })}
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
                            if (variable.type === 'number') val = parseFloat(e.target.value) || 0;
                            updateVariable(variable.id, { defaultValue: val });
                          }}
                          className="mt-1 w-full rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-2 py-1 text-sm"
                        />
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}
      </div>

      {/* === ПРЕДМЕТЫ === */}
      <div className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] p-3">
        <button
          onClick={toggleItemsCollapsed}
          className="flex w-full items-center justify-between text-sm font-medium text-[var(--studio-text-secondary)] mb-2"
        >
          <span>ПРЕДМЕТЫ</span>
          <span className="text-xs">{itemsCollapsed ? '▶' : '▼'}</span>
        </button>

        {!itemsCollapsed && (
          <>
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => setIsItemModalOpen(true)}
                className="flex items-center gap-1 rounded bg-[var(--studio-accent)] px-3 py-1.5 text-sm font-medium text-[#1C1814] hover:bg-[var(--studio-accent-hover)] w-full justify-center"
              >
                + Создать предмет
              </button>
            </div>

            {items.length === 0 && (
              <p className="text-[11px] text-[var(--studio-text-muted)] italic">
                Нет предметов. Добавьте первый, чтобы использовать в действиях и условиях.
              </p>
            )}

            <div className="space-y-2 max-h-60 overflow-auto pr-1">
              {items.map((item) => {
                const isCollapsed = !collapsedItemIds.includes(item.id);

                return (
                  <div key={item.id} className="rounded border border-[var(--studio-border)] bg-[#1C1814] p-2 text-sm">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleItemCollapsed(item.id)}
                            className="text-[var(--studio-text-muted)] hover:text-[var(--studio-text-primary)] text-xs"
                          >
                            {isCollapsed ? '▶' : '▼'}
                          </button>
                          <input
                            value={item.name.ru}
                            onChange={(e) => updateItem(item.id, { name: { ...item.name, ru: e.target.value } })}
                            className="flex-1 bg-transparent font-medium focus:outline-none text-sm"
                            placeholder="Название (RU)"
                          />
                        </div>

                        <div className="mt-0.5 flex items-center gap-1">
                          <span className="text-[10px] text-[var(--studio-text-muted)]">ID:</span>
                          <input
                            value={editingItemIds[item.id] ?? item.id}
                            onChange={(e) => setEditingItemIds(prev => ({ ...prev, [item.id]: e.target.value }))}
                            onBlur={() => {
                              const current = editingItemIds[item.id] ?? item.id;
                              const newId = current.trim();
                              if (newId && newId !== item.id) {
                                if (confirm(`Изменить ID предмета с "${item.id}" на "${newId}"?\nВсе условия и действия, использующие этот предмет, будут обновлены.`)) {
                                  renameItem(item.id, newId);
                                }
                              }
                              setEditingItemIds(prev => { const copy = { ...prev }; delete copy[item.id]; return copy; });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.currentTarget.blur();
                              if (e.key === 'Escape') {
                                setEditingItemIds(prev => { const copy = { ...prev }; delete copy[item.id]; return copy; });
                                e.currentTarget.blur();
                              }
                            }}
                            className="font-mono text-[10px] bg-transparent border-b border-[var(--studio-border)] focus:outline-none w-auto"
                          />
                        </div>

                        {!isCollapsed && (
                          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                            <div>
                              <div className="text-[var(--studio-text-muted)] mb-0.5">Тип</div>
                              <select
                                value={item.type ?? 'misc'}
                                onChange={(e) => updateItem(item.id, { type: e.target.value as any })}
                                className="w-full rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-2 py-1 text-xs"
                              >
                                {Object.entries({ weapon: 'Оружие', armor: 'Броня', accessory: 'Аксессуар', consumable: 'Расходник', material: 'Материал', quest: 'Квестовый', misc: 'Прочее' }).map(([key, label]) => (
                                  <option key={key} value={key}>{label}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <div className="text-[var(--studio-text-muted)] mb-0.5">Редкость</div>
                              <select
                                value={item.rarity ?? 'common'}
                                onChange={(e) => updateItem(item.id, { rarity: e.target.value as any })}
                                className="w-full rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-2 py-1 text-xs"
                              >
                                {Object.entries({ trash: 'Мусор', junk: 'Хлам', common: 'Простой', uncommon: 'Средний', rare: 'Высокий', epic: 'Легендарный', legendary: 'Мифический', mythic: 'Имбовый', overpowered: 'Имбовый+' }).map(([key, label]) => (
                                  <option key={key} value={key}>{label}</option>
                                ))}
                              </select>
                            </div>

                            <div className="col-span-2">
                              <div className="text-[var(--studio-text-muted)] mb-0.5">Прочность</div>
                              <div className="flex items-center gap-2">
                                <input type="number" value={item.durability ?? 100} onChange={(e) => updateItem(item.id, { durability: parseInt(e.target.value) || 0 })} className="w-16 rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-2 py-1 text-xs" />
                                <span>/</span>
                                <input type="number" value={item.maxDurability ?? 100} onChange={(e) => updateItem(item.id, { maxDurability: parseInt(e.target.value) || 1 })} className="w-16 rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-2 py-1 text-xs" />
                              </div>
                            </div>

                            {item.isEquippable && item.type === 'weapon' && (
                              <div className="col-span-2">
                                <div className="text-[var(--studio-text-muted)] mb-0.5">Урон оружия (базовый)</div>
                                <input type="number" value={item.weaponDamage ?? 0} onChange={(e) => updateItem(item.id, { weaponDamage: parseInt(e.target.value) || 0 })} className="w-full rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-2 py-1 text-xs" placeholder="Например: 8" />
                                <p className="text-[10px] text-[var(--studio-text-muted)] mt-0.5">Этот урон будет суммироваться с Силой ГГ</p>
                              </div>
                            )}

                            {item.isEquippable && (
                              <div className="col-span-2">
                                <div className="text-[var(--studio-text-muted)] mb-0.5">Защита</div>
                                <input type="number" value={item.defenseValue ?? 0} onChange={(e) => updateItem(item.id, { defenseValue: parseInt(e.target.value) || 0 })} className="w-full rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-2 py-1 text-xs" placeholder="Например: 3" />
                                <p className="text-[10px] text-[var(--studio-text-muted)] mt-0.5">Это значение будет добавлено к базовой Защите персонажа</p>
                              </div>
                            )}

                            <div>
                              <div className="text-[var(--studio-text-muted)] mb-0.5">Цена</div>
                              <input type="number" value={item.price ?? 0} onChange={(e) => updateItem(item.id, { price: parseInt(e.target.value) || 0 })} className="w-full rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-2 py-1 text-xs" />
                            </div>

                            <div>
                              <div className="flex items-center gap-2 mt-4">
                                <label className="flex items-center gap-1 text-[10px]">
                                  <input type="checkbox" checked={item.isEquippable ?? false} onChange={(e) => updateItem(item.id, { isEquippable: e.target.checked })} />
                                  Одеваемый
                                </label>
                              </div>
                              {item.isEquippable && (
                                <select
                                  value={item.slot || ''}
                                  onChange={(e) => updateItem(item.id, { slot: (e.target.value || null) as any })}
                                  className="mt-1 w-full rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-2 py-1 text-xs"
                                >
                                  <option value="">— Слот —</option>
                                  <option value="one_handed_weapon">Одноручное оружие</option>
                                  <option value="two_handed_weapon">Двуручное оружие</option>
                                  <option value="shield">Щит</option>
                                  <option value="helmet">Шлем</option>
                                  <option value="gloves">Перчатки</option>
                                  <option value="chest">Тело</option>
                                  <option value="legs">Ноги</option>
                                  <option value="boots">Ботинки</option>
                                  <option value="belt">Пояс</option>
                                  <option value="cloak">Плащ</option>
                                  <option value="amulet">Амулет</option>
                                  <option value="ring">Кольцо</option>
                                  <option value="minion">Миньон</option>
                                </select>
                              )}
                            </div>

                            <div className="col-span-2 mt-2 pt-2 border-t border-[var(--studio-border)]">
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="text-[10px] text-[var(--studio-text-muted)]">Бонусы к характеристикам</div>
                                <button
                                  onClick={() => {
                                    const playerVars = variables.filter(v => v.category === 'player');
                                    if (playerVars.length === 0) { alert('Сначала создайте характеристики ГГ'); return; }
                                    const newMod: StatModifier = { statId: playerVars[0].id, value: 1 };
                                    updateItem(item.id, { modifiers: [...(item.modifiers || []), newMod] });
                                  }}
                                  className="text-[10px] px-2 py-0.5 rounded border border-[var(--studio-border)] hover:bg-[var(--studio-bg-panel)]"
                                >
                                  + Бонус
                                </button>
                              </div>

                              {(item.modifiers || []).length > 0 && (
                                <div className="space-y-1.5">
                                  {(item.modifiers || []).map((mod, index) => (
                                    <div key={index} className="flex items-center gap-2 text-xs">
                                      <select
                                        value={mod.statId}
                                        onChange={(e) => {
                                          const newMods = [...(item.modifiers || [])];
                                          newMods[index] = { ...mod, statId: e.target.value };
                                          updateItem(item.id, { modifiers: newMods });
                                        }}
                                        className="flex-1 rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-2 py-1 text-xs"
                                      >
                                        {variables.filter(v => v.category === 'player').map(v => (
                                          <option key={v.id} value={v.id}>{v.displayName.ru}</option>
                                        ))}
                                      </select>
                                      <input
                                        type="number"
                                        step="0.1"
                                        value={mod.value}
                                        onChange={(e) => {
                                          const newMods = [...(item.modifiers || [])];
                                          const raw = e.target.value.replace(',', '.');
                                          const parsed = parseFloat(raw);
                                          newMods[index] = { ...mod, value: isNaN(parsed) ? 0 : parsed };
                                          updateItem(item.id, { modifiers: newMods });
                                        }}
                                        className="w-16 rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-2 py-1 text-xs text-right"
                                      />
                                      <button
                                        onClick={() => {
                                          const newMods = (item.modifiers || []).filter((_, i) => i !== index);
                                          updateItem(item.id, { modifiers: newMods.length > 0 ? newMods : undefined });
                                        }}
                                        className="text-[var(--studio-danger)] hover:text-red-400"
                                      >✕</button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {(item.modifiers || []).length === 0 && (
                                <div className="text-[10px] text-[var(--studio-text-muted)] italic">
                                  Нет бонусов. Нажмите "+ Бонус", чтобы добавить (например +3 к Урону).
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => addToStartingInventory(item.id, 1)}
                        className="text-[10px] px-2 py-0.5 rounded border border-[var(--studio-border)] hover:bg-[var(--studio-bg-panel)] text-[var(--studio-text-muted)] mr-1"
                        title="Добавить в стартовый инвентарь"
                      >
                        В инвентарь
                      </button>
                      <button
                        onClick={() => { if (confirm('Удалить этот предмет?')) deleteItem(item.id); }}
                        className="text-[var(--studio-danger)] hover:text-red-400 ml-1 text-sm leading-none"
                      >✕</button>
                    </div>

                    {!isCollapsed && (
                      <>
                        <input
                          value={item.name.en}
                          onChange={(e) => updateItem(item.id, { name: { ...item.name, en: e.target.value } })}
                          className="mt-1 w-full bg-transparent text-[10px] text-[var(--studio-text-muted)] focus:outline-none"
                          placeholder="Name (EN)"
                        />
                        <input
                          value={item.icon || ''}
                          onChange={(e) => updateItem(item.id, { icon: e.target.value.trim() || undefined })}
                          className="mt-1 w-full bg-transparent text-[10px] text-[var(--studio-text-muted)] focus:outline-none font-mono"
                          placeholder="Путь к иконке (например: /icons/sword.png)"
                        />
                        <textarea
                          value={item.description.ru}
                          onChange={(e) => updateItem(item.id, { description: { ...item.description, ru: e.target.value } })}
                          placeholder="Описание (RU)"
                          className="mt-1 w-full resize-y bg-transparent text-xs focus:outline-none"
                          rows={2}
                        />
                        <textarea
                          value={item.description.en || ''}
                          onChange={(e) => updateItem(item.id, { description: { ...item.description, en: e.target.value } })}
                          placeholder="Description (EN)"
                          className="mt-1 w-full resize-y bg-transparent text-xs focus:outline-none"
                          rows={2}
                        />

                        <div className="mt-3 pt-2 border-t border-[var(--studio-border)]">
                          <label className="text-[10px] text-[var(--studio-text-muted)] block mb-1">
                            Количество хранится в переменной
                          </label>
                          <div className="flex gap-2">
                            <select
                              value={item.quantityVariableId || ''}
                              onChange={(e) => updateItem(item.id, { quantityVariableId: e.target.value || undefined })}
                              className="flex-1 rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-2 py-1 text-xs"
                            >
                              <option value="">— Не отслеживать количество —</option>
                              {numberVariables.map((v) => (
                                <option key={v.id} value={v.id}>{v.displayName.ru} ({v.name})</option>
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
                                const createdVar = useStudioStore.getState().variables.find(v => v.name === suggestedName);
                                if (createdVar) updateItem(item.id, { quantityVariableId: createdVar.id });
                              }}
                              className="text-[10px] px-2 py-1 rounded border border-[var(--studio-border)] hover:bg-[var(--studio-bg-panel)] whitespace-nowrap"
                              title="Создать новую переменную для количества этого предмета"
                            >
                              + Переменная
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* === ФОНЫ === */}
      <div className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] p-3">
        <button
          onClick={toggleBackgroundsCollapsed}
          className="flex w-full items-center justify-between text-sm font-medium text-[var(--studio-text-secondary)] mb-2"
        >
          <span>ФОНЫ</span>
          <span className="text-xs">{backgroundsCollapsed ? '▶' : '▼'}</span>
        </button>

        {!backgroundsCollapsed && (
          <>
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => {
                  const newBg: any = {
                    name: { ru: 'Новый фон', en: 'New Background' },
                    url: '',
                    settings: {
                      scale: 1, offsetX: 0, offsetY: 0, brightness: 1, opacity: 1, fitMode: 'cover',
                      parallax: { enabled: false, speedX: 0.5, speedY: 0.3, reverse: false },
                    },
                  };
                  addBackground(newBg);
                  setTimeout(() => {
                    const latest = useStudioStore.getState().backgrounds.slice(-1)[0];
                    if (latest) setEditingBackgroundId(latest.id);
                  }, 0);
                }}
                className="flex items-center gap-1 rounded bg-[var(--studio-accent)] px-3 py-1.5 text-sm font-medium text-[#1C1814] hover:bg-[var(--studio-accent-hover)] w-full justify-center"
              >
                + Новый фон (изображение / градиент)
              </button>
            </div>

            {backgrounds.length === 0 && (
              <p className="text-[11px] text-[var(--studio-text-muted)] italic">
                Нет фонов. Добавьте свой (URL картинки) или используйте встроенные градиенты.
              </p>
            )}

            <div className="space-y-2 max-h-72 overflow-auto pr-1">
              {backgrounds.map((bg) => {
                const isEditing = editingBackgroundId === bg.id;
                return (
                  <div
                    key={bg.id}
                    className={`rounded border px-2 py-1.5 text-xs ${isEditing ? 'border-[var(--studio-accent)] bg-[var(--studio-bg-elevated)]' : 'border-[var(--studio-border)] bg-[#1C1814]'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => setEditingBackgroundId(isEditing ? null : bg.id)}
                        className="flex-1 text-left font-medium truncate hover:underline"
                      >
                        {bg.name.ru} {bg.url ? '🖼️' : '🎨'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Удалить фон "${bg.name.ru}"?`)) {
                            deleteBackground(bg.id);
                            if (editingBackgroundId === bg.id) setEditingBackgroundId(null);
                          }
                        }}
                        className="text-[var(--studio-danger)] hover:text-red-400"
                      >✕</button>
                    </div>

                    {isEditing && (
                      <div className="mt-2 space-y-2 border-t border-[var(--studio-border)] pt-2">
                        <div>
                          <label className="text-[9px] text-[var(--studio-text-muted)]">Название (РУ)</label>
                          <input value={bg.name.ru} onChange={(e) => updateBackground(bg.id, { name: { ...bg.name, ru: e.target.value } })} className="w-full rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-2 py-0.5 text-xs" />
                        </div>
                        <div>
                          <label className="text-[9px] text-[var(--studio-text-muted)]">Название (EN)</label>
                          <input value={bg.name.en} onChange={(e) => updateBackground(bg.id, { name: { ...bg.name, en: e.target.value } })} className="w-full rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-2 py-0.5 text-xs" />
                        </div>
                        <div>
                          <label className="text-[9px] text-[var(--studio-text-muted)]">URL изображения (прямая ссылка)</label>
                          <input
                            value={bg.url || ''}
                            placeholder="https://... или /bg/intro_forest.png"
                            onChange={(e) => {
                              let val = e.target.value.trim().replace(/\\/g, '/');
                              if (val && !val.startsWith('http') && !val.startsWith('/')) val = '/' + val;
                              updateBackground(bg.id, { url: val || undefined });
                            }}
                            className="w-full rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-2 py-0.5 text-xs font-mono"
                          />
                          <p className="mt-0.5 text-[8px] text-[var(--studio-text-muted)]">
                            Путь от корня public, например /bg/intro_forest.png (с ведущим /)
                          </p>
                          {bg.url && (
                            <div className="mt-1">
                              <img src={bg.url} style={{ maxWidth: '100%', maxHeight: 60, objectFit: 'contain', border: '1px solid #444', background: '#111' }} alt="bg preview"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.border = '1px solid #c25d3a'; (e.currentTarget as HTMLImageElement).style.opacity = '0.5'; }}
                              />
                              <div className="text-[8px] text-[var(--studio-text-muted)]">Preview — красная рамка = путь неверный</div>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] text-[var(--studio-text-muted)]">Масштаб</label>
                            <input type="number" step="0.1" value={bg.settings.scale} onChange={(e) => updateBackground(bg.id, { settings: { ...bg.settings, scale: parseFloat(e.target.value) || 1 } })} className="w-full rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-1 py-0.5 text-xs" />
                          </div>
                          <div>
                            <label className="text-[9px] text-[var(--studio-text-muted)]">Режим подгонки</label>
                            <select value={bg.settings.fitMode || 'cover'} onChange={(e) => updateBackground(bg.id, { settings: { ...bg.settings, fitMode: e.target.value as any } })} className="w-full rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-1 py-0.5 text-xs">
                              <option value="cover">Cover</option>
                              <option value="contain">Contain</option>
                              <option value="fill">Fill</option>
                              <option value="manual">Manual</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] text-[var(--studio-text-muted)]">Яркость</label>
                            <input type="number" step="0.1" min="0" max="2" value={bg.settings.brightness} onChange={(e) => updateBackground(bg.id, { settings: { ...bg.settings, brightness: parseFloat(e.target.value) || 1 } })} className="w-full rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-1 py-0.5 text-xs" />
                          </div>
                          <div>
                            <label className="text-[9px] text-[var(--studio-text-muted)]">Прозрачность</label>
                            <input type="number" step="0.1" min="0" max="1" value={bg.settings.opacity} onChange={(e) => updateBackground(bg.id, { settings: { ...bg.settings, opacity: parseFloat(e.target.value) || 1 } })} className="w-full rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-1 py-0.5 text-xs" />
                          </div>
                          <div>
                            <label className="text-[9px] text-[var(--studio-text-muted)]">Смещение X</label>
                            <input type="number" step="1" value={bg.settings.offsetX} onChange={(e) => updateBackground(bg.id, { settings: { ...bg.settings, offsetX: parseFloat(e.target.value) || 0 } })} className="w-full rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-1 py-0.5 text-xs" />
                          </div>
                          <div>
                            <label className="text-[9px] text-[var(--studio-text-muted)]">Смещение Y</label>
                            <input type="number" step="1" value={bg.settings.offsetY} onChange={(e) => updateBackground(bg.id, { settings: { ...bg.settings, offsetY: parseFloat(e.target.value) || 0 } })} className="w-full rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-1 py-0.5 text-xs" />
                          </div>
                        </div>

                        <div className="pt-1 border-t border-[var(--studio-border)]">
                          <label className="flex items-center gap-1 text-[9px] text-[var(--studio-text-muted)]">
                            <input type="checkbox" checked={bg.settings.parallax.enabled} onChange={(e) => updateBackground(bg.id, { settings: { ...bg.settings, parallax: { ...bg.settings.parallax, enabled: e.target.checked } } })} />
                            Параллакс
                          </label>
                          {bg.settings.parallax.enabled && (
                            <div className="grid grid-cols-3 gap-1 mt-1">
                              <input type="number" step="0.1" value={bg.settings.parallax.speedX} onChange={(e) => updateBackground(bg.id, { settings: { ...bg.settings, parallax: { ...bg.settings.parallax, speedX: parseFloat(e.target.value) || 0 } } })} className="text-xs px-1 rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)]" title="Скорость X" />
                              <input type="number" step="0.1" value={bg.settings.parallax.speedY} onChange={(e) => updateBackground(bg.id, { settings: { ...bg.settings, parallax: { ...bg.settings.parallax, speedY: parseFloat(e.target.value) || 0 } } })} className="text-xs px-1 rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)]" title="Скорость Y" />
                              <label className="text-[8px] flex items-center gap-1">
                                <input type="checkbox" checked={bg.settings.parallax.reverse} onChange={(e) => updateBackground(bg.id, { settings: { ...bg.settings, parallax: { ...bg.settings.parallax, reverse: e.target.checked } } })} />
                                Обратный
                              </label>
                            </div>
                          )}
                        </div>

                        <button onClick={() => setEditingBackgroundId(null)} className="w-full mt-1 text-[10px] py-0.5 rounded border border-[var(--studio-border)] hover:bg-[var(--studio-bg-panel)]">
                          Закрыть редактор
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="mt-2 text-[9px] text-[var(--studio-text-muted)]">
              Фоны глобальные. Можно использовать на любых страницах.
            </p>
          </>
        )}
      </div>

      {/* === UI АССЕТЫ === */}
      <div className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] p-3">
        <button
          onClick={() => setUiAssetsCollapsed(!uiAssetsCollapsed)}
          className="flex w-full items-center justify-between text-sm font-medium text-[var(--studio-text-secondary)] mb-2"
        >
          <span>UI АССЕТЫ</span>
          <span className="text-xs">{uiAssetsCollapsed ? '▶' : '▼'}</span>
        </button>

        {!uiAssetsCollapsed && (
          <>
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => {
                  const nameRu = prompt('Название ассета (РУ):', 'Новый скин') || 'Новый ассет';
                  const url = prompt('URL (от public, с /):', '/ui/button.png');
                  if (url) {
                    let finalUrl = url.trim().replace(/\\/g, '/');
                    if (finalUrl && !finalUrl.startsWith('http') && !finalUrl.startsWith('/')) finalUrl = '/' + finalUrl;
                    addUIAsset({ name: { ru: nameRu, en: nameRu }, type: 'buttonSkin', url: finalUrl });
                    setTimeout(() => {
                      const latest = useStudioStore.getState().uiAssets.slice(-1)[0];
                      if (latest) setEditingUIAssetId(latest.id);
                    }, 0);
                  }
                }}
                className="text-[10px] px-2 py-1 rounded bg-[var(--studio-accent)] text-[#1C1814] hover:bg-[var(--studio-accent-hover)] w-full"
              >
                + Добавить ассет (PNG)
              </button>
            </div>

            {uiAssets.length === 0 && (
              <p className="text-[10px] text-[var(--studio-text-muted)] italic">Нет ассетов. Добавь скины кнопок / портреты (прозрачный PNG).</p>
            )}

            <div className="space-y-1.5 max-h-48 overflow-auto text-xs">
              {uiAssets.map((asset: any) => {
                const isEd = editingUIAssetId === asset.id;
                return (
                  <div key={asset.id} className={`rounded border p-1.5 ${isEd ? 'border-[var(--studio-accent)]' : 'border-[var(--studio-border)]'} bg-[#1C1814]`}>
                    <div className="flex items-center justify-between">
                      <button onClick={() => setEditingUIAssetId(isEd ? null : asset.id)} className="truncate flex-1 text-left hover:underline">
                        {asset.name.ru} <span className="text-[9px] opacity-60">({asset.type})</span>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); if (confirm('Удалить ассет?')) { deleteUIAsset(asset.id); if (isEd) setEditingUIAssetId(null); } }}
                        className="text-red-400 px-1"
                      >×</button>
                    </div>
                    {isEd && (
                      <div className="mt-1 space-y-1 border-t pt-1">
                        <input
                          value={asset.url || ''}
                          placeholder="/ui/xxx.png"
                          onChange={(e) => {
                            let v = e.target.value.trim().replace(/\\/g, '/');
                            if (v && !v.startsWith('http') && !v.startsWith('/')) v = '/' + v;
                            updateUIAsset(asset.id, { url: v });
                          }}
                          className="w-full text-[10px] px-1 py-0.5 bg-[#161310] border border-[var(--studio-border)]"
                        />
                        <div className="text-[9px] text-[var(--studio-text-muted)]">Используй в виджетах (assetId) или кнопках (image)</div>
                        {asset.url && (
                          <img src={asset.url} className="max-h-8 border border-[var(--studio-border)] mt-0.5" alt="" onError={(e: any) => e.currentTarget.style.opacity = '0.3'} />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* === ПЕРСОНАЖИ === */}
      <div className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] p-3">
        <button
          onClick={() => setSpeakersCollapsed(!speakersCollapsed)}
          className="flex w-full items-center justify-between text-sm font-medium text-[var(--studio-text-secondary)] mb-2"
        >
          <span>ПЕРСОНАЖИ</span>
          <span className="text-xs">{speakersCollapsed ? '▶' : '▼'}</span>
        </button>

        {!speakersCollapsed && (
          <SpeakersSection speakers={speakers} uiAssets={uiAssets} addSpeaker={addSpeaker} updateSpeaker={updateSpeaker} deleteSpeaker={deleteSpeaker} />
        )}
      </div>

      {/* === ТЕМА ДИАЛОГА === */}
      <div className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] p-3">
        <div className="text-sm font-medium text-[var(--studio-text-secondary)] mb-2">ТЕМА ДИАЛОГА</div>

        <div className="flex flex-wrap gap-1 mb-3">
          {Object.entries(DIALOGUE_THEME_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => { const { label, ...themeValues } = preset; updateDialogueTheme(themeValues); }}
              className="text-[9px] px-1.5 py-0.5 rounded border border-[var(--studio-border)] hover:bg-[var(--studio-accent)] hover:text-[#1C1814] transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          {([
            ['boxFill', 'Фон бокса'],
            ['boxStroke', 'Рамка'],
            ['textColor', 'Текст'],
            ['nameTagColor', 'Акцент / имя'],
          ] as [keyof typeof dialogueTheme, string][]).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between gap-2">
              <label className="text-[10px] text-[var(--studio-text-muted)] flex-1">{label}</label>
              <input
                type="color"
                value={(() => { const v = dialogueTheme[key] as string; const hex = v.match(/#[0-9a-fA-F]{3,8}/); return hex ? hex[0].slice(0, 7) : '#888888'; })()}
                onChange={(e) => updateDialogueTheme({ [key]: e.target.value })}
                className="w-7 h-5 cursor-pointer rounded border border-[var(--studio-border)] p-0"
              />
            </div>
          ))}

          <div className="flex items-center justify-between gap-2">
            <label className="text-[10px] text-[var(--studio-text-muted)] flex-1">Скругление</label>
            <div className="flex items-center gap-1">
              <input type="range" min={0} max={20} value={dialogueTheme.boxCornerRadius} onChange={(e) => updateDialogueTheme({ boxCornerRadius: Number(e.target.value) })} className="w-16" />
              <span className="text-[9px] w-4 text-right">{dialogueTheme.boxCornerRadius}</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <label className="text-[10px] text-[var(--studio-text-muted)] flex-1">Шрифт</label>
            <select
              value={dialogueTheme.fontFamily}
              onChange={(e) => updateDialogueTheme({ fontFamily: e.target.value })}
              className="text-[10px] px-1 py-0.5 bg-[#161310] border border-[var(--studio-border)]"
            >
              {['Arial', 'Georgia', 'Verdana', 'Courier New', 'Times New Roman', 'Trebuchet MS'].map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Item Creation Modal (lives here, not in page.tsx) */}
      <ItemCreationModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onCreate={(newItem) => {
          addItem(newItem);
          toast.success('Предмет создан');
        }}
        variables={variables}
        items={items}
      />
    </div>
  );
}

function SpeakersSection({
  speakers,
  uiAssets,
  addSpeaker,
  updateSpeaker,
  deleteSpeaker,
}: {
  speakers: Speaker[];
  uiAssets: any[];
  addSpeaker: (s: Omit<Speaker, never>) => void;
  updateSpeaker: (id: string, updates: Partial<Omit<Speaker, 'id'>>) => void;
  deleteSpeaker: (id: string) => void;
}) {
  const [editingSpeakerId, setEditingSpeakerId] = useState<string | null>(null);

  return (
    <>
      <button
        onClick={() => {
          const nameRu = prompt('Имя персонажа (РУ):', 'Новый персонаж');
          if (!nameRu) return;
          const nameEn = prompt('Имя персонажа (EN):', nameRu) || nameRu;
          const rawId = prompt('ID (латиница, без пробелов):', nameRu.toLowerCase().replace(/\s+/g, '_')) || '';
          const id = rawId.trim().replace(/[^a-z0-9_]/gi, '_') || `spk_${Date.now().toString(36)}`;
          addSpeaker({ id, displayName: { ru: nameRu, en: nameEn } });
          setTimeout(() => setEditingSpeakerId(id), 0);
        }}
        className="text-[10px] px-2 py-1 rounded bg-[var(--studio-accent)] text-[#1C1814] hover:bg-[var(--studio-accent-hover)] w-full mb-2"
      >
        + Добавить персонажа
      </button>

      {speakers.length === 0 && (
        <p className="text-[10px] text-[var(--studio-text-muted)] italic">Нет персонажей. Добавь, чтобы выбирать в диалогах.</p>
      )}

      <div className="space-y-1.5 max-h-48 overflow-auto text-xs">
        {speakers.map((spk) => {
          const isEd = editingSpeakerId === spk.id;
          return (
            <div key={spk.id} className={`rounded border p-1.5 ${isEd ? 'border-[var(--studio-accent)]' : 'border-[var(--studio-border)]'} bg-[#1C1814]`}>
              <div className="flex items-center justify-between">
                <button onClick={() => setEditingSpeakerId(isEd ? null : spk.id)} className="truncate flex-1 text-left hover:underline">
                  {spk.displayName.ru} <span className="text-[9px] opacity-60 font-mono">({spk.id})</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Удалить персонажа «${spk.displayName.ru}»?`)) {
                      deleteSpeaker(spk.id);
                      if (isEd) setEditingSpeakerId(null);
                    }
                  }}
                  className="text-red-400 px-1"
                >×</button>
              </div>
              {isEd && (
                <div className="mt-1 space-y-1 border-t pt-1">
                  <input value={spk.displayName.ru} placeholder="Имя (РУ)" onChange={(e) => updateSpeaker(spk.id, { displayName: { ...spk.displayName, ru: e.target.value } })} className="w-full text-[10px] px-1 py-0.5 bg-[#161310] border border-[var(--studio-border)]" />
                  <input value={spk.displayName.en} placeholder="Имя (EN)" onChange={(e) => updateSpeaker(spk.id, { displayName: { ...spk.displayName, en: e.target.value } })} className="w-full text-[10px] px-1 py-0.5 bg-[#161310] border border-[var(--studio-border)]" />
                  <div className="text-[9px] text-[var(--studio-text-muted)]">ID: <span className="font-mono">{spk.id}</span> (неизменяемый)</div>
                  <div>
                    <label className="text-[9px] text-[var(--studio-text-muted)] block mb-0.5">Портрет (asset)</label>
                    <select
                      value={spk.portraitAssetId || ''}
                      onChange={(e) => updateSpeaker(spk.id, { portraitAssetId: e.target.value || undefined })}
                      className="w-full text-[10px] px-1 py-0.5 bg-[#161310] border border-[var(--studio-border)]"
                    >
                      <option value="">— не задан —</option>
                      {uiAssets.map((a: any) => (
                        <option key={a.id} value={a.id}>{a.name?.ru || a.id}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
