import type { Item, EquipmentSlot, ButtonAction } from '../../types';

export const createPlaytestSlice = (set: any, get: any) => ({
  // === Playtest State ===
  resetPlaytestState: () => {
    const state = get();
    const newVariableValues: Record<string, number | boolean | string> = {};
    state.variables.forEach((v: any) => { newVariableValues[v.id] = v.defaultValue; });
    Object.entries(state.startingInventory).forEach(([itemId, qty]) => {
      const item = state.items.find((i: Item) => i.id === itemId);
      if (item?.quantityVariableId) newVariableValues[item.quantityVariableId] = qty as number;
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

  // === Equipment ===
  equipItem: (itemId: string, targetSlot?: EquipmentSlot) => {
    set((s: any) => {
      const ps = s.playtestState;
      if (targetSlot) {
        return { playtestState: { ...ps, equippedSlots: { ...ps.equippedSlots, [targetSlot]: itemId } } };
      }
      if (ps.equippedItemIds.includes(itemId)) return s;
      return { playtestState: { ...ps, equippedItemIds: [...ps.equippedItemIds, itemId] } };
    });
  },

  unequipItem: (itemId: string) => {
    set((s: any) => {
      const ps = s.playtestState;
      const newEquippedSlots = { ...ps.equippedSlots };
      Object.keys(newEquippedSlots).forEach((slot) => {
        if (newEquippedSlots[slot as EquipmentSlot] === itemId) delete newEquippedSlots[slot as EquipmentSlot];
      });
      return { playtestState: { ...ps, equippedSlots: newEquippedSlots, equippedItemIds: ps.equippedItemIds.filter((id: string) => id !== itemId) } };
    });
  },

  isItemEquipped: (itemId: string) => {
    const ps = get().playtestState;
    return ps.equippedItemIds.includes(itemId) || Object.values(ps.equippedSlots).includes(itemId);
  },

  // === Inventory ===
  openInventory: () => set((s: any) => ({ playtestState: { ...s.playtestState, isInventoryOpen: true } })),
  closeInventory: () => set((s: any) => ({ playtestState: { ...s.playtestState, isInventoryOpen: false } })),

  dropItem: (itemId: string, amount = 1) => {
    const state = get();
    const item = state.items.find((i: Item) => i.id === itemId);
    if (!item) return;
    if (item.quantityVariableId) {
      const current = Number(state.playtestState.variableValues[item.quantityVariableId] ?? 0);
      const newVal = Math.max(0, current - amount);
      get().setPlaytestVariableValue(item.quantityVariableId, newVal);
      get().updateVariable(item.quantityVariableId, { defaultValue: newVal });
      get().setStartingInventoryQuantity(itemId, newVal);
    } else {
      const current = state.startingInventory[itemId] ?? 0;
      get().setStartingInventoryQuantity(itemId, Math.max(0, current - amount));
    }
  },

  useItem: (itemId: string) => {
    get().dropItem(itemId, 1);
  },

  getPlayerInventory: () => {
    const state = get();
    const inventory: Array<{ item: Item; quantity: number }> = [];
    state.items.forEach((item: Item) => {
      if (item.quantityVariableId) {
        const quantity = Number(state.playtestState.variableValues[item.quantityVariableId] ?? 0);
        if (quantity > 0) inventory.push({ item, quantity });
      } else {
        const startingQty = state.startingInventory[item.id] ?? 0;
        if (startingQty > 0) inventory.push({ item, quantity: startingQty });
      }
    });
    return inventory;
  },

  // === Mode Management ===
  setMode: (newMode: string) => set({ mode: newMode }),

  enterPlaytest: () => {
    const loaded = get().loadPlaytestProgress();
    if (!loaded) get().resetPlaytestState();
    const locked = get().leftSidebarLocked;
    set({ mode: 'playtest', ...(locked ? {} : { leftSidebarCollapsed: true, rightSidebarCollapsed: true }) });
  },

  exitPlaytest: () => {
    const locked = get().leftSidebarLocked;
    set({ mode: 'editor', ...(locked ? {} : { leftSidebarCollapsed: false, rightSidebarCollapsed: false }) });
  },

  // === Playtest Save/Load ===
  savePlaytestProgress: () => {
    try {
      const { playtestState } = get();
      localStorage.setItem('slay-playtest-save', JSON.stringify({
        variableValues: playtestState.variableValues,
        equippedSlots: playtestState.equippedSlots,
        savedAt: new Date().toISOString(),
      }));
    } catch {}
  },

  loadPlaytestProgress: () => {
    try {
      const raw = localStorage.getItem('slay-playtest-save');
      if (!raw) return false;
      const save = JSON.parse(raw);
      set((s: any) => ({
        playtestState: { ...s.playtestState, variableValues: save.variableValues || {}, equippedSlots: save.equippedSlots || {} },
      }));
      return true;
    } catch { return false; }
  },

  clearPlaytestSave: () => { try { localStorage.removeItem('slay-playtest-save'); } catch {} },

  collectItemReward: () => {
    const { playtestState } = get();
    const reward = playtestState.itemRewardModal;
    if (!reward) return;
    set((s: any) => ({ playtestState: { ...s.playtestState, itemRewardModal: null } }));
    for (const { itemId, amount } of reward.items) get().executeAction({ type: 'giveItem', itemId, amount });
    if (reward.afterCollect?.length) for (const a of reward.afterCollect) get().executeAction(a);
  },

  // === Execute Action ===
  executeAction: (action: ButtonAction) => {
    const state = get();
    const currentValues = { ...state.playtestState.variableValues };

    switch (action.type) {
      case 'setVariable': {
        currentValues[(action as any).variableId] = (action as any).value;
        break;
      }
      case 'addToVariable':
      case 'subtractFromVariable': {
        const current = Number(currentValues[(action as any).variableId] ?? 0);
        const delta = action.type === 'addToVariable' ? (action as any).amount : -(action as any).amount;
        currentValues[(action as any).variableId] = current + delta;
        break;
      }
      case 'giveItem':
      case 'removeItem': {
        const item = state.items.find((i: Item) => i.id === (action as any).itemId);
        if (item?.quantityVariableId) {
          const current = Number(currentValues[item.quantityVariableId] ?? 0);
          const delta = action.type === 'giveItem' ? (action as any).amount : -(action as any).amount;
          currentValues[item.quantityVariableId] = Math.max(0, current + delta);
        }
        break;
      }
      case 'changeRelationship': {
        const varName = `relationship_${(action as any).characterId}`;
        const v = state.variables.find((v: any) => v.name === varName);
        if (v) {
          currentValues[v.id] = Number(currentValues[v.id] ?? v.defaultValue ?? 0) + (action as any).delta;
        }
        break;
      }
      case 'changeReputation': {
        const v = state.variables.find((v: any) => v.name === 'reputation');
        if (v) {
          currentValues[v.id] = Number(currentValues[v.id] ?? v.defaultValue ?? 0) + (action as any).delta;
        }
        break;
      }
      case 'changePlayerStat': {
        const v = state.variables.find((v: any) => v.name === (action as any).stat);
        if (v) {
          currentValues[v.id] = Number(currentValues[v.id] ?? v.defaultValue ?? 0) + (action as any).delta;
        }
        break;
      }
      case 'giveResource': {
        const v = state.variables.find((v: any) => v.name === (action as any).resource);
        if (v) {
          currentValues[v.id] = Math.max(0, Number(currentValues[v.id] ?? v.defaultValue ?? 0) + (action as any).amount);
        }
        break;
      }
      case 'removeResource': {
        const v = state.variables.find((v: any) => v.name === (action as any).resource);
        if (v) {
          currentValues[v.id] = Math.max(0, Number(currentValues[v.id] ?? v.defaultValue ?? 0) - (action as any).amount);
        }
        break;
      }
      case 'goToPage': {
        get().selectPage((action as any).pageId);
        get().selectButton(null);
        set((s: any) => ({
          playtestState: { ...s.playtestState, dialogueLineIndex: 0, dialogueStarted: false, widgetOverrides: {} },
        }));
        const targetPage = get().pages.find((p: any) => p.id === (action as any).pageId);
        if (targetPage?.onEnter?.length) for (const enterAction of targetPage.onEnter) get().executeAction(enterAction);
        return;
      }
      case 'openInventory': {
        set((s: any) => ({ playtestState: { ...s.playtestState, isInventoryOpen: true } }));
        break;
      }
      case 'showItemReward': {
        set((s: any) => ({
          playtestState: { ...s.playtestState, itemRewardModal: { items: (action as any).items, afterCollect: (action as any).afterCollect } },
        }));
        return;
      }
      case 'advanceDialogue': {
        const { playtestState: ps, pages, selectedPageId } = get();
        const page = pages.find((p: any) => p.id === selectedPageId);
        if (!page?.dialogueLines?.length) return;
        if (!ps.dialogueStarted) {
          set((s: any) => ({ playtestState: { ...s.playtestState, dialogueStarted: true, dialogueLineIndex: 0 } }));
        } else {
          const current = ps.dialogueLineIndex;
          const total = page.dialogueLines.length;
          if (current < total - 1) {
            set((s: any) => ({ playtestState: { ...s.playtestState, dialogueLineIndex: current + 1 } }));
          } else if (page.onDialogueEnd?.length) {
            for (const a of page.onDialogueEnd) get().executeAction(a);
          }
        }
        return;
      }
      case 'setWidgetProperty': {
        set((s: any) => ({
          playtestState: {
            ...s.playtestState,
            widgetOverrides: {
              ...s.playtestState.widgetOverrides,
              [(action as any).widgetId]: {
                ...(s.playtestState.widgetOverrides[(action as any).widgetId] || {}),
                [(action as any).key]: (action as any).value,
              },
            },
          },
        }));
        break;
      }
      case 'setPortraitVariant': {
        let targetWidgetId = (action as any).widgetId;
        if (!targetWidgetId) {
          const page = state.pages.find((p: any) => p.id === state.selectedPageId);
          const portraitW = (page?.uiWidgets || []).find((w: any) => w.type === 'portrait');
          targetWidgetId = portraitW ? portraitW.id : 'auto-portrait';
        }
        set((s: any) => ({
          playtestState: {
            ...s.playtestState,
            widgetOverrides: {
              ...s.playtestState.widgetOverrides,
              [targetWidgetId]: {
                ...(s.playtestState.widgetOverrides[targetWidgetId] || {}),
                data: { ...((s.playtestState.widgetOverrides[targetWidgetId] || {}).data || {}), variant: (action as any).variant },
              },
            },
          },
        }));
        break;
      }
      case 'setIntensity': {
        const intensityVar = state.variables.find((v: any) => v.name.includes('intensity') || v.name === 'souls');
        if (intensityVar) {
          let newVal = typeof currentValues[intensityVar.id] === 'number' ? (currentValues[intensityVar.id] as number) : (intensityVar.defaultValue as number || 0);
          if ((action as any).value === 'delta' && (action as any).delta) newVal += (action as any).delta;
          else if (typeof (action as any).value === 'number') newVal = (action as any).value;
          currentValues[intensityVar.id] = Math.max(0, Math.min(100, newVal));
        }
        break;
      }
      default:
        break;
    }

    set((s: any) => ({ playtestState: { ...s.playtestState, variableValues: currentValues } }));
    get().savePlaytestProgress();
  },
});
