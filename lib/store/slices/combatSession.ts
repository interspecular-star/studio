import type { Difficulty } from '../../types/combat';
import type { CombatSession } from '../../types/combat-session';
import {
  initCombatSession,
  spawnNextEnemy,
  playerAttack as engineAttack,
  playerReact as engineReact,
  activateShowtime as engineShowtime,
  tick as engineTick,
  useSkill as engineUseSkill,
} from '../../combat/engine';
import type { SkillId } from '../../types/combat';

export interface CombatSessionSlice {
  combatSession: CombatSession | null;
  startCombat: (waveId: string, difficulty: Difficulty, instinctId?: string, skillSlots?: [SkillId | null, SkillId | null, SkillId | null], scenarioIds?: string[]) => void;
  combatPlayerAttack: (targetInstanceId: string, isWeakSpot?: boolean) => void;
  combatPlayerDodge: () => void;
  combatPlayerParry: () => void;
  combatActivateShowtime: () => void;
  combatSpawnNext: () => void;
  combatTick: () => void;
  combatUseSkill: (slotIndex: 0 | 1 | 2) => void;
  /** Apply combat rewards to playtest variable values (coins/gems/exp/level). */
  applyRewards: () => { leveledUp: boolean; newLevel: number };
  endCombat: () => void;
}

export const createCombatSessionSlice = (set: any, get: any): CombatSessionSlice => ({
  combatSession: null,

  startCombat: (waveId, difficulty, instinctId, skillSlots, scenarioIds) => {
    const state = get();
    const wave = state.waves.find((w: any) => w.id === waveId);
    if (!wave) { console.warn(`[combat] wave "${waveId}" not found`); return; }

    // Read player stats from playtest variable values (fall back to defaults for missing vars)
    const { variables, playtestState } = state;
    const numVar = (name: string, fallback: number): number => {
      const v = variables.find((v: any) => v.name === name);
      if (!v) return fallback;
      const val = playtestState.variableValues[v.id];
      if (typeof val === 'number') return val;
      return typeof v.defaultValue === 'number' ? v.defaultValue : fallback;
    };
    // Returns the variable's current value, or undefined if the variable doesn't exist
    const optVar = (name: string): number | undefined => {
      const v = variables.find((v: any) => v.name === name);
      if (!v) return undefined;
      const val = playtestState.variableValues[v.id];
      return typeof val === 'number' ? val : typeof v.defaultValue === 'number' ? v.defaultValue : undefined;
    };

    const playerStats = {
      str: numVar('strength', 5),
      agi: numVar('agility', 5),
      end: numVar('endurance', 10),
      mag: numVar('magic', 5),
      lck: numVar('luck', 5),
      lvl: numVar('level', 1),
      // Designer-set direct values — override formula-derived stats
      hpMax:   optVar('health_max'),
      mpMax:   optVar('mana_max'),
      defFlat: optVar('defense'),
      critCh:  optVar('crit_chance'),
      critDmg: (() => { const v = optVar('crit_damage'); return v !== undefined ? Math.round(v * 100) : undefined; })(),
    };

    const session = initCombatSession(wave, difficulty, playerStats, instinctId ?? null, skillSlots, scenarioIds);
    set(() => ({ combatSession: session }));
  },

  combatPlayerAttack: (targetInstanceId, isWeakSpot = false) => {
    const { combatSession } = get();
    if (!combatSession) return;
    set(() => ({ combatSession: engineAttack(combatSession, targetInstanceId, isWeakSpot) }));
  },

  combatPlayerDodge: () => {
    const { combatSession } = get();
    if (!combatSession) return;
    set(() => ({ combatSession: engineReact(combatSession, 'dodge') }));
  },

  combatPlayerParry: () => {
    const { combatSession } = get();
    if (!combatSession) return;
    set(() => ({ combatSession: engineReact(combatSession, 'parry') }));
  },

  combatActivateShowtime: () => {
    const { combatSession } = get();
    if (!combatSession) return;
    set(() => ({ combatSession: engineShowtime(combatSession) }));
  },

  combatSpawnNext: () => {
    const state = get();
    const { combatSession } = state;
    if (!combatSession || combatSession.spawnQueue.length === 0) return;

    const nextId = combatSession.spawnQueue[0];
    const isBoss = nextId.startsWith('boss:');
    const id = isBoss ? nextId.slice(5) : nextId;

    const enemy = isBoss
      ? state.bosses.find((b: any) => b.id === id)
      : state.enemies.find((e: any) => e.id === id);

    if (!enemy) { console.warn(`[combat] enemy "${id}" not found`); return; }
    set(() => ({ combatSession: spawnNextEnemy(combatSession, enemy) }));
  },

  combatTick: () => {
    const state = get();
    const { combatSession } = state;
    if (!combatSession || combatSession.status !== 'active') return;

    // Engine tick handles cooldowns + signal generation internally (C3)
    let next = engineTick(combatSession);

    // Auto-spawn next enemy when screen is clear and queue has more
    if (next.enemies.length === 0 && next.spawnQueue.length > 0 && next.tick % 3 === 0) {
      const nextId = next.spawnQueue[0];
      const isBoss = nextId.startsWith('boss:');
      const id = isBoss ? nextId.slice(5) : nextId;
      const enemy = isBoss
        ? state.bosses.find((b: any) => b.id === id)
        : state.enemies.find((e: any) => e.id === id);
      if (enemy) next = spawnNextEnemy(next, enemy);
    }

    set(() => ({ combatSession: next }));
  },

  combatUseSkill: (slotIndex) => {
    const { combatSession } = get();
    if (!combatSession) return;
    set(() => ({ combatSession: engineUseSkill(combatSession, slotIndex) }));
  },

  applyRewards: () => {
    const state = get();
    const { combatSession, variables, playtestState } = state;
    if (!combatSession || combatSession.status !== 'victory') {
      return { leveledUp: false, newLevel: 1 };
    }

    const { rewards } = combatSession;
    const vals: Record<string, number | boolean | string> = { ...playtestState.variableValues };

    const varId = (name: string) => variables.find((v: any) => v.name === name)?.id as string | undefined;
    const numVal = (id: string | undefined, fallback = 0): number => {
      if (!id) return fallback;
      return typeof vals[id] === 'number' ? (vals[id] as number) : fallback;
    };

    const coinsId    = varId('coins');
    const gemsId     = varId('gems');
    const expId      = varId('exp');
    const levelId    = varId('level');
    const hpId       = varId('health');
    const hpMaxId    = varId('health_max');
    const soulsId    = varId('souls');

    if (coinsId) vals[coinsId] = numVal(coinsId) + rewards.coins;
    if (gemsId)  vals[gemsId]  = numVal(gemsId)  + rewards.stallonkas;
    if (soulsId && rewards.souls > 0) vals[soulsId] = numVal(soulsId) + rewards.souls;

    // XP + level-up
    let leveledUp = false;
    let newLevel = numVal(levelId, 1);
    if (expId && levelId) {
      let xp  = numVal(expId) + rewards.xp;
      let lvl = newLevel;
      let threshold = Math.max(80, Math.floor(lvl * 80 + 20));
      while (xp >= threshold) {
        xp -= threshold;
        lvl += 1;
        leveledUp = true;
        threshold = Math.max(80, Math.floor(lvl * 80 + 20));
      }
      vals[expId]   = xp;
      vals[levelId] = lvl;
      newLevel = lvl;

      // Restore HP to max on level up
      if (leveledUp && hpId && hpMaxId) {
        vals[hpId] = numVal(hpMaxId, 100);
      }
    }

    // Enemy drops: roll per killed enemy using log actorIds
    const killedIds = combatSession.log
      .filter((e: any) => e.type === 'enemyDeath' && e.actorId)
      .map((e: any) => e.actorId as string);
    const allEnemyDefs = [...(state.enemies ?? []), ...(state.bosses ?? [])];
    for (const enemyId of killedIds) {
      const def = allEnemyDefs.find((e: any) => e.id === enemyId);
      if (!def?.drops) continue;
      for (const drop of def.drops as { itemId: string; chance: number; amount: number }[]) {
        if (Math.random() * 100 >= drop.chance) continue;
        const item = (state.items ?? []).find((i: any) => i.id === drop.itemId);
        if (item?.quantityVariableId) {
          const cur = typeof vals[item.quantityVariableId] === 'number' ? (vals[item.quantityVariableId] as number) : 0;
          vals[item.quantityVariableId] = cur + drop.amount;
        }
      }
    }

    set((s: any) => ({
      playtestState: { ...s.playtestState, variableValues: vals },
    }));
    get().savePlaytestProgress();

    return { leveledUp, newLevel };
  },

  endCombat: () => {
    set(() => ({ combatSession: null }));
  },
});
