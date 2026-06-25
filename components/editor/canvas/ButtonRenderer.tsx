'use client';

import { Group, Rect, Text, Image as KonvaImage } from 'react-konva';
import type { StudioButton } from '@/lib/store';
import { useStudioStore } from '@/lib/store';
import { getSnappedButtonPosition } from '@/lib/snapping';
import { evaluateCondition } from '@/lib/conditions';

interface ButtonRendererProps {
  button: StudioButton;
  isPlaytest: boolean;
  width: number;
  height: number;
  selectedButtonId: string | null;
  hoveredButtonId: string | null;
  pressedButtonId: string | null;
  buttonImages: Record<string, HTMLImageElement>;
  buttonNodeRefs: React.MutableRefObject<Map<string, any>>;
  playtestVariableValues: Record<string, number | boolean | string>;
  guides: { horizontal: number[]; vertical: number[] };
  snapEnabled: boolean;
  handleButtonClick: (id: string, e: any) => void;
  handleButtonDragEnd: (id: string, e: any) => void;
  setHoveredButtonId: (id: string | null) => void;
  setPressedButtonId: (id: string | null) => void;
}

export default function ButtonRenderer({
  button,
  isPlaytest,
  width,
  height,
  selectedButtonId,
  hoveredButtonId,
  pressedButtonId,
  buttonImages,
  buttonNodeRefs,
  playtestVariableValues,
  guides,
  snapEnabled,
  handleButtonClick,
  handleButtonDragEnd,
  setHoveredButtonId,
  setPressedButtonId,
}: ButtonRendererProps) {
  const isSelected = button.id === selectedButtonId;
  const btnX = (button.layout.x / 100) * width;
  const btnY = (button.layout.y / 100) * height;
  const btnW = (button.layout.width / 100) * width;
  const btnH = (button.layout.height / 100) * height;

  const getVarValueForEnabled = (variableId: string) => {
    const live = playtestVariableValues[variableId];
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

  let accentColor: string;
  let bgColor: string;
  let strokeWidth: number;
  let textColor = '#F4EDE0';
  let buttonOpacity = 1;
  let shadowBlur = isSelected ? 14 : 7;
  let shadowOpacity = 1;

  if (isEnabled) {
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

    if (isHovered && !isPressed) {
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
      onMouseEnter={() => { if (isEnabled) setHoveredButtonId(button.id); }}
      onMouseLeave={() => { setHoveredButtonId(null); setPressedButtonId(null); }}
      onMouseDown={() => { if (isEnabled) setPressedButtonId(button.id); }}
      onMouseUp={() => setPressedButtonId(null)}
      onDragMove={(e) => {
        if (isPlaytest) return;
        const node = e.target;
        const cx = (node.x() / width) * 100;
        const cy = (node.y() / height) * 100;

        if (snapEnabled) {
          const snap = getSnappedButtonPosition(
            { x: cx, y: cy, width: button.layout.width, height: button.layout.height },
            guides,
            2.0
          );
          node.x((snap.x / 100) * width);
          node.y((snap.y / 100) * height);
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
        if (isPlaytest) return;
        handleButtonDragEnd(button.id, e);
      }}
      onClick={(e: any) => {
        if (!isEnabled) return;
        e.cancelBubble = true;
        if (isPlaytest) {
          useStudioStore.getState().executeAction(button.action);
        } else {
          handleButtonClick(button.id, e);
        }
      }}
      onTap={(e: any) => {
        if (!isEnabled) return;
        if (isPlaytest) {
          useStudioStore.getState().executeAction(button.action);
        } else {
          handleButtonClick(button.id, e);
        }
      }}
    >
      {btnImg ? (
        <KonvaImage image={btnImg} width={btnW} height={btnH} opacity={isEnabled ? 0.95 : 0.6} />
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
}
