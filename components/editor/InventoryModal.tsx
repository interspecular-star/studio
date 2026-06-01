'use client';

import { useState } from 'react';
import {
  useStudioStore,
  type EquipmentSlot,
  type Item,
  type ItemType,
  type ItemRarity,
  EquipmentSlotLabels,
  RarityFilterOrder,
  ItemTypeLabels,
  RarityFilterLabels,
  RarityColors,
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
    dropItem,
    useItem,
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

  // === Контекстное меню и модалки для предметов в рюкзаке ===
  const [contextMenu, setContextMenu] = useState<{
    item: Item;
    quantity: number;
    x: number;
    y: number;
  } | null>(null);

  const [viewingItem, setViewingItem] = useState<{
    item: Item;
    quantity: number;
  } | null>(null);

  const [pendingDrop, setPendingDrop] = useState<{
    item: Item;
    maxQuantity: number;
  } | null>(null);
  const [dropAmount, setDropAmount] = useState(1);

  // === Drag & Drop state ===
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  // === Фильтры рюкзака ===
  const [filterType, setFilterType] = useState<'all' | ItemType>('all');
  const [filterRarity, setFilterRarity] = useState<'all' | ItemRarity>('all');

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

  // Фильтруем по типу и редкости (если выбраны)
  const filteredBackpackItems = backpackItems.filter(({ item }) => {
    const typeMatch = filterType === 'all' || item.type === filterType;
    const rarityMatch = filterRarity === 'all' || item.rarity === filterRarity;
    return typeMatch && rarityMatch;
  });

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
  // preferredSlot — опционально. Используется при прямом дропе на конкретный слот манекена
  // (например, чтобы одноручное оружие сразу шло в выбранную руку без модалки выбора).
  const handleEquipItem = (itemId: string, preferredSlot?: EquipmentSlot) => {
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

      // Если при дропе явно указали руку — стараемся использовать именно её
      let chosenHand: EquipmentSlot | null = null;

      if (preferredSlot === 'weapon_right' || preferredSlot === 'weapon_left') {
        if (!isSlotOccupied(preferredSlot)) {
          chosenHand = preferredSlot;
        } else {
          // Указанная рука занята — показываем замену именно на неё
          const current = getEquippedItemInSlot(preferredSlot)!;
          const msg = computeEquipConfirmationMessage(item, [preferredSlot], [current]);
          setPendingConfirmation({
            kind: 'replace',
            newItem: item,
            targetSlot: preferredSlot,
            currentItem: current,
            message: msg,
          });
          return;
        }
      }

      // Если не было preferredSlot или выбранная рука была свободна
      if (!chosenHand) {
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
        chosenHand = rightFree ? 'weapon_right' : 'weapon_left';
      }

      // Свободно — экипируем сразу
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

  // === Обработчик дропа предмета на конкретный слот манекена ===
  // Передаём targetSlot как preferredSlot в handleEquipItem.
  // Это позволяет:
  // - Для одноручного оружия — сразу экипировать в указанную руку без модалки выбора.
  // - Для всего остального — использовать единую логику экипировки и подтверждений.
  const handleDropOnMannequinSlot = (itemId: string, targetSlot: EquipmentSlot) => {
    const item = items.find(i => i.id === itemId);
    if (!item || !item.isEquippable || !item.slot) {
      toast.error('Этот предмет нельзя экипировать');
      setDraggedItemId(null);
      return;
    }

    handleEquipItem(itemId, targetSlot);
    setDraggedItemId(null);
  };

  // === Общие обработчики для дроп-зон снятия предметов (устраняет дублирование) ===
  const getUnequipDropHandlers = () => ({
    onDragOver: (e: React.DragEvent) => {
      if (draggedItemId) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      const itemId = e.dataTransfer.getData('text/plain');
      if (itemId) {
        unequipItem(itemId);
        const droppedItem = items.find(i => i.id === itemId);
        if (droppedItem) {
          toast.info(`${droppedItem.name.ru} снят`);
        }
      }
      setDraggedItemId(null);
    },
  });

  // === Обработчики контекстного меню ===
  const openContextMenu = (item: Item, quantity: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setContextMenu({
      item,
      quantity,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const closeContextMenu = () => setContextMenu(null);

  const handleContextEquip = () => {
    if (!contextMenu) return;
    handleEquipItem(contextMenu.item.id); // без preferredSlot — обычный путь с возможным выбором руки
    closeContextMenu();
  };

  const handleContextView = () => {
    if (!contextMenu) return;
    setViewingItem({ item: contextMenu.item, quantity: contextMenu.quantity });
    closeContextMenu();
  };

  const handleContextDrop = () => {
    if (!contextMenu) return;
    setPendingDrop({ item: contextMenu.item, maxQuantity: contextMenu.quantity });
    setDropAmount(1);
    closeContextMenu();
  };

  const confirmDrop = () => {
    if (!pendingDrop) return;
    const amount = Math.min(dropAmount, pendingDrop.maxQuantity);
    dropItem(pendingDrop.item.id, amount);
    toast.info(`${pendingDrop.item.name.ru} ×${amount} выброшен`);
    setPendingDrop(null);
    setDropAmount(1);
  };

  // Размер рюкзака теперь полностью динамический от Выносливости (см. backpackSize ниже)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80">
      <div 
        className="w-[920px] max-w-[95vw] rounded-2xl border border-[var(--studio-border)] bg-[#1C1814] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative flex items-center border-b border-[var(--studio-border)] bg-[#161310] px-6 py-4">
          <span className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold tracking-tight">Инвентарь</span>
          
          <button 
            onClick={handleClose}
            className="ml-auto rounded p-1 hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex h-[580px]">
          {/* === МАНЕКЕН (левая колонка) === */}
          <div className="w-[340px] border-r border-[var(--studio-border)] p-5 flex flex-col pt-3">

            <div className="flex-1 flex items-start justify-center overflow-hidden">
              <InventoryMannequin
                equippedItemIds={getAllEquippedItemIds(playtestState)}
                onUnequipFromSlot={handleUnequipFromSlot}
                onSlotClick={(slot) => {
                  // Можно будет открыть выбор предмета для этого слота
                }}
                draggedItemId={draggedItemId}
                onDropItem={handleDropOnMannequinSlot}
                onDragStartItem={(id) => setDraggedItemId(id)}
                onDragEndItem={() => setDraggedItemId(null)}
              />
            </div>
          </div>

          {/* === СЕТКА ИНВЕНТАРЯ === */}
          <div className="flex-1 p-6 relative">
            <div className="mb-2" /> {/* Spacer instead of РЮКЗАК + counter */}

            {/* === Фильтры === */}
            <div className="mb-3 space-y-2">
              {/* Типы (только те, что есть в рюкзаке) */}
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-2 py-0.5 text-[10px] rounded border transition ${
                    filterType === 'all'
                      ? 'bg-[var(--studio-accent)] text-[#1C1814] border-[var(--studio-accent)]'
                      : 'border-[var(--studio-border)] hover:bg-[#2A251F]'
                  }`}
                >
                  Все
                </button>
                {Array.from(new Set(backpackItems.map(bi => bi.item.type))).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-2 py-0.5 text-[10px] rounded border transition ${
                      filterType === t
                        ? 'bg-[var(--studio-accent)] text-[#1C1814] border-[var(--studio-accent)]'
                        : 'border-[var(--studio-border)] hover:bg-[#2A251F]'
                    }`}
                  >
                    {ItemTypeLabels[t]}
                  </button>
                ))}
              </div>

              {/* Редкость */}
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setFilterRarity('all')}
                  className={`px-2 py-0.5 text-[10px] rounded border transition ${
                    filterRarity === 'all'
                      ? 'bg-[var(--studio-accent)] text-[#1C1814] border-[var(--studio-accent)]'
                      : 'border-[var(--studio-border)] hover:bg-[#2A251F]'
                  }`}
                >
                  Все
                </button>
                {RarityFilterOrder.filter(r => r !== 'all').map((r) => {
                  const color = RarityColors[r];
                  const isActive = filterRarity === r;

                  return (
                    <button
                      key={r}
                      onClick={() => setFilterRarity(r)}
                      className={`px-2 py-0.5 text-[10px] rounded border transition ${
                        isActive
                          ? 'text-[#1C1814] font-medium'
                          : 'hover:bg-[#2A251F]'
                      }`}
                      style={{
                        borderColor: color,
                        backgroundColor: isActive ? color : undefined,
                        color: isActive ? '#1C1814' : undefined,
                      }}
                    >
                      {RarityFilterLabels[r]}
                    </button>
                  );
                })}
              </div>

              {/* Сброс фильтров */}
              {(filterType !== 'all' || filterRarity !== 'all') && (
                <button
                  onClick={() => {
                    setFilterType('all');
                    setFilterRarity('all');
                  }}
                  className="text-[10px] text-[var(--studio-text-muted)] hover:text-[var(--studio-accent)] underline"
                >
                  Сбросить фильтры
                </button>
              )}
            </div>

            {/* Область рюкзака — большая дроп-зона для снятия предметов */}
            <div
              className={`relative min-h-[260px] rounded-xl p-2 transition-all -mx-2 -my-1 ${
                draggedItemId 
                  ? 'bg-[#2A251F]/50 ring-1 ring-[var(--studio-accent)]/40' 
                  : ''
              }`}
              {...getUnequipDropHandlers()}
            >
              {/* Сетка инвентаря */}
              <div className="grid grid-cols-5 gap-2.5">
              {/* Реальные предметы в рюкзаке (с учётом фильтров) */}
              {filteredBackpackItems.map(({ item, quantity }) => {
                const canEquip = !!(item.isEquippable && item.slot);
                return (
                  <div 
                    key={item.id}
                    draggable={canEquip}
                    onDragStart={(e) => {
                      if (canEquip) {
                        e.dataTransfer.setData('text/plain', item.id);
                        setDraggedItemId(item.id);
                      }
                    }}
                    onDragEnd={() => setDraggedItemId(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setContextMenu({
                        item,
                        quantity,
                        x: e.clientX,
                        y: e.clientY,
                      });
                    }}
                    className={`aspect-square w-full max-w-[62px] rounded-xl border-2 flex flex-col items-center justify-center text-[10px] transition-all mx-auto p-1 overflow-hidden ${
                      canEquip 
                        ? 'bg-[#161310] hover:bg-[#2A251F] cursor-grab active:cursor-grabbing active:scale-[0.98]' 
                        : 'bg-[#161310] opacity-50 cursor-not-allowed'
                    }`}
                    style={{
                      borderColor: canEquip ? RarityColors[item.rarity] : '#374151',
                      opacity: draggedItemId === item.id ? 0.5 : 1,
                    }}
                    title={canEquip ? `Перетащите для экипировки или нажмите для меню: ${item.name.ru}` : `${item.name.ru} (нельзя экипировать)`}
                  >
                    {/* Цветная полоска редкости сверху */}
                    <div 
                      className="w-full h-[3px] mb-1 rounded-full"
                      style={{ backgroundColor: RarityColors[item.rarity] }}
                    />

                    <div 
                      className="font-medium text-center leading-tight truncate w-full"
                      style={{ color: RarityColors[item.rarity] }}
                    >
                      {item.name.ru}
                    </div>
                    <div className="text-[var(--studio-accent)] font-mono mt-0.5">
                      {quantity}
                    </div>

                    {/* Durability bar */}
                    {typeof item.maxDurability === 'number' && item.maxDurability > 0 && (
                      <div className="w-[80%] mt-1 h-1 bg-[#2A251F] rounded overflow-hidden">
                        <div 
                          className="h-full transition-all"
                          style={{ 
                            width: `${Math.max(0, Math.min(100, ((item.durability ?? item.maxDurability) / item.maxDurability) * 100))}%`,
                            backgroundColor: RarityColors[item.rarity]
                          }}
                        />
                      </div>
                    )}

                  </div>
                );
              })}

              {/* Пустые ячейки — показываем только когда фильтры не активны */}
              {(filterType === 'all' && filterRarity === 'all') && (
                Array.from({ length: Math.max(0, backpackSize - backpackItems.length) }).map((_, index) => (
                  <div 
                    key={`empty-${index}`}
                    className={`aspect-square w-full max-w-[62px] rounded-xl border flex items-center justify-center text-[var(--studio-text-muted)] transition-colors mx-auto ${
                      draggedItemId 
                        ? 'border-[var(--studio-accent)]/60 bg-[#2A251F]/30 ring-1 ring-[var(--studio-accent)]/20' 
                        : 'border-[var(--studio-border)] bg-[#161310] hover:border-[var(--studio-accent)] cursor-pointer'
                    }`}
                    {...getUnequipDropHandlers()}
                  >
                    <div className="text-[10px] opacity-20">—</div>
                  </div>
                ))
              )}
              </div> {/* end of grid */}
            </div> {/* end of big backpack drop zone */}

            {playerInventory.length === 0 && (
              <div className="mt-6 text-center text-xs text-[var(--studio-text-muted)]">
                Инвентарь пуст.<br />
                Добавь предметы через блок «ИНВЕНТАРЬ» в редакторе или используй действие giveItem.
              </div>
            )}

            {/* Endurance info - bottom right */}
            <div className="absolute bottom-4 right-6 text-xs text-[var(--studio-text-muted)]">
              Выносливость: {enduranceValue}
            </div>
          </div>
        </div>

        {/* Footer removed — крестик в шапке достаточно */}

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

        {/* === Контекстное меню на предмете в рюкзаке (z-[115/120]) === */}
        {contextMenu && (
          <>
            <div className="absolute inset-0 z-[115]" onClick={closeContextMenu} />
            <div 
              className="absolute z-[120] bg-[#1C1814] border border-[var(--studio-border)] rounded-lg shadow-xl py-1 min-w-[160px]"
              style={{
                left: Math.min(contextMenu.x, window.innerWidth - 200),
                top: Math.min(contextMenu.y, window.innerHeight - 180),
              }}
            >
              <div className="px-3 py-1.5 text-xs text-[var(--studio-text-muted)] border-b border-[var(--studio-border)]">
                {contextMenu.item.name.ru} ×{contextMenu.quantity}
              </div>
              <button onClick={handleContextEquip} className="w-full px-3 py-2 text-left text-sm hover:bg-[#2A251F]">Одеть</button>
              <button onClick={handleContextView} className="w-full px-3 py-2 text-left text-sm hover:bg-[#2A251F]">Посмотреть</button>
              <div className="border-t border-[var(--studio-border)] my-1" />
              <button onClick={handleContextDrop} className="w-full px-3 py-2 text-left text-sm hover:bg-red-900/30 text-red-400">Выбросить</button>
            </div>
          </>
        )}

        {/* === Модалка просмотра предмета (новая версия) === */}
        {viewingItem && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-[130]">
            <div className="bg-[#1C1814] border border-[var(--studio-border)] rounded-xl p-5 w-[520px] max-w-[94%]">
              <div className="flex gap-4">
                {/* Левая колонка — Иконка */}
                <div 
                  className="w-20 h-20 flex-shrink-0 rounded-lg border flex items-center justify-center text-3xl"
                  style={{ 
                    backgroundColor: `${RarityColors[viewingItem.item.rarity]}20`,
                    borderColor: RarityColors[viewingItem.item.rarity]
                  }}
                >
                  {viewingItem.item.icon ? (
                    <img 
                      src={viewingItem.item.icon} 
                      alt={viewingItem.item.name.ru}
                      className="max-w-[60px] max-h-[60px] object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="text-[var(--studio-text-muted)] text-xs text-center leading-tight">
                      Нет<br />иконки
                    </div>
                  )}
                </div>

                {/* Правая колонка — Информация */}
                <div className="flex-1 min-w-0">
                  {/* Название */}
                  <div 
                    className="text-xl font-semibold leading-tight"
                    style={{ color: RarityColors[viewingItem.item.rarity] }}
                  >
                    {viewingItem.item.name.ru}
                  </div>

                  {/* Тип */}
                  <div className="text-xs text-[var(--studio-text-muted)] mt-0.5">
                    {ItemTypeLabels[viewingItem.item.type]}
                    {viewingItem.item.slot && ` • ${EquipmentSlotLabels[viewingItem.item.slot] || viewingItem.item.slot}`}
                  </div>

                  {/* Описание */}
                  {viewingItem.item.description?.ru && (
                    <div className="mt-3 text-sm text-[var(--studio-text-secondary)] whitespace-pre-line leading-snug">
                      {viewingItem.item.description.ru}
                    </div>
                  )}

                  {/* Характеристики */}
                  <div className="mt-4 pt-3 border-t border-[var(--studio-border)] space-y-1.5 text-sm">
                    {viewingItem.item.weaponDamage ? (
                      <div className="flex justify-between">
                        <span className="text-[var(--studio-text-muted)]">Урон оружия</span>
                        <span className="font-mono text-[var(--studio-accent)]">+{viewingItem.item.weaponDamage}</span>
                      </div>
                    ) : null}

                    {(viewingItem.item.modifiers || []).length > 0 && (
                      <div>
                        <div className="text-[var(--studio-text-muted)] mb-1">Бонусы</div>
                        <div className="pl-2 space-y-0.5 text-[13px]">
                          {(viewingItem.item.modifiers || []).map((mod, idx) => {
                            const stat = variables.find(v => v.id === mod.statId);
                            const statName = stat 
                              ? (stat.displayName?.ru || stat.name) 
                              : mod.statId;

                            return (
                              <div key={idx} className="text-[var(--studio-text-secondary)]">
                                +{mod.value} {statName}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {typeof viewingItem.item.maxDurability === 'number' && viewingItem.item.maxDurability > 0 && (
                      <div className="flex justify-between">
                        <span className="text-[var(--studio-text-muted)]">Прочность</span>
                        <span className="font-mono">
                          {viewingItem.item.durability ?? viewingItem.item.maxDurability} / {viewingItem.item.maxDurability}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="text-[var(--studio-text-muted)]">Цена</span>
                      <span className="font-mono text-[var(--studio-accent)]">{viewingItem.item.price}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-[var(--studio-text-muted)]">В рюкзаке</span>
                      <span className="font-mono text-[var(--studio-accent)]">{viewingItem.quantity}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Кнопка закрытия */}
              <div className="mt-5 flex justify-end">
                <button 
                  onClick={() => setViewingItem(null)} 
                  className="px-4 py-1.5 rounded bg-[var(--studio-accent)] text-[#1C1814] text-sm font-medium hover:bg-[var(--studio-accent-hover)]"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        )}

        {/* === Подтверждение выбрасывания === */}
        {pendingDrop && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-[130]">
            <div className="bg-[#1C1814] border border-[var(--studio-border)] rounded-xl p-6 w-[380px] max-w-[92%]">
              <div className="text-lg font-semibold mb-3">Выбросить предмет</div>
              <div className="mb-4 text-sm text-[var(--studio-text-secondary)]">{pendingDrop.item.name.ru}</div>

              {pendingDrop.maxQuantity > 1 ? (
                <div className="mb-4">
                  <label className="text-xs text-[var(--studio-text-muted)] block mb-1">Количество (макс. {pendingDrop.maxQuantity})</label>
                  <input
                    type="number"
                    min={1}
                    max={pendingDrop.maxQuantity}
                    value={dropAmount}
                    onChange={(e) => setDropAmount(Math.max(1, Math.min(pendingDrop.maxQuantity, parseInt(e.target.value) || 1)))}
                    className="w-full rounded border border-[var(--studio-border)] bg-[#161310] px-3 py-2 text-lg font-mono focus:outline-none focus:border-[var(--studio-accent)]"
                  />
                </div>
              ) : (
                <div className="mb-4 text-sm">Вы уверены, что хотите выбросить этот предмет?</div>
              )}

              <div className="flex gap-3 justify-end">
                <button onClick={() => { setPendingDrop(null); setDropAmount(1); }} className="px-4 py-2 rounded border border-[var(--studio-border)] hover:bg-[#2A251F]">Отмена</button>
                <button onClick={confirmDrop} className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-medium">
                  Выбросить {dropAmount > 1 ? `×${dropAmount}` : ''}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
