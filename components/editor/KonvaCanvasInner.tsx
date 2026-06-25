'use client';

import { useRef, useState, useEffect, useLayoutEffect } from 'react';
import { Stage, Layer, Rect, Group, Image as KonvaImage, Transformer } from 'react-konva';
import type { Stage as StageType } from 'konva/lib/Stage';
import Konva from 'konva';

import { useStudioStore, type UIWidget, DIALOGUE_THEME_PRESETS } from '@/lib/store';
import { getSnappedButtonPosition } from '@/lib/snapping';
import { evaluateCondition } from '@/lib/conditions';
import { advanceTypewriter } from '@/lib/richText';
import WidgetContent from './canvas/WidgetContent';
import ButtonRenderer from './canvas/ButtonRenderer';


interface KonvaCanvasInnerProps {
  width?: number;
  height?: number;
}

export default function KonvaCanvasInner({ width = 1280, height = 720 }: KonvaCanvasInnerProps) {
  const { 
    pages, 
    selectedPageId, 
    selectedButtonId, 
    selectButton, 
    moveButton, 
    selectedWidgetId,
    selectWidget,
    updateUIWidget,
    moveUIWidget,
    backgrounds,
    guides,
    snapEnabled,
    mode,
    playtestState,
    executeAction,
    speakers,
    advanceDialogueLine,
    dialogueTheme,
    copySelectedToWidgetClipboard,
    pasteFromWidgetClipboard,
    duplicateSelected,
    deleteUIWidget,
    deleteButton,
    undoCanvas,
    redoCanvas,
  } = useStudioStore();
  const theme = dialogueTheme || DIALOGUE_THEME_PRESETS.darkFantasy;

  const [customBgImage, setCustomBgImage] = useState<HTMLImageElement | null>(null);

  // Loaded custom images for buttons (image support added for Dialogue UI Phase 1) and future widgets
  const [buttonImages, setButtonImages] = useState<Record<string, HTMLImageElement>>({});
  const [widgetImages, setWidgetImages] = useState<Record<string, HTMLImageElement>>({});

  const currentPage = pages.find((p) => p.id === selectedPageId);
  if (!currentPage) {
    return (
      <div className="flex h-full w-full items-center justify-center text-[var(--studio-text-muted)]">
        Выберите страницу
      </div>
    );
  }

  const bgDef = backgrounds.find((b) => b.id === currentPage.background);
  const bgUrl = bgDef?.url;

  // Load custom image background when URL changes
  useEffect(() => {
    if (bgUrl) {
      let src = bgUrl.trim().replace(/\\/g, '/');
      // Ensure relative paths from public root start with /
      if (src && !src.startsWith('http') && !src.startsWith('/')) {
        src = '/' + src;
      }
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.src = src;
      img.onload = () => setCustomBgImage(img);
      img.onerror = () => {
        console.warn('Background image load failed. Expected public path like /bg/intro_forest.png. Tried:', src);
        setCustomBgImage(null);
      };
    } else {
      setCustomBgImage(null);
    }
  }, [bgUrl]);

  // Load button images (when button.image changes)
  useEffect(() => {
    if (!currentPage) return;
    const needed = new Set<string>();
    currentPage.buttons.forEach((b) => {
      if (b.image) {
        let src = b.image.trim().replace(/\\/g, '/');
        if (src && !src.startsWith('http') && !src.startsWith('/')) src = '/' + src;
        needed.add(src);
      }
    });
    needed.forEach((src) => {
      if (buttonImages[src]) return;
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.src = src;
      img.onload = () => setButtonImages((prev) => ({ ...prev, [src]: img }));
      img.onerror = () => console.warn('Button image failed to load:', src);
    });
  }, [currentPage?.buttons]);

  // Load widget asset images (portraits, button skins for choice etc) + variants
  useEffect(() => {
    const assets = useStudioStore.getState().uiAssets || [];
    const speakersState = useStudioStore.getState().speakers || [];
    (currentPage?.uiWidgets || []).forEach((w: any) => {
      // Resolve asset: explicit widget.assetId OR speaker.portraitAssetId fallback
      const spk = (!w.assetId && w.data?.speakerId) ? speakersState.find((s: any) => s.id === w.data.speakerId) : null;
      const assetId = w.assetId || spk?.portraitAssetId;
      if (!assetId) return;
      const asset = assets.find((a: any) => a.id === assetId);
      if (!asset?.url) return;

      // Preload base url + all variant urls so they're ready for any variant switch
      const urlsToLoad = [asset.url, ...Object.values(asset.variants || {}) as string[]];
      urlsToLoad.forEach((url) => {
        if (!url) return;
        let src = (url as string).trim().replace(/\\/g, '/');
        if (src && !src.startsWith('http') && !src.startsWith('/')) src = '/' + src;
        if (widgetImages[src]) return;
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.src = src;
        img.onload = () => setWidgetImages(prev => ({ ...prev, [src]: img }));
        img.onerror = () => console.warn('Widget asset image load failed:', src);
      });
    });
  }, [currentPage?.uiWidgets, (useStudioStore.getState().uiAssets || []).length, (useStudioStore.getState().speakers || []).length]);

  // Simple animation for intensity bars (lerp towards target)
  useEffect(() => {
    const intensityWidgets = (currentPage?.uiWidgets || []).filter((w: any) => w.type === 'intensityBar' && w.data?.valueVar);
    if (intensityWidgets.length === 0) return;

    const interval = setInterval(() => {
      setAnimValues(prev => {
        const next = { ...prev };
        intensityWidgets.forEach((w: any) => {
          const varId = w.data.valueVar;
          const target = Number(playtestState.variableValues[varId] ?? 50);
          const current = Number(prev[w.id] ?? target);
          const diff = target - current;
          next[w.id] = Math.abs(diff) < 1 ? target : current + diff * 0.2;
        });
        return next;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [currentPage?.uiWidgets, playtestState.variableValues]);

  // Detect portrait variant changes in playtest for swap animation
  useEffect(() => {
    if (!isPlaytest) return;
    (currentPage?.uiWidgets || []).forEach((w: any) => {
      if (w.type !== 'portrait') return;
      const override = playtestState.widgetOverrides[w.id] || {};
      const currentVariant = (override.data?.variant || w.data?.variant || 'default') as string;
      const prev = prevPortraitVariantsRef.current[w.id];
      if (prev && prev !== currentVariant) {
        setPortraitSwapAnim(prevAnim => ({ ...prevAnim, [w.id]: Date.now() }));
      }
      prevPortraitVariantsRef.current[w.id] = currentVariant;
    });
  }, [playtestState.widgetOverrides, currentPage?.uiWidgets, mode]);

  const stageRef = useRef<StageType>(null);
  const transformerRef = useRef<any>(null);
  const widgetNodeRefs = useRef<Map<string, any>>(new Map());
  const buttonNodeRefs = useRef<Map<string, any>>(new Map());

  // Interactive states for buttons (hover / pressed)
  const [hoveredButtonId, setHoveredButtonId] = useState<string | null>(null);
  const [pressedButtonId, setPressedButtonId] = useState<string | null>(null);

  // For widgets (Phase 2 drag support)
  const [hoveredWidgetId, setHoveredWidgetId] = useState<string | null>(null);
  const [pressedWidgetId, setPressedWidgetId] = useState<string | null>(null);
  const [hoveredItemKey, setHoveredItemKey] = useState<string | null>(null);

  // Animated values for some widgets (e.g. intensity bar)
  const [animValues, setAnimValues] = useState<Record<string, number>>({});

  // For portrait swap animation
  const prevPortraitVariantsRef = useRef<Record<string, string>>({});
  const [portraitSwapAnim, setPortraitSwapAnim] = useState<Record<string, number>>({}); // widgetId -> timestamp of swap

  // Widget IDs that have already played their appear animation (bounce for choiceButton)
  const seenWidgetIdsRef = useRef<Set<string>>(new Set());

  // Typewriter progress for dialogueBox in playtest (char count per widget)
  const [typewriterProgress, setTypewriterProgress] = useState<Record<string, number>>({});
  // Pause timestamps: widgetId -> Date.now() value when the pause ends (set when [pause] tag is encountered)
  const typewriterPausedRef = useRef<Record<string, number>>({});

  // Mouse for live parallax in playtest
  const [mousePos, setMousePos] = useState({ x: width / 2, y: height / 2 });

  const isPlaytest = mode === 'playtest';
  const bgSettings = bgDef?.settings || { scale: 1, offsetX: 0, offsetY: 0, brightness: 1, opacity: 1, fitMode: 'cover', parallax: { enabled: false, speedX: 0.5, speedY: 0.3, reverse: false } };

  // Page fade-in: when page changes in playtest, fade all widget groups 0 → 1
  useLayoutEffect(() => {
    if (!isPlaytest) return;
    seenWidgetIdsRef.current.clear(); // reset bounce seen-list so choiceButtons re-animate
    const t = setTimeout(() => {
      widgetNodeRefs.current.forEach((node) => {
        node.opacity(0);
        node.to({ opacity: 1, duration: 0.25, easing: Konva.Easings.EaseOut });
      });
    }, 16); // one frame so refs are populated after render
    return () => clearTimeout(t);
  }, [currentPage?.id, isPlaytest]);

  // Keyboard shortcuts (editor only): Ctrl+C/V/D, Ctrl+Z/Y, Delete
  useEffect(() => {
    if (isPlaytest) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl) {
        if (e.key === 'c') {
          copySelectedToWidgetClipboard();
        } else if (e.key === 'v') {
          pasteFromWidgetClipboard(true);
        } else if (e.key === 'd') {
          e.preventDefault();
          duplicateSelected();
        } else if (e.key === 'z') {
          e.preventDefault();
          undoCanvas();
        } else if (e.key === 'y') {
          e.preventDefault();
          redoCanvas();
        }
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const state = useStudioStore.getState();
        const pageId = state.selectedPageId;
        if (!pageId) return;
        if (state.selectedWidgetId) {
          deleteUIWidget(pageId, state.selectedWidgetId);
        } else if (state.selectedButtonId) {
          deleteButton(pageId, state.selectedButtonId);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPlaytest, copySelectedToWidgetClipboard, pasteFromWidgetClipboard, duplicateSelected, deleteUIWidget, deleteButton, undoCanvas, redoCanvas]);

  // Typewriter effect for dialogueBox text in playtest
  useEffect(() => {
    if (!isPlaytest) {
      setTypewriterProgress({});
      typewriterPausedRef.current = {};
      return;
    }
    const dialogueWidgets = (currentPage?.uiWidgets || []).filter((w: any) => w.type === 'dialogueBox');
    if (dialogueWidgets.length === 0) return;

    // Current dialogue line text (if dialogue started via advanceDialogue)
    const twDlIdx = playtestState.dialogueLineIndex ?? 0;
    const twDlStarted = playtestState.dialogueStarted ?? false;
    const twDlLine = twDlStarted && currentPage?.dialogueLines?.length
      ? currentPage.dialogueLines[Math.min(twDlIdx, currentPage.dialogueLines.length - 1)]
      : null;

    // Reset progress (and pause) when text length shrinks (text was changed)
    const resetNeeded: string[] = [];
    dialogueWidgets.forEach((w: any) => {
      const overrideT = playtestState.widgetOverrides[w.id]?.text ?? null;
      const textSource = w.data?.textSource || 'page';
      const fullText = overrideT?.ru || twDlLine?.text?.ru || (textSource === 'custom' && w.text?.ru ? w.text.ru : (currentPage?.text?.ru || ''));
      const currentProg = typewriterProgress[w.id] || 0;
      if (currentProg > fullText.length) {
        resetNeeded.push(w.id);
      }
    });
    if (resetNeeded.length > 0) {
      setTypewriterProgress(prev => {
        const next = { ...prev };
        resetNeeded.forEach(id => {
          next[id] = 0;
          typewriterPausedRef.current[id] = 0;
        });
        return next;
      });
    }

    const PAUSE_TAG = '[pause]';
    const PAUSE_TAG_LEN = PAUSE_TAG.length;
    const PAUSE_DURATION_MS = 450;

    const interval = setInterval(() => {
      const now = Date.now();
      setTypewriterProgress(prev => {
        const next = { ...prev };
        let changed = false;
        dialogueWidgets.forEach((w: any) => {
          // Skip widget if currently in a [pause] hold
          const resumeAt = typewriterPausedRef.current[w.id] || 0;
          if (now < resumeAt) return;

          const overrideT = playtestState.widgetOverrides[w.id]?.text ?? null;
          const textSource = w.data?.textSource || 'page';
          const fullText = overrideT?.ru || twDlLine?.text?.ru || (textSource === 'custom' && w.text?.ru ? w.text.ru : (currentPage?.text?.ru || ''));
          const current = prev[w.id] || 0;
          if (current < fullText.length) {
            const remaining = fullText.substring(current);

            // [pause] tag: skip past it and hold for PAUSE_DURATION_MS
            if (remaining.startsWith(PAUSE_TAG)) {
              next[w.id] = current + PAUSE_TAG_LEN;
              typewriterPausedRef.current[w.id] = now + PAUSE_DURATION_MS;
              changed = true;
              return;
            }

            // Speed: base 3 visible chars/tick, slower on ellipsis, faster at high intensity
            let speed = 3;
            if (remaining.startsWith('...')) speed = 1;
            const intW = (currentPage?.uiWidgets || []).find((ww: any) => ww.type === 'intensityBar');
            if (intW?.data?.valueVar) {
              const live = playtestState.variableValues[intW.data.valueVar];
              const intensity = typeof live === 'number' ? live : 0;
              if (intensity > 70) speed += 2;
            }
            // advanceTypewriter skips markup chars so speed counts only visible chars
            next[w.id] = advanceTypewriter(fullText, current, speed);
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 60);
    return () => clearInterval(interval);
  }, [isPlaytest, currentPage?.uiWidgets, currentPage?.text?.ru, currentPage?.id, playtestState]);

  // Reset typewriter to 0 whenever dialogue line index advances (advanceDialogue action)
  useEffect(() => {
    if (!isPlaytest) return;
    const dialogueWidgets = (currentPage?.uiWidgets || []).filter((w: any) => w.type === 'dialogueBox');
    if (!dialogueWidgets.length) return;
    setTypewriterProgress(prev => {
      const next = { ...prev };
      dialogueWidgets.forEach((w: any) => { next[w.id] = 0; });
      return next;
    });
    typewriterPausedRef.current = {};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playtestState.dialogueLineIndex, playtestState.dialogueStarted]);

  const pctToPx = (pct: number, total: number) => (pct / 100) * total;

  // === Dialogue UI Widgets: use stored uiWidgets or auto-generate defaults for legacy pages ===
  // This gives immediate editable positions for dialogue elements (Phase 1)
  const getDefaultDialogueWidgets = (): UIWidget[] => {
    if (!currentPage || !currentPage.speaker || currentPage.speaker === 'none') return [];
    // Approximate classic positions (scaled to % for 1280x720)
    return [
      {
        id: 'auto_dialogue_box',
        type: 'dialogueBox',
        layout: { x: 16, y: 78, width: 68, height: 12, z: 20 },
        style: 'default',
      },
      {
        id: 'auto_speaker_pill',
        type: 'textLabel', // use textLabel for speaker name pill (simpler for Phase 1)
        layout: { x: 42, y: 58, width: 16, height: 3, z: 15 },
        style: 'default',
        data: { speakerId: currentPage.speaker },
      },
    ];
  };

  const pageWidgets: UIWidget[] = Array.isArray(currentPage?.uiWidgets) && currentPage.uiWidgets.length > 0
    ? currentPage.uiWidgets
    : getDefaultDialogueWidgets();

  // In playtest, apply temporary overrides from playtestState (dynamics without mutating base project)
  const effectiveWidgets = isPlaytest
    ? pageWidgets.map((w: UIWidget) => {
        const override = playtestState.widgetOverrides[w.id] || (w.type === 'portrait' ? playtestState.widgetOverrides['auto-portrait'] : null);
        if (!override) return w;
        return {
          ...w,
          ...override,
          data: { ...(w.data || {}), ...(override.data || {}) },
          layout: { ...(w.layout || {}), ...(override.layout || {}) },
        } as UIWidget;
      })
    : pageWidgets;

  // Filter widgets by visibleWhen (same logic as buttons). In editor always show for authoring.
  const visibleWidgets = effectiveWidgets.filter((widget: UIWidget) => {
    if (!widget.visibleWhen) return true;
    if (!isPlaytest) return true; // always visible in editor

    const getVarValue = (variableId: string) => {
      const live = playtestState.variableValues[variableId];
      if (live !== undefined) return live;
      const v = useStudioStore.getState().variables.find((vv: any) => vv.id === variableId);
      return v?.defaultValue;
    };

    return evaluateCondition(
      widget.visibleWhen,
      useStudioStore.getState().variables,
      useStudioStore.getState().items,
      getVarValue
    );
  });

  const handleButtonDragEnd = (buttonId: string, e: any) => {
    // Save snapshot before applying the change (only for canvas drags)
    useStudioStore.getState().saveCanvasSnapshot();

    const node = e.target;
    const currentXPercent = (node.x() / width) * 100;
    const currentYPercent = (node.y() / height) * 100;

    // Read fresh state for page/button data (these can change)
    const freshState = useStudioStore.getState();
    const page = freshState.pages.find(p => p.id === selectedPageId);
    const btn = page?.buttons.find(b => b.id === buttonId);
    const currentGuides = freshState.guides;

    if (!btn || !page) {
      moveButton(selectedPageId!, buttonId, currentXPercent, currentYPercent);
      return;
    }

    if (snapEnabled) {
      const snap = getSnappedButtonPosition(
        {
          x: currentXPercent,
          y: currentYPercent,
          width: btn.layout.width,
          height: btn.layout.height,
        },
        currentGuides,
        2.0
      );
      moveButton(page.id, buttonId, snap.x, snap.y);
    } else {
      moveButton(page.id, buttonId, currentXPercent, currentYPercent);
    }

    // Clear visual snapping highlight
    useStudioStore.getState().setSnappingGuide(null);
  };

  const handleWidgetDragEnd = (widgetId: string, e: any) => {
    useStudioStore.getState().saveCanvasSnapshot?.(); // if exists

    const node = e.target;
    const currentXPercent = (node.x() / width) * 100;
    const currentYPercent = (node.y() / height) * 100;

    const freshState = useStudioStore.getState();
    const page = freshState.pages.find(p => p.id === selectedPageId);
    const widget = page?.uiWidgets?.find((w: any) => w.id === widgetId);

    if (!widget || !page) {
      updateUIWidget(selectedPageId!, widgetId, { layout: { ...widget?.layout, x: currentXPercent, y: currentYPercent } } as any);
      return;
    }

    if (snapEnabled) {
      const snap = getSnappedButtonPosition(
        {
          x: currentXPercent,
          y: currentYPercent,
          width: widget.layout.width,
          height: widget.layout.height,
        },
        freshState.guides,
        2.0
      );
      moveUIWidget(page.id, widgetId, snap.x, snap.y);
    } else {
      moveUIWidget(page.id, widgetId, currentXPercent, currentYPercent);
    }

    useStudioStore.getState().setSnappingGuide(null);
  };

  // Attach Konva Transformer to the selected widget or button node
  useEffect(() => {
    if (!transformerRef.current) return;
    if (isPlaytest) {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
      return;
    }
    const nodes: any[] = [];
    if (selectedWidgetId) {
      const n = widgetNodeRefs.current.get(selectedWidgetId);
      if (n) nodes.push(n);
    }
    if (selectedButtonId) {
      const n = buttonNodeRefs.current.get(selectedButtonId);
      if (n) nodes.push(n);
    }
    transformerRef.current.nodes(nodes);
    transformerRef.current.getLayer()?.batchDraw();
  }, [selectedWidgetId, selectedButtonId, isPlaytest]);

  const handleButtonClick = (buttonId: string, e: any) => {
    e.cancelBubble = true;
    selectButton(buttonId);
  };

  const handleStageClick = (e: any) => {
    if (e.target === e.target.getStage()) {
      selectButton(null);
      selectWidget(null);
    }
  };

  const getSpeakerName = (id: string) =>
    speakers.find((s) => s.id === id)?.displayName.ru || id || '';

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--studio-border-strong)] shadow-2xl">
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onMouseMove={(e) => {
          if (isPlaytest) {
            const pos = e.target.getStage()?.getPointerPosition();
            if (pos) setMousePos({ x: pos.x, y: pos.y });
          }
        }}
        style={{ background: '#111' }}
      >
        <Layer>
          {/* Custom image or legacy gradient background */}
          {customBgImage && bgDef ? (
            (() => {
              const imgW = customBgImage.width || 1;
              const imgH = customBgImage.height || 1;
              const userScale = bgSettings.scale || 1;
              const fitMode = bgSettings.fitMode || 'cover';

              let scaleX = userScale;
              let scaleY = userScale;

              if (fitMode === 'cover') {
                const base = Math.max(width / imgW, height / imgH);
                scaleX = base * userScale;
                scaleY = scaleX;
              } else if (fitMode === 'contain') {
                const base = Math.min(width / imgW, height / imgH);
                scaleX = base * userScale;
                scaleY = scaleX;
              } else if (fitMode === 'fill') {
                scaleX = (width / imgW) * userScale;
                scaleY = (height / imgH) * userScale;
              } // else manual: just userScale on natural size

              const drawW = imgW * scaleX;
              const drawH = imgH * scaleY;

              // Live parallax offset in playtest
              const parallaxX = isPlaytest
                ? (mousePos.x - width / 2) * (bgSettings.parallax.speedX / 50) * (bgSettings.parallax.reverse ? -1 : 1)
                : 0;
              const parallaxY = isPlaytest
                ? (mousePos.y - height / 2) * (bgSettings.parallax.speedY / 50) * (bgSettings.parallax.reverse ? -1 : 1)
                : 0;

              // Center + user offset + parallax
              const drawX = (width - drawW) / 2 + bgSettings.offsetX + parallaxX;
              const drawY = (height - drawH) / 2 + bgSettings.offsetY + parallaxY;

              return (
                <KonvaImage
                  image={customBgImage}
                  x={drawX}
                  y={drawY}
                  scaleX={scaleX}
                  scaleY={scaleY}
                  opacity={bgSettings.opacity}
                />
              );
            })()
          ) : (
            /* Default dark background (no custom bg set) */
            <Rect
              x={0}
              y={0}
              width={width}
              height={height}
              fill="#1a140f"
            />
          )}

          {/* Brightness / dimming overlay (applies to both image and gradient) */}
          {(() => {
            const b = bgSettings.brightness ?? 1;
            if (b === 1) return null;
            // Darken when <1, brighten when >1
            const alpha = b < 1 ? (1 - b) * 0.85 : Math.min((b - 1) * 0.55, 0.65);
            const color = b < 1 ? '#000000' : '#ffffff';
            return (
              <Rect
                x={0}
                y={0}
                width={width}
                height={height}
                fill={color}
                opacity={alpha}
              />
            );
          })()}

          {/* Subtle vignette for depth (always, can be adjusted later via bg settings) */}
          <Rect x={0} y={0} width={width} height={height} fill="rgba(0,0,0,0.28)" />

          {/* Location label removed from workflow view as per request (was cluttering top-left in both dialog and game modes) */}

          {/* === DIALOGUE UI WIDGETS (Phase 2: draggable) ===
              Draggable + selectable like buttons. Uses snapping.
              Positions update live via moveUIWidget / update.
          */}
          {visibleWidgets
            .slice()
            .sort((a, b) => ((a.layout.z ?? 0) - (b.layout.z ?? 0)) || 0)
            .map((widget) => {
              const wX = pctToPx(widget.layout.x, width);
              const wY = pctToPx(widget.layout.y, height);
              const wW = pctToPx(widget.layout.width, width);
              const wH = pctToPx(widget.layout.height, height);

              const isSelected = widget.id === selectedWidgetId;
              const isHovered = hoveredWidgetId === widget.id;
              const isPlaytestMode = isPlaytest;

              // Common wrapper for all widget types — adds drag/select in editor
              // Dialogue lines state (computed outside renderWidgetContent so click handler can use it)
              const dlLines = currentPage?.dialogueLines;
              const dlLineIndex = playtestState.dialogueLineIndex ?? 0;
              // В плейтесте — только если диалог запущен; в редакторе — только если включён превью
              const dlStarted = isPlaytest
                ? (playtestState.dialogueStarted ?? false)
                : (useStudioStore.getState().editorDialoguePreviewLine !== null);
              const editorPreviewIdx = useStudioStore.getState().editorDialoguePreviewLine ?? 0;
              const activeIdx = isPlaytest ? dlLineIndex : editorPreviewIdx;
              const dlCurrentLine = dlStarted && dlLines?.length
                ? dlLines[Math.min(activeIdx, dlLines.length - 1)]
                : null;
              const dlIsLastLine = !dlLines?.length || activeIdx >= dlLines.length - 1;



              return (
                <Group
                  key={widget.id}
                  x={wX}
                  y={wY}
                  width={wW}
                  height={wH}
                  ref={(node: any) => {
                    if (node) {
                      widgetNodeRefs.current.set(widget.id, node);
                      // Bounce appear for choiceButton (once per page visit)
                      if (isPlaytest && widget.type === 'choiceButton' && !seenWidgetIdsRef.current.has(widget.id)) {
                        seenWidgetIdsRef.current.add(widget.id);
                        node.scaleX(0.85); node.scaleY(0.85); node.opacity(0);
                        node.to({ scaleX: 1, scaleY: 1, opacity: 1, duration: 0.22, easing: Konva.Easings.BackEaseOut });
                      }
                    } else {
                      widgetNodeRefs.current.delete(widget.id);
                    }
                  }}
                  draggable={!isPlaytestMode}
                  onMouseEnter={() => setHoveredWidgetId(widget.id)}
                  onMouseLeave={() => { setHoveredWidgetId(null); setPressedWidgetId(null); }}
                  onDragMove={(e) => {
                    if (isPlaytestMode) return;
                    const node = e.target;
                    const cx = (node.x() / width) * 100;
                    const cy = (node.y() / height) * 100;

                    if (snapEnabled) {
                      const snap = getSnappedButtonPosition(
                        { x: cx, y: cy, width: widget.layout.width, height: widget.layout.height },
                        guides,
                        2.0
                      );
                      const sx = (snap.x / 100) * width;
                      const sy = (snap.y / 100) * height;
                      node.x(sx);
                      node.y(sy);
                      if (snap.snappedToVertical || snap.snappedToHorizontal) {
                        useStudioStore.getState().setSnappingGuide({ vertical: snap.snappedToVertical, horizontal: snap.snappedToHorizontal });
                      } else {
                        useStudioStore.getState().setSnappingGuide(null);
                      }
                    } else {
                      useStudioStore.getState().setSnappingGuide(null);
                    }
                  }}
                  onDragEnd={(e) => {
                    if (isPlaytestMode) return;
                    handleWidgetDragEnd(widget.id, e);
                  }}
                  onMouseDown={() => setPressedWidgetId(widget.id)}
                  onMouseUp={() => setPressedWidgetId(null)}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    // DialogueBox click in playtest: skip typewriter or advance to next line
                    if (isPlaytestMode && widget.type === 'dialogueBox' && widget.data?.clickable !== false) {
                      const overrideT = playtestState.widgetOverrides[widget.id]?.text;
                      const tSrc = widget.data?.textSource || 'page';
                      const fullText = overrideT?.ru
                        || dlCurrentLine?.text?.ru
                        || (tSrc === 'custom' && widget.text?.ru ? widget.text.ru : null)
                        || currentPage?.text?.ru || '';
                      const prog = typewriterProgress[widget.id] ?? 0;
                      if (prog < fullText.length) {
                        // Skip to end of current text
                        setTypewriterProgress(prev => ({ ...prev, [widget.id]: fullText.length }));
                      } else if (dlLines?.length && !dlIsLastLine) {
                        // Advance to next line
                        advanceDialogueLine();
                        setTypewriterProgress(prev => ({ ...prev, [widget.id]: 0 }));
                      } else if (dlLines?.length && dlIsLastLine) {
                        // Last line done — fire onDialogueEnd
                        const onEnd = currentPage?.onDialogueEnd;
                        if (onEnd?.length) {
                          for (const a of onEnd) useStudioStore.getState().executeAction(a);
                        }
                      }
                      return;
                    }
                    if (isPlaytestMode && widget.type === 'choiceButton') {
                      if (widget.data?.items?.length) return; // new group: sub-buttons handle via cancelBubble
                      if (widget.actions?.length) {
                        for (const a of widget.actions) useStudioStore.getState().executeAction(a);
                        return;
                      }
                      if (widget.action) {
                        useStudioStore.getState().executeAction(widget.action);
                        return;
                      }
                      const linkedId = (widget.data || {}).linkedButtonId;
                      if (linkedId) {
                        const linked = currentPage.buttons.find((b: any) => b.id === linkedId);
                        if (linked) {
                          useStudioStore.getState().executeAction(linked.action);
                          return;
                        }
                      }
                      const chData = widget.data || {};
                      if (chData.setIntensity !== undefined) {
                        useStudioStore.getState().executeAction({ type: 'setIntensity', value: chData.setIntensity });
                      } else {
                        useStudioStore.getState().executeAction({ type: 'setIntensity', value: 30 });
                      }
                      return;
                    }
                    if (isPlaytestMode && widget.type === 'quickAction') {
                      const at = (widget.data || {}).actionType;
                      if (at === 'inventory') {
                        useStudioStore.getState().openInventory();
                      }
                      return;
                    }
                    if (isPlaytestMode && widget.type === 'inventory') {
                      useStudioStore.getState().openInventory();
                      return;
                    }
                    if (!isPlaytestMode) {
                      selectWidget(widget.id);
                      selectButton(null);
                    }
                  }}
                  onTap={(e) => {
                    e.cancelBubble = true;
                    if (isPlaytestMode && widget.type === 'dialogueBox' && widget.data?.clickable !== false) {
                      const overrideT = playtestState.widgetOverrides[widget.id]?.text;
                      const tSrc = widget.data?.textSource || 'page';
                      const fullText = overrideT?.ru
                        || dlCurrentLine?.text?.ru
                        || (tSrc === 'custom' && widget.text?.ru ? widget.text.ru : null)
                        || currentPage?.text?.ru || '';
                      const prog = typewriterProgress[widget.id] ?? 0;
                      if (prog < fullText.length) {
                        setTypewriterProgress(prev => ({ ...prev, [widget.id]: fullText.length }));
                      } else if (dlLines?.length && !dlIsLastLine) {
                        advanceDialogueLine();
                        setTypewriterProgress(prev => ({ ...prev, [widget.id]: 0 }));
                      }
                      return;
                    }
                    if (isPlaytestMode && widget.type === 'choiceButton') {
                      if (widget.data?.items?.length) return; // new group: sub-buttons handle via cancelBubble
                      if (widget.actions?.length) {
                        for (const a of widget.actions) useStudioStore.getState().executeAction(a);
                        return;
                      }
                      if (widget.action) {
                        useStudioStore.getState().executeAction(widget.action);
                        return;
                      }
                      const linkedId = (widget.data || {}).linkedButtonId;
                      if (linkedId) {
                        const linked = currentPage.buttons.find((b: any) => b.id === linkedId);
                        if (linked) {
                          useStudioStore.getState().executeAction(linked.action);
                          return;
                        }
                      }
                      const chData = widget.data || {};
                      if (chData.setIntensity !== undefined) {
                        useStudioStore.getState().executeAction({ type: 'setIntensity', value: chData.setIntensity });
                      } else {
                        useStudioStore.getState().executeAction({ type: 'setIntensity', value: 30 });
                      }
                      return;
                    }
                    if (isPlaytestMode && widget.type === 'quickAction') {
                      const at = (widget.data || {}).actionType;
                      if (at === 'inventory') {
                        useStudioStore.getState().openInventory();
                      }
                      return;
                    }
                    if (!isPlaytestMode) {
                      selectWidget(widget.id);
                      selectButton(null);
                    }
                  }}
                >
                  {/* Hover ring — hidden when selected (Transformer provides its own border) and in playtest */}
                  {isHovered && !isSelected && !isPlaytestMode && (
                    <Rect
                      x={-3}
                      y={-3}
                      width={wW + 6}
                      height={wH + 6}
                      cornerRadius={8}
                      stroke="#8a7655"
                      strokeWidth={1}
                      dash={[3, 2]}
                      listening={false}
                    />
                  )}
                  {/* Visual indicator for dynamic override in playtest */}
                  {isPlaytest && playtestState.widgetOverrides[widget.id] && (
                    <Rect
                      x={-1}
                      y={-1}
                      width={wW + 2}
                      height={wH + 2}
                      cornerRadius={4}
                      stroke="#22c55e"
                      strokeWidth={1.5}
                      dash={[2, 2]}
                      listening={false}
                    />
                  )}
                  <WidgetContent
                    widget={widget}
                    wW={wW}
                    wH={wH}
                    isSelected={isSelected}
                    isHovered={isHovered}
                    isPlaytest={isPlaytestMode}
                    theme={theme}
                    currentPage={currentPage}
                    playtestState={playtestState}
                    typewriterProgress={typewriterProgress}
                    animValues={animValues}
                    portraitSwapAnim={portraitSwapAnim}
                    widgetImages={widgetImages}
                    dlCurrentLine={dlCurrentLine}
                    dlIsLastLine={dlIsLastLine}
                    pressedWidgetId={pressedWidgetId}
                    hoveredItemKey={hoveredItemKey}
                    setHoveredItemKey={setHoveredItemKey}
                    width={width}
                    height={height}
                  />
                </Group>
              );
            })}

          {/* Draggable Buttons */}
          {currentPage.buttons
            .filter((button) => {
              if (!button.visibleWhen) return true;

              // Live values in playtest, fallback to defaults in editor
              const getVarValue = (variableId: string) => {
                const live = playtestState.variableValues[variableId];
                if (live !== undefined) return live;
                const v = useStudioStore.getState().variables.find(vv => vv.id === variableId);
                return v?.defaultValue;
              };

              return evaluateCondition(
                button.visibleWhen,
                useStudioStore.getState().variables,
                useStudioStore.getState().items,
                getVarValue
              );
            })
            .map((button) => (
              <ButtonRenderer
                key={button.id}
                button={button}
                isPlaytest={isPlaytest}
                width={width}
                height={height}
                selectedButtonId={selectedButtonId}
                hoveredButtonId={hoveredButtonId}
                pressedButtonId={pressedButtonId}
                buttonImages={buttonImages}
                buttonNodeRefs={buttonNodeRefs}
                playtestVariableValues={playtestState.variableValues}
                guides={guides}
                snapEnabled={snapEnabled}
                handleButtonClick={handleButtonClick}
                handleButtonDragEnd={handleButtonDragEnd}
                setHoveredButtonId={setHoveredButtonId}
                setPressedButtonId={setPressedButtonId}
              />
            ))}

          {/* Resize Transformer — attaches to selected widget or button in editor mode */}
          {!isPlaytest && (
            <Transformer
              ref={transformerRef}
              rotateEnabled={false}
              keepRatio={false}
              borderStroke="#C5A46E"
              borderStrokeWidth={1}
              borderDash={[3, 2]}
              anchorFill="#C5A46E"
              anchorStroke="#534B40"
              anchorSize={7}
              anchorCornerRadius={2}
              padding={0}
              enabledAnchors={[
                'top-left', 'top-center', 'top-right',
                'middle-left', 'middle-right',
                'bottom-left', 'bottom-center', 'bottom-right',
              ]}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 20 || newBox.height < 20) return oldBox;
                return newBox;
              }}
              onTransformStart={() => {
                useStudioStore.getState().saveCanvasSnapshot();
              }}
              onTransformEnd={() => {
                const pageId = selectedPageId;
                if (!pageId) return;

                if (selectedWidgetId) {
                  const node = widgetNodeRefs.current.get(selectedWidgetId);
                  if (node) {
                    const newX = (node.x() / width) * 100;
                    const newY = (node.y() / height) * 100;
                    const newW = (node.width() * node.scaleX() / width) * 100;
                    const newH = (node.height() * node.scaleY() / height) * 100;
                    node.scaleX(1);
                    node.scaleY(1);
                    useStudioStore.getState().updateUIWidgetLayout(pageId, selectedWidgetId, { x: newX, y: newY, width: newW, height: newH });
                  }
                }

                if (selectedButtonId) {
                  const node = buttonNodeRefs.current.get(selectedButtonId);
                  if (node) {
                    const newX = (node.x() / width) * 100;
                    const newY = (node.y() / height) * 100;
                    const newW = (node.width() * node.scaleX() / width) * 100;
                    const newH = (node.height() * node.scaleY() / height) * 100;
                    node.scaleX(1);
                    node.scaleY(1);
                    useStudioStore.getState().updateButtonLayout(pageId, selectedButtonId, { x: newX, y: newY, width: newW, height: newH });
                  }
                }
              }}
            />
          )}
        </Layer>
      </Stage>

    </div>
  );
}



