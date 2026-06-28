'use client';

import { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStudioStore } from '@/lib/store';
import type { CombatSession, SpawnedEnemy, AttackSignal, CombatLogEntry } from '@/lib/types/combat-session';
import type { Difficulty, SkillId } from '@/lib/types/combat';
import { DIFFICULTY_LABELS, DEFAULT_INSTINCTS, DEFAULT_SCENARIOS, DEFAULT_RANDOM_EVENTS, DEFAULT_SKILLS, DEFAULT_SKILL_SLOTS } from '@/lib/types/combat';
import { simulateCombat, type SimulationResult } from '@/lib/combat/engine';

// ── Palette (из макета Slay Adventure Combat HUD.html) ────────────────────────
const C = {
  bg:     '#0a0910',
  pink:   '#ff3ca0',
  cyan:   '#36e0e0',
  yellow: '#ffcc33',
  red:    '#ff2e2e',
  text:   '#ffffff',
  muted:  'rgba(255,255,255,0.4)',
  dim:    'rgba(255,255,255,0.07)',
};

// Кол-во врагов на каждой сложности
const DIFF_COUNT: Record<Difficulty, number> = {
  novice: 3, amateur: 5, professional: 7, stuntman: 9, hollywood: 12, super_endless: 20,
};
const BOSS_DIFFS: Difficulty[] = ['professional', 'stuntman', 'hollywood', 'super_endless'];

// Цвет слота навыка
const SLOT_COLORS: [string, string, string] = [C.pink, C.cyan, C.yellow];

function cdSec(ticks: number) { return (ticks * 0.2).toFixed(1) + 'с'; }

// ── Simulation Panel ──────────────────────────────────────────────────────────

function SimulationPanel({ waveId, difficulty }: { waveId: string; difficulty: Difficulty }) {
  const { waves, enemies, bosses, variables, playtestState } = useStudioStore(useShallow(s => ({
    waves: s.waves, enemies: s.enemies, bosses: s.bosses,
    variables: s.variables, playtestState: s.playtestState,
  })));
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [running, setRunning] = useState(false);
  const [iters, setIters] = useState(50);

  const wave = waves.find((w: any) => w.id === waveId);
  const numVar = (name: string, fallback: number): number => {
    const v = variables.find((v: any) => v.name === name);
    if (!v) return fallback;
    const val = playtestState.variableValues[v.id];
    return typeof val === 'number' ? val : (typeof v.defaultValue === 'number' ? v.defaultValue : fallback);
  };

  const runSim = () => {
    if (!wave) return;
    setRunning(true); setResult(null);
    setTimeout(() => {
      const ps = { str: numVar('strength', 5), agi: numVar('agility', 5), end: numVar('endurance', 10), mag: numVar('magic', 5), lck: numVar('luck', 5), lvl: numVar('level', 1) };
      setResult(simulateCombat(wave, difficulty, enemies, bosses, ps, null, iters));
      setRunning(false);
    }, 0);
  };

  if (!wave) return null;
  return (
    <div className="rounded-xl p-3 flex flex-col gap-2 mt-2" style={{ background: '#0D0B0F', border: `1px solid ${C.dim}` }}>
      <div className="text-[10px] font-semibold" style={{ color: C.muted }}>СИМУЛЯЦИЯ</div>
      <div className="flex gap-2">
        <select value={iters} onChange={e => setIters(Number(e.target.value))}
          className="rounded px-2 py-1 text-xs" style={{ background: '#1a1020', color: C.text, border: `1px solid ${C.dim}` }}>
          {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} итер.</option>)}
        </select>
        <button onClick={runSim} disabled={running} className="rounded px-3 py-1 text-xs font-bold transition-opacity disabled:opacity-40"
          style={{ background: C.pink + '33', color: C.pink, border: `1px solid ${C.pink}66` }}>
          {running ? '…' : '▶ Запуск'}
        </button>
      </div>
      {result && (
        <div className="flex gap-4 flex-wrap">
          {[['Победы', result.winRate + '%', result.winRate >= 60], ['Убито', String(result.avgKills), false], ['Монет', String(result.avgCoins), false], ['XP', String(result.avgXp), false]].map(([l, v, hi]) => (
            <div key={String(l)} className="flex flex-col items-center">
              <div className="text-sm font-black" style={{ color: hi ? '#5AE55A' : C.text }}>{v}</div>
              <div className="text-[9px]" style={{ color: C.muted }}>{l}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Wave Select ───────────────────────────────────────────────────────────────

function SkillPicker({
  skillSlots, setSkillSlots,
}: {
  skillSlots: [SkillId | null, SkillId | null, SkillId | null];
  setSkillSlots: (s: [SkillId | null, SkillId | null, SkillId | null]) => void;
}) {
  const [activeSlot, setActiveSlot] = useState<0 | 1 | 2 | null>(null);
  const ALL_SKILLS = Object.values(DEFAULT_SKILLS) as typeof DEFAULT_SKILLS[SkillId][];

  const assignSkill = (skillId: SkillId) => {
    if (activeSlot === null) return;
    const next = [...skillSlots] as [SkillId | null, SkillId | null, SkillId | null];
    next[activeSlot] = skillId;
    setSkillSlots(next);
    setActiveSlot(null);
  };

  return (
    <div className="w-full max-w-sm flex flex-col gap-2">
      <div className="text-[10px] font-semibold tracking-widest" style={{ color: C.muted }}>НАВЫКИ — ВЫБЕРИ 3 СЛОТА</div>

      {/* Current slots */}
      <div className="flex gap-2">
        {([0, 1, 2] as const).map(i => {
          const skillId = skillSlots[i];
          const skill   = skillId ? DEFAULT_SKILLS[skillId] : null;
          const color   = SLOT_COLORS[i];
          const isActive = activeSlot === i;
          return (
            <button key={i} onClick={() => setActiveSlot(isActive ? null : i)}
              className="flex-1 rounded-xl py-2 px-1 flex flex-col items-center gap-0.5 transition-all"
              style={{
                border: `2px solid ${isActive ? color : color + '55'}`,
                background: isActive ? color + '22' : color + '0a',
                boxShadow: isActive ? `0 0 12px ${color}55` : 'none',
              }}>
              <span className="text-[8px] font-bold" style={{ color }}>{i + 1}</span>
              <span className="text-[9px] font-semibold text-center leading-tight" style={{ color: skill ? C.text : C.muted }}>
                {skill?.name.ru ?? '—'}
              </span>
              {skill && <span className="text-[8px]" style={{ color: C.muted }}>{skill.mpCost} MP</span>}
            </button>
          );
        })}
      </div>

      {activeSlot !== null && (
        <div className="text-[9px] text-center" style={{ color: SLOT_COLORS[activeSlot] }}>
          ↑ Слот {activeSlot + 1} выбран — нажми навык ниже
        </div>
      )}

      {/* Skill grid */}
      <div className="grid grid-cols-3 gap-1.5">
        {ALL_SKILLS.map(skill => {
          const inSlot = skillSlots.indexOf(skill.id as SkillId);
          return (
            <button key={skill.id} onClick={() => assignSkill(skill.id as SkillId)}
              disabled={activeSlot === null}
              title={skill.description.ru}
              className="rounded-lg px-2 py-2 flex flex-col items-center gap-0.5 transition-all disabled:opacity-40"
              style={{
                background: inSlot >= 0 ? SLOT_COLORS[inSlot] + '22' : C.dim,
                border: `1px solid ${inSlot >= 0 ? SLOT_COLORS[inSlot] + '88' : 'transparent'}`,
              }}>
              <span className="text-[9px] font-bold text-center leading-tight" style={{ color: C.text }}>
                {skill.name.ru}
              </span>
              <span className="text-[8px]" style={{ color: C.muted }}>{skill.mpCost}MP · {(skill.cooldownTicks * 0.2).toFixed(0)}с</span>
              {inSlot >= 0 && (
                <span className="text-[7px] font-black" style={{ color: SLOT_COLORS[inSlot] }}>▲{inSlot + 1}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ScenarioPicker({
  difficulty, selected, setSelected,
}: {
  difficulty: Difficulty;
  selected: string[];
  setSelected: (ids: string[]) => void;
}) {
  const available = DEFAULT_SCENARIOS.filter(s => s.availableDifficulties.includes(difficulty));
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(s => s !== id));
    } else if (selected.length < 2) {
      setSelected([...selected, id]);
    }
  };

  return (
    <div className="w-full max-w-sm flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold tracking-widest" style={{ color: C.muted }}>СЦЕНАРИИ (до 2)</span>
        <span className="text-[9px] rounded px-1.5 py-0.5 font-bold" style={{ background: C.yellow + '22', color: C.yellow }}>
          {selected.length}/2
        </span>
      </div>
      <div className="flex flex-col gap-1">
        {available.map(s => {
          const isOn = selected.includes(s.id);
          const full = !isOn && selected.length >= 2;
          return (
            <button key={s.id} onClick={() => toggle(s.id)} disabled={full}
              className="rounded-lg px-3 py-2 text-left transition-all disabled:opacity-30 flex items-start gap-2"
              style={{
                background: isOn ? C.cyan + '15' : C.dim,
                border: `1px solid ${isOn ? C.cyan + '66' : 'transparent'}`,
              }}>
              <span className="text-xs font-bold mt-0.5 shrink-0" style={{ color: isOn ? C.cyan : C.muted }}>
                {isOn ? '☑' : '☐'}
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold" style={{ color: isOn ? C.text : C.muted + 'cc' }}>
                  {s.name.ru}
                </span>
                <span className="text-[8px]" style={{ color: C.muted }}>
                  {s.condition.ru}
                </span>
                <span className="text-[8px]" style={{ color: C.yellow + 'cc' }}>
                  → {s.reward.ru}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EnemyPoolPreview({ waveData, enemies, bosses }: { waveData: any; enemies: any[]; bosses: any[] }) {
  if (!waveData) return null;
  const allDefs = [...enemies, ...bosses];
  const pool: Array<{ id: string; name: string; weight: number; pct: number }> = waveData.enemyPool.map((e: any) => {
    const total = waveData.enemyPool.reduce((s: number, x: any) => s + x.weight, 0);
    const def = allDefs.find((d: any) => d.id === e.enemyId);
    return { id: e.enemyId, name: def?.name?.ru ?? e.enemyId, weight: e.weight, pct: Math.round((e.weight / total) * 100) };
  }).sort((a: any, b: any) => b.weight - a.weight);

  const boss = waveData.bossId ? allDefs.find((d: any) => d.id === waveData.bossId) : null;

  return (
    <div className="w-full max-w-sm flex flex-col gap-2">
      <div className="text-[10px] font-semibold tracking-widest" style={{ color: C.muted }}>ВРАГИ В ПУЛЕ</div>
      <div className="flex flex-wrap gap-1.5">
        {pool.map(e => (
          <div key={e.id} className="rounded px-2 py-1 flex items-center gap-1"
            style={{ background: C.pink + '15', border: `1px solid ${C.pink}33` }}>
            <span className="text-[9px] font-semibold" style={{ color: C.text }}>{e.name}</span>
            <span className="text-[8px]" style={{ color: C.muted }}>{e.pct}%</span>
          </div>
        ))}
        {boss && (
          <div className="rounded px-2 py-1 flex items-center gap-1"
            style={{ background: C.yellow + '15', border: `1px solid ${C.yellow}55` }}>
            <span className="text-[8px] font-bold" style={{ color: C.yellow }}>⚡</span>
            <span className="text-[9px] font-semibold" style={{ color: C.text }}>{boss.name?.ru ?? boss.id}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function WaveSelect() {
  const { waves, startCombat, variables, playtestState, enemies, bosses } = useStudioStore(useShallow(s => ({
    waves: s.waves, startCombat: s.startCombat, variables: s.variables,
    playtestState: s.playtestState, enemies: s.enemies, bosses: s.bosses,
  })));

  const [selectedWave, setSelectedWave]       = useState('');
  const [difficulty, setDifficulty]           = useState<Difficulty>('stuntman');
  const [instinctId, setInstinctId]           = useState<string | null>(null);
  const [showSim, setShowSim]                 = useState(false);
  const [skillSlots, setSkillSlots]           = useState<[SkillId | null, SkillId | null, SkillId | null]>([...DEFAULT_SKILL_SLOTS]);
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);

  const levelVarId = variables.find((v: any) => v.name === 'level')?.id as string | undefined;
  const playerLevel = levelVarId ? ((playtestState.variableValues[levelVarId] as number | undefined) ?? 1) : 1;
  const unlockedInstincts = DEFAULT_INSTINCTS.filter(i => i.unlockLevel <= playerLevel);

  const waveData: any = waves.find((w: any) => w.id === selectedWave);
  const availableDiffs: Difficulty[] = waveData?.difficulties ?? (['novice', 'amateur', 'professional', 'stuntman', 'hollywood'] as Difficulty[]);

  useEffect(() => {
    if (waveData && !availableDiffs.includes(difficulty)) {
      setDifficulty(availableDiffs[availableDiffs.length - 1]);
    }
    // Reset scenarios on wave change (available set may differ)
    setSelectedScenarios([]);
  }, [selectedWave]);

  // Also reset invalid scenarios when difficulty changes
  useEffect(() => {
    const stillAvail = DEFAULT_SCENARIOS
      .filter(s => s.availableDifficulties.includes(difficulty))
      .map(s => s.id);
    setSelectedScenarios(prev => prev.filter(id => stillAvail.includes(id)));
  }, [difficulty]);

  const hasBoss = waveData?.bossId && BOSS_DIFFS.includes(difficulty);
  const enemyCount = DIFF_COUNT[difficulty];

  return (
    <div className="flex flex-col items-center h-full gap-4 px-6 overflow-y-auto py-5"
      style={{ background: C.bg, color: C.text }}>
      <div className="text-3xl font-black tracking-widest" style={{ color: C.cyan, letterSpacing: '0.25em' }}>
        🎬 СЪЁМКА
      </div>
      <div className="text-xs" style={{ color: C.muted }}>Ур. {playerLevel} · выбери волну и настрой бой</div>

      {waves.length === 0 ? (
        <div className="rounded-xl p-6 text-center max-w-xs" style={{ background: C.dim, border: `1px solid ${C.dim}` }}>
          <div className="text-sm font-semibold mb-1">Нет волн</div>
          <div className="text-xs leading-relaxed" style={{ color: C.muted }}>
            Правая панель → Мир → Боёвка → Волны
          </div>
        </div>
      ) : (
        <>
          {/* Волны */}
          <div className="flex flex-col gap-2 w-full max-w-sm">
            <div className="text-[10px] font-semibold tracking-widest" style={{ color: C.muted }}>ВОЛНА</div>
            {waves.map((w: any) => (
              <button key={w.id} onClick={() => setSelectedWave(w.id)}
                className="rounded-xl px-4 py-3 text-left transition-all"
                style={{
                  background: selectedWave === w.id ? C.pink + '22' : C.dim,
                  border: `1px solid ${selectedWave === w.id ? C.pink : 'transparent'}`,
                }}>
                <div className="font-semibold text-sm">{w.name.ru}</div>
                <div className="text-[10px] mt-0.5" style={{ color: C.muted }}>
                  {w.enemyPool.length} типов враг.{w.bossId ? '  ·  ⚡ Босс' : ''}
                </div>
              </button>
            ))}
          </div>

          {/* Сложность */}
          <div className="w-full max-w-sm flex flex-col gap-2">
            <div className="text-[10px] font-semibold tracking-widest" style={{ color: C.muted }}>СЛОЖНОСТЬ</div>
            <div className="flex flex-wrap gap-2">
              {availableDiffs.map(d => {
                const count = DIFF_COUNT[d];
                const boss  = waveData?.bossId && BOSS_DIFFS.includes(d);
                const isOn  = difficulty === d;
                return (
                  <button key={d} onClick={() => setDifficulty(d)}
                    className="rounded-lg px-3 py-2 text-xs font-semibold transition-all flex flex-col items-center gap-0.5"
                    style={{
                      background: isOn ? C.yellow + '22' : C.dim,
                      color: isOn ? C.yellow : C.muted,
                      border: `1px solid ${isOn ? C.yellow : 'transparent'}`,
                    }}>
                    <span>{DIFFICULTY_LABELS[d]}</span>
                    <span className="text-[9px] font-normal" style={{ color: isOn ? C.yellow + 'bb' : C.muted + '99' }}>
                      {count} моб.{boss ? '+босс' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
            {selectedWave && (
              <div className="text-xs" style={{ color: C.yellow }}>
                Итого: {enemyCount} {hasBoss ? `мобов + 1 босс = ${enemyCount + 1} врагов` : 'мобов'}
              </div>
            )}
          </div>

          {/* Enemy pool preview */}
          {selectedWave && (
            <EnemyPoolPreview waveData={waveData} enemies={enemies} bosses={bosses} />
          )}

          {/* Skill picker */}
          <SkillPicker skillSlots={skillSlots} setSkillSlots={setSkillSlots} />

          {/* Scenario picker */}
          {selectedWave && (
            <ScenarioPicker
              difficulty={difficulty}
              selected={selectedScenarios}
              setSelected={setSelectedScenarios}
            />
          )}

          {/* Инстинкт */}
          <div className="w-full max-w-sm flex flex-col gap-2">
            <div className="text-[10px] font-semibold tracking-widest" style={{ color: C.muted }}>ИНСТИНКТ</div>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setInstinctId(null)}
                className="rounded-lg px-2.5 py-1 text-[10px] font-semibold"
                style={{ background: instinctId === null ? C.dim : 'transparent', color: instinctId === null ? C.text : C.muted, border: `1px solid ${instinctId === null ? C.muted + '66' : 'transparent'}` }}>
                Нет
              </button>
              {unlockedInstincts.map(inst => (
                <button key={inst.id} onClick={() => setInstinctId(inst.id)} title={inst.passiveEffect.ru}
                  className="rounded-lg px-2.5 py-1 text-[10px] font-semibold"
                  style={{ background: instinctId === inst.id ? C.cyan + '22' : 'transparent', color: instinctId === inst.id ? C.cyan : C.muted, border: `1px solid ${instinctId === inst.id ? C.cyan : 'transparent'}` }}>
                  {inst.name.ru}
                </button>
              ))}
              {DEFAULT_INSTINCTS.filter(i => i.unlockLevel > playerLevel).map(inst => (
                <button key={inst.id} disabled className="rounded-lg px-2.5 py-1 text-[10px] opacity-25 cursor-not-allowed"
                  style={{ color: C.muted }}>🔒 {inst.name.ru}</button>
              ))}
            </div>
          </div>

          {/* Симуляция */}
          {selectedWave && (
            <div className="w-full max-w-sm">
              <button onClick={() => setShowSim(v => !v)} className="text-[10px] font-semibold transition-colors"
                style={{ color: showSim ? C.yellow : C.muted + '66' }}>
                {showSim ? '▲' : '▼'} Симуляция
              </button>
              {showSim && <SimulationPanel waveId={selectedWave} difficulty={difficulty} />}
            </div>
          )}

          {/* Старт */}
          <button
            onClick={() => {
              if (selectedWave) startCombat(
                selectedWave, difficulty,
                instinctId ?? undefined,
                skillSlots,
                selectedScenarios,
              );
            }}
            disabled={!selectedWave}
            className="rounded-xl px-12 py-4 text-lg font-black tracking-widest transition-all disabled:opacity-30"
            style={{ background: selectedWave ? C.pink : 'transparent', color: C.text, border: `2px solid ${selectedWave ? C.pink : C.muted}` }}>
            ▶ НАЧАТЬ БОЙ
          </button>
        </>
      )}
    </div>
  );
}

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

function MomentumBlock({ momentum, showtimeActive, enragedTicks }: { momentum: number; showtimeActive: boolean; enragedTicks: number }) {
  const color = showtimeActive ? C.yellow : momentum >= 10 ? C.pink : C.yellow;
  return (
    <div className="flex flex-col items-center">
      <div className="font-black leading-none transition-all" style={{ fontSize: '3rem', color, fontFamily: 'monospace', textShadow: `0 0 20px ${color}88` }}>
        ×{momentum}
      </div>
      <div className="text-[9px] font-semibold tracking-widest mt-0.5" style={{ color: C.muted }}>
        {showtimeActive ? 'SHOWTIME!' : enragedTicks > 0 ? '📷 ЯРОСТЬ' : 'MOMENTUM'}
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
      {/* REC */}
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full" style={{ background: blink ? C.red : 'transparent', transition: 'background 0.3s' }} />
        <span className="text-[10px] font-black tracking-widest" style={{ color: C.red }}>REC</span>
      </div>
      {/* Wave kills */}
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
    red:    { color: C.pink,   text: '🔴 УКЛОНИСЬ!',   sub: 'красный удар' },
    yellow: { color: C.yellow, text: '🟡 ПАРИРУЙ!',     sub: 'жёлтый — парировать' },
    blue:   { color: C.cyan,   text: '🔵 УКЛОНИСЬ!',   sub: 'синий удар' },
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
        minHeight: 180,
        minWidth: 320,
        maxWidth: 480,
        width: '100%',
        boxShadow: enemy ? `0 0 30px ${borderColor}33` : 'none',
        background: 'rgba(10,9,16,0.85)',
      }}
      onClick={() => enemy && onAttack(enemy.instanceId)}>

      {/* Signal overlay */}
      {session.pendingSignal && session.enemies.some(e => e.instanceId === session.pendingSignal?.enemyInstanceId) && (
        <SignalOverlay signal={session.pendingSignal} />
      )}

      {enemy ? (
        <>
          {/* Name row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-black" style={{ color: C.text }}>
              {def?.name?.ru ?? enemy.enemyId}
            </span>
            <span className="text-[9px] rounded px-1.5 py-0.5 font-bold" style={{ background: borderColor + '33', color: borderColor }}>
              T{enemy.tier}
            </span>
            {enemy.isFuryMode && (
              <span className="text-[9px] rounded px-1.5 py-0.5 font-bold" style={{ background: C.red + '33', color: C.red }}>
                FURY
              </span>
            )}
            {enemy.isStaggered && (
              <span className="text-[9px] rounded px-1.5 py-0.5 font-bold" style={{ background: '#aa55ff33', color: '#aa55ff' }}>
                STAGGER
              </span>
            )}
            {enemy.isBoss && enemy.currentPhase === 1 && (
              <span className="text-[9px] rounded px-1.5 py-0.5 font-bold" style={{ background: C.cyan + '33', color: C.cyan }}>
                ЩИТ
              </span>
            )}
            {enemy.isBoss && enemy.breakBarStunTicks > 0 && (
              <span className="text-[9px] rounded px-1.5 py-0.5 font-bold animate-pulse" style={{ background: C.yellow + '33', color: C.yellow }}>
                💥 БРЕЙК ×2 урон
              </span>
            )}
          </div>

          {/* Enemy HP bar */}
          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between text-[10px] font-mono" style={{ color: C.muted }}>
              <span>HP</span><span>{enemy.hp}/{enemy.hpMax}</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: C.dim }}>
              <div className="h-full rounded-full transition-all duration-150"
                style={{ width: `${(enemy.hp / enemy.hpMax) * 100}%`, background: C.pink }} />
            </div>
          </div>

          {/* Break bar (boss only) */}
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

          {/* Weak point indicator */}
          {enemy.weakPointActive && (
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: C.yellow, boxShadow: `0 0 8px ${C.yellow}` }} />
              <span className="text-[10px] font-semibold" style={{ color: C.yellow }}>
                слабая точка
                {def?.weakPointTrigger?.ru ? ` · ${def.weakPointTrigger.ru}` : ''}
              </span>
            </div>
          )}

          {/* Stagger bar */}
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

function ShowtimeBar({ showtime, active }: { showtime: number; active: boolean }) {
  const color = active ? C.yellow : C.cyan;
  return (
    <div className="flex flex-col gap-1 w-full max-w-md mx-auto">
      <div className="flex justify-between text-[10px] font-bold" style={{ color }}>
        <span style={{ letterSpacing: '0.15em' }}>SHOWTIME</span>
        <span className="font-mono">{showtime}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: C.dim }}>
        <div className="h-full rounded-full transition-all duration-150"
          style={{ width: `${showtime}%`, background: `linear-gradient(90deg, ${C.cyan}, ${color})`, boxShadow: active ? `0 0 12px ${C.yellow}` : 'none' }} />
      </div>
    </div>
  );
}

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
  const canShowtime = session.showtime >= 100 && !session.showtimeActive;
  const frozen      = session.playerFreezeTicks > 0;
  const hasEnemy    = session.enemies.length > 0;
  const atkOnCd     = session.playerAttackCooldownTicks > 0;
  const atkCdSec    = (session.playerAttackCooldownTicks * 0.2).toFixed(1);

  return (
    <div className="flex flex-col gap-2 items-end">
      {/* 3 skill slots */}
      <div className="flex gap-2">
        {([0, 1, 2] as const).map(i => {
          const skillId = session.skillSlots[i];
          const cd      = session.skillCooldowns[i];
          const color   = SLOT_COLORS[i];
          const skill   = skillId ? DEFAULT_SKILLS[skillId] : null;
          const ready   = cd === 0 && session.playerMp >= (skill?.mpCost ?? 0);
          const isActiveSkill = (skillId === 'dodge_roll' && session.pendingDodgeRoll) || (skillId === 'counter' && session.pendingCounter);
          return (
            <button key={i} onClick={() => onUseSkill(i)}
              disabled={!skillId || cd > 0 || frozen || isAuto}
              className="relative rounded-xl flex flex-col items-center justify-center transition-all disabled:opacity-40 overflow-hidden"
              style={{
                border: `2px solid ${isActiveSkill ? color : ready ? color + 'aa' : color + '44'}`,
                width: 80, height: 64,
                background: isActiveSkill ? color + '22' : ready ? color + '11' : 'transparent',
                boxShadow: isActiveSkill ? `0 0 16px ${color}88` : 'none',
              }}>
              {/* Cooldown overlay */}
              {cd > 0 && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl"
                  style={{ background: 'rgba(10,9,16,0.75)' }}>
                  <span className="text-sm font-black" style={{ color }}>{cdSec(cd)}</span>
                </div>
              )}
              <span className="text-[9px] font-bold tracking-wider" style={{ color }}>{i + 1}</span>
              <span className="text-[9px] font-semibold text-center leading-tight px-1" style={{ color: ready ? C.text : C.muted }}>
                {skill?.name.ru ?? '—'}
              </span>
              {skill && <span className="text-[8px]" style={{ color: C.muted }}>{skill.mpCost} MP</span>}
            </button>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {/* Dodge */}
        <button onClick={onDodge} disabled={!hasPending || isAuto || frozen}
          className="rounded-xl px-4 py-2 text-xs font-black transition-all disabled:opacity-30"
          style={{ background: C.cyan + '22', color: C.cyan, border: `2px solid ${hasPending && !frozen ? C.cyan : C.cyan + '44'}` }}>
          УКЛОН
        </button>

        {/* Main ATTACK */}
        <button onClick={onAttack} disabled={!hasEnemy || hasPending || isAuto || frozen || atkOnCd}
          className="relative rounded-xl px-5 py-2 font-black text-sm transition-all disabled:opacity-50 overflow-hidden"
          style={{ background: atkOnCd ? C.pink + '55' : C.pink, color: C.text, border: `2px solid ${C.pink}`, minWidth: 90 }}>
          {atkOnCd ? <span className="font-mono text-xs">{atkCdSec}с</span> : '⚔ АТАКА'}
        </button>

        {/* Parry */}
        <button onClick={onParry} disabled={!canParry || isAuto || frozen}
          className="rounded-xl px-4 py-2 text-xs font-black transition-all disabled:opacity-30"
          style={{ background: C.yellow + '22', color: C.yellow, border: `2px solid ${canParry && !frozen ? C.yellow : C.yellow + '44'}` }}>
          ПАРИ
        </button>
      </div>

      {/* Showtime + Auto */}
      <div className="flex gap-2">
        <button onClick={onShowtime} disabled={!canShowtime || isAuto}
          className="rounded-xl px-4 py-2 text-xs font-black transition-all disabled:opacity-30"
          style={{ background: canShowtime ? C.yellow : C.dim, color: canShowtime ? '#0a0910' : C.muted, border: `1px solid ${canShowtime ? C.yellow : 'transparent'}` }}>
          ✨ SHOWTIME
        </button>
        <button onClick={() => setIsAuto(!isAuto)}
          className="rounded-xl px-4 py-2 text-xs font-semibold transition-all"
          style={{ background: isAuto ? '#5ae55a22' : C.dim, color: isAuto ? '#5ae55a' : C.muted, border: `1px solid ${isAuto ? '#5ae55a' : 'transparent'}` }}>
          {isAuto ? '⚡ АВТО' : 'АВТО'}
        </button>
      </div>
    </div>
  );
}

function ScenarioChips({ session }: { session: CombatSession }) {
  if (session.scenarioProgress.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 max-w-[220px]">
      {session.scenarioProgress.map(sp => {
        const def = DEFAULT_SCENARIOS.find(s => s.id === sp.scenarioId);
        const color = sp.completed ? '#5ae55a' : sp.failed ? C.red : C.muted;
        const icon  = sp.completed ? '✓' : sp.failed ? '✗' : '○';
        return (
          <div key={sp.scenarioId} title={def?.condition.ru}
            className="rounded px-1.5 py-0.5 text-[9px] font-semibold"
            style={{ background: color + '22', color, border: `1px solid ${color}44` }}>
            {icon} {def?.name.ru ?? sp.scenarioId}
          </div>
        );
      })}
    </div>
  );
}

function LogTicker({ log }: { log: CombatLogEntry[] }) {
  const recent = log.slice(-4).reverse();
  const fmt = (e: CombatLogEntry): string => {
    switch (e.type) {
      case 'playerAttack': return `⚔ ${e.value}${e.isCrit ? ' КРИТ' : ''}${e.isWeakSpot ? ' 🎯' : ''}`;
      case 'enemyAttack':  return `💥 −${e.value}`;
      case 'playerDodge':  return e.text === 'passive' ? '💨 уклон (пасс.)' : '💨 уклон';
      case 'playerParry':  return '🛡 парирование';
      case 'enemyDeath':   return `☠ враг #${e.value}`;
      case 'showtime':     return '✨ SHOWTIME!';
      case 'stagger':      return '⚡ Stagger!';
      case 'phaseChange':  return `🔥 Фаза ${e.value}`;
      case 'randomEvent':  return `🎲 ${e.text ?? ''}`;
      default:             return e.text ?? e.type;
    }
  };
  return (
    <div className="flex flex-col gap-0.5 min-w-[160px]">
      {recent.map((e, i) => (
        <div key={i} className="text-[9px] font-mono truncate" style={{ color: i === 0 ? C.text : C.muted + '77', opacity: 1 - i * 0.2 }}>
          {fmt(e)}
        </div>
      ))}
    </div>
  );
}

// ── Combat HUD ────────────────────────────────────────────────────────────────

function CombatHUD({ session }: { session: CombatSession }) {
  const { combatPlayerAttack, combatPlayerDodge, combatPlayerParry, combatActivateShowtime, combatTick, combatUseSkill, endCombat } = useStudioStore(useShallow(s => ({
    combatPlayerAttack:  s.combatPlayerAttack,
    combatPlayerDodge:   s.combatPlayerDodge,
    combatPlayerParry:   s.combatPlayerParry,
    combatActivateShowtime: s.combatActivateShowtime,
    combatTick:          s.combatTick,
    combatUseSkill:      s.combatUseSkill,
    endCombat:           s.endCombat,
  })));

  const [isAuto, setIsAuto] = useState(false);
  const target = session.enemies[0] ?? null;
  const frozen = session.playerFreezeTicks > 0;
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
      if (s.showtime >= 100 && !s.showtimeActive) { a.combatActivateShowtime(); return; }
      if (s.enemies.length > 0 && s.playerAttackCooldownTicks === 0) { a.combatPlayerAttack(s.enemies[0].instanceId, false); return; }
    }, 80);
    return () => clearInterval(id);
  }, [isAuto]);

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: C.bg, fontFamily: 'monospace' }}>

      {/* ── TOP BAR ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between px-4 pt-3 pb-2 gap-4 shrink-0">
        <PlayerBars session={session} />
        <MomentumBlock momentum={session.momentum} showtimeActive={session.showtimeActive} enragedTicks={session.enragedTicks} />
        <WaveProgress session={session} />
      </div>

      {/* ── INSTINCT / EVENT FLASH ──────────────────────────── */}
      <div className="flex items-center justify-center gap-3 px-4 shrink-0 min-h-[24px]">
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
      </div>

      {/* ── ENEMY ZONE (center) ─────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-4 py-2">
        <EnemyZone session={session} onAttack={(id) => !isAuto && combatPlayerAttack(id, false)} />
      </div>

      {/* ── HERO SECTION ────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-2 px-4 pb-2 shrink-0">
        <ShowtimeBar showtime={session.showtime} active={session.showtimeActive} />
        <div className="text-xl font-black tracking-[0.4em]" style={{ color: C.cyan, textShadow: `0 0 16px ${C.cyan}66` }}>
          S L A Y
        </div>
      </div>

      {/* ── BOTTOM BAR ──────────────────────────────────────── */}
      <div className="flex items-end justify-between px-4 pb-4 gap-4 shrink-0">
        {/* Left: scenarios + log */}
        <div className="flex flex-col gap-2">
          <ScenarioChips session={session} />
          <LogTicker log={session.log} />
        </div>

        {/* Right: skills + actions */}
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

      {/* Exit */}
      <button onClick={endCombat}
        className="absolute top-2 right-20 text-[9px] transition-opacity hover:opacity-60"
        style={{ color: C.muted }}>✕ выйти</button>
    </div>
  );
}

// ── Results ───────────────────────────────────────────────────────────────────

function fmtTime(ticks: number) {
  const s = Math.floor(ticks * 0.2);
  return s >= 60 ? `${Math.floor(s / 60)}м ${s % 60}с` : `${s}с`;
}

function ResultsView({ session, onExit }: { session: CombatSession; onExit: () => void }) {
  const { applyRewards } = useStudioStore(useShallow(s => ({ applyRewards: s.applyRewards })));
  const [collected, setCollected] = useState(false);
  const [levelUp, setLevelUp] = useState<{ leveledUp: boolean; newLevel: number } | null>(null);
  const isVictory = session.status === 'victory';

  const showtimeCount = session.log.filter(e => e.type === 'showtime').length;
  const weakSpotCount = session.weakSpotHits;
  const timeFmt = fmtTime(session.tick);

  return (
    <div className="absolute inset-0 flex flex-col items-center gap-4 text-center px-6 overflow-y-auto py-6"
      style={{ background: C.bg, color: C.text }}>

      {/* Hero badge */}
      <div className="flex flex-col items-center gap-1">
        <div className="text-5xl">{isVictory ? '🏆' : '💀'}</div>
        <div className="text-4xl font-black tracking-widest"
          style={{ color: isVictory ? '#5ae55a' : C.red, textShadow: `0 0 30px ${isVictory ? '#5ae55a' : C.red}66` }}>
          {isVictory ? 'С Н Я Т О !' : 'П Р О В А Л'}
        </div>
        {isVictory && (
          <div className="text-xs tracking-widest" style={{ color: '#5ae55a99' }}>
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
          { label: 'Убито', value: String(session.totalKilled), color: C.pink },
          { label: 'Время', value: timeFmt, color: C.muted },
          { label: 'Макс ×', value: String(session.maxMomentum), color: C.yellow },
          { label: 'Showtime', value: String(showtimeCount), color: C.cyan },
          { label: 'Слабых точек', value: String(weakSpotCount), color: C.yellow },
          { label: 'HP осталось', value: `${Math.round((session.playerHp / session.playerHpMax) * 100)}%`, color: session.playerHp / session.playerHpMax <= 0.15 ? C.red : '#5ae55a' },
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
              { icon: '💰', label: 'Монеты', value: session.rewards.coins },
              { icon: '⭐', label: 'Опыт', value: session.rewards.xp },
              { icon: '🎞', label: 'Сталлонки', value: session.rewards.stallonkas },
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
              const def = DEFAULT_SCENARIOS.find(s => s.id === sp.scenarioId);
              const color = sp.completed ? '#5ae55a' : sp.failed ? C.red : C.muted;
              return (
                <div key={sp.scenarioId} className="rounded-lg px-3 py-2 flex items-center gap-2"
                  style={{ background: color + '11', border: `1px solid ${color}44` }}>
                  <span className="text-sm font-black" style={{ color }}>
                    {sp.completed ? '✓' : sp.failed ? '✗' : '—'}
                  </span>
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
          <button onClick={() => { const r = applyRewards(); setLevelUp(r); setCollected(true); }}
            className="rounded-xl px-7 py-3 font-black transition-all"
            style={{ background: '#5ae55a22', color: '#5ae55a', border: `2px solid #5ae55a` }}>
            ✓ Забрать
          </button>
        )}
        <button onClick={onExit}
          className="rounded-xl px-7 py-3 font-black transition-all"
          style={{ background: C.pink + '22', color: C.pink, border: `2px solid ${C.pink}` }}>
          ← Деревня
        </button>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function CombatOverlay({ currentPageId }: { currentPageId: string | null }) {
  const { combatSession, combatTick, endCombat, selectPage } = useStudioStore(useShallow(s => ({
    combatSession: s.combatSession,
    combatTick:    s.combatTick,
    endCombat:     s.endCombat,
    selectPage:    s.selectPage,
  })));

  const tickRef = useRef(combatTick);
  tickRef.current = combatTick;

  useEffect(() => {
    if (!combatSession || combatSession.status !== 'active') return;
    const id = setInterval(() => tickRef.current(), 200);
    return () => clearInterval(id);
  }, [combatSession?.status, combatSession?.id]);

  const isCombatPage = currentPageId === 'combat_wave_select';
  const hasSession   = combatSession !== null;

  if (!isCombatPage && !hasSession) return null;

  const handleExit = () => { endCombat(); selectPage('village'); };

  return (
    <div className="absolute inset-0 z-40 overflow-hidden">
      {!hasSession && <WaveSelect />}
      {hasSession && combatSession!.status === 'active' && <CombatHUD session={combatSession!} />}
      {hasSession && (combatSession!.status === 'victory' || combatSession!.status === 'defeat') && (
        <ResultsView session={combatSession!} onExit={handleExit} />
      )}
    </div>
  );
}
