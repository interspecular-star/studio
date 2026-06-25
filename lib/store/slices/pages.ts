import type { LocalizedString, DialogueLine, StudioAct, UIWidget, StudioButton, StudioPage } from '../../types';
import { createDefaultPage } from '../defaults';

export const createPagesSlice = (set: any, get: any) => ({
  // === Pages ===
  setPages: (pages: StudioPage[]) => set({ pages }),

  selectPage: (id: string | null) =>
    set({ selectedPageId: id, selectedButtonId: null, selectedWidgetId: null, editorDialoguePreviewLine: null }),

  addPage: (actId?: string | null) => {
    const newPage = createDefaultPage(`page_${Date.now().toString(36)}`);
    set((s: any) => {
      const newPages = [...s.pages, newPage];
      if (actId) {
        const newActs = s.acts.map((a: StudioAct) =>
          a.id === actId ? { ...a, pageIds: [...a.pageIds, newPage.id] } : a
        );
        return { pages: newPages, acts: newActs, selectedPageId: newPage.id, selectedButtonId: null, selectedWidgetId: null };
      }
      return { pages: newPages, unassignedPageIds: [...s.unassignedPageIds, newPage.id], selectedPageId: newPage.id, selectedButtonId: null, selectedWidgetId: null };
    });
    get().saveToLocalStorage();
  },

  updatePage: (id: string, updates: Partial<StudioPage>) => {
    set((s: any) => ({
      pages: s.pages.map((p: StudioPage) => {
        if (p.id !== id) return p;
        let next = { ...p, ...updates };
        const newSpeaker = updates.speaker ?? p.speaker;
        if (newSpeaker && newSpeaker !== 'none' && (!next.uiWidgets || next.uiWidgets.length === 0)) {
          next.uiWidgets = [
            { id: `uiw_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, type: 'dialogueBox', layout: { x: 16, y: 78, width: 68, height: 12, z: 20 }, style: 'default' },
            { id: `uiw_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, type: 'textLabel', layout: { x: 42, y: 58, width: 16, height: 3, z: 15 }, style: 'default', data: { speakerId: newSpeaker } },
          ];
          next.uiLayoutPreset = 'classic_vn';
        }
        return next;
      }),
    }));
    get().saveToLocalStorage();
  },

  deletePage: (id: string) => {
    set((s: any) => {
      const filtered = s.pages.filter((p: StudioPage) => p.id !== id);
      return {
        pages: filtered,
        acts: s.acts.map((a: StudioAct) => ({ ...a, pageIds: a.pageIds.filter((pid: string) => pid !== id) })),
        unassignedPageIds: s.unassignedPageIds.filter((pid: string) => pid !== id),
        selectedPageId: s.selectedPageId === id ? (filtered[0]?.id ?? null) : s.selectedPageId,
        selectedButtonId: null,
        selectedWidgetId: null,
      };
    });
    get().saveToLocalStorage();
  },

  duplicatePage: (id: string) => {
    const state = get();
    const src = state.pages.find((p: StudioPage) => p.id === id);
    if (!src) return;
    const ts = Date.now().toString(36);
    const newId = `${id}_c${ts}`;
    const cloned = JSON.parse(JSON.stringify(src)) as StudioPage;
    cloned.id = newId;
    cloned.title = { ru: src.title.ru + ' (копия)', en: src.title.en + ' (copy)' };
    cloned.buttons = cloned.buttons.map((b: StudioButton, i: number) => ({ ...b, id: `btn_${ts}_${i}` }));
    cloned.uiWidgets = (cloned.uiWidgets || []).map((w: UIWidget) => ({ ...w, id: `uiw_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}` }));
    const srcIdx = state.pages.findIndex((p: StudioPage) => p.id === id);
    const newPages = [...state.pages];
    newPages.splice(srcIdx + 1, 0, cloned);
    const ownerAct = state.acts.find((a: StudioAct) => a.pageIds.includes(id));
    if (ownerAct) {
      const posInAct = ownerAct.pageIds.indexOf(id);
      const newActs = state.acts.map((a: StudioAct) => {
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

  renamePage: (oldId: string, newId: string, newTitle?: LocalizedString) => {
    const state = get();
    const trimmedNewId = newId.trim();
    if (!trimmedNewId) { alert('ID страницы не может быть пустым'); return; }
    if (trimmedNewId === oldId) {
      if (newTitle) {
        set((s: any) => ({ pages: s.pages.map((p: StudioPage) => p.id === oldId ? { ...p, title: newTitle } : p) }));
        get().saveToLocalStorage();
      }
      return;
    }
    if (state.pages.some((p: StudioPage) => p.id === trimmedNewId)) {
      alert('Страница с таким ID уже существует');
      return;
    }
    set((s: any) => ({
      pages: s.pages.map((p: StudioPage) =>
        p.id !== oldId ? p : { ...p, id: trimmedNewId, title: newTitle || p.title }
      ),
    }));
    set((s: any) => ({
      pages: s.pages.map((p: StudioPage) => ({
        ...p,
        buttons: p.buttons.map((btn: StudioButton) =>
          btn.action.type === 'goToPage' && (btn.action as any).pageId === oldId
            ? { ...btn, action: { ...btn.action, pageId: trimmedNewId } }
            : btn
        ),
      })),
    }));
    set((s: any) => ({
      acts: s.acts.map((a: StudioAct) => ({ ...a, pageIds: a.pageIds.map((pid: string) => pid === oldId ? trimmedNewId : pid) })),
      unassignedPageIds: s.unassignedPageIds.map((pid: string) => pid === oldId ? trimmedNewId : pid),
    }));
    if (state.selectedPageId === oldId) set({ selectedPageId: trimmedNewId });
    get().saveToLocalStorage();
  },

  // === Buttons ===
  selectButton: (id: string | null) => {
    set((s: any) => ({ selectedButtonId: id, selectedWidgetId: id ? null : s.selectedWidgetId }));
    if (id) {
      const state = get();
      const page = state.pages.find((p: StudioPage) => p.id === state.selectedPageId);
      const btn = page?.buttons.find((b: StudioButton) => b.id === id);
      if (btn && (!btn.history || btn.history.length === 0)) {
        set((s: any) => ({
          pages: s.pages.map((p: StudioPage) =>
            p.id !== state.selectedPageId ? p : {
              ...p,
              buttons: p.buttons.map((b: StudioButton) =>
                b.id === id ? { ...b, history: [{ layout: { ...b.layout }, ts: new Date().toISOString() }] } : b
              ),
            }
          ),
        }));
        get().saveToLocalStorage();
      }
    }
  },

  addButton: (pageId: string) => {
    const newButton: StudioButton = {
      id: `btn_${Date.now().toString(36)}`,
      text: { ru: 'Новая кнопка', en: 'New button' },
      layout: { x: 35 + Math.random() * 20, y: 65 + Math.random() * 10, width: 24, height: 11, style: 'default' },
      action: { type: 'goToPage', pageId: '' },
      history: [],
    };
    set((s: any) => ({
      pages: s.pages.map((p: StudioPage) => p.id === pageId ? { ...p, buttons: [...p.buttons, newButton] } : p),
      selectedButtonId: newButton.id,
    }));
    get().saveToLocalStorage();
  },

  updateButton: (pageId: string, buttonId: string, updates: Partial<StudioButton>) => {
    set((s: any) => ({
      pages: s.pages.map((p: StudioPage) =>
        p.id !== pageId ? p : {
          ...p,
          buttons: p.buttons.map((btn: StudioButton) => btn.id === buttonId ? { ...btn, ...updates } : btn),
        }
      ),
    }));
    get().saveToLocalStorage();
  },

  deleteButton: (pageId: string, buttonId: string) => {
    set((s: any) => ({
      pages: s.pages.map((p: StudioPage) =>
        p.id !== pageId ? p : { ...p, buttons: p.buttons.filter((b: StudioButton) => b.id !== buttonId) }
      ),
      selectedButtonId: s.selectedButtonId === buttonId ? null : s.selectedButtonId,
    }));
    get().saveToLocalStorage();
  },

  moveButton: (pageId: string, buttonId: string, x: number, y: number) => {
    set((s: any) => ({
      pages: s.pages.map((p: StudioPage) =>
        p.id !== pageId ? p : {
          ...p,
          buttons: p.buttons.map((btn: StudioButton) => {
            if (btn.id !== buttonId) return btn;
            const newHistory = [...(btn.history || []), { layout: { ...btn.layout }, ts: new Date().toISOString() }].slice(-10);
            return { ...btn, layout: { ...btn.layout, x: Math.max(4, Math.min(82, x)), y: Math.max(8, Math.min(78, y)) }, history: newHistory };
          }),
        }
      ),
    }));
    get().saveToLocalStorage();
  },

  updateButtonLayout: (pageId: string, buttonId: string, layoutUpdates: Partial<StudioButton['layout']>) => {
    set((s: any) => ({
      pages: s.pages.map((p: StudioPage) =>
        p.id !== pageId ? p : {
          ...p,
          buttons: p.buttons.map((btn: StudioButton) => {
            if (btn.id !== buttonId) return btn;
            const newHistory = [...(btn.history || []), { layout: { ...btn.layout }, ts: new Date().toISOString() }].slice(-10);
            return { ...btn, layout: { ...btn.layout, ...layoutUpdates }, history: newHistory };
          }),
        }
      ),
    }));
    get().saveToLocalStorage();
  },

  restoreButtonFromHistory: (pageId: string, buttonId: string, historyIndex: number) => {
    const state = get();
    const page = state.pages.find((p: StudioPage) => p.id === pageId);
    if (!page) return;
    const btn = page.buttons.find((b: StudioButton) => b.id === buttonId);
    if (!btn || !btn.history || btn.history.length === 0) return;
    const idx = btn.history.length - 1 - historyIndex;
    if (idx < 0 || idx >= btn.history.length) return;
    const entry = btn.history[idx];
    set((s: any) => ({
      pages: s.pages.map((p: StudioPage) =>
        p.id !== pageId ? p : {
          ...p,
          buttons: p.buttons.map((b: StudioButton) => b.id === buttonId ? { ...b, layout: { ...entry.layout } } : b),
        }
      ),
    }));
    get().saveToLocalStorage();
  },

  // === UI Widgets ===
  selectWidget: (id: string | null) => {
    set((s: any) => ({ selectedWidgetId: id, selectedButtonId: id ? null : s.selectedButtonId }));
  },

  addUIWidget: (pageId: string, widgetData: Partial<UIWidget>) => {
    const newWidget: UIWidget = {
      ...widgetData,
      id: `uiw_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    } as UIWidget;
    set((s: any) => ({
      pages: s.pages.map((p: StudioPage) => p.id === pageId ? { ...p, uiWidgets: [...(p.uiWidgets || []), newWidget] } : p),
    }));
    get().saveToLocalStorage();
  },

  updateUIWidget: (pageId: string, widgetId: string, updates: Partial<UIWidget>) => {
    set((s: any) => ({
      pages: s.pages.map((p: StudioPage) =>
        p.id !== pageId ? p : {
          ...p,
          uiWidgets: (p.uiWidgets || []).map((w: UIWidget) => w.id === widgetId ? { ...w, ...updates } : w),
        }
      ),
    }));
    get().saveToLocalStorage();
  },

  deleteUIWidget: (pageId: string, widgetId: string) => {
    set((s: any) => ({
      pages: s.pages.map((p: StudioPage) =>
        p.id !== pageId ? p : { ...p, uiWidgets: (p.uiWidgets || []).filter((w: UIWidget) => w.id !== widgetId) }
      ),
      selectedWidgetId: s.selectedWidgetId === widgetId ? null : s.selectedWidgetId,
    }));
    get().saveToLocalStorage();
  },

  updateUIWidgetLayout: (pageId: string, widgetId: string, layoutUpdates: Partial<UIWidget['layout']>) => {
    set((s: any) => ({
      pages: s.pages.map((p: StudioPage) =>
        p.id !== pageId ? p : {
          ...p,
          uiWidgets: (p.uiWidgets || []).map((w: UIWidget) =>
            w.id === widgetId ? { ...w, layout: { ...w.layout, ...layoutUpdates } } : w
          ),
        }
      ),
    }));
    get().saveToLocalStorage();
  },

  moveUIWidget: (pageId: string, widgetId: string, x: number, y: number) => {
    set((s: any) => ({
      pages: s.pages.map((p: StudioPage) =>
        p.id !== pageId ? p : {
          ...p,
          uiWidgets: (p.uiWidgets || []).map((w: UIWidget) => w.id === widgetId ? { ...w, layout: { ...w.layout, x, y } } : w),
        }
      ),
    }));
    get().saveToLocalStorage();
  },

  applyUILayoutPreset: (pageId: string, preset: string | undefined) => {
    let defaultWidgets: UIWidget[] = [];
    const ts = Date.now();
    if (preset === 'classic_vn') {
      defaultWidgets = [
        { id: `uiw_${ts.toString(36)}_a`, type: 'dialogueBox', layout: { x: 16, y: 78, width: 68, height: 12, z: 20 }, style: 'default' },
        { id: `uiw_${ts.toString(36)}_b`, type: 'textLabel', layout: { x: 42, y: 58, width: 16, height: 3, z: 15 }, style: 'default' },
      ];
    } else if (preset === 'bottom_bar') {
      defaultWidgets = [
        { id: `w_bar_${ts}`, type: 'dialogueBox', layout: { x: 10, y: 82, width: 80, height: 14, z: 10 }, style: 'default' },
        { id: `w_port_${ts}`, type: 'portrait', layout: { x: 78, y: 40, width: 18, height: 35, z: 5 }, style: 'default' },
        { id: `w_choice1_${ts}`, type: 'choiceButton', layout: { x: 15, y: 92, width: 30, height: 6, z: 30 }, style: 'default' },
        { id: `w_choice2_${ts}`, type: 'choiceButton', layout: { x: 55, y: 92, width: 30, height: 6, z: 30 }, style: 'default' },
        { id: `w_qinv_${ts}`, type: 'quickAction', layout: { x: 2, y: 15, width: 6, height: 6, z: 50 }, data: { actionType: 'inventory' } },
      ];
    } else if (preset === 'left_bar') {
      defaultWidgets = [
        { id: `w_cont_${ts}`, type: 'container', layout: { x: 1, y: 10, width: 10, height: 80, z: 1 } },
        { id: `w_qinv_${ts}`, type: 'quickAction', layout: { x: 2, y: 15, width: 8, height: 8, z: 10 }, data: { actionType: 'inventory' } },
        { id: `w_qmap_${ts}`, type: 'quickAction', layout: { x: 2, y: 28, width: 8, height: 8, z: 10 }, data: { actionType: 'map' } },
        { id: `w_qsk_${ts}`, type: 'quickAction', layout: { x: 2, y: 41, width: 8, height: 8, z: 10 }, data: { actionType: 'skills' } },
      ];
    } else if (preset === 'full_dialogue_demo') {
      defaultWidgets = [
        { id: `uiw_${ts.toString(36)}_a`, type: 'dialogueBox', layout: { x: 15, y: 70, width: 70, height: 20, z: 20 }, style: 'default' },
        { id: `w_port1_${ts}`, type: 'portrait', layout: { x: 78, y: 25, width: 18, height: 38, z: 5 }, data: { speakerId: 'mila', variant: 'neutral' } },
        { id: `w_port2_${ts}`, type: 'portrait', layout: { x: 2, y: 25, width: 18, height: 38, z: 5 }, data: { speakerId: 'slay', variant: 'default' } },
        { id: `w_cont_${ts}`, type: 'container', layout: { x: 1, y: 12, width: 10, height: 75, z: 1 }, data: { title: 'Меню' } },
        { id: `w_qinv_${ts}`, type: 'quickAction', layout: { x: 2, y: 18, width: 7, height: 7, z: 10 }, data: { actionType: 'inventory' } },
        { id: `w_qsk_${ts}`, type: 'quickAction', layout: { x: 2, y: 30, width: 7, height: 7, z: 10 }, data: { actionType: 'skills' } },
        { id: `w_int_${ts}`, type: 'intensityBar', layout: { x: 12, y: 5, width: 25, height: 3.5, z: 30 }, data: { valueVar: 'souls', parts: 3 } },
        { id: `w_ch1_${ts}`, type: 'choiceButton', layout: { x: 20, y: 92, width: 28, height: 6, z: 25 }, style: 'default', text: { ru: 'Согласиться', en: 'Agree' }, data: { linkedButtonId: '', setIntensity: 40 } },
        { id: `w_ch2_${ts}`, type: 'choiceButton', layout: { x: 52, y: 92, width: 28, height: 6, z: 25 }, style: 'important', text: { ru: 'Отказаться', en: 'Refuse' }, data: { linkedButtonId: '', setIntensity: 80 } },
      ];
    }
    set((s: any) => ({
      pages: s.pages.map((p: StudioPage) =>
        p.id !== pageId ? p : { ...p, uiLayoutPreset: preset, uiWidgets: defaultWidgets.length ? defaultWidgets : (p.uiWidgets || []) }
      ),
    }));
    get().saveToLocalStorage();
  },

  // === Widget Clipboard ===
  copySelectedToWidgetClipboard: () => {
    const state = get();
    const page = state.pages.find((p: StudioPage) => p.id === state.selectedPageId);
    if (!page) return;
    if (state.selectedWidgetId) {
      const widget = (page.uiWidgets || []).find((w: UIWidget) => w.id === state.selectedWidgetId);
      if (widget) set({ widgetClipboard: { kind: 'widget', item: JSON.parse(JSON.stringify(widget)), sourcePageId: state.selectedPageId! } });
    } else if (state.selectedButtonId) {
      const button = page.buttons.find((b: StudioButton) => b.id === state.selectedButtonId);
      if (button) set({ widgetClipboard: { kind: 'button', item: JSON.parse(JSON.stringify(button)), sourcePageId: state.selectedPageId! } });
    }
  },

  pasteFromWidgetClipboard: (offset = true) => {
    const state = get();
    const { widgetClipboard, selectedPageId } = state;
    if (!widgetClipboard || !selectedPageId) return;
    const crossPage = widgetClipboard.sourcePageId !== selectedPageId;
    const dx = (offset && !crossPage) ? 2 : 0;
    const dy = (offset && !crossPage) ? 2 : 0;
    const newId = Date.now().toString(36);
    if (widgetClipboard.kind === 'widget') {
      const src = widgetClipboard.item;
      const newWidget: UIWidget = { ...src, id: `uiw_${newId}`, layout: { ...src.layout, x: Math.min(98, src.layout.x + dx), y: Math.min(98, src.layout.y + dy) } };
      set((s: any) => ({
        pages: s.pages.map((p: StudioPage) =>
          p.id !== selectedPageId ? p : { ...p, uiWidgets: [...(p.uiWidgets || []), newWidget] }
        ),
        selectedWidgetId: newWidget.id,
        selectedButtonId: null,
      }));
    } else {
      const src = widgetClipboard.item;
      const newButton: StudioButton = { ...src, id: `btn_${newId}`, layout: { ...src.layout, x: Math.min(98, src.layout.x + dx), y: Math.min(98, src.layout.y + dy) } };
      set((s: any) => ({
        pages: s.pages.map((p: StudioPage) =>
          p.id !== selectedPageId ? p : { ...p, buttons: [...p.buttons, newButton] }
        ),
        selectedButtonId: newButton.id,
        selectedWidgetId: null,
      }));
    }
    get().saveToLocalStorage();
  },

  duplicateSelected: () => {
    get().copySelectedToWidgetClipboard();
    get().pasteFromWidgetClipboard(false);
  },

  // === Coordinate Clipboard ===
  copyButtonCoordinates: (pageId: string, buttonId: string) =>
    set((s: any) => {
      const page = s.pages.find((p: StudioPage) => p.id === pageId);
      const button = page?.buttons.find((b: StudioButton) => b.id === buttonId);
      if (!button) return s;
      return { coordinateClipboard: { x: button.layout.x, y: button.layout.y, width: button.layout.width, height: button.layout.height } };
    }),

  pasteButtonCoordinates: (pageId: string, buttonId: string) =>
    set((s: any) => {
      if (!s.coordinateClipboard) return s;
      return {
        pages: s.pages.map((p: StudioPage) =>
          p.id !== pageId ? p : {
            ...p,
            buttons: p.buttons.map((btn: StudioButton) => {
              if (btn.id !== buttonId) return btn;
              const newHistory = [...(btn.history || []), { layout: { ...btn.layout }, ts: new Date().toISOString() }].slice(-10);
              return { ...btn, layout: { ...btn.layout, x: s.coordinateClipboard.x, y: s.coordinateClipboard.y, width: s.coordinateClipboard.width, height: s.coordinateClipboard.height }, history: newHistory };
            }),
          }
        ),
      };
    }),

  clearCoordinateClipboard: () => set({ coordinateClipboard: null }),

  // === Dialogue Lines ===
  addDialogueLine: (pageId: string, line: Partial<DialogueLine> = {}) => {
    const newLine: DialogueLine = {
      id: `dl_${Date.now().toString(36)}`,
      text: { ru: line.text?.ru ?? '', en: line.text?.en ?? '' },
      speaker: line.speaker,
      portraitVariant: line.portraitVariant,
    };
    set((s: any) => ({
      pages: s.pages.map((p: StudioPage) =>
        p.id === pageId ? { ...p, dialogueLines: [...(p.dialogueLines || []), newLine] } : p
      ),
    }));
    get().saveToLocalStorage();
  },

  updateDialogueLine: (pageId: string, lineId: string, updates: Partial<DialogueLine>) => {
    set((s: any) => ({
      pages: s.pages.map((p: StudioPage) =>
        p.id !== pageId ? p : {
          ...p,
          dialogueLines: (p.dialogueLines || []).map((l: DialogueLine) => l.id === lineId ? { ...l, ...updates } : l),
        }
      ),
    }));
    get().saveToLocalStorage();
  },

  deleteDialogueLine: (pageId: string, lineId: string) => {
    set((s: any) => ({
      pages: s.pages.map((p: StudioPage) =>
        p.id !== pageId ? p : { ...p, dialogueLines: (p.dialogueLines || []).filter((l: DialogueLine) => l.id !== lineId) }
      ),
    }));
    get().saveToLocalStorage();
  },

  advanceDialogueLine: () => {
    const state = get();
    const page = state.pages.find((p: StudioPage) => p.id === state.selectedPageId);
    const total = page?.dialogueLines?.length ?? 0;
    const current = state.playtestState.dialogueLineIndex;
    if (current < total - 1) {
      set((s: any) => ({ playtestState: { ...s.playtestState, dialogueLineIndex: current + 1 } }));
    }
  },

  // === Acts ===
  addAct: (title?: string) => {
    const id = `act_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
    const newAct: StudioAct = { id, title: title || 'Новый акт', collapsed: false, pageIds: [] };
    set((s: any) => ({ acts: [...s.acts, newAct] }));
    get().saveToLocalStorage();
    return id;
  },

  updateAct: (id: string, updates: Partial<StudioAct>) => {
    set((s: any) => ({ acts: s.acts.map((a: StudioAct) => a.id === id ? { ...a, ...updates } : a) }));
    get().saveToLocalStorage();
  },

  deleteAct: (id: string, mode: 'delete-pages' | 'unassign') => {
    const state = get();
    const act = state.acts.find((a: StudioAct) => a.id === id);
    if (!act) return;
    if (mode === 'delete-pages') {
      const toDelete = new Set(act.pageIds);
      const newPages = state.pages.filter((p: StudioPage) => !toDelete.has(p.id));
      const newSelected = toDelete.has(state.selectedPageId ?? '') ? (newPages[0]?.id ?? null) : state.selectedPageId;
      set({ pages: newPages, unassignedPageIds: state.unassignedPageIds.filter((pid: string) => !toDelete.has(pid)), acts: state.acts.filter((a: StudioAct) => a.id !== id), selectedPageId: newSelected });
    } else {
      set((s: any) => ({ acts: s.acts.filter((a: StudioAct) => a.id !== id), unassignedPageIds: [...s.unassignedPageIds, ...act.pageIds] }));
    }
    get().saveToLocalStorage();
  },

  duplicateAct: (id: string) => {
    const state = get();
    const src = state.acts.find((a: StudioAct) => a.id === id);
    if (!src) return;
    const ts = Date.now().toString(36);
    const newActId = `act_${ts}_dup`;
    const pageIdMap: Record<string, string> = {};
    const newPages: StudioPage[] = src.pageIds.map((pid: string, i: number) => {
      const srcPage = state.pages.find((p: StudioPage) => p.id === pid);
      if (!srcPage) return null as any;
      const newPid = `${pid}_c${ts}_${i}`;
      pageIdMap[pid] = newPid;
      const cloned = JSON.parse(JSON.stringify(srcPage)) as StudioPage;
      cloned.id = newPid;
      cloned.title = { ru: srcPage.title.ru + ' (копия)', en: srcPage.title.en + ' (copy)' };
      cloned.buttons = cloned.buttons.map((b: StudioButton, bi: number) => ({ ...b, id: `btn_${ts}_${i}_${bi}` }));
      cloned.uiWidgets = (cloned.uiWidgets || []).map((w: UIWidget, wi: number) => ({ ...w, id: `uiw_${ts}_${i}_${wi}` }));
      return cloned;
    }).filter(Boolean);
    const newAct: StudioAct = { id: newActId, title: src.title + ' (копия)', color: src.color, collapsed: false, pageIds: src.pageIds.map((pid: string) => pageIdMap[pid]).filter(Boolean) };
    const srcActIdx = state.acts.findIndex((a: StudioAct) => a.id === id);
    const newActs = [...state.acts];
    newActs.splice(srcActIdx + 1, 0, newAct);
    set((s: any) => ({ pages: [...s.pages, ...newPages], acts: newActs }));
    get().saveToLocalStorage();
  },

  reorderActs: (fromIdx: number, toIdx: number) => {
    set((s: any) => {
      const newActs = [...s.acts];
      const [moved] = newActs.splice(fromIdx, 1);
      newActs.splice(toIdx, 0, moved);
      return { acts: newActs };
    });
    get().saveToLocalStorage();
  },

  movePageToAct: (pageId: string, targetActId: string | null, targetIndex: number) => {
    set((s: any) => {
      const newActs = s.acts.map((a: StudioAct) => ({ ...a, pageIds: a.pageIds.filter((pid: string) => pid !== pageId) }));
      const newUnassigned = s.unassignedPageIds.filter((pid: string) => pid !== pageId);
      if (targetActId) {
        return {
          acts: newActs.map((a: StudioAct) => {
            if (a.id !== targetActId) return a;
            const ids = [...a.pageIds];
            ids.splice(Math.min(targetIndex, ids.length), 0, pageId);
            return { ...a, pageIds: ids };
          }),
          unassignedPageIds: newUnassigned,
        };
      }
      const ids = [...newUnassigned];
      ids.splice(Math.min(targetIndex, ids.length), 0, pageId);
      return { acts: newActs, unassignedPageIds: ids };
    });
    get().saveToLocalStorage();
  },

  toggleActCollapsed: (id: string) => {
    set((s: any) => ({ acts: s.acts.map((a: StudioAct) => a.id === id ? { ...a, collapsed: !a.collapsed } : a) }));
  },
});
