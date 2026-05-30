'use client';

import { useState } from 'react';
import { useStudioStore, type Variable, type Item, EquipmentSlotLabels } from '@/lib/store';
import {
  getEffectivePlayerStat,
  getTotalDamage,
  getEffectiveCritChance,
  getEffectiveCritDamage,
  getEquippedWeaponName,
  getEquippedWeaponDamage,
  getEquippedItems,
} from '@/lib/store';
import { RefreshCw, Sword, Shield } from 'lucide-react';

export default function PlaytestStatePanel() {
  const {
    variables,
    items,
    playtestState,
    resetPlaytestState,
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

  // === Combat preview calculations (the main visual feedback) ===
  const effectiveStrength = getEffectivePlayerStat('strength', variables, items, playtestState);
  const strengthVar = variables.find(v => v.name === 'strength');
  const baseStrength = strengthVar ? Number(getCurrentValue(strengthVar) ?? 0) : 0;

  const totalDamage = getTotalDamage(variables, items, playtestState);
  const weaponDamage = getEquippedWeaponDamage(items, playtestState);
  const equippedWeaponName = getEquippedWeaponName(items, playtestState);

  const effectiveCritChance = getEffectiveCritChance(variables, items, playtestState);
  const baseCritChanceVar = variables.find(v => v.name === 'crit_chance');
  const baseCritChance = baseCritChanceVar ? Number(getCurrentValue(baseCritChanceVar) ?? 5) : 5;

  const effectiveCritDamage = getEffectiveCritDamage(variables, items, playtestState);
  const baseCritDamageVar = variables.find(v => v.name === 'crit_damage');
  const baseCritDamage = baseCritDamageVar ? Number(getCurrentValue(baseCritDamageVar) ?? 1.5) : 1.5;

  const equippedItems = getEquippedItems(items, playtestState.equippedItemIds);
  const equippableItems = items.filter(i => i.isEquippable);

  const handleReset = () => {
    if (confirm('Сбросить все значения Playtest к начальным?')) {
      resetPlaytestState();
    }
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
      },
    }));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-[var(--studio-border)] px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--studio-text-secondary)]">
          ТЕКУЩЕЕ СОСТОЯНИЕ
        </span>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 text-xs px-2 py-1 rounded border border-[var(--studio-border)] hover:bg-[var(--studio-bg-elevated)] text-[var(--studio-text-secondary)]"
          title="Сбросить все значения Playtest"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Сбросить всё
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* =========================================================
           ВИЗУАЛЬНЫЙ ФИДБЭК — САМОЕ ВАЖНОЕ ДЛЯ PLAYTEST
           ========================================================= */}
        <div className="rounded-lg border border-[var(--studio-accent)]/40 bg-[#1C1814] p-3">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--studio-accent)]">
              <Sword className="h-4 w-4" />
              В БОЮ — ИТОГОВЫЕ ХАРАКТЕРИСТИКИ
            </div>
            <button
              onClick={handleResetEquipment}
              className="text-[10px] px-2 py-0.5 rounded border border-[var(--studio-border)] hover:bg-[var(--studio-bg-panel)] text-[var(--studio-text-muted)]"
              title="Снять всю экипировку"
            >
              Сбросить экипировку
            </button>
          </div>

          {/* Main combat numbers — big visual feedback */}
          <div className="space-y-2">
            {/* Strength + bonuses */}
            <div className="flex items-baseline justify-between rounded bg-[#161310] px-3 py-2">
              <div>
                <div className="text-xs text-[var(--studio-text-muted)]">СИЛА ГГ</div>
                <div className="text-[10px] text-[var(--studio-text-muted)] mt-0.5">
                  База {baseStrength} {effectiveStrength !== baseStrength && `+ ${Number(effectiveStrength - baseStrength)} от предметов`}
                </div>
              </div>
              <div className="font-mono text-2xl font-semibold text-[var(--studio-accent)] tabular-nums">
                {effectiveStrength}
              </div>
            </div>

            {/* Weapon + total damage — the key number user asked for */}
            <div className="flex items-baseline justify-between rounded bg-[#161310] px-3 py-2 border border-[var(--studio-accent)]/30">
              <div>
                <div className="text-xs text-[var(--studio-text-muted)] flex items-center gap-1.5">
                  <span>ОРУЖИЕ</span>
                  {equippedWeaponName && <span className="text-[var(--studio-accent)]">• {equippedWeaponName}</span>}
                </div>
                <div className="text-[10px] text-[var(--studio-text-muted)] mt-0.5">
                  {weaponDamage > 0 ? `+${weaponDamage} урона оружия` : 'Нет экипированного оружия'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-[var(--studio-text-muted)]">ИТОГОВЫЙ УРОН</div>
                <div className="font-mono text-3xl font-bold text-[#E8D4A0] tabular-nums leading-none mt-0.5">
                  {totalDamage}
                </div>
              </div>
            </div>

            {/* Crit stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded bg-[#161310] px-3 py-2">
                <div className="text-xs text-[var(--studio-text-muted)]">ШАНС КРИТА</div>
                <div className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="font-mono text-xl font-semibold text-[var(--studio-accent)] tabular-nums">
                    {effectiveCritChance}
                  </span>
                  <span className="text-xs text-[var(--studio-text-muted)]">%</span>
                  {effectiveCritChance !== baseCritChance && (
                    <span className="text-[10px] text-emerald-400">(+{Number(effectiveCritChance - baseCritChance)})</span>
                  )}
                </div>
              </div>

              <div className="rounded bg-[#161310] px-3 py-2">
                <div className="text-xs text-[var(--studio-text-muted)]">СИЛА КРИТА</div>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span className="font-mono text-xl font-semibold text-[var(--studio-accent)] tabular-nums">
                    x{effectiveCritDamage.toFixed(1)}
                  </span>
                  {effectiveCritDamage !== baseCritDamage && (
                    <span className="text-[10px] text-emerald-400">(+{(effectiveCritDamage - baseCritDamage).toFixed(1)})</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2 text-[10px] text-[var(--studio-text-muted)]">
            Сила — всегда база. Урон оружия суммируется. Бонусы от экипированных предметов применяются автоматически.
          </div>
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
                  const order = ['health', 'health_max', 'mana', 'mana_max', 'strength', 'agility', 'endurance', 'defense', 'souls', 'crit_chance', 'crit_damage', 'level', 'exp'];
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

        {/* (Инвентарь перенесён выше — сразу после блока "В БОЮ") */}
      </div>

      {/* Footer hint */}
      <div className="border-t border-[var(--studio-border)] px-4 py-2 text-[10px] text-[var(--studio-text-muted)]">
        Переключай экипировку выше — сразу видно влияние на урон и криты. Кнопки на холсте тоже применяют изменения.
      </div>
    </div>
  );
}
