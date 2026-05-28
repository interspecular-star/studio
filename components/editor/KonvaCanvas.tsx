'use client';

import dynamic from 'next/dynamic';

// This wrapper ensures Konva only loads on the client.
// All heavy Konva logic lives in KonvaCanvasInner (which is never SSR'd).
const KonvaCanvasInner = dynamic(
  () => import('./KonvaCanvasInner'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex h-[600px] w-[960px] items-center justify-center rounded-2xl border border-[var(--studio-border-strong)] bg-[#161310] text-[var(--studio-text-muted)]">
        Загрузка визуального редактора...
      </div>
    )
  }
);

interface KonvaCanvasProps {
  width?: number;
  height?: number;
}

export default function KonvaCanvas({ width = 960, height = 600 }: KonvaCanvasProps) {
  return <KonvaCanvasInner width={width} height={height} />;
}
