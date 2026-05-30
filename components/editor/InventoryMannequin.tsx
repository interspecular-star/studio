'use client';

import { EquipmentSlot, EquipmentSlotLabels, AccessoryRowSlots } from '@/lib/store';
import { useStudioStore, type Item } from '@/lib/store';

interface InventoryMannequinProps {
  equippedItemIds: string[];
  onEquip?: (itemId: string, slot: EquipmentSlot) => void;
  onUnequip?: (itemId: string, slot: EquipmentSlot) => void;
  onSlotClick?: (slot: EquipmentSlot) => void;
}

/**
 * Визуальный манекен для модального инвентаря (Paper Doll).
 *
 * Итоговая расстановка (по последним уточнениям пользователя):
 *
 * Основной манекен (сверху вниз):
 *   - Шлем
 *   - Перчатки (слева) + Тело (центр)
 *   - Пояс
 *   - Ноги
 *   - Ботинки
 *
 * Внизу — горизонтальная полоса аксессуаров (в ряд):
 *   Амулет → Кольцо → Кольцо → Кольцо → Кольцо → Плащ → Миньон
 *
 * Миньон отображается приглушённым (эффект заблокированного слота).
 */
export default function InventoryMannequin({
  equippedItemIds,
  onSlotClick,
}: InventoryMannequinProps) {
  const { items, isItemEquipped } = useStudioStore();

  const getEquippedItemForSlot = (slot: EquipmentSlot): Item | undefined => {
    return items.find(
      (item) => item.slot === slot && equippedItemIds.includes(item.id)
    );
  };

  const renderSlot = (slot: EquipmentSlot, isBlocked = false, index?: number) => {
    const equippedItem = getEquippedItemForSlot(slot);
    const isOccupied = !!equippedItem;

    const baseClasses = `
      flex flex-col items-center justify-center 
      w-20 h-16 rounded-xl border text-xs transition-all
      cursor-pointer select-none
    `;

    let stateClasses = '';

    if (isBlocked) {
      // Стиль для заблокированного слота (Миньон)
      stateClasses = `
        border-amber-900/40 bg-[#161310] 
        text-amber-900/50 hover:bg-[#161310]
      `;
    } else if (isOccupied) {
      stateClasses = `
        border-[var(--studio-accent)] bg-[#2A251F] 
        text-[var(--studio-accent)] hover:border-[var(--studio-accent-hover)]
      `;
    } else {
      stateClasses = `
        border-[var(--studio-border)] bg-[#161310] 
        text-[var(--studio-text-muted)] hover:border-[var(--studio-accent)] hover:text-[var(--studio-text-secondary)]
      `;
    }

    // Генерируем уникальный key, особенно важно для повторяющихся слотов (например, ring)
    const uniqueKey = index !== undefined ? `${slot}-${index}` : slot;

    return (
      <div
        key={uniqueKey}
        onClick={() => onSlotClick?.(slot)}
        className={`${baseClasses} ${stateClasses}`}
        title={equippedItem ? equippedItem.name.ru : EquipmentSlotLabels[slot]}
      >
        <div className="font-medium text-[10px] mb-0.5">
          {EquipmentSlotLabels[slot]}
        </div>
        <div className="text-[10px] truncate max-w-[68px] text-center">
          {equippedItem ? equippedItem.name.ru : '—'}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* === ОСНОВНОЙ МАНЕКЕН (вертикально) === */}
      <div className="flex flex-col items-center gap-2">
        {/* Шлем */}
        <div>{renderSlot('helmet')}</div>

        {/* Перчатки + Тело (рядом) */}
        <div className="flex items-center gap-4">
          {renderSlot('gloves')}
          {renderSlot('chest')}
        </div>

        {/* Пояс — между телом и ногами */}
        <div>{renderSlot('belt')}</div>

        {/* Ноги */}
        <div>{renderSlot('legs')}</div>

        {/* Ботинки */}
        <div>{renderSlot('boots')}</div>
      </div>

      {/* === ГОРИЗОНТАЛЬНАЯ ПОЛОСА АКСЕССУАРОВ (внизу) === */}
      <div className="w-full pt-4 border-t border-[var(--studio-border)]">
        <div className="text-xs text-[var(--studio-text-muted)] mb-2 text-center">
          Аксессуары
        </div>

        <div className="flex justify-center gap-3 flex-wrap">
          {AccessoryRowSlots.map((slot, index) => {
            const isMinion = slot === 'minion';
            return renderSlot(slot, isMinion, index);
          })}
        </div>
      </div>
    </div>
  );
}
