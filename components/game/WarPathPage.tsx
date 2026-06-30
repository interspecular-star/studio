'use client';

import { useState, useEffect } from 'react';
import { useStudioStore } from '@/lib/store';

// ── Static data ───────────────────────────────────────────────────────────────

const WAVES = [
  { id: 'w1', num: '1', name: 'Околица',       enemies: 'Тапки, веники, один злой кот',          reward: '40💰',  state: 'cleared',   endlessRecord: '×31', endlessDesc: 'бесконечные тапки, растущий счёт' },
  { id: 'w2', num: '2', name: 'Свалка',        enemies: 'Говорящий хлам, банка-мутант',           reward: '95💰',  state: 'cleared',   endlessRecord: '×18', endlessDesc: 'волны хлама без передышки' },
  { id: 'w3', num: '3', name: 'Огороды',       enemies: 'Пугала, кроты-рейдеры',                 reward: '160💰', state: 'cleared',   endlessRecord: '×9',  endlessDesc: 'пугала прибывают' },
  { id: 'w4', num: '4', name: 'Гаражи',        enemies: 'Утюги-дроны, дядя с болгаркой',         reward: '240💰', state: 'available', endlessRecord: '',    endlessDesc: '' },
  { id: 'w5', num: '5', name: 'Заброшка',      enemies: 'Призрак-сисадмин, крысоботы',           reward: '380💰', state: 'locked',    lock: 'нужен ур.26',  endlessRecord: '', endlessDesc: '' },
  { id: 'w6', num: '6', name: 'Болото помех',  enemies: 'Глитч-жабы, сигнал-пиявки',             reward: '520💰', state: 'locked',    lock: 'пройди Заброшку', endlessRecord: '', endlessDesc: '' },
  { id: 'w7', num: '7', name: 'Граница Миров', enemies: 'Курица с лазерами, Босс-роутер',        reward: '800💰', state: 'locked',    lock: 'пройди Болото',   endlessRecord: '', endlessDesc: '' },
] as const;

const SKILLS = [
  { id: 'sk1', icon: '🗡️', name: 'Рубящий с протяжкой' },
  { id: 'sk2', icon: '🌀', name: 'Вихрь раздражения' },
  { id: 'sk3', icon: '🛡️', name: 'Стойка вахтёра' },
  { id: 'sk4', icon: '📢', name: 'Громкий мат (AoE)' },
];

const SCENARIOS = [
  { id: 'sc1', name: 'Обычный дубль',    effect: 'без модификаторов · награда ×1.0' },
  { id: 'sc2', name: 'Хоррор-съёмка',   effect: 'враги злее, но дроп ×1.5' },
  { id: 'sc3', name: 'Комедия положений', effect: 'враги путаются · больше VHS' },
];

const INSTINCTS = [
  { id: 'in1', icon: '💢', name: 'Берсерк' },
  { id: 'in2', icon: '🍀', name: 'Везучий' },
  { id: 'in3', icon: '🧲', name: 'Жадина' },
  { id: 'in4', icon: '🦅', name: 'Зоркий' },
  { id: 'in5', icon: '🐌', name: 'Упрямый' },
];

const POTIONS = [
  { id: 'p1', icon: '❤️', name: 'Зелье жизни', count: 5 },
  { id: 'p2', icon: '💙', name: 'Зелье маны',  count: 3 },
  { id: 'p3', icon: '🔥', name: 'Зелье ярости', count: 2 },
  { id: 'p4', icon: '🟢', name: 'Антидот',      count: 1 },
];

const CREW_LINES = [
  { name: 'Режиссёр Вики', role: 'постановка', icon: '🎬', accent: '#cf8a5a', quote: 'Свет! Камера! Слэй, не позорь меня перед курицей с лазерами.' },
  { name: 'Оператор Гена', role: 'камера',     icon: '📹', accent: '#6f8fb0', quote: 'Снимаю широким планом. Постарайся хотя бы не умереть в первые три секунды.' },
  { name: 'Звукач Лёва',   role: 'звук',       icon: '🎙️', accent: '#7faf6a', quote: 'Когда будешь орать от боли — ори ближе к микрофону, ладно?' },
  { name: 'Гримёр Зося',   role: 'грим',       icon: '💄', accent: '#b48fc4', quote: 'Кровь нарисовала заранее. Надеюсь, настоящая не понадобится.' },
];

const BUFFS_INIT = [
  { id: 'b1', icon: '🍺', name: 'Эль храбрости', total: 300, left: 218, barColor: '#d6a24e' },
  { id: 'b2', icon: '📼', name: 'VHS-перемотка',  total: 600, left: 402, barColor: '#b48fc4' },
  { id: 'b3', icon: '🐾', name: 'Инстинкт зверя', total: 180, left: 47,  barColor: '#7faf6a' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'k';
  return Math.floor(n).toString();
}

function fmtTime(sec: number): string {
  const s = Math.max(0, sec);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

// ── Style constants ───────────────────────────────────────────────────────────

const VT:   React.CSSProperties = { fontFamily: 'var(--font-vt, VT323, monospace)', lineHeight: 1 };
const SILK: React.CSSProperties = { fontFamily: 'var(--font-silk, Silkscreen, monospace)', letterSpacing: '0.5px' };
const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono, Space Mono, monospace)' };
const DOT:  React.CSSProperties = { fontFamily: 'var(--font-dot, DotGothic16, sans-serif)' };

const LCD: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
  background: '#161009', border: '1px solid #3a2c18', borderRadius: 4,
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function WarPathPage() {
  const { variables, playtestState, executeAction } = useStudioStore();

  const [selWave, setSelWave]       = useState('w4');
  const [selMode, setSelMode]       = useState<'normal' | 'endless' | 'super'>('normal');
  const [skillsOn, setSkillsOn]     = useState<Record<string, boolean>>({ sk1: true, sk2: true, sk3: false, sk4: false });
  const [scenario, setScenario]     = useState('sc1');
  const [instinctsOn, setInstinctsOn] = useState<Record<string, boolean>>({ in1: true, in3: true });
  const [potionsOn, setPotionsOn]   = useState<Record<string, boolean>>({ p1: true, p2: true });
  const [tick, setTick]             = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Variable reads ──
  const getVal = (name: string): number => {
    const v = variables.find(vv => vv.name === name);
    if (!v) return 0;
    const live = playtestState.variableValues[v.id];
    return typeof live === 'number' ? live : (v.defaultValue as number) ?? 0;
  };

  const hp      = getVal('health');
  const hpMax   = getVal('health_max') || 100;
  const mp      = getVal('mana');
  const mpMax   = getVal('mana_max') || 50;
  const exp     = getVal('exp');
  const level   = getVal('level') || 1;
  const coins   = getVal('coins');
  const fuel    = getVal('gasoline');
  const vhs     = getVal('vhs');
  const gems    = getVal('gems');
  const souls   = getVal('souls');

  const hpPct   = hpMax > 0 ? Math.min(100, (hp / hpMax) * 100) : 100;
  const mpPct   = mpMax > 0 ? Math.min(100, (mp / mpMax) * 100) : 100;
  const expToNext = Math.max(80, Math.floor(level * 80 + 20));
  const expPct  = Math.min(100, ((exp % expToNext) / expToNext) * 100);
  const isLowHp = hpPct < 25;

  // ── Derived ──
  const clearedCount = WAVES.filter(w => w.state === 'cleared').length;
  const superUnlocked = clearedCount >= 2;
  const crewLine = CREW_LINES[Math.floor(tick / 7) % CREW_LINES.length];

  const selectWave = (id: string, mode: 'normal' | 'endless' | 'super') => {
    setSelWave(id); setSelMode(mode);
  };

  // Chosen take summary
  const chosenWave = WAVES.find(w => w.id === selWave) ?? WAVES[3];
  let chosenName: string, chosenMode: string, chosenModeBg: string, chosenModeColor: string, chosenFuel: string, chosenTime: string;
  if (selWave === 'super') {
    chosenName = 'SUPER ENDLESS'; chosenMode = 'ХАОС'; chosenModeBg = '#2a1410'; chosenModeColor = '#cf6a5a'; chosenFuel = '6'; chosenTime = '∞';
  } else if (selMode === 'endless') {
    chosenName = chosenWave.name; chosenMode = 'ENDLESS'; chosenModeBg = 'rgba(180,143,196,0.2)'; chosenModeColor = '#d6b8e2'; chosenFuel = '4'; chosenTime = '∞';
  } else {
    chosenName = chosenWave.name; chosenMode = 'ОБЫЧНЫЙ'; chosenModeBg = '#2a2113'; chosenModeColor = '#e0c178'; chosenFuel = '3'; chosenTime = '2 мин';
  }

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      background: '#241810', color: '#ecdcc0',
      backgroundImage: 'repeating-linear-gradient(92deg,rgba(0,0,0,0.10) 0px,rgba(0,0,0,0.10) 1px,transparent 1px,transparent 9px),repeating-linear-gradient(92deg,rgba(140,104,58,0.05) 3px,transparent 4px,transparent 16px)',
      fontFamily: 'var(--font-body, Hanken Grotesk, system-ui, sans-serif)',
      overflow: 'hidden',
    }}>

      {/* ===== HUD BAR ===== */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 18px', background: '#1a120a', borderBottom: '1px solid #5a4226', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, border: '2px solid #c39b4e', borderRadius: 4, background: 'repeating-linear-gradient(45deg,#2a1d10,#2a1d10 4px,#241810 4px,#241810 8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ ...SILK, fontSize: '8px', color: '#c39b4e' }}>СЛЭЙ</span>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ ...DOT, fontSize: '14px', color: '#e7d8b4' }}>СЛЭЙ</span>
              <span style={{ ...MONO, fontSize: '10px', color: '#a8916a' }}>наёмник · ур.{level}</span>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 4, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ ...MONO, fontSize: '9px', color: '#a8916a' }}>HP</span>
                <div style={{ width: 72, height: 6, background: '#2a1d10', borderRadius: 3, overflow: 'hidden', border: '1px solid #3a2c18' }}>
                  <div style={{ height: '100%', width: `${hpPct}%`, background: isLowHp ? '#b15539' : '#7faf6a', transition: 'width 0.3s' }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ ...MONO, fontSize: '9px', color: '#a8916a' }}>MP</span>
                <div style={{ width: 52, height: 6, background: '#2a1d10', borderRadius: 3, overflow: 'hidden', border: '1px solid #3a2c18' }}>
                  <div style={{ height: '100%', width: `${mpPct}%`, background: '#c39b4e', transition: 'width 0.3s' }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ ...MONO, fontSize: '9px', color: '#a8916a' }}>EXP</span>
                <div style={{ width: 34, height: 6, background: '#2a1d10', borderRadius: 3, overflow: 'hidden', border: '1px solid #3a2c18' }}>
                  <div style={{ height: '100%', width: `${expPct}%`, background: '#6f8fb0', transition: 'width 0.3s' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={LCD}><span style={{ fontSize: 13 }}>💰</span><span style={{ ...VT, fontSize: '17px', color: '#e0c178' }}>{fmtNum(coins)}</span></div>
          <div style={LCD}><span style={{ fontSize: 13 }}>⛽</span><span style={{ ...VT, fontSize: '17px', color: '#d98a6a' }}>{fmtNum(fuel)}</span></div>
          <div style={LCD}><span style={{ fontSize: 13 }}>📼</span><span style={{ ...VT, fontSize: '17px', color: '#b8a888' }}>{fmtNum(vhs)}</span></div>
          <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#2a1d11', border: '1px solid #4a3722', borderRadius: 4 }}
            onClick={() => useStudioStore.getState().openInventory?.()}>
            <span style={{ fontSize: 13 }}>🎒</span>
            <span style={{ fontSize: 12, color: '#d8c8aa' }}>Инвентарь</span>
          </div>
        </div>
      </div>

      {/* ===== TITLE BAND ===== */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 22px', background: 'linear-gradient(180deg,#2f2114,#241810)', borderBottom: '1px solid #5a4226', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => executeAction({ type: 'goToPage', pageId: 'village' })}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: '#46341f', border: '1px solid #6e5430', borderRadius: 4, color: '#c39b4e', fontSize: 12, cursor: 'pointer' }}>
            ← площадь
          </button>
          <span style={{ ...DOT, fontSize: '26px', color: '#e7d8b4', letterSpacing: '1px' }}>ТРОПА ВОЙНЫ</span>
          <span style={{ fontSize: 12, color: '#a8916a' }}>съёмочная площадка · дубль готовят</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d98a6a', boxShadow: '0 0 8px #d98a6a', display: 'inline-block' }} />
          <span style={{ ...MONO, fontSize: '10px', color: '#a8916a' }}>КАМЕРА ГОТОВА · дублей сегодня: 6</span>
        </div>
      </div>

      {/* ===== BODY ===== */}
      <div style={{ flex: 1, display: 'flex', gap: 14, padding: '14px 18px', minHeight: 0 }}>

        {/* ── COL 1: ВОЛНЫ ── */}
        <div style={{ flex: 1.18, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <span style={{ ...SILK, fontSize: '11px', color: '#c39b4e', letterSpacing: '1px' }}>▷ ВЫБОР ВОЛНЫ</span>
            <span style={{ ...MONO, fontSize: '10px', color: '#8a724a' }}>пройдено {clearedCount}/{WAVES.length}</span>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
            {WAVES.map(w => {
              const isLocked    = w.state === 'locked';
              const isCleared   = w.state === 'cleared';
              const selNormal   = selWave === w.id && selMode === 'normal';
              const selEndless  = selWave === w.id && selMode === 'endless';

              const border   = isLocked ? '#2c2012' : (selNormal ? '#e0c178' : (isCleared ? '#46341f' : '#7faf6a'));
              const bg       = isLocked ? '#170f08' : (selNormal ? '#2a2113' : '#211711');
              const glow     = selNormal ? '0 0 0 1px #e0c178, 0 0 13px rgba(224,193,120,0.35)' : 'inset 0 2px 6px rgba(0,0,0,0.4)';
              const opacity  = isLocked ? 0.55 : 1;
              const numColor = isCleared ? '#7faf6a' : (isLocked ? '#6e5e44' : '#e0c178');
              const nameColor = isLocked ? '#8a7d62' : '#e7d8b4';
              const numLabel = isLocked ? '🔒' : w.num;

              let badge: string, badgeBg: string, badgeColor: string;
              if (isCleared)          { badge = '✓ ПРОЙДЕНО'; badgeBg = '#1e2a16'; badgeColor = '#7faf6a'; }
              else if (!isLocked)     { badge = 'ДОСТУПНО';   badgeBg = '#2a2113'; badgeColor = '#e0c178'; }
              else                    { badge = '🔒 ' + (w as any).lock; badgeBg = '#231711'; badgeColor = '#9a7d56'; }

              return (
                <div key={w.id} style={{ border: `1.5px solid ${border}`, borderRadius: 7, background: bg, boxShadow: glow, overflow: 'hidden', opacity }}>
                  <div onClick={() => !isLocked && selectWave(w.id, 'normal')}
                    style={{ cursor: isLocked ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px' }}>
                    <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 6, border: `1.5px solid ${selNormal ? '#e0c178' : '#6e5430'}`, background: '#161009', display: 'flex', alignItems: 'center', justifyContent: 'center', ...VT, fontSize: '24px', color: numColor }}>
                      {numLabel}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ ...DOT, fontSize: '15px', color: nameColor }}>{w.name}</span>
                        <span style={{ ...MONO, fontSize: '9px', padding: '1px 6px', borderRadius: 8, background: badgeBg, color: badgeColor }}>{badge}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#a8916a', marginTop: 2 }}>{w.enemies}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ ...MONO, fontSize: '9px', color: '#6e5e44' }}>НАГРАДА</div>
                      <div style={{ ...VT, fontSize: '16px', color: '#e0c178', marginTop: 1 }}>{w.reward}</div>
                    </div>
                  </div>
                  {isCleared && (
                    <div onClick={() => selectWave(w.id, 'endless')}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '7px 13px 8px 65px', background: selEndless ? 'rgba(180,143,196,0.14)' : '#1a1109', borderTop: '1px dashed #3a2c18' }}>
                      <span style={{ fontSize: 11 }}>♾️</span>
                      <span style={{ ...MONO, fontSize: '11px', color: selEndless ? '#d6b8e2' : '#b48fc4' }}>ENDLESS</span>
                      <span style={{ fontSize: 10, color: '#8a724a' }}>{(w as any).endlessDesc}</span>
                      <span style={{ marginLeft: 'auto', ...VT, fontSize: '14px', color: '#b48fc4' }}>рекорд {(w as any).endlessRecord}</span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* SUPER ENDLESS */}
            <div onClick={() => superUnlocked && selectWave('super', 'super')}
              style={{ cursor: superUnlocked ? 'pointer' : 'not-allowed', border: `1.5px solid ${selWave === 'super' ? '#cf6a5a' : (superUnlocked ? '#6e3a2a' : '#2c2012')}`, borderRadius: 7, background: selWave === 'super' ? 'rgba(207,106,90,0.12)' : (superUnlocked ? '#211109' : '#170f08'), boxShadow: selWave === 'super' ? '0 0 0 1px #cf6a5a, 0 0 16px rgba(207,106,90,0.4)' : 'inset 0 2px 6px rgba(0,0,0,0.4)', opacity: superUnlocked ? 1 : 0.55, padding: '12px 13px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 6, border: `1.5px solid ${superUnlocked ? '#cf6a5a' : '#3a2c18'}`, background: '#1a1006', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>💥</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ ...DOT, fontSize: '15px', color: superUnlocked ? '#e8a08c' : '#8a7d62' }}>SUPER ENDLESS</span>
                  <span style={{ ...MONO, fontSize: '9px', padding: '1px 6px', borderRadius: 8, background: superUnlocked ? '#2a1410' : '#231711', color: superUnlocked ? '#cf6a5a' : '#9a7d56' }}>
                    {superUnlocked ? 'ОТКРЫТО' : '🔒 пройди 2 волны'}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#a8916a', marginTop: 2 }}>мобы из всех пройденных волн + случайные условия</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ ...MONO, fontSize: '9px', color: '#6e5e44' }}>МОДИФИКАТОР</div>
                <div style={{ ...VT, fontSize: '16px', color: '#cf6a5a', marginTop: 1 }}>×3.0</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── COL 2: УСЛОВИЯ ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
          <span style={{ ...SILK, fontSize: '11px', color: '#c39b4e', letterSpacing: '1px', flexShrink: 0 }}>▷ УСЛОВИЯ ДУБЛЯ</span>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 4 }}>

            {/* Навыки */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#cdb88a' }}>⚔️ Навыки</span>
                <span style={{ ...MONO, fontSize: '9px', color: '#6e5e44' }}>{Object.values(skillsOn).filter(Boolean).length}/4 слота</span>
              </div>
              <div style={{ display: 'flex', gap: 7 }}>
                {SKILLS.map(s => {
                  const on = !!skillsOn[s.id];
                  return (
                    <div key={s.id} onClick={() => setSkillsOn(prev => ({ ...prev, [s.id]: !prev[s.id] }))}
                      title={s.name}
                      style={{ cursor: 'pointer', flex: 1, aspectRatio: '1', borderRadius: 6, border: `1.5px solid ${on ? '#c39b4e' : '#3a2c18'}`, background: on ? '#2a2113' : '#1a120b', boxShadow: on ? '0 0 8px rgba(195,155,78,0.4)' : 'inset 0 2px 5px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21 }}>
                      {s.icon}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Сценарий */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#cdb88a', marginBottom: 7 }}>🎬 Сценарий</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {SCENARIOS.map(sc => {
                  const on = scenario === sc.id;
                  return (
                    <div key={sc.id} onClick={() => setScenario(sc.id)}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 6, border: `1px solid ${on ? '#c39b4e' : '#3a2c18'}`, background: on ? '#2a2113' : '#1a120b' }}>
                      <span style={{ flexShrink: 0, width: 16, height: 16, borderRadius: '50%', border: `1.5px solid ${on ? '#c39b4e' : '#6e5430'}`, background: on ? '#e0c178' : 'transparent', display: 'inline-block' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: on ? '#e7d8b4' : '#cdb88a' }}>{sc.name}</div>
                        <div style={{ fontSize: 10.5, color: '#8a724a' }}>{sc.effect}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Инстинкты */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#cdb88a', marginBottom: 7 }}>
                🐾 Инстинкты <span style={{ fontWeight: 400, color: '#6e5e44', fontSize: 10 }}>(пассивки забега)</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {INSTINCTS.map(i => {
                  const on = !!instinctsOn[i.id];
                  return (
                    <div key={i.id} onClick={() => setInstinctsOn(prev => ({ ...prev, [i.id]: !prev[i.id] }))}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 14, border: `1px solid ${on ? '#7faf6a' : '#3a2c18'}`, background: on ? 'rgba(127,175,106,0.13)' : '#1a120b' }}>
                      <span style={{ fontSize: 13 }}>{i.icon}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: on ? '#a8d094' : '#a8916a' }}>{i.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* ── COL 3: ГЕРОЙ / СТАРТ ── */}
        <div style={{ flex: 1.02, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
          <span style={{ ...SILK, fontSize: '11px', color: '#c39b4e', letterSpacing: '1px', flexShrink: 0 }}>▷ К БОЮ ГОТОВ</span>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>

            {/* Активные баффы */}
            <div style={{ background: '#161009', border: '1px solid #3a2c18', borderRadius: 7, padding: '11px 13px' }}>
              <div style={{ ...MONO, fontSize: '9px', color: '#6e5e44', letterSpacing: '1px', marginBottom: 8 }}>АКТИВНЫЕ БАФФЫ</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {BUFFS_INIT.map(b => {
                  const left = Math.max(0, (b.left - tick + b.total * 100) % b.total);
                  const pct  = Math.round(left / b.total * 100);
                  const timeColor = left < 60 ? '#cf6a5a' : '#cdb88a';
                  return (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <span style={{ fontSize: 15 }}>{b.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <span style={{ fontSize: 12, color: '#d8c8aa' }}>{b.name}</span>
                          <span style={{ ...VT, fontSize: '15px', color: timeColor }}>{fmtTime(left)}</span>
                        </div>
                        <div style={{ height: 4, background: '#2a1d10', borderRadius: 2, overflow: 'hidden', marginTop: 3 }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: b.barColor, transition: 'width 1s linear' }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Зелья */}
            <div style={{ background: '#161009', border: '1px solid #3a2c18', borderRadius: 7, padding: '11px 13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ ...MONO, fontSize: '9px', color: '#6e5e44', letterSpacing: '1px' }}>ЗЕЛЬЯ В БОЙ</span>
                <span style={{ ...MONO, fontSize: '9px', color: '#8a724a' }}>{Object.values(potionsOn).filter(Boolean).length}/3</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {POTIONS.map(p => {
                  const on = !!potionsOn[p.id];
                  return (
                    <div key={p.id} onClick={() => setPotionsOn(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                      title={p.name}
                      style={{ position: 'relative', cursor: 'pointer', flex: 1, aspectRatio: '1', borderRadius: 6, border: `1.5px solid ${on ? '#7faf6a' : '#3a2c18'}`, background: on ? '#1e2516' : '#1a120b', boxShadow: on ? '0 0 8px rgba(127,175,106,0.35)' : 'inset 0 2px 5px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                      {p.icon}
                      <span style={{ position: 'absolute', right: 3, bottom: 1, ...VT, fontSize: '13px', color: '#ecdcc0', textShadow: '0 1px 2px #000' }}>{p.count}</span>
                      {on && <span style={{ position: 'absolute', top: -5, left: -5, width: 16, height: 16, borderRadius: '50%', background: '#7faf6a', color: '#161009', ...VT, fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Реплика съёмочной команды */}
            <div style={{ flex: 1, minHeight: 64, background: '#1c130b', border: `1px solid #46341f`, borderLeft: `3px solid ${crewLine.accent}`, borderRadius: 7, padding: '12px 13px', display: 'flex', gap: 11 }}>
              <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 5, border: `1.5px solid ${crewLine.accent}`, background: 'repeating-linear-gradient(45deg,#2a1d10,#2a1d10 4px,#211610 4px,#211610 8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                {crewLine.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                  <span style={{ ...DOT, fontSize: '13px', color: crewLine.accent }}>{crewLine.name}</span>
                  <span style={{ ...MONO, fontSize: '8px', color: '#6e5e44', textTransform: 'uppercase' }}>{crewLine.role}</span>
                </div>
                <div style={{ fontSize: 12, fontStyle: 'italic', color: '#e6d7bb', lineHeight: 1.4, marginTop: 4 }}>«{crewLine.quote}»</div>
              </div>
            </div>

            {/* Выбранный дубль */}
            <div style={{ background: '#1a1006', border: '1px solid #5a4226', borderRadius: 7, padding: '11px 13px' }}>
              <div style={{ ...MONO, fontSize: '9px', color: '#6e5e44', letterSpacing: '1px' }}>ВЫБРАННЫЙ ДУБЛЬ</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                <span style={{ ...DOT, fontSize: '16px', color: '#e7d8b4' }}>{chosenName}</span>
                <span style={{ ...MONO, fontSize: '9px', padding: '1px 7px', borderRadius: 8, background: chosenModeBg, color: chosenModeColor }}>{chosenMode}</span>
              </div>
              <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
                <span style={{ fontSize: 11, color: '#a8916a' }}>⛽ топливо: <span style={{ color: '#d98a6a', ...VT, fontSize: '14px' }}>{chosenFuel}</span></span>
                <span style={{ fontSize: 11, color: '#a8916a' }}>⏱ ~<span style={{ color: '#cdb88a', ...VT, fontSize: '14px' }}>{chosenTime}</span></span>
              </div>
            </div>

          </div>

          {/* START BUTTON */}
          <button
            onClick={() => executeAction({ type: 'goToPage', pageId: 'combat_wave_select' })}
            style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 11, padding: 14, background: 'linear-gradient(180deg,#e7d8b4,#cdb98a)', border: '1px solid #f0e3c0', borderRadius: 7, boxShadow: '0 3px 0 #8a6a36, 0 5px 14px rgba(0,0,0,0.4)', cursor: 'pointer' }}>
            <span style={{ fontSize: 19 }}>🎬</span>
            <span style={{ ...DOT, fontSize: '20px', color: '#2e2012', letterSpacing: '0.5px' }}>МОТОР! НАЧАТЬ ДУБЛЬ</span>
          </button>
        </div>

      </div>
    </div>
  );
}
