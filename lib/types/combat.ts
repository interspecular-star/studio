import type { LocalizedString } from './core';

export type EnemyTier = 1 | 2 | 3 | 4 | 5;

export type Difficulty =
  | 'novice'
  | 'amateur'
  | 'professional'
  | 'stuntman'
  | 'hollywood'
  | 'super_endless';

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  novice: 'Новичок',
  amateur: 'Любитель',
  professional: 'Профессионал',
  stuntman: 'Каскадёр',
  hollywood: 'Голливуд',
  super_endless: 'Super Endless',
};

export type EnemyDrop = {
  itemId: string;
  chance: number; // 0–100
  amount: number;
};

export type Enemy = {
  id: string;
  name: LocalizedString;
  tier: EnemyTier;
  hp: number;
  atk: number;
  weakPointTrigger?: LocalizedString; // когда активируется слабая точка
  furyReply?: LocalizedString;        // реплика в Fury Mode
  drops?: EnemyDrop[];
};

export type BossPhase = {
  hpThreshold: number; // процент HP (60 или 30)
  mechanic: LocalizedString;
};

export type Boss = Enemy & {
  isBoss: true;
  breakBarMax: number;
  phases: BossPhase[];
  furyAbility: LocalizedString;
  shieldMechanic?: LocalizedString;
};

export type WaveEntry = {
  enemyId: string;
  weight: number; // вес в рандомном пуле
};

export type Wave = {
  id: string;
  name: LocalizedString;
  enemyPool: WaveEntry[];
  bossId?: string;
  difficulties: Difficulty[];
};

export type InstinctDef = {
  id: string;
  name: LocalizedString;
  description: LocalizedString;
  passiveEffect: LocalizedString;
  unlockLevel: number;
};

export type ScenarioDef = {
  id: string;
  name: LocalizedString;
  condition: LocalizedString;
  reward: LocalizedString;
  availableDifficulties: Difficulty[];
};

export type RandomEventEffect =
  | 'momentum_boost'
  | 'showtime_boost'
  | 'player_heal'
  | 'player_damage'
  | 'enemy_rage';

export type RandomEventDef = {
  id: string;
  name: { ru: string; en: string };
  description: { ru: string; en: string };
  effect: RandomEventEffect;
  magnitude: number; // % for heal/damage/showtime, flat for momentum; ticks for enemy_rage
};

export const DEFAULT_RANDOM_EVENTS: RandomEventDef[] = [
  {
    id: 'lucky_shot',
    name: { ru: '🎯 Удачный выстрел!', en: 'Lucky Shot!' },
    description: { ru: '+3 Momentum', en: '+3 Momentum' },
    effect: 'momentum_boost', magnitude: 3,
  },
  {
    id: 'crowd_cheers',
    name: { ru: '📣 Трибуны ревут!', en: 'Crowd Cheers!' },
    description: { ru: '+25 Showtime', en: '+25 Showtime' },
    effect: 'showtime_boost', magnitude: 25,
  },
  {
    id: 'stunt_double',
    name: { ru: '🤸 Дублёр!', en: 'Stunt Double!' },
    description: { ru: 'Восстановить 15% макс HP', en: 'Restore 15% max HP' },
    effect: 'player_heal', magnitude: 15,
  },
  {
    id: 'director_angry',
    name: { ru: '😡 Режиссёр в ярости!', en: 'Director Furious!' },
    description: { ru: 'Получить 8% макс HP урона', en: 'Take 8% max HP as damage' },
    effect: 'player_damage', magnitude: 8,
  },
  {
    id: 'camera_malfunction',
    name: { ru: '📷 Камера сломалась!', en: 'Camera Malfunction!' },
    description: { ru: 'Враги впадают в ярость на 8 тиков (+30% урон)', en: 'Enemies enrage for 8 ticks (+30% dmg)' },
    effect: 'enemy_rage', magnitude: 8,
  },
];

// Дефолтные инстинкты из CDD
export const DEFAULT_INSTINCTS: InstinctDef[] = [
  {
    id: 'veteran',
    name: { ru: 'Ветеран', en: 'Veteran' },
    description: { ru: 'При HP < 20%: +40% защита + Showtime активируется немедленно', en: 'At HP < 20%: +40% defense + instant Showtime activation' },
    passiveEffect: { ru: '+40% защита и мгновенный Showtime при HP < 20%', en: '+40% defense and instant Showtime at HP < 20%' },
    unlockLevel: 1,
  },
  {
    id: 'lucky',
    name: { ru: 'Везунчик', en: 'Lucky' },
    description: { ru: '+5% крит, -10% базовый урон, крит даёт +2 Momentum (вместо +1)', en: '+5% crit, -10% base damage, crit grants +2 Momentum (instead of +1)' },
    passiveEffect: { ru: '+5% крит, -10% урон, крит: +2 Momentum', en: '+5% crit, -10% dmg, crit: +2 Momentum' },
    unlockLevel: 5,
  },
  {
    id: 'stuntman',
    name: { ru: 'Каскадёр', en: 'Stuntman' },
    description: { ru: 'Каждый уклон: +1 Momentum сверху + восстановление 3% маны', en: 'Each dodge: +1 bonus Momentum + restore 3% mana' },
    passiveEffect: { ru: 'Уклон: +1 Momentum, +3% мана', en: 'Dodge: +1 Momentum, +3% mana' },
    unlockLevel: 8,
  },
  {
    id: 'old_school',
    name: { ru: 'Старая закалка', en: 'Old School' },
    description: { ru: 'При 0 маны базовая атака +30%, Stagger от 2 ударов вместо 3', en: 'At 0 mana: +30% basic attack, Stagger from 2 hits instead of 3' },
    passiveEffect: { ru: '0 маны: +30% базовая атака, Stagger от 2 ударов', en: '0 mana: +30% basic atk, Stagger from 2 hits' },
    unlockLevel: 12,
  },
  {
    id: 'hunter',
    name: { ru: 'Охотник', en: 'Hunter' },
    description: { ru: 'Урон по слабой точке: ×2.2 вместо ×1.8', en: 'Weak point damage: ×2.2 instead of ×1.8' },
    passiveEffect: { ru: 'Слабая точка: ×2.2 урона', en: 'Weak point: ×2.2 damage' },
    unlockLevel: 15,
  },
  {
    id: 'directors_favorite',
    name: { ru: 'Режиссёрский любимчик', en: "Director's Favorite" },
    description: { ru: 'Выполнение Сценария: +20 Showtime немедленно', en: 'Completing a Scenario: +20 Showtime immediately' },
    passiveEffect: { ru: 'Сценарий выполнен: +20 Showtime', en: 'Scenario complete: +20 Showtime' },
    unlockLevel: 20,
  },
];

// Дефолтные сценарии Вики из CDD
export const DEFAULT_SCENARIOS: ScenarioDef[] = [
  {
    id: 'no_takes',
    name: { ru: 'Без дублей', en: 'No Takes' },
    condition: { ru: 'Не получать урон первые 30 секунд', en: 'Take no damage for the first 30 seconds' },
    reward: { ru: '+30% опыта за волну', en: '+30% XP for the wave' },
    availableDifficulties: ['amateur', 'professional', 'stuntman', 'hollywood', 'super_endless'],
  },
  {
    id: 'method_actor',
    name: { ru: 'Метод актёра', en: 'Method Actor' },
    condition: { ru: 'Активировать Showtime хотя бы раз', en: 'Activate Showtime at least once' },
    reward: { ru: 'VHS-кассета гарантировано', en: 'Guaranteed VHS cassette' },
    availableDifficulties: ['novice', 'amateur', 'professional', 'stuntman', 'hollywood', 'super_endless'],
  },
  {
    id: 'bare_minimum',
    name: { ru: 'Голый минимум', en: 'Bare Minimum' },
    condition: { ru: 'Победить без использования зелий', en: 'Win without using potions' },
    reward: { ru: '+20% монет', en: '+20% coins' },
    availableDifficulties: ['amateur', 'professional', 'stuntman', 'hollywood', 'super_endless'],
  },
  {
    id: 'on_the_edge',
    name: { ru: 'На последнем издыхании', en: 'On The Edge' },
    condition: { ru: 'Убить босса при HP ГГ < 15%', en: 'Kill the boss with HP < 15%' },
    reward: { ru: 'Шанс легендарного лута ×3', en: 'Legendary loot chance ×3' },
    availableDifficulties: ['professional', 'stuntman', 'hollywood', 'super_endless'],
  },
  {
    id: 'combo_master',
    name: { ru: 'Комбо-мастер', en: 'Combo Master' },
    condition: { ru: 'Достичь Momentum ×15 за бой', en: 'Reach Momentum ×15 during the battle' },
    reward: { ru: 'Гарантированный захват души', en: 'Guaranteed soul capture' },
    availableDifficulties: ['professional', 'stuntman', 'hollywood', 'super_endless'],
  },
  {
    id: 'no_cheating',
    name: { ru: 'Без читерства', en: 'No Cheating' },
    condition: { ru: 'Ни разу не нажать паузу', en: 'Never press pause' },
    reward: { ru: '+50% Сталлонок за волну', en: '+50% Stallonkas for the wave' },
    availableDifficulties: ['stuntman', 'hollywood', 'super_endless'],
  },
  {
    id: 'weak_spot',
    name: { ru: 'Слабое место', en: 'Weak Spot' },
    condition: { ru: 'Нанести 5+ ударов по слабым точкам', en: 'Hit weak spots 5+ times' },
    reward: { ru: 'Редкий предмет в награде', en: 'Rare item in rewards' },
    availableDifficulties: ['novice', 'amateur', 'professional', 'stuntman', 'hollywood', 'super_endless'],
  },
  {
    id: 'full_chaos',
    name: { ru: 'Полный хаос', en: 'Full Chaos' },
    condition: { ru: 'За бой сработало 2+ случайных события', en: '2+ random events triggered during the battle' },
    reward: { ru: 'Удвоенный лут', en: 'Double loot' },
    availableDifficulties: ['professional', 'stuntman', 'hollywood', 'super_endless'],
  },
  {
    id: 'take',
    name: { ru: 'Дубль', en: 'Take' },
    condition: { ru: 'Убить одного моба в течение 3 сек после спавна', en: 'Kill a mob within 3 seconds of spawn' },
    reward: { ru: '+15% скорость кулдаунов следующего моба', en: '+15% cooldown speed for next mob' },
    availableDifficulties: ['novice', 'amateur', 'professional', 'stuntman', 'hollywood', 'super_endless'],
  },
  {
    id: 'silent_killer',
    name: { ru: 'Тихий убийца', en: 'Silent Killer' },
    condition: { ru: 'Убить 3 моба подряд без получения урона', en: 'Kill 3 mobs in a row without taking damage' },
    reward: { ru: 'Momentum не сбрасывается при следующем попадании', en: 'Momentum is not reset on the next hit (once)' },
    availableDifficulties: ['stuntman', 'hollywood', 'super_endless'],
  },
];
