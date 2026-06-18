'use client';

import { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Rect, Text, Group, Image as KonvaImage } from 'react-konva';
import type { Stage as StageType } from 'konva/lib/Stage';

import { useStudioStore, type UIWidget } from '@/lib/store';
import { getSnappedButtonPosition } from '@/lib/snapping';
import { evaluateCondition } from '@/lib/conditions';

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
  } = useStudioStore();

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

  // Load widget asset images (portraits, button skins for choice etc)
  useEffect(() => {
    const assets = useStudioStore.getState().uiAssets || [];
    const wAssets = (currentPage?.uiWidgets || [])
      .map((w: any) => w.assetId)
      .filter((id: any): id is string => !!id);
    wAssets.forEach((aid: string) => {
      const asset = assets.find((a: any) => a.id === aid);
      if (!asset?.url) return;
      let src = asset.url.trim().replace(/\\/g, '/');
      if (src && !src.startsWith('http') && !src.startsWith('/')) src = '/' + src;
      if (widgetImages[src]) return;
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.src = src;
      img.onload = () => setWidgetImages(prev => ({ ...prev, [src]: img }));
      img.onerror = () => console.warn('Widget asset image load failed:', src);
    });
  }, [currentPage?.uiWidgets, (useStudioStore.getState().uiAssets || []).length]);

  const stageRef = useRef<StageType>(null);

  // Interactive states for buttons (hover / pressed)
  const [hoveredButtonId, setHoveredButtonId] = useState<string | null>(null);
  const [pressedButtonId, setPressedButtonId] = useState<string | null>(null);

  // For widgets (Phase 2 drag support)
  const [hoveredWidgetId, setHoveredWidgetId] = useState<string | null>(null);

  // Mouse for live parallax in playtest
  const [mousePos, setMousePos] = useState({ x: width / 2, y: height / 2 });

  const isPlaytest = mode === 'playtest';
  const bgSettings = bgDef?.settings || { scale: 1, offsetX: 0, offsetY: 0, brightness: 1, opacity: 1, fitMode: 'cover', parallax: { enabled: false, speedX: 0.5, speedY: 0.3, reverse: false } };

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

  // Filter widgets by visibleWhen (same logic as buttons). In editor always show for authoring.
  const visibleWidgets = pageWidgets.filter((widget: UIWidget) => {
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

  const speakerNames: Record<string, string> = {
    narrator: 'Рассказчик',
    slay: 'Слэй',
    mila: 'Мила',
    zyrk: 'Зырк',
    zosya: 'Зося',
    burmil: 'Бурмил',
  };

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
              const renderWidgetContent = () => {
                if (widget.type === 'dialogueBox') {
                  const dialogText = currentPage?.text?.ru || '';
                  const boxH = Math.max(48, wH);
                  const innerPad = 14;
                  return (
                    <>
                      <Rect
                        x={0}
                        y={0}
                        width={wW}
                        height={boxH}
                        cornerRadius={10}
                        fill="rgba(33, 29, 24, 0.94)"
                        stroke={isSelected ? '#C5A46E' : '#534B40'}
                        strokeWidth={isSelected ? 2.5 : 1.5}
                        shadowColor="rgba(0,0,0,0.4)"
                        shadowBlur={isSelected ? 8 : 0}
                      />
                      <Text
                        x={innerPad}
                        y={10}
                        width={wW - innerPad * 2}
                        height={boxH - 18}
                        text={dialogText}
                        fontSize={Math.max(11, Math.min(15, Math.round(height / 52)))}
                        fill="#EDE4D4"
                        lineHeight={1.32}
                        wrap="word"
                      />
                    </>
                  );
                }

                if (widget.type === 'textLabel' || widget.type === 'portrait') {
                  const spId = widget.data?.speakerId || currentPage?.speaker || '';
                  const label = speakerNames[spId] || spId || 'Speaker';
                  const asset = widget.assetId ? (useStudioStore.getState().uiAssets || []).find((a: any) => a.id === widget.assetId) : null;
                  let imgSrc = asset?.url ? asset.url.trim().replace(/\\/g, '/') : null;
                  if (imgSrc && !imgSrc.startsWith('http') && !imgSrc.startsWith('/')) imgSrc = '/' + imgSrc;
                  const wImg = imgSrc ? widgetImages[imgSrc] : null;

                  if (wImg && widget.type === 'portrait') {
                    return <KonvaImage image={wImg} width={wW} height={wH} />;
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
                        stroke={isSelected ? '#C5A46E' : '#534B40'}
                        strokeWidth={isSelected ? 2 : 1}
                      />
                      <Text
                        x={0}
                        y={Math.max(2, (wH - 12) / 2)}
                        width={wW}
                        height={wH}
                        text={label}
                        fontSize={Math.max(9, Math.min(12, Math.round(wH * 0.45)))}
                        align="center"
                        fill="#C5A46E"
                        fontStyle="500"
                      />
                    </>
                  );
                }

                if (widget.type === 'choiceButton') {
                  const data = widget.data || {};
                  const linkedBtn = data.linkedButtonId ? currentPage.buttons.find((b: any) => b.id === data.linkedButtonId) : null;
                  const btnText = linkedBtn ? linkedBtn.text.ru : (widget.text?.ru || 'Choice');
                  const isLinked = !!linkedBtn;
                  return (
                    <>
                      <Rect
                        x={0}
                        y={0}
                        width={wW}
                        height={wH}
                        cornerRadius={5}
                        fill={isLinked ? 'rgba(60,50,37,0.92)' : 'rgba(80,65,45,0.85)'}
                        stroke={isSelected ? '#E8D4A0' : (isLinked ? '#C5A46E' : '#8a7655')}
                        strokeWidth={isSelected ? 2.5 : (isLinked ? 1.5 : 1)}
                      />
                      <Text x={2} y={wH / 2 - 6} width={wW} text={btnText} fontSize={11} fill="#EDE4D4" align="center" />
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
                  draggable={!isPlaytestMode}
                  onMouseEnter={() => setHoveredWidgetId(widget.id)}
                  onMouseLeave={() => setHoveredWidgetId(null)}
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
                  onClick={(e) => {
                    e.cancelBubble = true;
                    if (isPlaytestMode && widget.type === 'choiceButton' && (widget.data?.linkedButtonId)) {
                      const linked = currentPage.buttons.find((b: any) => b.id === (widget.data || {}).linkedButtonId);
                      if (linked) {
                        useStudioStore.getState().executeAction(linked.action);
                      }
                      return;
                    }
                    if (!isPlaytestMode) {
                      selectWidget(widget.id);
                      selectButton(null);
                    }
                  }}
                  onTap={(e) => {
                    e.cancelBubble = true;
                    if (isPlaytestMode && widget.type === 'choiceButton' && (widget.data?.linkedButtonId)) {
                      const linked = currentPage.buttons.find((b: any) => b.id === (widget.data || {}).linkedButtonId);
                      if (linked) useStudioStore.getState().executeAction(linked.action);
                      return;
                    }
                    if (!isPlaytestMode) {
                      selectWidget(widget.id);
                      selectButton(null);
                    }
                  }}
                >
                  {/* Optional highlight ring for hover/selected */}
                  {(isSelected || isHovered) && (
                    <Rect
                      x={-3}
                      y={-3}
                      width={wW + 6}
                      height={wH + 6}
                      cornerRadius={8}
                      stroke={isSelected ? '#C5A46E' : '#8a7655'}
                      strokeWidth={1}
                      dash={[3, 2]}
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
