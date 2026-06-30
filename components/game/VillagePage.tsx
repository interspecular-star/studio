'use client';

import { useState, useEffect, useCallback } from 'react';
import { useStudioStore } from '@/lib/store';

// ── Static data ───────────────────────────────────────────────────────────────

const VILLAGE_NPCS = [
  { id: 'burmil', name: 'Бурмил «Крутитель»', role: 'Глава деревни',     accent: '#c39b4e',
    quote: '(нервно крутит кассету карандашом) Слэй! Банкомат опять выдаёт VHS вместо монет. Народ в восторге, казна — в трауре.' },
  { id: 'mila',   name: 'Мила',               role: 'Хозяйка таверны',   accent: '#c47a93',
    quote: 'Слэй, дорогой, для тебя есть похлёбка и слушок. Похлёбка — бесплатно. Слушок выйдет подороже.' },
  { id: 'zyrk',   name: 'Зырк',               role: 'Гоблин-помощник',   accent: '#7faf6a',
    quote: 'Я не трус! Я стратегически отступил за бочку. На всякий случай. Там целая курица была… с лазерами!' },
  { id: 'zosya',  name: 'Зося',               role: 'Шаман-алхимик',     accent: '#6f8fb0',
    quote: '(телевизор шипит помехами) Вижу твоё будущее, Слэй. В нём ты снова идёшь чинить чей-то холодильник.' },
  { id: 'agafya', name: 'Агафья',             role: 'Кузнец',            accent: '#d6a24e',
    quote: 'ХА! Принёс железо? Сейчас как накую — соседи опять решат, что началась гроза! (хохочет на всю площадь)' },
  { id: 'sam',    name: 'Сэм',               role: 'Торговец',           accent: '#9a8a4a',
    quote: 'Свежий хлам, только сегодня! Дискеты, кассеты, артефакт сомнительной подлинности. Скороход за качество не ручается.' },
  { id: 'ksenia', name: 'Ксения',             role: 'Служба доставки',   accent: '#cf8a5a',
    quote: 'Письмо тебе, Слэй! И пара проблем в нагрузку — они как-то сами прицепились ко мне по дороге.' },
  { id: 'slay',   name: 'Слэй',              role: 'Наёмник',            accent: '#cdb88a',
    quote: 'Десять лет войны. Вернулся отдохнуть. Теперь воюю с говорящими тапками. Просто замечательно.' },
];

const VILLAGE_EVENTS = [
  { time: '06:40', text: 'Холодильник-Хранитель снова стоит у ворот и требует пива. Бурмил думает откупиться.', dot: '#c47a93' },
  { time: '07:15', text: 'Банкомат на площади выдал Петровичу кассету «Руки Вверх» вместо сдачи. Очередь не расходится.', dot: '#c39b4e' },
  { time: '08:00', text: 'Зося предсказала дождь. По телевизору — помехи. Значит, точно дождь.', dot: '#6f8fb0' },
  { time: '08:30', text: 'Курица с лазерными глазами трижды обошла таверну. Мила говорит — это к гостям.', dot: '#7faf6a' },
  { time: '09:10', text: 'В пещере гоблины нашли жилу золота и одну потерянную дискету. Дискету Зырк забрал себе.', dot: '#7faf6a' },
  { time: '09:45', text: 'Утюг снова взлетел над кузницей. Агафья сбила его молотом и записала как «тренировку».', dot: '#c47a93' },
];

const VILLAGE_BUILDINGS = [
  { id: 'forge',  icon: '⚒️', name: 'Кузница', npc: 'Агафья', tag: 'крафт', status: '+2 заказа', statusColor: '#7faf6a', pageId: 'forge_01' },
  { id: 'tavern', icon: '🍺', name: 'Таверна', npc: 'Мила',   tag: 'слухи', status: 'нов. слух', statusColor: '#c47a93', pageId: 'tavern_01' },
  { id: 'shop',   icon: '🛒', name: 'Лавка',   npc: 'Сэм',    tag: 'торг',  status: 'завоз',     statusColor: '#d6a24e', pageId: 'shop_01' },
  { id: 'shaman', icon: '🔮', name: 'Шаманка', npc: 'Зося',   tag: 'зелья', status: '—',         statusColor: '#6e5e44', pageId: 'shaman_01' },
  { id: 'cave',   icon: '⛏️', name: 'Пещера',  npc: 'Зырк',   tag: 'idle',  status: '+12/мин',   statusColor: '#e0c178', pageId: 'mine_01' },
  { id: 'bureau', icon: '✉️', name: 'Бюро',    npc: 'Ксения', tag: 'квест', status: '1 письмо',  statusColor: '#cf8a5a', pageId: 'bureau_01' },
];

// ── Helper ────────────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'k';
  return Math.floor(n).toString();
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function VillagePage() {
  const { variables, playtestState, executeAction, openInventory } = useStudioStore();
  const [npcIndex, setNpcIndex]       = useState(0);
  const [activeBuilding, setActiveBuilding] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNpcIndex(i => (i + 1) % VILLAGE_NPCS.length), 6000);
    return () => clearInterval(t);
  }, []);

  const getVal = useCallback((name: string): number => {
    const v = variables.find(vv => vv.name === name);
    if (!v) return 0;
    const live = playtestState.variableValues[v.id];
    return typeof live === 'number' ? live : (v.defaultValue as number) ?? 0;
  }, [variables, playtestState.variableValues]);

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

  const hpPct  = hpMax > 0 ? Math.min(100, (hp / hpMax) * 100) : 100;
  const mpPct  = mpMax > 0 ? Math.min(100, (mp / mpMax) * 100) : 100;
  const expToNext = Math.max(80, Math.floor(level * 80 + 20));
  const expPct = Math.min(100, ((exp % expToNext) / expToNext) * 100);

  const curNpc  = VILLAGE_NPCS[npcIndex];
  const queueNpcs = [
    VILLAGE_NPCS[(npcIndex + 1) % VILLAGE_NPCS.length],
    VILLAGE_NPCS[(npcIndex + 2) % VILLAGE_NPCS.length],
  ];

  const navigate = (pageId: string) => executeAction({ type: 'goToPage', pageId });

  // ── Styles (shared) ─────────────────────────────────────────────────────────

  const lcdBlock = {
    display: 'flex', alignItems: 'center', gap: '5px',
    padding: '5px 10px',
    background: '#161009',
    border: '1px solid #3a2c18',
    borderRadius: '4px',
  } as React.CSSProperties;

  const silkLabel: React.CSSProperties = {
    fontFamily: 'var(--font-silk, Silkscreen, monospace)',
    fontSize: '11px',
    letterSpacing: '1px',
  };

  const vtNum: React.CSSProperties = {
    fontFamily: 'var(--font-vt, VT323, monospace)',
    lineHeight: 1,
  };

  const dotText: React.CSSProperties = {
    fontFamily: 'var(--font-dot, DotGothic16, sans-serif)',
  };

  const monoText: React.CSSProperties = {
    fontFamily: 'var(--font-mono, Space Mono, monospace)',
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="sa-wood absolute inset-0 flex flex-col overflow-hidden select-none font-body"
      style={{
        color: '#ecdcc0',
        border: '1px solid #5a4226',
        borderRadius: '9px',
        boxShadow: '0 18px 50px rgba(0,0,0,0.6), inset 0 1px 0 rgba(120,90,52,0.45)',
      }}
    >
      {/* ── HUD BAR ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 18px', background: '#1a120a', borderBottom: '1px solid #5a4226', flexShrink: 0 }}>
        {/* Avatar + name + bars */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: 38, height: 38, border: '2px solid #c39b4e', borderRadius: 4,
            background: 'repeating-linear-gradient(45deg,#2a1d10,#2a1d10 4px,#241810 4px,#241810 8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ ...silkLabel, fontSize: '8px', color: '#c39b4e' }}>СЛЭЙ</span>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ ...dotText, fontSize: '14px', color: '#e7d8b4' }}>СЛЭЙ</span>
              <span style={{ ...monoText, fontSize: '10px', color: '#a8916a' }}>наёмник · ур.{level}</span>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 4, alignItems: 'center' }}>
              {/* HP */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ ...monoText, fontSize: '9px', color: '#7faf6a' }}>HP</span>
                <div style={{ width: 74, height: 6, background: '#2a1d10', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${hpPct}%`, background: '#7faf6a', transition: 'width 0.3s' }} />
                </div>
                <span style={{ ...vtNum, fontSize: '13px', color: '#9ad27e', minWidth: 44 }}>{Math.floor(hp)}/{Math.floor(hpMax)}</span>
              </div>
              {/* MP */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ ...monoText, fontSize: '9px', color: '#6f8fb0' }}>MP</span>
                <div style={{ width: 54, height: 6, background: '#2a1d10', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${mpPct}%`, background: '#6f8fb0', transition: 'width 0.3s' }} />
                </div>
                <span style={{ ...vtNum, fontSize: '13px', color: '#9ab8d4', minWidth: 36 }}>{Math.floor(mp)}/{Math.floor(mpMax)}</span>
              </div>
              {/* EXP */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ ...monoText, fontSize: '9px', color: '#a8916a' }}>EXP</span>
                <div style={{ width: 34, height: 6, background: '#2a1d10', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${expPct}%`, background: '#6f8fb0', transition: 'width 0.3s' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Currencies */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={lcdBlock}><span style={{ fontSize: 13 }}>💰</span><span style={{ ...vtNum, fontSize: '18px', color: '#e0c178' }}>{fmtNum(coins)}</span></div>
          <div style={lcdBlock}><span style={{ fontSize: 13 }}>⛽</span><span style={{ ...vtNum, fontSize: '18px', color: '#d98a6a' }}>{fmtNum(fuel)}</span></div>
          <div style={lcdBlock}><span style={{ fontSize: 13 }}>📼</span><span style={{ ...vtNum, fontSize: '18px', color: '#b8a888' }}>{fmtNum(vhs)}</span></div>
          <div style={lcdBlock}><span style={{ fontSize: 13 }}>💎</span><span style={{ ...vtNum, fontSize: '18px', color: '#b48fc4' }}>{fmtNum(gems)}</span></div>
          <div style={lcdBlock}><span style={{ fontSize: 13 }}>💀</span><span style={{ ...vtNum, fontSize: '18px', color: '#9aa0a6' }}>{fmtNum(souls)}</span></div>
        </div>
      </div>

      {/* ── TITLE BAND ──────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '13px 22px',
        background: 'linear-gradient(180deg,#2f2114,#241810)',
        borderBottom: '1px solid #5a4226',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <span style={{ ...dotText, fontSize: '30px', color: '#e7d8b4', letterSpacing: '1px' }}>ТАБУРЕТКИНО</span>
          <span style={{ fontSize: '12px', color: '#a8916a' }}>главная площадь · регион Костыль · день 7</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ ...lcdBlock }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#6f8fb0', boxShadow: '0 0 7px #6f8fb0', display: 'inline-block' }} />
            <span style={{ ...monoText, fontSize: '10px', color: '#a8916a' }}>ПОГОДА:</span>
            <span style={{ ...vtNum, fontSize: '16px', color: '#9ab0c8' }}>помехи</span>
          </div>
          <div style={{
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#46341f', border: '1px solid #6e5430', borderRadius: 4,
            cursor: 'pointer',
          }}>
            <span style={{ ...silkLabel, fontSize: '11px', color: '#c39b4e' }}>≡</span>
          </div>
        </div>
      </div>

      {/* ── BODY ────────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', gap: 16, padding: '16px 22px', minHeight: 0 }}>

        {/* LEFT COLUMN */}
        <div style={{ flex: '1.45', display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>

          {/* ЧТО ПРОИСХОДИТ */}
          <div style={{
            flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
            background: '#161009', border: '1px solid #3a2c18', borderRadius: 6,
            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderBottom: '1px solid #2c2012',
            }}>
              <span style={{ ...silkLabel, color: '#7faf6a' }}>▷ ЧТО ПРОИСХОДИТ</span>
              <span style={{ ...monoText, fontSize: '10px', color: '#6e5e44' }}>хроника площади</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 4px 6px 14px' }}>
              {VILLAGE_EVENTS.map((ev, i) => (
                <div key={i} style={{ display: 'flex', gap: 11, padding: '9px 10px 9px 0', borderBottom: '1px solid #20170d' }}>
                  <span style={{ marginTop: 4, flexShrink: 0, width: 8, height: 8, borderRadius: '50%', background: ev.dot, display: 'inline-block' }} />
                  <div>
                    <span style={{ ...vtNum, fontSize: '15px', color: '#8a724a', marginRight: 8 }}>{ev.time}</span>
                    <span style={{ fontSize: '13.5px', color: '#d8c8aa', lineHeight: 1.45 }}>{ev.text}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* КУДА ПОЙТИ */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ ...silkLabel, color: '#c39b4e', marginBottom: 9 }}>▷ КУДА ПОЙТИ</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {VILLAGE_BUILDINGS.map(b => {
                const isActive = activeBuilding === b.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => { setActiveBuilding(b.id); navigate(b.pageId); }}
                    onMouseEnter={() => setActiveBuilding(b.id)}
                    onMouseLeave={() => setActiveBuilding(null)}
                    style={{
                      cursor: 'pointer', padding: '11px 12px',
                      background: '#2a1d11',
                      border: `1px solid ${isActive ? '#c39b4e' : '#4a3722'}`,
                      borderRadius: 5,
                      boxShadow: isActive ? '0 0 0 1px #c39b4e, inset 0 2px 8px rgba(0,0,0,0.4)' : 'inset 0 2px 8px rgba(0,0,0,0.4)',
                      transition: 'all 0.1s',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 18 }}>{b.icon}</span>
                      <span style={{ ...vtNum, fontSize: '13px', color: b.statusColor }}>{b.status}</span>
                    </div>
                    <div style={{ ...dotText, fontSize: '14px', color: '#e7d8b4', marginTop: 7 }}>{b.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 }}>
                      <span style={{ fontSize: '11px', color: '#a8916a' }}>{b.npc}</span>
                      <span style={{ ...monoText, fontSize: '9px', color: '#6e5e44' }}>{b.tag}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — МОЛВА */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ ...silkLabel, color: '#cf8a5a' }}>▷ МОЛВА</span>
            <span style={{ ...monoText, fontSize: '10px', color: '#6e5e44' }}>что говорят в деревне</span>
          </div>

          {/* NPC Quote Card */}
          <div style={{
            background: '#1c130b', border: `1px solid #46341f`,
            borderLeft: `3px solid ${curNpc.accent}`,
            borderRadius: 6, padding: 16,
            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)',
          }}>
            <div style={{ display: 'flex', gap: 13 }}>
              {/* Portrait placeholder */}
              <div style={{
                flexShrink: 0, width: 74, height: 88,
                border: `2px solid ${curNpc.accent}`, borderRadius: 5,
                background: 'repeating-linear-gradient(45deg,#2a1d10,#2a1d10 5px,#211610 5px,#211610 10px)',
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 6,
              }}>
                <span style={{ ...silkLabel, fontSize: '8px', color: curNpc.accent, textAlign: 'center' }}>
                  {curNpc.id.toUpperCase()}
                </span>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ ...dotText, fontSize: '16px', color: curNpc.accent }}>{curNpc.name}</div>
                <div style={{ ...monoText, fontSize: '9px', color: '#8a724a', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>{curNpc.role}</div>
                <div style={{ fontSize: '13.5px', fontStyle: 'italic', color: '#e6d7bb', lineHeight: 1.5, marginTop: 9 }}>
                  «{curNpc.quote}»
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 13, paddingTop: 11, borderTop: '1px solid #2c2012' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {queueNpcs.map((q, i) => (
                  <span key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '3px 8px', background: '#161009',
                    border: '1px solid #2c2012', borderRadius: 10,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: q.accent, display: 'inline-block' }} />
                    <span style={{ fontSize: 10, color: '#a8916a' }}>{q.name.split(' ')[0]}</span>
                  </span>
                ))}
              </div>
              <button
                onClick={() => setNpcIndex(i => (i + 1) % VILLAGE_NPCS.length)}
                style={{
                  cursor: 'pointer', padding: '6px 13px',
                  background: '#46341f', border: '1px solid #6e5430',
                  borderRadius: 4, color: '#e0c178',
                  ...dotText, fontSize: '12px',
                }}
              >
                ещё →
              </button>
            </div>
          </div>

          {/* World Note */}
          <div style={{
            flex: 1, minHeight: 0,
            background: '#161009', border: '1px solid #3a2c18', borderRadius: 6,
            padding: '13px 15px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)',
          }}>
            <div style={{ ...silkLabel, fontSize: '9px', color: '#6e5e44', marginBottom: 8 }}>НЕГЛАСНОЕ ПРАВИЛО</div>
            <div style={{ ...dotText, fontSize: '17px', color: '#cdb88a', lineHeight: 1.45 }}>
              «Не выключай — пусть работает».
            </div>
            <div style={{ fontSize: '12px', color: '#a8916a', lineHeight: 1.5, marginTop: 8 }}>
              Жители не глушат технику, даже если она шипит, считает и иногда просит пива. Обидится — превратится в монстра.
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM BAR ──────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '11px 22px',
        background: '#1a120a', borderTop: '1px solid #5a4226',
        flexShrink: 0,
      }}>
        {/* Quick actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { key: 'И', label: 'Инвентарь', action: () => openInventory() },
            { key: 'К', label: 'Карта',     action: () => {} },
            { key: 'С', label: 'Скиллы',    action: () => {} },
          ].map(btn => (
            <button
              key={btn.key}
              onClick={btn.action}
              style={{
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 14px',
                background: '#2a1d11', border: '1px solid #4a3722', borderRadius: 4,
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#c39b4e')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#4a3722')}
            >
              <span style={{ ...silkLabel, fontSize: '10px', color: '#c39b4e' }}>{btn.key}</span>
              <span style={{ fontSize: '12px', color: '#d8c8aa' }}>{btn.label}</span>
            </button>
          ))}
        </div>

        {/* Director hint + НА СЪЁМКУ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ ...monoText, fontSize: '10px', color: '#a8916a' }}>Режиссёр Вики ждёт дубль</div>
            <div style={{ fontSize: '11px', color: '#7faf6a' }}>→ ведёт на Тропу Войны</div>
          </div>
          <button
            onClick={() => navigate('war_path')}
            style={{
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 26px',
              background: 'linear-gradient(180deg,#e7d8b4,#cdb98a)',
              border: '1px solid #f0e3c0', borderRadius: 5,
              boxShadow: '0 2px 0 #8a6a36, 0 4px 12px rgba(0,0,0,0.4)',
              transition: 'filter 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.06)')}
            onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
          >
            <span style={{ fontSize: 17 }}>🎬</span>
            <span style={{ ...dotText, fontSize: '18px', color: '#2e2012', letterSpacing: '0.5px' }}>НА СЪЁМКУ</span>
          </button>
        </div>
      </div>
    </div>
  );
}
