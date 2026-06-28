"use client";

import { useState, useMemo } from 'react';
import { useStudioStore } from '@/lib/store';
import { derivePlayerStats } from '@/lib/combat/engine';

type BalanceTab = 'stats' | 'damage' | 'wave' | 'progression';

// ── Helpers ───────────────────────────────────────────────────────────────────

function xpForLevel(lvl: number) {
  return Math.round(100 * Math.pow(lvl, 1.5));
}

function spAtLevel(lvl: number) {
  return 2 + (lvl % 5 === 0 ? 1 : 0);
}

function runSimulation(
  hpMax: number, atk: number, critCh: number, critDmg: number, defPct: number,
  pool: { hp: number; atk: number; weight: number }[],
  count: number,
  hunter: boolean,
  iters = 1000,
) {
  if (!pool.length) return { rate: 0, avgHp: 0, avgDmg: 0 };
  const totalW = pool.reduce((s, e) => s + e.weight, 0);
  let surv = 0, sumHp = 0, sumDmg = 0;

  for (let i = 0; i < iters; i++) {
    let hp = hpMax, dmgIn = 0, dead = false;

    for (let k = 0; k < count && !dead; k++) {
      let r = Math.random() * totalW;
      let enemy = pool[pool.length - 1];
      for (const e of pool) { r -= e.weight; if (r <= 0) { enemy = e; break; } }

      let eHp = enemy.hp;
      while (eHp > 0 && hp > 0) {
        const isCrit = Math.random() < critCh / 100;
        const isWeak = Math.random() < 0.3;
        let d = atk;
        if (isCrit) d *= critDmg / 100;
        if (isWeak) d *= hunter ? 2.2 : 1.8;
        eHp -= d;
        if (eHp > 0) {
          const taken = enemy.atk * (1 - defPct / 100);
          hp -= taken;
          dmgIn += taken;
        }
      }
      if (hp <= 0) dead = true;
    }

    if (!dead && hp > 0) { surv++; sumHp += hp; }
    sumDmg += dmgIn;
  }

  return {
    rate:   +(surv / iters * 100).toFixed(1),
    avgHp:  surv > 0 ? +(sumHp / surv).toFixed(0) : 0,
    avgDmg: +(sumDmg / iters).toFixed(0),
  };
}

// ── Shared UI helpers ─────────────────────────────────────────────────────────

function StatRow({ label, value, unit = '' }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="flex items-center justify-between py-0.5 border-b border-[var(--studio-border)] last:border-0">
      <span className="text-xs text-[var(--studio-text-muted)]">{label}</span>
      <span className="text-xs font-mono font-semibold text-[var(--studio-text)]">{value}{unit}</span>
    </div>
  );
}

function NumSlider({ label, value, min = 1, max = 20, onChange }: {
  label: string; value: number; min?: number; max?: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 shrink-0 text-[10px] text-[var(--studio-text-muted)]">{label}</span>
      <input
        type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="flex-1 h-1 accent-[var(--studio-accent)]"
      />
      <span className="w-6 shrink-0 text-xs text-right font-mono text-[var(--studio-text)]">{value}</span>
    </div>
  );
}

function SectionBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-3 rounded border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)]">
      <p className="text-[10px] font-semibold text-[var(--studio-text-secondary)] mb-2">{title}</p>
      {children}
    </div>
  );
}

// ── Base stat presets ─────────────────────────────────────────────────────────

const BASE_LVL1 = { str: 5, agi: 5, end: 10, mag: 5, lck: 5, lvl: 1 };

// ── Tab: СТАТЫ ────────────────────────────────────────────────────────────────

function StatsTab() {
  const [str, setStr] = useState(BASE_LVL1.str);
  const [agi, setAgi] = useState(BASE_LVL1.agi);
  const [end_, setEnd] = useState(BASE_LVL1.end);
  const [mag, setMag] = useState(BASE_LVL1.mag);
  const [lck, setLck] = useState(BASE_LVL1.lck);
  const [lvl, setLvl] = useState(BASE_LVL1.lvl);

  const s = useMemo(() => derivePlayerStats({ str, agi, end: end_, mag, lck, lvl }), [str, agi, end_, mag, lck, lvl]);

  const resetToLvl = (targetLvl: number) => {
    setStr(BASE_LVL1.str); setAgi(BASE_LVL1.agi); setEnd(BASE_LVL1.end);
    setMag(BASE_LVL1.mag); setLck(BASE_LVL1.lck); setLvl(targetLvl);
  };

  return (
    <div className="space-y-3">
      <SectionBox title="БАЗОВЫЕ ХАРАКТЕРИСТИКИ">
        <div className="space-y-1.5">
          <NumSlider label="Ур." value={lvl} min={1} max={50} onChange={setLvl} />
          <NumSlider label="STR" value={str} onChange={setStr} />
          <NumSlider label="AGI" value={agi} onChange={setAgi} />
          <NumSlider label="END" value={end_} onChange={setEnd} />
          <NumSlider label="MAG" value={mag} onChange={setMag} />
          <NumSlider label="LCK" value={lck} onChange={setLck} />
        </div>
        <div className="flex gap-1.5 mt-2.5">
          <button
            onClick={() => resetToLvl(1)}
            className="flex-1 py-1 text-[10px] font-medium rounded border border-[var(--studio-border)] bg-[var(--studio-bg)] hover:bg-[var(--studio-accent)]/10 text-[var(--studio-text-muted)] transition-colors"
          >
            1 ЛВЛ
          </button>
          <button
            onClick={() => resetToLvl(10)}
            className="flex-1 py-1 text-[10px] font-medium rounded border border-[var(--studio-border)] bg-[var(--studio-bg)] hover:bg-[var(--studio-accent)]/10 text-[var(--studio-text-muted)] transition-colors"
          >
            10 ЛВЛ
          </button>
          <button
            onClick={() => setLvl(l => Math.min(50, l + 1))}
            className="flex-1 py-1 text-[10px] font-medium rounded bg-[var(--studio-accent)] text-white hover:opacity-90 transition-opacity"
          >
            + Уровень
          </button>
        </div>
      </SectionBox>
      <SectionBox title="ПРОИЗВОДНЫЕ">
        <StatRow label="HP Макс" value={s.hpMax} />
        <StatRow label="MP Макс" value={s.mpMax} />
        <StatRow label="ATK" value={s.atk} />
        <StatRow label="Защита (flat)" value={s.defFlat} />
        <StatRow label="Снижение урона" value={s.defPct} unit="%" />
        <StatRow label="Уворот" value={s.dodge} unit="%" />
        <StatRow label="Крит шанс" value={s.critCh} unit="%" />
        <StatRow label="Крит урон" value={s.critDmg} unit="%" />
      </SectionBox>
      <p className="text-[10px] text-[var(--studio-text-muted)] px-0.5 leading-relaxed">
        HP = END×10 + ур×5<br />
        MP = MAG×5<br />
        ATK = (STR×1.5) × (1+ур×0.03)<br />
        DEF% = ур×0.5 (+ экипировка)<br />
        Уворот = min(40, AGI×0.3)%<br />
        Крит = min(60, LCK×0.4)%
      </p>
    </div>
  );
}

// ── Tab: УРОН ─────────────────────────────────────────────────────────────────

function DamageTab() {
  const { enemies } = useStudioStore();
  const [str, setStr] = useState(BASE_LVL1.str);
  const [agi, setAgi] = useState(BASE_LVL1.agi);
  const [end_, setEnd] = useState(BASE_LVL1.end);
  const [lck, setLck] = useState(BASE_LVL1.lck);
  const [lvl, setLvl] = useState(BASE_LVL1.lvl);
  const [selectedEnemyId, setSelectedEnemyId] = useState('');
  const [hunter, setHunter] = useState(false);

  const s = useMemo(() => derivePlayerStats({ str, agi, end: end_, mag: 5, lck, lvl }), [str, agi, end_, lck, lvl]);
  const enemy = enemies.find(e => e.id === selectedEnemyId);
  const weakMult = hunter ? 2.2 : 1.8;

  const rows = useMemo(() => {
    const base       = s.atk;
    const crit       = +(base * s.critDmg / 100).toFixed(1);
    const weak       = +(base * weakMult).toFixed(1);
    const weakCrit   = +(crit * weakMult).toFixed(1);
    const st         = +(base * 3.5).toFixed(1); // CDD: Showtime ×3.5
    const stCrit     = +(crit * 3.5).toFixed(1);
    const stWeak     = +(base * 3.5 * weakMult).toFixed(1);

    const hitsToKill = enemy ? {
      normal:   Math.ceil(enemy.hp / base),
      crit:     Math.ceil(enemy.hp / crit),
      weak:     Math.ceil(enemy.hp / weak),
      showtime: Math.ceil(enemy.hp / st),
    } : null;

    return { base, crit, weak, weakCrit, st, stCrit, stWeak, hitsToKill };
  }, [s, weakMult, enemy]);

  return (
    <div className="space-y-3">
      <SectionBox title="ПАРАМЕТРЫ ПЕРСОНАЖА">
        <div className="space-y-1.5">
          <NumSlider label="Ур." value={lvl} min={1} max={50} onChange={setLvl} />
          <NumSlider label="STR" value={str} onChange={setStr} />
          <NumSlider label="AGI" value={agi} onChange={setAgi} />
          <NumSlider label="END" value={end_} onChange={setEnd} />
          <NumSlider label="LCK" value={lck} onChange={setLck} />
        </div>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer mt-2">
          <input type="checkbox" checked={hunter} onChange={e => setHunter(e.target.checked)} className="accent-[var(--studio-accent)]" />
          <span className="text-[var(--studio-text-muted)]">Инстинкт «Охотник» (слабая ×2.2)</span>
        </label>
      </SectionBox>

      <SectionBox title="ЦЕЛЬ (опционально)">
        <select
          value={selectedEnemyId}
          onChange={e => setSelectedEnemyId(e.target.value)}
          className="w-full text-xs bg-[var(--studio-bg)] border border-[var(--studio-border)] rounded p-1 text-[var(--studio-text)]"
        >
          <option value="">— без цели —</option>
          {enemies.map(e => (
            <option key={e.id} value={e.id}>{e.name.ru} (HP {e.hp}, ATK {e.atk})</option>
          ))}
        </select>
      </SectionBox>

      <SectionBox title="УРОН ЗА УДАР">
        <StatRow label="Базовый удар" value={rows.base} />
        <StatRow label="Крит" value={rows.crit} />
        <StatRow label={`Слабая точка (×${weakMult})`} value={rows.weak} />
        <StatRow label="Слабая + Крит" value={rows.weakCrit} />
        <StatRow label="Showtime (×1.5)" value={rows.st} />
        <StatRow label="Showtime + Крит" value={rows.stCrit} />
        <StatRow label="Showtime + Слабая" value={rows.stWeak} />
        {enemy && rows.hitsToKill && (
          <>
            <div className="my-2 border-t border-[var(--studio-border)]" />
            <p className="text-[10px] text-[var(--studio-text-muted)] mb-1">Ударов чтобы убить {enemy.name.ru} (HP {enemy.hp})</p>
            <StatRow label="Базовым" value={rows.hitsToKill.normal} />
            <StatRow label="Критом" value={rows.hitsToKill.crit} />
            <StatRow label="Слабой точкой" value={rows.hitsToKill.weak} />
            <StatRow label="В Showtime" value={rows.hitsToKill.showtime} />
          </>
        )}
      </SectionBox>
    </div>
  );
}

// ── Tab: ВОЛНА ────────────────────────────────────────────────────────────────

function WaveTab() {
  const { enemies, waves } = useStudioStore();
  const [str, setStr] = useState(BASE_LVL1.str);
  const [agi, setAgi] = useState(BASE_LVL1.agi);
  const [end_, setEnd] = useState(BASE_LVL1.end);
  const [mag, setMag] = useState(BASE_LVL1.mag);
  const [lck, setLck] = useState(BASE_LVL1.lck);
  const [lvl, setLvl] = useState(BASE_LVL1.lvl);
  const [selectedWaveId, setSelectedWaveId] = useState('');
  const [enemyCount, setEnemyCount] = useState(3);
  const [hunter, setHunter] = useState(false);
  const [result, setResult] = useState<{ rate: number; avgHp: number; avgDmg: number } | null>(null);

  const s    = useMemo(() => derivePlayerStats({ str, agi, end: end_, mag, lck, lvl }), [str, agi, end_, mag, lck, lvl]);
  const wave = waves.find(w => w.id === selectedWaveId);

  const pool = useMemo(() => {
    if (!wave) return [];
    return wave.enemyPool.flatMap(entry => {
      const e = enemies.find(x => x.id === entry.enemyId);
      return e ? [{ hp: e.hp, atk: e.atk, weight: entry.weight }] : [];
    });
  }, [wave, enemies]);

  const run = () => {
    const r = runSimulation(s.hpMax, s.atk, s.critCh, s.critDmg, s.defPct, pool, enemyCount, hunter);
    setResult(r);
  };

  const survivalColor = result
    ? result.rate > 70 ? '#22c55e' : result.rate > 40 ? '#f59e0b' : '#ef4444'
    : '#22c55e';

  return (
    <div className="space-y-3">
      <SectionBox title="ПЕРСОНАЖ">
        <div className="space-y-1.5">
          <NumSlider label="Ур." value={lvl} min={1} max={50} onChange={setLvl} />
          <NumSlider label="STR" value={str} onChange={setStr} />
          <NumSlider label="AGI" value={agi} onChange={setAgi} />
          <NumSlider label="END" value={end_} onChange={setEnd} />
          <NumSlider label="MAG" value={mag} onChange={setMag} />
          <NumSlider label="LCK" value={lck} onChange={setLck} />
        </div>
        <div className="mt-2 pt-2 border-t border-[var(--studio-border)] space-y-0.5">
          <StatRow label="HP" value={s.hpMax} />
          <StatRow label="ATK" value={s.atk} />
          <StatRow label="DEF%" value={s.defPct} unit="%" />
          <StatRow label="Уворот" value={s.dodge} unit="%" />
          <StatRow label="Крит" value={s.critCh} unit="%" />
        </div>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer mt-2">
          <input type="checkbox" checked={hunter} onChange={e => setHunter(e.target.checked)} className="accent-[var(--studio-accent)]" />
          <span className="text-[var(--studio-text-muted)]">Инстинкт «Охотник»</span>
        </label>
      </SectionBox>

      <SectionBox title="ВОЛНА">
        {waves.length === 0 ? (
          <p className="text-xs text-[var(--studio-text-muted)]">Нет волн — создай их во вкладке БОЁВКА</p>
        ) : (
          <>
            <select
              value={selectedWaveId}
              onChange={e => setSelectedWaveId(e.target.value)}
              className="w-full text-xs bg-[var(--studio-bg)] border border-[var(--studio-border)] rounded p-1 text-[var(--studio-text)] mb-2"
            >
              <option value="">— выбери волну —</option>
              {waves.map(w => (
                <option key={w.id} value={w.id}>{w.name.ru} ({w.enemyPool.length} тип(ов) врагов)</option>
              ))}
            </select>
            <NumSlider label="Врагов" value={enemyCount} min={1} max={20} onChange={setEnemyCount} />
            {wave && pool.length === 0 && (
              <p className="text-[10px] text-amber-500 mt-1">Враги в волне не найдены в базе — создай их во вкладке БОЁВКА</p>
            )}
          </>
        )}
      </SectionBox>

      <button
        onClick={run}
        disabled={!wave || pool.length === 0}
        className="w-full py-1.5 rounded text-xs font-medium bg-[var(--studio-accent)] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
      >
        Симуляция (1 000 итераций)
      </button>

      {result && (
        <SectionBox title="РЕЗУЛЬТАТ">
          <div className="mb-2">
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-[var(--studio-text-muted)]">Выживаемость</span>
              <span className="font-mono font-bold" style={{ color: survivalColor }}>{result.rate}%</span>
            </div>
            <div className="h-2 rounded bg-[var(--studio-border)]">
              <div
                className="h-2 rounded transition-all duration-300"
                style={{ width: `${result.rate}%`, background: survivalColor }}
              />
            </div>
          </div>
          <StatRow label="Ср. HP оставшееся (выжил)" value={result.avgHp} />
          <StatRow label="Ср. урон получено" value={result.avgDmg} />
          <p className="text-[10px] text-[var(--studio-text-muted)] mt-2">
            Слабая точка срабатывает ~30% ударов. Шанс крита: {s.critCh}%
          </p>
        </SectionBox>
      )}
    </div>
  );
}

// ── Tab: ПРОГРЕССИЯ ───────────────────────────────────────────────────────────

function ProgressionTab() {
  const [startStr, setStartStr] = useState(BASE_LVL1.str);
  const [startAgi, setStartAgi] = useState(BASE_LVL1.agi);
  const [startEnd, setStartEnd] = useState(BASE_LVL1.end);
  const [startMag, setStartMag] = useState(BASE_LVL1.mag);
  const [startLck, setStartLck] = useState(BASE_LVL1.lck);

  const rows = useMemo(() => {
    const data: {
      lvl: number; xpNext: number | null; sp: number; totalSp: number;
      totalXp: number; hpMax: number; mpMax: number; atk: number;
    }[] = [];

    let totalXp = 0;
    let totalSp = 0;

    for (let lvl = 1; lvl <= 50; lvl++) {
      totalXp += lvl > 1 ? xpForLevel(lvl - 1) : 0;
      const sp = spAtLevel(lvl);
      totalSp += sp;
      const baseSum = startStr + startAgi + startEnd + startMag + startLck;
      const bonusSp = totalSp - baseSum;
      const extraEnd = Math.floor(Math.max(0, bonusSp) / 5);
      const s = derivePlayerStats({ str: startStr, agi: startAgi, end: startEnd + extraEnd, mag: startMag, lck: startLck, lvl });
      data.push({
        lvl,
        xpNext: lvl < 50 ? xpForLevel(lvl) : null,
        sp,
        totalSp,
        totalXp,
        hpMax: s.hpMax,
        mpMax: s.mpMax,
        atk: s.atk,
      });
    }
    return data;
  }, [startStr, startAgi, startEnd, startMag, startLck]);

  return (
    <div className="space-y-3">
      <SectionBox title="СТАРТОВЫЕ ХАРАКТЕРИСТИКИ">
        <div className="space-y-1.5">
          <NumSlider label="STR" value={startStr} onChange={setStartStr} />
          <NumSlider label="AGI" value={startAgi} onChange={setStartAgi} />
          <NumSlider label="END" value={startEnd} onChange={setStartEnd} />
          <NumSlider label="MAG" value={startMag} onChange={setStartMag} />
          <NumSlider label="LCK" value={startLck} onChange={setStartLck} />
        </div>
        <p className="text-[10px] text-[var(--studio-text-muted)] mt-1">
          Доп. очки → END (для наглядности роста HP)
        </p>
      </SectionBox>

      <div className="overflow-x-auto rounded border border-[var(--studio-border)]">
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="bg-[var(--studio-bg-elevated)] sticky top-0">
              {['Ур', 'XP до сл.', 'Очки', 'Всего', 'Сумм.XP', 'HP', 'MP', 'ATK'].map(h => (
                <th key={h} className="px-1.5 py-1 text-right first:text-left border-b border-[var(--studio-border)] text-[var(--studio-text-muted)] font-semibold whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr
                key={r.lvl}
                className={[
                  r.lvl % 10 === 0 ? 'bg-[var(--studio-accent)]/10 font-bold' : r.lvl % 5 === 0 ? 'bg-[var(--studio-accent)]/5' : '',
                  'hover:bg-[var(--studio-bg-elevated)]/60',
                ].join(' ')}
              >
                <td className="px-1.5 py-0.5 border-b border-[var(--studio-border)] text-[var(--studio-text)]">{r.lvl}</td>
                <td className="px-1.5 py-0.5 border-b border-[var(--studio-border)] text-right text-[var(--studio-text-muted)]">
                  {r.xpNext?.toLocaleString('ru') ?? '—'}
                </td>
                <td className="px-1.5 py-0.5 border-b border-[var(--studio-border)] text-right text-[var(--studio-accent)] font-semibold">+{r.sp}</td>
                <td className="px-1.5 py-0.5 border-b border-[var(--studio-border)] text-right text-[var(--studio-text)]">{r.totalSp}</td>
                <td className="px-1.5 py-0.5 border-b border-[var(--studio-border)] text-right text-[var(--studio-text-muted)]">
                  {r.totalXp.toLocaleString('ru')}
                </td>
                <td className="px-1.5 py-0.5 border-b border-[var(--studio-border)] text-right text-[var(--studio-text)]">{r.hpMax}</td>
                <td className="px-1.5 py-0.5 border-b border-[var(--studio-border)] text-right text-[var(--studio-text)]">{r.mpMax}</td>
                <td className="px-1.5 py-0.5 border-b border-[var(--studio-border)] text-right text-[var(--studio-text)]">{r.atk}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function BalancePanel() {
  const [tab, setTab] = useState<BalanceTab>('stats');

  const tabs: { id: BalanceTab; label: string }[] = [
    { id: 'stats',       label: 'СТАТЫ'      },
    { id: 'damage',      label: 'УРОН'       },
    { id: 'wave',        label: 'ВОЛНА'      },
    { id: 'progression', label: 'ПРОГРЕССИЯ' },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-[var(--studio-border)] shrink-0">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-1.5 text-[10px] font-medium transition-colors ${
              tab === t.id
                ? 'text-[var(--studio-accent)] border-b-2 border-[var(--studio-accent)]'
                : 'text-[var(--studio-text-muted)] hover:text-[var(--studio-text-secondary)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {tab === 'stats'       && <StatsTab />}
        {tab === 'damage'      && <DamageTab />}
        {tab === 'wave'        && <WaveTab />}
        {tab === 'progression' && <ProgressionTab />}
      </div>
    </div>
  );
}
