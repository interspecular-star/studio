'use client';

import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStudioStore } from '@/lib/store';
import type { CombatSession } from '@/lib/types/combat-session';
import { DEFAULT_SCENARIOS } from '@/lib/types/combat';

const C = {
  pink:   '#b15539',
  cyan:   '#6f8fb0',
  yellow: '#e0c178',
  red:    '#cf6a5a',
  text:   '#ecdcc0',
  muted:  '#a8916a',
  dim:    '#2a1d10',
};

const WOOD_BG =
  'repeating-linear-gradient(92deg,rgba(0,0,0,0.10) 0px,rgba(0,0,0,0.10) 1px,transparent 1px,transparent 9px),' +
  'repeating-linear-gradient(92deg,rgba(140,104,58,0.05) 3px,transparent 4px,transparent 16px)';

function fmtTime(ticks: number) {
  const s = Math.floor(ticks * 0.2);
  return s >= 60 ? `${Math.floor(s / 60)}м ${s % 60}с` : `${s}с`;
}

function ResultsContent({ session, onExit }: { session: CombatSession; onExit: () => void }) {
  const { applyRewards } = useStudioStore(useShallow(s => ({ applyRewards: s.applyRewards })));
  const [collected, setCollected] = useState(false);
  const [levelUp, setLevelUp] = useState<{ leveledUp: boolean; newLevel: number } | null>(null);
  const isVictory = session.status === 'victory';

  const showtimeCount = session.log.filter(e => e.type === 'showtime').length;
  const timeFmt = fmtTime(session.tick);

  return (
    <div
      className="absolute inset-0 flex flex-col items-center gap-4 text-center px-6 overflow-y-auto py-6"
      style={{ background: '#241810', color: C.text, fontFamily: 'var(--font-body, Hanken Grotesk, system-ui, sans-serif)', backgroundImage: WOOD_BG }}
    >
      {/* Hero badge */}
      <div className="flex flex-col items-center gap-1" style={{ marginTop: 16 }}>
        <div className="text-5xl">{isVictory ? '🏆' : '💀'}</div>
        <div style={{ fontFamily: 'var(--font-dot, DotGothic16, sans-serif)', fontSize: 38, letterSpacing: 6, color: isVictory ? '#9ad27e' : C.red, textShadow: `0 0 30px ${isVictory ? '#7faf6a' : '#b15539'}66` }}>
          {isVictory ? 'СНЯТО!' : 'ПРОВАЛ'}
        </div>
        {isVictory && (
          <div style={{ fontFamily: 'var(--font-mono, Space Mono, monospace)', fontSize: 11, color: '#7faf6a99', letterSpacing: 2 }}>
            Отличная работа, стантмен!
          </div>
        )}
      </div>

      {levelUp?.leveledUp && (
        <div className="rounded-xl px-6 py-3 font-black text-lg animate-pulse"
          style={{ background: C.yellow + '22', border: `2px solid ${C.yellow}`, color: C.yellow }}>
          🎉 УРОВЕНЬ UP! → УР.{levelUp.newLevel}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-3 w-full max-w-xs">
        {[
          { label: 'Убито',       value: String(session.totalKilled),                                                          color: C.pink },
          { label: 'Время',       value: timeFmt,                                                                               color: C.muted },
          { label: 'Макс ×',      value: String(session.maxMomentum),                                                          color: C.yellow },
          { label: 'Showtime',    value: String(showtimeCount),                                                                 color: C.cyan },
          { label: 'Слабых точек', value: String(session.weakSpotHits),                                                        color: C.yellow },
          { label: 'HP осталось', value: `${Math.round((session.playerHp / session.playerHpMax) * 100)}%`,
            color: session.playerHp / session.playerHpMax <= 0.15 ? C.red : '#5ae55a' },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex flex-col items-center rounded-lg py-2 px-1"
            style={{ background: C.dim, gridColumn: label === 'Слабых точек' ? 'span 2' : undefined }}>
            <div className="text-lg font-black leading-none" style={{ color }}>{value}</div>
            <div className="text-[8px] mt-0.5" style={{ color: C.muted }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Rewards */}
      {isVictory && (
        <div className="rounded-xl p-4 flex flex-col gap-2 w-full max-w-xs"
          style={{ background: C.dim, border: `1px solid ${C.pink}44` }}>
          <div className="text-[10px] font-semibold mb-1 tracking-widest" style={{ color: C.muted }}>НАГРАДА</div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: '💰', label: 'Монеты',   value: session.rewards.coins },
              { icon: '⭐', label: 'Опыт',      value: session.rewards.xp },
              { icon: '🎞', label: 'Сталлонки', value: session.rewards.stallonkas },
              ...(session.rewards.souls > 0 ? [{ icon: '💀', label: 'Души', value: session.rewards.souls }] : []),
            ].map(({ icon, label, value }) => (
              <div key={label} className="flex flex-col items-center gap-0.5">
                <span className="text-base">{icon}</span>
                <span className="text-sm font-black" style={{ color: C.text }}>+{value}</span>
                <span className="text-[8px]" style={{ color: C.muted }}>{label}</span>
              </div>
            ))}
          </div>
          {session.rewards.vhsDropped && (
            <div className="text-xs font-semibold text-center mt-1" style={{ color: C.yellow }}>📼 VHS-кассета!</div>
          )}
        </div>
      )}

      {/* Сценарии */}
      {session.scenarioProgress.length > 0 && (
        <div className="w-full max-w-xs">
          <div className="text-[10px] font-semibold mb-2 tracking-widest" style={{ color: C.muted }}>СЦЕНАРИИ</div>
          <div className="flex flex-col gap-1.5 text-left">
            {session.scenarioProgress.map(sp => {
              const def   = DEFAULT_SCENARIOS.find(s => s.id === sp.scenarioId);
              const color = sp.completed ? '#5ae55a' : sp.failed ? C.red : C.muted;
              return (
                <div key={sp.scenarioId} className="rounded-lg px-3 py-2 flex items-center gap-2"
                  style={{ background: color + '11', border: `1px solid ${color}44` }}>
                  <span className="text-sm font-black" style={{ color }}>{sp.completed ? '✓' : sp.failed ? '✗' : '—'}</span>
                  <div className="flex flex-col gap-0.5 flex-1">
                    <span className="text-[10px] font-semibold" style={{ color }}>{def?.name.ru ?? sp.scenarioId}</span>
                    {sp.completed && def && (
                      <span className="text-[8px]" style={{ color: '#7a9a7a' }}>→ {def.reward.ru}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3 pb-4">
        {isVictory && !collected && (
          <button
            onClick={() => { const r = applyRewards(); setLevelUp(r); setCollected(true); }}
            style={{ borderRadius: 8, padding: '12px 28px', fontFamily: 'var(--font-dot, DotGothic16, sans-serif)', fontSize: 16, background: 'rgba(127,175,106,0.18)', color: '#9ad27e', border: '2px solid #7faf6a', cursor: 'pointer' }}>
            ✓ Забрать
          </button>
        )}
        <button
          onClick={onExit}
          style={{ borderRadius: 8, padding: '12px 28px', fontFamily: 'var(--font-dot, DotGothic16, sans-serif)', fontSize: 16, background: '#46341f', color: '#c39b4e', border: '2px solid #6e5430', cursor: 'pointer' }}>
          ← Деревня
        </button>
      </div>
    </div>
  );
}

function EditorPreview() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4"
      style={{ background: '#241810', color: C.text, fontFamily: 'var(--font-body, Hanken Grotesk, system-ui, sans-serif)', backgroundImage: WOOD_BG }}>
      <div className="text-5xl">🏆</div>
      <div style={{ fontFamily: 'var(--font-dot, DotGothic16, sans-serif)', fontSize: 38, letterSpacing: 6, color: '#9ad27e' }}>СНЯТО!</div>
      <div className="text-sm mt-1" style={{ color: C.muted }}>Итоги дубля · показывается после победы / поражения</div>
      <div className="grid grid-cols-4 gap-3 max-w-xs w-full opacity-50 mt-2">
        {[['Убито', '7', C.pink], ['Время', '3:24', C.muted], ['Макс ×', '12', C.yellow], ['Showtime', '3', C.cyan]].map(([l, v, c]) => (
          <div key={String(l)} className="flex flex-col items-center rounded-lg py-2 px-1" style={{ background: C.dim }}>
            <div className="text-lg font-black" style={{ color: String(c) }}>{v}</div>
            <div className="text-[8px]" style={{ color: C.muted }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CombatResultsPage() {
  const { combatSession, endCombat, selectPage } = useStudioStore(useShallow(s => ({
    combatSession: s.combatSession,
    endCombat:     s.endCombat,
    selectPage:    s.selectPage,
  })));

  const handleExit = () => { endCombat(); selectPage('village'); };

  if (!combatSession || (combatSession.status !== 'victory' && combatSession.status !== 'defeat')) {
    return <EditorPreview />;
  }

  return <ResultsContent session={combatSession} onExit={handleExit} />;
}
