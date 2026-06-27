'use client';

import { useEffect, useRef, useState } from 'react';
import { useStudioStore } from '@/lib/store';
import type { CombatSession, SpawnedEnemy, AttackSignal } from '@/lib/types/combat-session';
import type { Difficulty } from '@/lib/types/combat';
import { DIFFICULTY_LABELS } from '@/lib/types/combat';

// ── Helpers ───────────────────────────────────────────────────────────────────

const DIFFICULTIES: Difficulty[] = ['novice', 'amateur', 'professional', 'stuntman', 'hollywood'];

function Bar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const pct = Math.round((value / Math.max(1, max)) * 100);
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between text-[10px] font-mono" style={{ color: '#A89880' }}>
        <span>{label}</span>
        <span>{value}/{max}</span>
      </div>
      <div className="h-3 w-full rounded-full overflow-hidden" style={{ background: '#1A1612' }}>
        <div
          className="h-full rounded-full transition-all duration-100"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function SignalFlash({ signal }: { signal: AttackSignal }) {
  const colors: Record<AttackSignal['type'], { bg: string; label: string; hint: string }> = {
    red:    { bg: '#FF2222', label: '⚡ УДАР!',    hint: 'Уклоняйся!' },
    yellow: { bg: '#FFDD22', label: '🛡 ПАРИРУЙ!', hint: 'Парируй или уклонись' },
    blue:   { bg: '#2288FF', label: '💨 УКЛОН!',  hint: 'Уклоняйся!' },
  };
  const c = colors[signal.type];
  const pct = (signal.ticksLeft / signal.windowTicks) * 100;
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl px-6 py-4 gap-2"
      style={{ background: c.bg + '22', border: `2px solid ${c.bg}`, minWidth: 200 }}
    >
      <div className="text-2xl font-black" style={{ color: c.bg, textShadow: `0 0 16px ${c.bg}` }}>{c.label}</div>
      <div className="text-xs" style={{ color: '#A89880' }}>{c.hint}</div>
      <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: '#1A1612' }}>
        <div className="h-full rounded-full transition-all duration-100" style={{ width: `${pct}%`, background: c.bg }} />
      </div>
    </div>
  );
}

// ── Wave Select ───────────────────────────────────────────────────────────────

function WaveSelect() {
  const { waves, startCombat } = useStudioStore(s => ({
    waves: s.waves,
    startCombat: s.startCombat,
  }));
  const [selectedWave, setSelectedWave] = useState<string>('');
  const [difficulty, setDifficulty] = useState<Difficulty>('amateur');

  const wave = waves.find(w => w.id === selectedWave);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-8">
      <div className="text-3xl font-black tracking-widest" style={{ color: '#F0EDE8' }}>🎬 СЪЁМКА</div>
      <div className="text-sm" style={{ color: '#A89880' }}>Выберите волну и сложность</div>

      {waves.length === 0 ? (
        <div className="rounded-xl p-6 text-center max-w-sm" style={{ background: '#1A1612', border: '1px solid #3A3028' }}>
          <div className="text-2xl mb-2">📋</div>
          <div className="text-sm font-semibold mb-1" style={{ color: '#F0EDE8' }}>Нет волн</div>
          <div className="text-xs leading-relaxed" style={{ color: '#A89880' }}>
            Добавьте волны в редакторе:<br />
            Правая панель → Мир → Боёвка → Волны
          </div>
        </div>
      ) : (
        <>
          {/* Wave list */}
          <div className="flex flex-col gap-2 w-full max-w-xs">
            {waves.map(w => (
              <button
                key={w.id}
                onClick={() => setSelectedWave(w.id)}
                className="rounded-xl px-4 py-3 text-left transition-all"
                style={{
                  background: selectedWave === w.id ? '#C25D3A22' : '#1A1612',
                  border: `1px solid ${selectedWave === w.id ? '#C25D3A' : '#3A3028'}`,
                  color: '#F0EDE8',
                }}
              >
                <div className="font-semibold text-sm">{w.name.ru}</div>
                <div className="text-[10px] mt-0.5" style={{ color: '#A89880' }}>
                  {w.enemyPool.length} типов врагов{w.bossId ? ' · Босс!' : ''}
                </div>
              </button>
            ))}
          </div>

          {/* Difficulty */}
          <div className="flex flex-wrap gap-2 justify-center">
            {DIFFICULTIES.map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                style={{
                  background: difficulty === d ? '#C25D3A' : '#2A2018',
                  color: difficulty === d ? '#F0EDE8' : '#A89880',
                  border: `1px solid ${difficulty === d ? '#C25D3A' : '#3A3028'}`,
                }}
              >
                {DIFFICULTY_LABELS[d]}
              </button>
            ))}
          </div>

          {/* Start */}
          <button
            onClick={() => { if (selectedWave) startCombat(selectedWave, difficulty); }}
            disabled={!selectedWave}
            className="rounded-xl px-10 py-4 text-lg font-black tracking-wide transition-all disabled:opacity-40"
            style={{ background: selectedWave ? '#C25D3A' : '#3A3028', color: '#F0EDE8', border: '2px solid #E0703E' }}
          >
            ▶ НАЧАТЬ
          </button>
        </>
      )}
    </div>
  );
}

// ── Enemy Card ────────────────────────────────────────────────────────────────

function EnemyCard({ enemy, isTarget, onAttack }: { enemy: SpawnedEnemy; isTarget: boolean; onAttack: () => void }) {
  const storeEnemies = useStudioStore(s => [...s.enemies, ...s.bosses]);
  const def = storeEnemies.find(e => e.id === enemy.enemyId);

  const hpPct = (enemy.hp / enemy.hpMax) * 100;
  const staggerPct = enemy.stagger;

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2 cursor-pointer transition-all"
      onClick={onAttack}
      style={{
        background: isTarget ? '#1A1612' : '#130F0C',
        border: `2px solid ${isTarget ? '#C25D3A' : '#2A2018'}`,
        minWidth: 160,
      }}
    >
      {/* Name + status */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold" style={{ color: '#F0EDE8' }}>
          {def ? def.name.ru : enemy.enemyId}
        </span>
        {enemy.isBoss && <span className="text-[9px] bg-yellow-600 text-yellow-100 rounded px-1">БОСС</span>}
        {enemy.isFuryMode && <span className="text-[9px] bg-red-700 text-red-100 rounded px-1">FURY</span>}
        {enemy.isStaggered && <span className="text-[9px] bg-purple-700 text-purple-100 rounded px-1">STAGGER</span>}
        {enemy.currentPhase > 0 && <span className="text-[9px] bg-orange-700 text-orange-100 rounded px-1">ФАЗ {enemy.currentPhase + 1}</span>}
      </div>

      {/* HP */}
      <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: '#1A1612' }}>
        <div className="h-full rounded-full transition-all duration-150" style={{ width: `${hpPct}%`, background: '#E55A5A' }} />
      </div>
      <div className="text-[9px] font-mono text-right" style={{ color: '#A89880' }}>{enemy.hp}/{enemy.hpMax}</div>

      {/* Stagger */}
      <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: '#1A1612' }}>
        <div className="h-full rounded-full transition-all duration-150" style={{ width: `${staggerPct}%`, background: '#AA5AE5' }} />
      </div>
    </div>
  );
}

// ── Combat HUD ────────────────────────────────────────────────────────────────

function CombatHUD({ session }: { session: CombatSession }) {
  const {
    combatPlayerAttack, combatPlayerDodge, combatPlayerParry,
    combatActivateShowtime, endCombat,
  } = useStudioStore(s => ({
    combatPlayerAttack: s.combatPlayerAttack,
    combatPlayerDodge: s.combatPlayerDodge,
    combatPlayerParry: s.combatPlayerParry,
    combatActivateShowtime: s.combatActivateShowtime,
    endCombat: s.endCombat,
  }));

  const targetEnemy = session.enemies[0] ?? null;
  const canParry = session.pendingSignal?.type === 'yellow';
  const hasPendingSignal = !!session.pendingSignal;
  const canShowtime = session.showtime >= 100 && !session.showtimeActive;

  const recentLog = session.log.slice(-5).reverse();

  return (
    <div className="flex flex-col h-full gap-3 p-4">
      {/* Player stats row */}
      <div className="flex gap-4 items-start">
        <div className="flex-1 flex flex-col gap-1.5">
          <Bar value={session.playerHp} max={session.playerHpMax} color="#E55A5A" label="HP" />
          <Bar value={session.playerMp} max={session.playerMpMax} color="#5A8AE5" label="MP" />
        </div>

        {/* Momentum + Showtime */}
        <div className="flex flex-col items-center gap-1 min-w-[72px]">
          <div className="text-2xl font-black" style={{ color: '#E5AA5A' }}>×{session.momentum}</div>
          <div className="text-[9px]" style={{ color: '#A89880' }}>Momentum</div>
          <div className="h-1.5 w-full rounded-full overflow-hidden mt-1" style={{ background: '#1A1612' }}>
            <div
              className="h-full rounded-full transition-all duration-150"
              style={{ width: `${session.showtime}%`, background: session.showtimeActive ? '#FFDD22' : '#E5AA5A' }}
            />
          </div>
          {session.showtimeActive && <div className="text-[9px] font-black" style={{ color: '#FFDD22' }}>SHOWTIME!</div>}
        </div>
      </div>

      {/* Center: enemies + signal */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        {/* Signal flash */}
        {session.pendingSignal && <SignalFlash signal={session.pendingSignal} />}

        {/* Enemy cards */}
        <div className="flex flex-wrap gap-2 justify-center">
          {session.enemies.map((e, i) => (
            <EnemyCard
              key={e.instanceId}
              enemy={e}
              isTarget={i === 0}
              onAttack={() => combatPlayerAttack(e.instanceId, false)}
            />
          ))}
          {session.enemies.length === 0 && session.spawnQueue.length > 0 && (
            <div className="text-sm" style={{ color: '#A89880' }}>Следующий враг появится...</div>
          )}
        </div>

        {/* Wave progress */}
        <div className="text-[10px]" style={{ color: '#A89880' }}>
          Убито: {session.totalKilled} · В очереди: {session.spawnQueue.length} · На поле: {session.enemies.length}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 justify-center flex-wrap">
        <button
          onClick={() => { if (targetEnemy) combatPlayerAttack(targetEnemy.instanceId, false); }}
          disabled={!targetEnemy || hasPendingSignal}
          className="rounded-xl px-5 py-3 font-black text-sm transition-all disabled:opacity-40"
          style={{ background: '#C25D3A', color: '#F0EDE8', border: '2px solid #E0703E' }}
        >⚔️ АТАКА</button>

        <button
          onClick={() => { if (targetEnemy) combatPlayerAttack(targetEnemy.instanceId, true); }}
          disabled={!targetEnemy || hasPendingSignal}
          className="rounded-xl px-4 py-3 font-semibold text-sm transition-all disabled:opacity-40"
          style={{ background: '#2A2018', color: '#F0EDE8', border: '2px solid #5A3A28' }}
        >🎯 СЛАБАЯ ТОЧКА</button>

        <button
          onClick={combatPlayerDodge}
          disabled={!hasPendingSignal}
          className="rounded-xl px-5 py-3 font-black text-sm transition-all disabled:opacity-40"
          style={{ background: '#2288FF22', color: '#2288FF', border: '2px solid #2288FF' }}
        >💨 УКЛОН</button>

        <button
          onClick={combatPlayerParry}
          disabled={!canParry}
          className="rounded-xl px-5 py-3 font-black text-sm transition-all disabled:opacity-40"
          style={{ background: '#FFDD2222', color: '#FFDD22', border: '2px solid #FFDD22' }}
        >🛡 ПАРИРОВАТЬ</button>

        <button
          onClick={combatActivateShowtime}
          disabled={!canShowtime}
          className="rounded-xl px-5 py-3 font-black text-sm transition-all disabled:opacity-40"
          style={{
            background: canShowtime ? '#E5AA5A' : '#2A2018',
            color: canShowtime ? '#1A1612' : '#5A4A38',
            border: `2px solid ${canShowtime ? '#E5AA5A' : '#3A3028'}`,
          }}
        >✨ SHOWTIME</button>
      </div>

      {/* Combat log */}
      <div className="rounded-lg p-2 overflow-hidden" style={{ background: '#0A0806', border: '1px solid #2A2018' }}>
        {recentLog.map((entry, i) => (
          <div key={i} className="text-[10px] font-mono truncate" style={{ color: i === 0 ? '#F0EDE8' : '#5A4A38' }}>
            [{entry.tick}] {entry.text ?? entry.type}
            {entry.value !== undefined && ` · ${entry.value}`}
            {entry.isCrit && ' CRIT!'}
            {entry.isWeakSpot && ' 🎯'}
          </div>
        ))}
        {recentLog.length === 0 && <div className="text-[10px] font-mono" style={{ color: '#3A3028' }}>— лог пуст —</div>}
      </div>

      {/* Bail */}
      <button
        onClick={endCombat}
        className="text-[10px] text-center transition-colors hover:opacity-80"
        style={{ color: '#5A4A38' }}
      >завершить бой</button>
    </div>
  );
}

// ── Results ───────────────────────────────────────────────────────────────────

function ResultsView({ session, onExit }: { session: CombatSession; onExit: () => void }) {
  const isVictory = session.status === 'victory';

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-8">
      <div className="text-5xl">{isVictory ? '🏆' : '💀'}</div>
      <div className="text-3xl font-black" style={{ color: isVictory ? '#5AE55A' : '#E55A5A' }}>
        {isVictory ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ'}
      </div>

      {isVictory && (
        <div className="rounded-xl p-5 flex flex-col gap-2 w-full max-w-xs" style={{ background: '#1A1612', border: '1px solid #3A3028' }}>
          <div className="text-sm font-semibold mb-1" style={{ color: '#A89880' }}>НАГРАДА</div>
          <div className="flex justify-between text-sm" style={{ color: '#F0EDE8' }}>
            <span>💰 Монеты</span><span className="font-mono">{session.rewards.coins}</span>
          </div>
          <div className="flex justify-between text-sm" style={{ color: '#F0EDE8' }}>
            <span>⭐ Опыт</span><span className="font-mono">{session.rewards.xp}</span>
          </div>
          <div className="flex justify-between text-sm" style={{ color: '#F0EDE8' }}>
            <span>🎞 Сталлонки</span><span className="font-mono">{session.rewards.stallonkas}</span>
          </div>
          {session.rewards.vhsDropped && (
            <div className="text-xs font-semibold mt-1" style={{ color: '#E5AA5A' }}>📼 VHS-кассета!</div>
          )}
        </div>
      )}

      <div className="text-xs" style={{ color: '#5A4A38' }}>
        Убито врагов: {session.totalKilled} · Тиков: {session.tick}
      </div>

      <button
        onClick={onExit}
        className="rounded-xl px-10 py-3 font-black text-base transition-all"
        style={{ background: '#C25D3A', color: '#F0EDE8', border: '2px solid #E0703E' }}
      >← Деревня</button>
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

export default function CombatOverlay({ currentPageId }: { currentPageId: string | null }) {
  const { combatSession, combatTick, endCombat, selectPage } = useStudioStore(s => ({
    combatSession: s.combatSession,
    combatTick: s.combatTick,
    endCombat: s.endCombat,
    selectPage: s.selectPage,
  }));

  const tickRef = useRef(combatTick);
  tickRef.current = combatTick;

  // Drive combat timer at 200ms per tick (~5 ticks/sec)
  useEffect(() => {
    if (!combatSession || combatSession.status !== 'active') return;
    const id = setInterval(() => tickRef.current(), 200);
    return () => clearInterval(id);
  }, [combatSession?.status, combatSession?.id]);

  const isCombatPage = currentPageId === 'combat_wave_select';
  const hasSession = combatSession !== null;

  if (!isCombatPage && !hasSession) return null;

  const handleExit = () => {
    endCombat();
    selectPage('village');
  };

  return (
    <div className="absolute inset-0 z-40 overflow-hidden" style={{ background: '#0D0B09F5' }}>
      {!hasSession && <WaveSelect />}
      {hasSession && combatSession!.status === 'active' && <CombatHUD session={combatSession!} />}
      {hasSession && (combatSession!.status === 'victory' || combatSession!.status === 'defeat') && (
        <ResultsView session={combatSession!} onExit={handleExit} />
      )}
    </div>
  );
}
