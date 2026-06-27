export const createUISlice = (set: any, _get: any) => ({
  toggleLeftSidebar: () => set((s: any) => ({ leftSidebarCollapsed: !s.leftSidebarCollapsed })),
  toggleRightSidebar: () => set((s: any) => ({ rightSidebarCollapsed: !s.rightSidebarCollapsed })),
  setSidebarsForPlaytest: (collapsed: boolean) => set({ leftSidebarCollapsed: collapsed, rightSidebarCollapsed: collapsed }),
  toggleLeftSidebarLocked: () => set((s: any) => ({ leftSidebarLocked: !s.leftSidebarLocked })),

  openWidgetLibrary: () => set({ isWidgetLibraryOpen: true }),
  closeWidgetLibrary: () => set({ isWidgetLibraryOpen: false }),

  setEditorDialoguePreview: (idx: number | null) => set({ editorDialoguePreviewLine: idx }),

  togglePlayerStatsCollapsed: () => set((s: any) => ({ playerStatsCollapsed: !s.playerStatsCollapsed })),
  toggleResourcesCollapsed: () => set((s: any) => ({ resourcesCollapsed: !s.resourcesCollapsed })),
  toggleInventoryCollapsed: () => set((s: any) => ({ inventoryCollapsed: !s.inventoryCollapsed })),
  toggleVariablesCollapsed: () => set((s: any) => ({ variablesCollapsed: !s.variablesCollapsed })),
  toggleItemsCollapsed: () => set((s: any) => ({ itemsCollapsed: !s.itemsCollapsed })),
  toggleBackgroundsCollapsed: () => set((s: any) => ({ backgroundsCollapsed: !s.backgroundsCollapsed })),
  toggleQuestsCollapsed: () => set((s: any) => ({ questsCollapsed: !s.questsCollapsed })),

  toggleItemCollapsed: (itemId: string) => set((s: any) => {
    const isExpanded = s.collapsedItemIds.includes(itemId);
    return {
      collapsedItemIds: isExpanded
        ? s.collapsedItemIds.filter((id: string) => id !== itemId)
        : [...s.collapsedItemIds, itemId],
    };
  }),
});
