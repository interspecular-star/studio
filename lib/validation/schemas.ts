import { z } from 'zod';

// ── Shared ────────────────────────────────────────────────────────────────────

export const LocalizedStringSchema = z.object({
  ru: z.string(),
  en: z.string(),
});

// ── Combat ────────────────────────────────────────────────────────────────────

export const EnemyDropSchema = z.object({
  itemId: z.string().min(1),
  chance: z.number().min(0).max(100),
  amount: z.number().int().positive(),
});

export const EnemySchema = z.object({
  id: z.string().min(1),
  name: LocalizedStringSchema,
  tier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  hp: z.number().int().positive(),
  atk: z.number().int().positive(),
  weakPointTrigger: LocalizedStringSchema.optional(),
  furyReply: LocalizedStringSchema.optional(),
  drops: z.array(EnemyDropSchema).optional(),
});

export const BossPhaseSchema = z.object({
  hpThreshold: z.number().min(1).max(99),
  mechanic: LocalizedStringSchema,
});

export const BossSchema = EnemySchema.extend({
  isBoss: z.literal(true),
  breakBarMax: z.number().int().positive(),
  phases: z.array(BossPhaseSchema).min(1),
  furyAbility: LocalizedStringSchema,
  shieldMechanic: LocalizedStringSchema.optional(),
});

export const WaveEntrySchema = z.object({
  enemyId: z.string().min(1),
  weight: z.number().positive(),
});

const DifficultySchema = z.enum(['novice', 'amateur', 'professional', 'stuntman', 'hollywood', 'super_endless']);

export const WaveSchema = z.object({
  id: z.string().min(1),
  name: LocalizedStringSchema,
  enemyPool: z.array(WaveEntrySchema).min(1),
  bossId: z.string().optional(),
  difficulties: z.array(DifficultySchema).min(1),
});

export const InstinctDefSchema = z.object({
  id: z.string().min(1),
  name: LocalizedStringSchema,
  description: LocalizedStringSchema,
  passiveEffect: LocalizedStringSchema,
  unlockLevel: z.number().int().min(1),
});

export const ScenarioDefSchema = z.object({
  id: z.string().min(1),
  name: LocalizedStringSchema,
  condition: LocalizedStringSchema,
  reward: LocalizedStringSchema,
  availableDifficulties: z.array(DifficultySchema).min(1),
});

// ── Economy ───────────────────────────────────────────────────────────────────

export const BuildingTierSchema = z.object({
  levels: z.string().min(1),
  description: LocalizedStringSchema,
});

export const BuildingSchema = z.object({
  id: z.enum(['forge', 'tavern', 'shop', 'shaman', 'mine']),
  name: LocalizedStringSchema,
  ownerName: LocalizedStringSchema,
  icon: z.string(),
  maxLevel: z.number().int().min(1),
  tiers: z.array(BuildingTierSchema).min(1),
  customUpgradeCosts: z.array(z.number().int().positive()).optional(),
});

export const MercenarySchema = z.object({
  id: z.string().min(1),
  name: LocalizedStringSchema,
  rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']),
  costMin: z.number().int().min(0),
  costMax: z.number().int().min(0),
  durationHours: z.number().positive(),
  mineBonusPct: z.number().min(0),
  combatHelp: LocalizedStringSchema.optional(),
  tavernLevelRequired: z.number().int().min(1),
  isNamed: z.boolean().optional(),
  unlockCondition: LocalizedStringSchema.optional(),
});

export const RewardEntrySchema = z.object({
  difficulty: DifficultySchema,
  coinsMin: z.number().int().min(0),
  coinsMax: z.number().int().min(0),
  stallonkasMin: z.number().int().min(0),
  stallonkasMax: z.number().int().min(0),
  vhsChancePct: z.number().min(0).max(100),
  rareItemChancePct: z.number().min(0).max(100),
  xpMin: z.number().int().min(0),
  xpMax: z.number().int().min(0),
});

export const MineConfigSchema = z.object({
  baseCoinsPerHour: z.number().min(0),
  baseStallonkasPerHour: z.number().min(0),
  offlineEfficiencyPct: z.number().min(0).max(100),
  maxOfflineHours: z.number().min(1),
});

// ── Full combat pack (the exported game data) ─────────────────────────────────

export const CombatPackSchema = z.object({
  version: z.string(),
  exportedAt: z.string(),
  enemies: z.array(EnemySchema),
  bosses: z.array(BossSchema),
  waves: z.array(WaveSchema),
  instincts: z.array(InstinctDefSchema),
  scenarios: z.array(ScenarioDefSchema),
  buildings: z.array(BuildingSchema),
  mercenaries: z.array(MercenarySchema),
  rewardTables: z.array(RewardEntrySchema),
  mineConfig: MineConfigSchema,
});

export type CombatPack = z.infer<typeof CombatPackSchema>;
