export const createCanvasSlice = (set: any, get: any) => ({
  // === Guides ===
  addGuide: (axis: 'horizontal' | 'vertical', position: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(position * 10) / 10));
    set((s: any) => {
      const current = s.guides[axis];
      if (current.includes(clamped)) return s;
      return { guides: { ...s.guides, [axis]: [...current, clamped].sort((a: number, b: number) => a - b) } };
    });
    get().saveToLocalStorage();
  },

  removeGuide: (axis: 'horizontal' | 'vertical', position: number) => {
    set((s: any) => ({
      guides: { ...s.guides, [axis]: s.guides[axis].filter((p: number) => Math.abs(p - position) > 0.01) },
    }));
    get().saveToLocalStorage();
  },

  clearGuides: (axis?: 'horizontal' | 'vertical') => {
    set((s: any) => ({
      guides: axis ? { ...s.guides, [axis]: [] } : { horizontal: [], vertical: [] },
    }));
    get().saveToLocalStorage();
  },

  moveGuide: (axis: 'horizontal' | 'vertical', oldPosition: number, newPosition: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(newPosition * 10) / 10));
    set((s: any) => {
      const current = [...s.guides[axis]];
      const index = current.findIndex((p: number) => Math.abs(p - oldPosition) < 0.01);
      if (index === -1) return s;
      current[index] = clamped;
      return { guides: { ...s.guides, [axis]: current.sort((a: number, b: number) => a - b) } };
    });
    get().saveToLocalStorage();
  },

  setSnappingGuide: (snap: { vertical?: number; horizontal?: number } | null) => set({ snappingGuide: snap }),

  setSnapEnabled: (enabled: boolean) => {
    set((s: any) => enabled ? { snapEnabled: true } : { snapEnabled: false, snappingGuide: null });
  },

  setCanvasSize: (width: number, height: number) => {
    const w = Math.max(320, Math.min(3840, Math.round(width)));
    const h = Math.max(180, Math.min(2160, Math.round(height)));
    set({ canvasWidth: w, canvasHeight: h });
    get().saveToLocalStorage();
  },

  // === Canvas Undo/Redo ===
  saveCanvasSnapshot: () => {
    const state = get();
    const snapshot = state.pages.map((page: any) => ({
      id: page.id,
      buttons: page.buttons.map((btn: any) => ({ id: btn.id, layout: { ...btn.layout } })),
      uiWidgets: (page.uiWidgets || []).map((w: any) => ({ id: w.id, layout: { ...w.layout } })),
    }));
    set((s: any) => ({ canvasHistory: [...s.canvasHistory.slice(-49), snapshot], canvasFuture: [] }));
  },

  undoCanvas: () => {
    const state = get();
    if (state.canvasHistory.length === 0) return;
    const previous = state.canvasHistory[state.canvasHistory.length - 1];
    const current = state.pages.map((page: any) => ({
      id: page.id,
      buttons: page.buttons.map((btn: any) => ({ id: btn.id, layout: { ...btn.layout } })),
      uiWidgets: (page.uiWidgets || []).map((w: any) => ({ id: w.id, layout: { ...w.layout } })),
    }));
    set((s: any) => ({
      pages: s.pages.map((page: any) => {
        const snapPage = previous.find((p: any) => p.id === page.id);
        if (!snapPage) return page;
        return {
          ...page,
          buttons: page.buttons.map((btn: any) => {
            const snapBtn = snapPage.buttons.find((b: any) => b.id === btn.id);
            return snapBtn ? { ...btn, layout: { ...btn.layout, ...snapBtn.layout } } : btn;
          }),
          uiWidgets: (page.uiWidgets || []).map((w: any) => {
            const snapW = snapPage.uiWidgets?.find((sw: any) => sw.id === w.id);
            return snapW ? { ...w, layout: { ...w.layout, ...snapW.layout } } : w;
          }),
        };
      }),
      canvasHistory: s.canvasHistory.slice(0, -1),
      canvasFuture: [current, ...s.canvasFuture].slice(0, 50),
    }));
  },

  redoCanvas: () => {
    const state = get();
    if (state.canvasFuture.length === 0) return;
    const next = state.canvasFuture[0];
    const current = state.pages.map((page: any) => ({
      id: page.id,
      buttons: page.buttons.map((btn: any) => ({ id: btn.id, layout: { ...btn.layout } })),
      uiWidgets: (page.uiWidgets || []).map((w: any) => ({ id: w.id, layout: { ...w.layout } })),
    }));
    set((s: any) => ({
      pages: s.pages.map((page: any) => {
        const snapPage = next.find((p: any) => p.id === page.id);
        if (!snapPage) return page;
        return {
          ...page,
          buttons: page.buttons.map((btn: any) => {
            const snapBtn = snapPage.buttons.find((b: any) => b.id === btn.id);
            return snapBtn ? { ...btn, layout: { ...btn.layout, ...snapBtn.layout } } : btn;
          }),
          uiWidgets: (page.uiWidgets || []).map((w: any) => {
            const snapW = snapPage.uiWidgets?.find((sw: any) => sw.id === w.id);
            return snapW ? { ...w, layout: { ...w.layout, ...snapW.layout } } : w;
          }),
        };
      }),
      canvasHistory: [...s.canvasHistory, current].slice(-50),
      canvasFuture: s.canvasFuture.slice(1),
    }));
  },
});
