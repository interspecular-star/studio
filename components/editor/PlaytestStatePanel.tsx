'use client';

import { useStudioStore, type Variable, type Item } from '@/lib/store';
import { RefreshCw } from 'lucide-react';

export default function PlaytestStatePanel() {
  const {
    variables,
    items,
    playtestState,
    resetPlaytestState,
  } = useStudioStore();

  const getCurrentValue = (variable: Variable) => {
    return playtestState.variableValues[variable.id] ?? variable.defaultValue;
  };

  // Get current quantity for an item (via its linked variable)
  const getItemQuantity = (item: Item): number => {
    if (!item.quantityVariableId) return 0;
    const value = playtestState.variableValues[item.quantityVariableId];
    return typeof value === 'number' ? value : 0;
  };

  // Only show items that have a quantity link and have been given at least once
  // or always show all items with their current count
  const inventoryItems = items.filter(item => item.quantityVariableId);

  const handleReset = () => {
    if (confirm('Сбросить все значения Playtest к начальным?')) {
      resetPlaytestState();
    }
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
          Сбросить
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Variables Section */}
        <div>
          <div className="text-xs font-medium text-[var(--studio-text-muted)] mb-2 uppercase tracking-wider">
            Переменные
          </div>

          {variables.length === 0 ? (
            <p className="text-xs text-[var(--studio-text-muted)] italic">
              Нет переменных
            </p>
          ) : (
            <div className="space-y-1.5">
              {variables.map((variable) => {
                const currentValue = getCurrentValue(variable);
                return (
                  <div
                    key={variable.id}
                    className="flex items-center justify-between rounded border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] px-3 py-2 text-sm"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium truncate">
                        {variable.displayName.ru}
                      </span>
                      <span className="text-[10px] text-[var(--studio-text-muted)] font-mono truncate">
                        {variable.name}
                      </span>
                    </div>
                    <span className="font-mono text-[var(--studio-accent)] ml-2 shrink-0">
                      {String(currentValue)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Inventory Section */}
        <div>
          <div className="text-xs font-medium text-[var(--studio-text-muted)] mb-2 uppercase tracking-wider">
            Инвентарь
          </div>

          {inventoryItems.length === 0 ? (
            <p className="text-xs text-[var(--studio-text-muted)] italic">
              Нет предметов в проекте
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
          )}
        </div>
      </div>

      {/* Footer hint */}
      <div className="border-t border-[var(--studio-border)] px-4 py-2 text-[10px] text-[var(--studio-text-muted)]">
        Значения меняются при нажатии на кнопки на холсте
      </div>
    </div>
  );
}
