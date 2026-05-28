import type { StudioButton } from './store';

export type Guides = {
  horizontal: number[]; // percentages
  vertical: number[];
};

export type SnapResult = {
  x: number;
  y: number;
  snappedToVertical?: number;   // which vertical guide we snapped X to
  snappedToHorizontal?: number; // which horizontal guide we snapped Y to
};

/**
 * Calculates snapped position for a button based on current guides.
 * Snaps left/center/right edges to vertical guides.
 * Snaps top/center/bottom edges to horizontal guides.
 */
export function getSnappedButtonPosition(
  layout: Pick<StudioButton['layout'], 'x' | 'y' | 'width' | 'height'>,
  guides: Guides,
  threshold = 1.8 // in percentage points
): SnapResult {
  let finalX = layout.x;
  let finalY = layout.y;
  let snappedToVertical: number | undefined;
  let snappedToHorizontal: number | undefined;

  const left = layout.x;
  const centerX = layout.x + layout.width / 2;
  const right = layout.x + layout.width;

  const top = layout.y;
  const centerY = layout.y + layout.height / 2;
  const bottom = layout.y + layout.height;

  // === Vertical guides (affect X) ===
  if (guides.vertical.length > 0) {
    const candidates = [
      { edge: left, type: 'left' as const },
      { edge: centerX, type: 'centerX' as const },
      { edge: right, type: 'right' as const },
    ];

    let bestDist = Infinity;
    let bestGuide: number | null = null;
    let bestType: 'left' | 'centerX' | 'right' | null = null;

    for (const guide of guides.vertical) {
      for (const cand of candidates) {
        const dist = Math.abs(cand.edge - guide);
        if (dist < bestDist && dist <= threshold) {
          bestDist = dist;
          bestGuide = guide;
          bestType = cand.type;
        }
      }
    }

    if (bestGuide !== null && bestType) {
      snappedToVertical = bestGuide;

      if (bestType === 'left') {
        finalX = bestGuide;
      } else if (bestType === 'centerX') {
        finalX = bestGuide - layout.width / 2;
      } else if (bestType === 'right') {
        finalX = bestGuide - layout.width;
      }

      // Keep within reasonable bounds
      finalX = Math.max(0, Math.min(100 - layout.width, finalX));
    }
  }

  // === Horizontal guides (affect Y) ===
  if (guides.horizontal.length > 0) {
    const candidates = [
      { edge: top, type: 'top' as const },
      { edge: centerY, type: 'centerY' as const },
      { edge: bottom, type: 'bottom' as const },
    ];

    let bestDist = Infinity;
    let bestGuide: number | null = null;
    let bestType: 'top' | 'centerY' | 'bottom' | null = null;

    for (const guide of guides.horizontal) {
      for (const cand of candidates) {
        const dist = Math.abs(cand.edge - guide);
        if (dist < bestDist && dist <= threshold) {
          bestDist = dist;
          bestGuide = guide;
          bestType = cand.type;
        }
      }
    }

    if (bestGuide !== null && bestType) {
      snappedToHorizontal = bestGuide;

      if (bestType === 'top') {
        finalY = bestGuide;
      } else if (bestType === 'centerY') {
        finalY = bestGuide - layout.height / 2;
      } else if (bestType === 'bottom') {
        finalY = bestGuide - layout.height;
      }

      finalY = Math.max(0, Math.min(100 - layout.height, finalY));
    }
  }

  return {
    x: Math.round(finalX * 10) / 10,
    y: Math.round(finalY * 10) / 10,
    snappedToVertical,
    snappedToHorizontal,
  };
}
