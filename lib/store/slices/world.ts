import type { Item, Variable, Background, UIAsset, Speaker, Quest, QuestStage } from '../../types';

export const createWorldSlice = (set: any, get: any) => ({
  // === Items ===
  addItem: (itemData: Omit<Item, 'id'>) => {
    const newItem: Item = {
      ...itemData,
      id: `item_${Date.now().toString(36)}`,
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
    set((s: any) => ({ items: [...s.items, newItem] }));
    get().saveToLocalStorage();
  },

  updateItem: (id: string, updates: Partial<Item>) => {
    set((s: any) => ({ items: s.items.map((item: Item) => item.id === id ? { ...item, ...updates } : item) }));
    get().saveToLocalStorage();
  },

  deleteItem: (id: string) => {
    set((s: any) => ({ items: s.items.filter((item: Item) => item.id !== id) }));
    get().saveToLocalStorage();
  },

  getItem: (id: string) => get().items.find((item: Item) => item.id === id),

  renameItem: (oldId: string, newId: string, newName?: any) => {
    const state = get();
    const trimmedNewId = newId.trim();

    if (!trimmedNewId) {
      alert('ID предмета не может быть пустым');
      return;
    }
    if (trimmedNewId === oldId) {
      if (newName) {
        set((s: any) => ({ items: s.items.map((item: Item) => item.id === oldId ? { ...item, name: newName } : item) }));
        get().saveToLocalStorage();
      }
      return;
    }
    if (state.items.some((i: Item) => i.id === trimmedNewId)) {
      alert('Предмет с таким ID уже существует');
      return;
    }

    set((s: any) => ({
      items: s.items.map((item: Item) => {
        if (item.id !== oldId) return item;
        return { ...item, id: trimmedNewId, name: newName || item.name };
      }),
    }));

    const updateCondition = (cond: any): any => {
      if (!cond) return cond;
      if (cond.type === 'itemQuantity' && cond.itemId === oldId) return { ...cond, itemId: trimmedNewId };
      if (cond.type === 'and' || cond.type === 'or') return { ...cond, conditions: cond.conditions.map(updateCondition) };
      if (cond.type === 'not') return { ...cond, condition: updateCondition(cond.condition) };
      return cond;
    };

    set((s: any) => ({
      pages: s.pages.map((page: any) => ({
        ...page,
        buttons: page.buttons.map((btn: any) => {
          let newAction = btn.action;
          if ((newAction.type === 'giveItem' || newAction.type === 'removeItem') && newAction.itemId === oldId) {
            newAction = { ...newAction, itemId: trimmedNewId };
          }
          const newVisibleWhen = updateCondition(btn.visibleWhen);
          const newEnabledWhen = updateCondition(btn.enabledWhen);
          if (newAction !== btn.action || newVisibleWhen !== btn.visibleWhen || newEnabledWhen !== btn.enabledWhen) {
            return { ...btn, action: newAction, visibleWhen: newVisibleWhen, enabledWhen: newEnabledWhen };
          }
          return btn;
        }),
      })),
    }));

    get().saveToLocalStorage();
  },

  // === Variables ===
  addVariable: (variableData: Omit<Variable, 'id'>) => {
    const newVariable: Variable = { ...variableData, id: `var_${Date.now().toString(36)}` };
    set((s: any) => ({ variables: [...s.variables, newVariable] }));
    get().saveToLocalStorage();
  },

  updateVariable: (id: string, updates: Partial<Variable>) => {
    set((s: any) => ({ variables: s.variables.map((v: Variable) => v.id === id ? { ...v, ...updates } : v) }));
    get().saveToLocalStorage();
  },

  deleteVariable: (id: string) => {
    set((s: any) => ({ variables: s.variables.filter((v: Variable) => v.id !== id) }));
    get().saveToLocalStorage();
  },

  getVariable: (id: string) => get().variables.find((v: Variable) => v.id === id),

  setPlaytestVariableValue: (id: string, value: any) => {
    set((s: any) => ({
      playtestState: { ...s.playtestState, variableValues: { ...s.playtestState.variableValues, [id]: value } },
    }));
  },

  // === Backgrounds ===
  addBackground: (bgData: Omit<Background, 'id'>) => {
    const newBg: Background = {
      ...bgData,
      id: `bg_${Date.now().toString(36)}`,
      settings: bgData.settings ?? {
        scale: 1, offsetX: 0, offsetY: 0, brightness: 1, opacity: 1, fitMode: 'cover',
        parallax: { enabled: false, speedX: 0.5, speedY: 0.3, reverse: false },
      },
    };
    set((s: any) => ({ backgrounds: [...s.backgrounds, newBg] }));
    get().saveToLocalStorage();
  },

  updateBackground: (id: string, updates: Partial<Background>) => {
    set((s: any) => ({ backgrounds: s.backgrounds.map((bg: Background) => bg.id === id ? { ...bg, ...updates } : bg) }));
    get().saveToLocalStorage();
  },

  deleteBackground: (id: string) => {
    set((s: any) => ({
      backgrounds: s.backgrounds.filter((b: Background) => b.id !== id),
      pages: s.pages.map((p: any) =>
        p.background === id ? { ...p, background: (s.backgrounds[0]?.id || '') } : p
      ),
    }));
    get().saveToLocalStorage();
  },

  getBackground: (id: string) => get().backgrounds.find((b: Background) => b.id === id),

  // === UI Assets ===
  addUIAsset: (assetData: Omit<UIAsset, 'id'>) => {
    const newAsset: UIAsset = { ...assetData, id: `uiasset_${Date.now().toString(36)}` };
    set((s: any) => ({ uiAssets: [...s.uiAssets, newAsset] }));
    get().saveToLocalStorage();
  },

  updateUIAsset: (id: string, updates: Partial<UIAsset>) => {
    set((s: any) => ({ uiAssets: s.uiAssets.map((a: UIAsset) => a.id === id ? { ...a, ...updates } : a) }));
    get().saveToLocalStorage();
  },

  deleteUIAsset: (id: string) => {
    set((s: any) => ({ uiAssets: s.uiAssets.filter((a: UIAsset) => a.id !== id) }));
    get().saveToLocalStorage();
  },

  getUIAsset: (id: string) => get().uiAssets.find((a: UIAsset) => a.id === id),

  // === Speakers ===
  addSpeaker: (speakerData: Partial<Speaker> & { displayName: any }) => {
    const id = speakerData.id || `spk_${Date.now().toString(36)}`;
    const newSpeaker: Speaker = {
      displayName: speakerData.displayName,
      id,
      ...(speakerData.portraitAssetId ? { portraitAssetId: speakerData.portraitAssetId } : {}),
    };
    set((s: any) => ({ speakers: [...s.speakers, newSpeaker] }));
    get().saveToLocalStorage();
  },

  updateSpeaker: (id: string, updates: Partial<Speaker>) => {
    set((s: any) => ({ speakers: s.speakers.map((sp: Speaker) => sp.id === id ? { ...sp, ...updates } : sp) }));
    get().saveToLocalStorage();
  },

  deleteSpeaker: (id: string) => {
    set((s: any) => ({ speakers: s.speakers.filter((sp: Speaker) => sp.id !== id) }));
    get().saveToLocalStorage();
  },

  // === Dialogue Theme ===
  updateDialogueTheme: (updates: any) => {
    set((s: any) => ({ dialogueTheme: { ...s.dialogueTheme, ...updates } }));
    get().saveToLocalStorage();
  },

  // === Starting Inventory ===
  addToStartingInventory: (itemId: string, quantity = 1) => {
    const state = get();
    const item = state.items.find((i: Item) => i.id === itemId);
    if (!item) return;

    let targetQuantityVarId = item.quantityVariableId;

    if (!targetQuantityVarId) {
      const suggestedName = `item_${item.name.ru.toLowerCase().replace(/\s+/g, '_')}_qty`;
      const varId = `var_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      const createdVar: Variable = {
        id: varId,
        name: suggestedName,
        displayName: { ru: `Кол-во: ${item.name.ru}`, en: `Qty: ${item.name.en}` },
        type: 'number',
        defaultValue: 0,
        category: 'inventory',
      };
      set((s: any) => ({ variables: [...s.variables, createdVar] }));
      set((s: any) => ({ items: s.items.map((i: Item) => i.id === itemId ? { ...i, quantityVariableId: varId } : i) }));
      targetQuantityVarId = varId;
      set((s: any) => ({ variables: s.variables.map((v: Variable) => v.id === varId ? { ...v, defaultValue: quantity } : v) }));
    }

    const newQty = Math.max(0, (state.startingInventory[itemId] ?? 0) + quantity);
    set((s: any) => ({ startingInventory: { ...s.startingInventory, [itemId]: newQty } }));

    if (targetQuantityVarId) {
      set((s: any) => ({
        variables: s.variables.map((v: Variable) => v.id === targetQuantityVarId ? { ...v, defaultValue: newQty } : v),
      }));
    }

    get().saveToLocalStorage();
  },

  removeFromStartingInventory: (itemId: string) => {
    set((s: any) => {
      const newInv = { ...s.startingInventory };
      delete newInv[itemId];
      return { startingInventory: newInv };
    });
    get().saveToLocalStorage();
  },

  setStartingInventoryQuantity: (itemId: string, quantity: number) => {
    set((s: any) => ({
      startingInventory: { ...s.startingInventory, [itemId]: Math.max(0, Math.floor(quantity)) },
    }));
    get().saveToLocalStorage();
  },

  // === Default Stat Presets ===
  addDefaultPlayerStats: () => {
    const state = get();
    const existingNames = new Set(state.variables.map((v: Variable) => v.name));
    const defaultStats: Omit<Variable, 'id'>[] = [
      { name: 'health_max', displayName: { ru: 'Здоровье (макс)', en: 'Health (max)' }, type: 'number', defaultValue: 100, category: 'player' },
      { name: 'health', displayName: { ru: 'Здоровье', en: 'Health' }, type: 'number', defaultValue: 100, category: 'player' },
      { name: 'mana_max', displayName: { ru: 'Мана (макс)', en: 'Mana (max)' }, type: 'number', defaultValue: 50, category: 'player' },
      { name: 'mana', displayName: { ru: 'Мана', en: 'Mana' }, type: 'number', defaultValue: 50, category: 'player' },
      { name: 'strength', displayName: { ru: 'Сила', en: 'Strength' }, type: 'number', defaultValue: 5, category: 'player' },
      { name: 'agility', displayName: { ru: 'Ловкость', en: 'Agility' }, type: 'number', defaultValue: 5, category: 'player' },
      { name: 'endurance', displayName: { ru: 'Выносливость', en: 'Endurance' }, type: 'number', defaultValue: 5, category: 'player' },
      { name: 'magic', displayName: { ru: 'Магия', en: 'Magic' }, type: 'number', defaultValue: 3, category: 'player' },
      { name: 'luck', displayName: { ru: 'Удача', en: 'Luck' }, type: 'number', defaultValue: 4, category: 'player' },
      { name: 'defense', displayName: { ru: 'Защита', en: 'Defense' }, type: 'number', defaultValue: 2, category: 'player' },
      { name: 'souls', displayName: { ru: 'Души', en: 'Souls' }, type: 'number', defaultValue: 0, category: 'player' },
      { name: 'level', displayName: { ru: 'Уровень', en: 'Level' }, type: 'number', defaultValue: 1, category: 'player' },
      { name: 'exp', displayName: { ru: 'Опыт', en: 'Experience' }, type: 'number', defaultValue: 0, category: 'player' },
      { name: 'crit_chance', displayName: { ru: 'Шанс крита', en: 'Critical Chance' }, type: 'number', defaultValue: 5, category: 'player' },
      { name: 'crit_damage', displayName: { ru: 'Сила крита', en: 'Critical Damage' }, type: 'number', defaultValue: 1.5, category: 'player' },
      { name: 'coins', displayName: { ru: 'Монеты', en: 'Coins' }, type: 'number', defaultValue: 15, category: 'resources' },
      { name: 'gasoline', displayName: { ru: 'Топливо', en: 'Fuel' }, type: 'number', defaultValue: 0, category: 'resources' },
      { name: 'gems', displayName: { ru: 'Сталлонки', en: 'Stallons' }, type: 'number', defaultValue: 0, category: 'resources' },
    ];
    const newVariables = defaultStats
      .filter(stat => !existingNames.has(stat.name))
      .map(stat => ({ ...stat, id: `var_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}` }));
    if (newVariables.length > 0) {
      set((s: any) => ({ variables: [...s.variables, ...newVariables] }));
      get().saveToLocalStorage();
    }
  },

  addDefaultResources: () => {
    const state = get();
    const existingNames = new Set(state.variables.map((v: Variable) => v.name));
    const resources: Omit<Variable, 'id'>[] = [
      { name: 'coins', displayName: { ru: 'Монеты', en: 'Coins' }, type: 'number', defaultValue: 15, category: 'resources' },
      { name: 'gasoline', displayName: { ru: 'Топливо', en: 'Fuel' }, type: 'number', defaultValue: 0, category: 'resources' },
      { name: 'gems', displayName: { ru: 'Сталлонки', en: 'Stallons' }, type: 'number', defaultValue: 0, category: 'resources' },
    ];
    const newResources = resources
      .filter(r => !existingNames.has(r.name))
      .map(r => ({ ...r, id: `var_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}` }));
    if (newResources.length > 0) {
      set((s: any) => ({ variables: [...s.variables, ...newResources] }));
      get().saveToLocalStorage();
    }
  },

  addCriticalStats: () => {
    const state = get();
    const existingNames = new Set(state.variables.map((v: Variable) => v.name));
    const critStats: Omit<Variable, 'id'>[] = [
      { name: 'crit_chance', displayName: { ru: 'Шанс крита', en: 'Critical Chance' }, type: 'number', defaultValue: 5, category: 'player' },
      { name: 'crit_damage', displayName: { ru: 'Сила крита', en: 'Critical Damage' }, type: 'number', defaultValue: 1.5, category: 'player' },
    ];
    const newCrits = critStats
      .filter(stat => !existingNames.has(stat.name))
      .map(stat => ({ ...stat, id: `var_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}` }));
    if (newCrits.length > 0) {
      set((s: any) => ({ variables: [...s.variables, ...newCrits] }));
      get().saveToLocalStorage();
    }
  },

  // === Quests ===
  addQuest: (questData: Omit<Quest, 'id'>) => {
    const newQuest: Quest = {
      id: `quest_${Date.now().toString(36)}`,
      title: questData.title ?? { ru: 'Новый квест', en: 'New Quest' },
      description: questData.description ?? { ru: '', en: '' },
      stages: questData.stages ?? [],
      rewards: questData.rewards ?? [],
    };
    set((s: any) => ({ quests: [...s.quests, newQuest] }));
    get().saveToLocalStorage();
  },

  updateQuest: (id: string, updates: Partial<Omit<Quest, 'id'>>) => {
    set((s: any) => ({ quests: s.quests.map((q: Quest) => q.id === id ? { ...q, ...updates } : q) }));
    get().saveToLocalStorage();
  },

  deleteQuest: (id: string) => {
    set((s: any) => ({ quests: s.quests.filter((q: Quest) => q.id !== id) }));
    get().saveToLocalStorage();
  },
});
