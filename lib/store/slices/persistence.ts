import type { StudioAct } from '../../types';
import { DIALOGUE_THEME_PRESETS } from '../../types';
import { createInitialMeta, createDefaultSpeakers, createDefaultPages } from '../defaults';

export const createPersistenceSlice = (set: any, get: any) => ({
  saveToLocalStorage: () => {
    const state = get();
    const dataToSave = {
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

      const rawActs: StudioAct[] = parsed.acts || [];
      const rawUnassigned: string[] = parsed.unassignedPageIds || (parsed.acts ? [] : sanitizedPages.map((p: any) => p.id));

      const validPageIds = new Set<string>(sanitizedPages.map((p: any) => p.id));
      const loadedActs = rawActs.map((a: StudioAct) => ({
        ...a,
        pageIds: a.pageIds.filter((pid: string) => validPageIds.has(pid)),
      }));

      const trackedIds = new Set<string>([
        ...loadedActs.flatMap((a: StudioAct) => a.pageIds),
        ...rawUnassigned.filter((pid: string) => validPageIds.has(pid)),
      ]);
      const orphaned = sanitizedPages.map((p: any) => p.id).filter((pid: string) => !trackedIds.has(pid));
      const loadedUnassigned = [...rawUnassigned.filter((pid: string) => validPageIds.has(pid)), ...orphaned];

      set({
        meta: parsed.meta || createInitialMeta(),
        pages: sanitizedPages,
        selectedPageId: parsed.selectedPageId || migratedPages[0]?.id || null,
        selectedButtonId: null,
        selectedWidgetId: null,
        coordinateClipboard: null,
        acts: loadedActs,
        unassignedPageIds: loadedUnassigned,
        guides: parsed.guides || { horizontal: [], vertical: [] },
        snappingGuide: null,
        snapEnabled: parsed.snapEnabled ?? true,
        items: parsed.items || [],
        variables: parsed.variables || [],
        backgrounds: loadedBackgrounds,
        uiAssets: parsed.uiAssets || [],
        speakers: parsed.speakers || createDefaultSpeakers(),
        dialogueTheme: parsed.dialogueTheme || { ...DIALOGUE_THEME_PRESETS.darkFantasy },
        startingInventory: parsed.startingInventory || {},
        quests: parsed.quests || [],
        enemies: parsed.enemies || [],
        bosses: parsed.bosses || [],
        waves: parsed.waves || [],
        instincts: parsed.instincts || [],
        scenarios: parsed.scenarios || [],
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
      selectedPageId: 'intro_01',
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
