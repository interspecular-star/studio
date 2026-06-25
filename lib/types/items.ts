import type { LocalizedString } from './core';

export type ItemType =
  | 'weapon'
  | 'armor'
  | 'accessory'
  | 'consumable'
  | 'material'
  | 'quest'
  | 'misc';

export type ItemRarity =
  | 'trash'
  | 'junk'
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'mythic'
  | 'overpowered';

export type StatModifier = {
  statId: string;
  value: number;
};

export const ItemRarityLabels: Record<ItemRarity, string> = {
  trash: 'Мусор',
  junk: 'Хлам',
  common: 'Простой',
  uncommon: 'Средний',
  rare: 'Высокий',
  epic: 'Легендарный',
  legendary: 'Мифический',
  mythic: 'Имбовый',
  overpowered: 'Имбовый+',
};

export const RarityFilterOrder: (ItemRarity | 'all')[] = [
  'all',
  'trash',
  'junk',
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
  'mythic',
  'overpowered',
];

export const RarityFilterLabels: Record<ItemRarity | 'all', string> = {
  all: 'Все',
  ...ItemRarityLabels,
};

export const RarityColors: Record<ItemRarity, string> = {
  trash: '#6B7280',
  junk: '#4B5563',
  common: '#D1D5DB',
  uncommon: '#22C55E',
  rare: '#3B82F6',
  epic: '#F97316',
  legendary: '#A855F7',
  mythic: '#EF4444',
  overpowered: '#E11D48',
};

export const ItemTypeLabels: Record<ItemType, string> = {
  weapon: 'Оружие',
  armor: 'Броня',
  accessory: 'Аксессуар',
  consumable: 'Расходник',
  material: 'Материал',
  quest: 'Квестовый',
  misc: 'Прочее',
};

export type EquipmentSlot =
  | 'weapon_right'
  | 'weapon_left'
  | 'shield'
  | 'one_handed_weapon'
  | 'two_handed_weapon'
  | 'helmet'
  | 'gloves'
  | 'chest'
  | 'legs'
  | 'boots'
  | 'belt'
  | 'cloak'
  | 'amulet'
  | 'ring'
  | 'minion';

export const EquipmentSlotLabels: Record<EquipmentSlot, string> = {
  weapon_right: 'Правая рука',
  weapon_left: 'Левая рука',
  shield: 'Щит',
  one_handed_weapon: 'Одноручное оружие',
  two_handed_weapon: 'Двуручное оружие',
  helmet: 'Шлем',
  gloves: 'Перчатки',
  chest: 'Тело',
  legs: 'Ноги',
  boots: 'Ботинки',
  belt: 'Пояс',
  cloak: 'Плащ',
  amulet: 'Амулет',
  ring: 'Кольцо',
  minion: 'Миньон',
};

export const MainBodySlots: EquipmentSlot[] = ['helmet', 'chest', 'belt', 'legs', 'boots'];
export const BeltRowSlots: EquipmentSlot[] = ['gloves', 'belt'];
export const HandSlots: EquipmentSlot[] = ['weapon_right', 'weapon_left'];

export const AccessoryRowSlots: EquipmentSlot[] = [
  'amulet',
  'ring',
  'ring',
  'ring',
  'ring',
  'cloak',
  'minion',
];

export const CompactAccessorySlots: EquipmentSlot[] = ['amulet', 'ring', 'cloak', 'minion'];

export function isAccessorySlot(slot: EquipmentSlot | null | undefined): boolean {
  if (!slot) return false;
  return CompactAccessorySlots.includes(slot);
}

export function isHandSlot(slot: EquipmentSlot | null | undefined): boolean {
  if (!slot) return false;
  return HandSlots.includes(slot);
}

export function canEquipToHand(itemSlot: EquipmentSlot, hand: 'weapon_right' | 'weapon_left'): boolean {
  if (itemSlot === 'shield') return hand === 'weapon_left';
  if (itemSlot === 'weapon_right' || itemSlot === 'weapon_left') return true;
  return false;
}

export const BlockedSlotStyle = {
  borderColor: 'border-amber-900/50',
  bgColor: 'bg-[#161310]',
  textColor: 'text-amber-900/60',
  label: 'Миньон (недоступно)',
};

export interface ItemReplacementInfo {
  currentItem: Item;
  newItem: Item;
  statChanges: Array<{
    statId: string;
    statName: string;
    delta: number;
  }>;
}

export type Item = {
  id: string;
  name: LocalizedString;
  description: LocalizedString;
  icon?: string;
  quantityVariableId?: string;
  type: ItemType;
  rarity: ItemRarity;
  maxDurability: number;
  durability: number;
  isEquippable: boolean;
  slot?: EquipmentSlot | null;
  price: number;
  modifiers?: StatModifier[];
  weaponDamage?: number;
  defenseValue?: number;
};
