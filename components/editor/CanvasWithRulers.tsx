'use client';

import { useStudioStore } from '@/lib/store';
import { useState } from 'react';

interface CanvasWithRulersProps {
  width: number;
  height: number;
  children: React.ReactNode;
}

/**
 * Wraps the main canvas with visual rulers (top + left) and handles guide creation.
 * This is Phase 1 of the rulers + guides system.
 */
export default function CanvasWithRulers({ width, height, children }: CanvasWithRulersProps) {
  const { guides, addGuide, moveGuide, snappingGuide, mode } = useStudioStore();
  const isPlaytest = mode === 'playtest';
  const [hoveredGuide, setHoveredGuide] = useState<{ axis: 'horizontal' | 'vertical'; pos: number } | null>(null);
  const [draggingGuide, setDraggingGuide] = useState<{ axis: 'horizontal' | 'vertical'; originalPos: number } | null>(null);

  const rulerSize = 28; // px - thickness of the rulers

  // Click on top ruler → add vertical guide (affects X position of buttons)
  const handleTopRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPlaytest) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = (clickX / width) * 100;
    addGuide('vertical', percent);
  };

  // Click on left ruler → add horizontal guide (affects Y position)
  const handleLeftRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPlaytest) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const percent = (clickY / height) * 100;
    addGuide('horizontal', percent);
  };

  // Start dragging a guide
  const startDraggingGuide = (axis: 'horizontal' | 'vertical', pos: number, e: React.MouseEvent) => {
    if (isPlaytest) return;
    e.stopPropagation();
    setDraggingGuide({ axis, originalPos: pos });
    setHoveredGuide({ axis, pos });
    useStudioStore.getState().setSnappingGuide(null);
  };

  // Handle mouse move while dragging a guide
  const handleGuideDragMove = (e: React.MouseEvent) => {
    if (!draggingGuide) return;

    const container = e.currentTarget as HTMLDivElement;
    const rect = container.getBoundingClientRect();

    let newPercent: number;

    if (draggingGuide.axis === 'vertical') {
      const mouseX = e.clientX - rect.left;
      newPercent = (mouseX / width) * 100;
    } else {
      const mouseY = e.clientY - rect.top;
      newPercent = (mouseY / height) * 100;
    }

    // Live update visual only during drag (we'll commit on mouse up)
    // For now we just update hovered for visual feedback
    setHoveredGuide({ axis: draggingGuide.axis, pos: Math.max(0, Math.min(100, newPercent)) });
  };

  // Finish dragging
  const finishDraggingGuide = (e: React.MouseEvent) => {
    if (!draggingGuide) return;

    const container = e.currentTarget as HTMLDivElement;
    const rect = container.getBoundingClientRect();

    let finalPercent: number;

    if (draggingGuide.axis === 'vertical') {
      const mouseX = e.clientX - rect.left;
      finalPercent = (mouseX / width) * 100;
    } else {
      const mouseY = e.clientY - rect.top;
      finalPercent = (mouseY / height) * 100;
    }

    const clamped = Math.max(0, Math.min(100, Math.round(finalPercent * 10) / 10));
    moveGuide(draggingGuide.axis, draggingGuide.originalPos, clamped);

    setDraggingGuide(null);
    setHoveredGuide(null);
  };

  // Cancel drag on mouse leave
  const cancelDrag = () => {
    if (draggingGuide) {
      setDraggingGuide(null);
      setHoveredGuide(null);
    }
  };

  return (
    <div className="flex flex-col" style={{ width: width + rulerSize }}>
      {/* Top ruler + corner */}
      <div className="flex">
        {/* Top-left corner square */}
        <div
          className="flex-shrink-0 border-b border-r border-[var(--studio-border-strong)] bg-[var(--studio-bg-panel)]"
          style={{ width: rulerSize, height: rulerSize }}
        />

        {/* Top horizontal ruler */}
        <div
          className="relative cursor-crosshair border-b border-[var(--studio-border-strong)] bg-[var(--studio-bg-elevated)] select-none"
          style={{ width, height: rulerSize }}
          onClick={handleTopRulerClick}
          title="Кликни, чтобы добавить вертикальную направляющую"
        >
          {/* Ruler marks */}
          <div className="absolute inset-0 flex items-end text-[9px] text-[var(--studio-text-muted)] font-mono pointer-events-none">
            {[0, 25, 50, 75, 100].map((p) => (
              <div
                key={p}
                className="absolute flex flex-col items-center"
                style={{ left: `${p}%` }}
              >
                <div className="h-2 w-px bg-[var(--studio-border-strong)]" />
                <span className="mt-0.5 -translate-x-1/2">{p}</span>
              </div>
            ))}
          </div>

          {/* Visual marks for existing vertical guides */}
          {guides.vertical.map((pos, index) => (
            <div
              key={index}
              className="absolute top-0 h-full w-px bg-[var(--studio-accent)] opacity-70"
              style={{ left: `${pos}%` }}
            />
          ))}
        </div>
      </div>

      <div className="flex">
        {/* Left vertical ruler */}
        <div
          className="relative cursor-crosshair flex-shrink-0 border-r border-[var(--studio-border-strong)] bg-[var(--studio-bg-elevated)] select-none"
          style={{ width: rulerSize, height }}
          onClick={handleLeftRulerClick}
          title="Кликни, чтобы добавить горизонтальную направляющую"
        >
          {/* Ruler marks */}
          <div className="absolute inset-0 flex flex-col text-[9px] text-[var(--studio-text-muted)] font-mono pointer-events-none">
            {[0, 25, 50, 75, 100].map((p) => (
              <div
                key={p}
                className="absolute flex items-center"
                style={{ top: `${p}%` }}
              >
                <div className="w-2 h-px bg-[var(--studio-border-strong)] mr-0.5" />
                <span>{p}</span>
              </div>
            ))}
          </div>

          {/* Visual marks for existing horizontal guides */}
          {guides.horizontal.map((pos, index) => (
            <div
              key={index}
              className="absolute left-0 w-full h-px bg-[var(--studio-accent)] opacity-70"
              style={{ top: `${pos}%` }}
            />
          ))}
        </div>

        {/* The actual canvas area + guide overlays */}
        <div
          className="relative"
          style={{ width, height }}
          onMouseMove={isPlaytest ? undefined : (draggingGuide ? handleGuideDragMove : undefined)}
          onMouseUp={isPlaytest ? undefined : (draggingGuide ? finishDraggingGuide : undefined)}
          onMouseLeave={isPlaytest ? undefined : cancelDrag}
        >
          {children}

          {/* Guide lines - now draggable to reposition. Deletion only from sidebar. */}
          {/* Vertical guides (control X) */}
          {guides.vertical.map((pos, index) => {
            const isSnapping = snappingGuide?.vertical !== undefined && Math.abs(snappingGuide.vertical - pos) < 0.1;
            const isHovered = (hoveredGuide?.axis === 'vertical' && hoveredGuide.pos === pos) || 
                              (draggingGuide?.axis === 'vertical' && Math.abs(draggingGuide.originalPos - pos) < 0.1);
            const isActive = isSnapping || isHovered;

            const displayPos = isActive && draggingGuide ? hoveredGuide!.pos : pos;

            return (
              <div
                key={`v-${index}`}
                className="absolute top-0 bottom-0 z-20 cursor-col-resize group"
                style={{ left: `${displayPos}%`, width: '8px', marginLeft: '-4px' }}
                onMouseDown={(e) => startDraggingGuide('vertical', pos, e)}
                onMouseEnter={() => !draggingGuide && setHoveredGuide({ axis: 'vertical', pos })}
                onMouseLeave={() => !draggingGuide && setHoveredGuide(null)}
                title={`Направляющая ${pos.toFixed(1)}% — перетаскивайте для перемещения`}
              >
                <div
                  className="absolute top-0 bottom-0 w-[2px] transition-all"
                  style={{
                    left: '4px',
                    background: isActive
                      ? (isSnapping ? '#F4EDE0' : '#E8D4A0')
                      : 'linear-gradient(to bottom, transparent, #C5A46E 12%, #C5A46E 88%, transparent)',
                    opacity: isActive ? 1 : 0.7,
                    boxShadow: isActive ? (isSnapping ? '0 0 10px rgba(244, 237, 224, 0.8)' : '0 0 6px rgba(197, 164, 110, 0.6)') : 'none',
                    width: isSnapping ? '3px' : '2px',
                  }}
                />
                {isSnapping && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-[#1C1814] text-[#F4EDE0] text-[10px] px-1.5 py-0.5 rounded border border-[#C5A46E] font-mono shadow">
                    {pos.toFixed(1)}%
                  </div>
                )}
              </div>
            );
          })}

          {/* Horizontal guides (control Y) */}
          {guides.horizontal.map((pos, index) => {
            const isSnapping = snappingGuide?.horizontal !== undefined && Math.abs(snappingGuide.horizontal - pos) < 0.1;
            const isHovered = (hoveredGuide?.axis === 'horizontal' && hoveredGuide.pos === pos) || 
                              (draggingGuide?.axis === 'horizontal' && Math.abs(draggingGuide.originalPos - pos) < 0.1);
            const isActive = isSnapping || isHovered;
            const displayPos = isActive && draggingGuide ? hoveredGuide!.pos : pos;

            return (
              <div
                key={`h-${index}`}
                className="absolute left-0 right-0 z-20 cursor-row-resize group"
                style={{ top: `${displayPos}%`, height: '8px', marginTop: '-4px' }}
                onMouseDown={(e) => startDraggingGuide('horizontal', pos, e)}
                onMouseEnter={() => !draggingGuide && setHoveredGuide({ axis: 'horizontal', pos })}
                onMouseLeave={() => !draggingGuide && setHoveredGuide(null)}
                title={`Направляющая ${pos.toFixed(1)}% — перетаскивайте для перемещения`}
              >
                <div
                  className="absolute left-0 right-0 h-[2px] transition-all"
                  style={{
                    top: '4px',
                    background: isActive
                      ? (isSnapping ? '#F4EDE0' : '#E8D4A0')
                      : 'linear-gradient(to right, transparent, #C5A46E 12%, #C5A46E 88%, transparent)',
                    opacity: isActive ? 1 : 0.7,
                    boxShadow: isActive ? (isSnapping ? '0 0 10px rgba(244, 237, 224, 0.8)' : '0 0 6px rgba(197, 164, 110, 0.6)') : 'none',
                    height: isSnapping ? '3px' : '2px',
                  }}
                />
                {isSnapping && (
                  <div className="absolute -left-12 top-1/2 -translate-y-1/2 bg-[#1C1814] text-[#F4EDE0] text-[10px] px-1.5 py-0.5 rounded border border-[#C5A46E] font-mono shadow">
                    {pos.toFixed(1)}%
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Small hint below the canvas */}
      <div className="text-[10px] text-[var(--studio-text-muted)] mt-1 pl-[28px]">
        Клик по верхней линейке — вертикальная направляющая • Клик по левой — горизонтальная
      </div>
    </div>
  );
}
