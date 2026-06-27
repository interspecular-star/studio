import type { Difficulty } from './combat';

export type SignalType = 'red' | 'yellow' | 'blue';

export type AttackSignal = {
  instanceId: string;
  type: SignalType;
  enemyInstanceId: string;
  damage: number;
  windowTicks: number;
  ticksLeft: number;
};

export type SpawnedEnemy = {
  instanceId: string;
  enemyId: string;
  hp: number;
  hpMax: number;
  atk: number;
  stagger: number;          // 0–100
  isStaggered: boolean;
  staggerTicksLeft: number;
  isFuryMode: boolean;
  currentPhase: number;     // 0 = normal; 1, 2 = boss phases
  breakBar: number;         // 0–100 boss break bar
  isBoss: boolean;
  tickSinceSpawn: number;
};

export type CombatLogEntry = {
  tick: number;
  type:
    | 'playerAttack'
    | 'enemyAttack'
    | 'playerDodge'
    | 'playerParry'
    | 'enemySpawn'
    | 'enemyDeath'
    | 'showtime'
    | 'stagger'
    | 'phaseChange'
    | 'waveComplete'
    | 'playerDeath'
    | 'info';
  actorId?: string;
  value?: number;
  isCrit?: boolean;
  isWeakSpot?: boolean;
  text?: string;
};

export type CombatStatus = 'idle' | 'active' | 'paused' | 'victory' | 'defeat';

export type ScenarioProgress = {
  scenarioId: string;
  completed: boolean;
  failed: boolean;
};

export type CombatRewards = {
  coins: number;
  stallonkas: number;
  xp: number;
  items: string[];
  vhsDropped: boolean;
};

export type PlayerCombatStats = {
  str: number;
  agi: number;
  end: number;
  mag: number;
  lck: number;
  lvl: number;
};

export type CombatSession = {
  id: string;
  waveId: string;
  difficulty: Difficulty;
  status: CombatStatus;
  tick: number;

  playerStats: PlayerCombatStats;
  playerHp: number;
  playerHpMax: number;
  playerMp: number;
  playerMpMax: number;
  momentum: number;           // 1–15
  showtime: number;           // 0–100 buildup
  showtimeActive: boolean;
  showtimeTicks: number;
  activeInstinctId: string | null;

  enemies: SpawnedEnemy[];
  spawnQueue: string[];       // enemyIds (boss prefixed "boss:")
  totalKilled: number;
  bossSpawned: boolean;

  pendingSignal: AttackSignal | null;

  // Scenario tracking
  scenarioProgress: ScenarioProgress[];
  noDamageTicks: number;
  weakSpotHits: number;
  showtimeActivated: boolean;
  potionUsed: boolean;
  noHitStreak: number;

  rewards: CombatRewards;
  log: CombatLogEntry[];
};
