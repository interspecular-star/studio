'use client';

import { useRef, useState, useEffect, useLayoutEffect } from 'react';
import { Stage, Layer, Rect, Text, Group, Image as KonvaImage, Transformer } from 'react-konva';
import type { Stage as StageType } from 'konva/lib/Stage';
import Konva from 'konva';

import { useStudioStore, type UIWidget, DIALOGUE_THEME_PRESETS } from '@/lib/store';
import { getSnappedButtonPosition } from '@/lib/snapping';
import { evaluateCondition } from '@/lib/conditions';
import { parseRichText, layoutRichText, advanceTypewriter } from '@/lib/richText';

// Trim an unclosed tag at the end of a typewriter-sliced string so markup never leaks as literal text
function trimPartialTag(s: string): string {
  const lastOpen = s.lastIndexOf('[');
  if (lastOpen === -1) return s;
  if (s.lastIndexOf(']') > lastOpen) return s;
  return s.substring(0, lastOpen);
}

// No more built-in gradient themes (user removed all built-ins)


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

  // Typewriter effect for dialogueBox text in playtest
  useEffect(() => {
    if (!isPlaytest) {
      setTypewriterProgress({});
      typewriterPausedRef.current = {};
      return;
    }
    const dialogueWidgets = (currentPage?.uiWidgets || []).filter((w: any) => w.type === 'dialogueBox');
    if (dialogueWidgets.length === 0) return;

    // Reset progress (and pause) when text length shrinks (text was changed)
    const resetNeeded: string[] = [];
    dialogueWidgets.forEach((w: any) => {
      const overrideT = playtestState.widgetOverrides[w.id]?.text ?? null;
      const textSource = w.data?.textSource || 'page';
      const fullText = overrideT?.ru || (textSource === 'custom' && w.text?.ru ? w.text.ru : (currentPage?.text?.ru || ''));
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
          const fullText = overrideT?.ru || (textSource === 'custom' && w.text?.ru ? w.text.ru : (currentPage?.text?.ru || ''));
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
              // Editor: всегда показываем первую реплику; Playtest: текущую по индексу
              const dlCurrentLine = dlLines?.length
                ? dlLines[isPlaytest ? Math.min(dlLineIndex, dlLines.length - 1) : 0]
                : null;
              const dlIsLastLine = !dlLines?.length || dlLineIndex >= dlLines.length - 1;

              const renderWidgetContent = () => {
                if (widget.type === 'dialogueBox') {
                  const textSource = widget.data?.textSource || 'page';
                  const overrideText = isPlaytest ? playtestState.widgetOverrides[widget.id]?.text : null;
                  const effectiveText = overrideText || widget.text;
                  // Priority: dynamic override > current dialogue line > custom widget text > page text
                  const rawText = overrideText?.ru
                    || dlCurrentLine?.text?.ru
                    || (textSource === 'custom' && effectiveText?.ru ? effectiveText.ru : null)
                    || currentPage?.text?.ru || '';

                  const boxH = Math.max(48, wH);
                  const innerPad = 14;
                  // Speaker: line override > widget manual override > page speaker
                  const activeSpeakerId = dlCurrentLine?.speaker || currentPage?.speaker || '';
                  const speakerName = widget.data?.speakerName
                    || (activeSpeakerId ? getSpeakerName(activeSpeakerId) : '');
                  const nameY = 4;
                  const textStartY = speakerName ? 18 : 10;
                  const boxStyle = widget.style || 'default';
                  let boxFill = theme.boxFill;
                  let boxStroke = isSelected ? theme.nameTagColor : theme.boxStroke;
                  if (boxStyle === 'important') {
                    boxStroke = isSelected ? theme.textColor : theme.nameTagColor;
                  }

                  // Typewriter: slice raw text by raw-char progress; trim any dangling '[' so markup never renders as literal text
                  const partialRaw = (isPlaytest && typewriterProgress[widget.id] !== undefined)
                    ? trimPartialTag(rawText.substring(0, typewriterProgress[widget.id]))
                    : rawText;

                  // Detect [shake] before parsing so we can apply it at box level
                  const hasShakeTag = /\[shake\]/.test(partialRaw);

                  // Shake: angry variant, high intensity, or explicit [shake] tag
                  let shakeX = 0;
                  let shakeY = 0;
                  if (isPlaytest) {
                    const portraitW = (currentPage?.uiWidgets || []).find((ww: any) => ww.type === 'portrait');
                    const pOverride = portraitW ? playtestState.widgetOverrides[portraitW.id] : null;
                    const activeV = pOverride?.data?.variant || portraitW?.data?.variant || '';
                    let intensity = 0;
                    const intW = (currentPage?.uiWidgets || []).find((ww: any) => ww.type === 'intensityBar');
                    if (intW?.data?.valueVar) {
                      const v = useStudioStore.getState().variables.find((vv: any) => vv.id === intW.data!.valueVar);
                      const live = playtestState.variableValues[intW.data!.valueVar];
                      intensity = typeof live === 'number' ? live : (v?.defaultValue as number ?? 0);
                    }
                    if (activeV === 'angry' || intensity > 60) {
                      const amp = activeV === 'angry' ? 1.5 : (intensity - 60) / 30;
                      const t = Date.now() / 40;
                      shakeX = Math.sin(t) * amp;
                      shakeY = Math.cos(t * 1.3) * amp * 0.6;
                    }
                    if (hasShakeTag) {
                      const t = Date.now() / 30;
                      shakeX += Math.sin(t) * 2;
                      shakeY += Math.cos(t * 0.8) * 1;
                    }
                  }

                  // Rich text: parse markup into segments, lay out into positioned words
                  const richFontSize = Math.max(11, Math.min(15, Math.round(height / 52)));
                  const richSegments = parseRichText(partialRaw);
                  const { words: richWords } = layoutRichText(richSegments, {
                    maxWidth: wW - innerPad * 2,
                    fontSize: richFontSize,
                    lineHeightMultiplier: 1.32,
                    defaultColor: theme.textColor,
                  });

                  return (
                    <>
                      <Rect
                        x={shakeX}
                        y={shakeY}
                        width={wW}
                        height={boxH}
                        cornerRadius={theme.boxCornerRadius}
                        fill={boxFill}
                        stroke={boxStroke}
                        strokeWidth={isSelected ? 2.5 : 1.5}
                        shadowColor="rgba(0,0,0,0.4)"
                        shadowBlur={isSelected ? 8 : 0}
                      />
                      {speakerName && (
                        <>
                          <Rect
                            x={innerPad - 4 + shakeX}
                            y={nameY - 1 + shakeY}
                            width={Math.min(wW - innerPad * 2 + 8, 120)}
                            height={12}
                            fill="rgba(0,0,0,0.4)"
                            cornerRadius={2}
                          />
                          <Text
                            x={innerPad + shakeX}
                            y={nameY + shakeY}
                            width={wW - innerPad * 2}
                            text={speakerName}
                            fontSize={9}
                            fill={theme.nameTagColor}
                            fontStyle="500"
                            fontFamily={theme.fontFamily}
                          />
                        </>
                      )}
                      {/* Rich text: each token rendered with its own style, color, and size */}
                      <Group x={innerPad + shakeX} y={textStartY + shakeY}>
                        {richWords.map((word, idx) => (
                          <Text
                            key={idx}
                            x={word.x}
                            y={word.y}
                            text={word.text}
                            fontSize={word.size}
                            fill={word.color}
                            fontStyle={
                              word.bold && word.italic ? 'bold italic' :
                              word.bold ? 'bold' :
                              word.italic ? 'italic' :
                              'normal'
                            }
                            fontFamily={theme.fontFamily}
                          />
                        ))}
                      </Group>
                      {/* Dialogue lines progress: "▶" when typewriter done + more lines / buttons coming */}
                      {isPlaytest && dlLines && dlLines.length > 1 && (() => {
                        const prog = typewriterProgress[widget.id] ?? 0;
                        const typewriterDone = prog >= rawText.length;
                        if (!typewriterDone) return null;
                        const label = dlIsLastLine
                          ? (currentPage.buttons.length > 0 ? '▼' : null)
                          : `▶ ${dlLineIndex + 1}/${dlLines.length}`;
                        if (!label) return null;
                        return (
                          <Text
                            x={wW - innerPad - 28}
                            y={wH - 14 + shakeY}
                            text={label}
                            fontSize={9}
                            fill="#C5A46E"
                            opacity={0.75}
                            listening={false}
                          />
                        );
                      })()}
                    </>
                  );
                }

                if (widget.type === 'textLabel' || widget.type === 'portrait') {
                  const spId = widget.data?.speakerId || currentPage?.speaker || '';
                  const defaultLabel = getSpeakerName(spId) || 'Speaker';
                  const label = (widget.type === 'textLabel' && widget.text?.ru) ? widget.text.ru : defaultLabel;
                  // Asset: explicit widget.assetId → speaker.portraitAssetId → null (placeholder)
                  const portraitSpk = (widget.type === 'portrait' && !widget.assetId && widget.data?.speakerId)
                    ? (useStudioStore.getState().speakers || []).find((s: any) => s.id === widget.data?.speakerId)
                    : null;
                  const resolvedAssetId = widget.assetId || portraitSpk?.portraitAssetId || null;
                  const asset = resolvedAssetId ? (useStudioStore.getState().uiAssets || []).find((a: any) => a.id === resolvedAssetId) : null;
                  const variants = asset?.variants || {};
                  // Variant: dialogue line portraitVariant (if this widget's speaker is active) → widget default
                  const activeSpeakerForVariant = dlCurrentLine?.speaker || currentPage?.speaker || '';
                  const lineVariant = (widget.type === 'portrait' && widget.data?.speakerId && widget.data.speakerId === activeSpeakerForVariant)
                    ? (dlCurrentLine?.portraitVariant || null)
                    : null;
                  const activeVariant = lineVariant || widget.data?.variant || 'default';
                  const variantUrl = variants[activeVariant] || asset?.url;
                  let imgSrc = variantUrl ? variantUrl.trim().replace(/\\/g, '/') : null;
                  if (imgSrc && !imgSrc.startsWith('http') && !imgSrc.startsWith('/')) imgSrc = '/' + imgSrc;
                  const wImg = imgSrc ? widgetImages[imgSrc] : null;

                  if (wImg && widget.type === 'portrait') {
                    let pOpacity = 1;
                    let pScale = 1;
                    const swapTime = portraitSwapAnim[widget.id];
                    if (swapTime && (Date.now() - swapTime < 350)) {
                      const t = Math.min(1, (Date.now() - swapTime) / 350);
                      pOpacity = 0.3 + 0.7 * t;
                      pScale = 0.85 + 0.15 * t;
                    }
                    return <KonvaImage 
                      image={wImg} 
                      width={wW} 
                      height={wH} 
                      opacity={pOpacity}
                      scaleX={pScale}
                      scaleY={pScale}
                      x={(wW - wW * pScale) / 2}
                      y={(wH - wH * pScale) / 2}
                    />;
                  }
                  return (
                    <>
                      <Rect
                        x={0}
                        y={0}
                        width={wW}
                        height={wH}
                        cornerRadius={4}
                        fill="rgba(0,0,0,0.55)"
                        stroke={isSelected ? theme.nameTagColor : theme.boxStroke}
                        strokeWidth={isSelected ? 2 : 1}
                      />
                      <Text
                        x={0}
                        y={Math.max(2, (wH - 14) / 2)}
                        width={wW}
                        height={14}
                        text={label}
                        fontSize={Math.max(9, Math.min(12, Math.round(wH * 0.45)))}
                        align="center"
                        fill={theme.nameTagColor}
                        fontStyle="500"
                        fontFamily={theme.fontFamily}
                      />
                    </>
                  );
                }

                if (widget.type === 'choiceButton') {
                  const data = widget.data || {};
                  const linkedBtn = data.linkedButtonId ? currentPage.buttons.find((b: any) => b.id === data.linkedButtonId) : null;
                  const btnText = linkedBtn ? linkedBtn.text.ru : (widget.text?.ru || 'Choice');
                  const isLinked = !!linkedBtn;
                  const isPressed = pressedWidgetId === widget.id;
                  const hoverFill = isPressed ? 'rgba(48,38,28,0.98)' : (isHovered ? 'rgba(72,62,48,0.95)' : (isLinked ? 'rgba(60,50,37,0.92)' : 'rgba(80,65,45,0.85)'));

                  // If asset image for this choice widget, draw it (like button images)
                  const asset = widget.assetId ? (useStudioStore.getState().uiAssets || []).find((a: any) => a.id === widget.assetId) : null;
                  let cImgSrc = asset?.url ? asset.url.trim().replace(/\\/g,'/') : null;
                  if (cImgSrc && !cImgSrc.startsWith('http') && !cImgSrc.startsWith('/')) cImgSrc = '/' + cImgSrc;
                  const cImg = cImgSrc ? widgetImages[cImgSrc] : null;

                  if (cImg) {
                    if (data.imageOnly) {
                      return <KonvaImage image={cImg} width={wW} height={wH} />;
                    }
                    return (
                      <>
                        <KonvaImage image={cImg} width={wW} height={wH} />
                        <Text x={2} y={wH / 2 - 6} width={wW} text={btnText} fontSize={11} fill={theme.textColor} align="center" fontFamily={theme.fontFamily} />
                      </>
                    );
                  }

                  return (
                    <>
                      <Rect
                        x={0}
                        y={0}
                        width={wW}
                        height={wH}
                        cornerRadius={5}
                        fill={hoverFill}
                        stroke={isSelected ? theme.textColor : (isLinked ? theme.nameTagColor : theme.boxStroke)}
                        strokeWidth={isSelected ? 2.5 : (isLinked ? 1.8 : 1)}
                      />
                      <Text x={2} y={wH / 2 - 6} width={wW} text={btnText} fontSize={11} fill={theme.textColor} align="center" fontFamily={theme.fontFamily} />
                    </>
                  );
                }

                if (widget.type === 'intensityBar') {
                  const data = widget.data || {};
                  const varId = data.valueVar;
                  let val = 50;
                  if (varId) {
                    const v = useStudioStore.getState().variables.find((vv: any) => vv.id === varId);
                    const live = playtestState.variableValues[varId];
                    val = typeof live === 'number' ? live : (v?.defaultValue as number ?? 50);
                  }
                  // Use animated value if available for smooth transitions
                  const animKey = widget.id;
                  if (animValues[animKey] !== undefined) {
                    val = Number(animValues[animKey]);
                  }
                  const parts = Math.max(1, Math.min(5, data.parts || 3));
                  const clamped = Math.max(0, Math.min(100, val));
                  const partWidth = wW / parts;
                  const filledParts = Math.floor((clamped / 100) * parts);
                  // Pulse when critical (<20%) in playtest — interval re-renders drive the animation
                  const isCritical = isPlaytest && clamped < 20;
                  const pulseOpacity = isCritical ? 0.45 + 0.55 * Math.abs(Math.sin(Date.now() / 280)) : 1;

                  return (
                    <Group opacity={pulseOpacity}>
                      {Array.from({ length: parts }).map((_, i) => {
                        const isFilled = i < filledParts;
                        const colors = data.colors || ['#4b2e1e', '#8a5a3a', '#c27a4a'];
                        const fillColor = isFilled ? (colors[i % colors.length] || '#c27a4a') : '#2a221c';
                        return (
                          <Rect
                            key={i}
                            x={i * partWidth}
                            y={0}
                            width={partWidth - 1}
                            height={wH}
                            fill={fillColor}
                            stroke="#534B40"
                            strokeWidth={0.5}
                          />
                        );
                      })}
                      <Text
                        x={0}
                        y={wH / 2 - 5}
                        width={wW}
                        text={`${Math.round(clamped)}`}
                        fontSize={9}
                        fill="#EDE4D4"
                        align="center"
                      />
                    </Group>
                  );
                }

                if (widget.type === 'quickAction') {
                  const data = widget.data || {};
                  const actionType = data.actionType || 'custom';
                  let label = actionType === 'inventory' ? 'И' : 
                             actionType === 'map' ? 'К' : 
                             actionType === 'skills' ? 'С' : '?';
                  const isPressed = pressedWidgetId === widget.id;
                  const asset = widget.assetId ? (useStudioStore.getState().uiAssets || []).find((a: any) => a.id === widget.assetId) : null;
                  let qImgSrc = asset?.url ? asset.url.trim().replace(/\\/g, '/') : null;
                  if (qImgSrc && !qImgSrc.startsWith('http') && !qImgSrc.startsWith('/')) qImgSrc = '/' + qImgSrc;
                  const qImg = qImgSrc ? widgetImages[qImgSrc] : null;
                  if (qImg) {
                    return <KonvaImage image={qImg} width={wW} height={wH} opacity={isPressed ? 0.7 : 1} />;
                  }
                  return (
                    <Group>
                      <Rect
                        x={0}
                        y={0}
                        width={wW}
                        height={wH}
                        cornerRadius={4}
                        fill={isPressed ? 'rgba(40,35,25,0.98)' : (isHovered ? 'rgba(80,65,45,0.95)' : 'rgba(55,45,32,0.85)')}
                        stroke="#534B40"
                        strokeWidth={1}
                      />
                      <Text
                        x={0}
                        y={wH / 2 - 6}
                        width={wW}
                        text={label}
                        fontSize={Math.min(14, wH * 0.7)}
                        fill="#C5A46E"
                        align="center"
                        fontStyle="500"
                      />
                    </Group>
                  );
                }

                if (widget.type === 'container') {
                  const data = widget.data || {};
                  return (
                    <>
                      <Rect
                        x={0}
                        y={0}
                        width={wW}
                        height={wH}
                        fill="rgba(30,25,20,0.7)"
                        stroke="#3a3020"
                        strokeWidth={1.5}
                        cornerRadius={4}
                      />
                      {data.title && (
                        <Text
                          x={2}
                          y={2}
                          width={wW - 4}
                          text={data.title}
                          fontSize={8}
                          fill="#C5A46E"
                          fontStyle="500"
                        />
                      )}
                    </>
                  );
                }

                // Fallback
                return (
                  <Rect x={0} y={0} width={wW} height={wH} fill="#222" stroke="#555" />
                );
              };

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
                    if (isPlaytestMode && widget.type === 'dialogueBox') {
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
                      }
                      return;
                    }
                    if (isPlaytestMode && widget.type === 'choiceButton') {
                      const linkedId = (widget.data || {}).linkedButtonId;
                      if (linkedId) {
                        const linked = currentPage.buttons.find((b: any) => b.id === linkedId);
                        if (linked) {
                          useStudioStore.getState().executeAction(linked.action);
                          return;
                        }
                      }
                      // Fallback for demo: use data or lower intensity
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
                      // map/skills can be extended later with custom actions
                      return;
                    }
                    if (!isPlaytestMode) {
                      selectWidget(widget.id);
                      selectButton(null);
                    }
                  }}
                  onTap={(e) => {
                    e.cancelBubble = true;
                    if (isPlaytestMode && widget.type === 'dialogueBox') {
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
                      const linkedId = (widget.data || {}).linkedButtonId;
                      if (linkedId) {
                        const linked = currentPage.buttons.find((b: any) => b.id === linkedId);
                        if (linked) {
                          useStudioStore.getState().executeAction(linked.action);
                          return;
                        }
                      }
                      // Fallback for demo: use data or lower intensity
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
                  {renderWidgetContent()}
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
            .map((button) => {
            const isSelected = button.id === selectedButtonId;
            const btnX = pctToPx(button.layout.x, width);
            const btnY = pctToPx(button.layout.y, height);
            const btnW = pctToPx(button.layout.width, width);
            const btnH = pctToPx(button.layout.height, height);

            // Проверяем enabledWhen для визуального состояния
            const getVarValueForEnabled = (variableId: string) => {
              const live = playtestState.variableValues[variableId];
              if (live !== undefined) return live;
              const v = useStudioStore.getState().variables.find(vv => vv.id === variableId);
              return v?.defaultValue;
            };

            const isEnabled = !button.enabledWhen || evaluateCondition(
              button.enabledWhen,
              useStudioStore.getState().variables,
              useStudioStore.getState().items,
              getVarValueForEnabled
            );

            const buttonStyle = button.layout.style || 'default';

            const isHovered = hoveredButtonId === button.id && isEnabled;
            const isPressed = pressedButtonId === button.id && isEnabled;

            // Вычисляем визуальные стили кнопки
            let accentColor: string;
            let bgColor: string;
            let strokeWidth: number;
            let textColor = '#F4EDE0';
            let buttonOpacity = 1;
            let shadowBlur = isSelected ? 14 : 7;
            let shadowOpacity = 1;

            if (isEnabled) {
              buttonOpacity = 1;

              // Base colors by style
              switch (buttonStyle) {
                case 'important':
                  accentColor = isSelected ? '#F4EDE0' : '#E8D4A0';
                  bgColor = isSelected ? 'rgba(68, 57, 42, 0.96)' : 'rgba(60, 50, 37, 0.92)';
                  strokeWidth = isSelected ? 3 : 2.2;
                  break;

                case 'danger':
                  accentColor = isSelected ? '#E8A090' : '#C25D3A';
                  bgColor = isSelected ? 'rgba(65, 48, 44, 0.95)' : 'rgba(55, 42, 40, 0.9)';
                  strokeWidth = isSelected ? 2.5 : 2;
                  break;

                case 'subtle':
                  accentColor = isSelected ? '#C5B8A0' : '#8A7F6A';
                  bgColor = isSelected ? 'rgba(52, 47, 42, 0.9)' : 'rgba(48, 43, 39, 0.85)';
                  strokeWidth = isSelected ? 2 : 1.2;
                  textColor = '#D4C9B5';
                  break;

                case 'default':
                default:
                  accentColor = isSelected ? '#E8D4A0' : '#C5A46E';
                  bgColor = isSelected ? 'rgba(62, 52, 37, 0.94)' : 'rgba(55, 45, 32, 0.9)';
                  strokeWidth = isSelected ? 2.5 : 1.5;
                  break;
              }

              // Hover effect (only when enabled)
              if (isHovered && !isPressed) {
                // Brighten on hover
                if (buttonStyle === 'important') {
                  accentColor = '#F8F0D8';
                  bgColor = 'rgba(72, 62, 48, 0.95)';
                } else if (buttonStyle === 'danger') {
                  accentColor = '#E8B0A0';
                  bgColor = 'rgba(62, 48, 46, 0.93)';
                } else {
                  accentColor = '#D8C89A';
                  bgColor = 'rgba(62, 52, 37, 0.94)';
                }
                strokeWidth = Math.max(strokeWidth + 0.5, 2.5);
                shadowBlur = isSelected ? 16 : 10;
              }

              // Pressed effect
              if (isPressed) {
                if (buttonStyle === 'important') {
                  bgColor = 'rgba(52, 46, 38, 0.98)';
                  accentColor = '#D8C89A';
                } else if (buttonStyle === 'danger') {
                  bgColor = 'rgba(48, 38, 37, 0.97)';
                  accentColor = '#A85C4A';
                } else {
                  bgColor = 'rgba(48, 42, 35, 0.97)';
                  accentColor = '#B89C6A';
                }
                strokeWidth = Math.max(1.2, strokeWidth - 0.3);
                shadowBlur = isSelected ? 6 : 3;
                shadowOpacity = 0.7;
              }
            } else {
              // Disabled state (enabledWhen failed)
              buttonOpacity = 0.42;
              textColor = '#9A9080';
              shadowOpacity = 0.35;

              switch (buttonStyle) {
                case 'important':
                  accentColor = '#5C5549';
                  bgColor = 'rgba(40, 36, 32, 0.75)';
                  strokeWidth = 1.8;
                  break;

                case 'danger':
                  accentColor = '#6B4F4A';
                  bgColor = 'rgba(42, 36, 35, 0.75)';
                  strokeWidth = 1.6;
                  break;

                case 'subtle':
                  accentColor = '#4A463D';
                  bgColor = 'rgba(38, 35, 32, 0.7)';
                  strokeWidth = 1;
                  break;

                case 'default':
                default:
                  accentColor = '#5C5549';
                  bgColor = 'rgba(40, 36, 32, 0.72)';
                  strokeWidth = 1.3;
                  break;
              }
            }

            const btnImageSrc = button.image
              ? (() => {
                  let s = button.image.trim().replace(/\\/g, '/');
                  if (s && !s.startsWith('http') && !s.startsWith('/')) s = '/' + s;
                  return s;
                })()
              : null;
            const btnImg = btnImageSrc ? buttonImages[btnImageSrc] : null;

            return (
              <Group
                key={button.id}
                x={btnX}
                y={btnY}
                width={btnW}
                height={btnH}
                ref={(node: any) => {
                  if (node) buttonNodeRefs.current.set(button.id, node);
                  else buttonNodeRefs.current.delete(button.id);
                }}
                opacity={buttonOpacity}
                draggable={!isPlaytest && isEnabled}

                // Hover & Press states (only for enabled buttons)
                onMouseEnter={() => {
                  if (isEnabled) setHoveredButtonId(button.id);
                }}
                onMouseLeave={() => {
                  setHoveredButtonId(null);
                  setPressedButtonId(null);
                }}
                onMouseDown={() => {
                  if (isEnabled) setPressedButtonId(button.id);
                }}
                onMouseUp={() => {
                  setPressedButtonId(null);
                }}

                onDragMove={(e) => {
                  if (isPlaytest || !isEnabled) return; // Блокируем движение в Playtest и для disabled кнопок
                  const node = e.target;
                  const currentXPercent = (node.x() / width) * 100;
                  const currentYPercent = (node.y() / height) * 100;

                  if (snapEnabled) {
                    // Apply live snapping while dragging
                    const snap = getSnappedButtonPosition(
                      {
                        x: currentXPercent,
                        y: currentYPercent,
                        width: button.layout.width,
                        height: button.layout.height,
                      },
                      guides,
                      2.0 // snapping threshold in %
                    );

                    const snappedX = (snap.x / 100) * width;
                    const snappedY = (snap.y / 100) * height;

                    node.x(snappedX);
                    node.y(snappedY);

                    // Report current snap for visual feedback in rulers
                    if (snap.snappedToVertical || snap.snappedToHorizontal) {
                      useStudioStore.getState().setSnappingGuide({
                        vertical: snap.snappedToVertical,
                        horizontal: snap.snappedToHorizontal,
                      });
                    } else {
                      useStudioStore.getState().setSnappingGuide(null);
                    }
                  } else {
                    // Snapping disabled - move freely and clear any highlight
                    useStudioStore.getState().setSnappingGuide(null);
                  }
                }}
                onDragEnd={(e) => {
                  if (isPlaytest || !isEnabled) return;
                  handleButtonDragEnd(button.id, e);
                }}
                onClick={(e) => {
                  if (!isEnabled) return;

                  if (isPlaytest) {
                    // В Playtest режиме клик = выполнение действия
                    const freshState = useStudioStore.getState();
                    freshState.executeAction(button.action);
                  } else {
                    // В Editor режиме клик = выбор кнопки
                    handleButtonClick(button.id, e);
                  }
                }}
                onTap={(e) => {
                  if (!isEnabled) return;

                  if (isPlaytest) {
                    const freshState = useStudioStore.getState();
                    freshState.executeAction(button.action);
                  } else {
                    handleButtonClick(button.id, e);
                  }
                }}
              >
                {btnImg ? (
                  <KonvaImage
                    image={btnImg}
                    width={btnW}
                    height={btnH}
                    opacity={isEnabled ? 0.95 : 0.6}
                  />
                ) : (
                  <Rect
                    width={btnW}
                    height={btnH}
                    cornerRadius={6}
                    fill={bgColor}
                    stroke={accentColor}
                    strokeWidth={strokeWidth}
                    shadowColor="rgba(0,0,0,0.55)"
                    shadowBlur={shadowBlur}
                    shadowOffsetY={3}
                    shadowOpacity={shadowOpacity}
                  />
                )}
                {/* Text overlay on top of image or rect (for image buttons: text can be subtle or hidden via future imageOnly widget) */}
                <Text
                  width={btnW}
                  height={btnH}
                  text={button.text.ru}
                  fontSize={14}
                  fill={textColor}
                  align="center"
                  verticalAlign="middle"
                  fontStyle="500"
                  opacity={btnImg ? (isEnabled ? 0.92 : 0.6) : (isEnabled ? 1 : 0.85)}
                />
              </Group>
            );
          })}

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
                    const newW = (node.width() * node.scaleX() / width) * 100;
                    const newH = (node.height() * node.scaleY() / height) * 100;
                    node.scaleX(1);
                    node.scaleY(1);
                    useStudioStore.getState().updateUIWidgetLayout(pageId, selectedWidgetId, { width: newW, height: newH });
                  }
                }

                if (selectedButtonId) {
                  const node = buttonNodeRefs.current.get(selectedButtonId);
                  if (node) {
                    const newW = (node.width() * node.scaleX() / width) * 100;
                    const newH = (node.height() * node.scaleY() / height) * 100;
                    node.scaleX(1);
                    node.scaleY(1);
                    useStudioStore.getState().updateButtonLayout(pageId, selectedButtonId, { width: newW, height: newH });
                  }
                }
              }}
            />
          )}
        </Layer>
      </Stage>

      {currentPage.buttons.length === 0 && (
        <div className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 text-xs text-[var(--studio-text-muted)]/60">
          Нажми «Добавить кнопку» в правой панели
        </div>
      )}
    </div>
  );
}
