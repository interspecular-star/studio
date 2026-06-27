import type { Enemy, Boss, Wave, InstinctDef, ScenarioDef } from '../types/combat';
import type { Building, Mercenary, RewardEntry, MineConfig } from '../types/economy';
import type { Item } from '../types/items';
import { DIFFICULTY_LABELS } from '../types/combat';
import {
  EnemySchema, BossSchema, WaveSchema, InstinctDefSchema, ScenarioDefSchema,
  BuildingSchema, MercenarySchema, RewardEntrySchema, MineConfigSchema,
} from './schemas';
import type { CombatPack } from './schemas';

export type ValidationSeverity = 'error' | 'warning';

export type ValidationIssue = {
  severity: ValidationSeverity;
  category: string;
  message: string;
};

export type ValidationResult = {
  ok: boolean;
  issues: ValidationIssue[];
};

function err(category: string, message: string): ValidationIssue {
  return { severity: 'error', category, message };
}

function warn(category: string, message: string): ValidationIssue {
  return { severity: 'warning', category, message };
}

// ── Reference checks ──────────────────────────────────────────────────────────

function checkEnemies(enemies: Enemy[], items: Item[], issues: ValidationIssue[]) {
  const itemIds = new Set(items.map(i => i.id));

  for (const enemy of enemies) {
    const result = EnemySchema.safeParse(enemy);
    if (!result.success) {
      issues.push(err('Враги', `«${enemy.name?.ru ?? enemy.id}»: ${result.error.issues[0]?.message}`));
    }
    for (const drop of enemy.drops ?? []) {
      if (!itemIds.has(drop.itemId)) {
        issues.push(warn('Враги', `«${enemy.name.ru}»: дроп ссылается на несуществующий предмет "${drop.itemId}"`));
      }
    }
  }
}

function checkBosses(bosses: Boss[], items: Item[], issues: ValidationIssue[]) {
  const itemIds = new Set(items.map(i => i.id));

  for (const boss of bosses) {
    const result = BossSchema.safeParse(boss);
    if (!result.success) {
      issues.push(err('Боссы', `«${boss.name?.ru ?? boss.id}»: ${result.error.issues[0]?.message}`));
    }
    if (!boss.phases || boss.phases.length === 0) {
      issues.push(warn('Боссы', `«${boss.name.ru}»: нет фаз боя`));
    }
    for (const drop of boss.drops ?? []) {
      if (!itemIds.has(drop.itemId)) {
        issues.push(warn('Боссы', `«${boss.name.ru}»: дроп ссылается на несуществующий предмет "${drop.itemId}"`));
      }
    }
  }
}

function checkWaves(
  waves: Wave[],
  enemies: Enemy[],
  bosses: Boss[],
  issues: ValidationIssue[],
) {
  const enemyIds = new Set(enemies.map(e => e.id));
  const bossIds  = new Set(bosses.map(b => b.id));

  for (const wave of waves) {
    const result = WaveSchema.safeParse(wave);
    if (!result.success) {
      issues.push(err('Волны', `«${wave.name?.ru ?? wave.id}»: ${result.error.issues[0]?.message}`));
    }
    if (!wave.enemyPool || wave.enemyPool.length === 0) {
      issues.push(err('Волны', `«${wave.name.ru}»: пул врагов пустой`));
    }
    for (const entry of wave.enemyPool ?? []) {
      if (!enemyIds.has(entry.enemyId)) {
        issues.push(err('Волны', `«${wave.name.ru}»: пул ссылается на несуществующего врага "${entry.enemyId}"`));
      }
    }
    if (wave.bossId && !bossIds.has(wave.bossId)) {
      issues.push(err('Волны', `«${wave.name.ru}»: босс "${wave.bossId}" не найден`));
    }
  }
}

function checkInstincts(instincts: InstinctDef[], issues: ValidationIssue[]) {
  for (const inst of instincts) {
    const result = InstinctDefSchema.safeParse(inst);
    if (!result.success) {
      issues.push(err('Инстинкты', `«${inst.name?.ru ?? inst.id}»: ${result.error.issues[0]?.message}`));
    }
  }
}

function checkScenarios(scenarios: ScenarioDef[], issues: ValidationIssue[]) {
  for (const sc of scenarios) {
    const result = ScenarioDefSchema.safeParse(sc);
    if (!result.success) {
      issues.push(err('Сценарии', `«${sc.name?.ru ?? sc.id}»: ${result.error.issues[0]?.message}`));
    }
  }
}

function checkBuildings(buildings: Building[], issues: ValidationIssue[]) {
  const EXPECTED_IDS = new Set(['forge', 'tavern', 'shop', 'shaman', 'mine']);
  const foundIds = new Set(buildings.map(b => b.id));

  for (const id of EXPECTED_IDS) {
    if (!foundIds.has(id as any)) {
      issues.push(warn('Здания', `Здание "${id}" отсутствует`));
    }
  }
  for (const b of buildings) {
    const result = BuildingSchema.safeParse(b);
    if (!result.success) {
      issues.push(err('Здания', `«${b.name?.ru ?? b.id}»: ${result.error.issues[0]?.message}`));
    }
    if (!b.tiers || b.tiers.length === 0) {
      issues.push(warn('Здания', `«${b.name.ru}»: нет описаний тиров`));
    }
  }
}

function checkMercenaries(mercenaries: Mercenary[], issues: ValidationIssue[]) {
  for (const m of mercenaries) {
    const result = MercenarySchema.safeParse(m);
    if (!result.success) {
      issues.push(err('Наёмники', `«${m.name?.ru ?? m.id}»: ${result.error.issues[0]?.message}`));
    }
    if (m.costMin > m.costMax) {
      issues.push(warn('Наёмники', `«${m.name.ru}»: цена мин > макс`));
    }
  }
}

function checkRewardTables(tables: RewardEntry[], issues: ValidationIssue[]) {
  const EXPECTED_DIFFS = ['novice', 'amateur', 'professional', 'stuntman', 'hollywood', 'super_endless'] as const;
  const foundDiffs = new Set(tables.map(t => t.difficulty));

  for (const d of EXPECTED_DIFFS) {
    if (!foundDiffs.has(d)) {
      issues.push(err('Награды', `Таблица для сложности «${DIFFICULTY_LABELS[d]}» отсутствует`));
    }
  }
  for (const r of tables) {
    const result = RewardEntrySchema.safeParse(r);
    if (!result.success) {
      issues.push(err('Награды', `Сложность «${DIFFICULTY_LABELS[r.difficulty]}»: ${result.error.issues[0]?.message}`));
    }
    if (r.coinsMin > r.coinsMax) {
      issues.push(warn('Награды', `«${DIFFICULTY_LABELS[r.difficulty]}»: монеты мин > макс`));
    }
    if (r.stallonkasMin > r.stallonkasMax) {
      issues.push(warn('Награды', `«${DIFFICULTY_LABELS[r.difficulty]}»: сталлонки мин > макс`));
    }
    if (r.xpMin > r.xpMax) {
      issues.push(warn('Награды', `«${DIFFICULTY_LABELS[r.difficulty]}»: XP мин > макс`));
    }
  }
}

function checkMineConfig(config: MineConfig, issues: ValidationIssue[]) {
  const result = MineConfigSchema.safeParse(config);
  if (!result.success) {
    issues.push(err('Шахта', result.error.issues[0]?.message ?? 'Невалидная конфигурация'));
  }
}

// ── Main validator ────────────────────────────────────────────────────────────

export function validateCombatPack(data: {
  enemies: Enemy[];
  bosses: Boss[];
  waves: Wave[];
  instincts: InstinctDef[];
  scenarios: ScenarioDef[];
  buildings: Building[];
  mercenaries: Mercenary[];
  rewardTables: RewardEntry[];
  mineConfig: MineConfig;
  items: Item[];
}): ValidationResult {
  const issues: ValidationIssue[] = [];

  checkEnemies(data.enemies, data.items, issues);
  checkBosses(data.bosses, data.items, issues);
  checkWaves(data.waves, data.enemies, data.bosses, issues);
  checkInstincts(data.instincts, issues);
  checkScenarios(data.scenarios, issues);
  checkBuildings(data.buildings, issues);
  checkMercenaries(data.mercenaries, issues);
  checkRewardTables(data.rewardTables, issues);
  checkMineConfig(data.mineConfig, issues);

  // Warnings for empty sections
  if (data.enemies.length === 0) issues.push(warn('Враги', 'Нет ни одного врага'));
  if (data.waves.length === 0)   issues.push(warn('Волны', 'Нет ни одной волны'));

  return { ok: issues.filter(i => i.severity === 'error').length === 0, issues };
}

// ── Build export payload ──────────────────────────────────────────────────────

export function buildCombatPack(data: Omit<Parameters<typeof validateCombatPack>[0], 'items'>): CombatPack {
  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    enemies: data.enemies,
    bosses: data.bosses,
    waves: data.waves,
    instincts: data.instincts,
    scenarios: data.scenarios,
    buildings: data.buildings,
    mercenaries: data.mercenaries,
    rewardTables: data.rewardTables,
    mineConfig: data.mineConfig,
  };
}
