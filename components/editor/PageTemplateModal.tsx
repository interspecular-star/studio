'use client';

import { useEffect } from 'react';
import type { StudioPage } from '@/lib/types/pages';

const TEMPLATES: Array<{
  id: string;
  icon: string;
  title: string;
  desc: string;
  overrides: Partial<StudioPage>;
}> = [
  {
    id: 'blank',
    icon: '🗒️',
    title: 'Чистая',
    desc: 'Пустая страница без контента',
    overrides: {},
  },
  {
    id: 'dialog',
    icon: '💬',
    title: 'Диалог',
    desc: 'Сцена с репликами персонажа',
    overrides: {
      sceneType: 'dialog',
      speaker: 'narrator',
      showTopResourceBar: false,
      uiLayoutPreset: 'classic_vn',
      uiWidgets: [
        { id: `uiw_${Date.now().toString(36)}_a`, type: 'dialogueBox', layout: { x: 16, y: 78, width: 68, height: 12, z: 20 }, style: 'default' },
        { id: `uiw_${Date.now().toString(36)}_b`, type: 'textLabel',   layout: { x: 42, y: 58, width: 16, height: 3,  z: 15 }, style: 'default', data: { speakerId: 'narrator' } },
      ],
    },
  },
  {
    id: 'choice',
    icon: '📋',
    title: 'Меню выбора',
    desc: 'Несколько вариантов ответа для игрока',
    overrides: {
      sceneType: 'menu',
      showTopResourceBar: false,
      buttons: [
        { id: `btn_${Date.now().toString(36)}_1`, text: { ru: 'Вариант 1', en: 'Option 1' }, layout: { x: 25, y: 60, width: 50, height: 10, style: 'default' }, action: { type: 'advanceDialogue' } },
        { id: `btn_${Date.now().toString(36)}_2`, text: { ru: 'Вариант 2', en: 'Option 2' }, layout: { x: 25, y: 73, width: 50, height: 10, style: 'default' }, action: { type: 'advanceDialogue' } },
      ],
    },
  },
  {
    id: 'transition',
    icon: '🚪',
    title: 'Переход-сцена',
    desc: 'Экран с кнопкой перехода в другое место',
    overrides: {
      sceneType: 'exploration',
      buttons: [
        { id: `btn_${Date.now().toString(36)}_go`, text: { ru: '→ Продолжить', en: '→ Continue' }, layout: { x: 30, y: 80, width: 40, height: 12, style: 'important' }, action: { type: 'goToPage', pageId: 'village' } },
      ],
    },
  },
  {
    id: 'combat_entry',
    icon: '⚔️',
    title: 'Вход в бой',
    desc: 'Кнопка «Примерочная» для боевой сцены',
    overrides: {
      sceneType: 'combat',
      showTopResourceBar: false,
      buttons: [
        { id: `btn_${Date.now().toString(36)}_fight`, text: { ru: '🎬 В Примерочную', en: '🎬 Dressing Room' }, layout: { x: 25, y: 68, width: 50, height: 14, style: 'important' }, action: { type: 'goToPage', pageId: 'war_path' } },
      ],
    },
  },
];

interface Props {
  actId: string | null;
  onClose: () => void;
  onAdd: (actId: string | null, overrides: Partial<StudioPage>) => void;
}

export default function PageTemplateModal({ actId, onClose, onAdd }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(10,7,4,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="flex flex-col rounded-xl overflow-hidden shadow-2xl"
        style={{ background: '#1e1509', border: '1px solid #5a4226', width: 540, maxWidth: '92vw' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #3a2c18' }}>
          <span className="text-sm font-semibold" style={{ fontFamily: 'var(--font-dot, DotGothic16, sans-serif)', color: '#e7d8b4', letterSpacing: 1 }}>
            НОВАЯ СТРАНИЦА
          </span>
          <button onClick={onClose} className="text-[var(--studio-text-muted)] hover:text-[var(--studio-text-primary)] text-lg leading-none">✕</button>
        </div>

        {/* Template grid */}
        <div className="grid grid-cols-5 gap-3 p-4">
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => { onAdd(actId, t.overrides); onClose(); }}
              className="flex flex-col items-center gap-2 rounded-lg p-3 text-center transition-all hover:brightness-125 active:scale-95"
              style={{ background: '#241810', border: '1px solid #3a2c18', cursor: 'pointer' }}
            >
              <span className="text-2xl">{t.icon}</span>
              <span className="text-[11px] font-semibold leading-tight" style={{ color: '#e0c178', fontFamily: 'var(--font-silk, monospace)' }}>
                {t.title}
              </span>
              <span className="text-[9px] leading-tight" style={{ color: '#a8916a' }}>
                {t.desc}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
