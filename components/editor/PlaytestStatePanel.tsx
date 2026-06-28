'use client';

import { useState } from 'react';
import { useStudioStore, type Variable, type Item, EquipmentSlotLabels } from '@/lib/store';
import { getCurrentPlayerAvatar } from '@/components/editor/TopResourceBar';
import {
  getEffectivePlayerStat,
  getEquippedItems,
  getAllEquippedItemIds,
  getEquippedWeaponName,
} from '@/lib/store';
import { derivePlayerStats } from '@/lib/combat/engine';
import { RefreshCw, Sword, Shield } from 'lucide-react';

export default function PlaytestStatePanel() {
  const {
    variables,
    items,
    playtestState,
    combatSession,
    resetPlaytestState,
    loadPlaytestProgress,
    clearPlaytestSave,
    equipItem,
    unequipItem,
    isItemEquipped,
    startingInventory,
  } = useStudioStore();

  // Local collapse state for Playtest sections (to reduce scrolling when many items)
  const [equipmentCollapsed, setEquipmentCollapsed] = useState(true);
  const [playtestInventoryCollapsed, setPlaytestInventoryCollapsed] = useState(true);

  const getCurrentValue = (variable: Variable) => {
    return playtestState.variableValues[variable.id] ?? variable.defaultValue;
  };

  // Get current quantity for an item (via linked variable, falling back to startingInventory)
  const getItemQuantity = (item: Item): number => {
    // 1. Если есть привязанная переменная — берём из live playtest state
    if (item.quantityVariableId) {
      const value = playtestState.variableValues[item.quantityVariableId];
      if (typeof value === 'number') return value;
    }

    // 2. Фоллбэк на стартовый инвентарь (если предмет добавлен через блок ИНВЕНТАРЬ)
    if (startingInventory[item.id] !== undefined) {
      return startingInventory[item.id];
    }

    return 0;
  };

  // Показываем предметы, которые либо имеют quantityVariableId, либо явно добавлены в startingInventory
  const inventoryItems = items.filter(item =>
    item.quantityVariableId || startingInventory[item.id] !== undefined
  );

  // === Combat stats — designer-set variables take priority over formula fallbacks ===
  const numVar = (name: string, fallback: number) => {
    const v = variables.find((v: Variable) => v.name === name);
    if (!v) return fallback;
    const val = playtestState.variableValues[v.id];
    return typeof val === 'number' ? val : (typeof v.defaultValue === 'number' ? v.defaultValue : fallback);
  };
  const optVar = (name: string): number | undefined => {
    const v = variables.find((v: Variable) => v.name === name);
    if (!v) return undefined;
    const val = playtestState.variableValues[v.id];
    return typeof val === 'number' ? val : typeof v.defaultValue === 'number' ? v.defaultValue : undefined;
  };

  const combatStats = {
    str: numVar('strength', 5),
    agi: numVar('agility', 5),
    end: numVar('endurance', 10),
    mag: numVar('magic', 5),
    lck: numVar('luck', 5),
    lvl: numVar('level', 1),
    hpMax:   optVar('health_max'),
    mpMax:   optVar('mana_max'),
    defFlat: optVar('defense'),
    critCh:  optVar('crit_chance'),
    critDmg: (() => { const v = optVar('crit_damage'); return v !== undefined ? Math.round(v * 100) : undefined; })(),
  };
  const derived = derivePlayerStats(combatStats);

  const equippedWeaponName = getEquippedWeaponName(items, playtestState);
  const equippedItems = getEquippedItems(items, getAllEquippedItemIds(playtestState));
  const equippableItems = items.filter(i => i.isEquippable);

  const handleReset = () => {
    if (confirm('Сбросить всё к начальным значениям? Сохранённый прогресс будет удалён.')) {
      clearPlaytestSave();
      resetPlaytestState();
    }
  };

  const handleLoadSave = () => {
    const loaded = loadPlaytestProgress();
    if (!loaded) alert('Нет сохранённого прогресса.');
  };

  const handleToggleEquip = (itemId: string) => {
    if (isItemEquipped(itemId)) {
      unequipItem(itemId);
    } else {
      equipItem(itemId);
    }
  };

  const handleResetEquipment = () => {
    // We reset only equipment by re-setting the equipped list
    // (cheaper than full reset)
    useStudioStore.setState(s => ({
      playtestState: {
        ...s.playtestState,
        equippedItemIds: [],
        equippedSlots: {},
      },
    }));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-[var(--studio-border)] px-4 py-3 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-[var(--studio-text-secondary)] flex-1">
          ТЕКУЩЕЕ СОСТОЯНИЕ
        </span>
        <button
          onClick={handleLoadSave}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-[var(--studio-border)] hover:bg-[var(--studio-bg-elevated)] text-[var(--studio-accent)]"
          title="Загрузить прогресс последней сессии"
        >
          ↑ Прогресс
        </button>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 text-xs px-2 py-1 rounded border border-[var(--studio-border)] hover:bg-[var(--studio-bg-elevated)] text-[var(--studio-text-secondary)]"
          title="Сбросить к начальным значениям"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Сброс
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* =========================================================
           В БОЮ — реалтайм если идёт бой, иначе базовые значения
           ========================================================= */}
        <div className="rounded-lg border border-[var(--studio-accent)]/40 bg-[#1C1814] p-3">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--studio-accent)]">
              <Sword className="h-4 w-4" />
              {combatSession?.status === 'active' ? 'В БОЮ — РЕАЛТАЙМ' : 'В БОЮ — СТАРТ'}
            </div>
            {equippedWeaponName && (
              <span className="text-[10px] text-[var(--studio-text-muted)]">{equippedWeaponName}</span>
            )}
          </div>

          {combatSession?.status === 'active' ? (
            /* ── АКТИВНЫЙ БОЙ ── */
            <>
              {/* HP / MP bars */}
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                <div className="rounded bg-[#161310] px-2.5 py-1.5">
                  <div className="text-[10px] text-[var(--studio-text-muted)]">HP</div>
                  <div className="font-mono text-base font-bold tabular-nums" style={{ color: combatSession.playerHp / combatSession.playerHpMax < 0.25 ? '#ff4444' : 'var(--studio-accent)' }}>
                    {combatSession.playerHp} <span className="text-xs font-normal text-[var(--studio-text-muted)]">/ {combatSession.playerHpMax}</span>
                  </div>
                  <div className="mt-1 h-1 rounded-full overflow-hidden bg-[var(--studio-border)]">
                    <div className="h-full rounded-full" style={{ width: `${(combatSession.playerHp / combatSession.playerHpMax) * 100}%`, background: combatSession.playerHp / combatSession.playerHpMax < 0.25 ? '#ff4444' : '#e55a5a' }} />
                  </div>
                </div>
                <div className="rounded bg-[#161310] px-2.5 py-1.5">
                  <div className="text-[10px] text-[var(--studio-text-muted)]">MP</div>
                  <div className="font-mono text-base font-bold text-[var(--studio-accent)] tabular-nums">
                    {combatSession.playerMp} <span className="text-xs font-normal text-[var(--studio-text-muted)]">/ {combatSession.playerMpMax}</span>
                  </div>
                  <div className="mt-1 h-1 rounded-full overflow-hidden bg-[var(--studio-border)]">
                    <div className="h-full rounded-full bg-cyan-400" style={{ width: `${(combatSession.playerMp / combatSession.playerMpMax) * 100}%` }} />
                  </div>
                </div>
              </div>

              {/* ATK with momentum */}
              <div className="flex items-center justify-between rounded bg-[#161310] px-3 py-2 border border-[var(--studio-accent)]/30 mb-2">
                <div>
                  <div className="text-xs text-[var(--studio-text-muted)]">УРОН (ATK)</div>
                  <div className="text-[10px] text-[var(--studio-text-muted)] mt-0.5">
                    {derived.atk} × (1+{combatSession.momentum}%) моментум
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-2xl font-bold text-[#E8D4A0] tabular-nums leading-none">
                    {Math.round(derived.atk * (1 + combatSession.momentum / 100))}
                  </div>
                  {combatSession.momentum > 0 && (
                    <div className="text-[10px] text-yellow-400 font-mono">+{combatSession.momentum}%</div>
                  )}
                </div>
              </div>

              {/* Stat grid */}
              <div className="grid grid-cols-3 gap-1">
                {[
                  ['DEF', String(derived.defFlat)],
                  ['Крит', `${derived.critCh}%`],
                  ['КритУрон', `×${(derived.critDmg / 100).toFixed(1)}`],
                  ['Уворот', `${derived.dodge}%`],
                  ['Моментум', `×${combatSession.momentum}`],
                  ['Showtime', `${Math.min(100, combatSession.showtime)}%`],
                ].map(([label, val]) => (
                  <div key={label} className="rounded bg-[#161310] px-2 py-1">
                    <div className="text-[9px] text-[var(--studio-text-muted)]">{label}</div>
                    <div className="font-mono text-sm font-semibold text-[var(--studio-accent)] tabular-nums">{val}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* ── ВНЕ БОЯ — базовые стартовые значения ── */
            <>
              {/* ATK — главная цифра */}
              <div className="flex items-center justify-between rounded bg-[#161310] px-3 py-2 border border-[var(--studio-accent)]/30 mb-2">
                <div>
                  <div className="text-xs text-[var(--studio-text-muted)]">УРОН (ATK)</div>
                  <div className="text-[10px] text-[var(--studio-text-muted)] mt-0.5">
                    STR {combatStats.str}, ур.{combatStats.lvl}
                  </div>
                </div>
                <div className="font-mono text-3xl font-bold text-[#E8D4A0] tabular-nums leading-none">
                  {derived.atk}
                </div>
              </div>

              {/* Stat grid */}
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  ['HP макс', String(derived.hpMax)],
                  ['MP макс', String(derived.mpMax)],
                  ['Защита (DEF)', String(derived.defFlat)],
                  ['Уворот', `${derived.dodge}%`],
                  ['Крит шанс', `${derived.critCh}%`],
                  ['Крит урон', `×${(derived.critDmg / 100).toFixed(1)}`],
                ].map(([label, val]) => (
                  <div key={label} className="rounded bg-[#161310] px-2.5 py-1.5">
                    <div className="text-[10px] text-[var(--studio-text-muted)]">{label}</div>
                    <div className="font-mono text-lg font-semibold text-[var(--studio-accent)] tabular-nums leading-tight">{val}</div>
                  </div>
                ))}
              </div>

              <div className="mt-2 text-[10px] text-[var(--studio-text-muted)]">
                Данные из переменных мира. Запусти бой — здесь появятся реалтайм значения.
              </div>
            </>
          )}
        </div>

        {/* === ИНВЕНТАРЬ (перемещён между В БОЮ и Экипировкой) === */}
        <div>
          <button
            onClick={() => setPlaytestInventoryCollapsed(!playtestInventoryCollapsed)}
            className="flex w-full items-center justify-between text-xs font-medium text-[var(--studio-text-muted)] uppercase tracking-wider mb-2"
          >
            <span>ИНВЕНТАРЬ</span>
            <span>{playtestInventoryCollapsed ? '▶' : '▼'}</span>
          </button>

          {!playtestInventoryCollapsed && (
            inventoryItems.length === 0 ? (
              <p className="text-xs text-[var(--studio-text-muted)] italic">
                Нет предметов в стартовом инвентаре. Добавь их в редакторе через кнопку «В инвентарь».
              </p>
            ) : (
              <div className="space-y-1.5">
                {inventoryItems.map((item) => {
                  const quantity = getItemQuantity(item);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] px-3 py-2 text-sm"
                    >
                      <span className="truncate">
                        {item.name.ru}
                      </span>
                      <span className="font-mono text-[var(--studio-accent)] ml-2 shrink-0">
                        {quantity}
                      </span>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* === ЭКИПИРОВКА (сворачиваемая) === */}
        {equippableItems.length > 0 && (
          <div>
            <button
              onClick={() => setEquipmentCollapsed(!equipmentCollapsed)}
              className="flex w-full items-center justify-between text-xs font-medium text-[var(--studio-text-muted)] uppercase tracking-wider mb-2"
            >
              <span className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" /> ЭКИПИРОВКА ({equippedItems.length}/{equippableItems.length})
              </span>
              <span>{equipmentCollapsed ? '▶' : '▼'}</span>
            </button>

            {!equipmentCollapsed && (
              <div className="space-y-1.5">
                {equippableItems.map((item) => {
                  const equipped = isItemEquipped(item.id);
                  const dmg = item.weaponDamage ?? 0;
                  const modCount = (item.modifiers || []).length;

                  return (
                    <label
                      key={item.id}
                      className={`flex items-center gap-2 rounded border px-3 py-2 text-sm cursor-pointer transition-colors ${
                        equipped
                          ? 'border-[var(--studio-accent)] bg-[var(--studio-accent)]/10'
                          : 'border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] hover:bg-[#1C1814]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={equipped}
                        onChange={() => handleToggleEquip(item.id)}
                        className="accent-[var(--studio-accent)]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">{item.name.ru}</div>
                        <div className="text-[10px] text-[var(--studio-text-muted)] truncate">
                          {item.type === 'weapon' && dmg > 0 && `Урон +${dmg} • `}
                          {modCount > 0 && `+${modCount} бонус${modCount > 1 ? 'а' : ''} • `}
                          {item.slot ? (EquipmentSlotLabels[item.slot] ?? item.slot) : '—'}
                        </div>
                      </div>
                      {equipped && (
                        <span className="text-[10px] text-[var(--studio-accent)] font-medium">ОДЕТО</span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* === ХАРАКТЕРИСТИКИ ГГ (с бонусами от экипировки) === */}
        <div>
          <div className="text-xs font-medium text-[var(--studio-text-muted)] mb-2 uppercase tracking-wider">
            ХАРАКТЕРИСТИКИ ГГ
          </div>

          {variables.filter(v => v.category === 'player').length === 0 ? (
            <p className="text-xs text-[var(--studio-text-muted)] italic">
              Нет характеристик ГГ.
            </p>
          ) : (
            <div className="space-y-1.5">
              {variables
                .filter(v => v.category === 'player')
                .sort((a, b) => {
                  const order = ['health', 'health_max', 'mana', 'mana_max', 'strength', 'agility', 'endurance', 'magic', 'luck', 'defense', 'souls', 'crit_chance', 'crit_damage', 'level', 'exp'];
                  const ia = order.indexOf(a.name);
                  const ib = order.indexOf(b.name);
                  return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
                })
                .map((variable) => {
                  const base = Number(getCurrentValue(variable) ?? 0);
                  const effective = getEffectivePlayerStat(variable.id, variables, items, playtestState);
                  const bonus = effective - base;

                  const isCritChance = variable.name === 'crit_chance';
                  const isCritDamage = variable.name === 'crit_damage';

                  let displayEffective: string;
                  let displayBonus: string | null = null;

                  if (isCritChance) {
                    displayEffective = `${effective}%`;
                    if (bonus !== 0) displayBonus = `+${bonus}%`;
                  } else if (isCritDamage) {
                    displayEffective = `x${effective.toFixed(1)}`;
                    if (bonus !== 0) displayBonus = `+${bonus.toFixed(1)}`;
                  } else {
                    displayEffective = String(Math.round(effective * 100) / 100);
                    if (bonus !== 0) displayBonus = bonus > 0 ? `+${bonus}` : `${bonus}`;
                  }

                  return (
                    <div
                      key={variable.id}
                      className="flex items-center justify-between rounded border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] px-3 py-1.5 text-sm"
                    >
                      <span className="text-[var(--studio-text-secondary)] truncate">
                        {variable.displayName.ru}
                      </span>
                      <div className="flex items-center gap-1.5 font-mono text-[var(--studio-accent)]">
                        {base !== effective && (
                          <span className="text-[var(--studio-text-muted)] line-through text-xs">
                            {base}
                          </span>
                        )}
                        <span className="font-semibold tabular-nums">
                          {displayEffective}
                        </span>
                        {displayBonus && (
                          <span className="text-emerald-400 text-xs">({displayBonus})</span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* === ФЛАГИ / ПЕРЕМЕННЫЕ СЦЕНЫ (custom category) === */}
        {variables.filter(v => v.category === 'custom').length > 0 && (
          <div>
            <div className="text-xs font-medium text-[var(--studio-text-muted)] mb-2 uppercase tracking-wider">
              ФЛАГИ И ПЕРЕМЕННЫЕ СЦЕНЫ
            </div>
            <div className="space-y-1">
              {variables
                .filter(v => v.category === 'custom')
                .map((variable) => {
                  const raw = getCurrentValue(variable);
                  let display: string;
                  if (variable.type === 'boolean') {
                    display = (raw === true || raw === 1) ? 'Да ✓' : 'Нет ✗';
                  } else {
                    display = String(raw ?? variable.defaultValue);
                  }
                  const isActive = variable.type === 'boolean'
                    ? (raw === true || raw === 1)
                    : raw !== variable.defaultValue;

                  return (
                    <div
                      key={variable.id}
                      className={`flex items-center justify-between rounded border px-2.5 py-1.5 text-xs transition-colors ${
                        isActive
                          ? 'border-[var(--studio-accent)]/60 bg-[var(--studio-accent)]/10'
                          : 'border-[var(--studio-border)] bg-[var(--studio-bg-elevated)]'
                      }`}
                    >
                      <span className="text-[var(--studio-text-secondary)] truncate">{variable.displayName.ru}</span>
                      <span className={`font-mono font-semibold ${isActive ? 'text-[var(--studio-accent)]' : 'text-[var(--studio-text-muted)]'}`}>
                        {display}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* (Инвентарь перенесён выше — сразу после блока "В БОЮ") */}
      </div>

      {/* === АВАТАР / ОБЛИК ПЕРСОНАЖА (для TopResourceBar, авто-эволюция) === */}
      <div>
        <div className="text-xs font-medium text-[var(--studio-text-muted)] mb-2 uppercase tracking-wider">
          ОБЛИК ПЕРСОНАЖА
        </div>
        <div className="flex items-center gap-3 rounded border border-[var(--studio-border)] bg-[#161310] p-2">
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[var(--studio-accent)] bg-[#1C1814] text-lg"
            title={`Текущий аватар: ${playtestState.playerAvatar || 'default'}`}
          >
            {(() => {
              const a = playtestState.playerAvatar || 'default';
              if (a === 'wounded') return '🤕';
              if (a === 'veteran') return '🛡️';
              return '🧔';
            })()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-[var(--studio-text-muted)]">Аватар (меняется автоматически)</div>
            <select
              value={playtestState.playerAvatar || 'default'}
              onChange={(e) => {
                useStudioStore.setState((s) => ({
                  playtestState: { ...s.playtestState, playerAvatar: e.target.value },
                }));
              }}
              className="mt-0.5 w-full rounded border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] px-2 py-1 text-xs"
            >
              <option value="default">Обычный (default)</option>
              <option value="wounded">Ранен (wounded)</option>
              <option value="veteran">Ветеран (veteran)</option>
            </select>
          </div>
          <button
            onClick={() => {
              const st = useStudioStore.getState();
              const computed = getCurrentPlayerAvatar(st.variables, st.playtestState);
              useStudioStore.setState((s) => ({
                playtestState: { ...s.playtestState, playerAvatar: computed },
              }));
            }}
            className="text-[10px] px-2 py-1 rounded border border-[var(--studio-border)] hover:bg-[var(--studio-bg-panel)] text-[var(--studio-text-muted)]"
            title="Пересчитать аватар по текущему состоянию (low HP → wounded, уровень+души → veteran)"
          >
            Авто
          </button>
        </div>
        <div className="mt-1 text-[9px] text-[var(--studio-text-muted)]">
          Правила: &lt;30% HP → wounded; ур.≥5 и души≥5 → veteran. Бар обновляет автоматически.
        </div>
      </div>

      {/* Footer hint */}
      <div className="border-t border-[var(--studio-border)] px-4 py-2 text-[10px] text-[var(--studio-text-muted)]">
        Переключай экипировку выше — сразу видно влияние на урон и криты. Кнопки на холсте тоже применяют изменения.
      </div>
    </div>
  );
}
