"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UIWidget } from './store';

// ─── Built-in presets ─────────────────────────────────────────────────────────
// Всегда присутствуют, нельзя удалить или изменить (isLocked: true).

const LOC_WIDGETS: UIWidget[] = [
  { id: 'bi_village',  type: 'quickAction', layout: { x: 15, y: 5,  width: 70, height: 9, z: 10 }, text: { ru: '🏘️  Деревня',       en: '🏘️  Village'       }, action: { type: 'goToPage', pageId: 'village'           } },
  { id: 'bi_combat',  type: 'quickAction', layout: { x: 15, y: 15, width: 70, height: 9, z: 10 }, text: { ru: '🎬  Выбор волны',    en: '🎬  Wave Select'    }, action: { type: 'goToPage', pageId: 'combat_wave_select' } },
  { id: 'bi_forge',   type: 'quickAction', layout: { x: 15, y: 25, width: 70, height: 9, z: 10 }, text: { ru: '⚒️  Кузница',        en: '⚒️  Forge'          }, action: { type: 'goToPage', pageId: 'forge_01'           } },
  { id: 'bi_tavern',  type: 'quickAction', layout: { x: 15, y: 35, width: 70, height: 9, z: 10 }, text: { ru: '🍺  Таверна',        en: '🍺  Tavern'         }, action: { type: 'goToPage', pageId: 'tavern_01'          } },
  { id: 'bi_shop',    type: 'quickAction', layout: { x: 15, y: 45, width: 70, height: 9, z: 10 }, text: { ru: '🛒  Лавка',          en: '🛒  Shop'           }, action: { type: 'goToPage', pageId: 'shop_01'            } },
  { id: 'bi_shaman',  type: 'quickAction', layout: { x: 15, y: 55, width: 70, height: 9, z: 10 }, text: { ru: '🔮  Шаманка',        en: '🔮  Shaman\'s'      }, action: { type: 'goToPage', pageId: 'shaman_01'          } },
  { id: 'bi_mine',    type: 'quickAction', layout: { x: 15, y: 65, width: 70, height: 9, z: 10 }, text: { ru: '⛏️  Шахта',          en: '⛏️  Mine'           }, action: { type: 'goToPage', pageId: 'mine_01'            } },
];

export const BUILT_IN_PRESETS: WidgetPreset[] = [
  {
    id: '__builtin__default_locations',
    name: 'Дефолтные локации',
    description: 'Кнопки быстрого доступа ко всем базовым локациям игры',
    category: 'scene',
    tags: ['default', 'locations', 'navigation'],
    thumbnail: null,
    widgets: LOC_WIDGETS,
    isLocked: true,
    isDefault: false,
    isFavorite: false,
    createdAt: 0,
    updatedAt: 0,
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

export type PresetCategory =
  | 'dialogue'
  | 'choice'
  | 'scene'
  | 'cutscene'
  | 'ui'
  | 'custom';

export interface WidgetPreset {
  id: string;
  name: string;
  description: string;
  category: PresetCategory;
  tags: string[];
  thumbnail: string | null;   // data URL or null
  widgets: UIWidget[];        // full widget snapshot
  isLocked: boolean;          // prevent accidental delete/edit
  isDefault: boolean;         // auto-apply to new pages
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
}

export const PRESET_CATEGORY_LABELS: Record<PresetCategory, string> = {
  dialogue: 'Диалог',
  choice: 'Выбор',
  scene: 'Сцена',
  cutscene: 'Кат-сцена',
  ui: 'UI',
  custom: 'Кастом',
};

// ─── Store ────────────────────────────────────────────────────────────────────

interface PresetsState {
  presets: WidgetPreset[];

  addPreset: (data: Omit<WidgetPreset, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updatePreset: (id: string, updates: Partial<Omit<WidgetPreset, 'id' | 'createdAt'>>) => void;
  deletePreset: (id: string) => void;
  duplicatePreset: (id: string) => string | null;
  setDefaultPreset: (id: string | null) => void;
  toggleFavorite: (id: string) => void;
  toggleLock: (id: string) => void;
  importPresetsFromJSON: (json: string) => { imported: number; skipped: number };
  exportPresetToJSON: (id: string) => string | null;
  exportAllToJSON: () => string;
}

function uid(): string {
  return `preset_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export const usePresetsStore = create<PresetsState>()(
  persist(
    (set, get) => ({
      presets: [],

      addPreset: (data) => {
        const id = uid();
        const now = Date.now();
        const newPreset: WidgetPreset = { ...data, id, createdAt: now, updatedAt: now };
        set(s => ({ presets: [...s.presets, newPreset] }));
        return id;
      },

      updatePreset: (id, updates) => {
        if (id.startsWith('__builtin__')) return; // built-in нельзя менять
        if (get().presets.find(p => p.id === id)?.isLocked && !('isLocked' in updates)) return;
        set(s => ({
          presets: s.presets.map(p =>
            p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
          ),
        }));
      },

      deletePreset: (id) => {
        if (id.startsWith('__builtin__')) return; // built-in нельзя удалить
        const preset = get().presets.find(p => p.id === id);
        if (!preset || preset.isLocked) return;
        set(s => ({ presets: s.presets.filter(p => p.id !== id) }));
      },

      duplicatePreset: (id) => {
        const src = get().presets.find(p => p.id === id);
        if (!src) return null;
        const newId = uid();
        const now = Date.now();
        const clone: WidgetPreset = {
          ...src,
          id: newId,
          name: `${src.name} (копия)`,
          isDefault: false,
          isLocked: false,
          createdAt: now,
          updatedAt: now,
          widgets: src.widgets.map(w => ({ ...w, id: `w_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` })),
        };
        set(s => ({ presets: [...s.presets, clone] }));
        return newId;
      },

      setDefaultPreset: (id) => {
        set(s => ({
          presets: s.presets.map(p => ({ ...p, isDefault: p.id === id })),
        }));
      },

      toggleFavorite: (id) => {
        set(s => ({
          presets: s.presets.map(p => p.id === id ? { ...p, isFavorite: !p.isFavorite, updatedAt: Date.now() } : p),
        }));
      },

      toggleLock: (id) => {
        set(s => ({
          presets: s.presets.map(p => p.id === id ? { ...p, isLocked: !p.isLocked, updatedAt: Date.now() } : p),
        }));
      },

      importPresetsFromJSON: (json) => {
        let parsed: any;
        try { parsed = JSON.parse(json); } catch { return { imported: 0, skipped: 0 }; }
        const incoming: WidgetPreset[] = Array.isArray(parsed) ? parsed : [parsed];
        const existing = get().presets;
        let imported = 0;
        let skipped = 0;
        const toAdd: WidgetPreset[] = [];
        for (const p of incoming) {
          if (!p.id || !p.name || !Array.isArray(p.widgets)) { skipped++; continue; }
          if (existing.some(e => e.id === p.id)) { skipped++; continue; }
          toAdd.push({ ...p, id: uid(), createdAt: Date.now(), updatedAt: Date.now(), isDefault: false });
          imported++;
        }
        if (toAdd.length > 0) set(s => ({ presets: [...s.presets, ...toAdd] }));
        return { imported, skipped };
      },

      exportPresetToJSON: (id) => {
        const p = get().presets.find(p => p.id === id);
        if (!p) return null;
        return JSON.stringify([p], null, 2);
      },

      exportAllToJSON: () => JSON.stringify(get().presets, null, 2),
    }),
    {
      name: 'slay_adventure_global_presets',
    },
  ),
);
