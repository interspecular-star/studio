import type { Difficulty } from '../../types/combat';
import type { CombatSession } from '../../types/combat-session';
import {
  initCombatSession,
  spawnNextEnemy,
  playerAttack as engineAttack,
  playerReact as engineReact,
  activateShowtime as engineShowtime,
  tick as engineTick,
} from '../../combat/engine';

export interface CombatSessionSlice {
  combatSession: CombatSession | null;
  startCombat: (waveId: string, difficulty: Difficulty, instinctId?: string) => void;
  combatPlayerAttack: (targetInstanceId: string, isWeakSpot?: boolean) => void;
  combatPlayerDodge: () => void;
  combatPlayerParry: () => void;
  combatActivateShowtime: () => void;
  combatSpawnNext: () => void;
  combatTick: () => void;
  endCombat: () => void;
}

export const createCombatSessionSlice = (set: any, get: any): CombatSessionSlice => ({
  combatSession: null,

  startCombat: (waveId, difficulty, instinctId) => {
    const state = get();
    const wave = state.waves.find((w: any) => w.id === waveId);
    if (!wave) { console.warn(`[combat] wave "${waveId}" not found`); return; }
    const session = initCombatSession(wave, difficulty, undefined, instinctId ?? null);
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

  endCombat: () => {
    set(() => ({ combatSession: null }));
  },
});
