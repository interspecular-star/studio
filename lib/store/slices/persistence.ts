import type { StudioAct } from '../../types';
import { DIALOGUE_THEME_PRESETS, DEFAULT_BUILDINGS, DEFAULT_MERCENARIES, DEFAULT_REWARD_TABLES, DEFAULT_MINE_CONFIG } from '../../types';
import { createInitialMeta, createDefaultSpeakers, createDefaultPages, DEFAULT_ENEMY_STATIST, DEFAULT_ENEMY_GOBLIN_PAGER, DEFAULT_ENEMY_SKELETON_DRUNK, DEFAULT_ENEMY_RAT_HEADPHONES, DEFAULT_ENEMY_VHS_GHOST, DEFAULT_ENEMY_BEAR_RAPPER, DEFAULT_ENEMY_FRIDGE_MIMIC, DEFAULT_ENEMY_TV_CHICKEN, DEFAULT_ENEMY_ZOMBIE_DJ, DEFAULT_BOSS_DIRECTOR, DEFAULT_TEST_WAVE } from '../defaults';
import { buildCombatPack } from '../../validation/validate';

// Bump when default system pages OR system enemies/waves change structure.
const SCHEMA_VERSION = 6;

// Pages managed by the engine — replaced on schema upgrade, not user-authored
const SYSTEM_PAGE_IDS = ['village', 'war_path', 'combat_results', 'forge_01', 'tavern_01', 'shop_01', 'shaman_01', 'mine_01', 'office_01', 'bureau_01'];

// Pages that have been removed from the engine — purged from saved projects on upgrade
const REMOVED_PAGE_IDS = new Set(['combat_wave_select']);

// Default enemies/waves injected on first load or when missing
const DEFAULT_ENEMIES = [
  DEFAULT_ENEMY_STATIST,
  DEFAULT_ENEMY_GOBLIN_PAGER,
  DEFAULT_ENEMY_SKELETON_DRUNK,
  DEFAULT_ENEMY_RAT_HEADPHONES,
  DEFAULT_ENEMY_VHS_GHOST,
  DEFAULT_ENEMY_BEAR_RAPPER,
  DEFAULT_ENEMY_FRIDGE_MIMIC,
  DEFAULT_ENEMY_TV_CHICKEN,
  DEFAULT_ENEMY_ZOMBIE_DJ,
];
const DEFAULT_BOSSES  = [DEFAULT_BOSS_DIRECTOR];
const DEFAULT_WAVES   = [DEFAULT_TEST_WAVE];

export const createPersistenceSlice = (set: any, get: any) => ({
  saveToLocalStorage: () => {
    const state = get();
    const dataToSave = {
      schemaVersion: SCHEMA_VERSION,
      meta: { ...state.meta, lastSaved: new Date().toISOString() },
      pages: state.pages,
      selectedPageId: state.selectedPageId,
      acts: state.acts,
      unassignedPageIds: state.unassignedPageIds,
      items: state.items,
      variables: state.variables,
      backgrounds: state.backgrounds,
      uiAssets: state.uiAssets,
      speakers: state.speakers,
      dialogueTheme: state.dialogueTheme,
      startingInventory: state.startingInventory,
      quests: state.quests,
      enemies: state.enemies,
      bosses: state.bosses,
      waves: state.waves,
      instincts: state.instincts,
      scenarios: state.scenarios,
      buildings: state.buildings,
      mercenaries: state.mercenaries,
      rewardTables: state.rewardTables,
      mineConfig: state.mineConfig,
      canvasWidth: state.canvasWidth,
      canvasHeight: state.canvasHeight,
    };
    try {
      localStorage.setItem('slay-studio-project', JSON.stringify(dataToSave));
      set((s: any) => ({ meta: { ...s.meta, lastSaved: dataToSave.meta.lastSaved } }));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  },

  loadFromLocalStorage: () => {
    try {
      const saved = localStorage.getItem('slay-studio-project');
      if (!saved) return false;
      const parsed = JSON.parse(saved);
      if (!parsed.pages || !Array.isArray(parsed.pages)) return false;

      const loadedBackgrounds = parsed.backgrounds || [];
      const bgIdSet = new Set(loadedBackgrounds.map((b: any) => b.id));

      const migratedPages = parsed.pages.map((p: any) => {
        const pg = {
          ...p,
          background: bgIdSet.has(p.background) ? p.background : (p.background || ''),
          uiWidgets: Array.isArray(p.uiWidgets) ? p.uiWidgets : (p.uiWidgets || []),
          uiLayoutPreset: p.uiLayoutPreset || 'freeform',
        };
        if (pg.speaker && pg.speaker !== 'none' && (!pg.uiWidgets || pg.uiWidgets.length === 0)) {
          pg.uiWidgets = [
            { id: `uiw_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, type: 'dialogueBox', layout: { x: 16, y: 78, width: 68, height: 12, z: 20 }, style: 'default' },
            { id: `uiw_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, type: 'textLabel', layout: { x: 42, y: 58, width: 16, height: 3, z: 15 }, style: 'default', data: { speakerId: pg.speaker } },
          ];
          pg.uiLayoutPreset = 'classic_vn';
        }
        return pg;
      });

      const seenWidgetIds = new Set<string>();
      const sanitizedPages = migratedPages.map((p: any) => ({
        ...p,
        uiWidgets: (p.uiWidgets || []).map((w: any) => {
          if (seenWidgetIds.has(w.id)) {
            return { ...w, id: `uiw_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}` };
          }
          seenWidgetIds.add(w.id);
          return w;
        }),
      }));

      // Schema version check — must happen before page filtering so we know if we should migrate
      const defaultPages = createDefaultPages();
      const savedVersion: number = parsed.schemaVersion ?? 1;
      const needsUpgrade = savedVersion < SCHEMA_VERSION;

      // Strip pages that were removed from the engine (only on upgrade to preserve user projects)
      const pagesAfterRemoval = needsUpgrade
        ? sanitizedPages.filter((p: any) => !REMOVED_PAGE_IDS.has(p.id))
        : sanitizedPages;

      const rawActs: StudioAct[] = parsed.acts || [];
      const rawUnassigned: string[] = parsed.unassignedPageIds || (parsed.acts ? [] : pagesAfterRemoval.map((p: any) => p.id));

      const validPageIds = new Set<string>(pagesAfterRemoval.map((p: any) => p.id));
      const loadedActs = rawActs.map((a: StudioAct) => ({
        ...a,
        pageIds: a.pageIds.filter((pid: string) => validPageIds.has(pid)),
      }));

      const trackedIds = new Set<string>([
        ...loadedActs.flatMap((a: StudioAct) => a.pageIds),
        ...rawUnassigned.filter((pid: string) => validPageIds.has(pid)),
      ]);
      const orphaned = pagesAfterRemoval.map((p: any) => p.id).filter((pid: string) => !trackedIds.has(pid));
      const loadedUnassigned = [...rawUnassigned.filter((pid: string) => validPageIds.has(pid)), ...orphaned];

      // Merge defaults: add missing pages + replace system pages on schema upgrade
      const loadedPageIds = new Set<string>(pagesAfterRemoval.map((p: any) => p.id));
      const missingDefaults = defaultPages.filter(dp => !loadedPageIds.has(dp.id));

      let mergedPages = needsUpgrade
        ? pagesAfterRemoval.map((p: any) => {
            if (SYSTEM_PAGE_IDS.includes(p.id)) {
              return defaultPages.find(dp => dp.id === p.id) ?? p;
            }
            return p;
          })
        : pagesAfterRemoval;

      const finalPages = [...missingDefaults, ...mergedPages];
      const finalUnassigned = [...missingDefaults.map(p => p.id), ...loadedUnassigned];

      set({
        meta: parsed.meta || createInitialMeta(),
        pages: finalPages,
        selectedPageId: parsed.selectedPageId || finalPages[0]?.id || null,
        selectedButtonId: null,
        selectedWidgetId: null,
        coordinateClipboard: null,
        acts: loadedActs,
        unassignedPageIds: finalUnassigned,
        guides: parsed.guides || { horizontal: [], vertical: [] },
        snappingGuide: null,
        snapEnabled: parsed.snapEnabled ?? true,
        items: parsed.items || [],
        variables: (() => {
          const loaded: any[] = parsed.variables || [];
          // Ensure luck and magic exist as player stats (may be missing from older saves)
          const ensure = [
            { name: 'luck',  displayName: { ru: 'Удача',  en: 'Luck'  }, type: 'number', defaultValue: 5, category: 'player' },
            { name: 'magic', displayName: { ru: 'Магия',  en: 'Magic' }, type: 'number', defaultValue: 5, category: 'player' },
          ];
          const result = [...loaded];
          for (const stat of ensure) {
            if (!loaded.some((v: any) => v.name === stat.name)) {
              result.push({ id: `player_${stat.name}_auto`, ...stat });
            }
          }
          return result;
        })(),
        backgrounds: loadedBackgrounds,
        uiAssets: parsed.uiAssets || [],
        speakers: parsed.speakers || createDefaultSpeakers(),
        dialogueTheme: parsed.dialogueTheme || { ...DIALOGUE_THEME_PRESETS.darkFantasy },
        startingInventory: parsed.startingInventory || {},
        quests: parsed.quests || [],
        enemies: (() => {
          const loaded: any[] = parsed.enemies || [];
          const missing = DEFAULT_ENEMIES.filter(de => !loaded.find((le: any) => le.id === de.id));
          const upgraded = needsUpgrade
            ? loaded.map((e: any) => DEFAULT_ENEMIES.find(de => de.id === e.id) ?? e)
            : loaded;
          return [...missing, ...upgraded];
        })(),
        bosses: (() => {
          const loaded: any[] = parsed.bosses || [];
          const missing = DEFAULT_BOSSES.filter(db => !loaded.find((lb: any) => lb.id === db.id));
          const upgraded = needsUpgrade
            ? loaded.map((b: any) => DEFAULT_BOSSES.find(db => db.id === b.id) ?? b)
            : loaded;
          return [...missing, ...upgraded];
        })(),
        waves: (() => {
          const loaded: any[] = parsed.waves || [];
          const missing = DEFAULT_WAVES.filter(dw => !loaded.find((lw: any) => lw.id === dw.id));
          const upgraded = needsUpgrade
            ? loaded.map((w: any) => DEFAULT_WAVES.find(dw => dw.id === w.id) ?? w)
            : loaded;
          return [...missing, ...upgraded];
        })(),
        instincts: parsed.instincts || [],
        scenarios: parsed.scenarios || [],
        buildings: parsed.buildings?.length ? parsed.buildings : DEFAULT_BUILDINGS,
        mercenaries: parsed.mercenaries || DEFAULT_MERCENARIES,
        rewardTables: parsed.rewardTables?.length ? parsed.rewardTables : DEFAULT_REWARD_TABLES,
        mineConfig: parsed.mineConfig || DEFAULT_MINE_CONFIG,
        canvasWidth: parsed.canvasWidth || 1280,
        canvasHeight: parsed.canvasHeight || 720,
      });
      return true;
    } catch (e) {
      console.error('Failed to load from localStorage', e);
      return false;
    }
  },

  exportProject: () => {
    const state = get();
    const exportData = {
      meta: { ...state.meta, lastSaved: new Date().toISOString(), exportedAt: new Date().toISOString() },
      pages: state.pages,
      acts: state.acts,
      unassignedPageIds: state.unassignedPageIds,
      guides: state.guides,
      items: state.items,
      variables: state.variables,
      backgrounds: state.backgrounds,
      uiAssets: state.uiAssets,
      speakers: state.speakers,
      dialogueTheme: state.dialogueTheme,
      startingInventory: state.startingInventory,
      quests: state.quests,
      enemies: state.enemies,
      bosses: state.bosses,
      waves: state.waves,
      instincts: state.instincts,
      scenarios: state.scenarios,
      buildings: state.buildings,
      mercenaries: state.mercenaries,
      rewardTables: state.rewardTables,
      mineConfig: state.mineConfig,
      canvasWidth: state.canvasWidth,
      canvasHeight: state.canvasHeight,
    };
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const safeName = state.meta.name.replace(/[^\wа-яё]/gi, '_');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  exportCombatPack: () => {
    const state = get();
    const pack = buildCombatPack({
      enemies:      state.enemies,
      bosses:       state.bosses,
      waves:        state.waves,
      instincts:    state.instincts,
      scenarios:    state.scenarios,
      buildings:    state.buildings,
      mercenaries:  state.mercenaries,
      rewardTables: state.rewardTables,
      mineConfig:   state.mineConfig,
    });
    const json = JSON.stringify(pack, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const safeName = state.meta.name.replace(/[^\wа-яё]/gi, '_');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}_combat_pack_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  importProject: (data: any) => {
    try {
      if (!data.pages || !Array.isArray(data.pages)) {
        alert('Некорректный файл проекта');
        return false;
      }
      const importedBackgrounds = data.backgrounds || [];
      const bgIdSet = new Set(importedBackgrounds.map((b: any) => b.id));
      const migratedPages = data.pages.map((p: any) => {
        const pg = {
          ...p,
          background: bgIdSet.has(p.background) ? p.background : (p.background || ''),
          uiWidgets: Array.isArray(p.uiWidgets) ? p.uiWidgets : (p.uiWidgets || []),
          uiLayoutPreset: p.uiLayoutPreset || 'freeform',
        };
        if (pg.speaker && pg.speaker !== 'none' && (!pg.uiWidgets || pg.uiWidgets.length === 0)) {
          pg.uiWidgets = [
            { id: `uiw_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, type: 'dialogueBox', layout: { x: 16, y: 78, width: 68, height: 12, z: 20 }, style: 'default' },
            { id: `uiw_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, type: 'textLabel', layout: { x: 42, y: 58, width: 16, height: 3, z: 15 }, style: 'default', data: { speakerId: pg.speaker } },
          ];
          pg.uiLayoutPreset = 'classic_vn';
        }
        return pg;
      });
      const importedActs: StudioAct[] = data.acts || [];
      const importedUnassigned: string[] = data.unassignedPageIds || (data.acts ? [] : migratedPages.map((p: any) => p.id));
      set({
        meta: data.meta || { ...createInitialMeta(), name: 'Импортированный проект' },
        pages: migratedPages,
        selectedPageId: migratedPages[0]?.id || null,
        selectedButtonId: null,
        selectedWidgetId: null,
        coordinateClipboard: null,
        acts: importedActs,
        unassignedPageIds: importedUnassigned,
        guides: data.guides || { horizontal: [], vertical: [] },
        snappingGuide: null,
        snapEnabled: data.snapEnabled ?? true,
        items: data.items || [],
        variables: data.variables || [],
        backgrounds: importedBackgrounds,
        uiAssets: data.uiAssets || [],
        speakers: data.speakers || createDefaultSpeakers(),
        dialogueTheme: data.dialogueTheme || { ...DIALOGUE_THEME_PRESETS.darkFantasy },
        startingInventory: data.startingInventory || {},
        quests: data.quests || [],
        enemies: data.enemies || [],
        bosses: data.bosses || [],
        waves: data.waves || [],
        instincts: data.instincts || [],
        scenarios: data.scenarios || [],
        buildings: data.buildings?.length ? data.buildings : DEFAULT_BUILDINGS,
        mercenaries: data.mercenaries || DEFAULT_MERCENARIES,
        rewardTables: data.rewardTables?.length ? data.rewardTables : DEFAULT_REWARD_TABLES,
        mineConfig: data.mineConfig || DEFAULT_MINE_CONFIG,
        canvasWidth: data.canvasWidth || 1280,
        canvasHeight: data.canvasHeight || 720,
      });
      setTimeout(() => get().saveToLocalStorage(), 50);
      return true;
    } catch (e) {
      console.error('Failed to import project', e);
      alert('Ошибка при импорте проекта');
      return false;
    }
  },

  setProjectName: (name: string) => {
    set((s: any) => ({ meta: { ...s.meta, name } }));
    get().saveToLocalStorage();
  },

  createNewProject: () => {
    const defaultPages = createDefaultPages();
    set({
      meta: { ...createInitialMeta(), name: 'Новый проект' },
      pages: defaultPages,
      selectedPageId: 'village',
      selectedButtonId: null,
      selectedWidgetId: null,
      coordinateClipboard: null,
      acts: [],
      unassignedPageIds: defaultPages.map((p: any) => p.id),
      guides: { horizontal: [], vertical: [] },
      snappingGuide: null,
      snapEnabled: true,
      items: [],
      variables: [],
      backgrounds: [],
      uiAssets: [],
      speakers: createDefaultSpeakers(),
      startingInventory: {},
      playtestState: {
        variableValues: {},
        equippedItemIds: [],
        equippedSlots: {},
        isInventoryOpen: false,
        playerAvatar: 'default',
        widgetOverrides: {},
        dialogueLineIndex: 0,
        dialogueStarted: false,
        itemRewardModal: null,
      },
      canvasWidth: 1280,
      canvasHeight: 720,
    });
    get().saveToLocalStorage();
  },
});
