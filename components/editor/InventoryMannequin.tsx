'use client';

import { EquipmentSlot, EquipmentSlotLabels, AccessoryRowSlots, BeltRowSlots, RarityColors } from '@/lib/store';
import { useStudioStore, type Item } from '@/lib/store';

interface InventoryMannequinProps {
  equippedItemIds: string[];
  onEquip?: (itemId: string, slot: EquipmentSlot) => void;
  onUnequip?: (itemId: string, slot: EquipmentSlot) => void;
  onSlotClick?: (slot: EquipmentSlot) => void;
  // Новый колбэк: клик по занятому слоту → снять предмет
  onUnequipFromSlot?: (slot: EquipmentSlot) => void;
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
  onUnequipFromSlot,
}: InventoryMannequinProps) {
  const { items } = useStudioStore();

  // Получаем все экипированные предметы
  const equippedItems = items.filter((item) => equippedItemIds.includes(item.id));

  // Получаем предмет, экипированный в конкретный слот (приоритет — equippedSlots)
  const getEquippedItemForSlot = (slot: EquipmentSlot, index?: number): Item | undefined => {
    const ps = useStudioStore.getState().playtestState;

    // Приоритет — новая модель equippedSlots
    const assignedItemId = ps.equippedSlots?.[slot];
    if (assignedItemId) {
      return items.find(i => i.id === assignedItemId);
    }

    // Для двуручного: если оно в правой руке, показываем его и в левой
    const rightId = ps.equippedSlots?.['weapon_right'];
    if (rightId) {
      const rightItem = items.find(i => i.id === rightId);
      if (rightItem?.slot === 'two_handed_weapon' && slot === 'weapon_left') {
        return rightItem;
      }
    }

    const candidates = equippedItems.filter((item) => item.slot === slot);
    if (candidates.length === 0) return undefined;

    if (slot === 'ring' && index !== undefined) {
      return candidates[index] ?? candidates[candidates.length - 1];
    }

    return candidates[0];
  };

  const renderSlot = (slot: EquipmentSlot, isBlocked = false, index?: number, size: number = 62) => {
    const equippedItem = getEquippedItemForSlot(slot, index);
    const isOccupied = !!equippedItem;

    const baseClasses = `
      flex flex-col items-center justify-center 
      rounded-xl border text-[10px] transition-all
      cursor-pointer select-none overflow-hidden
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
        bg-[#2A251F] 
        text-[var(--studio-accent)] hover:brightness-110
      `;
    } else {
      stateClasses = `
        border-[var(--studio-border)] bg-[#161310] 
        text-[var(--studio-text-muted)] hover:border-[var(--studio-accent)] hover:text-[var(--studio-text-secondary)]
      `;
    }

    const uniqueKey = index !== undefined ? `${slot}-${index}` : slot;

    const handleClick = () => {
      if (isOccupied && equippedItem && onUnequipFromSlot) {
        onUnequipFromSlot(slot);
      } else {
        onSlotClick?.(slot);
      }
    };

    return (
      <div
        key={uniqueKey}
        onClick={handleClick}
        className={`${baseClasses} ${stateClasses}`}
        style={{ 
          width: `${size}px`, 
          height: `${size}px`,
          borderColor: isOccupied && equippedItem ? RarityColors[equippedItem.rarity] : undefined,
          borderWidth: isOccupied ? '2px' : '1px'
        }}
        title={equippedItem ? equippedItem.name.ru : EquipmentSlotLabels[slot]}
      >
        {isOccupied && equippedItem ? (
          <>
            {/* Цветная полоска редкости сверху */}
            <div 
              className="w-full h-[3px] -mt-1 mb-1 rounded-full"
              style={{ backgroundColor: RarityColors[equippedItem.rarity] }}
            />
            <div className="text-[9px] opacity-70 leading-none mb-0.5">
              {EquipmentSlotLabels[slot]}
            </div>
            <div className="font-medium text-center leading-tight px-1 line-clamp-2 text-[10px]">
              {equippedItem.name.ru}
              {equippedItem.slot === 'two_handed_weapon' && (
                <div className="text-[8px] text-amber-400 mt-0.5">(двуручное)</div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="font-medium text-[10px] mb-0.5">
              {EquipmentSlotLabels[slot]}
            </div>
            <div className="text-[10px] text-center opacity-60">—</div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Шлем */}
      <div>{renderSlot('helmet', false, undefined, 58)}</div>

      {/* Руки + Тело */}
      <div className="flex items-center justify-center gap-3">
        {/* Правая рука (слева от тела) */}
        <div>{renderSlot('weapon_right', false, undefined, 58)}</div>

        {/* Тело */}
        <div>{renderSlot('chest', false, undefined, 72)}</div>

        {/* Левая рука (справа от тела) — оружие или щит */}
        <div>{renderSlot('weapon_left', false, undefined, 58)}</div>
      </div>

      {/* Пояс + Перчатки в одном ряду */}
      <div className="flex items-center justify-center gap-3">
        {BeltRowSlots.map((slot: EquipmentSlot) => renderSlot(slot, false, undefined, 52))}
      </div>

      {/* Ноги */}
      <div>{renderSlot('legs', false, undefined, 58)}</div>

      {/* Ботинки */}
      <div>{renderSlot('boots', false, undefined, 58)}</div>

      {/* === ГОРИЗОНТАЛЬНАЯ ПОЛОСА АКСЕССУАРОВ (внизу) === */}
      <div className="w-full pt-2 border-t border-[var(--studio-border)]">
        <div className="flex justify-center gap-1.5 flex-wrap">
          {AccessoryRowSlots.map((slot, index) => {
            const isMinion = slot === 'minion';
            return renderSlot(slot, isMinion, index, 50);
          })}
        </div>
      </div>
    </div>
  );
}
