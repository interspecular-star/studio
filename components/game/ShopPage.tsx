'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useStudioStore } from '@/lib/store';
import { toast } from 'sonner';

const VT:   React.CSSProperties = { fontFamily: 'var(--font-vt, VT323, monospace)', lineHeight: 1 };
const SILK: React.CSSProperties = { fontFamily: 'var(--font-silk, Silkscreen, monospace)', letterSpacing: '0.5px' };
const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono, Space Mono, monospace)' };
const DOT:  React.CSSProperties = { fontFamily: 'var(--font-dot, DotGothic16, sans-serif)' };
const WOOD_BG = `repeating-linear-gradient(92deg, rgba(0,0,0,0.10) 0px, rgba(0,0,0,0.10) 1px, transparent 1px, transparent 9px), repeating-linear-gradient(92deg, rgba(140,104,58,0.05) 3px, transparent 4px, transparent 16px)`;

const CSS = `
@keyframes sp-sambob { 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(-5px); } }
@keyframes sp-coinspark { 0%,100%{ opacity:0.4; transform:scale(1) rotate(0deg); } 50%{ opacity:1; transform:scale(1.15) rotate(10deg); } }
@keyframes sp-vendlight { 0%,100%{ opacity:1; } 50%{ opacity:0.25; } }
@keyframes sp-vendlight2 { 0%,100%{ opacity:0.25; } 50%{ opacity:1; } }
@keyframes sp-dispense { 0%{ transform:translateY(-14px); opacity:0; } 40%{ opacity:1; } 100%{ transform:translateY(0); opacity:1; } }
@keyframes sp-blinkdot { 0%,92%,100%{ opacity:1; } 95%{ opacity:0.1; } }
`;

const RARITY_COLOR: Record<string, string> = {
  мусор:'#6f6354', хлам:'#8a7d56', простой:'#cdbf9c', средний:'#7faf6a', высокий:'#6f8fb0', легендарный:'#d6a24e', мифический:'#b48fc4',
};
const RARITY_LABEL: Record<string, string> = {
  мусор:'Мусор', хлам:'Хлам', простой:'Простой', средний:'Средний', высокий:'Высокий', легендарный:'Легендарный', мифический:'Мифический',
};

const SPEAKERS = [
  { name:'Сэм', role:'торговец', accent:'#d6a24e', quote:'Свежий хлам, только сегодня! Бери — потом такого не будет. Честно. Наверное.' },
  { name:'Кот Бакс', role:'оценщик', accent:'#9aa0a6', quote:'(смотрит на твоё золото, потом на тебя) Мрр. За эти деньги — мог бы и не торговаться.' },
  { name:'Сэм', role:'торговец', accent:'#d6a24e', quote:'Артефакт сомнительной подлинности! Скороход за качество не ручается, а я тем более.' },
  { name:'Кот Бакс', role:'оценщик', accent:'#9aa0a6', quote:'(сбрасывает дискету с прилавка лапой) Это был тест. Ты его провалил.' },
  { name:'Сэм', role:'торговец', accent:'#d6a24e', quote:'Продаёшь? Дай гляну… ну, тут на похлёбку хватит. С котом поделишься.' },
  { name:'Кот Бакс', role:'оценщик', accent:'#9aa0a6', quote:'Мяу. (перевод: цены — грабёж, но автомат сегодня щедрый. Я бы крутанул.)' },
];

const BUY_ITEMS = [
  { id:'b1', icon:'🗡️', name:'Меч из арматуры',  rarity:'простой',    price:40 },
  { id:'b2', icon:'🛡️', name:'Деревянный щит',   rarity:'простой',    price:38 },
  { id:'b3', icon:'🧢', name:'Кепка «2007»',      rarity:'хлам',       price:14 },
  { id:'b4', icon:'❤️', name:'Зелье жизни',       rarity:'простой',    price:30 },
  { id:'b5', icon:'🥾', name:'Сапоги доставщика', rarity:'средний',    price:70 },
  { id:'b6', icon:'📼', name:'Кассетный амулет',  rarity:'высокий',    price:180 },
  { id:'b7', icon:'🧤', name:'Рабочие перчатки',  rarity:'простой',    price:22 },
  { id:'b8', icon:'💾', name:'Треснутая дискета', rarity:'хлам',       price:8 },
];

const SELL_ITEMS = [
  { id:'s1', icon:'🍳', name:'Шлем-кастрюля',  rarity:'мусор', price:2 },
  { id:'s2', icon:'🧦', name:'Дырявый носок',  rarity:'мусор', price:1 },
  { id:'s3', icon:'🍴', name:'Ржавая вилка',   rarity:'мусор', price:2 },
  { id:'s4', icon:'🍾', name:'Пустая бутылка', rarity:'мусор', price:2 },
  { id:'s5', icon:'🥿', name:'Тапок-убийца',   rarity:'хлам',  price:6 },
  { id:'s6', icon:'📟', name:'Старый пейджер', rarity:'хлам',  price:9 },
];

const RESTOCK_DEF = [
  { secs: 8*3600,  hint:'Партия оружия',    rarity:'высокий' },
  { secs: 16*3600, hint:'Тяжёлая броня',    rarity:'легендарный' },
  { secs: 24*3600, hint:'Загадочный ящик',  rarity:'мифический' },
];

const VEND_POOL = ['🧦','🍳','💾','🪙','📼','🗡️','💍','🥾','🧢','👑','📟','🔮'];

function fmt(sec: number) {
  const s = Math.max(0, sec);
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), r = s%60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`;
}

export default function ShopPage() {
  const { variables, executeAction } = useStudioStore();
  const goldVar = variables.find(v => ['Золото','gold','Gold'].includes(v.name));
  const storeGold = Number(goldVar?.defaultValue ?? 1240);

  const [goldSpent, setGoldSpent] = useState(0);
  const [tab, setTab]               = useState<'buy'|'sell'>('buy');
  const [spkIdx, setSpkIdx]         = useState(0);
  const [tick, setTick]             = useState(0);
  const [vendRolling, setVendRolling] = useState(false);
  const [vendIcon, setVendIcon]     = useState('❔');
  const [vendMsg, setVendMsg]       = useState('Вставь монету — вытащи судьбу. Или носок.');
  const [vendMsgColor, setVendMsgColor] = useState('#a8916a');

  const rollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const gold = Math.max(0, storeGold - goldSpent);

  function buy(price: number) {
    if (gold < price) { toast.error('Недостаточно золота'); return; }
    setGoldSpent(g => g + price);
    toast.success('Куплено!');
  }

  function sell(price: number) {
    setGoldSpent(g => g - price);
    toast.success(`Продано за ${price}💰`);
  }

  function onVend() {
    if (vendRolling || gold < 25) { if (gold < 25) toast.error('Нужно 25💰'); return; }
    setGoldSpent(g => g + 25);
    setVendRolling(true);
    setVendMsg('Скрипит, гудит, думает…');
    setVendMsgColor('#c9a8d4');
    if (rollTimer.current) clearInterval(rollTimer.current);
    let n = 0;
    rollTimer.current = setInterval(() => {
      n++;
      setVendIcon(VEND_POOL[Math.floor(Math.random() * VEND_POOL.length)]);
      if (n > 14) {
        if (rollTimer.current) clearInterval(rollTimer.current);
        const final = VEND_POOL[Math.floor(Math.random() * VEND_POOL.length)];
        const junk = ['🧦','🍳','📟'].includes(final);
        setVendIcon(final);
        setVendRolling(false);
        setVendMsg(junk ? 'Выпал… носок. Кот доволен, ты — нет.' : 'Оп! Кажется, повезло. Забирай!');
        setVendMsgColor(junk ? '#cf6a5a' : '#9ad27e');
      }
    }, 80);
  }

  useEffect(() => () => { if (rollTimer.current) clearInterval(rollTimer.current); }, []);

  const isBuy = tab === 'buy';
  const listing = isBuy ? BUY_ITEMS : SELL_ITEMS;
  const vendOk = gold >= 25 && !vendRolling;
  const sp = SPEAKERS[spkIdx % SPEAKERS.length];

  return (
    <>
      <style>{CSS}</style>
      <div style={{ position:'absolute', inset:0, zIndex:30, overflow:'hidden', display:'flex', flexDirection:'column', background:`${WOOD_BG}, #241810`, border:'1px solid #5a4226', color:'#ecdcc0', fontFamily:'Hanken Grotesk,system-ui,sans-serif' }}>

        {/* HUD */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 18px', background:'#1a120a', borderBottom:'1px solid #5a4226', zIndex:3, flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:36, height:36, border:'2px solid #c39b4e', borderRadius:4, background:'repeating-linear-gradient(45deg,#2a1d10,#2a1d10 4px,#241810 4px,#241810 8px)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ ...SILK, fontSize:8, color:'#c39b4e' }}>СЛЭЙ</span>
            </div>
            <div>
              <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                <span style={{ ...DOT, fontSize:14, color:'#e7d8b4' }}>СЛЭЙ</span>
                <span style={{ ...MONO, fontSize:10, color:'#a8916a' }}>наёмник · ур.24</span>
              </div>
              <div style={{ display:'flex', gap:10, marginTop:4, alignItems:'center' }}>
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ ...MONO, fontSize:9, color:'#a8916a' }}>HP</span>
                  <div style={{ width:74, height:6, background:'#2a1d10', borderRadius:3, overflow:'hidden' }}><div style={{ height:'100%', width:'84%', background:'#7faf6a' }} /></div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ ...MONO, fontSize:9, color:'#a8916a' }}>MP</span>
                  <div style={{ width:54, height:6, background:'#2a1d10', borderRadius:3, overflow:'hidden' }}><div style={{ height:'100%', width:'65%', background:'#c39b4e' }} /></div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <div style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 11px', background:'#161009', border:'1px solid #5a4226', borderRadius:4, boxShadow:'0 0 10px rgba(224,193,120,0.15)' }}>
              <span style={{ fontSize:13 }}>💰</span><span style={{ ...VT, fontSize:18, color:'#e0c178' }}>{gold.toLocaleString('ru-RU')}</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', background:'#161009', border:'1px solid #3a2c18', borderRadius:4 }}>
              <span style={{ fontSize:13 }}>⛽</span><span style={{ ...VT, fontSize:18, color:'#d98a6a' }}>38</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', background:'#161009', border:'1px solid #3a2c18', borderRadius:4 }}>
              <span style={{ fontSize:13 }}>📼</span><span style={{ ...VT, fontSize:18, color:'#b8a888' }}>12</span>
            </div>
            <div style={{ cursor:'pointer', width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', background:'#2a1d11', border:'1px solid #4a3722', borderRadius:4, fontSize:13 }}>🎒</div>
          </div>
        </div>

        {/* TITLE BAND */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 22px', background:'linear-gradient(180deg,#2f2114,#241810)', borderBottom:'1px solid #5a4226', zIndex:3, flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <button onClick={() => executeAction({ type:'goToPage', pageId:'village' })} style={{ cursor:'pointer', display:'flex', alignItems:'center', gap:6, padding:'7px 12px', background:'#46341f', border:'1px solid #6e5430', borderRadius:4, color:'#c39b4e', fontSize:12 }}>← площадь</button>
            <span style={{ ...DOT, fontSize:24, color:'#e7d8b4', letterSpacing:1 }}>ЛАВКА СЭМА «СВЕЖИЙ ХЛАМ»</span>
            <span style={{ fontSize:12, color:'#a8916a' }}>торг уместен, возврата нет</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:9, padding:'5px 12px', background:'#161009', border:'1px solid #3a2c18', borderRadius:5 }}>
            <span style={{ fontSize:13, animation:'sp-coinspark 2.2s ease-in-out infinite' }}>📦</span>
            <span style={{ ...VT, fontSize:16, color:'#cdb88a' }}>Скороход в пути · качество не гарантировано</span>
          </div>
        </div>

        {/* BODY */}
        <div style={{ flex:1, display:'flex', gap:14, padding:'14px 18px', minHeight:0 }}>

          {/* COL 1 — СЭМ */}
          <div style={{ flex:'0 0 240px', display:'flex', flexDirection:'column', gap:12, minHeight:0 }}>
            <div style={{ position:'relative', flex:1, minHeight:0, background:'radial-gradient(ellipse at 50% 40%, #33240f 0%, #15100a 76%)', border:'1px solid #46341f', borderRadius:8, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ position:'absolute', top:10, left:12, ...SILK, fontSize:9, color:'#7a6648', letterSpacing:1, zIndex:2 }}>ПРИЛАВОК</div>
              <div style={{ position:'absolute', top:10, right:12, display:'flex', alignItems:'center', gap:5, zIndex:2 }}>
                <span style={{ display:'block', width:6, height:6, borderRadius:'50%', background:'#e0c178', animation:'sp-blinkdot 3s infinite' }} />
                <span style={{ ...MONO, fontSize:9, color:'#e0c178' }}>открыто</span>
              </div>
              <div style={{ position:'absolute', top:38, left:26, fontSize:14, animation:'sp-coinspark 3s ease-in-out infinite' }}>🪙</div>
              <div style={{ position:'relative', animation:'sp-sambob 4.5s ease-in-out infinite', zIndex:1 }}>
                <div style={{ width:196, height:248, border:'2px solid #c39b4e', borderRadius:10, background:'linear-gradient(135deg,#33240f,#15100a)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 26px rgba(224,193,120,0.22)' }}>
                  <span style={{ fontSize:72 }}>🛒</span>
                </div>
              </div>
            </div>
            <div style={{ background:'#1c130b', border:`1px solid #46341f`, borderLeft:`3px solid ${sp.accent}`, borderRadius:8, padding:14, display:'flex', flexDirection:'column', flexShrink:0, minHeight:108 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                  <span style={{ ...DOT, fontSize:16, color:sp.accent }}>{sp.name}</span>
                  <span style={{ ...MONO, fontSize:9, color:'#8a724a', textTransform:'uppercase' }}>{sp.role}</span>
                </div>
                <button onClick={() => setSpkIdx(i => (i+1) % SPEAKERS.length)} style={{ cursor:'pointer', padding:'5px 11px', background:'#46341f', border:'1px solid #6e5430', borderRadius:4, color:'#e0c178', ...DOT, fontSize:11 }}>ещё →</button>
              </div>
              <div style={{ flex:1, display:'flex', alignItems:'center', fontSize:13, fontStyle:'italic', color:'#e6d7bb', lineHeight:1.5, marginTop:8 }}>
                «{sp.quote}»
              </div>
            </div>
          </div>

          {/* COL 2 — КУПИТЬ / ПРОДАТЬ */}
          <div style={{ flex:'1 1 0', display:'flex', flexDirection:'column', gap:10, minHeight:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
              <button onClick={() => setTab('buy')} style={{ cursor:'pointer', flex:1, textAlign:'center', padding:'9px 0', borderRadius:6, border:`1px solid ${isBuy ? '#c39b4e' : '#3a2c18'}`, background: isBuy ? '#46341f' : '#1c130b', color: isBuy ? '#f0e3c0' : '#8a724a', ...DOT, fontSize:14 }}>🛒 КУПИТЬ</button>
              <button onClick={() => setTab('sell')} style={{ cursor:'pointer', flex:1, textAlign:'center', padding:'9px 0', borderRadius:6, border:`1px solid ${!isBuy ? '#c39b4e' : '#3a2c18'}`, background: !isBuy ? '#46341f' : '#1c130b', color: !isBuy ? '#f0e3c0' : '#8a724a', ...DOT, fontSize:14 }}>💱 ПРОДАТЬ</button>
            </div>
            <div style={{ flex:1, minHeight:0, overflowY:'auto', background:'#161009', border:'1px solid #3a2c18', borderRadius:8, boxShadow:'inset 0 2px 10px rgba(0,0,0,0.5)', padding:12 }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:9 }}>
                {listing.map(it => {
                  const accent = RARITY_COLOR[it.rarity] ?? '#a8916a';
                  const afford = gold >= it.price;
                  return (
                    <div key={it.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 11px', background:'#1c130b', border:'1px solid #3a2c18', borderRadius:7 }}>
                      <div style={{ flexShrink:0, width:42, height:42, borderRadius:7, border:`1.5px solid ${accent}`, background:'#160f08', display:'flex', alignItems:'center', justifyContent:'center', fontSize:21 }}>{it.icon}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ ...DOT, fontSize:13, color:'#e7d8b4', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{it.name}</div>
                        <div style={{ fontSize:10, color:'#8a724a' }}>{RARITY_LABEL[it.rarity]}</div>
                      </div>
                      <button onClick={() => isBuy ? buy(it.price) : sell(it.price)} style={{ cursor:'pointer', flexShrink:0, display:'flex', alignItems:'center', gap:4, padding:'7px 10px', background: isBuy ? (afford ? '#46341f' : '#2a1d11') : '#1e2a16', border:`1px solid ${isBuy ? (afford ? '#6e5430' : '#3a2c18') : '#4a6e3a'}`, borderRadius:5 }}>
                        <span style={{ fontSize:10 }}>💰</span>
                        <span style={{ ...VT, fontSize:16, color: isBuy ? (afford ? '#e0c178' : '#6e5e44') : '#9ad27e' }}>{it.price}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 4px', flexShrink:0 }}>
              <span style={{ ...MONO, fontSize:10, color:'#8a724a' }}>{isBuy ? 'цены Сэма · торг уместен, но бесполезен' : 'продаёшь хлам — кот оценивает молча'}</span>
              <span style={{ fontSize:12, color:'#a8916a' }}>кошелёк: <span style={{ ...VT, fontSize:16, color:'#e0c178' }}>{gold.toLocaleString('ru-RU')} 💰</span></span>
            </div>
          </div>

          {/* COL 3 — ЗАВОЗ + АВТОМАТ */}
          <div style={{ flex:'0 0 240px', display:'flex', flexDirection:'column', gap:12, minHeight:0 }}>
            <div style={{ display:'flex', flexDirection:'column', gap:8, flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ ...SILK, fontSize:11, color:'#cf8a5a', letterSpacing:1 }}>▷ ЗАВОЗ СКОРОХОДА</span>
                <span style={{ ...MONO, fontSize:10, color:'#8a724a' }}>прибудет позже</span>
              </div>
              {RESTOCK_DEF.map((r, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:11, padding:'10px 12px', background:'#161009', border:'1px solid #3a2c18', borderRadius:7, boxShadow:'inset 0 2px 6px rgba(0,0,0,0.4)' }}>
                  <div style={{ flexShrink:0, width:44, height:44, borderRadius:7, border:`1.5px dashed ${RARITY_COLOR[r.rarity]}`, background:'#1c130b', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, color: RARITY_COLOR[r.rarity] }}>❔</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ ...DOT, fontSize:13, color:'#cdb88a' }}>{r.hint}</div>
                    <div style={{ fontSize:10, color:'#8a724a' }}>{RARITY_LABEL[r.rarity]} · {r.secs/3600} ч</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ ...MONO, fontSize:8, color:'#6e5e44' }}>ЧЕРЕЗ</div>
                    <div style={{ ...VT, fontSize:18, color: RARITY_COLOR[r.rarity], marginTop:1 }}>{fmt(r.secs - tick)}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* СКОРОХОД-2000 */}
            <div style={{ flex:1, minHeight:0, background:'linear-gradient(180deg,#2a2030,#1a1018)', border:'1px solid #5a4a60', borderRadius:10, padding:14, display:'flex', flexDirection:'column', alignItems:'center', gap:10, boxShadow:'inset 0 1px 0 rgba(150,120,160,0.2)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ display:'block', width:7, height:7, borderRadius:'50%', background:'#cf6a5a', animation:'sp-vendlight 0.8s infinite' }} />
                <span style={{ ...SILK, fontSize:10, color:'#c9a8d4', letterSpacing:1 }}>СКОРОХОД-2000</span>
                <span style={{ display:'block', width:7, height:7, borderRadius:'50%', background:'#7faf6a', animation:'sp-vendlight2 0.8s infinite' }} />
              </div>
              <div style={{ width:108, height:108, borderRadius:8, border:'3px solid #4a3a52', background:'radial-gradient(circle at 50% 40%, #2c2438, #140d18)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'inset 0 0 20px rgba(0,0,0,0.6)' }}>
                <div style={{ fontSize:52, animation: vendRolling ? 'sp-dispense 0.08s linear infinite' : 'sp-dispense 0.4s ease-out' }}>{vendIcon}</div>
              </div>
              <div style={{ textAlign:'center', minHeight:20, fontSize:11.5, color: vendMsgColor, lineHeight:1.3 }}>{vendMsg}</div>
              <button onClick={onVend} style={{ cursor: vendOk ? 'pointer' : 'not-allowed', width:'100%', textAlign:'center', padding:'10px 0', background: vendOk ? '#3a2842' : '#190f17', border:`1px solid ${vendOk ? '#5a4a60' : '#3a2c38'}`, borderRadius:7, ...DOT, fontSize:14, color: vendOk ? '#c9a8d4' : '#6e5e44', boxShadow:'0 2px 0 rgba(0,0,0,0.3)' }}>
                🎰 Дёрнуть рычаг · 💰25
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
