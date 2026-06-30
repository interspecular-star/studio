'use client';

import { useState, useEffect } from 'react';
import { useStudioStore } from '@/lib/store';
import { toast } from 'sonner';
import GameHUD from './GameHUD';

const VT:   React.CSSProperties = { fontFamily: 'var(--font-vt, VT323, monospace)',        lineHeight: 1 };
const SILK: React.CSSProperties = { fontFamily: 'var(--font-silk, Silkscreen, monospace)', letterSpacing: '0.5px' };
const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono, Space Mono, monospace)' };
const DOT:  React.CSSProperties = { fontFamily: 'var(--font-dot, DotGothic16, sans-serif)' };
const LCD:  React.CSSProperties = { display:'flex', alignItems:'center', gap:5, padding:'5px 10px', background:'#161009', border:'1px solid #3a2c18', borderRadius:4 };
const WOOD_BG =
  'repeating-linear-gradient(92deg,rgba(0,0,0,0.10) 0px,rgba(0,0,0,0.10) 1px,transparent 1px,transparent 9px),' +
  'repeating-linear-gradient(92deg,rgba(140,104,58,0.05) 3px,transparent 4px,transparent 16px)';

const MILA_LINES = [
  'Слэй, дорогой! Похлёбка стынет, а слухи — нет. Бери и то, и другое.',
  'Опять холодильник у ворот пива просит. Я ему говорю: сначала почини кран!',
  'Не садись на тот табурет. Он… в общем, он потом расскажет почему.',
  'Бурмил весь день кассеты крутит. Говорит — медитация. Я говорю — лень.',
  'Хочешь буст? У меня есть эль такой, что после него даже Зырк храбрый.',
  'Заплати за слушок — и я расскажу, где Агафья прячет хорошую сталь.',
];

const BOOSTS = [
  { id:'ale',   icon:'🍺', name:'Эль храбрости',      effect:'+15% урон',   dur:'5 мин',  cost:60,  accent:'#d6a24e' },
  { id:'stew',  icon:'🍲', name:'Похлёбка силы',       effect:'+80 HP макс.', dur:'10 мин', cost:90,  accent:'#7faf6a' },
  { id:'shine', icon:'🥃', name:'Самогон меткости',    effect:'+12% крит',   dur:'4 мин',  cost:120, accent:'#cf8a5a' },
  { id:'tea',   icon:'🍵', name:'Чай прозрения',       effect:'+25% опыт',   dur:'8 мин',  cost:150, accent:'#6f8fb0' },
];

const DISHES = [
  { name:'Шашлык из гоблятины',   desc:'Мариновано в самогоне три дня. Гоблин был не против. Почти.',   buff:'+10% урон на 1 бой', cost:45 },
  { name:'Уха из лазерной курицы',desc:'Слегка светится. Это нормально. Наверное.',                      buff:'+120 HP перед боем',  cost:55 },
  { name:'Пельмени «Сюрприз»',    desc:'В одном из них — дискета. Мила не помнит, в каком.',             buff:'случайный буст',      cost:40 },
];

const GOSSIP_SETS = [
  [
    { text:'Говорят, перед Showtime лучше накопить комбо — урон тогда зашкаливает.', who:'дед у камина' },
    { text:'Слыхал, утюги-дроны боятся уклона влево. Или вправо. Точно боятся!',    who:'пьяный охотник' },
    { text:'Кто чинит технику жителям — тому Бурмил золотом приплачивает.',         who:'Мила, шёпотом' },
  ],
  [
    { text:'В пещере после второй волны иногда падает дискета. Очень редкая.',       who:'гоблин Зырк' },
    { text:'Зося говорит: парируй вовремя — и враг сам себе урон вернёт.',           who:'девушка у окна' },
    { text:'Кузнец куёт лучшее железо, когда хохочет. Расскажи ей анекдот.',        who:'местный балагур' },
  ],
  [
    { text:'Super Endless открывается после двух волн. Там мобы перемешаны — жуть!', who:'ветеран дублей' },
    { text:'Зелье ярости + Сильный удар = соседи думают, что гроза.',               who:'бармен напротив' },
    { text:'Если NPC обиделся и стал монстром — извинись похлёбкой. Иногда помогает.', who:'Мила, серьёзно' },
  ],
];

const MERCS = [
  { id:'grog', icon:'🪓', name:'Грог Молчун',  role:'танк',   stat:'+200 HP отряду', cost:300 },
  { id:'fina', icon:'🏹', name:'Фина Быстрая', role:'лучник', stat:'+18% скорость',  cost:420 },
  { id:'pyx',  icon:'🔮', name:'Пыкс Чудной',  role:'маг',    stat:'авто-зелья',     cost:560 },
];

const EQ_COLORS = ['#7faf6a','#c39b4e','#d98a6a','#6f8fb0','#b48fc4'];

export default function TavernPage() {
  const { executeAction, playtestState, variables, openInventory } = useStudioStore();

  const [milaIdx,    setMilaIdx]    = useState(0);
  const [gossipPage, setGossipPage] = useState(0);
  const [dishIdx,    setDishIdx]    = useState(0);
  const [hired,      setHired]      = useState<Record<string, boolean>>({});
  const [goldSpent,  setGoldSpent]  = useState(0);
  const [eqFrame,    setEqFrame]    = useState(0);
  const [emberPos,   setEmberPos]   = useState([0, 0, 0]);
  const [avbob,      setAvbob]      = useState(false);

  useEffect(() => {
    const q = setInterval(() => setMilaIdx(i => (i + 1) % MILA_LINES.length), 7000);
    const eq = setInterval(() => setEqFrame(f => f + 1), 120);
    const av = setInterval(() => setAvbob(b => !b), 2000);
    const em = setInterval(() => setEmberPos([Math.random(), Math.random(), Math.random()]), 3000);
    return () => { clearInterval(q); clearInterval(eq); clearInterval(av); clearInterval(em); };
  }, []);

  // ── Store values ────────────────────────────────────────────────────────
  const findVar = (name: string) => variables.find(v => [name, name.toLowerCase()].includes(v.name.toLowerCase()));
  const varVal  = (name: string, fallback = 0) => {
    const v = findVar(name);
    return v ? Number(playtestState.variableValues?.[v.id] ?? v.defaultValue ?? fallback) : fallback;
  };

  const hpCur  = varVal('HP', 100);  const hpMax = varVal('HP_max', 100);
  const mpCur  = varVal('MP', 50);   const mpMax = varVal('MP_max', 50);
  const gold   = Math.max(0, varVal('coins', 0) - goldSpent);
  const fuel   = varVal('Бензин', 38);
  const tapes  = varVal('Кассеты', 12);

  const hpPct  = hpMax > 0 ? Math.max(0, Math.min(100, (hpCur / hpMax) * 100)) : 0;
  const mpPct  = mpMax > 0 ? Math.max(0, Math.min(100, (mpCur / mpMax) * 100)) : 0;

  const hiredCount = Object.values(hired).filter(Boolean).length;
  const dish = DISHES[dishIdx % DISHES.length];
  const gossip = GOSSIP_SETS[gossipPage % GOSSIP_SETS.length];

  const buy = (cost: number, label: string) => {
    if (gold < cost) { toast.error('Не хватает золота'); return; }
    setGoldSpent(s => s + cost);
    toast.success(`${label} куплено!`);
  };

  const hire = (id: string, cost: number, name: string) => {
    if (hired[id]) return;
    if (gold < cost) { toast.error('Не хватает золота'); return; }
    setHired(h => ({ ...h, [id]: true }));
    setGoldSpent(s => s + cost);
    toast.success(`${name} присоединился к отряду!`);
  };

  // Equalizer heights — oscillate with eqFrame
  const eqH = EQ_COLORS.map((_, i) =>
    Math.round(4 + 12 * Math.abs(Math.sin((eqFrame * 0.3) + i * 0.7 + i)))
  );

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col overflow-hidden"
      style={{ background:'#241810', backgroundImage:WOOD_BG, color:'#ecdcc0' }}
    >
      <GameHUD coinsDisplay={gold} />

      {/* ── TITLE BAND ───────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 22px', background:'linear-gradient(180deg,#2f2114,#241810)', borderBottom:'1px solid #5a4226', flexShrink:0, zIndex:3 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <button
            onClick={() => executeAction({ type:'goToPage', pageId:'village' })}
            style={{ ...MONO, display:'flex', alignItems:'center', gap:6, padding:'7px 12px', background:'#46341f', border:'1px solid #6e5430', borderRadius:4, color:'#c39b4e', fontSize:12, cursor:'pointer' }}
          >← площадь</button>
          <span style={{ ...DOT, fontSize:26, color:'#e7d8b4', letterSpacing:1 }}>ТАВЕРНА «ПЬЯНЫЙ ТАБУРЕТ»</span>
          <span style={{ fontSize:12, color:'#a8916a' }}>тут пахнет похлёбкой и слухами</span>
        </div>
        {/* Cassette player + equalizer */}
        <div style={{ display:'flex', alignItems:'center', gap:9, padding:'5px 12px', background:'#161009', border:'1px solid #3a2c18', borderRadius:5 }}>
          <span style={{ fontSize:13 }}>📻</span>
          <div style={{ display:'flex', alignItems:'flex-end', gap:2, height:16 }}>
            {EQ_COLORS.map((col, i) => (
              <div key={i} style={{ width:3, background:col, borderRadius:1, height:eqH[i], transformOrigin:'bottom', transition:'height 0.12s ease-in-out' }} />
            ))}
          </div>
          <span style={{ ...VT, fontSize:15, color:'#cdb88a' }}>кассета «Руки Вверх»</span>
        </div>
      </div>

      {/* ── BODY ─────────────────────────────────────────────────── */}
      <div style={{ flex:1, display:'flex', gap:14, padding:'14px 18px', minHeight:0, overflow:'hidden' }}>

        {/* COL 1 — Мила */}
        <div style={{ flex:'0 0 260px', display:'flex', flexDirection:'column', gap:12, minHeight:0 }}>
          {/* Avatar stage */}
          <div style={{ flex:1, minHeight:0, position:'relative', background:'radial-gradient(ellipse at 50% 95%,#3a2614,#15100a 72%)', border:'1px solid #46341f', borderRadius:8, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
            {/* fireplace glow */}
            <div style={{ position:'absolute', left:0, right:0, bottom:0, height:120, background:'radial-gradient(ellipse at 50% 100%,rgba(217,138,106,0.45),rgba(217,138,106,0) 70%)', pointerEvents:'none' }} />
            {/* embers */}
            {emberPos.map((v, i) => (
              <div key={i} style={{ position:'absolute', left:`${42 + i * 7 + v * 8}%`, bottom:18 + i * 6, width:3 + (i % 2), height:3 + (i % 2), borderRadius:'50%', background:['#e8a060','#d98a6a','#f0c080'][i], opacity: 0.7 - v * 0.5, transition:'all 3s ease-out', pointerEvents:'none' }} />
            ))}
            {/* labels */}
            <div style={{ position:'absolute', top:10, left:12, ...SILK, fontSize:9, color:'#7a6648', letterSpacing:1, zIndex:2 }}>ЗА СТОЙКОЙ</div>
            <div style={{ position:'absolute', top:10, right:12, display:'flex', alignItems:'center', gap:5, zIndex:2 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'#7faf6a', display:'inline-block' }} />
              <span style={{ ...MONO, fontSize:9, color:'#7faf6a' }}>на смене</span>
            </div>
            {/* avatar placeholder */}
            <div style={{ position:'relative', transform: avbob ? 'translateY(-6px)' : 'translateY(0)', transition:'transform 2s ease-in-out', zIndex:1 }}>
              <div style={{ width:180, height:240, border:'2px solid #c39b4e', borderRadius:10, background:'repeating-linear-gradient(45deg,#2a1d10,#2a1d10 8px,#241810 8px,#241810 16px)', display:'flex', alignItems:'flex-end', justifyContent:'center', paddingBottom:14, boxShadow:'0 0 26px rgba(217,138,106,0.25)' }}>
                <span style={{ ...DOT, fontSize:18, color:'#c39b4e' }}>Мила</span>
              </div>
              {/* foaming mug */}
              <div style={{ position:'absolute', bottom:8, right:-22, width:30, height:34, background:'linear-gradient(180deg,#3a2a16,#2a1d10)', border:'2px solid #c39b4e', borderRadius:'3px 3px 4px 4px', overflow:'visible' }}>
                <div style={{ position:'absolute', top:-7, left:-2, right:-2, height:10, background:'#f0e6cf', borderRadius:6 }} />
                <div style={{ position:'absolute', top:8, left:3, right:3, bottom:4, background:'#c98a3a', borderRadius:2 }} />
              </div>
            </div>
          </div>

          {/* Mila speech */}
          <div style={{ background:'#1c130b', border:'1px solid #46341f', borderLeft:'3px solid #c47a93', borderRadius:8, padding:14, display:'flex', flexDirection:'column', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                <span style={{ ...DOT, fontSize:16, color:'#c47a93' }}>Мила</span>
                <span style={{ ...MONO, fontSize:9, color:'#8a724a', textTransform:'uppercase' }}>хозяйка таверны</span>
              </div>
              <button
                onClick={() => setMilaIdx(i => (i + 1) % MILA_LINES.length)}
                style={{ ...DOT, cursor:'pointer', padding:'5px 11px', background:'#46341f', border:'1px solid #6e5430', borderRadius:4, color:'#e0c178', fontSize:11 }}
              >ещё →</button>
            </div>
            <div style={{ fontSize:14, fontStyle:'italic', color:'#e6d7bb', lineHeight:1.5, marginTop:8, minHeight:60 }}>
              «{MILA_LINES[milaIdx]}»
            </div>
          </div>
        </div>

        {/* COL 2 — Бусты + Блюдо дня */}
        <div style={{ flex:'1 1 0', display:'flex', flexDirection:'column', gap:12, minHeight:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ ...SILK, fontSize:11, color:'#c39b4e' }}>▷ ЗА СТОЙКОЙ · БУСТЫ</span>
            <span style={{ ...MONO, fontSize:10, color:'#8a724a' }}>наливают по золоту</span>
          </div>

          {/* Boost cards */}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {BOOSTS.map(b => {
              const afford = gold >= b.cost;
              return (
                <div key={b.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 13px', background:'#161009', border:'1px solid #3a2c18', borderRadius:7, boxShadow:'inset 0 2px 6px rgba(0,0,0,0.4)' }}>
                  <div style={{ flexShrink:0, width:44, height:44, borderRadius:7, border:`1.5px solid ${b.accent}`, background:'#1c130b', display:'flex', alignItems:'center', justifyContent:'center', fontSize:23 }}>{b.icon}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ ...DOT, fontSize:14, color:'#e7d8b4' }}>{b.name}</div>
                    <div style={{ fontSize:11, color:'#a8916a', marginTop:1 }}>{b.effect} · <span style={{ color:'#8a724a' }}>{b.dur}</span></div>
                  </div>
                  <button
                    onClick={() => buy(b.cost, b.name)}
                    style={{ flexShrink:0, display:'flex', alignItems:'center', gap:5, padding:'8px 13px', background: afford ? '#46341f' : '#2a1d11', border:`1px solid ${afford ? '#6e5430' : '#3a2c18'}`, borderRadius:5, cursor: afford ? 'pointer' : 'not-allowed' }}
                  >
                    <span style={{ fontSize:12 }}>💰</span>
                    <span style={{ ...VT, fontSize:17, color: afford ? '#e0c178' : '#6e5e44' }}>{b.cost}</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Dish of the day — chalkboard */}
          <div style={{ flex:1, minHeight:0, background:'#13110d', border:'6px solid #3a2c18', borderRadius:6, boxShadow:'inset 0 0 0 1px #2a2114, 0 2px 8px rgba(0,0,0,0.4)', padding:'14px 16px', display:'flex', flexDirection:'column', justifyContent:'center' }}>
            <div style={{ ...SILK, fontSize:10, color:'#7faf6a', letterSpacing:1, marginBottom:8 }}>✦ БЛЮДО ДНЯ ✦</div>
            <div style={{ ...DOT, fontSize:22, color:'#f0e6cf' }}>{dish.name}</div>
            <div style={{ fontSize:12.5, color:'#b8a888', lineHeight:1.5, marginTop:7 }}>{dish.desc}</div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:11, paddingTop:10, borderTop:'1px dashed #3a2c18' }}>
              <span style={{ fontSize:12, color:'#9ad27e' }}>{dish.buff}</span>
              <button
                onClick={() => { buy(dish.cost, dish.name); setDishIdx(i => (i + 1) % DISHES.length); }}
                style={{ ...DOT, display:'flex', alignItems:'center', gap:6, padding:'7px 14px', background:'#e7d8b4', color:'#2e2012', borderRadius:5, fontSize:13, cursor:'pointer', border:'none' }}
              >Заказать · 💰{dish.cost}</button>
            </div>
          </div>
        </div>

        {/* COL 3 — Сплетни + Наёмники */}
        <div style={{ flex:'1 1 0', display:'flex', flexDirection:'column', gap:12, minHeight:0 }}>
          {/* Gossip */}
          <div style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column', background:'#161009', border:'1px solid #3a2c18', borderRadius:8, boxShadow:'inset 0 2px 8px rgba(0,0,0,0.45)', overflow:'hidden' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 13px', borderBottom:'1px solid #2c2012' }}>
              <span style={{ ...SILK, fontSize:11, color:'#cf8a5a' }}>▷ СПЛЕТНИ</span>
              <span style={{ ...MONO, fontSize:9, color:'#6e5e44' }}>слушай — это подсказки</span>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'8px 13px' }}>
              {gossip.map((g, i) => (
                <div key={i} style={{ display:'flex', gap:10, padding:'9px 0', borderBottom: i < gossip.length - 1 ? '1px solid #20170d' : 'none' }}>
                  <span style={{ flexShrink:0, fontSize:15, marginTop:1 }}>💬</span>
                  <div>
                    <div style={{ fontSize:13, color:'#e0d3b6', lineHeight:1.45 }}>{g.text}</div>
                    <div style={{ ...MONO, fontSize:9, color:'#7a6648', marginTop:3 }}>— {g.who}</div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setGossipPage(p => (p + 1) % GOSSIP_SETS.length)}
              style={{ margin:'0 13px 11px', textAlign:'center', padding:'8px 0', background:'#2a1d11', border:'1px solid #4a3722', borderRadius:5, fontSize:12, color:'#cf8a5a', cursor:'pointer' }}
            >🍺 подслушать ещё</button>
          </div>

          {/* Mercs */}
          <div style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ ...SILK, fontSize:11, color:'#c39b4e' }}>▷ НАЁМНИКИ</span>
              <span style={{ ...MONO, fontSize:10, color:'#8a724a' }}>отряд {hiredCount}/3</span>
            </div>
            <div style={{ flex:1, minHeight:0, overflowY:'auto', display:'flex', flexDirection:'column', gap:8 }}>
              {MERCS.map(m => {
                const isHired = !!hired[m.id];
                const afford  = gold >= m.cost;
                return (
                  <div key={m.id} style={{ display:'flex', alignItems:'center', gap:11, padding:'10px 12px', background:'#1c130b', border:`1px solid ${isHired ? '#7faf6a' : '#3a2c18'}`, borderRadius:7 }}>
                    <div style={{ flexShrink:0, width:42, height:50, borderRadius:5, border:`1.5px solid ${isHired ? '#7faf6a' : '#c39b4e'}`, background:'repeating-linear-gradient(45deg,#2a1d10,#2a1d10 4px,#211610 4px,#211610 8px)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{m.icon}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ ...DOT, fontSize:14, color:'#e7d8b4' }}>{m.name}</div>
                      <div style={{ fontSize:11, color:'#a8916a' }}>{m.role} · <span style={{ color:'#9ad27e' }}>{m.stat}</span></div>
                    </div>
                    <button
                      onClick={() => hire(m.id, m.cost, m.name)}
                      style={{
                        flexShrink:0, textAlign:'center', padding:'8px 13px',
                        background: isHired ? '#1e2a16' : (afford ? '#46341f' : '#2a1d11'),
                        border:`1px solid ${isHired ? '#4a6e3a' : (afford ? '#6e5430' : '#3a2c18')}`,
                        borderRadius:5, ...DOT, fontSize:12,
                        color: isHired ? '#9ad27e' : (afford ? '#e0c178' : '#6e5e44'),
                        cursor: isHired ? 'default' : (afford ? 'pointer' : 'not-allowed'),
                      }}
                    >{isHired ? '✓ в отряде' : `💰${m.cost}`}</button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* CRT TV corner accent */}
      <div style={{ position:'absolute', left:18, bottom:14, width:46, height:40, background:'#0d0a06', border:'2px solid #3a2c18', borderRadius:5, overflow:'hidden', zIndex:4, boxShadow:'0 2px 6px rgba(0,0,0,0.5)' }}>
        <div style={{ position:'absolute', inset:3, borderRadius:2, background:'repeating-linear-gradient(0deg,rgba(180,180,180,0.18) 0,rgba(180,180,180,0.18) 1px,rgba(40,40,40,0.25) 1px,rgba(40,40,40,0.25) 2px)', backgroundSize:'100% 6px', opacity:0.85 }} />
      </div>
    </div>
  );
}
