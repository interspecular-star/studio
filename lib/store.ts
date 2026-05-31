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

// Порядок для фильтров в инвентаре (как просил пользователь: "Все" первым, потом все 8 в ряд)
export const RarityFilterOrder: (ItemRarity | 'all')[] = [
  'all',
  'trash',
  'junk',
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
  'mythic',
  'overpowered',
];

export const RarityFilterLabels: Record<ItemRarity | 'all', string> = {
  all: 'Все',
  ...ItemRarityLabels,
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
  slot?: EquipmentSlot | null;
  price: number;

  // Stat modifiers (bonuses from equipment)
  modifiers?: StatModifier[];

  // Базовый урон оружия (только для оружия, отдельно от модификаторов)
  weaponDamage?: number;
};

/**
 * Все возможные слоты экипировки.
 * Используем отдельные значения (Вариант А) — это надёжнее и расширяемее в долгосрочной перспективе.
 */
export type EquipmentSlot =
  // === Позиционные слоты на манекене ===
  | 'weapon_right'      // Правая рука
  | 'weapon_left'       // Левая рука (может держать оружие или щит)
  | 'shield'            // Щит (только левая рука)

  // === Типы оружия при создании предмета ===
  | 'one_handed_weapon' // Одноручное оружие (может быть в любой руке)
  | 'two_handed_weapon' // Двуручное оружие (занимает обе руки)

  // === Обычные слоты брони/аксессуаров ===
  | 'helmet'
  | 'gloves'
  | 'chest'
  | 'legs'
  | 'boots'
  | 'belt'
  | 'cloak'
  | 'amulet'
  | 'ring'
  | 'minion';

// Отображаемые названия слотов (для UI)
export const EquipmentSlotLabels: Record<EquipmentSlot, string> = {
  // Позиционные (на манекене)
  weapon_right: 'Правая рука',
  weapon_left: 'Левая рука',
  shield: 'Щит',

  // Типы оружия (при создании предмета)
  one_handed_weapon: 'Одноручное оружие',
  two_handed_weapon: 'Двуручное оружие',

  // Броня и аксессуары
  helmet: 'Шлем',
  gloves: 'Перчатки',
  chest: 'Тело',
  legs: 'Ноги',
  boots: 'Ботинки',
  belt: 'Пояс',
  cloak: 'Плащ',
  amulet: 'Амулет',
  ring: 'Кольцо',
  minion: 'Миньон',
};

// === Группировки для визуального манекена ===

// Вертикальный столб брони (шлем → тело → пояс → ноги → ботинки)
export const MainBodySlots: EquipmentSlot[] = [
  'helmet',
  'chest',
  'belt',
  'legs',
  'boots',
];

// Слоты, которые отображаются в одном ряду с поясом (перчатки)
export const BeltRowSlots: EquipmentSlot[] = ['gloves', 'belt'];

// Слоты рук (располагаются по бокам от тела)
export const HandSlots: EquipmentSlot[] = ['weapon_right', 'weapon_left'];

// Полная нижняя полоса аксессуаров (в ряд)
export const AccessoryRowSlots: EquipmentSlot[] = [
  'amulet',
  'ring',
  'ring',
  'ring',
  'ring',
  'cloak',
  'minion',
];

// Оставляем для обратной совместимости
export const CompactAccessorySlots: EquipmentSlot[] = [
  'amulet',
  'ring',
  'cloak',
  'minion',
];

// Вспомогательные функции
export function isAccessorySlot(slot: EquipmentSlot | null | undefined): boolean {
  if (!slot) return false;
  return CompactAccessorySlots.includes(slot);
}

export function isHandSlot(slot: EquipmentSlot | null | undefined): boolean {
  if (!slot) return false;
  return HandSlots.includes(slot);
}

// Проверка: можно ли надеть предмет этого слота в конкретную руку
export function canEquipToHand(itemSlot: EquipmentSlot, hand: 'weapon_right' | 'weapon_left'): boolean {
  if (itemSlot === 'shield') {
    return hand === 'weapon_left';
  }
  if (itemSlot === 'weapon_right' || itemSlot === 'weapon_left') {
    return true; // Оружие можно в любую руку (выбор будет у игрока)
  }
  return false;
}

// Стиль для "заблокированного" / специального слота (пока используется для Миньона)
export const BlockedSlotStyle = {
  borderColor: 'border-amber-900/50',
  bgColor: 'bg-[#161310]',
  textColor: 'text-amber-900/60',
  label: 'Миньон (недоступно)',
};

/**
 * Данные для диалога подтверждения замены предмета при Drag & Drop.
 * Показывается всегда, даже если изменения статов нулевые.
 */
export interface ItemReplacementInfo {
  currentItem: Item;
  newItem: Item;
  statChanges: Array<{
    statId: string;
    statName: string;
    delta: number;
  }>;
}

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
  | { type: 'removeResource'; resource: 'coins' | 'gasoline' | 'gems'; amount: number }

  // Инвентарь (модальное окно)
  | { type: 'openInventory' };

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
    variableValues: Record<string, number | boolean | string>;
    equippedItemIds: string[]; // legacy
    equippedSlots: Partial<Record<EquipmentSlot, string>>; // Новый способ: slot -> itemId
    isInventoryOpen: boolean;
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

  // Live playtest value mutation (so editing endurance etc in sidebar during Playtest immediately affects backpack size, damage etc)
  setPlaytestVariableValue: (id: string, value: number | boolean | string) => void;

  // === Playtest State Management ===
  resetPlaytestState: () => void;
  executeAction: (action: ButtonAction) => void; // Главная функция выполнения действий

  // === Playtest Equipment (только для визуального фидбэка в Playtest) ===
  equipItem: (itemId: string, targetSlot?: EquipmentSlot) => void;
  unequipItem: (itemId: string) => void;
  isItemEquipped: (itemId: string) => boolean;

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

  // Player stats panel (permanent collapsed block in editor)
  playerStatsCollapsed: boolean;
  togglePlayerStatsCollapsed: () => void;

  // Resources panel (permanent collapsed block, like player stats)
  resourcesCollapsed: boolean;
  toggleResourcesCollapsed: () => void;

  // Inventory block (new dedicated starting inventory management, between resources and variables)
  inventoryCollapsed: boolean;
  toggleInventoryCollapsed: () => void;

  // Collapsed state for individual items (to reduce scrolling when many items)
  collapsedItemIds: string[];
  toggleItemCollapsed: (itemId: string) => void;

  // === Starting Inventory (explicit management of items player begins with) ===
  startingInventory: Record<string, number>; // itemId -> starting quantity
  addToStartingInventory: (itemId: string, quantity?: number) => void;
  removeFromStartingInventory: (itemId: string) => void;
  setStartingInventoryQuantity: (itemId: string, quantity: number) => void;

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
    equippedItemIds: [],
    equippedSlots: {},
    isInventoryOpen: false,
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

  // Inventory block starts collapsed by default
  inventoryCollapsed: true,

  // No items collapsed by default
  collapsedItemIds: [],

  // Starting inventory (empty by default)
  startingInventory: {},

  setPages: (pages) => set({ pages }),

  selectPage: (id) => set({ selectedPageId: id, selectedButtonId: null }),

  selectButton: (id) => set({ selectedButtonId: id }),

  updatePage: (id, updates) => {
    set((state) => ({
      pages: state.pages.map((p) => (p.id === id ? { ...p, ...updates } : p)),
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
    const currentPlaytest = get().playtestState;

    // If this is a fresh Playtest session (no values yet), seed from starting inventory
    if (Object.keys(currentPlaytest.variableValues).length === 0) {
      get().resetPlaytestState();
    }

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

  toggleInventoryCollapsed: () => set((state) => ({ inventoryCollapsed: !state.inventoryCollapsed })),

  toggleItemCollapsed: (itemId) => set((state) => {
    const isCollapsed = state.collapsedItemIds.includes(itemId);
    return {
      collapsedItemIds: isCollapsed
        ? state.collapsedItemIds.filter(id => id !== itemId)
        : [...state.collapsedItemIds, itemId]
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
      case 'openInventory': {
        set((s) => ({
          playtestState: {
            ...s.playtestState,
            isInventoryOpen: true,
          },
        }));
        break;
      }
      default:
        // startQuest и другие неизвестные действия пока игнорируем
        break;
    }

    set((s) => ({
      playtestState: {
        variableValues: currentValues,
        equippedItemIds: s.playtestState.equippedItemIds,
        equippedSlots: s.playtestState.equippedSlots,
        isInventoryOpen: s.playtestState.isInventoryOpen,
      },
    }));
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
      startingInventory: state.startingInventory,
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
        startingInventory: parsed.startingInventory || {},
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
      startingInventory: state.startingInventory,
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
        startingInventory: data.startingInventory || {},
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
      startingInventory: {},
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

// ============================================================
// Combat / Playtest calculation helpers (pure, for visual feedback)
// These power the "В БОЮ" preview block and can be used in conditions later.
// ============================================================

export type PlaytestSnapshot = {
  variableValues: Record<string, number | boolean | string>;
  equippedItemIds: string[];
  equippedSlots?: Partial<Record<EquipmentSlot, string>>;
};

/**
 * Returns the live (or default) numeric value of a player stat during playtest.
 */
export function getPlaytestStatValue(
  statIdOrName: string,
  variables: Variable[],
  playtestState: PlaytestSnapshot
): number {
  // Try by ID first
  const byId = variables.find(v => v.id === statIdOrName);
  if (byId) {
    const live = playtestState.variableValues[byId.id];
    return typeof live === 'number' ? live : (byId.defaultValue as number) ?? 0;
  }
  // Fallback: treat as internal name (e.g. "strength")
  const byName = variables.find(v => v.name === statIdOrName && v.category === 'player');
  if (byName) {
    const live = playtestState.variableValues[byName.id];
    return typeof live === 'number' ? live : (byName.defaultValue as number) ?? 0;
  }
  return 0;
}

/**
 * Returns list of currently equipped items (only those that still exist).
 */
export function getEquippedItems(items: Item[], equippedIds: string[]): Item[] {
  return equippedIds
    .map(id => items.find(i => i.id === id))
    .filter((i): i is Item => !!i);
}

/**
 * Collects ALL equipped item IDs from both legacy equippedItemIds array
 * and the new equippedSlots map. Dedupes to avoid counting two-handed twice.
 * Used by all effective stat / damage formulas so that equipping via Inventory modal
 * (which uses equippedSlots) immediately affects calculations including backpack size.
 */
export function getAllEquippedItemIds(playtestState: PlaytestSnapshot & { equippedSlots?: Partial<Record<EquipmentSlot, string>> }): string[] {
  const legacy = playtestState.equippedItemIds || [];
  const fromSlots = Object.values(playtestState.equippedSlots || {}).filter((v): v is string => Boolean(v));
  return Array.from(new Set([...legacy, ...fromSlots]));
}

/**
 * Resolves a player stat by either its ID or its internal name.
 * Returns the Variable or undefined.
 */
function resolvePlayerVariable(statIdOrName: string, variables: Variable[]): Variable | undefined {
  // Direct ID match
  const byId = variables.find(v => v.id === statIdOrName);
  if (byId) return byId;

  // Name match (most common when calling from combat helpers)
  return variables.find(v => v.name === statIdOrName && v.category === 'player');
}

/**
 * Calculates effective value of a player stat = base value + sum of all modifiers
 * from currently equipped items that target this stat.
 *
 * IMPORTANT: modifiers store the variable's .id (not name), so we must resolve first.
 */
export function getEffectivePlayerStat(
  statIdOrName: string,
  variables: Variable[],
  items: Item[],
  playtestState: PlaytestSnapshot
): number {
  const variable = resolvePlayerVariable(statIdOrName, variables);
  if (!variable) {
    return 0;
  }

  // Base value (live or default)
  const live = playtestState.variableValues[variable.id];
  const base = typeof live === 'number' ? live : (variable.defaultValue as number) ?? 0;

  // Use both legacy + slots so Inventory modal (and two-handed) affect effective stats & backpack size
  const allIds = getAllEquippedItemIds(playtestState);
  const equipped = getEquippedItems(items, allIds);

  const bonus = equipped.reduce((sum, item) => {
    const mods = item.modifiers || [];
    // Modifiers always store the real variable.id
    const relevant = mods.filter(m => m.statId === variable.id);
    return sum + relevant.reduce((s, m) => s + (m.value || 0), 0);
  }, 0);

  return base + bonus;
}

/**
 * Finds the first equipped weapon (by slot or by presence of weaponDamage).
 * For v1 we allow multiple and sum their weaponDamage.
 */
export function getEquippedWeaponDamage(items: Item[], playtestState: PlaytestSnapshot): number {
  const allIds = getAllEquippedItemIds(playtestState);
  const equipped = getEquippedItems(items, allIds);
  return equipped.reduce((sum, item) => {
    return sum + (item.weaponDamage ?? 0);
  }, 0);
}

/**
 * Итоговый урон = эффективная Сила + урон всех экипированных оружий
 * (сила всегда база, даже без оружия)
 */
export function getTotalDamage(
  variables: Variable[],
  items: Item[],
  playtestState: PlaytestSnapshot
): number {
  const effectiveStrength = getEffectivePlayerStat('strength', variables, items, playtestState);
  const weaponDmg = getEquippedWeaponDamage(items, playtestState);
  return Math.max(0, effectiveStrength + weaponDmg);
}

/**
 * Эффективный шанс крита (в процентах)
 */
export function getEffectiveCritChance(
  variables: Variable[],
  items: Item[],
  playtestState: PlaytestSnapshot
): number {
  return getEffectivePlayerStat('crit_chance', variables, items, playtestState);
}

/**
 * Эффективная сила крита (множитель, напр. 1.5)
 */
export function getEffectiveCritDamage(
  variables: Variable[],
  items: Item[],
  playtestState: PlaytestSnapshot
): number {
  return getEffectivePlayerStat('crit_damage', variables, items, playtestState);
}

/**
 * Returns human-readable name of the main equipped weapon (if any).
 */
export function getEquippedWeaponName(items: Item[], playtestState: PlaytestSnapshot): string | null {
  const allIds = getAllEquippedItemIds(playtestState);
  const equipped = getEquippedItems(items, allIds);
  const weapon = equipped.find(i => i.type === 'weapon' || (i.weaponDamage ?? 0) > 0);
  return weapon ? weapon.name.ru : null;
}
