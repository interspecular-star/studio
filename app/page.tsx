"use client";

import { useState, useEffect } from 'react';
import { Toaster } from 'sonner';

import { useStudioStore, useCurrentPage } from '@/lib/store';
import EditorHeader from '@/components/editor/layout/EditorHeader';
import WorldPanel from '@/components/editor/world/WorldPanel';
import KonvaCanvas from '@/components/editor/KonvaCanvas';
import CanvasWithRulers from '@/components/editor/CanvasWithRulers';
import PageSection from '@/components/editor/PageSection';
import PlaytestStatePanel from '@/components/editor/PlaytestStatePanel';
import InventoryModal from '@/components/editor/InventoryModal';
import ItemRewardModal from '@/components/editor/ItemRewardModal';
import TopResourceBar from '@/components/editor/TopResourceBar';
import LeftSidebar from '@/components/editor/LeftSidebar';
import WidgetLibrary from '@/components/editor/WidgetLibrary';
import CombatOverlay from '@/components/editor/CombatOverlay';
import VillagePage from '@/components/game/VillagePage';
import ManagedPagePreview from '@/components/editor/ManagedPagePreview';

export default function SlayStudio() {
  const {
    pages,
    selectedPageId,
    selectedButtonId,
    selectButton,
    addButton,
    deleteButton,
    updatePage,
    updateButton,
    updateButtonLayout,
    copyButtonCoordinates,
    pasteButtonCoordinates,
    coordinateClipboard,
    guides,
    addGuide,
    removeGuide,
    clearGuides,
    canvasWidth,
    canvasHeight,
    variables,
    items,
    quests,
    playtestState,
    mode,
    exitPlaytest,
    openWidgetLibrary,
    rightSidebarCollapsed,
    toggleRightSidebar,
  } = useStudioStore();

  const currentPage = useCurrentPage();

  const [langTab, setLangTab] = useState<'ru' | 'en'>('ru');
  const [editingPageId, setEditingPageId] = useState('');
  const [rightTab, setRightTab] = useState<'page' | 'world'>('page');

  useEffect(() => {
    if (currentPage) {
      setEditingPageId(currentPage.id);
      setRightTab('page');
    }
  }, [currentPage?.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.key === 'w' || e.key === 'W') { e.preventDefault(); openWidgetLibrary(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [openWidgetLibrary]);

  const selectedButton = currentPage?.buttons.find((b) => b.id === selectedButtonId) ?? null;

  // Pages that render their own full-screen UI (including their own HUD)
  const MANAGED_PAGE_IDS = ['village', 'war_path'];

  const shouldShowTopResourceBar = (): boolean => {
    if (currentPage?.showTopResourceBar === false) return false;
    // Managed pages render their own HUD
    if (selectedPageId && MANAGED_PAGE_IDS.includes(selectedPageId)) return false;
    if (mode === 'editor') return true;
    if (mode !== 'playtest') return false;
    if (playtestState.isInventoryOpen) return false;
    const scene = currentPage?.sceneType;
    const dialogText = currentPage?.text?.ru?.trim() || '';
    const isPlaceholderText = dialogText.includes('Текст на русском') || dialogText.length < 10;
    const hasRealDialog = dialogText.length > 10 && !isPlaceholderText;
    const isDialogContext = scene === 'dialog' || scene === 'menu' || (hasRealDialog && scene !== 'exploration');
    if (isDialogContext) return false;
    return true;
  };

  const handleAddButton = () => { if (selectedPageId) addButton(selectedPageId); };
  const handleDeleteButton = (buttonId: string) => { if (selectedPageId) deleteButton(selectedPageId, buttonId); };
  const updateCurrentPage = (updates: any) => { if (selectedPageId) updatePage(selectedPageId, updates); };
  const updateSelectedButton = (updates: any) => { if (selectedPageId && selectedButtonId) updateButton(selectedPageId, selectedButtonId, updates); };
  const updateSelectedButtonLayout = (layoutUpdates: Partial<any>) => { if (selectedPageId && selectedButtonId) updateButtonLayout(selectedPageId, selectedButtonId, layoutUpdates); };
  const handleCopyCoordinates = () => { if (selectedPageId && selectedButtonId) copyButtonCoordinates(selectedPageId, selectedButtonId); };
  const handlePasteCoordinates = () => { if (selectedPageId && selectedButtonId) pasteButtonCoordinates(selectedPageId, selectedButtonId); };
  const renamePage = useStudioStore(s => s.renamePage);

  return (
    <div className="studio-container flex h-screen flex-col overflow-hidden">
      <Toaster position="top-center" richColors closeButton />

      <EditorHeader />

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Pages & Acts */}
        <LeftSidebar />

        {/* CENTER: Canvas */}
        <div className="flex flex-1 flex-col">
          {/* Playtest Mode Banner */}
          {mode === 'playtest' && (
            <div className="flex items-center justify-between bg-[#C25D3A] px-4 py-2 text-sm text-white shadow-inner">
              <span className="font-semibold">▶ PLAYTEST РЕЖИМ</span>
              <button
                onClick={exitPlaytest}
                className="rounded-md bg-white/20 px-3 py-1 text-sm font-medium hover:bg-white/30 active:bg-white/40 transition-colors"
              >Выйти в редактор</button>
            </div>
          )}

          {/* Canvas sub-header */}
          <div className="flex items-center justify-between border-b border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] px-4 py-2 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-medium">{currentPage?.title.ru}</span>
              <span className="rounded bg-[var(--studio-bg-panel)] px-2 py-0.5 font-mono text-[var(--studio-text-muted)]">
                {selectedPageId}
              </span>
              {mode !== 'playtest' && (
                <button
                  onClick={openWidgetLibrary}
                  title="Библиотека виджетов (W)"
                  className="flex items-center gap-1 rounded bg-[var(--studio-accent)] px-2 py-0.5 font-semibold text-[#1C1814] hover:brightness-110 transition-all"
                >
                  + Виджет
                </button>
              )}
            </div>
            <div />
          </div>

          <div className="flex flex-1 items-center justify-center bg-[#161310] p-6 overflow-auto relative">
            {mode === 'playtest' ? (
              <div
                className="relative rounded-2xl border border-[var(--studio-border-strong)] bg-black overflow-hidden shadow-2xl"
                style={{ width: canvasWidth, height: canvasHeight }}
              >
                {shouldShowTopResourceBar() && (
                  <div className="absolute top-0 left-0 right-0 z-30 pointer-events-auto border-b border-[var(--studio-border)]/60">
                    <TopResourceBar currentPage={currentPage} variables={variables} playtestState={playtestState} />
                  </div>
                )}
                <KonvaCanvas width={canvasWidth} height={canvasHeight} />
                {/* Managed game screens — full-screen overlays */}
                {selectedPageId === 'village' && <VillagePage />}
                {playtestState.isInventoryOpen && <InventoryModal onClose={() => {}} />}
                {playtestState.itemRewardModal && <ItemRewardModal />}
                <CombatOverlay currentPageId={selectedPageId} />
              </div>
            ) : (
              <CanvasWithRulers width={canvasWidth} height={canvasHeight}>
                <>
                  <KonvaCanvas width={canvasWidth} height={canvasHeight} />
                  {shouldShowTopResourceBar() && (
                    <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none border-b border-[var(--studio-border)]/60 opacity-80">
                      <TopResourceBar currentPage={currentPage} variables={variables} playtestState={playtestState} />
                    </div>
                  )}
                  {/* Editor preview for managed pages */}
                  {selectedPageId === 'village' && (
                    <ManagedPagePreview pageId="village" label="Площадь Табуреткино" />
                  )}
                </>
              </CanvasWithRulers>
            )}

            <WidgetLibrary />
          </div>
        </div>

        {/* RIGHT: Inspector */}
        <div className={`panel flex flex-shrink-0 flex-col border-l transition-all duration-200 overflow-hidden ${rightSidebarCollapsed ? 'w-8' : 'w-80'}`}>
          {rightSidebarCollapsed ? (
            <div className="flex flex-col h-full items-center pt-3 border-b border-[var(--studio-border)]">
              <button
                onClick={toggleRightSidebar}
                className="-rotate-90 text-[var(--studio-text-muted)] hover:text-[var(--studio-text-primary)] p-1 text-xs tracking-widest"
                title="Развернуть правую панель"
              >
                {mode === 'playtest' ? 'СОСТОЯНИЕ' : 'СВОЙСТВА'}
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-[var(--studio-border)] px-4 py-3">
                <span className="text-sm font-medium text-[var(--studio-text-secondary)]">
                  {mode === 'playtest' ? 'СОСТОЯНИЕ' : 'СВОЙСТВА'}
                </span>
                <button
                  onClick={toggleRightSidebar}
                  className="text-[var(--studio-text-muted)] hover:text-[var(--studio-text-primary)] p-1 -mr-1"
                  title="Свернуть панель"
                >▶</button>
              </div>

              {mode === 'playtest' ? (
                <PlaytestStatePanel />
              ) : (
                <>
                  <div className="flex shrink-0 border-b border-[var(--studio-border)]">
                    <button
                      onClick={() => setRightTab('page')}
                      className={`flex-1 py-2 text-xs font-medium transition-colors ${rightTab === 'page' ? '-mb-px border-b-2 border-[var(--studio-accent)] text-[var(--studio-accent)]' : 'text-[var(--studio-text-muted)] hover:text-[var(--studio-text-secondary)]'}`}
                    >СТРАНИЦА</button>
                    <button
                      onClick={() => setRightTab('world')}
                      className={`flex-1 py-2 text-xs font-medium transition-colors ${rightTab === 'world' ? '-mb-px border-b-2 border-[var(--studio-accent)] text-[var(--studio-accent)]' : 'text-[var(--studio-text-muted)] hover:text-[var(--studio-text-secondary)]'}`}
                    >МИР</button>
                  </div>

                  {rightTab === 'world' && <WorldPanel />}

                  {rightTab === 'page' && (
                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                      <PageSection
                        noCard
                        currentPage={currentPage}
                        renamePage={renamePage}
                        updateCurrentPage={updateCurrentPage}
                        editingPageId={editingPageId}
                        setEditingPageId={setEditingPageId}
                        langTab={langTab}
                        setLangTab={setLangTab}
                        handleAddButton={handleAddButton}
                        selectedButtonId={selectedButtonId}
                        selectButton={selectButton}
                        handleDeleteButton={handleDeleteButton}
                        selectedButton={selectedButton}
                        updateSelectedButton={updateSelectedButton}
                        updateSelectedButtonLayout={updateSelectedButtonLayout}
                        handleCopyCoordinates={handleCopyCoordinates}
                        handlePasteCoordinates={handlePasteCoordinates}
                        coordinateClipboard={coordinateClipboard}
                        variables={variables}
                        items={items}
                        quests={quests}
                      />

                      {(guides.horizontal.length > 0 || guides.vertical.length > 0) && (
                        <div className="border-t border-[var(--studio-border)] mt-6 pt-5">
                          <div className="mb-3 flex items-center justify-between">
                            <span className="text-sm font-medium text-[var(--studio-text-secondary)]">НАПРАВЛЯЮЩИЕ</span>
                            <div className="flex gap-1">
                              {[25, 50, 75].map(v => (
                                <button key={v} onClick={() => addGuide('horizontal', v)} className="px-2 py-0.5 text-[10px] rounded bg-[var(--studio-bg-elevated)] hover:bg-[var(--studio-border)] border border-[var(--studio-border)]">{v}%</button>
                              ))}
                            </div>
                          </div>

                          <div className="mb-4">
                            <div className="text-[10px] text-[var(--studio-text-muted)] mb-1.5">Горизонтальные (влияют на Y)</div>
                            {guides.horizontal.length === 0 && <div className="text-[10px] text-[var(--studio-text-muted)] italic py-1">Нет направляющих</div>}
                            {guides.horizontal.map((pos, idx) => (
                              <div key={idx} className="flex items-center gap-2 mb-1.5">
                                <input
                                  type="number" step="0.5" min="0" max="100" value={pos}
                                  onChange={(e) => { const nv = parseFloat(e.target.value); if (!isNaN(nv)) { removeGuide('horizontal', pos); addGuide('horizontal', Math.max(0, Math.min(100, nv))); } }}
                                  className="w-16 rounded border border-[var(--studio-border)] bg-[#1C1814] px-2 py-1 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[var(--studio-accent)]"
                                />
                                <span className="text-xs text-[var(--studio-text-muted)]">%</span>
                                <button onClick={() => removeGuide('horizontal', pos)} className="ml-auto text-[var(--studio-danger)] hover:text-red-400 p-1" title="Удалить">✕</button>
                              </div>
                            ))}
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="text-[10px] text-[var(--studio-text-muted)]">Вертикальные (влияют на X)</div>
                              <div className="flex gap-1">
                                {[25, 50, 75].map(v => (
                                  <button key={v} onClick={() => addGuide('vertical', v)} className="px-1.5 py-0.5 text-[10px] rounded bg-[var(--studio-bg-elevated)] hover:bg-[var(--studio-border)] border border-[var(--studio-border)]">{v}</button>
                                ))}
                              </div>
                            </div>
                            {guides.vertical.length === 0 && <div className="text-[10px] text-[var(--studio-text-muted)] italic py-1">Нет направляющих</div>}
                            {guides.vertical.map((pos, idx) => (
                              <div key={idx} className="flex items-center gap-2 mb-1.5">
                                <input
                                  type="number" step="0.5" min="0" max="100" value={pos}
                                  onChange={(e) => { const nv = parseFloat(e.target.value); if (!isNaN(nv)) { removeGuide('vertical', pos); addGuide('vertical', Math.max(0, Math.min(100, nv))); } }}
                                  className="w-16 rounded border border-[var(--studio-border)] bg-[#1C1814] px-2 py-1 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[var(--studio-accent)]"
                                />
                                <span className="text-xs text-[var(--studio-text-muted)]">%</span>
                                <button onClick={() => removeGuide('vertical', pos)} className="ml-auto text-[var(--studio-danger)] hover:text-red-400 p-1" title="Удалить">✕</button>
                              </div>
                            ))}
                          </div>

                          <button
                            onClick={() => clearGuides()}
                            className="mt-3 w-full text-[10px] text-[var(--studio-text-muted)] hover:text-[var(--studio-danger)] border border-[var(--studio-border)] rounded py-1 hover:border-[var(--studio-danger)]/50"
                          >
                            Удалить все направляющие
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
