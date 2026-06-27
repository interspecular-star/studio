import type { Enemy, Boss, Wave, Difficulty } from '../types/combat';
import type {
  CombatSession, SpawnedEnemy, AttackSignal,
  CombatLogEntry, PlayerCombatStats, CombatRewards, ScenarioProgress,
} from '../types/combat-session';
import { DEFAULT_SCENARIOS } from '../types/combat';

// ── Stat derivation (mirrors BalancePanel formulas) ──────────────────────────

export function derivePlayerStats(s: PlayerCombatStats) {
  const { str, agi, end: end_, mag, lck, lvl } = s;
  return {
    hpMax:   Math.round((80 + end_ * 12 + lvl * 8) * (1 + lck * 0.02)),
    mpMax:   Math.round(40 + mag * 10 + lvl * 5),
    atk:     Math.round(str * 4 + agi * 1.5 + lvl * 2),
    defFlat: Math.round(end_ * 2 + str * 0.5),
    defPct:  Math.min(75, Math.round(end_ * 0.8 + agi * 0.3)),
    critCh:  Math.min(95, Math.round(lck * 3 + agi * 1.5)),
    critDmg: Math.round(150 + lck * 5),
  };
}

export const DEFAULT_PLAYER_STATS: PlayerCombatStats = {
  str: 6, agi: 5, end: 5, mag: 3, lck: 4, lvl: 1,
};

// ── Session initialisation ────────────────────────────────────────────────────

export function initCombatSession(
  wave: Wave,
  difficulty: Difficulty,
  playerStats: PlayerCombatStats = DEFAULT_PLAYER_STATS,
  instinctId: string | null = null,
): CombatSession {
  const derived = derivePlayerStats(playerStats);
  const spawnQueue = buildSpawnQueue(wave, difficulty);

  const scenarioProgress: ScenarioProgress[] = DEFAULT_SCENARIOS
    .filter(s => s.availableDifficulties.includes(difficulty))
    .map(s => ({ scenarioId: s.id, completed: false, failed: false }));

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

    scenarioProgress,
    noDamageTicks: 0,
    weakSpotHits: 0,
    showtimeActivated: false,
    potionUsed: false,
    noHitStreak: 0,

    rewards: { coins: 0, stallonkas: 0, xp: 0, items: [], vhsDropped: false },
    log: [{ tick: 0, type: 'info', text: `Волна: ${wave.id} / сложность: ${difficulty}` }],
  };
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

  const spawned: SpawnedEnemy = {
    instanceId: `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
    enemyId: enemy.id,
    hp: enemy.hp,
    hpMax: enemy.hp,
    atk: enemy.atk,
    stagger: 0,
    isStaggered: false,
    staggerTicksLeft: 0,
    isFuryMode: false,
    currentPhase: 0,
    breakBar: 0,
    isBoss,
    tickSinceSpawn: 0,
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
): CombatSession {
  if (session.status !== 'active') return session;

  const target = session.enemies.find(e => e.instanceId === targetInstanceId);
  if (!target) return session;

  const derived = derivePlayerStats(session.playerStats);
  const isCrit = Math.random() * 100 < derived.critCh;
  const luckyMod = session.activeInstinctId === 'lucky' ? 0.9 : 1; // -10% base dmg
  const momentumMult = 1 + (session.momentum - 1) * 0.05;
  const weakMult = isWeakSpot ? (session.activeInstinctId === 'hunter' ? 2.2 : 1.8) : 1;
  const showtimeMult = session.showtimeActive ? 1.5 : 1;
  const critMult = isCrit ? derived.critDmg / 100 : 1;

  const dmg = Math.max(1, Math.round(derived.atk * luckyMod * momentumMult * weakMult * showtimeMult * critMult));

  // Momentum
  const momentumGain = 1 + (isCrit && session.activeInstinctId === 'lucky' ? 1 : 0);
  const newMomentum = Math.min(15, session.momentum + momentumGain);

  // Showtime build (only when not active)
  const showtimeGain = session.showtimeActive ? 0 : Math.round(6 + newMomentum * 0.8);
  const newShowtime = Math.min(100, session.showtime + showtimeGain);

  // Stagger
  const staggerAdd = session.activeInstinctId === 'old_school' ? STAGGER_PER_HIT * 1.5 : STAGGER_PER_HIT;
  const newStaggerVal = Math.min(100, target.stagger + staggerAdd);
  const triggersStagger = newStaggerVal >= 100 && !target.isStaggered;

  // HP
  const newHp = Math.max(0, target.hp - dmg);
  const enemyDied = newHp <= 0;

  // Boss phase transitions
  let newPhase = target.currentPhase;
  let newFury = target.isFuryMode;
  if (target.isBoss && !enemyDied) {
    const hpPct = (newHp / target.hpMax) * 100;
    if (hpPct <= 30 && target.currentPhase < 2) { newPhase = 2; newFury = true; }
    else if (hpPct <= 60 && target.currentPhase < 1) { newPhase = 1; newFury = true; }
  }

  const updatedEnemy: SpawnedEnemy = {
    ...target,
    hp: newHp,
    stagger: triggersStagger ? 0 : newStaggerVal,
    isStaggered: triggersStagger,
    staggerTicksLeft: triggersStagger ? 3 : target.staggerTicksLeft,
    isFuryMode: newFury,
    currentPhase: newPhase,
  };

  const newEnemies = enemyDied
    ? session.enemies.filter(e => e.instanceId !== targetInstanceId)
    : session.enemies.map(e => e.instanceId === targetInstanceId ? updatedEnemy : e);

  const totalKilled = session.totalKilled + (enemyDied ? 1 : 0);
  const noHitStreak = enemyDied ? session.noHitStreak + 1 : session.noHitStreak;
  const weakSpotHits = session.weakSpotHits + (isWeakSpot ? 1 : 0);

  const logEntries: CombatLogEntry[] = [
    { tick: session.tick, type: 'playerAttack', actorId: targetInstanceId, value: dmg, isCrit, isWeakSpot },
  ];
  if (triggersStagger) logEntries.push({ tick: session.tick, type: 'stagger', actorId: targetInstanceId });
  if (enemyDied) logEntries.push({ tick: session.tick, type: 'enemyDeath', actorId: target.enemyId, value: totalKilled });
  if (newPhase > target.currentPhase) logEntries.push({ tick: session.tick, type: 'phaseChange', actorId: targetInstanceId, value: newPhase });

  const next: CombatSession = {
    ...session,
    momentum: newMomentum,
    showtime: newShowtime,
    enemies: newEnemies,
    totalKilled,
    noHitStreak,
    weakSpotHits,
    log: [...session.log, ...logEntries],
  };

  return checkWaveCompletion(next);
}

// ── Activate Showtime ─────────────────────────────────────────────────────────

export function activateShowtime(session: CombatSession): CombatSession {
  if (session.showtime < 100 || session.showtimeActive) return session;
  return {
    ...session,
    showtime: 0,
    showtimeActive: true,
    showtimeTicks: 20,
    showtimeActivated: true,
    log: [...session.log, { tick: session.tick, type: 'showtime', text: 'SHOWTIME!' }],
  };
}

// ── Enemy signal generation ───────────────────────────────────────────────────

export function generateEnemySignal(session: CombatSession, enemy: SpawnedEnemy): CombatSession {
  if (session.pendingSignal || enemy.isStaggered || session.status !== 'active') return session;

  const r = Math.random();
  const type: AttackSignal['type'] = r < 0.35 ? 'blue' : r < 0.7 ? 'yellow' : 'red';
  const window = type === 'red' ? 4 : 3;

  const signal: AttackSignal = {
    instanceId: `sig_${Date.now().toString(36)}`,
    type,
    enemyInstanceId: enemy.instanceId,
    damage: enemy.isFuryMode ? Math.round(enemy.atk * 1.4) : enemy.atk,
    windowTicks: window,
    ticksLeft: window,
  };

  return { ...session, pendingSignal: signal };
}

// ── Player reaction ───────────────────────────────────────────────────────────

export function playerReact(session: CombatSession, reaction: 'dodge' | 'parry'): CombatSession {
  if (!session.pendingSignal || session.status !== 'active') return session;

  const signal = session.pendingSignal;
  const canParry = signal.type === 'yellow';
  if (reaction === 'parry' && !canParry) return applyEnemyDamage(session);

  const stuntmanBonus = session.activeInstinctId === 'stuntman' ? 1 : 0;
  const newMomentum = Math.min(15, session.momentum + 1 + stuntmanBonus);
  const mpGain = session.activeInstinctId === 'stuntman'
    ? Math.round(session.playerMpMax * 0.03) : 0;
  const showtimeGain = reaction === 'parry' ? 14 : 10;

  return {
    ...session,
    pendingSignal: null,
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

  const rawDmg = signal.damage;
  const reduced = Math.round(rawDmg * (1 - derived.defPct / 100) - derived.defFlat);
  let finalDmg = Math.max(1, reduced);

  if (session.activeInstinctId === 'veteran' && session.playerHp / session.playerHpMax < 0.2) {
    finalDmg = Math.max(1, Math.round(finalDmg * 0.6));
  }

  const newHp = Math.max(0, session.playerHp - finalDmg);
  const died = newHp <= 0;

  let next: CombatSession = {
    ...session,
    pendingSignal: null,
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

  return next;
}

// ── Tick (advance time) ───────────────────────────────────────────────────────

export function tick(session: CombatSession): CombatSession {
  if (session.status !== 'active') return session;

  let next: CombatSession = { ...session, tick: session.tick + 1, noDamageTicks: session.noDamageTicks + 1 };

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

  // Enemy stagger countdown + spawn tick
  next = {
    ...next,
    enemies: next.enemies.map(e => ({
      ...e,
      tickSinceSpawn: e.tickSinceSpawn + 1,
      ...(e.isStaggered
        ? e.staggerTicksLeft > 1
          ? { staggerTicksLeft: e.staggerTicksLeft - 1 }
          : { isStaggered: false, staggerTicksLeft: 0, stagger: 0 }
        : {}),
    })),
  };

  return next;
}

// ── Wave completion ───────────────────────────────────────────────────────────

export function checkWaveCompletion(session: CombatSession): CombatSession {
  if (session.enemies.length > 0 || session.spawnQueue.length > 0) return session;

  return {
    ...session,
    status: 'victory',
    rewards: calcRewards(session),
    log: [...session.log, { tick: session.tick, type: 'waveComplete', text: 'Волна завершена!' }],
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
