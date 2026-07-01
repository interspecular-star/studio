import { create } from 'zustand';
import { DIALOGUE_THEME_PRESETS } from '../types';
import type {
  LocalizedString, Speaker, DialogueTheme, DialogueLine, StudioAct, ProjectMeta,
  Variable, Condition, ButtonAction,
  Item, EquipmentSlot,
  UIWidget, UIAsset,
  Background, StudioButton, StudioPage,
  Quest,
  Enemy, Boss, Wave, InstinctDef, ScenarioDef,
  Building, BuildingId, Mercenary, RewardEntry, MineConfig, Difficulty, SkillId,
} from '../types';
import { DEFAULT_INSTINCTS, DEFAULT_SCENARIOS, DEFAULT_BUILDINGS, DEFAULT_MERCENARIES, DEFAULT_REWARD_TABLES, DEFAULT_MINE_CONFIG } from '../types';
import { createDefaultPage, createDefaultPages, createInitialMeta, createDefaultSpeakers, DEFAULT_ENEMY_STATIST, DEFAULT_ENEMY_GOBLIN_PAGER, DEFAULT_ENEMY_SKELETON_DRUNK, DEFAULT_ENEMY_RAT_HEADPHONES, DEFAULT_ENEMY_VHS_GHOST, DEFAULT_ENEMY_BEAR_RAPPER, DEFAULT_ENEMY_FRIDGE_MIMIC, DEFAULT_ENEMY_TV_CHICKEN, DEFAULT_ENEMY_ZOMBIE_DJ, DEFAULT_BOSS_DIRECTOR, DEFAULT_TEST_WAVE } from './defaults';
import { createUISlice } from './slices/ui';
import { createCanvasSlice } from './slices/canvas';
import { createWorldSlice } from './slices/world';
import { createPagesSlice } from './slices/pages';
import { createPlaytestSlice } from './slices/playtest';
import { createPersistenceSlice } from './slices/persistence';
import { createCombatSlice } from './slices/combat';
import { createEconomySlice } from './slices/economy';
import { createCombatSessionSlice } from './slices/combatSession';
import type { CombatSession } from '../types/combat-session';

// Suppress unused import warnings — these are referenced by StudioState type below
type _Unused = Condition | LocalizedString;

type StudioState = {
  // Project metadata
  meta: ProjectMeta;

  pages: StudioPage[];
  selectedPageId: string | null;
  selectedButtonId: string | null;

  // Simple internal clipboard for coordinates
  coordinateClipboard: { x: number; y: number; width: number; height: number } | null;

  // Widget/button clipboard for Ctrl+C / Ctrl+V / Ctrl+D
  widgetClipboard: { kind: 'widget'; item: UIWidget; sourcePageId: string } | { kind: 'button'; item: StudioButton; sourcePageId: string } | null;

  // Guides for visual alignment (project-level, percentages 0-100)
  guides: {
    horizontal: number[];
    vertical: number[];
  };

  snappingGuide: {
    vertical?: number;
    horizontal?: number;
  } | null;

  snapEnabled: boolean;

  canvasWidth: number;
  canvasHeight: number;

  items: Item[];
  variables: Variable[];
  backgrounds: Background[];
  uiAssets: UIAsset[];
  speakers: Speaker[];
  dialogueTheme: DialogueTheme;
  quests: Quest[];

  // === Playtest / Preview State ===
  playtestState: {
    variableValues: Record<string, number | boolean | string>;
    equippedItemIds: string[];
    equippedSlots: Partial<Record<EquipmentSlot, string>>;
    isInventoryOpen: boolean;
    playerAvatar?: string;
    widgetOverrides: Record<string, Partial<UIWidget>>;
    dialogueLineIndex: number;
    dialogueStarted: boolean;
    itemRewardModal: { items: Array<{ itemId: string; amount: number }>; afterCollect?: ButtonAction[] } | null;
    questProgress: Record<string, number>;
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

  restoreButtonFromHistory: (pageId: string, buttonId: string, historyIndex: number) => void;

  copyButtonCoordinates: (pageId: string, buttonId: string) => void;
  pasteButtonCoordinates: (pageId: string, buttonId: string) => void;
  clearCoordinateClipboard: () => void;

  // === Guides & Snapping ===
  addGuide: (axis: 'horizontal' | 'vertical', position: number) => void;
  removeGuide: (axis: 'horizontal' | 'vertical', position: number) => void;
  clearGuides: (axis?: 'horizontal' | 'vertical') => void;
  moveGuide: (axis: 'horizontal' | 'vertical', oldPosition: number, newPosition: number) => void;
  setSnappingGuide: (snap: { vertical?: number; horizontal?: number } | null) => void;
  setSnapEnabled: (enabled: boolean) => void;

  setCanvasSize: (width: number, height: number) => void;

  // === Project Persistence ===
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => boolean;
  exportProject: () => void;
  exportCombatPack: () => void;
  importProject: (data: any) => boolean;
  setProjectName: (name: string) => void;
  createNewProject: () => void;

  // === Items ===
  addItem: (item: Omit<Item, 'id'>) => void;
  updateItem: (id: string, updates: Partial<Omit<Item, 'id'>>) => void;
  deleteItem: (id: string) => void;
  getItem: (id: string) => Item | undefined;

  // === Variables ===
  addVariable: (variable: Omit<Variable, 'id'>) => void;
  updateVariable: (id: string, updates: Partial<Omit<Variable, 'id'>>) => void;
  deleteVariable: (id: string) => void;
  getVariable: (id: string) => Variable | undefined;

  // === Backgrounds ===
  addBackground: (background: Omit<Background, 'id'>) => void;
  updateBackground: (id: string, updates: Partial<Omit<Background, 'id'>>) => void;
  deleteBackground: (id: string) => void;
  getBackground: (id: string) => Background | undefined;

  // === UI Assets ===
  addUIAsset: (asset: Omit<UIAsset, 'id'>) => void;
  updateUIAsset: (id: string, updates: Partial<Omit<UIAsset, 'id'>>) => void;
  deleteUIAsset: (id: string) => void;
  getUIAsset: (id: string) => UIAsset | undefined;

  // === Quests ===
  addQuest: (quest: Omit<Quest, 'id'>) => void;
  updateQuest: (id: string, updates: Partial<Omit<Quest, 'id'>>) => void;
  deleteQuest: (id: string) => void;

  // === Combat ===
  enemies: Enemy[];
  bosses: Boss[];
  waves: Wave[];
  instincts: InstinctDef[];
  scenarios: ScenarioDef[];

  addEnemy: (data: Omit<Enemy, 'id'>) => void;
  updateEnemy: (id: string, updates: Partial<Omit<Enemy, 'id'>>) => void;
  deleteEnemy: (id: string) => void;

  addBoss: (data: Omit<Boss, 'id' | 'isBoss'>) => void;
  updateBoss: (id: string, updates: Partial<Omit<Boss, 'id' | 'isBoss'>>) => void;
  deleteBoss: (id: string) => void;

  addWave: (data: Omit<Wave, 'id'>) => void;
  updateWave: (id: string, updates: Partial<Omit<Wave, 'id'>>) => void;
  deleteWave: (id: string) => void;

  updateInstinct: (id: string, updates: Partial<Omit<InstinctDef, 'id'>>) => void;
  resetInstinctsToDefault: () => void;

  updateScenario: (id: string, updates: Partial<Omit<ScenarioDef, 'id'>>) => void;
  resetScenariosToDefault: () => void;

  combatCollapsed: boolean;
  toggleCombatCollapsed: () => void;

  // === Economy ===
  buildings: Building[];
  mercenaries: Mercenary[];
  rewardTables: RewardEntry[];
  mineConfig: MineConfig;

  updateBuilding: (id: BuildingId, updates: Partial<Omit<Building, 'id'>>) => void;
  resetBuildingsToDefault: () => void;

  addMercenary: (data: Omit<Mercenary, 'id'>) => void;
  updateMercenary: (id: string, updates: Partial<Omit<Mercenary, 'id'>>) => void;
  deleteMercenary: (id: string) => void;

  updateRewardEntry: (difficulty: Difficulty, updates: Partial<Omit<RewardEntry, 'difficulty'>>) => void;
  resetRewardTablesToDefault: () => void;

  updateMineConfig: (updates: Partial<MineConfig>) => void;
  resetMineConfigToDefault: () => void;

  // === Speakers ===
  addSpeaker: (speaker: Omit<Speaker, 'id'> & { id?: string }) => void;
  updateSpeaker: (id: string, updates: Partial<Omit<Speaker, 'id'>>) => void;
  deleteSpeaker: (id: string) => void;

  // === Dialogue Theme ===
  updateDialogueTheme: (updates: Partial<DialogueTheme>) => void;

  // === Widget Clipboard ===
  copySelectedToWidgetClipboard: () => void;
  pasteFromWidgetClipboard: (offset?: boolean) => void;
  duplicateSelected: () => void;

  // === Dialogue Lines ===
  addDialogueLine: (pageId: string, line?: Partial<Omit<DialogueLine, 'id'>>) => void;
  updateDialogueLine: (pageId: string, lineId: string, updates: Partial<Omit<DialogueLine, 'id'>>) => void;
  deleteDialogueLine: (pageId: string, lineId: string) => void;
  advanceDialogueLine: () => void;

  addUIWidget: (pageId: string, widget: Omit<UIWidget, 'id'>) => void;
  updateUIWidget: (pageId: string, widgetId: string, updates: Partial<Omit<UIWidget, 'id'>>) => void;
  deleteUIWidget: (pageId: string, widgetId: string) => void;
  updateUIWidgetLayout: (pageId: string, widgetId: string, layout: Partial<UIWidget['layout']>) => void;
  moveUIWidget: (pageId: string, widgetId: string, x: number, y: number) => void;
  applyUILayoutPreset: (pageId: string, preset: StudioPage['uiLayoutPreset']) => void;

  setPlaytestVariableValue: (id: string, value: number | boolean | string) => void;

  // === Playtest State ===
  resetPlaytestState: () => void;
  executeAction: (action: ButtonAction) => void;
  trackButtonClick: (buttonId: string) => void;

  // === Equipment ===
  equipItem: (itemId: string, targetSlot?: EquipmentSlot) => void;
  unequipItem: (itemId: string) => void;
  isItemEquipped: (itemId: string) => boolean;

  dropItem: (itemId: string, amount?: number) => void;
  useItem: (itemId: string) => void;

  openInventory: () => void;
  closeInventory: () => void;

  getPlayerInventory: () => Array<{ item: Item; quantity: number }>;

  // === Mode ===
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

  // === Canvas Undo/Redo ===
  canvasHistory: any[];
  canvasFuture: any[];
  saveCanvasSnapshot: () => void;
  undoCanvas: () => void;
  redoCanvas: () => void;

  addDefaultPlayerStats: () => void;
  addDefaultResources: () => void;
  addCriticalStats: () => void;

  // === Sidebar ===
  leftSidebarCollapsed: boolean;
  rightSidebarCollapsed: boolean;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setSidebarsForPlaytest: (collapsed: boolean) => void;

  // === Widget Library Modal ===
  isWidgetLibraryOpen: boolean;
  openWidgetLibrary: () => void;
  closeWidgetLibrary: () => void;

  editorDialoguePreviewLine: number | null;
  setEditorDialoguePreview: (idx: number | null) => void;

  playerStatsCollapsed: boolean;
  togglePlayerStatsCollapsed: () => void;

  resourcesCollapsed: boolean;
  toggleResourcesCollapsed: () => void;

  inventoryCollapsed: boolean;
  toggleInventoryCollapsed: () => void;

  variablesCollapsed: boolean;
  toggleVariablesCollapsed: () => void;

  itemsCollapsed: boolean;
  toggleItemsCollapsed: () => void;

  backgroundsCollapsed: boolean;
  toggleBackgroundsCollapsed: () => void;

  questsCollapsed: boolean;
  toggleQuestsCollapsed: () => void;

  collapsedItemIds: string[];
  toggleItemCollapsed: (itemId: string) => void;

  // === Starting Inventory ===
  startingInventory: Record<string, number>;
  addToStartingInventory: (itemId: string, quantity?: number) => void;
  removeFromStartingInventory: (itemId: string) => void;
  setStartingInventoryQuantity: (itemId: string, quantity: number) => void;

  // === Combat Session (runtime) ===
  combatSession: CombatSession | null;
  startCombat: (waveId: string, difficulty: Difficulty, instinctId?: string, skillSlots?: [SkillId | null, SkillId | null, SkillId | null], scenarioIds?: string[]) => void;
  combatPlayerAttack: (targetInstanceId: string, isWeakSpot?: boolean) => void;
  combatPlayerDodge: () => void;
  combatPlayerParry: () => void;
  combatActivateShowtime: () => void;
  combatSpawnNext: () => void;
  combatTick: () => void;
  combatUseSkill: (slotIndex: 0 | 1 | 2) => void;
  applyRewards: () => { leveledUp: boolean; newLevel: number };
  endCombat: () => void;

  addPage: (actId?: string | null, overrides?: Partial<StudioPage>) => void;
  duplicatePage: (id: string) => void;
  deletePage: (id: string) => void;

  // === Acts ===
  acts: StudioAct[];
  unassignedPageIds: string[];
  leftSidebarLocked: boolean;

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
  // === Initial State ===
  meta: createInitialMeta(),
  pages: _initialPages,
  selectedPageId: 'village',
  selectedButtonId: null,
  selectedWidgetId: null,
  widgetClipboard: null,
  coordinateClipboard: null,

  guides: { horizontal: [], vertical: [] },
  snappingGuide: null,
  snapEnabled: true,

  canvasWidth: 1280,
  canvasHeight: 800,

  items: [],
  variables: [],
  backgrounds: [],
  uiAssets: [],
  speakers: createDefaultSpeakers(),
  dialogueTheme: { ...DIALOGUE_THEME_PRESETS.darkFantasy },
  quests: [],

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
    questProgress: {},
  },

  canvasHistory: [],
  canvasFuture: [],

  mode: 'editor',

  leftSidebarCollapsed: false,
  rightSidebarCollapsed: false,
  leftSidebarLocked: false,
  isWidgetLibraryOpen: false,
  editorDialoguePreviewLine: null,

  acts: [],
  unassignedPageIds: _initialPages.map((p) => p.id),

  playerStatsCollapsed: true,
  resourcesCollapsed: true,
  inventoryCollapsed: true,
  variablesCollapsed: true,
  itemsCollapsed: true,
  backgroundsCollapsed: true,
  questsCollapsed: true,
  combatCollapsed: true,
  collapsedItemIds: [],

  enemies: [
    DEFAULT_ENEMY_STATIST,
    DEFAULT_ENEMY_GOBLIN_PAGER,
    DEFAULT_ENEMY_SKELETON_DRUNK,
    DEFAULT_ENEMY_RAT_HEADPHONES,
    DEFAULT_ENEMY_VHS_GHOST,
    DEFAULT_ENEMY_BEAR_RAPPER,
    DEFAULT_ENEMY_FRIDGE_MIMIC,
    DEFAULT_ENEMY_TV_CHICKEN,
    DEFAULT_ENEMY_ZOMBIE_DJ,
  ],
  bosses: [DEFAULT_BOSS_DIRECTOR],
  waves: [DEFAULT_TEST_WAVE],
  instincts: DEFAULT_INSTINCTS,
  scenarios: DEFAULT_SCENARIOS,

  buildings: DEFAULT_BUILDINGS,
  mercenaries: DEFAULT_MERCENARIES,
  rewardTables: DEFAULT_REWARD_TABLES,
  mineConfig: DEFAULT_MINE_CONFIG,

  startingInventory: {},

  // === Slice Implementations ===
  ...createUISlice(set, get),
  ...createCanvasSlice(set, get),
  ...createWorldSlice(set, get),
  ...createPagesSlice(set, get),
  ...createPlaytestSlice(set, get),
  ...createPersistenceSlice(set, get),
  ...createCombatSlice(set, get),
  ...createEconomySlice(set, get),
  ...createCombatSessionSlice(set, get),
}));

// Helper to get current page
export const useCurrentPage = () => {
  const { pages, selectedPageId } = useStudioStore();
  return pages.find((p) => p.id === selectedPageId) ?? null;
};
