'use client';

import { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Rect, Text, Group, Image as KonvaImage } from 'react-konva';
import type { Stage as StageType } from 'konva/lib/Stage';

import { useStudioStore } from '@/lib/store';
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
    backgrounds,
    guides,
    snapEnabled,
    mode,
    playtestState,
  } = useStudioStore();

  const [customBgImage, setCustomBgImage] = useState<HTMLImageElement | null>(null);

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

  const stageRef = useRef<StageType>(null);

  // Interactive states for buttons (hover / pressed)
  const [hoveredButtonId, setHoveredButtonId] = useState<string | null>(null);
  const [pressedButtonId, setPressedButtonId] = useState<string | null>(null);

  // Mouse for live parallax in playtest
  const [mousePos, setMousePos] = useState({ x: width / 2, y: height / 2 });

  const isPlaytest = mode === 'playtest';
  const bgSettings = bgDef?.settings || { scale: 1, offsetX: 0, offsetY: 0, brightness: 1, opacity: 1, fitMode: 'cover', parallax: { enabled: false, speedX: 0.5, speedY: 0.3, reverse: false } };

  const pctToPx = (pct: number, total: number) => (pct / 100) * total;

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

  const handleButtonClick = (buttonId: string, e: any) => {
    e.cancelBubble = true;
    selectButton(buttonId);
  };

  const handleStageClick = (e: any) => {
    if (e.target === e.target.getStage()) {
      selectButton(null);
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

          {/* Speaker pill + Dialogue box are only shown when there is a real speaker.
              If "Нет диалога / Игровой режим" (speaker === 'none') is selected,
              the page is treated as pure gameplay and the visual dialog elements are hidden. */}
          {currentPage.speaker && currentPage.speaker !== 'none' && (
            <>
              {/* Speaker name pill */}
              <Group x={width / 2 - 80} y={height * 0.58}>
                <Rect
                  x={0}
                  y={0}
                  width={160}
                  height={28}
                  cornerRadius={4}
                  fill="rgba(0,0,0,0.55)"
                  stroke="#534B40"
                  strokeWidth={1}
                />
                <Text
                  x={0}
                  y={6}
                  width={160}
                  text={speakerNames[currentPage.speaker] || currentPage.speaker}
                  fontSize={12}
                  align="center"
                  fill="#C5A46E"
                  fontStyle="500"
                />
              </Group>

              {/* Dialogue box - scales with canvas height for different resolutions */}
              {(() => {
                const dialogH = Math.max(65, Math.min(100, Math.round(height * 0.11)));
                const textH = Math.max(40, dialogH - 26);
                return (
                  <Group x={width * 0.16} y={height * 0.78}>
                    <Rect
                      x={0}
                      y={0}
                      width={width * 0.68}
                      height={dialogH}
                      cornerRadius={10}
                      fill="rgba(33, 29, 24, 0.94)"
                      stroke="#534B40"
                      strokeWidth={1.5}
                    />
                    <Text
                      x={18}
                      y={12}
                      width={width * 0.68 - 36}
                      height={textH}
                      text={currentPage.text.ru}
                      fontSize={Math.max(12, Math.min(16, Math.round(height / 50)))}
                      fill="#EDE4D4"
                      lineHeight={1.35}
                      wrap="word"
                    />
                  </Group>
                );
              })()}
            </>
          )}

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
                <Text
                  width={btnW}
                  height={btnH}
                  text={button.text.ru}
                  fontSize={14}
                  fill={textColor}
                  align="center"
                  verticalAlign="middle"
                  fontStyle="500"
                  opacity={isEnabled ? 1 : 0.85}
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
