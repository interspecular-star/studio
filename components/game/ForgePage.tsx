'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useStudioStore } from '@/lib/store';
import { toast } from 'sonner';
import GameHUD from './GameHUD';

const VT:   React.CSSProperties = { fontFamily: 'var(--font-vt, VT323, monospace)', lineHeight: 1 };
const SILK: React.CSSProperties = { fontFamily: 'var(--font-silk, Silkscreen, monospace)', letterSpacing: '0.5px' };
const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono, Space Mono, monospace)' };
const DOT:  React.CSSProperties = { fontFamily: 'var(--font-dot, DotGothic16, sans-serif)' };
const WOOD_BG = `repeating-linear-gradient(92deg, rgba(0,0,0,0.10) 0px, rgba(0,0,0,0.10) 1px, transparent 1px, transparent 9px), repeating-linear-gradient(92deg, rgba(140,104,58,0.05) 3px, transparent 4px, transparent 16px)`;

const CSS = `
@keyframes fg-agbob { 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(-5px); } }
@keyframes fg-forgeglow { 0%,100%{ opacity:0.5; transform:scale(1); } 30%{ opacity:0.95; transform:scale(1.08); } 60%{ opacity:0.55; transform:scale(0.96); } }
@keyframes fg-hammerhit { 0%{ transform:rotate(-52deg); } 40%{ transform:rotate(8deg); } 50%{ transform:rotate(6deg); } 100%{ transform:rotate(-52deg); } }
@keyframes fg-sparkfly1 { 0%{ transform:translate(0,0) scale(1); opacity:0; } 15%{ opacity:1; } 100%{ transform:translate(-46px,-30px) scale(0.2); opacity:0; } }
@keyframes fg-sparkfly2 { 0%{ transform:translate(0,0) scale(1); opacity:0; } 15%{ opacity:1; } 100%{ transform:translate(40px,-34px) scale(0.2); opacity:0; } }
@keyframes fg-sparkfly3 { 0%{ transform:translate(0,0) scale(1); opacity:0; } 15%{ opacity:1; } 100%{ transform:translate(8px,-44px) scale(0.2); opacity:0; } }
@keyframes fg-emberup { 0%{ transform:translateY(0) scale(1); opacity:0; } 25%{ opacity:0.9; } 100%{ transform:translateY(-60px) translateX(10px) scale(0.3); opacity:0; } }
@keyframes fg-blinkdot { 0%,92%,100%{ opacity:1; } 95%{ opacity:0.1; } }
`;

const RARITY_COLOR: Record<string, string> = {
  хлам:'#8a7d56', простой:'#cdbf9c', средний:'#7faf6a', высокий:'#6f8fb0',
  легендарный:'#d6a24e', мифический:'#b48fc4', имбовый:'#cf6a5a',
};
const RARITY_LABEL: Record<string, string> = {
  хлам:'Хлам', простой:'Простой', средний:'Средний', высокий:'Высокий',
  легендарный:'Легендарный', мифический:'Мифический', имбовый:'Имбовый',
};
const RARITY_NEXT: Record<string, string> = {
  хлам:'простой', простой:'средний', средний:'высокий', высокий:'легендарный',
  легендарный:'мифический', мифический:'имбовый',
};

const AGAFYA_LINES = [
  'ХА! Принёс железо? Сейчас как накую — соседи опять решат, что гроза началась!',
  'Сломал меч? Бывает. Сломал ВТОРОЙ меч? Слэй, мы это обсудим. Громко.',
  'Заточу так, что побреешься на ходу. Не благодари — благодари наковальню.',
  'Перекую твой хлам в нечто приличное. Доплата? А ты как думал, уголь сам себя жжёт?',
  'Молот — мой. Наковальня — моя. Твои только синяки, если будешь под руку лезть!',
  '(БАМ! БАМ! БАМ!) …Что? Не слышу! Я КУЮ!',
];

const REPAIRS_DEF = [
  { id:'d1', icon:'🗡️', name:'Меч-Антенна',     rarity:'имбовый'   },
  { id:'d2', icon:'🛡️', name:'Щит-крышка',      rarity:'высокий'   },
  { id:'d3', icon:'👑', name:'Корона из фольги', rarity:'мифический' },
];

const UPGRADES_DEF = [
  { id:'u1', icon:'⚒️', name:'Усиленный молот',  rarity:'легендарный', cost:600, scrap:20 },
  { id:'u2', icon:'🥾', name:'Сапоги доставщика', rarity:'средний',     cost:140, scrap:8  },
  { id:'u3', icon:'🧤', name:'Рабочие перчатки',  rarity:'простой',     cost:60,  scrap:4  },
  { id:'u4', icon:'📼', name:'Кассетный амулет',  rarity:'высокий',     cost:320, scrap:14 },
];

const SHARPENS_DEF = [
  { id:'s1', icon:'🗡️', name:'Острая кромка',  effect:'+18% урон',          dur:'3 боя', cost:80,  accent:'#cf6a5a' },
  { id:'s2', icon:'🛡️', name:'Закалка брони',  effect:'+22% защита',        dur:'3 боя', cost:90,  accent:'#7faf6a' },
  { id:'s3', icon:'⚡', name:'Балансировка',    effect:'+10% скорость атак', dur:'2 боя', cost:120, accent:'#6f8fb0' },
];

export default function ForgePage() {
  const { variables, playtestState, executeAction } = useStudioStore();
  const getVal = (name: string): number => {
    const v = variables.find(vv => vv.name === name);
    if (!v) return 0;
    const live = playtestState.variableValues[v.id];
    return typeof live === 'number' ? live : (v.defaultValue as number) ?? 0;
  };
  const storeCoins = getVal('coins');

  const [goldSpent, setGoldSpent] = useState(0);
  const [scrap, setScrap]         = useState(86);
  const [agafyaIdx, setAgafyaIdx] = useState(0);
  const [durab, setDurab]         = useState<Record<string, number>>({ d1:42, d2:78, d3:15 });
  const [forging, setForging]     = useState(false);
  const [gaugePos, setGaugePos]   = useState(2);
  const [forgeMsg, setForgeMsg]   = useState('Поймай молот в зелёной зоне!');
  const [forgeMsgColor, setForgeMsgColor] = useState('#a8916a');
  const [combo, setCombo]         = useState(0);

  const forgeTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const gold = Math.max(0, storeCoins - goldSpent);

  function fix(id: string) {
    const dur = durab[id];
    if (dur >= 100) return;
    const cost = Math.round((100 - dur) * 2.5);
    if (gold < cost) { toast.error('Недостаточно золота'); return; }
    setGoldSpent(g => g + cost);
    setDurab(d => ({ ...d, [id]: 100 }));
    toast.success('Починено!');
  }

  function upgradeRarity(cost: number, scr: number) {
    if (gold < cost || scrap < scr) { toast.error('Не хватает ресурсов'); return; }
    setGoldSpent(g => g + cost);
    setScrap(s => s - scr);
    toast.success('Редкость повышена!');
  }

  function sharpen(cost: number) {
    if (gold < cost) { toast.error('Недостаточно золота'); return; }
    setGoldSpent(g => g + cost);
    toast.success('Заточено!');
  }

  function onForge() {
    if (forging) {
      // STRIKE
      const pos = gaugePos;
      if (forgeTimer.current) clearInterval(forgeTimer.current);
      const good = pos >= 38 && pos <= 62;
      setForging(false);
      const newCombo = good ? combo + 1 : 0;
      setCombo(newCombo);
      setScrap(s => s + (good ? 6 : 1));
      setForgeMsg(good ? `ТОЧНО! +6 🔩 · серия ${newCombo}` : 'Мимо… +1 🔩. Агафья хмыкнула.');
      setForgeMsgColor(good ? '#9ad27e' : '#cf6a5a');
      return;
    }
    // START
    setForging(true);
    setForgeMsg('Бей!');
    setForgeMsgColor('#e0c178');
    let p = 2, dir = 1;
    if (forgeTimer.current) clearInterval(forgeTimer.current);
    forgeTimer.current = setInterval(() => {
      p += dir * 4;
      if (p >= 92) { p = 92; dir = -1; }
      if (p <= 2)  { p = 2;  dir = 1; }
      setGaugePos(p);
    }, 40);
  }

  useEffect(() => () => { if (forgeTimer.current) clearInterval(forgeTimer.current); }, []);

  return (
    <>
      <style>{CSS}</style>
      <div style={{ position:'absolute', inset:0, zIndex:30, overflow:'hidden', display:'flex', flexDirection:'column', background:`${WOOD_BG}, #241810`, border:'1px solid #5a4226', color:'#ecdcc0', fontFamily:'Hanken Grotesk,system-ui,sans-serif' }}>

        <GameHUD coinsDisplay={gold} />

        {/* TITLE BAND */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 22px', background:'linear-gradient(180deg,#2f2114,#241810)', borderBottom:'1px solid #5a4226', zIndex:3, flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <button onClick={() => executeAction({ type:'goToPage', pageId:'village' })} style={{ cursor:'pointer', display:'flex', alignItems:'center', gap:6, padding:'7px 12px', background:'#46341f', border:'1px solid #6e5430', borderRadius:4, color:'#c39b4e', fontSize:12 }}>← площадь</button>
            <span style={{ ...DOT, fontSize:26, color:'#e7d8b4', letterSpacing:1 }}>КУЗНИЦА АГАФЬИ</span>
            <span style={{ fontSize:12, color:'#a8916a' }}>бьёт так, что соседи думают — гроза</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:9, padding:'5px 12px', background:'#161009', border:'1px solid #6e3a2a', borderRadius:5 }}>
            <span style={{ display:'block', width:8, height:8, borderRadius:'50%', background:'#d98a6a', boxShadow:'0 0 8px #d98a6a', animation:'fg-forgeglow 1.6s ease-in-out infinite' }} />
            <span style={{ ...VT, fontSize:16, color:'#d98a6a' }}>горн раскалён · 920°</span>
          </div>
        </div>

        {/* BODY */}
        <div style={{ flex:1, display:'flex', gap:14, padding:'14px 18px', minHeight:0 }}>

          {/* COL 1 — АГАФЬЯ */}
          <div style={{ flex:'0 0 240px', display:'flex', flexDirection:'column', gap:12, minHeight:0 }}>
            <div style={{ position:'relative', flex:1, minHeight:0, background:'radial-gradient(ellipse at 50% 78%, #5a2e16 0%, #1a1009 72%)', border:'1px solid #46341f', borderRadius:8, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ position:'absolute', left:0, right:0, bottom:0, height:140, background:'radial-gradient(ellipse at 50% 100%, rgba(217,138,106,0.55), rgba(217,138,106,0) 70%)', animation:'fg-forgeglow 1.8s ease-in-out infinite', pointerEvents:'none' }} />
              <div style={{ position:'absolute', left:'40%', bottom:20, width:4, height:4, borderRadius:'50%', background:'#f0a050', animation:'fg-emberup 2.8s ease-out infinite', pointerEvents:'none' }} />
              <div style={{ position:'absolute', left:'56%', bottom:16, width:3, height:3, borderRadius:'50%', background:'#d98a6a', animation:'fg-emberup 3.4s ease-out infinite 0.9s', pointerEvents:'none' }} />
              <div style={{ position:'absolute', left:'48%', bottom:26, width:3, height:3, borderRadius:'50%', background:'#ffd27a', animation:'fg-emberup 2.4s ease-out infinite 0.5s', pointerEvents:'none' }} />
              <div style={{ position:'absolute', top:10, left:12, ...SILK, fontSize:9, color:'#7a6648', letterSpacing:1, zIndex:2 }}>У ГОРНА</div>
              <div style={{ position:'absolute', top:10, right:12, display:'flex', alignItems:'center', gap:5, zIndex:2 }}>
                <span style={{ display:'block', width:6, height:6, borderRadius:'50%', background:'#d98a6a', animation:'fg-blinkdot 2.4s infinite' }} />
                <span style={{ ...MONO, fontSize:9, color:'#d98a6a' }}>кует</span>
              </div>
              <div style={{ position:'relative', animation:'fg-agbob 4.5s ease-in-out infinite', zIndex:1 }}>
                <div style={{ width:200, height:260, border:'2px solid #c39b4e', borderRadius:10, background:'linear-gradient(135deg,#3a1a0a,#1a0f08)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 28px rgba(217,138,106,0.3)' }}>
                  <span style={{ fontSize:72 }}>⚒️</span>
                </div>
              </div>
            </div>
            <div style={{ background:'#1c130b', border:'1px solid #46341f', borderLeft:'3px solid #d6a24e', borderRadius:8, padding:14, display:'flex', flexDirection:'column', flexShrink:0, minHeight:108 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                  <span style={{ ...DOT, fontSize:16, color:'#d6a24e' }}>Агафья</span>
                  <span style={{ ...MONO, fontSize:9, color:'#8a724a', textTransform:'uppercase' }}>кузнец</span>
                </div>
                <button onClick={() => setAgafyaIdx(i => (i+1) % AGAFYA_LINES.length)} style={{ cursor:'pointer', padding:'5px 11px', background:'#46341f', border:'1px solid #6e5430', borderRadius:4, color:'#e0c178', ...DOT, fontSize:11 }}>ещё →</button>
              </div>
              <div style={{ flex:1, display:'flex', alignItems:'center', fontSize:13, fontStyle:'italic', color:'#e6d7bb', lineHeight:1.5, marginTop:8 }}>
                «{AGAFYA_LINES[agafyaIdx % AGAFYA_LINES.length]}»
              </div>
            </div>
          </div>

          {/* COL 2 — РЕМОНТ + ПЕРЕКОВКА */}
          <div style={{ flex:'1 1 0', display:'flex', flexDirection:'column', gap:10, minHeight:0 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
              <span style={{ ...SILK, fontSize:11, color:'#c39b4e', letterSpacing:1 }}>▷ РЕМОНТ</span>
              <span style={{ ...MONO, fontSize:10, color:'#8a724a' }}>чинит износ за золото</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8, flexShrink:0 }}>
              {REPAIRS_DEF.map(r => {
                const dur = durab[r.id];
                const accent = RARITY_COLOR[r.rarity];
                const broken = dur < 100;
                const cost = Math.round((100 - dur) * 2.5);
                const afford = gold >= cost;
                const durColor = dur > 60 ? '#7faf6a' : (dur > 30 ? '#d6a24e' : '#cf6a5a');
                return (
                  <div key={r.id} style={{ display:'flex', alignItems:'center', gap:11, padding:'10px 12px', background:'#161009', border:'1px solid #3a2c18', borderRadius:7 }}>
                    <div style={{ flexShrink:0, width:44, height:44, borderRadius:7, border:`1.5px solid ${accent}`, background:'#1c130b', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>{r.icon}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ ...DOT, fontSize:13, color:'#e7d8b4' }}>{r.name}</div>
                      <div style={{ display:'flex', alignItems:'center', gap:7, marginTop:4 }}>
                        <div style={{ flex:1, height:7, background:'#2a1d10', borderRadius:4, overflow:'hidden' }}><div style={{ height:'100%', width:`${dur}%`, background:durColor }} /></div>
                        <span style={{ ...VT, fontSize:13, color:durColor, width:48 }}>{dur}/100</span>
                      </div>
                    </div>
                    <button onClick={() => fix(r.id)} style={{ cursor: broken ? (afford ? 'pointer' : 'not-allowed') : 'default', flexShrink:0, display:'flex', alignItems:'center', gap:4, padding:'8px 12px', background: broken ? (afford ? '#46341f' : '#2a1d11') : '#1e2a16', border:`1px solid ${broken ? (afford ? '#6e5430' : '#3a2c18') : '#4a6e3a'}`, borderRadius:5 }}>
                      <span style={{ fontSize:11 }}>{broken ? '💰' : '✓'}</span>
                      <span style={{ ...VT, fontSize:16, color: broken ? (afford ? '#e0c178' : '#6e5e44') : '#9ad27e' }}>{broken ? cost : 'цел'}</span>
                    </button>
                  </div>
                );
              })}
            </div>

            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:4, flexShrink:0 }}>
              <span style={{ ...SILK, fontSize:11, color:'#d6a24e', letterSpacing:1 }}>▷ ПЕРЕКОВКА · ГРЕЙД ВЫШЕ</span>
              <span style={{ ...MONO, fontSize:10, color:'#8a724a' }}>сдай предмет + доплата</span>
            </div>
            <div style={{ flex:1, minHeight:0, overflowY:'auto', display:'flex', flexDirection:'column', gap:8, paddingRight:3 }}>
              {UPGRADES_DEF.map(u => {
                const next = RARITY_NEXT[u.rarity];
                const afford = gold >= u.cost && scrap >= u.scrap;
                return (
                  <div key={u.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'#161009', border:'1px solid #46341f', borderRadius:7 }}>
                    <div style={{ flexShrink:0, width:42, height:42, borderRadius:7, border:`1.5px solid ${RARITY_COLOR[u.rarity]}`, background:'#1c130b', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{u.icon}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ ...DOT, fontSize:13, color:'#e7d8b4', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{u.name}</div>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
                        <span style={{ fontSize:10, color: RARITY_COLOR[u.rarity] }}>{RARITY_LABEL[u.rarity]}</span>
                        <span style={{ color:'#8a724a', fontSize:11 }}>→</span>
                        <span style={{ fontSize:10, fontWeight:700, color: RARITY_COLOR[next] }}>{RARITY_LABEL[next]}</span>
                      </div>
                    </div>
                    <button onClick={() => upgradeRarity(u.cost, u.scrap)} style={{ cursor: afford ? 'pointer' : 'not-allowed', flexShrink:0, textAlign:'center', padding:'7px 11px', background: afford ? '#3a2a12' : '#2a1d11', border:`1px solid ${afford ? '#a9762a' : '#3a2c18'}`, borderRadius:5 }}>
                      <div style={{ ...VT, fontSize:16, color: afford ? '#e0c178' : '#6e5e44' }}>💰{u.cost}</div>
                      <div style={{ ...MONO, fontSize:8, color:'#8a724a', marginTop:1 }}>+🔩{u.scrap}</div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* COL 3 — ЗАТОЧКА + НАКОВАЛЬНЯ */}
          <div style={{ flex:'0 0 248px', display:'flex', flexDirection:'column', gap:12, minHeight:0 }}>
            <div style={{ display:'flex', flexDirection:'column', gap:8, flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ ...SILK, fontSize:11, color:'#cf8a5a', letterSpacing:1 }}>▷ ЗАТОЧКА</span>
                <span style={{ ...MONO, fontSize:10, color:'#8a724a' }}>временный буст</span>
              </div>
              {SHARPENS_DEF.map(s => {
                const ok = gold >= s.cost;
                return (
                  <div key={s.id} style={{ display:'flex', alignItems:'center', gap:11, padding:'10px 12px', background:'#1c130b', border:'1px solid #3a2c18', borderRadius:7 }}>
                    <div style={{ flexShrink:0, width:40, height:40, borderRadius:7, border:`1.5px solid ${s.accent}`, background:'#160f08', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{s.icon}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ ...DOT, fontSize:13, color:'#e7d8b4' }}>{s.name}</div>
                      <div style={{ fontSize:11, color:'#9ad27e' }}>{s.effect} · <span style={{ color:'#8a724a' }}>{s.dur}</span></div>
                    </div>
                    <button onClick={() => sharpen(s.cost)} style={{ cursor:'pointer', flexShrink:0, display:'flex', alignItems:'center', gap:4, padding:'7px 11px', background: ok ? '#46341f' : '#2a1d11', border:`1px solid ${ok ? '#6e5430' : '#3a2c18'}`, borderRadius:5 }}>
                      <span style={{ fontSize:11 }}>💰</span>
                      <span style={{ ...VT, fontSize:16, color: ok ? '#e0c178' : '#6e5e44' }}>{s.cost}</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* НАКОВАЛЬНЯ */}
            <div style={{ flex:1, minHeight:0, background:'radial-gradient(ellipse at 50% 80%, #3a2414, #15100a)', border:'1px solid #5a4226', borderRadius:10, padding:14, display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
              <div style={{ ...SILK, fontSize:10, color:'#d6a24e', letterSpacing:1 }}>⚒ РУЧНАЯ КОВКА ⚒</div>
              {/* anvil scene */}
              <div style={{ position:'relative', width:'100%', flex:1, minHeight:0, display:'flex', alignItems:'flex-end', justifyContent:'center', paddingBottom:6 }}>
                {forging && (
                  <>
                    <div style={{ position:'absolute', bottom:48, left:'50%', width:4, height:4, background:'#ffd27a', borderRadius:'50%', animation:'fg-sparkfly1 0.5s ease-out infinite' }} />
                    <div style={{ position:'absolute', bottom:48, left:'52%', width:3, height:3, background:'#f0a050', borderRadius:'50%', animation:'fg-sparkfly2 0.5s ease-out infinite' }} />
                    <div style={{ position:'absolute', bottom:50, left:'50%', width:3, height:3, background:'#ffe9a8', borderRadius:'50%', animation:'fg-sparkfly3 0.5s ease-out infinite' }} />
                  </>
                )}
                <div style={{ position:'absolute', bottom:44, left:'50%', transformOrigin:'bottom left', animation: forging ? 'fg-hammerhit 0.5s ease-in-out infinite' : 'none' }}>
                  <div style={{ width:8, height:42, background:'linear-gradient(180deg,#6e5430,#46341f)', borderRadius:3 }} />
                  <div style={{ position:'absolute', top:-6, left:-9, width:26, height:16, background:'linear-gradient(180deg,#b8b0a4,#6e655a)', border:'1px solid #3a342c', borderRadius:3 }} />
                </div>
                <div style={{ position:'absolute', bottom:40, left:'50%', transform:'translateX(-50%)', width:34, height:10, borderRadius:2, background:'linear-gradient(90deg,#d98a6a,#ffd27a,#d98a6a)', boxShadow:'0 0 14px rgba(255,160,80,0.7)' }} />
                <div style={{ position:'relative' }}>
                  <div style={{ width:96, height:18, background:'linear-gradient(180deg,#4a4a52,#2a2a30)', borderRadius:'4px 8px 3px 3px' }} />
                  <div style={{ width:40, height:22, margin:'0 auto', background:'linear-gradient(180deg,#3a3a42,#1f1f24)' }} />
                  <div style={{ width:72, height:10, margin:'0 auto', background:'#2a2a30', borderRadius:'0 0 4px 4px' }} />
                </div>
              </div>
              {/* timing bar */}
              <div style={{ width:'100%', position:'relative', height:18, background:'#1a120a', border:'1px solid #46341f', borderRadius:9, overflow:'hidden', flexShrink:0 }}>
                <div style={{ position:'absolute', left:'38%', top:0, bottom:0, width:'24%', background:'rgba(127,175,106,0.3)', borderLeft:'1px solid #7faf6a', borderRight:'1px solid #7faf6a' }} />
                <div style={{ position:'absolute', top:2, bottom:2, width:5, borderRadius:3, background:'#ffd27a', boxShadow:'0 0 8px #ffd27a', left:`${gaugePos}%`, transition:'left 0.05s linear' }} />
              </div>
              <button onClick={onForge} style={{ cursor:'pointer', width:'100%', textAlign:'center', padding:'10px 0', background: forging ? '#3a2a12' : '#46341f', border:`1px solid ${forging ? '#e0c178' : '#6e5430'}`, borderRadius:7, ...DOT, fontSize:14, color: forging ? '#ffe9a8' : '#e0c178', boxShadow:'0 2px 0 rgba(0,0,0,0.3)', flexShrink:0 }}>
                🔨 {forging ? 'БЕЙ!' : 'Начать ковку'}
              </button>
              <div style={{ textAlign:'center', minHeight:16, fontSize:11.5, color:forgeMsgColor, flexShrink:0 }}>{forgeMsg}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
