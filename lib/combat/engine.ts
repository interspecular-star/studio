import type { Enemy, Boss, Wave, Difficulty, SkillId } from '../types/combat';
import type {
  CombatSession, SpawnedEnemy, AttackSignal,
  CombatLogEntry, PlayerCombatStats, CombatRewards, ScenarioProgress,
} from '../types/combat-session';
import { DEFAULT_SCENARIOS, DEFAULT_RANDOM_EVENTS, DEFAULT_SKILLS, DEFAULT_SKILL_SLOTS } from '../types/combat';

// ── Stat derivation ───────────────────────────────────────────────────────────
// Canonical formulas — used by both engine and BalancePanel (imported there).
// At base naked hero (str=5 agi=5 end=10 mag=5 lck=5 lvl=1):
//   HP=100 MP=50 ATK=30 DEF=2 dodge=1.5% crit=5% critDmg=150%

export function derivePlayerStats(s: PlayerCombatStats) {
  const { str, agi, end: end_, mag, lck, lvl } = s;
  // Formulas from CDD §2-3:
  // ATK  = (STR×1.5 + weapon) × (1 + lvl×0.03)   — weapon=0 until equip system
  // HP   = END×10 + lvl×5
  // MP   = MAG×5
  // DEF% = lvl×0.5  (equipment adds on top)
  // Dodge = AGI×0.3%
  // Crit  = LCK×0.4%
  const levelMult = 1 + lvl * 0.03;
  return {
    hpMax:   end_ * 10 + lvl * 5,
    mpMax:   mag * 5,
    atk:     Math.max(1, Math.round(str * 1.5 * levelMult)),
    defFlat: 0,
    defPct:  +(lvl * 0.5).toFixed(1),
    dodge:   Math.min(40, +(agi * 0.3).toFixed(1)),
    critCh:  Math.min(60, +(lck * 0.4).toFixed(1)),
    critDmg: 150,
  };
}

// CDD §6.2: Momentum damage bonus is a step function, not linear
function momentumDmgMult(m: number): number {
  if (m >= 15) return 1.3;
  if (m >= 10) return 1.2;
  if (m >= 5)  return 1.1;
  return 1.0;
}

export const DEFAULT_PLAYER_STATS: PlayerCombatStats = {
  str: 5, agi: 5, end: 10, mag: 5, lck: 5, lvl: 1,
};

// ── Session initialisation ────────────────────────────────────────────────────

export function initCombatSession(
  wave: Wave,
  difficulty: Difficulty,
  playerStats: PlayerCombatStats = DEFAULT_PLAYER_STATS,
  instinctId: string | null = null,
  skillSlots: [SkillId | null, SkillId | null, SkillId | null] = DEFAULT_SKILL_SLOTS,
  scenarioIds?: string[],
): CombatSession {
  const derived = derivePlayerStats(playerStats);
  const spawnQueue = buildSpawnQueue(wave, difficulty);

  const availableScenarios = DEFAULT_SCENARIOS.filter(s => s.availableDifficulties.includes(difficulty));
  const scenarioProgress: ScenarioProgress[] = (
    scenarioIds !== undefined
      ? availableScenarios.filter(s => scenarioIds.includes(s.id))
      : availableScenarios
  ).map(s => ({ scenarioId: s.id, completed: false, failed: false }));

  return {
    id: `session_${Date.now()}`,
    waveId: wave.id,
    difficulty,
    status: 'active',
    tick: 0,

    playerStats,
    playerHp: derived.hpMax,
    playerHpMax: derived.hpMax,
    playerMp: derived.mpMax,
    playerMpMax: derived.mpMax,
    momentum: 1,
    showtime: 0,
    showtimeActive: false,
    showtimeTicks: 0,
    activeInstinctId: instinctId,

    enemies: [],
    spawnQueue,
    totalKilled: 0,
    bossSpawned: false,

    pendingSignal: null,
    playerFreezeTicks: 0,
    playerAttackCooldownTicks: 0,
    skillSlots,
    skillCooldowns: [0, 0, 0],
    pendingDodgeRoll: false,
    pendingCounter: false,

    scenarioProgress,
    noDamageTicks: 0,
    weakSpotHits: 0,
    showtimeActivated: false,
    potionUsed: false,
    noHitStreak: 0,
    maxMomentum: 1,

    randomEventsTriggered: 0,
    activeEventFlash: null,
    enragedTicks: 0,

    rewards: { coins: 0, stallonkas: 0, xp: 0, items: [], vhsDropped: false },
    log: [{ tick: 0, type: 'info', text: `Волна: ${wave.id} / сложность: ${difficulty}` }],
  };
}

// ── Enemy AI helpers ─────────────────────────────────────────────────────────

// Attack cooldown in ticks (200ms/tick → tier 1 = 1.6s, tier 5 = 0.8s)
function baseCooldown(tier: number, isFury: boolean): number {
  const base = [0, 8, 7, 6, 5, 4][Math.min(5, Math.max(1, tier))] ?? 6;
  return isFury ? Math.max(2, base - 2) : base;
}

// Signal type distribution by tier + phase + fury
// [blue%, yellow%, red%]
const TIER_SIGNAL: Record<number, [number, number, number]> = {
  1: [60, 30, 10],
  2: [45, 35, 20],
  3: [30, 35, 35],
  4: [20, 30, 50],
  5: [10, 20, 70],
};

function pickSignalType(tier: number, phase: number, isFury: boolean): AttackSignal['type'] {
  let [b, y, r] = TIER_SIGNAL[Math.min(5, Math.max(1, tier))] ?? [35, 35, 30];

  // Boss phase 1 (+15% yellow from blue)
  if (phase >= 1) { const s = Math.min(b, 15); b -= s; y += s; }
  // Boss phase 2 (+20% red from blue+yellow)
  if (phase >= 2) { const s = 20; const rb = Math.min(b, s); b -= rb; y -= Math.min(y, s - rb); r += s; }
  // Fury (+15% red from blue)
  if (isFury) { const s = Math.min(b, 15); b -= s; r += s; }

  const roll = Math.random() * 100;
  if (roll < b) return 'blue';
  if (roll < b + y) return 'yellow';
  return 'red';
}

// ── Spawn queue ───────────────────────────────────────────────────────────────

function buildSpawnQueue(wave: Wave, difficulty: Difficulty): string[] {
  const countMap: Record<Difficulty, number> = {
    novice: 3, amateur: 5, professional: 7, stuntman: 9, hollywood: 12, super_endless: 20,
  };
  const count = countMap[difficulty];
  const pool = wave.enemyPool;
  const totalWeight = pool.reduce((s, e) => s + e.weight, 0);
  const queue: string[] = [];

  for (let i = 0; i < count; i++) {
    let r = Math.random() * totalWeight;
    for (const entry of pool) {
      r -= entry.weight;
      if (r <= 0) { queue.push(entry.enemyId); break; }
    }
    if (queue.length <= i) queue.push(pool[0].enemyId); // fallback
  }

  const hasBoss = wave.bossId && ['professional', 'stuntman', 'hollywood', 'super_endless'].includes(difficulty);
  if (hasBoss && wave.bossId) queue.push(`boss:${wave.bossId}`);

  return queue;
}

// ── Spawn enemy ───────────────────────────────────────────────────────────────

export function spawnNextEnemy(session: CombatSession, enemy: Enemy | Boss): CombatSession {
  if (session.spawnQueue.length === 0) return session;
  const [, ...rest] = session.spawnQueue;
  const isBoss = 'isBoss' in enemy && enemy.isBoss;

  const tier = (enemy as any).tier ?? 1;
  const bbMax = isBoss ? ((enemy as Boss).breakBarMax ?? 100) : 0;
  const wpPause = 20 + Math.floor(Math.random() * 10); // initial weak-point pause: 4–6 sec
  const spawned: SpawnedEnemy = {
    instanceId: `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
    enemyId: enemy.id,
    hp: enemy.hp,
    hpMax: enemy.hp,
    atk: enemy.atk,
    tier,
    stagger: 0,
    isStaggered: false,
    staggerTicksLeft: 0,
    isFuryMode: false,
    currentPhase: 0,
    breakBar: bbMax,
    breakBarMax: bbMax,
    breakBarStunTicks: 0,
    freezeCooldownTicks: 0,
    isBoss,
    tickSinceSpawn: 0,
    attackCooldownTicks: baseCooldown(tier, false),
    weakPointActive: false,
    weakPointTimer: wpPause,
  };

  return {
    ...session,
    enemies: [...session.enemies, spawned],
    spawnQueue: rest,
    bossSpawned: isBoss || session.bossSpawned,
    log: [...session.log, { tick: session.tick, type: 'enemySpawn', actorId: enemy.id, text: enemy.name.ru }],
  };
}

// ── Player attack ─────────────────────────────────────────────────────────────

const STAGGER_PER_HIT = 34; // 3 hits = stagger

export function playerAttack(
  session: CombatSession,
  targetInstanceId: string,
  isWeakSpot = false,
  dmgOverrideMult = 1,
): CombatSession {
  if (session.status !== 'active') return session;
  if (session.playerFreezeTicks > 0) return session;
  if (session.playerAttackCooldownTicks > 0) return session;

  const target = session.enemies.find(e => e.instanceId === targetInstanceId);
  if (!target) return session;

  // Weak point is engine-driven (auto-timer), UI hint parameter is ignored
  const actualIsWeakSpot = target.weakPointActive;

  const derived = derivePlayerStats(session.playerStats);
  const isCrit = Math.random() * 100 < derived.critCh;
  const luckyMod = session.activeInstinctId === 'lucky' ? 0.9 : 1;
  // CDD §6.2: Showtime ×3.5 replaces Momentum bonus (doesn't stack)
  const showtimeMult  = session.showtimeActive ? 3.5 : 1;
  const mMult         = session.showtimeActive ? 1.0 : momentumDmgMult(session.momentum);
  const weakMult      = actualIsWeakSpot ? (session.activeInstinctId === 'hunter' ? 2.2 : 1.8) : 1;
  const critMult      = isCrit ? derived.critDmg / 100 : 1;
  const stunMult      = target.breakBarStunTicks > 0 ? 2 : 1;

  const rawDmg = Math.max(1, Math.round(derived.atk * luckyMod * mMult * weakMult * showtimeMult * critMult * stunMult * dmgOverrideMult));

  // Boss phase 1 shield: -50% incoming damage (removed by provoke skill in Block 3)
  const shieldMult = target.isBoss && target.currentPhase === 1 ? 0.5 : 1;
  const dmg = Math.max(1, Math.round(rawDmg * shieldMult));

  // Momentum
  const momentumGain = 1 + (isCrit && session.activeInstinctId === 'lucky' ? 1 : 0);
  const newMomentum = Math.min(15, session.momentum + momentumGain);

  // Showtime build (only when not active)
  const showtimeGain = session.showtimeActive ? 0 : Math.round(6 + newMomentum * 0.8);
  const newShowtime = Math.min(100, session.showtime + showtimeGain);

  // Stagger (regular enemies only — boss uses break bar)
  const staggerAdd = !target.isBoss
    ? (session.activeInstinctId === 'old_school' ? STAGGER_PER_HIT * 1.5 : STAGGER_PER_HIT)
    : 0;
  const newStaggerVal = Math.min(100, target.stagger + staggerAdd);
  const triggersStagger = !target.isBoss && newStaggerVal >= 100 && !target.isStaggered;

  // Break bar (boss only)
  let newBreakBar = target.breakBar;
  let newBreakBarStunTicks = target.breakBarStunTicks;
  if (target.isBoss && target.breakBarStunTicks === 0) {
    const bbDmg = actualIsWeakSpot ? 15 : session.showtimeActive ? 40 : 8;
    newBreakBar = Math.max(0, target.breakBar - bbDmg);
    if (newBreakBar === 0 && target.breakBar > 0) {
      newBreakBarStunTicks = 20; // 4 sec stun
      newBreakBar = target.breakBarMax; // reset after breaking
    }
  }

  // HP
  const newHp = Math.max(0, target.hp - dmg);
  const enemyDied = newHp <= 0;

  // Boss phase transitions
  let newPhase = target.currentPhase;
  let newFury = target.isFuryMode;
  let newFreezeCD = target.freezeCooldownTicks;
  if (target.isBoss && !enemyDied) {
    const hpPct = (newHp / target.hpMax) * 100;
    if (hpPct <= 30 && target.currentPhase < 2) {
      newPhase = 2; newFury = true; newFreezeCD = 100; // first freeze in 20 sec
    } else if (hpPct <= 60 && target.currentPhase < 1) {
      newPhase = 1; newFury = false; // shield mode, not fury
    }
  }

  const updatedEnemy: SpawnedEnemy = {
    ...target,
    hp: newHp,
    stagger: triggersStagger ? 0 : newStaggerVal,
    isStaggered: triggersStagger,
    staggerTicksLeft: triggersStagger ? 3 : target.staggerTicksLeft,
    isFuryMode: newFury,
    currentPhase: newPhase,
    breakBar: newBreakBar,
    breakBarStunTicks: newBreakBarStunTicks,
    freezeCooldownTicks: newFreezeCD,
  };

  const newEnemies = enemyDied
    ? session.enemies.filter(e => e.instanceId !== targetInstanceId)
    : session.enemies.map(e => e.instanceId === targetInstanceId ? updatedEnemy : e);

  const totalKilled = session.totalKilled + (enemyDied ? 1 : 0);
  const noHitStreak = enemyDied ? session.noHitStreak + 1 : session.noHitStreak;
  const weakSpotHits = session.weakSpotHits + (isWeakSpot ? 1 : 0);

  const logEntries: CombatLogEntry[] = [
    { tick: session.tick, type: 'playerAttack', actorId: targetInstanceId, value: dmg, isCrit, isWeakSpot: actualIsWeakSpot },
  ];
  if (triggersStagger) logEntries.push({ tick: session.tick, type: 'stagger', actorId: targetInstanceId });
  if (enemyDied) logEntries.push({ tick: session.tick, type: 'enemyDeath', actorId: target.enemyId, value: totalKilled });
  if (newPhase > target.currentPhase) logEntries.push({ tick: session.tick, type: 'phaseChange', actorId: targetInstanceId, value: newPhase });

  const next: CombatSession = {
    ...session,
    momentum: newMomentum,
    maxMomentum: Math.max(session.maxMomentum, newMomentum),
    showtime: newShowtime,
    enemies: newEnemies,
    totalKilled,
    noHitStreak,
    weakSpotHits,
    playerAttackCooldownTicks: 5, // 1 second cooldown between attacks
    log: [...session.log, ...logEntries],
  };

  const withScenarios = checkScenarios(next, 'kill', { fastKill: enemyDied && target.tickSinceSpawn <= 15 });
  return checkWaveCompletion(withScenarios);
}

// ── Activate Showtime ─────────────────────────────────────────────────────────

export function activateShowtime(session: CombatSession): CombatSession {
  if (session.showtime < 100 || session.showtimeActive) return session;
  const next: CombatSession = {
    ...session,
    showtime: 0,
    showtimeActive: true,
    showtimeTicks: 20,
    showtimeActivated: true,
    log: [...session.log, { tick: session.tick, type: 'showtime', text: 'SHOWTIME!' }],
  };
  return checkScenarios(next, 'showtime');
}

// ── Enemy signal generation ───────────────────────────────────────────────────

export function generateEnemySignal(session: CombatSession, enemy: SpawnedEnemy): CombatSession {
  if (session.pendingSignal || enemy.isStaggered || session.status !== 'active') return session;

  const type = pickSignalType(enemy.tier, enemy.currentPhase, enemy.isFuryMode);
  // Red signals give less time; higher tier bosses also tighten the window
  const baseWindow = type === 'red' ? 3 : type === 'yellow' ? 4 : 5;
  const tierBonus = enemy.isBoss && enemy.currentPhase >= 2 ? -1 : 0;
  const window = Math.max(2, baseWindow + tierBonus);

  const furyMult = enemy.isFuryMode
    ? (enemy.isBoss && enemy.currentPhase >= 2 ? 1.5 : 1.4)
    : 1;
  const signal: AttackSignal = {
    instanceId: `sig_${Date.now().toString(36)}`,
    type,
    enemyInstanceId: enemy.instanceId,
    damage: Math.round(enemy.atk * furyMult),
    windowTicks: window,
    ticksLeft: window,
  };

  return { ...session, pendingSignal: signal };
}

// ── Player reaction ───────────────────────────────────────────────────────────

export function playerReact(session: CombatSession, reaction: 'dodge' | 'parry'): CombatSession {
  if (!session.pendingSignal || session.status !== 'active') return session;
  if (session.playerFreezeTicks > 0) return applyEnemyDamage(session); // frozen = can't react

  const signal = session.pendingSignal;
  const canParry = signal.type === 'yellow';
  if (reaction === 'parry' && !canParry) return applyEnemyDamage(session);

  const stuntmanBonus = session.activeInstinctId === 'stuntman' ? 1 : 0;
  const newMomentum = Math.min(15, session.momentum + 1 + stuntmanBonus);
  const mpGain = session.activeInstinctId === 'stuntman'
    ? Math.round(session.playerMpMax * 0.03) : 0;
  const showtimeGain = reaction === 'parry' ? 14 : 10;

  // Reset attacker's cooldown after the signal is resolved
  const newEnemies = session.enemies.map(e =>
    e.instanceId === signal.enemyInstanceId
      ? { ...e, attackCooldownTicks: baseCooldown(e.tier, e.isFuryMode) }
      : e
  );

  return {
    ...session,
    pendingSignal: null,
    enemies: newEnemies,
    momentum: newMomentum,
    playerMp: Math.min(session.playerMpMax, session.playerMp + mpGain),
    showtime: Math.min(100, session.showtime + showtimeGain),
    log: [...session.log, { tick: session.tick, type: reaction === 'dodge' ? 'playerDodge' : 'playerParry', actorId: signal.enemyInstanceId }],
  };
}

// ── Apply enemy damage (signal expired or wrong reaction) ─────────────────────

export function applyEnemyDamage(session: CombatSession): CombatSession {
  if (!session.pendingSignal) return session;

  const signal = session.pendingSignal;
  const derived = derivePlayerStats(session.playerStats);

  // Dodge Roll skill: guaranteed dodge of next hit
  if (session.pendingDodgeRoll) {
    const mpGain = session.activeInstinctId === 'stuntman' ? Math.round(session.playerMpMax * 0.03) : 0;
    const mBonus = session.activeInstinctId === 'stuntman' ? 1 : 0;
    return {
      ...session,
      pendingSignal: null,
      pendingDodgeRoll: false,
      playerMp: Math.min(session.playerMpMax, session.playerMp + mpGain),
      momentum: Math.min(15, session.momentum + 1 + mBonus),
      log: [...session.log, { tick: session.tick, type: 'playerDodge', actorId: signal.enemyInstanceId, text: 'roll' }],
    };
  }

  // Counter skill: auto-react correctly to any signal type
  if (session.pendingCounter) {
    const reaction = signal.type === 'yellow' ? 'parry' : 'dodge';
    return playerReact({ ...session, pendingCounter: false }, reaction);
  }

  // Passive dodge from AGI (doesn't reset Momentum — it's a passive slip)
  if (Math.random() * 100 < derived.dodge) {
    const mpGain = session.activeInstinctId === 'stuntman' ? Math.round(session.playerMpMax * 0.03) : 0;
    const stuntmanBonus = session.activeInstinctId === 'stuntman' ? 1 : 0;
    return {
      ...session,
      pendingSignal: null,
      playerMp: Math.min(session.playerMpMax, session.playerMp + mpGain),
      momentum: Math.min(15, session.momentum + stuntmanBonus),
      log: [...session.log, { tick: session.tick, type: 'playerDodge', actorId: signal.enemyInstanceId, text: 'passive' }],
    };
  }

  const rawDmg = signal.damage;
  const reduced = Math.round(rawDmg * (1 - derived.defPct / 100) - derived.defFlat);
  let finalDmg = Math.max(1, reduced);

  if (session.activeInstinctId === 'veteran' && session.playerHp / session.playerHpMax < 0.2) {
    finalDmg = Math.max(1, Math.round(finalDmg * 0.6));
  }
  if (session.enragedTicks > 0) {
    finalDmg = Math.round(finalDmg * 1.3);
  }

  const newHp = Math.max(0, session.playerHp - finalDmg);
  const died = newHp <= 0;

  // Reset attacker's cooldown after the hit lands
  const enemiesAfterHit = session.enemies.map(e =>
    e.instanceId === signal.enemyInstanceId
      ? { ...e, attackCooldownTicks: baseCooldown(e.tier, e.isFuryMode) }
      : e
  );

  let next: CombatSession = {
    ...session,
    pendingSignal: null,
    enemies: enemiesAfterHit,
    playerHp: newHp,
    momentum: 1,          // momentum resets on taking damage
    noDamageTicks: 0,
    noHitStreak: 0,
    log: [...session.log, { tick: session.tick, type: 'enemyAttack', actorId: signal.enemyInstanceId, value: finalDmg }],
  };

  if (died) {
    next = { ...next, status: 'defeat', log: [...next.log, { tick: next.tick, type: 'playerDeath' }] };
  } else if (session.activeInstinctId === 'veteran' && newHp / session.playerHpMax < 0.2 && session.showtime < 100) {
    next = { ...next, showtime: 100 };
  }

  return checkScenarios(next, 'damage');
}

// ── Tick (advance time) ───────────────────────────────────────────────────────

export function tick(session: CombatSession): CombatSession {
  if (session.status !== 'active') return session;

  const nextTick = session.tick + 1;
  let next: CombatSession = {
    ...session,
    tick: nextTick,
    noDamageTicks: session.noDamageTicks + 1,
    enragedTicks: Math.max(0, session.enragedTicks - 1),
    playerFreezeTicks: Math.max(0, session.playerFreezeTicks - 1),
    activeEventFlash: session.activeEventFlash
      ? (session.activeEventFlash.ticksLeft > 1
          ? { ...session.activeEventFlash, ticksLeft: session.activeEventFlash.ticksLeft - 1 }
          : null)
      : null,
  };

  // HP regen: +1 HP every 5 ticks (1 HP/sec)
  if (nextTick % 5 === 0 && next.playerHp < next.playerHpMax) {
    next = { ...next, playerHp: Math.min(next.playerHpMax, next.playerHp + 1) };
  }
  // MP regen: +1 MP every 10 ticks (0.5 MP/sec)
  if (nextTick % 10 === 0 && next.playerMp < next.playerMpMax) {
    next = { ...next, playerMp: Math.min(next.playerMpMax, next.playerMp + 1) };
  }

  // Skill cooldown countdown
  const [cd0, cd1, cd2] = next.skillCooldowns;
  if (cd0 > 0 || cd1 > 0 || cd2 > 0) {
    next = {
      ...next,
      skillCooldowns: [Math.max(0, cd0 - 1), Math.max(0, cd1 - 1), Math.max(0, cd2 - 1)],
    };
  }

  // Player attack cooldown (1 sec = 5 ticks)
  if (next.playerAttackCooldownTicks > 0) {
    next = { ...next, playerAttackCooldownTicks: next.playerAttackCooldownTicks - 1 };
  }

  // 2% chance per tick for a random event (not during active signal)
  if (!next.pendingSignal && !next.activeEventFlash && Math.random() < 0.02) {
    next = triggerRandomEvent(next);
  }

  // Showtime countdown
  if (next.showtimeActive) {
    const t = next.showtimeTicks - 1;
    next = t <= 0
      ? { ...next, showtimeActive: false, showtimeTicks: 0 }
      : { ...next, showtimeTicks: t };
  }

  // Signal expiry
  if (next.pendingSignal) {
    const tl = next.pendingSignal.ticksLeft - 1;
    next = tl <= 0
      ? applyEnemyDamage({ ...next, pendingSignal: { ...next.pendingSignal, ticksLeft: 0 } })
      : { ...next, pendingSignal: { ...next.pendingSignal, ticksLeft: tl } };
  }

  // Enemy tick
  let freezeTriggered = false;
  next = {
    ...next,
    enemies: next.enemies.map(e => {
      let u = { ...e, tickSinceSpawn: e.tickSinceSpawn + 1 };

      // Weak point cycle: active window 10–15 ticks (2–3 sec), pause 20–30 ticks (4–6 sec)
      const wpTimer = u.weakPointTimer - 1;
      if (wpTimer <= 0) {
        u = {
          ...u,
          weakPointActive: !u.weakPointActive,
          weakPointTimer: u.weakPointActive
            ? 20 + Math.floor(Math.random() * 10) // active → pause: 4–6 sec
            : 10 + Math.floor(Math.random() * 5),  // pause → active: 2–3 sec
        };
      } else {
        u = { ...u, weakPointTimer: wpTimer };
      }

      if (u.isBoss) {
        // Break stun countdown
        if (u.breakBarStunTicks > 0) {
          u = { ...u, breakBarStunTicks: u.breakBarStunTicks - 1 };
        }
        // Break bar slow regen in phase 2 (+5 every 30 ticks)
        if (u.currentPhase >= 2 && u.breakBarStunTicks === 0 && nextTick % 30 === 0) {
          u = { ...u, breakBar: Math.min(u.breakBarMax, u.breakBar + 5) };
        }
        // Phase 2 freeze ability: trigger every 20 sec (100 ticks)
        if (u.currentPhase >= 2) {
          const fcd = u.freezeCooldownTicks - 1;
          if (fcd <= 0 && !freezeTriggered) {
            freezeTriggered = true;
            u = { ...u, freezeCooldownTicks: 100 };
          } else {
            u = { ...u, freezeCooldownTicks: Math.max(0, fcd) };
          }
        }
      }

      // Stagger countdown (regular enemies only)
      if (u.isStaggered && !u.isBoss) {
        if (u.staggerTicksLeft > 1) {
          u = { ...u, staggerTicksLeft: u.staggerTicksLeft - 1 };
        } else {
          u = { ...u, isStaggered: false, staggerTicksLeft: 0, stagger: 0, isFuryMode: true, attackCooldownTicks: 0 };
        }
      } else if (!u.isStaggered && u.breakBarStunTicks === 0) {
        u = { ...u, attackCooldownTicks: Math.max(0, u.attackCooldownTicks - 1) };
      }

      return u;
    }),
  };

  // Boss Stop-frame: freeze hero for 2 sec (10 ticks), log event
  if (freezeTriggered && next.playerFreezeTicks === 0) {
    next = {
      ...next,
      playerFreezeTicks: 10,
      log: [...next.log, { tick: nextTick, type: 'info', text: '🎬 СТОП-КАДР! Герой заморожен!' }],
    };
  }

  // Auto-generate signal: find first ready enemy (cooldown = 0, not staggered/stunned)
  if (!next.pendingSignal && next.status === 'active') {
    const ready = next.enemies.find(e => e.attackCooldownTicks === 0 && !e.isStaggered && e.breakBarStunTicks === 0);
    if (ready) {
      next = generateEnemySignal(next, ready);
      if (next.pendingSignal) {
        next = {
          ...next,
          enemies: next.enemies.map(e =>
            e.instanceId === ready.instanceId
              ? { ...e, attackCooldownTicks: baseCooldown(e.tier, e.isFuryMode) }
              : e
          ),
        };
      }
    }
  }

  return next;
}

// ── Active skills ─────────────────────────────────────────────────────────────

export function useSkill(session: CombatSession, slotIndex: 0 | 1 | 2): CombatSession {
  if (session.status !== 'active') return session;
  if (session.playerFreezeTicks > 0) return session;

  const skillId = session.skillSlots[slotIndex];
  if (!skillId) return session;
  if (session.skillCooldowns[slotIndex] > 0) return session;

  const skill = DEFAULT_SKILLS[skillId];
  if (session.playerMp < skill.mpCost) return session;

  const newCDs = [...session.skillCooldowns] as [number, number, number];
  newCDs[slotIndex] = skill.cooldownTicks;

  let next: CombatSession = {
    ...session,
    playerMp: session.playerMp - skill.mpCost,
    skillCooldowns: newCDs,
    log: [...session.log, { tick: session.tick, type: 'info', text: `[${skill.name.ru}]` }],
  };

  switch (skillId) {
    case 'strong_hit': {
      const target = next.enemies[0];
      if (target) next = playerAttack(next, target.instanceId, false, 2.5);
      break;
    }
    case 'dodge_roll':
      next = { ...next, pendingDodgeRoll: true };
      break;
    case 'provoke': {
      next = {
        ...next,
        enemies: next.enemies.map(e => ({
          ...e,
          // Skip next attack: push cooldown forward
          attackCooldownTicks: Math.max(e.attackCooldownTicks, baseCooldown(e.tier, e.isFuryMode) + 8),
          // Remove boss phase 1 shield
          currentPhase: (e.isBoss && e.currentPhase === 1) ? 0 : e.currentPhase,
          isFuryMode: (e.isBoss && e.currentPhase === 1) ? false : e.isFuryMode,
        })),
      };
      break;
    }
    case 'counter':
      next = { ...next, pendingCounter: true };
      break;
    case 'dash': {
      const target = next.enemies[0];
      if (target) {
        next = playerAttack(next, target.instanceId, false, 0.8);
        // Reset one random cooldown by 50%
        const cds = [...next.skillCooldowns] as [number, number, number];
        const candidates = ([0, 1, 2] as const).filter(i => i !== slotIndex && cds[i] > 0);
        if (candidates.length > 0) {
          const pick = candidates[Math.floor(Math.random() * candidates.length)];
          cds[pick] = Math.max(0, Math.floor(cds[pick] * 0.5));
          next = { ...next, skillCooldowns: cds };
        }
      }
      break;
    }
    case 'quick_potion':
      next = { ...next, playerHp: Math.min(next.playerHpMax, next.playerHp + 50), potionUsed: true };
      break;
  }

  return next;
}

// ── Random events ─────────────────────────────────────────────────────────────

export function triggerRandomEvent(session: CombatSession): CombatSession {
  if (DEFAULT_RANDOM_EVENTS.length === 0) return session;
  const def = DEFAULT_RANDOM_EVENTS[Math.floor(Math.random() * DEFAULT_RANDOM_EVENTS.length)];
  const { effect, magnitude } = def;

  let next: CombatSession = {
    ...session,
    randomEventsTriggered: session.randomEventsTriggered + 1,
    activeEventFlash: { name: def.name.ru, ticksLeft: 8 },
    log: [...session.log, { tick: session.tick, type: 'randomEvent', text: def.name.ru }],
  };

  switch (effect) {
    case 'momentum_boost':
      next = { ...next, momentum: Math.min(15, next.momentum + magnitude) };
      break;
    case 'showtime_boost':
      next = { ...next, showtime: Math.min(100, next.showtime + magnitude) };
      break;
    case 'player_heal': {
      const heal = Math.round(next.playerHpMax * magnitude / 100);
      next = { ...next, playerHp: Math.min(next.playerHpMax, next.playerHp + heal) };
      break;
    }
    case 'player_damage': {
      const dmg = Math.max(1, Math.round(next.playerHpMax * magnitude / 100));
      const newHp = Math.max(0, next.playerHp - dmg);
      next = { ...next, playerHp: newHp };
      if (newHp <= 0) next = { ...next, status: 'defeat' };
      break;
    }
    case 'enemy_rage':
      next = { ...next, enragedTicks: magnitude };
      break;
  }

  return next;
}

// ── Scenario evaluation ───────────────────────────────────────────────────────

type ScenarioTrigger = 'kill' | 'showtime' | 'damage' | 'wave_end';

function checkScenarios(
  session: CombatSession,
  trigger: ScenarioTrigger,
  opts: { fastKill?: boolean } = {},
): CombatSession {
  if (session.scenarioProgress.length === 0) return session;

  const directorsActive = session.activeInstinctId === 'directors_favorite';
  let showtimeBonus = 0;

  const updatedProgress = session.scenarioProgress.map(sp => {
    if (sp.completed || sp.failed) return sp;

    let completed = false;
    let failed = false;

    switch (sp.scenarioId) {
      case 'method_actor':
        completed = session.showtimeActivated;
        break;
      case 'combo_master':
        completed = session.momentum >= 15;
        break;
      case 'weak_spot':
        completed = session.weakSpotHits >= 5;
        break;
      case 'silent_killer':
        completed = session.noHitStreak >= 3;
        break;
      case 'take':
        if (trigger === 'kill') completed = !!opts.fastKill;
        break;
      case 'no_takes':
        if (trigger === 'damage') failed = true;
        if (trigger === 'wave_end') completed = session.noDamageTicks > 0 && !sp.failed;
        break;
      case 'bare_minimum':
        if (trigger === 'wave_end') { completed = !session.potionUsed; failed = session.potionUsed; }
        break;
      case 'no_cheating':
        // 'paused' status is not implemented yet — always satisfied
        if (trigger === 'wave_end') { completed = true; }
        break;
      case 'on_the_edge':
        if (trigger === 'wave_end' && session.bossSpawned) {
          completed = session.playerHp / session.playerHpMax < 0.15;
          failed = !completed;
        }
        break;
      case 'full_chaos':
        if (trigger === 'wave_end') {
          completed = session.randomEventsTriggered >= 2;
          failed = !completed;
        }
        break;
    }

    if (completed && directorsActive) showtimeBonus += 20;

    return { ...sp, completed: sp.completed || completed, failed: sp.failed || failed };
  });

  return {
    ...session,
    scenarioProgress: updatedProgress,
    showtime: Math.min(100, session.showtime + showtimeBonus),
  };
}

// ── Wave completion ───────────────────────────────────────────────────────────

export function checkWaveCompletion(session: CombatSession): CombatSession {
  if (session.enemies.length > 0 || session.spawnQueue.length > 0) return session;

  const evaluated = checkScenarios(session, 'wave_end');
  return {
    ...evaluated,
    status: 'victory',
    rewards: calcRewards(evaluated),
    log: [...evaluated.log, { tick: session.tick, type: 'waveComplete', text: 'Волна завершена!' }],
  };
}

// ── Reward calculation ────────────────────────────────────────────────────────

function calcRewards(session: CombatSession): CombatRewards {
  const diffMult: Record<Difficulty, number> = {
    novice: 0.5, amateur: 1, professional: 1.5, stuntman: 2, hollywood: 3, super_endless: 5,
  };
  const mult = diffMult[session.difficulty];
  const killed = session.totalKilled;

  let coinMult = 1, xpMult = 1, stallMult = 1;
  for (const sp of session.scenarioProgress) {
    if (!sp.completed) continue;
    if (sp.scenarioId === 'no_takes')     xpMult   += 0.3;
    if (sp.scenarioId === 'bare_minimum') coinMult  += 0.2;
    if (sp.scenarioId === 'no_cheating')  stallMult += 0.5;
  }

  const vhsDropped = session.scenarioProgress.some(s => s.scenarioId === 'method_actor' && s.completed);

  return {
    coins:      Math.round(80  * mult * killed * coinMult),
    xp:         Math.round(40  * mult          * xpMult),
    stallonkas: Math.round(8   * mult          * stallMult),
    items:      [],
    vhsDropped,
  };
}

// ── Combat simulation (for balance testing) ───────────────────────────────────

export type SimulationResult = {
  iterations: number;
  winRate: number;       // 0–100 %
  avgKills: number;
  avgTicks: number;
  avgCoins: number;
  avgXp: number;
  scenarioRates: Record<string, number>; // scenarioId → completion %
};

export function simulateCombat(
  wave: Wave,
  difficulty: Difficulty,
  enemies: Enemy[],
  bosses: Boss[],
  playerStats: PlayerCombatStats = DEFAULT_PLAYER_STATS,
  instinctId: string | null = null,
  iterations = 50,
): SimulationResult {
  let wins = 0, totalKills = 0, totalTicks = 0, totalCoins = 0, totalXp = 0;
  const scenarioCounts: Record<string, number> = {};

  for (let i = 0; i < iterations; i++) {
    let s = initCombatSession(wave, difficulty, playerStats, instinctId);
    const MAX_TICKS = 2000;

    while (s.status === 'active' && s.tick < MAX_TICKS) {
      // Auto-spawn
      if (s.enemies.length === 0 && s.spawnQueue.length > 0) {
        const nextId = s.spawnQueue[0];
        const isBoss = nextId.startsWith('boss:');
        const id = isBoss ? nextId.slice(5) : nextId;
        const enemy = isBoss ? bosses.find(b => b.id === id) : enemies.find(e => e.id === id);
        if (enemy) s = spawnNextEnemy(s, enemy);
      }
      // Auto-react to signal
      if (s.pendingSignal) {
        s = playerReact(s, s.pendingSignal.type === 'yellow' ? 'parry' : 'dodge');
        continue;
      }
      // Auto-showtime
      if (s.showtime >= 100 && !s.showtimeActive) {
        s = activateShowtime(s);
      }
      // Auto-attack first enemy
      if (s.enemies.length > 0) {
        s = playerAttack(s, s.enemies[0].instanceId, false);
      }
      // Advance time
      s = tick(s);
    }

    if (s.status === 'victory') {
      wins++;
      totalCoins += s.rewards.coins;
      totalXp    += s.rewards.xp;
      for (const sp of s.scenarioProgress) {
        if (sp.completed) scenarioCounts[sp.scenarioId] = (scenarioCounts[sp.scenarioId] ?? 0) + 1;
      }
    }
    totalKills += s.totalKilled;
    totalTicks += s.tick;
  }

  const scenarioRates: Record<string, number> = {};
  for (const [id, count] of Object.entries(scenarioCounts)) {
    scenarioRates[id] = Math.round((count / iterations) * 100);
  }

  return {
    iterations,
    winRate:  Math.round((wins / iterations) * 100),
    avgKills: Math.round(totalKills / iterations * 10) / 10,
    avgTicks: Math.round(totalTicks / iterations),
    avgCoins: Math.round(totalCoins / wins || 0),
    avgXp:    Math.round(totalXp    / wins || 0),
    scenarioRates,
  };
}
