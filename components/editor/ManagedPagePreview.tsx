'use client';

interface ManagedPagePreviewProps {
  pageId: string;
  label?: string;
}

export default function ManagedPagePreview({ pageId, label = 'Игровой экран' }: ManagedPagePreviewProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none select-none"
      style={{ background: 'rgba(14,10,7,0.82)' }}>
      <div style={{ fontFamily: 'var(--font-silk, monospace)', fontSize: 11, letterSpacing: 2, color: '#c39b4e' }}>
        MANAGED PAGE
      </div>
      <div style={{ fontFamily: 'var(--font-dot, sans-serif)', fontSize: 22, color: '#e7d8b4' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 10, color: '#8a724a' }}>
        {pageId}
      </div>
      <div className="mt-2 px-3 py-1.5 rounded text-xs" style={{ background: '#1a120a', border: '1px solid #3a2c18', color: '#a8916a' }}>
        Запусти Playtest чтобы увидеть экран
      </div>
    </div>
  );
}
