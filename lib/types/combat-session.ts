import type { Difficulty, SkillId } from './combat';

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
  tier: number;               // 1–5, drives AI aggression
  stagger: number;            // 0–100
  isStaggered: boolean;
  staggerTicksLeft: number;
  isFuryMode: boolean;
  currentPhase: number;       // 0 = normal; 1 = shield; 2 = fury (boss)
  breakBar: number;           // 0–breakBarMax, boss only
  breakBarMax: number;        // max break bar (boss only, 0 for regulars)
  breakBarStunTicks: number;  // ticks remaining in break-stun (player deals ×2)
  freezeCooldownTicks: number;// boss phase 2: ticks until next hero-freeze
  isBoss: boolean;
  tickSinceSpawn: number;
  attackCooldownTicks: number;
  weakPointActive: boolean;   // auto-cycled by tick()
  weakPointTimer: number;     // ticks until weak point state flips
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
    | 'randomEvent'
    | 'info';
  actorId?: string;
  value?: number;
  isCrit?: boolean;
  isWeakSpot?: boolean;
  text?: string;
};

export type EventFlash = { name: string; ticksLeft: number };

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

  playerFreezeTicks: number;    // hero can't act while > 0 (boss Stop-frame)
  playerAttackCooldownTicks: number; // 1-sec cooldown between manual attacks (5 ticks)

  skillSlots: [SkillId | null, SkillId | null, SkillId | null];
  skillCooldowns: [number, number, number]; // ticks until ready
  pendingDodgeRoll: boolean;  // dodge_roll: auto-dodge next incoming signal
  pendingCounter: boolean;    // counter: auto-react correctly to next signal

  // Scenario tracking
  scenarioProgress: ScenarioProgress[];
  noDamageTicks: number;
  weakSpotHits: number;
  showtimeActivated: boolean;
  potionUsed: boolean;
  noHitStreak: number;
  maxMomentum: number;

  // Random events
  randomEventsTriggered: number;
  activeEventFlash: EventFlash | null;
  enragedTicks: number; // camera_malfunction: enemies deal +30% dmg

  rewards: CombatRewards;
  log: CombatLogEntry[];
};
