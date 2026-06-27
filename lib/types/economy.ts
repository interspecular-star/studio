import type { LocalizedString } from './core';
import type { Difficulty } from './combat';

// ── Buildings ─────────────────────────────────────────────────────────────────

export type BuildingId = 'forge' | 'tavern' | 'shop' | 'shaman' | 'mine';

export type BuildingTier = {
  levels: string;           // e.g. "1–3", "4–6"
  description: LocalizedString;
};

export type Building = {
  id: BuildingId;
  name: LocalizedString;
  ownerName: LocalizedString;
  icon: string;
  maxLevel: number;
  tiers: BuildingTier[];    // 4 tiers: 1-3, 4-6, 7-10, 11-15
  customUpgradeCosts?: number[]; // override formula; index 0 = lvl 1→2
};

/** Cost to upgrade from level N to N+1. Formula from CDD: 40 × N^1.8 */
export function buildingUpgradeCost(fromLevel: number): number {
  return Math.round(40 * Math.pow(fromLevel, 1.8));
}

// ── Mercenaries ───────────────────────────────────────────────────────────────

export type MercenaryRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export const MERCENARY_RARITY_LABELS: Record<MercenaryRarity, string> = {
  common:    'Обычный',
  uncommon:  'Необычный',
  rare:      'Редкий',
  epic:      'Эпический',
  legendary: 'Легендарный',
};

export const MERCENARY_RARITY_COLORS: Record<MercenaryRarity, string> = {
  common:    '#9ca3af',
  uncommon:  '#4ade80',
  rare:      '#60a5fa',
  epic:      '#a78bfa',
  legendary: '#fbbf24',
};

export type Mercenary = {
  id: string;
  name: LocalizedString;
  rarity: MercenaryRarity;
  costMin: number;               // Сталлонки
  costMax: number;
  durationHours: number;
  mineBonusPct: number;          // % к доходу шахты
  combatHelp?: LocalizedString;  // описание помощи в бою
  tavernLevelRequired: number;
  isNamed?: boolean;
  unlockCondition?: LocalizedString;
};

// ── Reward Tables ─────────────────────────────────────────────────────────────

export type RewardEntry = {
  difficulty: Difficulty;
  coinsMin: number;
  coinsMax: number;
  stallonkasMin: number;
  stallonkasMax: number;
  vhsChancePct: number;       // 0–100
  rareItemChancePct: number;  // 0–100
  xpMin: number;
  xpMax: number;
};

// ── Mine Config ───────────────────────────────────────────────────────────────

export type MineConfig = {
  baseCoinsPerHour: number;
  baseStallonkasPerHour: number;
  offlineEfficiencyPct: number;  // % от онлайн-дохода (базово 50%)
  maxOfflineHours: number;       // базово 8
};

// ── Defaults ──────────────────────────────────────────────────────────────────

export const DEFAULT_BUILDINGS: Building[] = [
  {
    id: 'forge',
    name: { ru: 'Кузница', en: 'Forge' },
    ownerName: { ru: 'Агафья', en: 'Agafya' },
    icon: '⚒️',
    maxLevel: 15,
    tiers: [
      { levels: '1–3',   description: { ru: 'Базовые зачарования, ремонт снаряжения', en: 'Basic enchantments, equipment repair' } },
      { levels: '4–6',   description: { ru: 'Редкие зачарования, усиление редкого предмета', en: 'Rare enchantments, rare item upgrade' } },
      { levels: '7–10',  description: { ru: 'Эпические зачарования, скидка 15% на ремонт', en: 'Epic enchantments, -15% repair cost' } },
      { levels: '11–15', description: { ru: 'VHS-зачарование, создание уникальных предметов', en: 'VHS enchantment, unique item crafting' } },
    ],
  },
  {
    id: 'tavern',
    name: { ru: 'Таверна', en: 'Tavern' },
    ownerName: { ru: 'Мила', en: 'Mila' },
    icon: '🍺',
    maxLevel: 15,
    tiers: [
      { levels: '1–3',   description: { ru: '2 слота наёмников, базовое меню', en: '2 mercenary slots, basic menu' } },
      { levels: '4–6',   description: { ru: '3 слота, появляются необычные наёмники', en: '3 slots, uncommon mercenaries available' } },
      { levels: '7–10',  description: { ru: '4 слота, появляются редкие наёмники', en: '4 slots, rare mercenaries available' } },
      { levels: '11–15', description: { ru: '4+ слота, легендарные наёмники, мощная еда (+25%)', en: '4+ slots, legendary mercenaries, powerful food (+25%)' } },
    ],
  },
  {
    id: 'shop',
    name: { ru: 'Лавка', en: 'Shop' },
    ownerName: { ru: 'Сэм', en: 'Sam' },
    icon: '🛒',
    maxLevel: 15,
    tiers: [
      { levels: '1–3',   description: { ru: 'Обычные и необычные товары', en: 'Common and uncommon goods' } },
      { levels: '4–6',   description: { ru: 'Редкие товары, скидка 5%', en: 'Rare goods, 5% discount' } },
      { levels: '7–10',  description: { ru: 'Эпические товары, скидка 10%, особые расходники', en: 'Epic goods, 10% discount, special consumables' } },
      { levels: '11–15', description: { ru: 'Легендарные товары, скидка 15%, VHS-артефакты', en: 'Legendary goods, 15% discount, VHS artifacts' } },
    ],
  },
  {
    id: 'shaman',
    name: { ru: 'Шаманка', en: "Shaman's Hut" },
    ownerName: { ru: 'Зося', en: 'Zosya' },
    icon: '🔮',
    maxLevel: 15,
    tiers: [
      { levels: '1–3',   description: { ru: 'Базовые зелья, захват душ (базовый)', en: 'Basic potions, soul capture (basic)' } },
      { levels: '4–6',   description: { ru: 'Средние зелья, +2% к шансу захвата душ', en: 'Medium potions, +2% soul capture chance' } },
      { levels: '7–10',  description: { ru: 'Сильные зелья, +5% шанс душ, новые способности', en: 'Strong potions, +5% soul chance, new abilities' } },
      { levels: '11–15', description: { ru: 'Высшие зелья, +10% шанс душ, легендарные перки', en: 'Supreme potions, +10% soul chance, legendary perks' } },
    ],
  },
  {
    id: 'mine',
    name: { ru: 'Шахта', en: 'Mine' },
    ownerName: { ru: '—', en: '—' },
    icon: '⛏️',
    maxLevel: 15,
    tiers: [
      { levels: '1–3',   description: { ru: 'Базовый доход, 8ч оффлайн', en: 'Base income, 8h offline' } },
      { levels: '4–6',   description: { ru: '+25% доход, 10ч оффлайн', en: '+25% income, 10h offline' } },
      { levels: '7–10',  description: { ru: '+50% доход, 12ч оффлайн, автосбор Монет', en: '+50% income, 12h offline, auto-collect coins' } },
      { levels: '11–15', description: { ru: '+80% доход, 16ч оффлайн, редкие материалы', en: '+80% income, 16h offline, rare materials' } },
    ],
  },
];

export const DEFAULT_MERCENARIES: Mercenary[] = [
  {
    id: 'merc_zyrk',
    name: { ru: 'Зырк', en: 'Zyrk' },
    rarity: 'uncommon',
    costMin: 800, costMax: 800,
    durationHours: 8,
    mineBonusPct: 20,
    combatHelp: { ru: 'Иногда приносит случайный предмет после боя', en: 'Occasionally brings a random item after battle' },
    tavernLevelRequired: 1,
    isNamed: true,
    unlockCondition: { ru: 'Отношения ≥ 40', en: 'Relationship ≥ 40' },
  },
  {
    id: 'merc_mini_mila',
    name: { ru: 'Мини-Мила', en: 'Mini-Mila' },
    rarity: 'rare',
    costMin: 1200, costMax: 1200,
    durationHours: 12,
    mineBonusPct: 30,
    combatHelp: { ru: '+30% к доходу от еды в Таверне', en: '+30% to food income in the Tavern' },
    tavernLevelRequired: 4,
    isNamed: true,
    unlockCondition: { ru: 'Отношения Мила ≥ 60', en: 'Mila relationship ≥ 60' },
  },
  {
    id: 'merc_ded_mazay',
    name: { ru: 'Дед Мазай', en: 'Ded Mazay' },
    rarity: 'uncommon',
    costMin: 600, costMax: 600,
    durationHours: 4,
    mineBonusPct: 10,
    combatHelp: { ru: 'Открывает слабые точки мобов', en: 'Reveals weak points of mobs' },
    tavernLevelRequired: 1,
    isNamed: true,
    unlockCondition: { ru: 'Отношения ≥ 50', en: 'Relationship ≥ 50' },
  },
  {
    id: 'merc_agafya',
    name: { ru: 'Агафья', en: 'Agafya' },
    rarity: 'epic',
    costMin: 2500, costMax: 2500,
    durationHours: 24,
    mineBonusPct: 55,
    combatHelp: { ru: '+20% урон всему Слэю пока нанята', en: '+20% damage to all of Slay while hired' },
    tavernLevelRequired: 10,
    isNamed: true,
    unlockCondition: { ru: 'Отношения Агафья ≥ 70', en: 'Agafya relationship ≥ 70' },
  },
  {
    id: 'merc_zosya',
    name: { ru: 'Зося', en: 'Zosya' },
    rarity: 'epic',
    costMin: 2000, costMax: 2000,
    durationHours: 24,
    mineBonusPct: 55,
    combatHelp: { ru: '+5% шанс захвата душ пока нанята', en: '+5% soul capture chance while hired' },
    tavernLevelRequired: 10,
    isNamed: true,
    unlockCondition: { ru: 'Отношения Зося ≥ 70', en: 'Zosya relationship ≥ 70' },
  },
];

export const DEFAULT_REWARD_TABLES: RewardEntry[] = [
  {
    difficulty: 'novice',
    coinsMin: 80,  coinsMax: 150,
    stallonkasMin: 8,  stallonkasMax: 18,
    vhsChancePct: 5,   rareItemChancePct: 1,
    xpMin: 100, xpMax: 180,
  },
  {
    difficulty: 'amateur',
    coinsMin: 150, coinsMax: 300,
    stallonkasMin: 18, stallonkasMax: 40,
    vhsChancePct: 8,   rareItemChancePct: 3,
    xpMin: 250, xpMax: 400,
  },
  {
    difficulty: 'professional',
    coinsMin: 300, coinsMax: 600,
    stallonkasMin: 40, stallonkasMax: 80,
    vhsChancePct: 12,  rareItemChancePct: 7,
    xpMin: 500, xpMax: 800,
  },
  {
    difficulty: 'stuntman',
    coinsMin: 600, coinsMax: 1100,
    stallonkasMin: 80, stallonkasMax: 150,
    vhsChancePct: 20,  rareItemChancePct: 15,
    xpMin: 900, xpMax: 1400,
  },
  {
    difficulty: 'hollywood',
    coinsMin: 1000, coinsMax: 2000,
    stallonkasMin: 150, stallonkasMax: 250,
    vhsChancePct: 35,  rareItemChancePct: 25,
    xpMin: 1500, xpMax: 2500,
  },
  {
    difficulty: 'super_endless',
    coinsMin: 1100, coinsMax: 2200,
    stallonkasMin: 165, stallonkasMax: 275,
    vhsChancePct: 40,  rareItemChancePct: 30,
    xpMin: 1620, xpMax: 2700,
  },
];

export const DEFAULT_MINE_CONFIG: MineConfig = {
  baseCoinsPerHour: 275,
  baseStallonkasPerHour: 12,
  offlineEfficiencyPct: 50,
  maxOfflineHours: 8,
};
