import { create } from 'zustand';

export type LocalizedString = {
  ru: string;
  en: string;
};

export type Item = {
  id: string;
  name: LocalizedString;
  description: LocalizedString;
  quantityVariableId?: string; // ID переменной, которая хранит количество этого предмета
  // В будущем можно будет добавить: icon, weight, rarity и т.д.
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
      default:
        // goToPage и startQuest пока ничего не делают в превью
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
