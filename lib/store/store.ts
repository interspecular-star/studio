import { create } from 'zustand';
import { DIALOGUE_THEME_PRESETS } from '../types';
import type {
  LocalizedString, Speaker, DialogueTheme, DialogueLine, StudioAct, ProjectMeta,
  Variable, Condition, ButtonAction,
  Item, EquipmentSlot,
  UIWidget, UIAsset,
  Background, StudioButton, StudioPage,
} from '../types';
import { createDefaultPage, createDefaultPages, createInitialMeta, createDefaultSpeakers } from './defaults';

type StudioState = {
  // Project metadata
  meta: ProjectMeta;

  pages: StudioPage[];
  selectedPageId: string | null;
  selectedButtonId: string | null;

  // Simple internal clipboard for coordinates
  coordinateClipboard: { x: number; y: number; width: number; height: number } | null;

  // Widget/button clipboard for Ctrl+C / Ctrl+V / Ctrl+D
  widgetClipboard: { kind: 'widget'; item: UIWidget } | { kind: 'button'; item: StudioButton } | null;

  // Guides for visual alignment (project-level, percentages 0-100)
  guides: {
    horizontal: number[]; // vertical lines (affect X position)
    vertical: number[];   // horizontal lines (affect Y position)
  };

  // Transient state: which guides the currently dragged button is snapping to.
  // Used only for visual highlighting during drag. Cleared on drag end.
  snappingGuide: {
    vertical?: number;   // the vertical guide (X) we're snapping to
    horizontal?: number; // the horizontal guide (Y) we're snapping to
  } | null;

  // Controls whether button snapping to guides is enabled
  snapEnabled: boolean;

  // Canvas / viewport design resolution (used for both editor preview and playtest "game" view)
  // Default changed to 16:9 for modern feel. Buttons use % so they adapt.
  canvasWidth: number;
  canvasHeight: number;

  // Реестр предметов (простая версия на первом этапе)
  items: Item[];

  // Variables (гибкая система состояния проекта)
  variables: Variable[];

  // Backgrounds (гибкая система фонов сцены)
  backgrounds: Background[];

  // UI Assets registry (skins for buttons, portraits, bars etc. for Dialogue UI)
  uiAssets: UIAsset[];

  // Speakers (персонажи) registry — source of truth for speaker names shown in dialogue
  speakers: Speaker[];

  // Global visual theme for dialogue widgets
  dialogueTheme: DialogueTheme;

  // === Playtest / Preview State ===
  // Это состояние меняется, когда пользователь кликает по кнопкам на холсте
  playtestState: {
    variableValues: Record<string, number | boolean | string>;
    equippedItemIds: string[]; // legacy
    equippedSlots: Partial<Record<EquipmentSlot, string>>;
    isInventoryOpen: boolean;
    playerAvatar?: string;
    widgetOverrides: Record<string, Partial<UIWidget>>;
    // Текущий индекс реплики в dialogueLines (сбрасывается при смене страницы)
    dialogueLineIndex: number;
    // true когда игрок нажал кнопку и запустил диалог (до этого — показывается статичный текст страницы)
    dialogueStarted: boolean;
    // Модалка награды — null если закрыта
    itemRewardModal: { items: Array<{ itemId: string; amount: number }>; afterCollect?: ButtonAction[] } | null;
  };

  // Actions
  setPages: (pages: StudioPage[]) => void;
  selectPage: (id: string) => void;
  selectButton: (id: string | null) => void;
  selectedWidgetId: string | null;
  selectWidget: (id: string | null) => void;

  updatePage: (id: string, updates: Partial<StudioPage>) => void;
  updateButton: (pageId: string, buttonId: string, updates: Partial<StudioButton>) => void;
  addButton: (pageId: string) => void;
  deleteButton: (pageId: string, buttonId: string) => void;
  moveButton: (pageId: string, buttonId: string, x: number, y: number) => void;
  updateButtonLayout: (pageId: string, buttonId: string, layout: Partial<StudioButton['layout']>) => void;

  // === Per-button history (ported from old visual editor) ===
  restoreButtonFromHistory: (pageId: string, buttonId: string, historyIndex: number) => void; // historyIndex from end (0 = most recent previous)

  copyButtonCoordinates: (pageId: string, buttonId: string) => void;
  pasteButtonCoordinates: (pageId: string, buttonId: string) => void;
  clearCoordinateClipboard: () => void;

  // === Guides & Snapping (visual alignment) ===
  addGuide: (axis: 'horizontal' | 'vertical', position: number) => void;
  removeGuide: (axis: 'horizontal' | 'vertical', position: number) => void;
  clearGuides: (axis?: 'horizontal' | 'vertical') => void;
  moveGuide: (axis: 'horizontal' | 'vertical', oldPosition: number, newPosition: number) => void;
  setSnappingGuide: (snap: { vertical?: number; horizontal?: number } | null) => void;
  setSnapEnabled: (enabled: boolean) => void;

  // Canvas size (design resolution, 16:9 recommended). Changing it re-interprets all % button layouts on the new aspect.
  setCanvasSize: (width: number, height: number) => void;

  // === Project Persistence ===
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => boolean; // returns true if something was loaded
  exportProject: () => void;
  importProject: (data: any) => boolean;
  setProjectName: (name: string) => void;
  createNewProject: () => void;

  // === Items (Предметы) ===
  addItem: (item: Omit<Item, 'id'>) => void;
  updateItem: (id: string, updates: Partial<Omit<Item, 'id'>>) => void;
  deleteItem: (id: string) => void;
  getItem: (id: string) => Item | undefined;

  // === Variables (Гибкая система состояния) ===
  addVariable: (variable: Omit<Variable, 'id'>) => void;
  updateVariable: (id: string, updates: Partial<Omit<Variable, 'id'>>) => void;
  deleteVariable: (id: string) => void;
  getVariable: (id: string) => Variable | undefined;

  // === Backgrounds (Гибкая система фонов) ===
  addBackground: (background: Omit<Background, 'id'>) => void;
  updateBackground: (id: string, updates: Partial<Omit<Background, 'id'>>) => void;
  deleteBackground: (id: string) => void;
  getBackground: (id: string) => Background | undefined;

  // === UI Assets & Widgets (Dialogue UI system) ===
  addUIAsset: (asset: Omit<UIAsset, 'id'>) => void;
  updateUIAsset: (id: string, updates: Partial<Omit<UIAsset, 'id'>>) => void;
  deleteUIAsset: (id: string) => void;
  getUIAsset: (id: string) => UIAsset | undefined;

  // === Speakers (Персонажи) ===
  addSpeaker: (speaker: Omit<Speaker, 'id'> & { id?: string }) => void;
  updateSpeaker: (id: string, updates: Partial<Omit<Speaker, 'id'>>) => void;
  deleteSpeaker: (id: string) => void;

  // === Dialogue Theme ===
  updateDialogueTheme: (updates: Partial<DialogueTheme>) => void;

  // === Widget Clipboard (Ctrl+C/V/D) ===
  copySelectedToWidgetClipboard: () => void;
  pasteFromWidgetClipboard: (offset?: boolean) => void;
  duplicateSelected: () => void;

  // === Dialogue Lines (очередь реплик внутри страницы) ===
  addDialogueLine: (pageId: string, line?: Partial<Omit<DialogueLine, 'id'>>) => void;
  updateDialogueLine: (pageId: string, lineId: string, updates: Partial<Omit<DialogueLine, 'id'>>) => void;
  deleteDialogueLine: (pageId: string, lineId: string) => void;
  advanceDialogueLine: () => void;

  addUIWidget: (pageId: string, widget: Omit<UIWidget, 'id'>) => void;
  updateUIWidget: (pageId: string, widgetId: string, updates: Partial<Omit<UIWidget, 'id'>>) => void;
  deleteUIWidget: (pageId: string, widgetId: string) => void;
  updateUIWidgetLayout: (pageId: string, widgetId: string, layout: Partial<UIWidget['layout']>) => void;
  moveUIWidget: (pageId: string, widgetId: string, x: number, y: number) => void;
  // Optional: helper to apply a preset layout of widgets to a page
  applyUILayoutPreset: (pageId: string, preset: StudioPage['uiLayoutPreset']) => void;

  // Live playtest value mutation (so editing endurance etc in sidebar during Playtest immediately affects backpack size, damage etc)
  setPlaytestVariableValue: (id: string, value: number | boolean | string) => void;

  // === Playtest State Management ===
  resetPlaytestState: () => void;
  executeAction: (action: ButtonAction) => void; // Главная функция выполнения действий

  // === Playtest Equipment (только для визуального фидбэка в Playtest) ===
  equipItem: (itemId: string, targetSlot?: EquipmentSlot) => void;
  unequipItem: (itemId: string) => void;
  isItemEquipped: (itemId: string) => boolean;

  // Инвентарные действия
  dropItem: (itemId: string, amount?: number) => void;
  useItem: (itemId: string) => void;

  // Инвентарь
  openInventory: () => void;
  closeInventory: () => void;

  // === Player Inventory (для модального окна инвентаря в Playtest) ===
  getPlayerInventory: () => Array<{ item: Item; quantity: number }>;

  // === Editor / Playtest Mode ===
  mode: 'editor' | 'playtest';
  setMode: (mode: 'editor' | 'playtest') => void;
  enterPlaytest: () => void;
  exitPlaytest: () => void;
  savePlaytestProgress: () => void;
  loadPlaytestProgress: () => boolean;
  clearPlaytestSave: () => void;
  collectItemReward: () => void;

  renamePage: (oldId: string, newId: string, newTitle?: LocalizedString) => void;
  renameItem: (oldId: string, newId: string, newName?: LocalizedString) => void;

  // === Canvas-only Undo/Redo (for button positions on the canvas) ===
  canvasHistory: any[];
  canvasFuture: any[];
  saveCanvasSnapshot: () => void;
  undoCanvas: () => void;
  redoCanvas: () => void;

  // Добавление стандартных характеристик ГГ
  addDefaultPlayerStats: () => void;

  // Добавление стандартных расходников (ресурсов)
  addDefaultResources: () => void;

  // Добавление только критических характеристик
  addCriticalStats: () => void;

  // === Sidebar Collapse (especially useful in Playtest) ===
  leftSidebarCollapsed: boolean;
  rightSidebarCollapsed: boolean;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setSidebarsForPlaytest: (collapsed: boolean) => void;

  // === Widget Library Modal ===
  isWidgetLibraryOpen: boolean;
  openWidgetLibrary: () => void;
  closeWidgetLibrary: () => void;

  // Editor dialogue preview: показывает конкретную реплику в canvas без плейтеста
  editorDialoguePreviewLine: number | null;
  setEditorDialoguePreview: (idx: number | null) => void;

  // Player stats panel (permanent collapsed block in editor)
  playerStatsCollapsed: boolean;
  togglePlayerStatsCollapsed: () => void;

  // Resources panel (permanent collapsed block, like player stats)
  resourcesCollapsed: boolean;
  toggleResourcesCollapsed: () => void;

  // Inventory block (new dedicated starting inventory management, between resources and variables)
  inventoryCollapsed: boolean;
  toggleInventoryCollapsed: () => void;

  // Variables block
  variablesCollapsed: boolean;
  toggleVariablesCollapsed: () => void;

  // Items block
  itemsCollapsed: boolean;
  toggleItemsCollapsed: () => void;

  // Backgrounds block (new dedicated deep editor for custom scene backgrounds)
  backgroundsCollapsed: boolean;
  toggleBackgroundsCollapsed: () => void;

  // Collapsed state for individual items (to reduce scrolling when many items)
  collapsedItemIds: string[]; // Теперь хранит ID РАЗВЁРНУТЫХ предметов. По умолчанию все свёрнуты.
  toggleItemCollapsed: (itemId: string) => void;

  // === Starting Inventory (explicit management of items player begins with) ===
  startingInventory: Record<string, number>; // itemId -> starting quantity
  addToStartingInventory: (itemId: string, quantity?: number) => void;
  removeFromStartingInventory: (itemId: string) => void;
  setStartingInventoryQuantity: (itemId: string, quantity: number) => void;

  addPage: (actId?: string | null) => void;
  duplicatePage: (id: string) => void;
  deletePage: (id: string) => void;

  // === Acts / Scenes system ===
  acts: StudioAct[];
  unassignedPageIds: string[];  // страницы не входящие ни в один акт
  leftSidebarLocked: boolean;   // замок: не авто-сворачивать при смене режима

  addAct: (title?: string) => string;
  updateAct: (id: string, updates: Partial<Pick<StudioAct, 'title' | 'color' | 'collapsed'>>) => void;
  deleteAct: (id: string, mode: 'unassign' | 'delete-pages') => void;
  duplicateAct: (id: string) => void;
  reorderActs: (fromIdx: number, toIdx: number) => void;
  movePageToAct: (pageId: string, targetActId: string | null, targetIndex: number) => void;
  toggleActCollapsed: (id: string) => void;
  toggleLeftSidebarLocked: () => void;
};


const _initialPages = createDefaultPages();

export const useStudioStore = create<StudioState>((set, get) => ({
  meta: createInitialMeta(),
  pages: _initialPages,
  selectedPageId: 'intro_01',
  selectedButtonId: null,
  selectedWidgetId: null,
  widgetClipboard: null,

  // Guides start empty
  guides: {
    horizontal: [],
    vertical: [],
  },

  snappingGuide: null,
  snapEnabled: true,

  // Canvas design resolution (16:9). Buttons layouts are % so they adapt when changed.
  canvasWidth: 1280,
  canvasHeight: 720,

  // Items registry (Вариант Б — сразу делаем реестр предметов)
  items: [],
  variables: [],

  backgrounds: [],

  uiAssets: [],

  speakers: createDefaultSpeakers(),

  dialogueTheme: { ...DIALOGUE_THEME_PRESETS.darkFantasy },

  playtestState: {
    variableValues: {},
    equippedItemIds: [],
    equippedSlots: {},
    isInventoryOpen: false,
    playerAvatar: 'default',
    widgetOverrides: {},
    itemRewardModal: null,
    dialogueLineIndex: 0,
    dialogueStarted: false,
  },

  // Canvas-only history (for button dragging on the canvas)
  canvasHistory: [],
  canvasFuture: [],

  // Editor / Playtest mode
  mode: 'editor',

  // Sidebar states (auto-collapsed in Playtest by default)
  leftSidebarCollapsed: false,
  rightSidebarCollapsed: false,
  leftSidebarLocked: false,
  isWidgetLibraryOpen: false,
  editorDialoguePreviewLine: null,

  // Acts system
  acts: [],
  unassignedPageIds: _initialPages.map((p) => p.id),

  // Player stats panel starts collapsed by default
  playerStatsCollapsed: true,

  // Resources panel starts collapsed by default (like player stats)
  resourcesCollapsed: true,

  // Inventory block starts collapsed by default
  inventoryCollapsed: true,

  // Variables and Items blocks start collapsed by default
  variablesCollapsed: true,
  itemsCollapsed: true,
  backgroundsCollapsed: true,

  // No items collapsed by default (individual items)
  collapsedItemIds: [],

  // Starting inventory (empty by default)
  startingInventory: {},

  setPages: (pages) => set({ pages }),

  selectPage: (id) => set({ selectedPageId: id, selectedButtonId: null, selectedWidgetId: null, editorDialoguePreviewLine: null }),

  selectButton: (id) => {
    set((s) => ({ selectedButtonId: id, selectedWidgetId: id ? null : s.selectedWidgetId }));
    // Seed initial history entry if this button has no history yet (so UI shows immediately)
    if (id) {
      const state = get();
      const page = state.pages.find(p => p.id === state.selectedPageId);
      const btn = page?.buttons.find(b => b.id === id);
      if (btn && (!btn.history || btn.history.length === 0)) {
        set((s) => ({
          pages: s.pages.map(p =>
            p.id === state.selectedPageId
              ? {
                  ...p,
                  buttons: p.buttons.map(b =>
                    b.id === id
                      ? { ...b, history: [{ layout: { ...b.layout }, ts: new Date().toISOString() }] }
                      : b
                  ),
                }
              : p
          ),
        }));
        get().saveToLocalStorage();
      }
    }
  },

  selectWidget: (id) => {
    set((state) => ({
      selectedWidgetId: id,
      // Clear button selection when widget is selected (mutually exclusive for inspector focus)
      selectedButtonId: id ? null : state.selectedButtonId,
    }));
  },

  updatePage: (id, updates) => {
    set((state) => ({
      pages: state.pages.map((p) => {
        if (p.id !== id) return p;
        let next = { ...p, ...updates };

        // Auto-seed default uiWidgets when a real speaker is chosen and none exist yet (Phase 1 migration)
        const newSpeaker = updates.speaker ?? p.speaker;
        if (newSpeaker && newSpeaker !== 'none' && (!next.uiWidgets || next.uiWidgets.length === 0)) {
          next.uiWidgets = [
            {
              id: `uiw_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
              type: 'dialogueBox',
              layout: { x: 16, y: 78, width: 68, height: 12, z: 20 },
              style: 'default',
            },
            {
              id: `uiw_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
              type: 'textLabel',
              layout: { x: 42, y: 58, width: 16, height: 3, z: 15 },
              style: 'default',
              data: { speakerId: newSpeaker },
            },
          ];
          next.uiLayoutPreset = 'classic_vn';
        }
        return next;
      }),
    }));
    get().saveToLocalStorage();
  },

  updateButton: (pageId, buttonId, updates) => {
    set((state) => ({
      pages: state.pages.map((page) =>
        page.id === pageId
          ? {
              ...page,
              buttons: page.buttons.map((btn) =>
                btn.id === buttonId ? { ...btn, ...updates } : btn
              ),
            }
          : page
      ),
    }));
    get().saveToLocalStorage();
  },

  addButton: (pageId) => {
    const newButton: StudioButton = {
      id: `btn_${Date.now().toString(36)}`,
      text: { ru: 'Новая кнопка', en: 'New button' },
      layout: {
        x: 35 + Math.random() * 20,
        y: 65 + Math.random() * 10,
        width: 24,
        height: 11,
        style: 'default',
      },
      action: { type: 'goToPage', pageId: '' },
      history: [], // ported from old editor: per-button history
    };

    set((state) => ({
      pages: state.pages.map((page) =>
        page.id === pageId ? { ...page, buttons: [...page.buttons, newButton] } : page
      ),
      selectedButtonId: newButton.id,
    }));
    get().saveToLocalStorage();
  },

  deleteButton: (pageId, buttonId) => {
    set((state) => ({
      pages: state.pages.map((page) =>
        page.id === pageId
          ? { ...page, buttons: page.buttons.filter((b) => b.id !== buttonId) }
          : page
      ),
      selectedButtonId: state.selectedButtonId === buttonId ? null : state.selectedButtonId,
    }));
    get().saveToLocalStorage();
  },

  moveButton: (pageId, buttonId, x, y) => {
    set((state) => ({
      pages: state.pages.map((page) =>
        page.id === pageId
          ? {
              ...page,
              buttons: page.buttons.map((btn) => {
                if (btn.id !== buttonId) return btn;
                const prevLayout = { ...btn.layout };
                const newHistory = [
                  ...(btn.history || []),
                  { layout: prevLayout, ts: new Date().toISOString() },
                ].slice(-10);
                return {
                  ...btn,
                  layout: { ...btn.layout, x: Math.max(4, Math.min(82, x)), y: Math.max(8, Math.min(78, y)) },
                  history: newHistory,
                };
              }),
            }
          : page
      ),
    }));
    get().saveToLocalStorage();
  },

  updateButtonLayout: (pageId, buttonId, layoutUpdates) => {
    set((state) => ({
      pages: state.pages.map((page) =>
        page.id === pageId
          ? {
              ...page,
              buttons: page.buttons.map((btn) => {
                if (btn.id !== buttonId) return btn;

                // Port from old editor: push previous layout to per-button history (max 10 entries)
                const prevLayout = { ...btn.layout };
                const newHistory = [
                  ...(btn.history || []),
                  { layout: prevLayout, ts: new Date().toISOString() },
                ].slice(-10); // keep last 10 like old version-history limit

                return {
                  ...btn,
                  layout: { ...btn.layout, ...layoutUpdates },
                  history: newHistory,
                };
              }),
            }
          : page
      ),
    }));
    get().saveToLocalStorage();
  },

  // Ported from old editor: restore a specific previous layout for one button
  restoreButtonFromHistory: (pageId, buttonId, historyIndex) => {
    const state = get();
    const page = state.pages.find(p => p.id === pageId);
    if (!page) return;

    const btn = page.buttons.find(b => b.id === buttonId);
    if (!btn || !btn.history || btn.history.length === 0) return;

    // history is oldest-first in array, last is most recent previous state
    const idx = btn.history.length - 1 - historyIndex; // 0 = last saved previous
    if (idx < 0 || idx >= btn.history.length) return;

    const entry = btn.history[idx];

    set((s) => ({
      pages: s.pages.map(p =>
        p.id === pageId
          ? {
              ...p,
              buttons: p.buttons.map(b =>
                b.id === buttonId
                  ? { ...b, layout: { ...entry.layout } }
                  : b
              ),
            }
          : p
      ),
    }));
    get().saveToLocalStorage();
  },

  renamePage: (oldId: string, newId: string, newTitle?: LocalizedString) => {
    const state = get();
    const trimmedNewId = newId.trim();

    if (!trimmedNewId) {
      alert('ID страницы не может быть пустым');
      return;
    }
    if (trimmedNewId === oldId) {
      // Only updating title
      if (newTitle) {
        set((s) => ({
          pages: s.pages.map(p =>
            p.id === oldId ? { ...p, title: newTitle } : p
          )
        }));
        get().saveToLocalStorage();
      }
      return;
    }
    if (state.pages.some(p => p.id === trimmedNewId)) {
      alert('Страница с таким ID уже существует');
      return;
    }

    // Update page ID + title
    set((s) => ({
      pages: s.pages.map(page => {
        if (page.id !== oldId) return page;

        return {
          ...page,
          id: trimmedNewId,
          title: newTitle || page.title,
        };
      })
    }));

    // Update all goToPage references
    set((s) => ({
      pages: s.pages.map(page => ({
        ...page,
        buttons: page.buttons.map(btn => {
          if (btn.action.type === 'goToPage' && btn.action.pageId === oldId) {
            return {
              ...btn,
              action: { ...btn.action, pageId: trimmedNewId }
            };
          }
          return btn;
        })
      }))
    }));

    // Update acts and unassigned that reference the old page ID
    set((s) => ({
      acts: s.acts.map(a => ({
        ...a,
        pageIds: a.pageIds.map(pid => (pid === oldId ? trimmedNewId : pid)),
      })),
      unassignedPageIds: s.unassignedPageIds.map(pid => (pid === oldId ? trimmedNewId : pid)),
    }));

    // If the renamed page was selected, update selection
    if (state.selectedPageId === oldId) {
      set({ selectedPageId: trimmedNewId });
    }

    get().saveToLocalStorage();
  },

  renameItem: (oldId: string, newId: string, newName?: LocalizedString) => {
    const state = get();
    const trimmedNewId = newId.trim();

    if (!trimmedNewId) {
      alert('ID предмета не может быть пустым');
      return;
    }
    if (trimmedNewId === oldId) {
      if (newName) {
        set((s) => ({
          items: s.items.map(item =>
            item.id === oldId ? { ...item, name: newName } : item
          )
        }));
        get().saveToLocalStorage();
      }
      return;
    }
    if (state.items.some(i => i.id === trimmedNewId)) {
      alert('Предмет с таким ID уже существует');
      return;
    }

    // Update item ID + name
    set((s) => ({
      items: s.items.map(item => {
        if (item.id !== oldId) return item;
        return {
          ...item,
          id: trimmedNewId,
          name: newName || item.name,
        };
      })
    }));

    // Update all references in conditions and actions
    const updateCondition = (cond: any): any => {
      if (!cond) return cond;
      if (cond.type === 'itemQuantity' && cond.itemId === oldId) {
        return { ...cond, itemId: trimmedNewId };
      }
      if (cond.type === 'and' || cond.type === 'or') {
        return { ...cond, conditions: cond.conditions.map(updateCondition) };
      }
      if (cond.type === 'not') {
        return { ...cond, condition: updateCondition(cond.condition) };
      }
      return cond;
    };

    set((s) => ({
      pages: s.pages.map(page => ({
        ...page,
        buttons: page.buttons.map(btn => {
          let newAction = btn.action;

          if ((newAction.type === 'giveItem' || newAction.type === 'removeItem') && newAction.itemId === oldId) {
            newAction = { ...newAction, itemId: trimmedNewId };
          }

          const newVisibleWhen = updateCondition(btn.visibleWhen);
          const newEnabledWhen = updateCondition(btn.enabledWhen);

          if (newAction !== btn.action || newVisibleWhen !== btn.visibleWhen || newEnabledWhen !== btn.enabledWhen) {
            return {
              ...btn,
              action: newAction,
              visibleWhen: newVisibleWhen,
              enabledWhen: newEnabledWhen,
            };
          }
          return btn;
        })
      }))
    }));

    get().saveToLocalStorage();
  },

  // === Coordinate Clipboard ===
  coordinateClipboard: null,

  copyButtonCoordinates: (pageId, buttonId) =>
    set((state) => {
      const page = state.pages.find((p) => p.id === pageId);
      const button = page?.buttons.find((b) => b.id === buttonId);
      if (!button) return state;

      return {
        coordinateClipboard: {
          x: button.layout.x,
          y: button.layout.y,
          width: button.layout.width,
          height: button.layout.height,
        },
      };
    }),

  pasteButtonCoordinates: (pageId, buttonId) =>
    set((state) => {
      if (!state.coordinateClipboard) return state;

      return {
        pages: state.pages.map((page) =>
          page.id === pageId
            ? {
                ...page,
                buttons: page.buttons.map((btn) => {
                  if (btn.id !== buttonId) return btn;
                  const prevLayout = { ...btn.layout };
                  const newHistory = [
                    ...(btn.history || []),
                    { layout: prevLayout, ts: new Date().toISOString() },
                  ].slice(-10);
                  return {
                    ...btn,
                    layout: {
                      ...btn.layout,
                      x: state.coordinateClipboard!.x,
                      y: state.coordinateClipboard!.y,
                      width: state.coordinateClipboard!.width,
                      height: state.coordinateClipboard!.height,
                    },
                    history: newHistory,
                  };
                }),
              }
            : page
        ),
      };
    }),

  clearCoordinateClipboard: () => set({ coordinateClipboard: null }),

  // === Guides Management (for rulers & snapping in the future) ===
  addGuide: (axis: 'horizontal' | 'vertical', position: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(position * 10) / 10)); // 1 decimal precision

    set((state) => {
      const current = state.guides[axis];
      if (current.includes(clamped)) return state; // avoid duplicates

      return {
        guides: {
          ...state.guides,
          [axis]: [...current, clamped].sort((a, b) => a - b),
        },
      };
    });
    get().saveToLocalStorage();
  },

  removeGuide: (axis: 'horizontal' | 'vertical', position: number) => {
    set((state) => ({
      guides: {
        ...state.guides,
        [axis]: state.guides[axis].filter((p) => Math.abs(p - position) > 0.01),
      },
    }));
    get().saveToLocalStorage();
  },

  clearGuides: (axis?: 'horizontal' | 'vertical') => {
    set((state) => ({
      guides: axis
        ? { ...state.guides, [axis]: [] }
        : { horizontal: [], vertical: [] },
    }));
    get().saveToLocalStorage();
  },

  // Move an existing guide to a new position (used for drag)
  moveGuide: (axis: 'horizontal' | 'vertical', oldPosition: number, newPosition: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(newPosition * 10) / 10));

    set((state) => {
      const current = [...state.guides[axis]];
      const index = current.findIndex(p => Math.abs(p - oldPosition) < 0.01);
      if (index === -1) return state;

      current[index] = clamped;
      return {
        guides: {
          ...state.guides,
          [axis]: current.sort((a, b) => a - b),
        },
      };
    });
    get().saveToLocalStorage();
  },

  // Transient snapping feedback (only during button drag)
  setSnappingGuide: (snap: { vertical?: number; horizontal?: number } | null) => {
    set({ snappingGuide: snap });
  },

  setSnapEnabled: (enabled: boolean) => {
    set((state) => {
      // When disabling snapping, clear any active highlight
      if (!enabled) {
        return { snapEnabled: false, snappingGuide: null };
      }
      return { snapEnabled: true };
    });
  },

  setCanvasSize: (width, height) => {
    const w = Math.max(320, Math.min(3840, Math.round(width)));
    const h = Math.max(180, Math.min(2160, Math.round(height)));
    set({ canvasWidth: w, canvasHeight: h });
    get().saveToLocalStorage();
  },

  // === Items Management (Вариант Б) ===
  addItem: (itemData) => {
    const newItem: Item = {
      ...itemData,
      id: `item_${Date.now().toString(36)}`,
      // Дефолтные значения для новых полей
      type: itemData.type ?? 'misc',
      rarity: itemData.rarity ?? 'common',
      maxDurability: itemData.maxDurability ?? 100,
      durability: itemData.durability ?? (itemData.maxDurability ?? 100),
      isEquippable: itemData.isEquippable ?? false,
      slot: itemData.slot ?? null,
      price: itemData.price ?? 0,
      modifiers: itemData.modifiers ?? [],
      weaponDamage: itemData.weaponDamage ?? undefined,
    };
    set((state) => ({
      items: [...state.items, newItem],
    }));
    get().saveToLocalStorage();
  },

  updateItem: (id, updates) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    }));
    get().saveToLocalStorage();
  },

  deleteItem: (id) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    }));
    get().saveToLocalStorage();
  },

  getItem: (id) => {
    return get().items.find((item) => item.id === id);
  },

  // === Variables Management ===
  addVariable: (variableData) => {
    const newVariable: Variable = {
      ...variableData,
      id: `var_${Date.now().toString(36)}`,
    };
    set((state) => ({
      variables: [...state.variables, newVariable],
    }));
    get().saveToLocalStorage();
  },

  updateVariable: (id, updates) => {
    set((state) => ({
      variables: state.variables.map((v) =>
        v.id === id ? { ...v, ...updates } : v
      ),
    }));
    get().saveToLocalStorage();
  },

  deleteVariable: (id) => {
    set((state) => ({
      variables: state.variables.filter((v) => v.id !== id),
    }));
    get().saveToLocalStorage();
  },

  setPlaytestVariableValue: (id, value) => {
    set((state) => ({
      playtestState: {
        ...state.playtestState,
        variableValues: {
          ...state.playtestState.variableValues,
          [id]: value,
        },
      },
    }));
    // no saveToLocalStorage — this is transient playtest-only state
  },

  getVariable: (id) => {
    return get().variables.find((v) => v.id === id);
  },

  // === Backgrounds (Гибкая система фонов сцены) ===
  addBackground: (bgData) => {
    const newBg: Background = {
      ...bgData,
      id: `bg_${Date.now().toString(36)}`,
      settings: bgData.settings ?? {
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        brightness: 1,
        opacity: 1,
        fitMode: 'cover',
        parallax: { enabled: false, speedX: 0.5, speedY: 0.3, reverse: false },
      },
    };
    set((state) => ({ backgrounds: [...state.backgrounds, newBg] }));
    get().saveToLocalStorage();
  },

  updateBackground: (id, updates) => {
    set((state) => ({
      backgrounds: state.backgrounds.map((bg) =>
        bg.id === id ? { ...bg, ...updates } : bg
      ),
    }));
    get().saveToLocalStorage();
  },

  deleteBackground: (id) => {
    set((state) => ({
      backgrounds: state.backgrounds.filter((b) => b.id !== id),
      // If any page used this bg, reset to first available or ''
      pages: state.pages.map((p) =>
        p.background === id
          ? { ...p, background: (state.backgrounds[0]?.id || '') }
          : p
      ),
    }));
    get().saveToLocalStorage();
  },

  getBackground: (id) => {
    return get().backgrounds.find((b) => b.id === id);
  },

  // === UI Assets & Widgets (Dialogue UI) ===
  addUIAsset: (assetData) => {
    const newAsset: UIAsset = {
      ...assetData,
      id: `uiasset_${Date.now().toString(36)}`,
    };
    set((state) => ({ uiAssets: [...state.uiAssets, newAsset] }));
    get().saveToLocalStorage();
  },
  updateUIAsset: (id, updates) => {
    set((state) => ({
      uiAssets: state.uiAssets.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    }));
    get().saveToLocalStorage();
  },
  deleteUIAsset: (id) => {
    set((state) => ({ uiAssets: state.uiAssets.filter((a) => a.id !== id) }));
    get().saveToLocalStorage();
  },
  getUIAsset: (id) => {
    return get().uiAssets.find((a) => a.id === id);
  },

  addSpeaker: (speakerData) => {
    const id = speakerData.id || `spk_${Date.now().toString(36)}`;
    const newSpeaker: Speaker = { displayName: speakerData.displayName, id, ...(speakerData.portraitAssetId ? { portraitAssetId: speakerData.portraitAssetId } : {}) };
    set((state) => ({ speakers: [...state.speakers, newSpeaker] }));
    get().saveToLocalStorage();
  },
  updateSpeaker: (id, updates) => {
    set((state) => ({
      speakers: state.speakers.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    }));
    get().saveToLocalStorage();
  },
  deleteSpeaker: (id) => {
    set((state) => ({ speakers: state.speakers.filter((s) => s.id !== id) }));
    get().saveToLocalStorage();
  },

  updateDialogueTheme: (updates) => {
    set((state) => ({ dialogueTheme: { ...state.dialogueTheme, ...updates } }));
    get().saveToLocalStorage();
  },

  copySelectedToWidgetClipboard: () => {
    const state = get();
    const page = state.pages.find((p) => p.id === state.selectedPageId);
    if (!page) return;
    if (state.selectedWidgetId) {
      const widget = (page.uiWidgets || []).find((w) => w.id === state.selectedWidgetId);
      if (widget) set({ widgetClipboard: { kind: 'widget', item: JSON.parse(JSON.stringify(widget)) } });
    } else if (state.selectedButtonId) {
      const button = page.buttons.find((b) => b.id === state.selectedButtonId);
      if (button) set({ widgetClipboard: { kind: 'button', item: JSON.parse(JSON.stringify(button)) } });
    }
  },

  pasteFromWidgetClipboard: (offset = true) => {
    const state = get();
    const { widgetClipboard, selectedPageId } = state;
    if (!widgetClipboard || !selectedPageId) return;
    const dx = offset ? 2 : 0;
    const dy = offset ? 2 : 0;
    const newId = Date.now().toString(36);
    if (widgetClipboard.kind === 'widget') {
      const src = widgetClipboard.item;
      const newWidget: UIWidget = {
        ...src,
        id: `uiw_${newId}`,
        layout: {
          ...src.layout,
          x: Math.min(98, src.layout.x + dx),
          y: Math.min(98, src.layout.y + dy),
        },
      };
      set((s) => ({
        pages: s.pages.map((p) =>
          p.id === selectedPageId
            ? { ...p, uiWidgets: [...(p.uiWidgets || []), newWidget] }
            : p
        ),
        selectedWidgetId: newWidget.id,
        selectedButtonId: null,
      }));
    } else {
      const src = widgetClipboard.item;
      const newButton: StudioButton = {
        ...src,
        id: `btn_${newId}`,
        layout: {
          ...src.layout,
          x: Math.min(98, src.layout.x + dx),
          y: Math.min(98, src.layout.y + dy),
        },
      };
      set((s) => ({
        pages: s.pages.map((p) =>
          p.id === selectedPageId
            ? { ...p, buttons: [...p.buttons, newButton] }
            : p
        ),
        selectedButtonId: newButton.id,
        selectedWidgetId: null,
      }));
    }
    get().saveToLocalStorage();
  },

  duplicateSelected: () => {
    get().copySelectedToWidgetClipboard();
    get().pasteFromWidgetClipboard(false); // на месте, без смещения
  },

  addUIWidget: (pageId, widgetData) => {
    const newWidget: UIWidget = {
      ...widgetData,
      id: `uiw_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    };
    set((state) => ({
      pages: state.pages.map((p) =>
        p.id === pageId
          ? { ...p, uiWidgets: [...(p.uiWidgets || []), newWidget] }
          : p
      ),
    }));
    get().saveToLocalStorage();
  },
  updateUIWidget: (pageId, widgetId, updates) => {
    set((state) => ({
      pages: state.pages.map((p) =>
        p.id === pageId
          ? {
              ...p,
              uiWidgets: (p.uiWidgets || []).map((w) =>
                w.id === widgetId ? { ...w, ...updates } : w
              ),
            }
          : p
      ),
    }));
    get().saveToLocalStorage();
  },
  deleteUIWidget: (pageId, widgetId) => {
    set((state) => ({
      pages: state.pages.map((p) =>
        p.id === pageId
          ? { ...p, uiWidgets: (p.uiWidgets || []).filter((w) => w.id !== widgetId) }
          : p
      ),
      // clear selection if we deleted the selected widget
      selectedWidgetId: state.selectedWidgetId === widgetId ? null : state.selectedWidgetId,
    }));
    get().saveToLocalStorage();
  },
  applyUILayoutPreset: (pageId, preset) => {
    let defaultWidgets: UIWidget[] = [];
    if (preset === 'classic_vn') {
      defaultWidgets = [
        { id: `uiw_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, type: 'dialogueBox', layout: { x: 16, y: 78, width: 68, height: 12, z: 20 }, style: 'default' },
        { id: `uiw_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, type: 'textLabel', layout: { x: 42, y: 58, width: 16, height: 3, z: 15 }, style: 'default' },
      ];
    } else if (preset === 'bottom_bar') {
      defaultWidgets = [
        { id: `w_bar_${Date.now()}`, type: 'dialogueBox', layout: { x: 10, y: 82, width: 80, height: 14, z: 10 }, style: 'default' },
        { id: `w_port_${Date.now()}`, type: 'portrait', layout: { x: 78, y: 40, width: 18, height: 35, z: 5 }, style: 'default' },
        { id: `w_choice1_${Date.now()}`, type: 'choiceButton', layout: { x: 15, y: 92, width: 30, height: 6, z: 30 }, style: 'default' },
        { id: `w_choice2_${Date.now()}`, type: 'choiceButton', layout: { x: 55, y: 92, width: 30, height: 6, z: 30 }, style: 'default' },
        { id: `w_qinv_${Date.now()}`, type: 'quickAction', layout: { x: 2, y: 15, width: 6, height: 6, z: 50 }, data: { actionType: 'inventory' } },
      ];
    } else if (preset === 'left_bar') {
      defaultWidgets = [
        { id: `w_cont_${Date.now()}`, type: 'container', layout: { x: 1, y: 10, width: 10, height: 80, z: 1 } },
        { id: `w_qinv_${Date.now()}`, type: 'quickAction', layout: { x: 2, y: 15, width: 8, height: 8, z: 10 }, data: { actionType: 'inventory' } },
        { id: `w_qmap_${Date.now()}`, type: 'quickAction', layout: { x: 2, y: 28, width: 8, height: 8, z: 10 }, data: { actionType: 'map' } },
        { id: `w_qsk_${Date.now()}`, type: 'quickAction', layout: { x: 2, y: 41, width: 8, height: 8, z: 10 }, data: { actionType: 'skills' } },
      ];
    } else if (preset === 'full_dialogue_demo') {
      defaultWidgets = [
        { id: `uiw_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, type: 'dialogueBox', layout: { x: 15, y: 70, width: 70, height: 20, z: 20 }, style: 'default' },
        { id: `w_port1_${Date.now()}`, type: 'portrait', layout: { x: 78, y: 25, width: 18, height: 38, z: 5 }, data: { speakerId: 'mila', variant: 'neutral' } },
        { id: `w_port2_${Date.now()}`, type: 'portrait', layout: { x: 2, y: 25, width: 18, height: 38, z: 5 }, data: { speakerId: 'slay', variant: 'default' } },
        { id: `w_cont_${Date.now()}`, type: 'container', layout: { x: 1, y: 12, width: 10, height: 75, z: 1 }, data: { title: 'Меню' } },
        { id: `w_qinv_${Date.now()}`, type: 'quickAction', layout: { x: 2, y: 18, width: 7, height: 7, z: 10 }, data: { actionType: 'inventory' } },
        { id: `w_qsk_${Date.now()}`, type: 'quickAction', layout: { x: 2, y: 30, width: 7, height: 7, z: 10 }, data: { actionType: 'skills' } },
        { id: `w_int_${Date.now()}`, type: 'intensityBar', layout: { x: 12, y: 5, width: 25, height: 3.5, z: 30 }, data: { valueVar: 'souls', parts: 3 } },
        { id: `w_ch1_${Date.now()}`, type: 'choiceButton', layout: { x: 20, y: 92, width: 28, height: 6, z: 25 }, style: 'default', text: { ru: 'Согласиться', en: 'Agree' }, data: { linkedButtonId: '', setIntensity: 40 } },
        { id: `w_ch2_${Date.now()}`, type: 'choiceButton', layout: { x: 52, y: 92, width: 28, height: 6, z: 25 }, style: 'important', text: { ru: 'Отказаться', en: 'Refuse' }, data: { linkedButtonId: '', setIntensity: 80 } },
      ];
    } else if (preset === 'freeform') {
      defaultWidgets = [];
    }
    set((state) => ({
      pages: state.pages.map((p) =>
        p.id === pageId
          ? { ...p, uiLayoutPreset: preset, uiWidgets: defaultWidgets.length ? defaultWidgets : (p.uiWidgets || []) }
          : p
      ),
    }));
    get().saveToLocalStorage();
  },

  updateUIWidgetLayout: (pageId, widgetId, layoutUpdates) => {
    set((state) => ({
      pages: state.pages.map((page) =>
        page.id === pageId
          ? {
              ...page,
              uiWidgets: (page.uiWidgets || []).map((w) =>
                w.id === widgetId
                  ? { ...w, layout: { ...w.layout, ...layoutUpdates } }
                  : w
              ),
            }
          : page
      ),
    }));
    get().saveToLocalStorage();
  },

  moveUIWidget: (pageId, widgetId, x, y) => {
    set((state) => ({
      pages: state.pages.map((page) =>
        page.id === pageId
          ? {
              ...page,
              uiWidgets: (page.uiWidgets || []).map((w) =>
                w.id === widgetId ? { ...w, layout: { ...w.layout, x, y } } : w
              ),
            }
          : page
      ),
    }));
    get().saveToLocalStorage();
  },

  // === Dialogue Lines ===
  addDialogueLine: (pageId, line = {}) => {
    const id = `dl_${Date.now().toString(36)}`;
    const newLine: DialogueLine = {
      id,
      text: { ru: line.text?.ru ?? '', en: line.text?.en ?? '' },
      speaker: line.speaker,
      portraitVariant: line.portraitVariant,
    };
    set((state) => ({
      pages: state.pages.map((p) =>
        p.id === pageId
          ? { ...p, dialogueLines: [...(p.dialogueLines || []), newLine] }
          : p
      ),
    }));
    get().saveToLocalStorage();
  },

  updateDialogueLine: (pageId, lineId, updates) => {
    set((state) => ({
      pages: state.pages.map((p) =>
        p.id === pageId
          ? {
              ...p,
              dialogueLines: (p.dialogueLines || []).map((l) =>
                l.id === lineId ? { ...l, ...updates } : l
              ),
            }
          : p
      ),
    }));
    get().saveToLocalStorage();
  },

  deleteDialogueLine: (pageId, lineId) => {
    set((state) => ({
      pages: state.pages.map((p) =>
        p.id === pageId
          ? { ...p, dialogueLines: (p.dialogueLines || []).filter((l) => l.id !== lineId) }
          : p
      ),
    }));
    get().saveToLocalStorage();
  },

  advanceDialogueLine: () => {
    const state = get();
    const page = state.pages.find((p) => p.id === state.selectedPageId);
    const total = page?.dialogueLines?.length ?? 0;
    const current = state.playtestState.dialogueLineIndex;
    if (current < total - 1) {
      set((s) => ({
        playtestState: { ...s.playtestState, dialogueLineIndex: current + 1 },
      }));
    }
  },

  // === Playtest State ===
  resetPlaytestState: () => {
    const state = get();

    // Start with all variables at their default values
    const newVariableValues: Record<string, number | boolean | string> = {};
    state.variables.forEach((v) => {
      newVariableValues[v.id] = v.defaultValue;
    });

    // Override with starting inventory quantities (only for items that have a linked quantity variable)
    Object.entries(state.startingInventory).forEach(([itemId, qty]) => {
      const item = state.items.find((i) => i.id === itemId);
      if (item?.quantityVariableId) {
        newVariableValues[item.quantityVariableId] = qty;
      }
    });

    set({
      playtestState: {
        variableValues: newVariableValues,
        equippedItemIds: [],
        equippedSlots: {},
        isInventoryOpen: false,
        playerAvatar: 'default',
        widgetOverrides: {},
        dialogueLineIndex: 0,
        dialogueStarted: false,
        itemRewardModal: null,
      },
      snappingGuide: null,
    });
  },

  // === Playtest Equipment (live only during playtest session) ===
  equipItem: (itemId, targetSlot) => {
    set((state) => {
      const ps = state.playtestState;

      // Если указан целевой слот (weapon_right / weapon_left / shield и т.д.), 
      // записываем в equippedSlots
      if (targetSlot) {
        return {
          playtestState: {
            ...ps,
            equippedSlots: {
              ...ps.equippedSlots,
              [targetSlot]: itemId,
            },
          },
        };
      }

      // Fallback — старое поведение
      const current = ps.equippedItemIds;
      if (current.includes(itemId)) return state;

      return {
        playtestState: {
          ...ps,
          equippedItemIds: [...current, itemId],
        },
      };
    });
  },

  unequipItem: (itemId) => {
    set((state) => {
      const ps = state.playtestState;

      // Удаляем из equippedSlots, если там лежит
      const newEquippedSlots = { ...ps.equippedSlots };
      Object.keys(newEquippedSlots).forEach((slot) => {
        if (newEquippedSlots[slot as EquipmentSlot] === itemId) {
          delete newEquippedSlots[slot as EquipmentSlot];
        }
      });

      return {
        playtestState: {
          ...ps,
          equippedSlots: newEquippedSlots,
          equippedItemIds: ps.equippedItemIds.filter(id => id !== itemId),
        },
      };
    });
  },

  isItemEquipped: (itemId) => {
    const ps = get().playtestState;
    return ps.equippedItemIds.includes(itemId) ||
           Object.values(ps.equippedSlots).includes(itemId);
  },

  openInventory: () => {
    set((s) => ({
      playtestState: { ...s.playtestState, isInventoryOpen: true },
    }));
  },

  closeInventory: () => {
    set((s) => ({
      playtestState: { ...s.playtestState, isInventoryOpen: false },
    }));
  },

  // === Инвентарные действия ===
  dropItem: (itemId, amount = 1) => {
    const state = get();
    const item = state.items.find(i => i.id === itemId);
    if (!item) return;

    if (item.quantityVariableId) {
      const current = Number(state.playtestState.variableValues[item.quantityVariableId] ?? 0);
      const newVal = Math.max(0, current - amount);

      // 1. Обновляем live значение (для текущей сессии Playtest)
      get().setPlaytestVariableValue(item.quantityVariableId, newVal);

      // 2. Сохраняем в defaultValue переменной
      get().updateVariable(item.quantityVariableId, { defaultValue: newVal });

      // 3. Синхронизируем startingInventory (это источник истины для resetPlaytestState при перезагрузке).
      get().setStartingInventoryQuantity(itemId, newVal);
    } else {
      // Для чисто startingInventory предметов (без quantityVariableId)
      const current = state.startingInventory[itemId] ?? 0;
      const newVal = Math.max(0, current - amount);
      get().setStartingInventoryQuantity(itemId, newVal);
    }
  },

  useItem: (itemId) => {
    // Простая реализация: уменьшаем количество на 1
    // В будущем здесь можно будет триггерить эффекты (heal, buff и т.д.)
    get().dropItem(itemId, 1);
    const item = get().items.find(i => i.id === itemId);
    if (item) {
      // Можно будет расширить на toast с эффектом
    }
  },

  // Возвращает актуальный инвентарь игрока во время Playtest
  // (учитывает и startingInventory, и изменения через giveItem/removeItem)
  getPlayerInventory: () => {
    const state = get();
    const inventory: Array<{ item: Item; quantity: number }> = [];

    state.items.forEach((item) => {
      if (item.quantityVariableId) {
        const quantity = Number(state.playtestState.variableValues[item.quantityVariableId] ?? 0);
        if (quantity > 0) {
          inventory.push({ item, quantity });
        }
      } else {
        // Если quantityVariableId нет, но предмет есть в startingInventory — показываем
        const startingQty = state.startingInventory[item.id] ?? 0;
        if (startingQty > 0) {
          inventory.push({ item, quantity: startingQty });
        }
      }
    });

    return inventory;
  },

  // === Mode Management (Editor / Playtest) ===
  setMode: (newMode) => set({ mode: newMode }),

  enterPlaytest: () => {
    // Auto-load save if it exists, otherwise reset to defaults
    const loaded = get().loadPlaytestProgress();
    if (!loaded) get().resetPlaytestState();

    const locked = get().leftSidebarLocked;
    set({
      mode: 'playtest',
      ...(locked ? {} : { leftSidebarCollapsed: true, rightSidebarCollapsed: true }),
    });
  },

  savePlaytestProgress: () => {
    try {
      const { playtestState } = get();
      const save = {
        variableValues: playtestState.variableValues,
        equippedSlots: playtestState.equippedSlots,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem('slay-playtest-save', JSON.stringify(save));
    } catch {}
  },

  loadPlaytestProgress: () => {
    try {
      const raw = localStorage.getItem('slay-playtest-save');
      if (!raw) return false;
      const save = JSON.parse(raw);
      set((s) => ({
        playtestState: {
          ...s.playtestState,
          variableValues: save.variableValues || {},
          equippedSlots: save.equippedSlots || {},
        },
      }));
      return true;
    } catch { return false; }
  },

  clearPlaytestSave: () => {
    try { localStorage.removeItem('slay-playtest-save'); } catch {}
  },

  collectItemReward: () => {
    const { playtestState } = get();
    const reward = playtestState.itemRewardModal;
    if (!reward) return;
    set((s) => ({ playtestState: { ...s.playtestState, itemRewardModal: null } }));
    for (const { itemId, amount } of reward.items) {
      get().executeAction({ type: 'giveItem', itemId, amount });
    }
    if (reward.afterCollect?.length) {
      for (const a of reward.afterCollect) get().executeAction(a);
    }
  },

  exitPlaytest: () => {
    const locked = get().leftSidebarLocked;
    set({
      mode: 'editor',
      // Expand sidebars unless locked by user
      ...(locked ? {} : { leftSidebarCollapsed: false, rightSidebarCollapsed: false }),
    });
  },

  // Sidebar collapse helpers
  toggleLeftSidebar: () => set((state) => ({ leftSidebarCollapsed: !state.leftSidebarCollapsed })),
  toggleRightSidebar: () => set((state) => ({ rightSidebarCollapsed: !state.rightSidebarCollapsed })),

  // Widget Library Modal
  openWidgetLibrary: () => set({ isWidgetLibraryOpen: true }),
  closeWidgetLibrary: () => set({ isWidgetLibraryOpen: false }),

  setEditorDialoguePreview: (idx) => set({ editorDialoguePreviewLine: idx }),

  togglePlayerStatsCollapsed: () => set((state) => ({ playerStatsCollapsed: !state.playerStatsCollapsed })),

  toggleResourcesCollapsed: () => set((state) => ({ resourcesCollapsed: !state.resourcesCollapsed })),

  toggleInventoryCollapsed: () => set((state) => ({ inventoryCollapsed: !state.inventoryCollapsed })),

  toggleVariablesCollapsed: () => set((state) => ({ variablesCollapsed: !state.variablesCollapsed })),
  toggleItemsCollapsed: () => set((state) => ({ itemsCollapsed: !state.itemsCollapsed })),

  toggleBackgroundsCollapsed: () => set((state) => ({ backgroundsCollapsed: !state.backgroundsCollapsed })),

  // === Acts system ===
  addAct: (title) => {
    const id = `act_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
    const newAct: StudioAct = { id, title: title || 'Новый акт', collapsed: false, pageIds: [] };
    set((state) => ({ acts: [...state.acts, newAct] }));
    get().saveToLocalStorage();
    return id;
  },

  updateAct: (id, updates) => {
    set((state) => ({ acts: state.acts.map((a) => (a.id === id ? { ...a, ...updates } : a)) }));
    get().saveToLocalStorage();
  },

  deleteAct: (id, mode) => {
    const state = get();
    const act = state.acts.find((a) => a.id === id);
    if (!act) return;
    if (mode === 'delete-pages') {
      const toDelete = new Set(act.pageIds);
      const newPages = state.pages.filter((p) => !toDelete.has(p.id));
      const newUnassigned = state.unassignedPageIds.filter((pid) => !toDelete.has(pid));
      const newSelected = toDelete.has(state.selectedPageId ?? '')
        ? (newPages[0]?.id ?? null) : state.selectedPageId;
      set({ pages: newPages, unassignedPageIds: newUnassigned, acts: state.acts.filter((a) => a.id !== id), selectedPageId: newSelected });
    } else {
      // unassign: move pages to unassigned
      set((s) => ({
        acts: s.acts.filter((a) => a.id !== id),
        unassignedPageIds: [...s.unassignedPageIds, ...act.pageIds],
      }));
    }
    get().saveToLocalStorage();
  },

  duplicateAct: (id) => {
    const state = get();
    const src = state.acts.find((a) => a.id === id);
    if (!src) return;
    const ts = Date.now().toString(36);
    const newActId = `act_${ts}_dup`;
    const pageIdMap: Record<string, string> = {};
    const newPages: StudioPage[] = src.pageIds.map((pid, i) => {
      const srcPage = state.pages.find((p) => p.id === pid);
      if (!srcPage) return null as any;
      const newPid = `${pid}_c${ts}_${i}`;
      pageIdMap[pid] = newPid;
      const cloned = JSON.parse(JSON.stringify(srcPage)) as StudioPage;
      cloned.id = newPid;
      cloned.title = { ru: srcPage.title.ru + ' (копия)', en: srcPage.title.en + ' (copy)' };
      cloned.buttons = cloned.buttons.map((b, bi) => ({ ...b, id: `btn_${ts}_${i}_${bi}` }));
      cloned.uiWidgets = (cloned.uiWidgets || []).map((w, wi) => ({ ...w, id: `uiw_${ts}_${i}_${wi}` }));
      return cloned;
    }).filter(Boolean);
    const newAct: StudioAct = {
      id: newActId,
      title: src.title + ' (копия)',
      color: src.color,
      collapsed: false,
      pageIds: src.pageIds.map((pid) => pageIdMap[pid]).filter(Boolean),
    };
    const srcActIdx = state.acts.findIndex((a) => a.id === id);
    const newActs = [...state.acts];
    newActs.splice(srcActIdx + 1, 0, newAct);
    set((s) => ({ pages: [...s.pages, ...newPages], acts: newActs }));
    get().saveToLocalStorage();
  },

  reorderActs: (fromIdx, toIdx) => {
    set((state) => {
      const newActs = [...state.acts];
      const [moved] = newActs.splice(fromIdx, 1);
      newActs.splice(toIdx, 0, moved);
      return { acts: newActs };
    });
    get().saveToLocalStorage();
  },

  movePageToAct: (pageId, targetActId, targetIndex) => {
    set((state) => {
      // Remove from current location
      const newActs = state.acts.map((a) => ({ ...a, pageIds: a.pageIds.filter((pid) => pid !== pageId) }));
      const newUnassigned = state.unassignedPageIds.filter((pid) => pid !== pageId);
      // Insert at target
      if (targetActId) {
        return {
          acts: newActs.map((a) => {
            if (a.id !== targetActId) return a;
            const ids = [...a.pageIds];
            ids.splice(Math.min(targetIndex, ids.length), 0, pageId);
            return { ...a, pageIds: ids };
          }),
          unassignedPageIds: newUnassigned,
        };
      } else {
        const ids = [...newUnassigned];
        ids.splice(Math.min(targetIndex, ids.length), 0, pageId);
        return { acts: newActs, unassignedPageIds: ids };
      }
    });
    get().saveToLocalStorage();
  },

  toggleActCollapsed: (id) => {
    set((state) => ({ acts: state.acts.map((a) => (a.id === id ? { ...a, collapsed: !a.collapsed } : a)) }));
  },

  toggleLeftSidebarLocked: () => set((state) => ({ leftSidebarLocked: !state.leftSidebarLocked })),

  toggleItemCollapsed: (itemId) => set((state) => {
    // Теперь collapsedItemIds = список РАЗВЁРНУТЫХ предметов.
    // По умолчанию (если id нет в массиве) — предмет свёрнут.
    const isExpanded = state.collapsedItemIds.includes(itemId);
    return {
      collapsedItemIds: isExpanded
        ? state.collapsedItemIds.filter(id => id !== itemId)   // был развёрнут → сворачиваем
        : [...state.collapsedItemIds, itemId]                  // был свёрнут → разворачиваем
    };
  }),

  // === Starting Inventory Management ===
  addToStartingInventory: (itemId, quantity = 1) => {
    const state = get();
    const item = state.items.find(i => i.id === itemId);
    if (!item) return;

    // Если у предмета ещё нет привязки к переменной количества — создаём её автоматически
    let targetQuantityVarId = item.quantityVariableId;

    if (!targetQuantityVarId) {
      const suggestedName = `item_${item.name.ru.toLowerCase().replace(/\s+/g, '_')}_qty`;
      const newVar: Omit<Variable, 'id'> = {
        name: suggestedName,
        displayName: { ru: `Кол-во: ${item.name.ru}`, en: `Qty: ${item.name.en}` },
        type: 'number',
        defaultValue: 0,
        category: 'inventory',
      };

      // Создаём переменную
      const varId = `var_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      const createdVar: Variable = { ...newVar, id: varId };

      set((s) => ({
        variables: [...s.variables, createdVar],
      }));

      // Привязываем к предмету
      set((s) => ({
        items: s.items.map(i =>
          i.id === itemId ? { ...i, quantityVariableId: varId } : i
        ),
      }));

      targetQuantityVarId = varId;

      // Сразу ставим defaultValue новой переменной на текущее количество
      set((s) => ({
        variables: s.variables.map(v =>
          v.id === varId ? { ...v, defaultValue: quantity } : v
        ),
      }));
    }

    // Добавляем/увеличиваем в startingInventory
    const newQty = Math.max(0, (state.startingInventory[itemId] ?? 0) + quantity);

    set((s) => ({
      startingInventory: {
        ...s.startingInventory,
        [itemId]: newQty,
      },
    }));

    // Если уже есть quantityVariableId — обновляем её defaultValue (чтобы старт был правильным)
    if (targetQuantityVarId) {
      set((s) => ({
        variables: s.variables.map(v =>
          v.id === targetQuantityVarId ? { ...v, defaultValue: newQty } : v
        ),
      }));
    }

    get().saveToLocalStorage();
  },

  removeFromStartingInventory: (itemId) => {
    set((state) => {
      const newInv = { ...state.startingInventory };
      delete newInv[itemId];
      return { startingInventory: newInv };
    });
    get().saveToLocalStorage();
  },

  setStartingInventoryQuantity: (itemId, quantity) => {
    set((state) => ({
      startingInventory: {
        ...state.startingInventory,
        [itemId]: Math.max(0, Math.floor(quantity)),
      },
    }));
    get().saveToLocalStorage();
  },

  setSidebarsForPlaytest: (collapsed) => set({
    leftSidebarCollapsed: collapsed,
    rightSidebarCollapsed: collapsed,
  }),

  // === Canvas Undo/Redo (only button layouts from canvas) ===
  saveCanvasSnapshot: () => {
    const state = get();
    const snapshot = state.pages.map(page => ({
      id: page.id,
      buttons: page.buttons.map(btn => ({
        id: btn.id,
        layout: { ...btn.layout }
      })),
      uiWidgets: (page.uiWidgets || []).map((w: any) => ({
        id: w.id,
        layout: { ...w.layout }
      }))
    }));

    set((s) => ({
      canvasHistory: [...s.canvasHistory.slice(-49), snapshot],
      canvasFuture: []
    }));
  },

  undoCanvas: () => {
    const state = get();
    if (state.canvasHistory.length === 0) return;

    const previous = state.canvasHistory[state.canvasHistory.length - 1];
    const current = state.pages.map(page => ({
      id: page.id,
      buttons: page.buttons.map(btn => ({
        id: btn.id,
        layout: { ...btn.layout }
      })),
      uiWidgets: (page.uiWidgets || []).map((w: any) => ({
        id: w.id,
        layout: { ...w.layout }
      }))
    }));

    set((s) => ({
      pages: s.pages.map(page => {
        const snapPage = previous.find((p: any) => p.id === page.id);
        if (!snapPage) return page;
        return {
          ...page,
          buttons: page.buttons.map(btn => {
            const snapBtn = snapPage.buttons.find((b: any) => b.id === btn.id);
            return snapBtn ? { ...btn, layout: { ...btn.layout, ...snapBtn.layout } } : btn;
          }),
          uiWidgets: (page.uiWidgets || []).map((w: any) => {
            const snapW = snapPage.uiWidgets?.find((sw: any) => sw.id === w.id);
            return snapW ? { ...w, layout: { ...w.layout, ...snapW.layout } } : w;
          })
        };
      }),
      canvasHistory: s.canvasHistory.slice(0, -1),
      canvasFuture: [current, ...s.canvasFuture].slice(0, 50)
    }));
  },

  redoCanvas: () => {
    const state = get();
    if (state.canvasFuture.length === 0) return;

    const next = state.canvasFuture[0];
    const current = state.pages.map(page => ({
      id: page.id,
      buttons: page.buttons.map(btn => ({
        id: btn.id,
        layout: { ...btn.layout }
      })),
      uiWidgets: (page.uiWidgets || []).map((w: any) => ({
        id: w.id,
        layout: { ...w.layout }
      }))
    }));

    set((s) => ({
      pages: s.pages.map(page => {
        const snapPage = next.find((p: any) => p.id === page.id);
        if (!snapPage) return page;
        return {
          ...page,
          buttons: page.buttons.map(btn => {
            const snapBtn = snapPage.buttons.find((b: any) => b.id === btn.id);
            return snapBtn ? { ...btn, layout: { ...btn.layout, ...snapBtn.layout } } : btn;
          }),
          uiWidgets: (page.uiWidgets || []).map((w: any) => {
            const snapW = snapPage.uiWidgets?.find((sw: any) => sw.id === w.id);
            return snapW ? { ...w, layout: { ...w.layout, ...snapW.layout } } : w;
          })
        };
      }),
      canvasHistory: [...s.canvasHistory, current].slice(-50),
      canvasFuture: s.canvasFuture.slice(1)
    }));
  },

  executeAction: (action) => {
    const state = get();
    const currentValues = { ...state.playtestState.variableValues };

    switch (action.type) {
      case 'setVariable': {
        currentValues[action.variableId] = action.value;
        break;
      }
      case 'addToVariable':
      case 'subtractFromVariable': {
        const current = Number(currentValues[action.variableId] ?? 0);
        const delta = action.type === 'addToVariable' ? action.amount : -action.amount;
        currentValues[action.variableId] = current + delta;
        break;
      }
      case 'giveItem':
      case 'removeItem': {
        const item = state.items.find(i => i.id === action.itemId);
        if (item?.quantityVariableId) {
          const current = Number(currentValues[item.quantityVariableId] ?? 0);
          const delta = action.type === 'giveItem' ? action.amount : -action.amount;
          currentValues[item.quantityVariableId] = Math.max(0, current + delta);
        }
        break;
      }
      case 'changeRelationship':
      case 'changeReputation':
      case 'changePlayerStat':
      case 'giveResource':
      case 'removeResource': {
        // Для простоты на первом этапе все эти значения тоже живём через переменные
        // (пользователь может создать переменные типа "relationship_mila", "reputation", "strength" и т.д.)
        // Здесь можно добавить более специальную логику позже.
        console.log('Action executed (preview):', action);
        break;
      }
      case 'goToPage': {
        get().selectPage(action.pageId);
        get().selectButton(null);
        set((s) => ({
          playtestState: { ...s.playtestState, dialogueLineIndex: 0, dialogueStarted: false, widgetOverrides: {} },
        }));
        const targetPage = get().pages.find(p => p.id === action.pageId);
        if (targetPage?.onEnter?.length) {
          for (const enterAction of targetPage.onEnter) {
            get().executeAction(enterAction);
          }
        }
        return;
      }
      case 'openInventory': {
        set((s) => ({
          playtestState: { ...s.playtestState, isInventoryOpen: true },
        }));
        break;
      }
      case 'showItemReward': {
        set((s) => ({
          playtestState: {
            ...s.playtestState,
            itemRewardModal: { items: action.items, afterCollect: action.afterCollect },
          },
        }));
        return;
      }
      case 'advanceDialogue': {
        const { playtestState: ps, pages, selectedPageId } = get();
        const page = pages.find(p => p.id === selectedPageId);
        if (!page?.dialogueLines?.length) return;
        if (!ps.dialogueStarted) {
          // Первый вызов — запускаем с первой реплики
          set((s) => ({
            playtestState: { ...s.playtestState, dialogueStarted: true, dialogueLineIndex: 0 },
          }));
        } else {
          const current = ps.dialogueLineIndex;
          const total = page.dialogueLines.length;
          if (current < total - 1) {
            set((s) => ({
              playtestState: { ...s.playtestState, dialogueLineIndex: current + 1 },
            }));
          } else {
            // Последняя реплика — запускаем onDialogueEnd
            if (page.onDialogueEnd?.length) {
              for (const a of page.onDialogueEnd) get().executeAction(a);
            }
          }
        }
        return;
      }
      case 'setWidgetProperty': {
        set((s) => ({
          playtestState: {
            ...s.playtestState,
            widgetOverrides: {
              ...s.playtestState.widgetOverrides,
              [action.widgetId]: {
                ...(s.playtestState.widgetOverrides[action.widgetId] || {}),
                [action.key]: action.value,
              },
            },
          },
        }));
        break;
      }
      case 'setPortraitVariant': {
        let targetWidgetId = action.widgetId;
        if (!targetWidgetId) {
          // auto target first portrait widget on current page
          const page = state.pages.find(p => p.id === state.selectedPageId);
          const portraitW = (page?.uiWidgets || []).find((w: any) => w.type === 'portrait');
          targetWidgetId = portraitW ? portraitW.id : 'auto-portrait';
        }
        set((s) => ({
          playtestState: {
            ...s.playtestState,
            widgetOverrides: {
              ...s.playtestState.widgetOverrides,
              [targetWidgetId]: {
                ...(s.playtestState.widgetOverrides[targetWidgetId] || {}),
                data: {
                  ...((s.playtestState.widgetOverrides[targetWidgetId] || {}).data || {}),
                  variant: action.variant,
                },
              },
            },
          },
        }));
        break;
      }
      case 'setIntensity': {
        // For demo: if there's an intensity var, mutate it
        const intensityVar = state.variables.find(v => v.name.includes('intensity') || v.name === 'souls');
        if (intensityVar) {
          let newVal = typeof currentValues[intensityVar.id] === 'number' ? (currentValues[intensityVar.id] as number) : (intensityVar.defaultValue as number || 0);
          if (action.value === 'delta' && action.delta) newVal += action.delta;
          else if (typeof action.value === 'number') newVal = action.value;
          currentValues[intensityVar.id] = Math.max(0, Math.min(100, newVal));
        }
        break;
      }
      default:
        // startQuest и другие неизвестные действия пока игнорируем
        break;
    }

    set((s) => ({
      playtestState: {
        ...s.playtestState,
        variableValues: currentValues,
      },
    }));
    get().savePlaytestProgress();
  },

  // === Project Persistence ===
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
      canvasWidth: state.canvasWidth,
      canvasHeight: state.canvasHeight,
    };
    try {
      localStorage.setItem('slay-studio-project', JSON.stringify(dataToSave));
      set((s) => ({ meta: { ...s.meta, lastSaved: dataToSave.meta.lastSaved } }));
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

      // Migrate legacy page.background (old string keys like 'forest') to '' or valid id
      // Also ensure uiWidgets array exists for new dialogue UI system (back-compat)
      const migratedPages = parsed.pages.map((p: any) => {
        let pg = {
          ...p,
          background: bgIdSet.has(p.background) ? p.background : (p.background || ''),
          uiWidgets: Array.isArray(p.uiWidgets) ? p.uiWidgets : (p.uiWidgets || []),
          uiLayoutPreset: p.uiLayoutPreset || 'freeform',
        };
        // One-time seed defaults for legacy dialog pages that have speaker but no widgets yet
        if (pg.speaker && pg.speaker !== 'none' && (!pg.uiWidgets || pg.uiWidgets.length === 0)) {
          pg.uiWidgets = [
            { id: `uiw_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, type: 'dialogueBox', layout: { x: 16, y: 78, width: 68, height: 12, z: 20 }, style: 'default' },
            { id: `uiw_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, type: 'textLabel', layout: { x: 42, y: 58, width: 16, height: 3, z: 15 }, style: 'default', data: { speakerId: pg.speaker } },
          ];
          pg.uiLayoutPreset = 'classic_vn';
        }
        return pg;
      });

      // Sanitize: ensure all uiWidget IDs are globally unique (fix duplicate IDs from old presets)
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

      // Migration: if acts not present, put all pages in unassigned
      const rawActs: StudioAct[] = parsed.acts || [];
      const rawUnassigned: string[] = parsed.unassignedPageIds
        || (parsed.acts ? [] : sanitizedPages.map((p: any) => p.id));

      // Sanitize: remove act.pageIds that no longer exist in pages (e.g. after a rename without the fix)
      const validPageIds = new Set<string>(sanitizedPages.map((p: any) => p.id));
      const loadedActs = rawActs.map((a: StudioAct) => ({
        ...a,
        pageIds: a.pageIds.filter((pid: string) => validPageIds.has(pid)),
      }));

      // Collect all page IDs that are tracked somewhere
      const trackedIds = new Set<string>([
        ...loadedActs.flatMap((a: StudioAct) => a.pageIds),
        ...rawUnassigned.filter((pid: string) => validPageIds.has(pid)),
      ]);

      // Any page that slipped through (renamed before fix, orphaned) goes to unassigned
      const orphaned = sanitizedPages
        .map((p: any) => p.id)
        .filter((pid: string) => !trackedIds.has(pid));

      const loadedUnassigned = [
        ...rawUnassigned.filter((pid: string) => validPageIds.has(pid)),
        ...orphaned,
      ];

      set({
        meta: parsed.meta || createInitialMeta(),
        pages: sanitizedPages,
        selectedPageId: parsed.selectedPageId || migratedPages[0]?.id || null,
        selectedButtonId: null,
        selectedWidgetId: null,
        coordinateClipboard: null,
        acts: loadedActs,
        unassignedPageIds: loadedUnassigned,
        // Backward compatible: default to empty guides
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
      meta: {
        ...state.meta,
        lastSaved: new Date().toISOString(),
        exportedAt: new Date().toISOString(),
      },
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
      canvasWidth: state.canvasWidth,
      canvasHeight: state.canvasHeight,
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const safeName = state.meta.name.replace(/[^\wа-яё]/gi, '_');
    const filename = `${safeName}_${new Date().toISOString().slice(0, 10)}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
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

      // Migration for uiWidgets + uiLayoutPreset + bg (dialogue UI + backgrounds)
      const migratedPages = data.pages.map((p: any) => {
        let pg = {
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

      // Migration: if acts not present, put all pages in unassigned
      const importedActs: StudioAct[] = data.acts || [];
      const importedUnassigned: string[] = data.unassignedPageIds
        || (data.acts ? [] : migratedPages.map((p: any) => p.id));

      set({
        meta: data.meta || { ...createInitialMeta(), name: 'Импортированный проект' },
        pages: migratedPages,
        selectedPageId: migratedPages[0]?.id || null,
        selectedButtonId: null,
        selectedWidgetId: null,
        coordinateClipboard: null,
        acts: importedActs,
        unassignedPageIds: importedUnassigned,
        // Support guides in imported files
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
        canvasWidth: data.canvasWidth || 1280,
        canvasHeight: data.canvasHeight || 720,
      });

      // Auto-save after import
      setTimeout(() => get().saveToLocalStorage(), 50);
      return true;
    } catch (e) {
      console.error('Failed to import project', e);
      alert('Ошибка при импорте проекта');
      return false;
    }
  },

  setProjectName: (name: string) => {
    set((state) => ({ meta: { ...state.meta, name } }));
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
      unassignedPageIds: defaultPages.map((p) => p.id),
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

  // Добавляет стандартные характеристики Главного Героя
  addDefaultPlayerStats: () => {
    const state = get();
    const existingNames = new Set(state.variables.map(v => v.name));

    const defaultStats: Omit<Variable, 'id'>[] = [
      // Здоровье
      { name: 'health_max', displayName: { ru: 'Здоровье (макс)', en: 'Health (max)' }, type: 'number', defaultValue: 100, category: 'player' },
      { name: 'health', displayName: { ru: 'Здоровье', en: 'Health' }, type: 'number', defaultValue: 100, category: 'player' },
      
      // Мана
      { name: 'mana_max', displayName: { ru: 'Мана (макс)', en: 'Mana (max)' }, type: 'number', defaultValue: 50, category: 'player' },
      { name: 'mana', displayName: { ru: 'Мана', en: 'Mana' }, type: 'number', defaultValue: 50, category: 'player' },

      // Основные характеристики
      { name: 'strength', displayName: { ru: 'Сила', en: 'Strength' }, type: 'number', defaultValue: 5, category: 'player' },
      { name: 'agility', displayName: { ru: 'Ловкость', en: 'Agility' }, type: 'number', defaultValue: 5, category: 'player' },
      { name: 'endurance', displayName: { ru: 'Выносливость', en: 'Endurance' }, type: 'number', defaultValue: 10, category: 'player' },
      { name: 'defense', displayName: { ru: 'Защита', en: 'Defense' }, type: 'number', defaultValue: 2, category: 'player' },

      // Специальные
      { name: 'souls', displayName: { ru: 'Души', en: 'Souls' }, type: 'number', defaultValue: 0, category: 'player' },
      { name: 'level', displayName: { ru: 'Уровень', en: 'Level' }, type: 'number', defaultValue: 1, category: 'player' },
      { name: 'exp', displayName: { ru: 'Опыт', en: 'Experience' }, type: 'number', defaultValue: 0, category: 'player' },

      // Критический урон
      { name: 'crit_chance', displayName: { ru: 'Шанс крита', en: 'Critical Chance' }, type: 'number', defaultValue: 5, category: 'player' },
      { name: 'crit_damage', displayName: { ru: 'Сила крита', en: 'Critical Damage' }, type: 'number', defaultValue: 1.5, category: 'player' },

      // Ресурсы (теперь как расходники)
      { name: 'coins', displayName: { ru: 'Монеты', en: 'Coins' }, type: 'number', defaultValue: 15, category: 'resources' },
      { name: 'gasoline', displayName: { ru: 'Топливо', en: 'Fuel' }, type: 'number', defaultValue: 0, category: 'resources' },
      { name: 'gems', displayName: { ru: 'Сталлонки', en: 'Stallons' }, type: 'number', defaultValue: 0, category: 'resources' },
    ];

    const newVariables = defaultStats
      .filter(stat => !existingNames.has(stat.name))
      .map(stat => ({
        ...stat,
        id: `var_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      }));

    if (newVariables.length > 0) {
      set((s) => ({
        variables: [...s.variables, ...newVariables]
      }));
      get().saveToLocalStorage();
    }
  },

  // Добавляет базовые расходники (ресурсы) отдельно
  addDefaultResources: () => {
    const state = get();
    const existingNames = new Set(state.variables.map(v => v.name));

    const resources: Omit<Variable, 'id'>[] = [
      { name: 'coins', displayName: { ru: 'Монеты', en: 'Coins' }, type: 'number', defaultValue: 15, category: 'resources' },
      { name: 'gasoline', displayName: { ru: 'Топливо', en: 'Fuel' }, type: 'number', defaultValue: 0, category: 'resources' },
      { name: 'gems', displayName: { ru: 'Сталлонки', en: 'Stallons' }, type: 'number', defaultValue: 0, category: 'resources' },
    ];

    const newResources = resources
      .filter(r => !existingNames.has(r.name))
      .map(r => ({
        ...r,
        id: `var_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      }));

    if (newResources.length > 0) {
      set((s) => ({
        variables: [...s.variables, ...newResources]
      }));
      get().saveToLocalStorage();
    }
  },

  addCriticalStats: () => {
    const state = get();
    const existingNames = new Set(state.variables.map(v => v.name));

    const critStats: Omit<Variable, 'id'>[] = [
      { name: 'crit_chance', displayName: { ru: 'Шанс крита', en: 'Critical Chance' }, type: 'number', defaultValue: 5, category: 'player' },
      { name: 'crit_damage', displayName: { ru: 'Сила крита', en: 'Critical Damage' }, type: 'number', defaultValue: 1.5, category: 'player' },
    ];

    const newCrits = critStats
      .filter(stat => !existingNames.has(stat.name))
      .map(stat => ({
        ...stat,
        id: `var_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      }));

    if (newCrits.length > 0) {
      set((s) => ({
        variables: [...s.variables, ...newCrits]
      }));
      get().saveToLocalStorage();
    }
  },

  addPage: (actId) => {
    const newPage = createDefaultPage(`page_${Date.now().toString(36)}`);
    set((state) => {
      const newPages = [...state.pages, newPage];
      if (actId) {
        // Insert into specified act
        const newActs = state.acts.map((a) =>
          a.id === actId ? { ...a, pageIds: [...a.pageIds, newPage.id] } : a
        );
        return { pages: newPages, acts: newActs, selectedPageId: newPage.id, selectedButtonId: null, selectedWidgetId: null };
      } else {
        return { pages: newPages, unassignedPageIds: [...state.unassignedPageIds, newPage.id], selectedPageId: newPage.id, selectedButtonId: null, selectedWidgetId: null };
      }
    });
    get().saveToLocalStorage();
  },

  duplicatePage: (id) => {
    const state = get();
    const src = state.pages.find((p) => p.id === id);
    if (!src) return;
    const ts = Date.now().toString(36);
    const newId = `${id}_c${ts}`;
    const cloned = JSON.parse(JSON.stringify(src)) as StudioPage;
    cloned.id = newId;
    cloned.title = { ru: src.title.ru + ' (копия)', en: src.title.en + ' (copy)' };
    cloned.buttons = cloned.buttons.map((b, i) => ({ ...b, id: `btn_${ts}_${i}` }));
    cloned.uiWidgets = (cloned.uiWidgets || []).map((w) => ({ ...w, id: `uiw_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}` }));
    const srcIdx = state.pages.findIndex((p) => p.id === id);
    const newPages = [...state.pages];
    newPages.splice(srcIdx + 1, 0, cloned);
    // Insert clone after original in the same act or unassigned
    const ownerAct = state.acts.find((a) => a.pageIds.includes(id));
    if (ownerAct) {
      const posInAct = ownerAct.pageIds.indexOf(id);
      const newActs = state.acts.map((a) => {
        if (a.id !== ownerAct.id) return a;
        const newIds = [...a.pageIds];
        newIds.splice(posInAct + 1, 0, newId);
        return { ...a, pageIds: newIds };
      });
      set({ pages: newPages, acts: newActs, selectedPageId: newId, selectedButtonId: null, selectedWidgetId: null });
    } else {
      const posInUnassigned = state.unassignedPageIds.indexOf(id);
      const newUnassigned = [...state.unassignedPageIds];
      newUnassigned.splice(posInUnassigned + 1, 0, newId);
      set({ pages: newPages, unassignedPageIds: newUnassigned, selectedPageId: newId, selectedButtonId: null, selectedWidgetId: null });
    }
    get().saveToLocalStorage();
  },

  deletePage: (id) => {
    set((state) => {
      const filtered = state.pages.filter((p) => p.id !== id);
      const newSelected = state.selectedPageId === id ? (filtered[0]?.id ?? null) : state.selectedPageId;
      const newActs = state.acts.map((a) => ({ ...a, pageIds: a.pageIds.filter((pid) => pid !== id) }));
      const newUnassigned = state.unassignedPageIds.filter((pid) => pid !== id);
      return {
        pages: filtered,
        acts: newActs,
        unassignedPageIds: newUnassigned,
        selectedPageId: newSelected,
        selectedButtonId: null,
        selectedWidgetId: null,
      };
    });
    get().saveToLocalStorage();
  },
}));

// Helper to get current page
export const useCurrentPage = () => {
  const { pages, selectedPageId } = useStudioStore();
  return pages.find((p) => p.id === selectedPageId) ?? null;
};


