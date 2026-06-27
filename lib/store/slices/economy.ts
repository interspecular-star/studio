import type { Building, BuildingId, Mercenary, RewardEntry, MineConfig } from '../../types';
import {
  DEFAULT_BUILDINGS, DEFAULT_MERCENARIES, DEFAULT_REWARD_TABLES, DEFAULT_MINE_CONFIG,
} from '../../types';
import type { Difficulty } from '../../types/combat';

export const createEconomySlice = (set: any, get: any) => ({
  // === Buildings (fixed set, edit only) ===
  updateBuilding: (id: BuildingId, updates: Partial<Omit<Building, 'id'>>) => {
    set((s: any) => ({
      buildings: s.buildings.map((b: Building) => b.id === id ? { ...b, ...updates } : b),
    }));
    get().saveToLocalStorage();
  },
  resetBuildingsToDefault: () => {
    set({ buildings: DEFAULT_BUILDINGS });
    get().saveToLocalStorage();
  },

  // === Mercenaries (full CRUD) ===
  addMercenary: (data: Omit<Mercenary, 'id'>) => {
    const newMerc: Mercenary = { id: `merc_${Date.now().toString(36)}`, ...data };
    set((s: any) => ({ mercenaries: [...s.mercenaries, newMerc] }));
    get().saveToLocalStorage();
  },
  updateMercenary: (id: string, updates: Partial<Omit<Mercenary, 'id'>>) => {
    set((s: any) => ({
      mercenaries: s.mercenaries.map((m: Mercenary) => m.id === id ? { ...m, ...updates } : m),
    }));
    get().saveToLocalStorage();
  },
  deleteMercenary: (id: string) => {
    set((s: any) => ({ mercenaries: s.mercenaries.filter((m: Mercenary) => m.id !== id) }));
    get().saveToLocalStorage();
  },

  // === Reward Tables (6 fixed entries, edit values) ===
  updateRewardEntry: (difficulty: Difficulty, updates: Partial<Omit<RewardEntry, 'difficulty'>>) => {
    set((s: any) => ({
      rewardTables: s.rewardTables.map((r: RewardEntry) =>
        r.difficulty === difficulty ? { ...r, ...updates } : r,
      ),
    }));
    get().saveToLocalStorage();
  },
  resetRewardTablesToDefault: () => {
    set({ rewardTables: DEFAULT_REWARD_TABLES });
    get().saveToLocalStorage();
  },

  // === Mine Config ===
  updateMineConfig: (updates: Partial<MineConfig>) => {
    set((s: any) => ({ mineConfig: { ...s.mineConfig, ...updates } }));
    get().saveToLocalStorage();
  },
  resetMineConfigToDefault: () => {
    set({ mineConfig: DEFAULT_MINE_CONFIG });
    get().saveToLocalStorage();
  },
});
