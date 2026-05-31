'use client';

import { useState } from 'react';
import {
  useStudioStore,
  type EquipmentSlot,
  type Item,
  EquipmentSlotLabels,
  getEffectivePlayerStat,
  getAllEquippedItemIds,
  getTotalDamage,
} from '@/lib/store';
import InventoryMannequin from './InventoryMannequin';
import { X } from 'lucide-react';
import { toast } from 'sonner';

interface InventoryModalProps {
  onClose: () => void;
}

/**
 * Модальное окно инвентаря (Playtest)
 * 
 * Структура:
 * - Левая часть: Манекен с слотами (оружие, броня, аксессуар)
 * - Правая часть: Сетка инвентаря (динамический размер = Выносливость, 1:1, без базовых +10)
 */
export default function InventoryModal({ onClose }: InventoryModalProps) {
  const { 
    closeInventory, 
    playtestState,
    getPlayerInventory,
    equipItem,
    unequipItem,
    items,
    variables,
  } = useStudioStore();

  const handleClose = () => {
    closeInventory();
    onClose?.();
  };

  const playerInventory = getPlayerInventory();

  // === Красивая вложенная модалка подтверждений (замена, двуруч, выбор руки) ===
  // Никогда не используем window.confirm в инвентаре.
  type PendingConfirmation =
    | {
        kind: 'replace';
        newItem: Item;
        targetSlot: EquipmentSlot;
        currentItem: Item;
        message: string;
      }
    | {
        kind: 'twoHanded';
        newItem: Item;
        displaced: Item[];
        message: string;
      }
    | {
        kind: 'chooseHand';
        newItem: Item;
        message: string;
      };

  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);

  // Фильтруем инвентарь: показываем только то, что реально в рюкзаке (не экипировано)
  const backpackItems = playerInventory
    .map(({ item, quantity }) => {
      // Считаем, сколько экземпляров этого предмета сейчас экипировано
      const equippedCount = Object.values(playtestState.equippedSlots || {}).filter(
        (id) => id === item.id
      ).length;

      const available = Math.max(0, quantity - equippedCount);
      return { item, quantity: available };
    })
    .filter(({ quantity }) => quantity > 0);

  // === Динамический размер рюкзака ===
  // Формула (строго по твоему указанию):
  // Размер рюкзака = текущая Выносливость (1 к 1)
  // Никакого базового "+10" не добавляется.
  //
  // Защита: если Выносливость упадёт, но слоты заняты — 
  // количество ячеек не уменьшится ниже текущего числа предметов в рюкзаке.
  let enduranceValue = 0;
  try {
    enduranceValue = Math.floor(getEffectivePlayerStat('endurance', variables, items, playtestState) || 0);
  } catch (e) {
    enduranceValue = 0;
  }

  const calculatedBackpackSize = enduranceValue;   // ← только Выносливость, без +10

  // Реальное количество отображаемых слотов (с защитой от потери вещей)
  const backpackSize = Math.max(calculatedBackpackSize, backpackItems.length);

  // === Обработчики экипировки / снятия ===

  const handleUnequipFromSlot = (slot: EquipmentSlot) => {
    // Используем новую модель equippedSlots
    const equippedId = playtestState.equippedSlots?.[slot];

    if (equippedId) {
      const item = items.find(i => i.id === equippedId);
      unequipItem(equippedId);
      if (item) {
        toast.info(`${item.name.ru} снят`);
      }
    }
  };

  // === Вспомогательные функции (работают с новой моделью equippedSlots) ===

  const isSlotOccupied = (slot: EquipmentSlot): boolean => {
    return !!playtestState.equippedSlots?.[slot];
  };

  const getEquippedItemInSlot = (slot: EquipmentSlot) => {
    const itemId = playtestState.equippedSlots?.[slot];
    if (!itemId) return null;
    return items.find(i => i.id === itemId) || null;
  };

  // Получить все предметы, которые будут сняты при одевании двуруча
  const getDisplacedItemsForTwoHanded = () => {
    const displaced: Item[] = [];
    const right = getEquippedItemInSlot('weapon_right');
    const left = getEquippedItemInSlot('weapon_left');
    if (right) displaced.push(right);
    if (left) displaced.push(left);
    return displaced;
  };

  /**
   * Реальный расчёт дельт характеристик.
   * Создаёт симулированное состояние слотов (как будто уже экипировали/сняли)
   * и считает before/after для всех важных статов + итогового урона.
   */
  const computeEquipConfirmationMessage = (
    newItem: Item,
    targetSlots: EquipmentSlot[],
    itemsToRemove: Item[]
  ): string => {
    const removeIds = itemsToRemove.map((i) => i.id);

    // Клонируем текущие слоты и применяем изменения
    const simulatedSlots: Partial<Record<EquipmentSlot, string>> = {
      ...(playtestState.equippedSlots || {}),
    };
    removeIds.forEach((id) => {
      Object.keys(simulatedSlots).forEach((key) => {
        if (simulatedSlots[key as EquipmentSlot] === id) {
          delete simulatedSlots[key as EquipmentSlot];
        }
      });
    });
    targetSlots.forEach((slot) => {
      simulatedSlots[slot] = newItem.id;
    });

    const simulatedState = {
      ...playtestState,
      equippedSlots: simulatedSlots,
      equippedItemIds: getAllEquippedItemIds({
        ...playtestState,
        equippedSlots: simulatedSlots,
      } as any),
    };

    // Статистика, которую показываем пользователю
    const statsToShow: Array<{
      key: string;
      label: string;
      isPercent?: boolean;
      isMultiplier?: boolean;
    }> = [
      { key: 'strength', label: 'Сила' },
      { key: 'agility', label: 'Ловкость' },
      { key: 'endurance', label: 'Выносливость' },
      { key: 'defense', label: 'Защита' },
      { key: 'crit_chance', label: 'Шанс крита', isPercent: true },
      { key: 'crit_damage', label: 'Сила крита', isMultiplier: true },
    ];

    const lines: string[] = [];

    statsToShow.forEach(({ key, label, isPercent, isMultiplier }) => {
      try {
        const before = getEffectivePlayerStat(key, variables, items, playtestState);
        const after = getEffectivePlayerStat(key, variables, items, simulatedState as any);
        const delta = after - before;
        if (Math.abs(delta) > 0.0005) {
          const sign = delta > 0 ? '+' : '';
          let deltaStr = `${sign}${delta}`;
          if (isPercent) deltaStr = `${sign}${delta}%`;
          if (isMultiplier) deltaStr = `${sign}${delta.toFixed(1)}`;
          lines.push(`${label}: ${before} → ${after} (${deltaStr})`);
        }
      } catch {}
    });

    // Итоговый урон (сила + всё weaponDamage)
    try {
      const dmgBefore = getTotalDamage(variables, items, playtestState);
      const dmgAfter = getTotalDamage(variables, items, simulatedState as any);
      const dDelta = dmgAfter - dmgBefore;
      if (Math.abs(dDelta) > 0.0005) {
        const sign = dDelta > 0 ? '+' : '';
        lines.push(`Итоговый урон: ${dmgBefore} → ${dmgAfter} (${sign}${dDelta})`);
      }
    } catch {}

    // Заголовок
    let header = `Одеть «${newItem.name.ru}»?`;
    if (itemsToRemove.length > 0) {
      const names = itemsToRemove.map((i) => i.name.ru).join(' + ');
      header = `Будет снято: ${names}\n\nОдеть «${newItem.name.ru}»?`;
    }

    const body = lines.length > 0 ? '\n\n' + lines.join('\n') : '\n\nХарактеристики не изменятся.';
    return header + body + '\n\nПродолжить?';
  };

  // === Главный обработчик экипировки (теперь без window.confirm) ===
  const handleEquipItem = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item || !item.isEquippable || !item.slot) {
      toast.error('Этот предмет нельзя экипировать');
      return;
    }

    // === Одноручное оружие — сложный случай с выбором руки ===
    if (item.slot === 'one_handed_weapon') {
      const rightFree = !isSlotOccupied('weapon_right');
      const leftFree = !isSlotOccupied('weapon_left');

      if (!rightFree && !leftFree) {
        toast.error('Обе руки заняты. Чтобы надеть одноручное оружие, сначала снимите что-то с одной из рук.');
        return;
      }

      // Оба слота свободны — спрашиваем пользователя явно (через красивую модалку)
      if (rightFree && leftFree) {
        setPendingConfirmation({
          kind: 'chooseHand',
          newItem: item,
          message: `В какую руку одеть «${item.name.ru}»?\n\nВыберите руку ниже.`,
        });
        return;
      }

      // Только одна рука свободна — сразу целимся в неё
      const chosenHand: EquipmentSlot = rightFree ? 'weapon_right' : 'weapon_left';

      if (isSlotOccupied(chosenHand)) {
        const current = getEquippedItemInSlot(chosenHand)!;
        const msg = computeEquipConfirmationMessage(item, [chosenHand], [current]);
        setPendingConfirmation({
          kind: 'replace',
          newItem: item,
          targetSlot: chosenHand,
          currentItem: current,
          message: msg,
        });
        return;
      }

      // Свободно — экипируем сразу без вопросов
      equipItem(itemId, chosenHand);
      toast.success(`${item.name.ru} экипирован (${EquipmentSlotLabels[chosenHand]})`);
      return;
    }

    // === Двуручное оружие ===
    if (item.slot === 'two_handed_weapon') {
      const displaced = getDisplacedItemsForTwoHanded();

      if (displaced.length > 0) {
        const msg = computeEquipConfirmationMessage(item, ['weapon_right', 'weapon_left'], displaced);
        setPendingConfirmation({
          kind: 'twoHanded',
          newItem: item,
          displaced,
          message: msg,
        });
        return;
      }

      // Ничего не снимаем — сразу надеваем на обе руки
      equipItem(itemId, 'weapon_right');
      equipItem(itemId, 'weapon_left');
      toast.success(`${item.name.ru} экипировано (Двуручное)`);
      return;
    }

    // === Щит ===
    if (item.slot === 'shield') {
      if (isSlotOccupied('weapon_left') || isSlotOccupied('shield')) {
        toast.warning('Левая рука уже занята.');
        return;
      }
      equipItem(itemId, 'weapon_left');
      toast.success(`${item.name.ru} экипирован (Левая рука)`);
      return;
    }

    // === Обычные слоты (броня, аксессуары, пояс, плащ и т.д.) ===
    if (isSlotOccupied(item.slot)) {
      const current = getEquippedItemInSlot(item.slot)!;
      const msg = computeEquipConfirmationMessage(item, [item.slot], [current]);
      setPendingConfirmation({
        kind: 'replace',
        newItem: item,
        targetSlot: item.slot,
        currentItem: current,
        message: msg,
      });
      return;
    }

    // Свободный слот — сразу
    equipItem(itemId, item.slot);
    toast.success(`${item.name.ru} экипирован`);
  };

  // Размер рюкзака теперь полностью динамический от Выносливости (см. backpackSize ниже)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70">
      <div 
        className="w-[920px] max-w-[95vw] rounded-2xl border border-[var(--studio-border)] bg-[#1C1814] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--studio-border)] bg-[#161310] px-6 py-4">
          <div>
            <span className="text-lg font-semibold tracking-tight">Инвентарь</span>
            <span className="ml-3 text-xs text-[var(--studio-text-muted)]">
              Рюкзак: {backpackSize} слотов (Выносливость: {enduranceValue})
            </span>
          </div>
          <button 
            onClick={handleClose}
            className="rounded p-1 hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex h-[555px]">
          {/* === МАНЕКЕН (левая колонка) === */}
          <div className="w-[340px] border-r border-[var(--studio-border)] p-5 flex flex-col">
            <div className="mb-2 text-sm font-medium text-[var(--studio-text-secondary)]">
              ЭКИПИРОВКА
            </div>

            <div className="flex-1 flex items-start justify-center overflow-hidden">
              <InventoryMannequin
                equippedItemIds={getAllEquippedItemIds(playtestState)}
                onUnequipFromSlot={handleUnequipFromSlot}
                onSlotClick={(slot) => {
                  // Можно будет открыть выбор предмета для этого слота
                }}
              />
            </div>
          </div>

          {/* === СЕТКА ИНВЕНТАРЯ === */}
          <div className="flex-1 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm font-medium text-[var(--studio-text-secondary)]">
                РЮКЗАК
              </div>
              <div className="text-xs text-[var(--studio-text-muted)]">
                {backpackItems.length} / {backpackSize}
              </div>
            </div>

            {/* Сетка инвентаря (только то, что в рюкзаке) */}
            <div className="grid grid-cols-5 gap-2.5">
              {/* Реальные предметы в рюкзаке */}
              {backpackItems.map(({ item, quantity }) => {
                const canEquip = item.isEquippable && item.slot;
                return (
                  <div 
                    key={item.id}
                    onClick={() => handleEquipItem(item.id)}
                    className={`aspect-square w-full max-w-[62px] rounded-xl border flex flex-col items-center justify-center text-[10px] transition-all mx-auto p-1 ${
                      canEquip 
                        ? 'border-[var(--studio-border)] bg-[#161310] hover:border-[var(--studio-accent)] hover:bg-[#2A251F] cursor-pointer active:scale-[0.98]' 
                        : 'border-[var(--studio-border)] bg-[#161310] opacity-50 cursor-not-allowed'
                    }`}
                    title={canEquip ? `Экипировать: ${item.name.ru}` : `${item.name.ru} (нельзя экипировать)`}
                  >
                    <div className="font-medium text-center leading-tight truncate w-full">
                      {item.name.ru}
                    </div>
                    <div className="text-[var(--studio-accent)] font-mono mt-0.5">
                      {quantity}
                    </div>
                  </div>
                );
              })}

              {/* Пустые ячейки (ровно до backpackSize, с защитой от потери предметов при падении Выносливости) */}
              {Array.from({ length: Math.max(0, backpackSize - backpackItems.length) }).map((_, index) => (
                <div 
                  key={`empty-${index}`}
                  className="aspect-square w-full max-w-[62px] rounded-xl border border-[var(--studio-border)] bg-[#161310] flex items-center justify-center text-[var(--studio-text-muted)] hover:border-[var(--studio-accent)] transition-colors cursor-pointer mx-auto"
                >
                  <div className="text-[10px] opacity-20">—</div>
                </div>
              ))}
            </div>

            {playerInventory.length === 0 && (
              <div className="mt-6 text-center text-xs text-[var(--studio-text-muted)]">
                Инвентарь пуст.<br />
                Добавь предметы через блок «ИНВЕНТАРЬ» в редакторе или используй действие giveItem.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--studio-border)] bg-[#161310] px-6 py-3 text-right">
          <button 
            onClick={handleClose}
            className="rounded-md bg-[var(--studio-accent)] px-4 py-1.5 text-sm font-medium text-[#1C1814] hover:bg-[var(--studio-accent-hover)]"
          >
            Закрыть
          </button>
        </div>

        {/* === Вложенная модалка подтверждений (z-[110]) — реальные дельты + без window.confirm === */}
        {pendingConfirmation && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-[110]">
            <div className="bg-[#1C1814] border border-[var(--studio-border)] rounded-xl p-6 w-[440px] max-w-[92%]">
              <div className="text-lg font-semibold mb-3">
                {pendingConfirmation.kind === 'chooseHand' ? 'Выбор руки' : 'Подтверждение экипировки'}
              </div>

              <div className="text-sm whitespace-pre-line mb-5 text-[var(--studio-text-secondary)] leading-snug">
                {pendingConfirmation.message}
              </div>

              {/* === Кнопки в зависимости от типа подтверждения === */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setPendingConfirmation(null)}
                  className="px-4 py-2 rounded border border-[var(--studio-border)] hover:bg-[#2A251F]"
                >
                  Отмена
                </button>

                {/* Выбор руки для одноручного — две большие кнопки */}
                {pendingConfirmation.kind === 'chooseHand' && (
                  <>
                    <button
                      onClick={() => {
                        const item = pendingConfirmation.newItem;
                        const hand: EquipmentSlot = 'weapon_right';

                        // Если правая занята — идём в нормальный flow замены
                        if (isSlotOccupied(hand)) {
                          const current = getEquippedItemInSlot(hand)!;
                          const msg = computeEquipConfirmationMessage(item, [hand], [current]);
                          setPendingConfirmation({
                            kind: 'replace',
                            newItem: item,
                            targetSlot: hand,
                            currentItem: current,
                            message: msg,
                          });
                        } else {
                          equipItem(item.id, hand);
                          toast.success(`${item.name.ru} экипирован (Правая рука)`);
                          setPendingConfirmation(null);
                        }
                      }}
                      className="px-4 py-2 rounded bg-[var(--studio-accent)] text-[#1C1814] font-medium hover:bg-[var(--studio-accent-hover)]"
                    >
                      Правая рука
                    </button>
                    <button
                      onClick={() => {
                        const item = pendingConfirmation.newItem;
                        const hand: EquipmentSlot = 'weapon_left';

                        if (isSlotOccupied(hand)) {
                          const current = getEquippedItemInSlot(hand)!;
                          const msg = computeEquipConfirmationMessage(item, [hand], [current]);
                          setPendingConfirmation({
                            kind: 'replace',
                            newItem: item,
                            targetSlot: hand,
                            currentItem: current,
                            message: msg,
                          });
                        } else {
                          equipItem(item.id, hand);
                          toast.success(`${item.name.ru} экипирован (Левая рука)`);
                          setPendingConfirmation(null);
                        }
                      }}
                      className="px-4 py-2 rounded border border-[var(--studio-border)] hover:bg-[#2A251F]"
                    >
                      Левая рука
                    </button>
                  </>
                )}

                {/* Обычная замена одного предмета */}
                {pendingConfirmation.kind === 'replace' && (
                  <button
                    onClick={() => {
                      const { newItem, targetSlot, currentItem } = pendingConfirmation;
                      if (currentItem) unequipItem(currentItem.id);
                      equipItem(newItem.id, targetSlot);
                      toast.success(`${newItem.name.ru} экипирован`);
                      setPendingConfirmation(null);
                    }}
                    className="px-4 py-2 rounded bg-[var(--studio-accent)] text-[#1C1814] font-medium hover:bg-[var(--studio-accent-hover)]"
                  >
                    Заменить
                  </button>
                )}

                {/* Двуручное — снимаем несколько + надеваем */}
                {pendingConfirmation.kind === 'twoHanded' && (
                  <button
                    onClick={() => {
                      const { newItem, displaced } = pendingConfirmation;
                      displaced.forEach((i) => unequipItem(i.id));
                      equipItem(newItem.id, 'weapon_right');
                      equipItem(newItem.id, 'weapon_left');
                      toast.success(`${newItem.name.ru} экипировано (Двуручное)`);
                      setPendingConfirmation(null);
                    }}
                    className="px-4 py-2 rounded bg-[var(--studio-accent)] text-[#1C1814] font-medium hover:bg-[var(--studio-accent-hover)]"
                  >
                    Одеть двуручное
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
