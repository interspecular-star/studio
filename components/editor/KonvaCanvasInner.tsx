'use client';

import { useRef } from 'react';
import { Stage, Layer, Rect, Text, Group } from 'react-konva';
import type { Stage as StageType } from 'konva/lib/Stage';

import { useStudioStore } from '@/lib/store';
import { getSnappedButtonPosition } from '@/lib/snapping';

// Background themes for different locations (warm, atmospheric)
const backgroundThemes: Record<string, { top: string; bottom: string; nameRu: string; nameEn: string }> = {
  village_morning: {
    top: '#2C3A2F',
    bottom: '#1A251C',
    nameRu: 'Табуреткино • Утро',
    nameEn: 'Taburetkiно • Morning',
  },
  tavern: {
    top: '#3F2E22',
    bottom: '#2A2118',
    nameRu: 'Таверна «У Кривой Козы»',
    nameEn: 'Tavern "Crooked Goat"',
  },
  cave: {
    top: '#1F2A35',
    bottom: '#121A22',
    nameRu: 'Пещера Слэя',
    nameEn: "Slay's Cave",
  },
  forest: {
    top: '#1E2F1E',
    bottom: '#121C12',
    nameRu: 'Лес у Границы Миров',
    nameEn: 'Forest near the World Boundary',
  },
};

interface KonvaCanvasInnerProps {
  width?: number;
  height?: number;
}

export default function KonvaCanvasInner({ width = 960, height = 600 }: KonvaCanvasInnerProps) {
  const { 
    pages, 
    selectedPageId, 
    selectedButtonId, 
    selectButton, 
    moveButton, 
    guides,
    snapEnabled 
  } = useStudioStore();
  const stageRef = useRef<StageType>(null);

  const currentPage = pages.find((p) => p.id === selectedPageId);
  if (!currentPage) {
    return (
      <div className="flex h-full w-full items-center justify-center text-[var(--studio-text-muted)]">
        Выберите страницу
      </div>
    );
  }

  const theme = backgroundThemes[currentPage.background] || backgroundThemes.village_morning;

  const pctToPx = (pct: number, total: number) => (pct / 100) * total;

  const handleButtonDragEnd = (buttonId: string, e: any) => {
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
        style={{ background: '#111' }}
      >
        <Layer>
          {/* Warm gradient background */}
          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            fillLinearGradientStartPoint={{ x: 0, y: 0 }}
            fillLinearGradientEndPoint={{ x: 0, y: height }}
            fillLinearGradientColorStops={[0, theme.top, 1, theme.bottom]}
          />

          {/* Subtle vignette for depth */}
          <Rect x={0} y={0} width={width} height={height} fill="rgba(0,0,0,0.28)" />

          {/* Location label */}
          <Text
            x={28}
            y={24}
            text={theme.nameRu}
            fontSize={13}
            fontFamily="var(--font-geist-sans)"
            fill="#B8A88A"
            opacity={0.7}
          />

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

          {/* Dialogue box */}
          <Group x={width * 0.16} y={height * 0.78}>
            <Rect
              x={0}
              y={0}
              width={width * 0.68}
              height={78}
              cornerRadius={10}
              fill="rgba(33, 29, 24, 0.94)"
              stroke="#534B40"
              strokeWidth={1.5}
            />
            <Text
              x={18}
              y={14}
              width={width * 0.68 - 36}
              height={52}
              text={currentPage.text.ru}
              fontSize={14.5}
              fill="#EDE4D4"
              lineHeight={1.38}
              wrap="word"
            />
          </Group>

          {/* Draggable Buttons */}
          {currentPage.buttons.map((button) => {
            const isSelected = button.id === selectedButtonId;
            const btnX = pctToPx(button.layout.x, width);
            const btnY = pctToPx(button.layout.y, height);
            const btnW = pctToPx(button.layout.width, width);
            const btnH = pctToPx(button.layout.height, height);

            const accentColor = isSelected ? '#E8D4A0' : '#C5A46E';
            const bgColor = isSelected ? 'rgba(62, 52, 37, 0.94)' : 'rgba(55, 45, 32, 0.9)';

            return (
              <Group
                key={button.id}
                x={btnX}
                y={btnY}
                draggable
                onDragMove={(e) => {
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
                onDragEnd={(e) => handleButtonDragEnd(button.id, e)}
                onClick={(e) => handleButtonClick(button.id, e)}
                onTap={(e) => handleButtonClick(button.id, e)}
              >
                <Rect
                  width={btnW}
                  height={btnH}
                  cornerRadius={6}
                  fill={bgColor}
                  stroke={accentColor}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  shadowColor="rgba(0,0,0,0.55)"
                  shadowBlur={isSelected ? 14 : 7}
                  shadowOffsetY={3}
                />
                <Text
                  width={btnW}
                  height={btnH}
                  text={button.text.ru}
                  fontSize={14}
                  fill="#F4EDE0"
                  align="center"
                  verticalAlign="middle"
                  fontStyle="500"
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
