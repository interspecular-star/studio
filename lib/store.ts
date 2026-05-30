import { create } from 'zustand';

export type LocalizedString = {
  ru: string;
  en: string;
};

export type ItemType = 
  | 'weapon' 
  | 'armor' 
  | 'accessory' 
  | 'consumable' 
  | 'material' 
  | 'quest' 
  | 'misc';

export type ItemRarity = 
  | 'trash' 
  | 'junk' 
  | 'common' 
  | 'uncommon' 
  | 'rare' 
  | 'epic' 
  | 'legendary' 
  | 'mythic' 
  | 'overpowered';

export type StatModifier = {
  statId: string;   // ID of the variable (e.g. "damage", "strength")
  value: number;    // how much to add/subtract
};

export const ItemRarityLabels: Record<ItemRarity, string> = {
  trash: 'Мусор',
  junk: 'Хлам',
  common: 'Простой',
  uncommon: 'Средний',
  rare: 'Высокий',
  epic: 'Легендарный',
  legendary: 'Мифический',
  mythic: 'Имбовый',
  overpowered: 'Имбовый+',
};

export const ItemTypeLabels: Record<ItemType, string> = {
  weapon: 'Оружие',
  armor: 'Броня',
  accessory: 'Аксессуар',
  consumable: 'Расходник',
  material: 'Материал',
  quest: 'Квестовый',
  misc: 'Прочее',
};

export type Item = {
  id: string;
  name: LocalizedString;
  description: LocalizedString;
  quantityVariableId?: string;

  // Новые поля для системы предметов
  type: ItemType;
  rarity: ItemRarity;
  maxDurability: number;
  durability: number;
  isEquippable: boolean;
  slot?: 'weapon' | 'armor' | 'accessory' | null;
  price: number;

  // Stat modifiers (bonuses from equipment)
  modifiers?: StatModifier[];

  // Базовый урон оружия (только для оружия, отдельно от модификаторов)
  weaponDamage?: number;
};

// === Variables System ===
export type VariableType = 'number' | 'boolean' | 'string';

export type VariableCategory = 
  | 'player' 
  | 'resources' 
  | 'reputation' 
  | 'relationships' 
  | 'inventory' 
  | 'custom';

export type Variable = {
  id: string;
  name: string;                    // internal key, e.g. "player_level"
  displayName: LocalizedString;    // human readable
  type: VariableType;
  defaultValue: number | boolean | string;
  category: VariableCategory;
};

// === Conditions System (extensible from the start) ===
export type ComparisonOperator = '==' | '!=' | '>' | '>=' | '<' | '<=';

export type Condition =
  // Проверка переменной (самый гибкий тип)
  | { type: 'variable'; variableId: string; operator: ComparisonOperator; value: number | boolean | string }

  // Проверка количества предмета
  | { type: 'itemQuantity'; itemId: string; operator: ComparisonOperator; value: number }

  // Проверка отношений с персонажем
  | { type: 'relationship'; characterId: string; operator: ComparisonOperator; value: number }

  // Общая репутация в городе
  | { type: 'reputation'; operator: ComparisonOperator; value: number }

  // Характеристики игрока (уровень, сила и т.д.)
  | { type: 'playerStat'; stat: 'level' | 'strength'; operator: ComparisonOperator; value: number }

  // Ресурсы (монеты, бензин, драгоценности)
  | { type: 'resource'; resource: 'coins' | 'gasoline' | 'gems'; operator: ComparisonOperator; value: number }

  // Логические операторы
  | { type: 'and'; conditions: Condition[] }
  | { type: 'or'; conditions: Condition[] }
  | { type: 'not'; condition: Condition };

export type ButtonAction =
  | { type: 'goToPage'; pageId: string }
  | { type: 'startQuest'; questId: string }

  // Переменные
  | { type: 'setVariable'; variableId: string; value: number | boolean | string }
  | { type: 'addToVariable'; variableId: string; amount: number }
  | { type: 'subtractFromVariable'; variableId: string; amount: number }

  // Предметы
  | { type: 'giveItem'; itemId: string; amount: number }
  | { type: 'removeItem'; itemId: string; amount: number }

  // Отношения и репутация
  | { type: 'changeRelationship'; characterId: string; delta: number }
  | { type: 'changeReputation'; delta: number }

  // Характеристики игрока
  | { type: 'changePlayerStat'; stat: 'level' | 'strength'; delta: number }

  // Ресурсы
  | { type: 'giveResource'; resource: 'coins' | 'gasoline' | 'gems'; amount: number }
  | { type: 'removeResource'; resource: 'coins' | 'gasoline' | 'gems'; amount: number };

export type StudioButton = {
  id: string;
  text: LocalizedString;
  layout: {
    x: number;   // percentage 0-100
    y: number;   // percentage 0-100
    width: number;
    height: number;
    style: 'default' | 'important' | 'danger' | 'subtle';
  };
  action: ButtonAction;
  visibleWhen?: Condition;
  enabledWhen?: Condition;
};

export type StudioPage = {
  id: string;
  title: LocalizedString;
  background: string;
  speaker: string;
  text: LocalizedString;
  buttons: StudioButton[];
};

export type ProjectMeta = {
  name: string;
  lastSaved: string | null;
  schemaVersion: string;
};

type StudioState = {
  // Project metadata
  meta: ProjectMeta;

  pages: StudioPage[];
  selectedPageId: string | null;
  selectedButtonId: string | null;

  // Simple internal clipboard for coordinates
  coordinateClipboard: { x: number; y: number; width: number; height: number } | null;

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

  // Реестр предметов (простая версия на первом этапе)
  items: Item[];

  // Variables (гибкая система состояния проекта)
  variables: Variable[];

  // === Playtest / Preview State ===
  // Это состояние меняется, когда пользователь кликает по кнопкам на холсте
  playtestState: {
    variableValues: Record<string, number | boolean | string>; // текущие значения переменных
    // В будущем сюда добавим: relationships, reputation, inventory и т.д.
  };

  // Actions
  setPages: (pages: StudioPage[]) => void;
  selectPage: (id: string) => void;
  selectButton: (id: string | null) => void;

  updatePage: (id: string, updates: Partial<StudioPage>) => void;
  updateButton: (pageId: string, buttonId: string, updates: Partial<StudioButton>) => void;
  addButton: (pageId: string) => void;
  deleteButton: (pageId: string, buttonId: string) => void;
  moveButton: (pageId: string, buttonId: string, x: number, y: number) => void;
  updateButtonLayout: (pageId: string, buttonId: string, layout: Partial<StudioButton['layout']>) => void;

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

  // === Playtest State Management ===
  resetPlaytestState: () => void;
  executeAction: (action: ButtonAction) => void; // Главная функция выполнения действий

  // === Editor / Playtest Mode ===
  mode: 'editor' | 'playtest';
  setMode: (mode: 'editor' | 'playtest') => void;
  enterPlaytest: () => void;
  exitPlaytest: () => void;

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

  // === Sidebar Collapse (especially useful in Playtest) ===
  leftSidebarCollapsed: boolean;
  rightSidebarCollapsed: boolean;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setSidebarsForPlaytest: (collapsed: boolean) => void;

  // Player stats panel (permanent collapsed block in editor)
  playerStatsCollapsed: boolean;
  togglePlayerStatsCollapsed: () => void;

  // Resources panel (permanent collapsed block, like player stats)
  resourcesCollapsed: boolean;
  toggleResourcesCollapsed: () => void;

  // Collapsed state for individual items (to reduce scrolling when many items)
  collapsedItemIds: string[];
  toggleItemCollapsed: (itemId: string) => void;

  addPage: () => void;
  deletePage: (id: string) => void;
};

const createDefaultPage = (id: string): StudioPage => ({
  id,
  title: { ru: 'Новая страница', en: 'New Page' },
  background: 'village_morning',
  speaker: 'narrator',
  text: {
    ru: 'Текст на русском...',
    en: 'English text...',
  },
  buttons: [],
});

const DEFAULT_PROJECT_NAME = 'Табуреткино — Акт 1';

const createDefaultPages = (): StudioPage[] => [
  {
    id: 'intro_01',
    title: { ru: 'Введение — Окраина Табуреткино', en: 'Introduction — Edge of Taburetkiно' },
    background: 'village_morning',
    speaker: 'narrator',
    text: {
      ru: 'Ты стоишь на окраине Табуреткино. В воздухе пахнет свежим хлебом и старым магическим бензином.',
      en: 'You stand at the edge of Taburetkiно. The air smells of fresh bread and old magical gasoline.',
    },
    buttons: [
      {
        id: 'btn_tavern',
        text: { ru: 'Пойти в таверну', en: 'Go to the tavern' },
        layout: { x: 26, y: 68, width: 24, height: 11, style: 'important' },
        action: { type: 'goToPage', pageId: 'tavern_01' },
      },
      {
        id: 'btn_cave',
        text: { ru: 'Проверить пещеру', en: 'Check your cave' },
        layout: { x: 58, y: 68, width: 24, height: 11, style: 'default' },
        action: { type: 'goToPage', pageId: 'cave_01' },
      },
    ],
  },
  {
    id: 'tavern_01',
    title: { ru: 'Таверна. Мила', en: 'The Tavern. Mila' },
    background: 'tavern',
    speaker: 'mila',
    text: {
      ru: 'Ого, Слэй... Давно не заходил. Выглядишь, будто тебя переехал грузовик.',
      en: 'Well, well, Slay... Haven\'t seen you in a while. You look like you got hit by a truck.',
    },
    buttons: [],
  },
];

const createInitialMeta = (): ProjectMeta => ({
  name: DEFAULT_PROJECT_NAME,
  lastSaved: null,
  schemaVersion: '1.0.0',
});

export const useStudioStore = create<StudioState>((set, get) => ({
  meta: createInitialMeta(),
  pages: createDefaultPages(),
  selectedPageId: 'intro_01',
  selectedButtonId: null,

  // Guides start empty
  guides: {
    horizontal: [],
    vertical: [],
  },

  snappingGuide: null,
  snapEnabled: true,

  // Items registry (Вариант Б — сразу делаем реестр предметов)
  items: [],
  variables: [],

  playtestState: {
    variableValues: {},
  },

  // Canvas-only history (for button dragging on the canvas)
  canvasHistory: [],
  canvasFuture: [],

  // Editor / Playtest mode
  mode: 'editor',

  // Sidebar states (auto-collapsed in Playtest by default)
  leftSidebarCollapsed: false,
  rightSidebarCollapsed: false,

  // Player stats panel starts collapsed by default
  playerStatsCollapsed: true,

  // Resources panel starts collapsed by default (like player stats)
  resourcesCollapsed: true,

  // No items collapsed by default
  collapsedItemIds: [],

  setPages: (pages) => set({ pages }),

  selectPage: (id) => set({ selectedPageId: id, selectedButtonId: null }),

  selectButton: (id) => set({ selectedButtonId: id }),

  updatePage: (id, updates) => {
    set((state) => ({
      pages: state.pages.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
    get().saveToLocalStorage();
  },

  updateButton: (pageId, buttonId, updates) =>
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
    })),

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
              buttons: page.buttons.map((btn) =>
                btn.id === buttonId
                  ? { ...btn, layout: { ...btn.layout, x: Math.max(4, Math.min(82, x)), y: Math.max(8, Math.min(78, y)) } }
                  : btn
              ),
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
              buttons: page.buttons.map((btn) =>
                btn.id === buttonId
                  ? { ...btn, layout: { ...btn.layout, ...layoutUpdates } }
                  : btn
              ),
            }
          : page
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
                buttons: page.buttons.map((btn) =>
                  btn.id === buttonId
                    ? {
                        ...btn,
                        layout: {
                          ...btn.layout,
                          x: state.coordinateClipboard!.x,
                          y: state.coordinateClipboard!.y,
                          width: state.coordinateClipboard!.width,
                          height: state.coordinateClipboard!.height,
                        },
                      }
                    : btn
                ),
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

  getVariable: (id) => {
    return get().variables.find((v) => v.id === id);
  },

  // === Playtest State ===
  resetPlaytestState: () => {
    set({
      playtestState: { variableValues: {} },
      snappingGuide: null,
    });
  },

  // === Mode Management (Editor / Playtest) ===
  setMode: (newMode) => set({ mode: newMode }),

  enterPlaytest: () => {
    set({
      mode: 'playtest',
      // Automatically collapse sidebars when entering Playtest (user can still expand manually)
      leftSidebarCollapsed: true,
      rightSidebarCollapsed: true,
    });
  },

  exitPlaytest: () => {
    set({
      mode: 'editor',
      // Expand sidebars when returning to editor for better editing experience
      leftSidebarCollapsed: false,
      rightSidebarCollapsed: false,
    });
  },

  // Sidebar collapse helpers
  toggleLeftSidebar: () => set((state) => ({ leftSidebarCollapsed: !state.leftSidebarCollapsed })),
  toggleRightSidebar: () => set((state) => ({ rightSidebarCollapsed: !state.rightSidebarCollapsed })),

  togglePlayerStatsCollapsed: () => set((state) => ({ playerStatsCollapsed: !state.playerStatsCollapsed })),

  toggleResourcesCollapsed: () => set((state) => ({ resourcesCollapsed: !state.resourcesCollapsed })),

  toggleItemCollapsed: (itemId) => set((state) => {
    const isCollapsed = state.collapsedItemIds.includes(itemId);
    return {
      collapsedItemIds: isCollapsed
        ? state.collapsedItemIds.filter(id => id !== itemId)
        : [...state.collapsedItemIds, itemId]
    };
  }),

  setSidebarsForPlaytest: (collapsed) => set({
    leftSidebarCollapsed: collapsed,
    rightSidebarCollapsed: collapsed,
  }),

  // === Canvas Undo/Redo (only button layouts from canvas) ===
  saveCanvasSnapshot: () => {
    const state = get();
    // Save a lightweight snapshot of all button layouts
    const snapshot = state.pages.map(page => ({
      id: page.id,
      buttons: page.buttons.map(btn => ({
        id: btn.id,
        layout: { ...btn.layout }
      }))
    }));

    set((s) => ({
      canvasHistory: [...s.canvasHistory.slice(-49), snapshot], // keep max 50
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
      }))
    }));

    // Restore previous layouts
    set((s) => ({
      pages: s.pages.map(page => {
        const snapPage = previous.find((p: any) => p.id === page.id);
        if (!snapPage) return page;

        return {
          ...page,
          buttons: page.buttons.map(btn => {
            const snapBtn = snapPage.buttons.find((b: any) => b.id === btn.id);
            return snapBtn ? { ...btn, layout: { ...btn.layout, ...snapBtn.layout } } : btn;
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
        // Переход на другую страницу в режиме Playtest
        get().selectPage(action.pageId);
        // Снимаем выделение с кнопки при переходе
        get().selectButton(null);
        break;
      }
      default:
        // startQuest и другие неизвестные действия пока игнорируем
        break;
    }

    set({
      playtestState: { variableValues: currentValues },
    });
  },

  // === Project Persistence ===
  saveToLocalStorage: () => {
    const state = get();
    const dataToSave = {
      meta: { ...state.meta, lastSaved: new Date().toISOString() },
      pages: state.pages,
      selectedPageId: state.selectedPageId,
      items: state.items,
      variables: state.variables,
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

      set({
        meta: parsed.meta || createInitialMeta(),
        pages: parsed.pages,
        selectedPageId: parsed.selectedPageId || parsed.pages[0]?.id || null,
        selectedButtonId: null,
        coordinateClipboard: null,
        // Backward compatible: default to empty guides
        guides: parsed.guides || { horizontal: [], vertical: [] },
        snappingGuide: null,
        snapEnabled: parsed.snapEnabled ?? true,
        items: parsed.items || [],
        variables: parsed.variables || [],
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
      guides: state.guides,
      items: state.items,
      variables: state.variables,
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

      set({
        meta: data.meta || { ...createInitialMeta(), name: 'Импортированный проект' },
        pages: data.pages,
        selectedPageId: data.pages[0]?.id || null,
        selectedButtonId: null,
        coordinateClipboard: null,
        // Support guides in imported files
        guides: data.guides || { horizontal: [], vertical: [] },
        snappingGuide: null,
        snapEnabled: data.snapEnabled ?? true,
        items: data.items || [],
        variables: data.variables || [],
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
    set({
      meta: { ...createInitialMeta(), name: 'Новый проект' },
      pages: createDefaultPages(),
      selectedPageId: 'intro_01',
      selectedButtonId: null,
      coordinateClipboard: null,
      guides: { horizontal: [], vertical: [] },
      snappingGuide: null,
      snapEnabled: true,
      items: [],
      variables: [],
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
      { name: 'gasoline', displayName: { ru: 'Бензин', en: 'Gasoline' }, type: 'number', defaultValue: 0, category: 'resources' },
      { name: 'gems', displayName: { ru: 'Драгоценности', en: 'Gems' }, type: 'number', defaultValue: 0, category: 'resources' },
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
      { name: 'gasoline', displayName: { ru: 'Бензин', en: 'Gasoline' }, type: 'number', defaultValue: 0, category: 'resources' },
      { name: 'gems', displayName: { ru: 'Драгоценности', en: 'Gems' }, type: 'number', defaultValue: 0, category: 'resources' },
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

  addPage: () => {
    const newPage = createDefaultPage(`page_${Date.now().toString(36)}`);
    set((state) => ({
      pages: [...state.pages, newPage],
      selectedPageId: newPage.id,
      selectedButtonId: null,
    }));
    get().saveToLocalStorage();
  },

  deletePage: (id) =>
    set((state) => {
      const filtered = state.pages.filter((p) => p.id !== id);
      const newSelected = state.selectedPageId === id ? (filtered[0]?.id ?? null) : state.selectedPageId;
      const result = {
        pages: filtered,
        selectedPageId: newSelected,
        selectedButtonId: null,
      };
      return result;
    }),
}));

// Helper to get current page
export const useCurrentPage = () => {
  const { pages, selectedPageId } = useStudioStore();
  return pages.find((p) => p.id === selectedPageId) ?? null;
};
