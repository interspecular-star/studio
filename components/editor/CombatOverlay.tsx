'use client';

import { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStudioStore } from '@/lib/store';
import type { CombatSession, SpawnedEnemy, AttackSignal, CombatLogEntry } from '@/lib/types/combat-session';
import type { Difficulty } from '@/lib/types/combat';
import { DIFFICULTY_LABELS, DEFAULT_INSTINCTS, DEFAULT_SCENARIOS, DEFAULT_RANDOM_EVENTS } from '@/lib/types/combat';
import { simulateCombat, type SimulationResult } from '@/lib/combat/engine';

// ── Helpers ───────────────────────────────────────────────────────────────────

const DIFFICULTIES: Difficulty[] = ['novice', 'amateur', 'professional', 'stuntman', 'hollywood'];

function formatLogEntry(entry: CombatLogEntry): string {
  switch (entry.type) {
    case 'playerAttack': {
      let s = `Атака → ${entry.value} урона`;
      if (entry.isCrit) s += ' КРИТ!';
      if (entry.isWeakSpot) s += ' 🎯';
      return s;
    }
    case 'enemyAttack':   return `Враг атакует → ${entry.value} урона`;
    case 'playerDodge':   return 'Уклон ✓';
    case 'playerParry':   return 'Парирование ✓';
    case 'enemySpawn':    return `Появился враг`;
    case 'enemyDeath':    return `Враг побеждён (#${entry.value})`;
    case 'showtime':      return '✨ SHOWTIME активирован!';
    case 'stagger':       return 'Stagger! Враг оглушён';
    case 'phaseChange':   return `Фаза ${entry.value}!`;
    case 'waveComplete':  return '🏆 Волна завершена!';
    case 'playerDeath':   return '💀 Игрок погиб';
    case 'randomEvent':   return `🎲 ${entry.text ?? 'Событие'}`;
    default:              return entry.text ?? entry.type;
  }
}

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

function EventFlashBanner({ name }: { name: string }) {
  const def = DEFAULT_RANDOM_EVENTS.find(e => e.name.ru === name);
  return (
    <div
      className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
      style={{ background: '#E5AA5A22', border: '1px solid #E5AA5A66', color: '#E5AA5A' }}
    >
      <span>{name}</span>
      {def && <span className="text-[10px] font-normal" style={{ color: '#A89880' }}>{def.description.ru}</span>}
    </div>
  );
}

// ── Scenario Panel ────────────────────────────────────────────────────────────

function ScenarioPanel({ session }: { session: CombatSession }) {
  if (session.scenarioProgress.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {session.scenarioProgress.map(sp => {
        const def = DEFAULT_SCENARIOS.find(s => s.id === sp.scenarioId);
        const label = def?.name.ru ?? sp.scenarioId;
        const icon = sp.completed ? '✓' : sp.failed ? '✗' : '…';
        const color = sp.completed ? '#5AE55A' : sp.failed ? '#E55A5A' : '#A89880';
        return (
          <div
            key={sp.scenarioId}
            title={def?.condition.ru}
            className="rounded px-2 py-0.5 text-[9px] font-semibold"
            style={{ background: color + '22', color, border: `1px solid ${color}44` }}
          >
            {icon} {label}
          </div>
        );
      })}
    </div>
  );
}

// ── Simulation Panel ──────────────────────────────────────────────────────────

function SimulationPanel({ waveId, difficulty, playerLevel }: {
  waveId: string; difficulty: Difficulty; playerLevel: number;
}) {
  const { waves, enemies, bosses } = useStudioStore(useShallow(s => ({
    waves: s.waves, enemies: s.enemies, bosses: s.bosses,
  })));
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [running, setRunning] = useState(false);
  const [iters, setIters] = useState(50);

  const wave = waves.find((w: any) => w.id === waveId);

  const runSim = () => {
    if (!wave) return;
    setRunning(true);
    setResult(null);
    setTimeout(() => {
      const playerStats = { str: 6, agi: 5, end: 5, mag: 3, lck: 4, lvl: playerLevel };
      const res = simulateCombat(wave, difficulty, enemies, bosses, playerStats, null, iters);
      setResult(res);
      setRunning(false);
    }, 0);
  };

  if (!wave) return null;

  return (
    <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: '#0D0B09', border: '1px solid #3A3028' }}>
      <div className="text-xs font-semibold" style={{ color: '#A89880' }}>СИМУЛЯЦИЯ БОЁВ</div>
      <div className="flex items-center gap-2">
        <select
          value={iters}
          onChange={e => setIters(Number(e.target.value))}
          className="rounded px-2 py-1 text-xs"
          style={{ background: '#1A1612', color: '#F0EDE8', border: '1px solid #3A3028' }}
        >
          {[10, 25, 50, 100, 200].map(n => (
            <option key={n} value={n}>{n} итераций</option>
          ))}
        </select>
        <button
          onClick={runSim}
          disabled={running}
          className="rounded-lg px-3 py-1.5 text-xs font-black transition-all disabled:opacity-50"
          style={{ background: '#C25D3A', color: '#F0EDE8', border: '1px solid #E0703E' }}
        >{running ? '⏳ Прогон...' : '▶ Запустить'}</button>
      </div>

      {result && (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-4 flex-wrap">
            <Stat label="Победы" value={`${result.winRate}%`} highlight={result.winRate >= 60} />
            <Stat label="Ср. убито" value={String(result.avgKills)} />
            <Stat label="Ср. тиков" value={String(result.avgTicks)} />
            <Stat label="Ср. монет" value={String(result.avgCoins)} />
            <Stat label="Ср. XP" value={String(result.avgXp)} />
          </div>
          {Object.keys(result.scenarioRates).length > 0 && (
            <div>
              <div className="text-[9px] mb-1" style={{ color: '#5A4A38' }}>Сценарии (% выполнения)</div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(result.scenarioRates).map(([id, pct]) => {
                  const def = DEFAULT_SCENARIOS.find(s => s.id === id);
                  return (
                    <span key={id} className="text-[9px] rounded px-1.5 py-0.5"
                      style={{ background: pct >= 50 ? '#5AE55A22' : '#E55A5A22', color: pct >= 50 ? '#5AE55A' : '#E55A5A', border: `1px solid ${pct >= 50 ? '#5AE55A44' : '#E55A5A44'}` }}>
                      {def?.name.ru ?? id}: {pct}%
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-sm font-black" style={{ color: highlight ? '#5AE55A' : '#F0EDE8' }}>{value}</div>
      <div className="text-[9px]" style={{ color: '#5A4A38' }}>{label}</div>
    </div>
  );
}

// ── Wave Select ───────────────────────────────────────────────────────────────

function WaveSelect() {
  const { waves, startCombat, variables, playtestState } = useStudioStore(useShallow(s => ({
    waves: s.waves,
    startCombat: s.startCombat,
    variables: s.variables,
    playtestState: s.playtestState,
  })));
  const [selectedWave, setSelectedWave] = useState<string>('');
  const [difficulty, setDifficulty] = useState<Difficulty>('amateur');
  const [instinctId, setInstinctId] = useState<string | null>(null);
  const [showSim, setShowSim] = useState(false);

  const levelVarId = variables.find((v: any) => v.name === 'level')?.id as string | undefined;
  const playerLevel: number = levelVarId
    ? ((playtestState.variableValues[levelVarId] as number | undefined) ?? 1)
    : 1;

  const unlockedInstincts = DEFAULT_INSTINCTS.filter(i => i.unlockLevel <= playerLevel);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 px-8 overflow-y-auto py-4">
      <div className="text-3xl font-black tracking-widest" style={{ color: '#F0EDE8' }}>🎬 СЪЁМКА</div>
      <div className="text-sm" style={{ color: '#A89880' }}>Выберите волну и сложность · Ур. {playerLevel}</div>

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
          <div className="flex flex-col gap-2 w-full max-w-sm">
            {waves.map((w: any) => (
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

          {/* Instinct picker */}
          <div className="w-full max-w-sm">
            <div className="text-xs font-semibold mb-2" style={{ color: '#A89880' }}>
              Инстинкт {unlockedInstincts.length === 0 ? '(разблокируются с ур. 1)' : '(необязательно)'}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setInstinctId(null)}
                className="rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-all"
                style={{
                  background: instinctId === null ? '#3A3028' : '#1A1612',
                  color: instinctId === null ? '#F0EDE8' : '#5A4A38',
                  border: `1px solid ${instinctId === null ? '#6A5A48' : '#2A2018'}`,
                }}
              >Нет</button>
              {unlockedInstincts.map(inst => (
                <button
                  key={inst.id}
                  onClick={() => setInstinctId(inst.id)}
                  title={inst.passiveEffect.ru}
                  className="rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-all"
                  style={{
                    background: instinctId === inst.id ? '#5A8AE522' : '#1A1612',
                    color: instinctId === inst.id ? '#5A8AE5' : '#A89880',
                    border: `1px solid ${instinctId === inst.id ? '#5A8AE5' : '#2A2018'}`,
                  }}
                >{inst.name.ru}</button>
              ))}
              {DEFAULT_INSTINCTS.filter(i => i.unlockLevel > playerLevel).map(inst => (
                <button
                  key={inst.id}
                  disabled
                  title={`Разблокируется на ур. ${inst.unlockLevel}`}
                  className="rounded-lg px-2.5 py-1 text-[10px] font-semibold opacity-30 cursor-not-allowed"
                  style={{ background: '#1A1612', color: '#5A4A38', border: '1px solid #2A2018' }}
                >🔒 {inst.name.ru}</button>
              ))}
            </div>
            {instinctId && (
              <div className="mt-1.5 text-[9px] leading-relaxed" style={{ color: '#7A6A58' }}>
                {DEFAULT_INSTINCTS.find(i => i.id === instinctId)?.passiveEffect.ru}
              </div>
            )}
          </div>

          {/* Simulation toggle */}
          {selectedWave && (
            <div className="w-full max-w-sm">
              <button
                onClick={() => setShowSim(v => !v)}
                className="text-[10px] font-semibold mb-2 transition-colors"
                style={{ color: showSim ? '#E5AA5A' : '#5A4A38' }}
              >
                {showSim ? '▲' : '▼'} Инструмент симуляции
              </button>
              {showSim && (
                <SimulationPanel waveId={selectedWave} difficulty={difficulty} playerLevel={playerLevel} />
              )}
            </div>
          )}

          {/* Start */}
          <button
            onClick={() => { if (selectedWave) startCombat(selectedWave, difficulty, instinctId ?? undefined); }}
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
  const storeEnemies = useStudioStore(useShallow(s => [...s.enemies, ...s.bosses]));
  const def = storeEnemies.find(e => e.id === enemy.enemyId);
  const hpPct = (enemy.hp / enemy.hpMax) * 100;

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
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-bold" style={{ color: '#F0EDE8' }}>
          {def ? def.name.ru : enemy.enemyId}
        </span>
        {enemy.isBoss && <span className="text-[9px] bg-yellow-600 text-yellow-100 rounded px-1">БОСС</span>}
        {enemy.isFuryMode && <span className="text-[9px] bg-red-700 text-red-100 rounded px-1">FURY</span>}
        {enemy.isStaggered && <span className="text-[9px] bg-purple-700 text-purple-100 rounded px-1">STAGGER</span>}
        {enemy.currentPhase > 0 && <span className="text-[9px] bg-orange-700 text-orange-100 rounded px-1">ФАЗ {enemy.currentPhase + 1}</span>}
      </div>
      <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: '#1A1612' }}>
        <div className="h-full rounded-full transition-all duration-150" style={{ width: `${hpPct}%`, background: '#E55A5A' }} />
      </div>
      <div className="text-[9px] font-mono text-right" style={{ color: '#A89880' }}>{enemy.hp}/{enemy.hpMax}</div>
      <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: '#1A1612' }}>
        <div className="h-full rounded-full transition-all duration-150" style={{ width: `${enemy.stagger}%`, background: '#AA5AE5' }} />
      </div>
    </div>
  );
}

// ── Combat HUD ────────────────────────────────────────────────────────────────

function CombatHUD({ session }: { session: CombatSession }) {
  const {
    combatPlayerAttack, combatPlayerDodge, combatPlayerParry,
    combatActivateShowtime, combatTick, combatPlayerDodge: dodge,
    combatPlayerParry: parry, endCombat,
  } = useStudioStore(useShallow(s => ({
    combatPlayerAttack: s.combatPlayerAttack,
    combatPlayerDodge: s.combatPlayerDodge,
    combatPlayerParry: s.combatPlayerParry,
    combatActivateShowtime: s.combatActivateShowtime,
    combatTick: s.combatTick,
    endCombat: s.endCombat,
  })));

  const [isAuto, setIsAuto] = useState(false);

  const targetEnemy = session.enemies[0] ?? null;
  const canParry = session.pendingSignal?.type === 'yellow';
  const hasPendingSignal = !!session.pendingSignal;
  const canShowtime = session.showtime >= 100 && !session.showtimeActive;
  const activeInstinct = DEFAULT_INSTINCTS.find(i => i.id === session.activeInstinctId);
  const recentLog = session.log.slice(-5).reverse();

  // Auto-battle refs to avoid stale closures
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const actionsRef = useRef({ combatPlayerAttack, combatPlayerDodge: dodge, combatPlayerParry: parry, combatActivateShowtime, combatTick });
  actionsRef.current = { combatPlayerAttack, combatPlayerDodge: dodge, combatPlayerParry: parry, combatActivateShowtime, combatTick };

  useEffect(() => {
    if (!isAuto) return;
    const id = setInterval(() => {
      const s = sessionRef.current;
      const a = actionsRef.current;
      if (s.status !== 'active') { setIsAuto(false); return; }
      if (s.pendingSignal) {
        if (s.pendingSignal.type === 'yellow') a.combatPlayerParry();
        else a.combatPlayerDodge();
        return;
      }
      if (s.showtime >= 100 && !s.showtimeActive) { a.combatActivateShowtime(); return; }
      if (s.enemies.length > 0) { a.combatPlayerAttack(s.enemies[0].instanceId, false); return; }
    }, 80);
    return () => clearInterval(id);
  }, [isAuto]);

  return (
    <div className="flex flex-col h-full gap-3 p-4 overflow-y-auto">
      {/* Player stats */}
      <div className="flex gap-4 items-start">
        <div className="flex-1 flex flex-col gap-1.5">
          <Bar value={session.playerHp} max={session.playerHpMax} color="#E55A5A" label="HP" />
          <Bar value={session.playerMp} max={session.playerMpMax} color="#5A8AE5" label="MP" />
        </div>
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
          {session.enragedTicks > 0 && <div className="text-[9px] font-black" style={{ color: '#FF6666' }}>📷 ЯРОСТЬ</div>}
        </div>
        {activeInstinct && (
          <div
            className="rounded-lg px-2 py-1 text-[9px] font-semibold self-start"
            style={{ background: '#5A8AE522', color: '#5A8AE5', border: '1px solid #5A8AE544' }}
            title={activeInstinct.passiveEffect.ru}
          >⚡ {activeInstinct.name.ru}</div>
        )}
      </div>

      {/* Event flash */}
      {session.activeEventFlash && <EventFlashBanner name={session.activeEventFlash.name} />}

      {/* Scenarios */}
      <ScenarioPanel session={session} />

      {/* Center */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        {session.pendingSignal && <SignalFlash signal={session.pendingSignal} />}
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
        <div className="text-[10px]" style={{ color: '#A89880' }}>
          Убито: {session.totalKilled} · В очереди: {session.spawnQueue.length} · Тик: {session.tick}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-center flex-wrap">
        <button
          onClick={() => { if (targetEnemy) combatPlayerAttack(targetEnemy.instanceId, false); }}
          disabled={!targetEnemy || hasPendingSignal || isAuto}
          className="rounded-xl px-5 py-3 font-black text-sm transition-all disabled:opacity-40"
          style={{ background: '#C25D3A', color: '#F0EDE8', border: '2px solid #E0703E' }}
        >⚔️ АТАКА</button>

        <button
          onClick={() => { if (targetEnemy) combatPlayerAttack(targetEnemy.instanceId, true); }}
          disabled={!targetEnemy || hasPendingSignal || isAuto}
          className="rounded-xl px-4 py-3 font-semibold text-sm transition-all disabled:opacity-40"
          style={{ background: '#2A2018', color: '#F0EDE8', border: '2px solid #5A3A28' }}
        >🎯 СЛАБАЯ ТОЧКА</button>

        <button
          onClick={dodge}
          disabled={!hasPendingSignal || isAuto}
          className="rounded-xl px-5 py-3 font-black text-sm transition-all disabled:opacity-40"
          style={{ background: '#2288FF22', color: '#2288FF', border: '2px solid #2288FF' }}
        >💨 УКЛОН</button>

        <button
          onClick={parry}
          disabled={!canParry || isAuto}
          className="rounded-xl px-5 py-3 font-black text-sm transition-all disabled:opacity-40"
          style={{ background: '#FFDD2222', color: '#FFDD22', border: '2px solid #FFDD22' }}
        >🛡 ПАРИРОВАТЬ</button>

        <button
          onClick={combatActivateShowtime}
          disabled={!canShowtime || isAuto}
          className="rounded-xl px-5 py-3 font-black text-sm transition-all disabled:opacity-40"
          style={{
            background: canShowtime ? '#E5AA5A' : '#2A2018',
            color: canShowtime ? '#1A1612' : '#5A4A38',
            border: `2px solid ${canShowtime ? '#E5AA5A' : '#3A3028'}`,
          }}
        >✨ SHOWTIME</button>

        <button
          onClick={() => setIsAuto(v => !v)}
          className="rounded-xl px-4 py-3 font-black text-sm transition-all"
          style={{
            background: isAuto ? '#5AE55A22' : '#1A1612',
            color: isAuto ? '#5AE55A' : '#5A4A38',
            border: `2px solid ${isAuto ? '#5AE55A' : '#2A2018'}`,
          }}
        >{isAuto ? '⚡ АВТО ВКЛ' : '⚡ АВТО'}</button>
      </div>

      {/* Log */}
      <div className="rounded-lg p-2 overflow-hidden" style={{ background: '#0A0806', border: '1px solid #2A2018' }}>
        {recentLog.map((entry, i) => (
          <div key={i} className="text-[10px] font-mono truncate" style={{ color: i === 0 ? '#F0EDE8' : '#5A4A38' }}>
            [{entry.tick.toString().padStart(3, '0')}] {formatLogEntry(entry)}
          </div>
        ))}
        {recentLog.length === 0 && <div className="text-[10px] font-mono" style={{ color: '#3A3028' }}>— лог пуст —</div>}
      </div>

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
  const { applyRewards } = useStudioStore(useShallow(s => ({ applyRewards: s.applyRewards })));
  const [collected, setCollected] = useState(false);
  const [levelUp, setLevelUp] = useState<{ leveledUp: boolean; newLevel: number } | null>(null);

  const isVictory = session.status === 'victory';
  const completedScenarios = session.scenarioProgress.filter(s => s.completed);

  const handleCollect = () => {
    const result = applyRewards();
    setLevelUp(result);
    setCollected(true);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 text-center px-8 overflow-y-auto py-4">
      <div className="text-5xl">{isVictory ? '🏆' : '💀'}</div>
      <div className="text-3xl font-black" style={{ color: isVictory ? '#5AE55A' : '#E55A5A' }}>
        {isVictory ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ'}
      </div>

      {levelUp?.leveledUp && (
        <div className="rounded-xl px-6 py-3 font-black text-lg animate-pulse" style={{ background: '#E5AA5A22', border: '2px solid #E5AA5A', color: '#E5AA5A' }}>
          🎉 УРОВЕНЬ UP! → УР.{levelUp.newLevel}
        </div>
      )}

      {isVictory && (
        <div className="rounded-xl p-5 flex flex-col gap-2 w-full max-w-xs" style={{ background: '#1A1612', border: '1px solid #3A3028' }}>
          <div className="text-sm font-semibold mb-1" style={{ color: '#A89880' }}>НАГРАДА</div>
          <div className="flex justify-between text-sm" style={{ color: '#F0EDE8' }}>
            <span>💰 Монеты</span><span className="font-mono">+{session.rewards.coins}</span>
          </div>
          <div className="flex justify-between text-sm" style={{ color: '#F0EDE8' }}>
            <span>⭐ Опыт</span><span className="font-mono">+{session.rewards.xp}</span>
          </div>
          <div className="flex justify-between text-sm" style={{ color: '#F0EDE8' }}>
            <span>🎞 Сталлонки</span><span className="font-mono">+{session.rewards.stallonkas}</span>
          </div>
          {session.rewards.vhsDropped && (
            <div className="text-xs font-semibold mt-1" style={{ color: '#E5AA5A' }}>📼 VHS-кассета!</div>
          )}
          {session.randomEventsTriggered > 0 && (
            <div className="text-xs mt-1" style={{ color: '#7A6A58' }}>
              🎲 Случайных событий: {session.randomEventsTriggered}
            </div>
          )}
        </div>
      )}

      {/* Scenario results */}
      {session.scenarioProgress.length > 0 && (
        <div className="w-full max-w-xs">
          <div className="text-xs font-semibold mb-2" style={{ color: '#A89880' }}>СЦЕНАРИИ</div>
          <div className="flex flex-col gap-1">
            {session.scenarioProgress.map(sp => {
              const def = DEFAULT_SCENARIOS.find(s => s.id === sp.scenarioId);
              const icon = sp.completed ? '✓' : sp.failed ? '✗' : '—';
              const color = sp.completed ? '#5AE55A' : sp.failed ? '#E55A5A' : '#5A4A38';
              return (
                <div key={sp.scenarioId} className="flex items-center gap-2 text-left">
                  <span className="font-mono text-sm w-5 shrink-0" style={{ color }}>{icon}</span>
                  <span className="text-xs" style={{ color }}>{def?.name.ru ?? sp.scenarioId}</span>
                  {sp.completed && def && (
                    <span className="text-[9px] ml-auto shrink-0" style={{ color: '#7A9A7A' }}>{def.reward.ru}</span>
                  )}
                </div>
              );
            })}
          </div>
          {completedScenarios.length > 0 && (
            <div className="mt-2 text-[10px]" style={{ color: '#5AE55A' }}>
              {completedScenarios.length}/{session.scenarioProgress.length} выполнено
            </div>
          )}
        </div>
      )}

      <div className="text-xs" style={{ color: '#5A4A38' }}>
        Убито: {session.totalKilled} · Тиков: {session.tick} · Событий: {session.randomEventsTriggered}
      </div>

      <div className="flex gap-3">
        {isVictory && !collected && (
          <button
            onClick={handleCollect}
            className="rounded-xl px-7 py-3 font-black text-base transition-all"
            style={{ background: '#5AE55A22', color: '#5AE55A', border: '2px solid #5AE55A' }}
          >✓ Забрать</button>
        )}
        {collected && !levelUp?.leveledUp && (
          <div className="rounded-xl px-5 py-3 text-sm font-semibold" style={{ color: '#5AE55A', border: '2px solid #5AE55A22' }}>
            ✓ Получено!
          </div>
        )}
        <button
          onClick={onExit}
          className="rounded-xl px-7 py-3 font-black text-base transition-all"
          style={{ background: '#C25D3A', color: '#F0EDE8', border: '2px solid #E0703E' }}
        >← Деревня</button>
      </div>
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

export default function CombatOverlay({ currentPageId }: { currentPageId: string | null }) {
  const { combatSession, combatTick, endCombat, selectPage } = useStudioStore(useShallow(s => ({
    combatSession: s.combatSession,
    combatTick: s.combatTick,
    endCombat: s.endCombat,
    selectPage: s.selectPage,
  })));

  const tickRef = useRef(combatTick);
  tickRef.current = combatTick;

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
