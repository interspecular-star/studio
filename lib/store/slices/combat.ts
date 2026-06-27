import type { Enemy, Boss, Wave, InstinctDef, ScenarioDef } from '../../types';
import { DEFAULT_INSTINCTS, DEFAULT_SCENARIOS } from '../../types';

export const createCombatSlice = (set: any, get: any) => ({
  // === Enemies ===
  addEnemy: (data: Omit<Enemy, 'id'>) => {
    const newEnemy: Enemy = {
      id: `enemy_${Date.now().toString(36)}`,
      name: data.name ?? { ru: 'Новый враг', en: 'New Enemy' },
      tier: data.tier ?? 1,
      hp: data.hp ?? 100,
      atk: data.atk ?? 10,
      weakPointTrigger: data.weakPointTrigger,
      furyReply: data.furyReply,
      drops: data.drops ?? [],
    };
    set((s: any) => ({ enemies: [...s.enemies, newEnemy] }));
    get().saveToLocalStorage();
  },

  updateEnemy: (id: string, updates: Partial<Omit<Enemy, 'id'>>) => {
    set((s: any) => ({ enemies: s.enemies.map((e: Enemy) => e.id === id ? { ...e, ...updates } : e) }));
    get().saveToLocalStorage();
  },

  deleteEnemy: (id: string) => {
    set((s: any) => ({ enemies: s.enemies.filter((e: Enemy) => e.id !== id) }));
    get().saveToLocalStorage();
  },

  // === Bosses ===
  addBoss: (data: Omit<Boss, 'id' | 'isBoss'>) => {
    const newBoss: Boss = {
      id: `boss_${Date.now().toString(36)}`,
      isBoss: true,
      name: data.name ?? { ru: 'Новый босс', en: 'New Boss' },
      tier: data.tier ?? 3,
      hp: data.hp ?? 1000,
      atk: data.atk ?? 50,
      breakBarMax: data.breakBarMax ?? 100,
      phases: data.phases ?? [
        { hpThreshold: 60, mechanic: { ru: '', en: '' } },
        { hpThreshold: 30, mechanic: { ru: '', en: '' } },
      ],
      furyAbility: data.furyAbility ?? { ru: '', en: '' },
      weakPointTrigger: data.weakPointTrigger,
      furyReply: data.furyReply,
      shieldMechanic: data.shieldMechanic,
      drops: data.drops ?? [],
    };
    set((s: any) => ({ bosses: [...s.bosses, newBoss] }));
    get().saveToLocalStorage();
  },

  updateBoss: (id: string, updates: Partial<Omit<Boss, 'id' | 'isBoss'>>) => {
    set((s: any) => ({ bosses: s.bosses.map((b: Boss) => b.id === id ? { ...b, ...updates } : b) }));
    get().saveToLocalStorage();
  },

  deleteBoss: (id: string) => {
    set((s: any) => ({ bosses: s.bosses.filter((b: Boss) => b.id !== id) }));
    get().saveToLocalStorage();
  },

  // === Waves ===
  addWave: (data: Omit<Wave, 'id'>) => {
    const newWave: Wave = {
      id: `wave_${Date.now().toString(36)}`,
      name: data.name ?? { ru: 'Новая волна', en: 'New Wave' },
      enemyPool: data.enemyPool ?? [],
      bossId: data.bossId,
      difficulties: data.difficulties ?? ['novice'],
    };
    set((s: any) => ({ waves: [...s.waves, newWave] }));
    get().saveToLocalStorage();
  },

  updateWave: (id: string, updates: Partial<Omit<Wave, 'id'>>) => {
    set((s: any) => ({ waves: s.waves.map((w: Wave) => w.id === id ? { ...w, ...updates } : w) }));
    get().saveToLocalStorage();
  },

  deleteWave: (id: string) => {
    set((s: any) => ({ waves: s.waves.filter((w: Wave) => w.id !== id) }));
    get().saveToLocalStorage();
  },

  // === Instincts (editable copies of defaults) ===
  updateInstinct: (id: string, updates: Partial<Omit<InstinctDef, 'id'>>) => {
    set((s: any) => ({
      instincts: s.instincts.map((inst: InstinctDef) => inst.id === id ? { ...inst, ...updates } : inst),
    }));
    get().saveToLocalStorage();
  },

  resetInstinctsToDefault: () => {
    set({ instincts: DEFAULT_INSTINCTS });
    get().saveToLocalStorage();
  },

  // === Scenarios (editable copies of defaults) ===
  updateScenario: (id: string, updates: Partial<Omit<ScenarioDef, 'id'>>) => {
    set((s: any) => ({
      scenarios: s.scenarios.map((sc: ScenarioDef) => sc.id === id ? { ...sc, ...updates } : sc),
    }));
    get().saveToLocalStorage();
  },

  resetScenariosToDefault: () => {
    set({ scenarios: DEFAULT_SCENARIOS });
    get().saveToLocalStorage();
  },
});
