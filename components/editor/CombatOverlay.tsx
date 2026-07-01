'use client';

import { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStudioStore } from '@/lib/store';
import type { CombatSession, SpawnedEnemy, AttackSignal, CombatLogEntry } from '@/lib/types/combat-session';
import type { Difficulty, SkillId } from '@/lib/types/combat';
import { DEFAULT_INSTINCTS, DEFAULT_SKILLS } from '@/lib/types/combat';

// ── Palette — Wood & Brass ────────────────────────────────────────────────────
const C = {
  bg:     '#1b130b',
  pink:   '#b15539',
  cyan:   '#6f8fb0',
  yellow: '#e0c178',
  red:    '#cf6a5a',
  text:   '#ecdcc0',
  muted:  '#a8916a',
  dim:    '#2a1d10',
};

const DIFF_COUNT: Record<Difficulty, number> = {
  novice: 3, amateur: 5, professional: 7, stuntman: 9, hollywood: 12, super_endless: 20,
};
const BOSS_DIFFS: Difficulty[] = ['professional', 'stuntman', 'hollywood', 'super_endless'];
const SLOT_COLORS: [string, string, string] = [C.pink, C.cyan, C.yellow];

function cdSec(ticks: number) { return (ticks * 0.2).toFixed(1) + 'с'; }

// ── HUD sub-components ────────────────────────────────────────────────────────

function PlayerBars({ session }: { session: CombatSession }) {
  const hpPct = Math.round((session.playerHp / Math.max(1, session.playerHpMax)) * 100);
  const mpPct = Math.round((session.playerMp / Math.max(1, session.playerMpMax)) * 100);
  const lowHp = hpPct <= 20;
  return (
    <div className="flex flex-col gap-1.5 min-w-[130px]">
      <div className="flex flex-col gap-0.5">
        <div className="flex justify-between text-[10px] font-mono" style={{ color: lowHp ? C.red : C.muted }}>
          <span>HP</span><span>{session.playerHp}/{session.playerHpMax}</span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: C.dim }}>
          <div className="h-full rounded-full transition-all duration-100"
            style={{ width: `${hpPct}%`, background: lowHp ? C.red : '#e55a5a' }} />
        </div>
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="flex justify-between text-[10px] font-mono" style={{ color: C.muted }}>
          <span>MP</span><span>{session.playerMp}/{session.playerMpMax}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: C.dim }}>
          <div className="h-full rounded-full transition-all duration-100"
            style={{ width: `${mpPct}%`, background: C.cyan }} />
        </div>
      </div>
    </div>
  );
}

function MomentumBlock({ momentum, enragedTicks }: { momentum: number; enragedTicks: number }) {
  const color = momentum >= 10 ? C.pink : C.yellow;
  return (
    <div className="flex flex-col items-center">
      <div className="font-black leading-none transition-all" style={{ fontSize: '3rem', color, fontFamily: 'monospace', textShadow: `0 0 20px ${color}88` }}>
        ×{momentum}
      </div>
      <div className="text-[9px] font-bold mt-0.5 font-mono" style={{ color }}>
        +{momentum}% УРОН
      </div>
      <div className="text-[9px] font-semibold tracking-widest" style={{ color: C.muted }}>
        {enragedTicks > 0 ? '📷 ЯРОСТЬ' : 'MOMENTUM'}
      </div>
    </div>
  );
}

function WaveProgress({ session }: { session: CombatSession }) {
  const total = DIFF_COUNT[session.difficulty] + (session.bossSpawned ? 0 : (session.spawnQueue.some(id => id.startsWith('boss:')) ? 1 : 0));
  const killed = session.totalKilled;
  const [blink, setBlink] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setBlink(b => !b), 600);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full" style={{ background: blink ? C.red : 'transparent', transition: 'background 0.3s' }} />
        <span className="text-[10px] font-black tracking-widest" style={{ color: C.red }}>REC</span>
      </div>
      <div className="text-xs font-mono" style={{ color: C.muted }}>
        {killed} / {total + killed - (session.spawnQueue.length + session.enemies.length)} убито
      </div>
      <div className="flex gap-0.5 flex-wrap justify-end max-w-[120px]">
        {Array.from({ length: DIFF_COUNT[session.difficulty] }).map((_, i) => (
          <div key={i} className="w-2 h-2 rounded-sm" style={{ background: i < killed ? C.yellow : C.dim }} />
        ))}
        {session.spawnQueue.some(id => id.startsWith('boss:')) && (
          <div className="w-2 h-2 rounded-sm text-[6px] flex items-center justify-center" style={{ background: session.bossSpawned ? C.pink : C.dim, color: C.text }}>★</div>
        )}
      </div>
    </div>
  );
}

function SignalOverlay({ signal }: { signal: AttackSignal }) {
  const cfg = {
    red:    { color: C.pink,   text: '🔴 УКЛОНИСЬ!', sub: 'красный удар' },
    yellow: { color: C.yellow, text: '🟡 ПАРИРУЙ!',   sub: 'жёлтый — парировать' },
    blue:   { color: C.cyan,   text: '🔵 УКЛОНИСЬ!', sub: 'синий удар' },
  }[signal.type];
  const pct = (signal.ticksLeft / signal.windowTicks) * 100;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl gap-2 z-10"
      style={{ background: cfg.color + '18', backdropFilter: 'blur(2px)', border: `2px solid ${cfg.color}` }}>
      <div className="text-xl font-black" style={{ color: cfg.color, textShadow: `0 0 24px ${cfg.color}` }}>
        {cfg.text}
      </div>
      <div className="text-[10px]" style={{ color: C.muted }}>{cfg.sub} · {signal.damage} урон</div>
      <div className="h-2 w-3/4 rounded-full overflow-hidden" style={{ background: C.dim }}>
        <div className="h-full rounded-full transition-all duration-100" style={{ width: `${pct}%`, background: cfg.color }} />
      </div>
    </div>
  );
}

function EnemyZone({ session, onAttack }: { session: CombatSession; onAttack: (id: string) => void }) {
  const storeData = useStudioStore(useShallow(s => ({ enemies: s.enemies, bosses: s.bosses })));
  const enemy: SpawnedEnemy | null = session.enemies[0] ?? null;
  const def = enemy
    ? ([...storeData.enemies, ...storeData.bosses] as any[]).find((e: any) => e.id === enemy.enemyId)
    : null;

  const borderColor = enemy?.isBoss ? C.yellow : C.pink;

  return (
    <div className="relative flex flex-col gap-3 rounded-2xl p-5 cursor-pointer transition-all"
      style={{
        border: `2px solid ${borderColor}`,
        minHeight: 180, minWidth: 320, maxWidth: 480, width: '100%',
        boxShadow: enemy ? `0 0 30px ${borderColor}33` : 'none',
        background: 'rgba(10,9,16,0.85)',
      }}
      onClick={() => enemy && onAttack(enemy.instanceId)}>

      {session.pendingSignal && session.enemies.some(e => e.instanceId === session.pendingSignal?.enemyInstanceId) && (
        <SignalOverlay signal={session.pendingSignal} />
      )}

      {enemy ? (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-black" style={{ color: C.text }}>
              {def?.name?.ru ?? enemy.enemyId}
            </span>
            <span className="text-[9px] rounded px-1.5 py-0.5 font-bold" style={{ background: borderColor + '33', color: borderColor }}>
              T{enemy.tier}
            </span>
            {enemy.isFuryMode && (
              <span className="text-[9px] rounded px-1.5 py-0.5 font-bold" style={{ background: C.red + '33', color: C.red }}>FURY</span>
            )}
            {enemy.isStaggered && (
              <span className="text-[9px] rounded px-1.5 py-0.5 font-bold" style={{ background: '#aa55ff33', color: '#aa55ff' }}>STAGGER</span>
            )}
            {enemy.isBoss && enemy.currentPhase === 1 && (
              <span className="text-[9px] rounded px-1.5 py-0.5 font-bold" style={{ background: C.cyan + '33', color: C.cyan }}>ЩИТ</span>
            )}
            {enemy.isBoss && enemy.breakBarStunTicks > 0 && (
              <span className="text-[9px] rounded px-1.5 py-0.5 font-bold animate-pulse" style={{ background: C.yellow + '33', color: C.yellow }}>💥 БРЕЙК ×2 урон</span>
            )}
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between text-[10px] font-mono" style={{ color: C.muted }}>
              <span>HP</span><span>{enemy.hp}/{enemy.hpMax}</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: C.dim }}>
              <div className="h-full rounded-full transition-all duration-150"
                style={{ width: `${(enemy.hp / enemy.hpMax) * 100}%`, background: C.pink }} />
            </div>
          </div>

          {enemy.isBoss && enemy.breakBarMax > 0 && (
            <div className="flex flex-col gap-0.5">
              <div className="flex justify-between text-[9px] font-mono" style={{ color: C.muted }}>
                <span>BREAK BAR</span><span>{enemy.breakBar}/{enemy.breakBarMax}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: C.dim }}>
                <div className="h-full rounded-full transition-all duration-150"
                  style={{ width: `${(enemy.breakBar / enemy.breakBarMax) * 100}%`, background: '#aaaaaa' }} />
              </div>
            </div>
          )}

          {enemy.weakPointActive && (
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: C.yellow, boxShadow: `0 0 8px ${C.yellow}` }} />
              <span className="text-[10px] font-semibold" style={{ color: C.yellow }}>
                слабая точка{def?.weakPointTrigger?.ru ? ` · ${def.weakPointTrigger.ru}` : ''}
              </span>
            </div>
          )}

          {!enemy.isBoss && (
            <div className="h-1 rounded-full overflow-hidden" style={{ background: C.dim }}>
              <div className="h-full rounded-full transition-all duration-150"
                style={{ width: `${enemy.stagger}%`, background: '#aa55ff' }} />
            </div>
          )}
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-sm" style={{ color: C.muted }}>
            {session.spawnQueue.length > 0 ? 'Следующий враг появится…' : ''}
          </span>
        </div>
      )}
    </div>
  );
}

function ShowtimeBar({ showtime }: { showtime: number }) {
  const full  = showtime >= 100;
  const color = full ? C.yellow : C.cyan;
  return (
    <div className="flex flex-col gap-1 w-full max-w-md mx-auto">
      <div className="flex justify-between text-[10px] font-bold" style={{ color }}>
        <span style={{ letterSpacing: '0.15em' }}>
          SHOWTIME {full ? <span className="animate-pulse">⚡ ГОТОВ! · Alt</span> : ''}
        </span>
        <span className="font-mono">{Math.min(100, showtime)}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: C.dim }}>
        <div className="h-full rounded-full transition-all duration-150"
          style={{ width: `${Math.min(100, showtime)}%`, background: `linear-gradient(90deg, ${C.cyan}, ${color})`, boxShadow: full ? `0 0 16px ${C.yellow}` : 'none' }} />
      </div>
    </div>
  );
}

const WB_VT:   React.CSSProperties = { fontFamily: 'var(--font-vt, VT323, monospace)', lineHeight: 1 };
const WB_SILK: React.CSSProperties = { fontFamily: 'var(--font-silk, Silkscreen, monospace)', letterSpacing: '0.5px' };
const WB_MONO: React.CSSProperties = { fontFamily: 'var(--font-mono, Space Mono, monospace)' };
const WB_DOT:  React.CSSProperties = { fontFamily: 'var(--font-dot, DotGothic16, sans-serif)' };

function SkillBar({ session, onUseSkill, onAttack, onDodge, onParry, onShowtime, isAuto, setIsAuto }: {
  session: CombatSession;
  onUseSkill: (i: 0 | 1 | 2) => void;
  onAttack: () => void;
  onDodge: () => void;
  onParry: () => void;
  onShowtime: () => void;
  isAuto: boolean;
  setIsAuto: (v: boolean) => void;
}) {
  const hasPending  = !!session.pendingSignal;
  const canParry    = session.pendingSignal?.type === 'yellow';
  const canShowtime = session.showtime >= 100;
  const frozen      = session.playerFreezeTicks > 0;
  const hasEnemy    = session.enemies.length > 0;
  const atkOnCd     = session.playerAttackCooldownTicks > 0;
  const atkCdSec    = (session.playerAttackCooldownTicks * 0.2).toFixed(1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', width: '100%', gap: 14 }}>

      {/* LEFT — УКЛОН + ПАРИР */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
        <button onClick={onDodge} disabled={!hasPending || isAuto || frozen}
          style={{ width: 90, height: 90, borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, background: 'radial-gradient(circle at 50% 38%,#2c4636,#19261c)', border: `2px solid ${hasPending && !frozen ? '#9ad27e' : '#7faf6a44'}`, boxShadow: hasPending ? '0 3px 0 #2c4a36,0 6px 14px rgba(0,0,0,0.45),inset 0 0 14px rgba(127,175,106,0.2)' : 'none', cursor: hasPending && !frozen ? 'pointer' : 'not-allowed', opacity: hasPending && !frozen ? 1 : 0.45 }}>
          <span style={{ fontSize: 30 }}>💨</span>
          <span style={{ ...WB_DOT, fontSize: '12px', color: '#9ad27e' }}>УКЛОН</span>
        </button>
        <button onClick={onParry} disabled={!canParry || isAuto || frozen}
          style={{ width: 90, height: 90, borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, background: 'radial-gradient(circle at 50% 38%,#283a4a,#18242e)', border: `2px solid ${canParry && !frozen ? '#9ab8d4' : '#6f8fb044'}`, boxShadow: canParry ? '0 3px 0 #2c4258,0 6px 14px rgba(0,0,0,0.45),inset 0 0 14px rgba(111,143,176,0.2)' : 'none', cursor: canParry && !frozen ? 'pointer' : 'not-allowed', opacity: canParry && !frozen ? 1 : 0.45 }}>
          <span style={{ fontSize: 30 }}>🛡️</span>
          <span style={{ ...WB_DOT, fontSize: '12px', color: '#9ab8d4' }}>ПАРИР.</span>
        </button>
      </div>

      {/* CENTER — SHOWTIME */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1 }}>
        <ShowtimeBar showtime={session.showtime} />
        <button onClick={onShowtime} disabled={!canShowtime || isAuto}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 15, width: '100%', maxWidth: 344, height: 68, borderRadius: 12, border: `2px solid ${canShowtime ? '#ffd66b' : '#6e5430'}`, background: canShowtime ? 'linear-gradient(180deg,#3a2a12,#2a1d0e)' : '#1c1409', boxShadow: canShowtime ? '0 0 22px rgba(255,214,107,0.45),inset 0 0 14px rgba(255,214,107,0.18)' : 'inset 0 2px 6px rgba(0,0,0,0.5)', cursor: canShowtime && !isAuto ? 'pointer' : 'not-allowed', opacity: canShowtime ? 1 : 0.78, overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${session.showtime}%`, background: 'linear-gradient(90deg,rgba(195,155,78,0.12),rgba(224,193,120,0.32))', transition: 'width 0.3s' }} />
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ width: 30, height: 6, background: 'repeating-linear-gradient(115deg,#e7d8b4 0,#e7d8b4 5px,#2e2012 5px,#2e2012 10px)', borderRadius: 1, transformOrigin: 'left bottom', transform: canShowtime ? 'rotate(-34deg)' : 'rotate(-6deg)', transition: 'transform 0.3s' }} />
            <div style={{ width: 30, height: 18, background: '#2e2012', border: '1px solid #e7d8b4', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ ...WB_SILK, fontSize: '7px', color: '#e7d8b4' }}>7</span>
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{ ...WB_DOT, fontSize: '20px', color: canShowtime ? '#ffe9a8' : '#9a8a5e' }}>SHOWTIME</div>
            <div style={{ ...WB_MONO, fontSize: '10px', color: canShowtime ? '#e0c178' : '#6e5e44' }}>{canShowtime ? 'ГОТОВ · Alt' : `заряд ${Math.min(100, session.showtime)}%`}</div>
          </div>
        </button>
      </div>

      {/* RIGHT — навыки + АТАКА */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 9 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {([0, 1, 2] as const).map(i => {
            const skillId = session.skillSlots[i];
            const cd      = session.skillCooldowns[i];
            const skill   = skillId ? DEFAULT_SKILLS[skillId] : null;
            const ready   = cd === 0 && session.playerMp >= (skill?.mpCost ?? 0);
            const isActiveSkill = (skillId === 'dodge_roll' && session.pendingDodgeRoll) || (skillId === 'counter' && session.pendingCounter);
            return (
              <button key={i} onClick={() => onUseSkill(i)}
                disabled={!skillId || cd > 0 || frozen || isAuto}
                style={{ position: 'relative', cursor: (!skillId || cd > 0 || frozen || isAuto) ? 'not-allowed' : 'pointer', width: 52, height: 52, borderRadius: 10, border: `1.5px solid ${isActiveSkill ? '#e0c178' : ready ? '#6e5430' : '#3a2c18'}`, background: isActiveSkill ? '#2a2113' : ready ? '#2a1d11' : '#15100a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 21, opacity: (!skillId || frozen || isAuto) ? 0.4 : 1 }}>
                {skill?.name.ru ? <span style={{ ...WB_SILK, fontSize: '7px', color: ready ? '#e0c178' : '#6e5e44', textAlign: 'center', lineHeight: 1.2 }}>{skill.name.ru.slice(0,6)}</span> : <span style={{ color: '#5a4226' }}>—</span>}
                {cd > 0 && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,7,4,0.72)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ ...WB_VT, fontSize: '19px', color: '#cf6a5a' }}>{cdSec(cd)}</span>
                  </div>
                )}
                <span style={{ ...WB_SILK, fontSize: '7px', color: '#5a4226', position: 'absolute', bottom: 2, right: 4 }}>{i + 1}</span>
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
          <button onClick={onAttack} disabled={!hasEnemy || hasPending || isAuto || frozen || atkOnCd}
            style={{ width: 72, height: 72, borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at 50% 38%,#3a2a12,#241809)', border: `2px solid ${atkOnCd ? '#6e4a1c' : '#a9762a'}`, boxShadow: '0 3px 0 #6e4a1c,0 6px 12px rgba(0,0,0,0.45)', cursor: (!hasEnemy || hasPending || isAuto || frozen || atkOnCd) ? 'not-allowed' : 'pointer', opacity: (!hasEnemy || hasPending || frozen || isAuto) ? 0.4 : 1 }}>
            <span style={{ fontSize: 24 }}>💥</span>
            <span style={{ ...WB_DOT, fontSize: '10px', color: '#e0c178' }}>СИЛА</span>
            <span style={{ ...WB_MONO, fontSize: '7px', color: '#8a724a' }}>−8MP</span>
          </button>
          <button onClick={onAttack} disabled={!hasEnemy || hasPending || isAuto || frozen || atkOnCd}
            style={{ width: 98, height: 98, borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, background: atkOnCd ? '#4a3a1c' : 'radial-gradient(circle at 50% 36%,#e7d8b4,#c39b4e)', border: `2px solid ${atkOnCd ? '#6e5430' : '#f0e3c0'}`, boxShadow: '0 4px 0 #8a6a36,0 7px 16px rgba(0,0,0,0.5)', cursor: (!hasEnemy || hasPending || isAuto || frozen || atkOnCd) ? 'not-allowed' : 'pointer', opacity: (!hasEnemy || hasPending || frozen || isAuto) ? 0.45 : 1 }}>
            {atkOnCd ? (
              <span style={{ ...WB_VT, fontSize: '28px', color: '#e0c178' }}>{atkCdSec}с</span>
            ) : (
              <>
                <span style={{ fontSize: 34 }}>🗡️</span>
                <span style={{ ...WB_DOT, fontSize: '13px', color: '#2e2012' }}>АТАКА</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ScenarioChips({ session }: { session: CombatSession }) {
  if (session.scenarioProgress.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 max-w-[220px]">
      {session.scenarioProgress.map(sp => {
        const color = sp.completed ? '#5ae55a' : sp.failed ? C.red : C.muted;
        const icon  = sp.completed ? '✓' : sp.failed ? '✗' : '○';
        return (
          <div key={sp.scenarioId}
            className="rounded px-1.5 py-0.5 text-[9px] font-semibold"
            style={{ background: color + '22', color, border: `1px solid ${color}44` }}>
            {icon} {sp.scenarioId}
          </div>
        );
      })}
    </div>
  );
}

function LogTicker({ log }: { log: CombatLogEntry[] }) {
  const recent = log.slice(-5).reverse();
  const fmt = (e: CombatLogEntry): { text: string; color: string } => {
    switch (e.type) {
      case 'playerAttack': return { text: `⚔ ${e.value}${e.isCrit ? ' ★КРИТ!' : ''}${e.isWeakSpot ? ' 🎯' : ''}`, color: e.isCrit ? C.yellow : C.text };
      case 'enemyAttack':  return { text: `💥 −${e.value}`, color: C.red };
      case 'playerDodge':  return { text: e.text === 'passive' ? '💨 уклон (пасс.)' : '💨 уклон', color: C.cyan };
      case 'playerParry':  return { text: '🛡 парирование', color: C.yellow };
      case 'enemyDeath':   return { text: `☠ враг убит`, color: C.pink };
      case 'showtime':     return { text: e.value ? `✨ SHOWTIME ${e.value} урона!` : '✨ SHOWTIME!', color: C.yellow };
      case 'stagger':      return { text: '⚡ Stagger!', color: '#aa55ff' };
      case 'phaseChange':  return { text: `🔥 Фаза ${e.value}`, color: C.pink };
      case 'randomEvent':  return { text: `🎲 ${e.text ?? ''}`, color: C.cyan };
      default:             return { text: e.text ?? e.type, color: C.muted };
    }
  };
  return (
    <div className="flex flex-col gap-0.5 min-w-[160px]">
      {recent.map((e, i) => {
        const { text, color } = fmt(e);
        return (
          <div key={i} className="text-[9px] font-mono truncate font-semibold" style={{ color, opacity: 1 - i * 0.18 }}>
            {text}
          </div>
        );
      })}
    </div>
  );
}

// ── Combat HUD ────────────────────────────────────────────────────────────────

function CombatHUD({ session }: { session: CombatSession }) {
  const {
    combatPlayerAttack, combatPlayerDodge, combatPlayerParry,
    combatActivateShowtime, combatTick, combatUseSkill, endCombat,
    variables, playtestState,
  } = useStudioStore(useShallow(s => ({
    combatPlayerAttack:     s.combatPlayerAttack,
    combatPlayerDodge:      s.combatPlayerDodge,
    combatPlayerParry:      s.combatPlayerParry,
    combatActivateShowtime: s.combatActivateShowtime,
    combatTick:             s.combatTick,
    combatUseSkill:         s.combatUseSkill,
    endCombat:              s.endCombat,
    variables:              s.variables,
    playtestState:          s.playtestState,
  })));

  const getVar = (name: string): number => {
    const v = variables.find((vv: any) => vv.name === name);
    if (!v) return 0;
    const live = playtestState.variableValues[v.id];
    return typeof live === 'number' ? live : (v.defaultValue as number) ?? 0;
  };
  const coins = getVar('coins');
  const vhs   = getVar('vhs');

  const [isAuto, setIsAuto] = useState(false);

  // ── Showtime badge + border glow ─────────────────────────────────────────
  const [flashVisible,  setFlashVisible]  = useState(false);
  const [flashOpacity,  setFlashOpacity]  = useState(0);
  const [badgeVisible,  setBadgeVisible]  = useState(false);
  const [badgeOpacity,  setBadgeOpacity]  = useState(0);
  const [flashDmg,      setFlashDmg]      = useState(0);
  const [flashMult,     setFlashMult]     = useState(0);
  const lastShowtimeCountRef = useRef(0);
  const logRef               = useRef(session.log);
  logRef.current = session.log;

  const showtimeCount = session.log.filter(e => e.type === 'showtime').length;

  useEffect(() => {
    if (showtimeCount <= lastShowtimeCountRef.current) return;
    lastShowtimeCountRef.current = showtimeCount;

    const log = logRef.current;
    let dmg = 0; let mult = 0;
    for (let i = log.length - 1; i >= 0; i--) {
      if (log[i].type === 'showtime') {
        dmg = log[i].value ?? 0;
        const m = log[i].text?.match(/×([\d.]+)/);
        mult = m ? parseFloat(m[1]) : 0;
        break;
      }
    }
    setFlashDmg(dmg); setFlashMult(mult);

    setFlashVisible(true); setFlashOpacity(1);
    const r1 = requestAnimationFrame(() => requestAnimationFrame(() => setFlashOpacity(0)));
    const t1 = setTimeout(() => setFlashVisible(false), 1900);

    setBadgeVisible(true); setBadgeOpacity(1);
    const r2 = requestAnimationFrame(() => requestAnimationFrame(() => {
      setTimeout(() => setBadgeOpacity(0), 800);
    }));
    const t2 = setTimeout(() => setBadgeVisible(false), 1900);

    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); clearTimeout(t1); clearTimeout(t2); };
  }, [showtimeCount]);

  const target  = session.enemies[0] ?? null;
  const frozen  = session.playerFreezeTicks > 0;
  const activeInstinct = DEFAULT_INSTINCTS.find(i => i.id === session.activeInstinctId);

  const sessionRef = useRef(session);
  sessionRef.current = session;
  const actRef = useRef({ combatPlayerAttack, combatPlayerDodge, combatPlayerParry, combatActivateShowtime, combatTick, combatUseSkill });
  actRef.current = { combatPlayerAttack, combatPlayerDodge, combatPlayerParry, combatActivateShowtime, combatTick, combatUseSkill };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isAuto) return;
      const s = sessionRef.current;
      const a = actRef.current;
      if (s.status !== 'active') return;
      switch (e.code) {
        case 'Space': {
          e.preventDefault();
          const t = s.enemies[0];
          if (t && !s.pendingSignal && s.playerAttackCooldownTicks === 0) a.combatPlayerAttack(t.instanceId, false);
          break;
        }
        case 'ControlLeft': e.preventDefault(); a.combatPlayerDodge(); break;
        case 'ShiftLeft':   e.preventDefault(); a.combatPlayerParry(); break;
        case 'AltLeft':     e.preventDefault(); if (s.showtime >= 100) a.combatActivateShowtime(); break;
        case 'Digit1':      a.combatUseSkill(0); break;
        case 'Digit2':      a.combatUseSkill(1); break;
        case 'Digit3':      a.combatUseSkill(2); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isAuto]);

  useEffect(() => {
    if (!isAuto) return;
    const id = setInterval(() => {
      const s = sessionRef.current;
      const a = actRef.current;
      if (s.status !== 'active') { setIsAuto(false); return; }
      if (s.pendingSignal) {
        s.pendingSignal.type === 'yellow' ? a.combatPlayerParry() : a.combatPlayerDodge();
        return;
      }
      if (s.showtime >= 100) { a.combatActivateShowtime(); return; }
      if (s.enemies.length > 0 && s.playerAttackCooldownTicks === 0) { a.combatPlayerAttack(s.enemies[0].instanceId, false); return; }
    }, 80);
    return () => clearInterval(id);
  }, [isAuto]);

  const VT   = { fontFamily: 'var(--font-vt, VT323, monospace)',       lineHeight: 1 } as React.CSSProperties;
  const SILK = { fontFamily: 'var(--font-silk, Silkscreen, monospace)', letterSpacing: '0.5px' } as React.CSSProperties;
  const MONO = { fontFamily: 'var(--font-mono, Space Mono, monospace)' } as React.CSSProperties;
  const DOT  = { fontFamily: 'var(--font-dot, DotGothic16, sans-serif)' } as React.CSSProperties;

  const [blink, setBlink] = useState(true);
  useEffect(() => { const t = setInterval(() => setBlink(b => !b), 600); return () => clearInterval(t); }, []);

  return (
    <div className="absolute inset-0 flex flex-col"
      style={{ background: '#241810', color: '#ecdcc0', fontFamily: 'var(--font-body, Hanken Grotesk, system-ui, sans-serif)', backgroundImage: 'repeating-linear-gradient(92deg,rgba(0,0,0,0.10) 0px,rgba(0,0,0,0.10) 1px,transparent 1px,transparent 9px),repeating-linear-gradient(92deg,rgba(140,104,58,0.05) 3px,transparent 4px,transparent 16px)' }}>

      {/* ── SHOWTIME BORDER GLOW ─────────────────────────────── */}
      {flashVisible && (
        <div className="absolute inset-0 z-50 pointer-events-none"
          style={{ opacity: flashOpacity, transition: 'opacity 1.8s ease-out' }}>
          <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at center, ${C.yellow}22 0%, transparent 65%)` }} />
          <div style={{ border: `3px solid ${C.yellow}99`, position: 'absolute', inset: 6, borderRadius: 9, boxShadow: `0 0 40px ${C.yellow}55, inset 0 0 30px ${C.yellow}0a` }} />
        </div>
      )}

      {/* ── HUD BAR ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 18px', background: '#1a120a', borderBottom: '1px solid #5a4226', flexShrink: 0, zIndex: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={endCombat}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 11px', background: '#46341f', border: '1px solid #6e5430', borderRadius: 4, color: '#c39b4e', fontSize: 12, cursor: 'pointer' }}>
            ← примерочная
          </button>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ ...DOT, fontSize: '14px', color: '#e7d8b4' }}>СЛЭЙ</span>
            <span style={{ ...MONO, fontSize: '10px', color: '#a8916a' }}>наёмник</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* HP */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ ...MONO, fontSize: '10px', color: '#7faf6a' }}>♥</span>
            <div style={{ width: 150, height: 9, background: '#2a1d10', border: '1px solid #3a2c18', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.round((session.playerHp / Math.max(1, session.playerHpMax)) * 100)}%`, background: session.playerHp / session.playerHpMax <= 0.2 ? '#cf6a5a' : '#7faf6a', transition: 'width 0.3s' }} />
            </div>
            <span style={{ ...VT, fontSize: '15px', color: '#9ad27e', minWidth: 62 }}>{session.playerHp}/{session.playerHpMax}</span>
          </div>
          {/* MP */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ ...MONO, fontSize: '10px', color: '#6f8fb0' }}>✦</span>
            <div style={{ width: 96, height: 9, background: '#2a1d10', border: '1px solid #3a2c18', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.round((session.playerMp / Math.max(1, session.playerMpMax)) * 100)}%`, background: '#6f8fb0', transition: 'width 0.3s' }} />
            </div>
            <span style={{ ...VT, fontSize: '15px', color: '#9ab8d4', minWidth: 46 }}>{session.playerMp}/{session.playerMpMax}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: '#161009', border: '1px solid #3a2c18', borderRadius: 4 }}>
            <span style={{ fontSize: 12 }}>💰</span>
            <span style={{ ...VT, fontSize: '16px', color: '#e0c178' }}>{coins}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: '#161009', border: '1px solid #3a2c18', borderRadius: 4 }}>
            <span style={{ fontSize: 12 }}>📼</span>
            <span style={{ ...VT, fontSize: '16px', color: '#b8a888' }}>{vhs}</span>
          </div>
          <div style={{ cursor: 'pointer', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#2a1d11', border: '1px solid #4a3722', borderRadius: 4, fontSize: 13 }}>🎒</div>
          <button onClick={() => setIsAuto(!isAuto)}
            style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isAuto ? 'rgba(127,175,106,0.2)' : '#2a1d11', border: `1px solid ${isAuto ? '#7faf6a' : '#4a3722'}`, borderRadius: 4, cursor: 'pointer', ...SILK, fontSize: '11px', color: isAuto ? '#7faf6a' : '#c39b4e' }}>
            {isAuto ? 'A' : '≡'}
          </button>
        </div>
      </div>

      {/* ── TITLE STRIP ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 20px', background: 'linear-gradient(180deg,#2f2114,#241810)', borderBottom: '1px solid #5a4226', flexShrink: 0, zIndex: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ ...DOT, fontSize: '18px', color: '#e7d8b4' }}>СЪЁМКА</span>
          <span style={{ ...MONO, fontSize: '10px', color: '#a8916a' }}>дубль идёт</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ ...MONO, fontSize: '10px', color: '#a8916a' }}>ВОЛНА</span>
            <span style={{ ...VT, fontSize: '18px', color: '#e0c178' }}>{session.totalKilled + 1} / {session.enemies.length + session.spawnQueue.length + session.totalKilled}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '3px 10px', background: '#161009', border: '1px solid #6e3a2a', borderRadius: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: blink ? '#d44444' : 'transparent', display: 'inline-block', transition: 'background 0.3s' }} />
            <span style={{ ...MONO, fontSize: '11px', color: '#d98a6a' }}>REC</span>
          </div>
        </div>
      </div>

      {/* ── STATUS STRIP ─────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-3 px-4 shrink-0 min-h-[24px]" style={{ background: '#1c140a' }}>
        {activeInstinct && (
          <div className="rounded px-2 py-0.5 text-[9px] font-semibold"
            style={{ background: C.cyan + '22', color: C.cyan, border: `1px solid ${C.cyan}44` }}>
            ⚡ {activeInstinct.name.ru}
          </div>
        )}
        {session.activeEventFlash && (
          <div className="rounded-lg px-3 py-1 text-[10px] font-semibold"
            style={{ background: C.yellow + '22', color: C.yellow, border: `1px solid ${C.yellow}44` }}>
            🎲 {session.activeEventFlash.name}
          </div>
        )}
        {frozen && (
          <div className="rounded-lg px-3 py-1 text-[10px] font-black animate-pulse"
            style={{ background: C.cyan + '22', color: C.cyan, border: `1px solid ${C.cyan}` }}>
            🥶 ЗАМОРОЖЕН {(session.playerFreezeTicks * 0.2).toFixed(1)}с
          </div>
        )}
        {!activeInstinct && !session.activeEventFlash && !frozen && (
          <span style={{ fontSize: 9, color: '#5a4226' }}>КАМЕРА ПИШЕТ</span>
        )}
      </div>

      {/* ── STAGE ────────────────────────────────────────────── */}
      <div className="flex-1 relative min-h-0" style={{ background: 'radial-gradient(ellipse at 60% 35%, #2c1f12 0%, #1b130b 70%)', backgroundImage: 'repeating-linear-gradient(180deg,rgba(255,255,255,0.025) 0px,rgba(255,255,255,0.025) 1px,transparent 1px,transparent 3px)', boxShadow: 'inset 0 0 120px 20px rgba(0,0,0,0.55)' }}>

        {/* COMBO — top-left */}
        <div style={{ position: 'absolute', top: 16, left: 22, zIndex: 2 }}>
          <div style={{ ...MONO, fontSize: '10px', color: '#8a724a', letterSpacing: '1px' }}>КОМБО</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ ...VT, fontSize: '54px', color: session.momentum >= 10 ? '#ffd66b' : session.momentum >= 4 ? '#e0c178' : '#c39b4e', textShadow: session.momentum >= 4 ? `0 0 14px #e0c17866` : 'none' }}>×{session.momentum}</span>
            <span style={{ ...VT, fontSize: '20px', color: '#8a724a' }}>ударов: {session.totalKilled}</span>
          </div>
        </div>

        {/* SHOWTIME BADGE */}
        {badgeVisible && flashDmg > 0 && (
          <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 5, opacity: badgeOpacity, transition: 'opacity 1.0s ease-out', pointerEvents: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '8px 20px', background: `${C.yellow}18`, border: `1px solid ${C.yellow}66`, boxShadow: `0 0 24px ${C.yellow}44`, borderRadius: 8 }}>
              {flashMult > 0 && <span style={{ ...VT, fontSize: '20px', color: C.yellow }}>×{flashMult.toFixed(1)}</span>}
              <span style={{ ...VT, fontSize: '30px', color: C.text, textShadow: `0 0 16px ${C.yellow}` }}>{flashDmg}</span>
              <span style={{ fontSize: '12px', color: C.yellow + 'cc' }}>урона</span>
            </div>
          </div>
        )}

        {/* ENEMY — center */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <EnemyZone session={session} onAttack={(id) => !isAuto && combatPlayerAttack(id, false)} />
        </div>

        {/* COMBAT LOG — bottom-right */}
        <div style={{ position: 'absolute', bottom: 14, right: 22, width: 280, zIndex: 2 }}>
          <LogTicker log={session.log} />
          <ScenarioChips session={session} />
        </div>

        {/* HERO CARD — bottom-left */}
        <div style={{ position: 'absolute', bottom: 14, left: 22, display: 'flex', alignItems: 'center', gap: 11, padding: '9px 12px', background: 'rgba(22,16,9,0.85)', border: '1px solid #3a2c18', borderRadius: 8, zIndex: 2 }}>
          <div style={{ width: 48, height: 48, border: '2px solid #c39b4e', borderRadius: 6, background: 'repeating-linear-gradient(45deg,#2a1d10,#2a1d10 5px,#211610 5px,#211610 10px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 3 }}>
            <span style={{ ...SILK, fontSize: '7px', color: '#c39b4e' }}>СЛЭЙ</span>
          </div>
          <div>
            <div style={{ ...DOT, fontSize: '13px', color: '#e7d8b4' }}>Слэй</div>
            <div style={{ ...MONO, fontSize: '9px', color: '#a8916a' }}>наёмник · в ударе</div>
          </div>
        </div>
      </div>

      {/* ── ACTION BAR ──────────────────────────────────────── */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14, padding: '12px 22px 16px', background: '#1a120a', borderTop: '1px solid #5a4226', zIndex: 3, minHeight: 168, flexShrink: 0 }}>
        <div style={{ position: 'absolute', left: -50, bottom: -80, width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(127,175,106,0.07), transparent 66%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: -50, bottom: -80, width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, rgba(224,193,120,0.08), transparent 66%)', pointerEvents: 'none' }} />
        <SkillBar
          session={session}
          onUseSkill={combatUseSkill}
          onAttack={() => target && !isAuto && combatPlayerAttack(target.instanceId, false)}
          onDodge={() => !isAuto && combatPlayerDodge()}
          onParry={() => !isAuto && combatPlayerParry()}
          onShowtime={() => !isAuto && combatActivateShowtime()}
          isAuto={isAuto}
          setIsAuto={setIsAuto}
        />
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function CombatOverlay() {
  const { combatSession, combatTick, selectPage } = useStudioStore(useShallow(s => ({
    combatSession: s.combatSession,
    combatTick:    s.combatTick,
    selectPage:    s.selectPage,
  })));

  const tickRef = useRef(combatTick);
  tickRef.current = combatTick;

  useEffect(() => {
    if (!combatSession || combatSession.status !== 'active') return;
    const id = setInterval(() => tickRef.current(), 200);
    return () => clearInterval(id);
  }, [combatSession?.status, combatSession?.id]);

  useEffect(() => {
    if (combatSession?.status === 'victory' || combatSession?.status === 'defeat') {
      selectPage('combat_results');
    }
  }, [combatSession?.status, selectPage]);

  if (!combatSession || combatSession.status !== 'active') return null;

  return (
    <div className="absolute inset-0 z-40 overflow-hidden">
      <CombatHUD session={combatSession} />
    </div>
  );
}
