'use client';
import React, { useRef, useState } from 'react';
import { useStudioStore } from '@/lib/store';
import { toast } from 'sonner';

const VT:   React.CSSProperties = { fontFamily: 'var(--font-vt, VT323, monospace)', lineHeight: 1 };
const SILK: React.CSSProperties = { fontFamily: 'var(--font-silk, Silkscreen, monospace)', letterSpacing: '0.5px' };
const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono, Space Mono, monospace)' };
const DOT:  React.CSSProperties = { fontFamily: 'var(--font-dot, DotGothic16, sans-serif)' };
const WOOD_BG = `repeating-linear-gradient(92deg, rgba(0,0,0,0.10) 0px, rgba(0,0,0,0.10) 1px, transparent 1px, transparent 9px), repeating-linear-gradient(92deg, rgba(140,104,58,0.05) 3px, transparent 4px, transparent 16px)`;

const CSS = `
@keyframes of-bubob { 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(-5px); } }
@keyframes of-blinkdot { 0%,92%,100%{ opacity:1; } 95%{ opacity:0.1; } }
@keyframes of-reelspin { 0%{ transform:rotate(0deg); } 100%{ transform:rotate(360deg); } }
@keyframes of-reelfast { 0%{ transform:rotate(0deg); } 100%{ transform:rotate(360deg); } }
@keyframes of-vhsband { 0%{ background-position:0 0; } 100%{ background-position:0 14px; } }
@keyframes of-daypop { 0%{ transform:scale(0.6); opacity:0; } 60%{ transform:scale(1.18); } 100%{ transform:scale(1); opacity:1; } }
`;

const BUILDINGS_DEF = [
  { id:'forge',  icon:'⚒️', name:'Кузница',      accent:'#d6a24e', per:'урон ковки',            unit:5 },
  { id:'tavern', icon:'🍺', name:'Таверна',       accent:'#c47a93', per:'сила бустов',            unit:6 },
  { id:'shop',   icon:'🛒', name:'Лавка Сэма',   accent:'#d6a24e', per:'ассортимент и скидки',   unit:4 },
  { id:'shaman', icon:'🔮', name:'Логово Зоси',  accent:'#b48fc4', per:'сила зелий и оберегов',  unit:7 },
  { id:'cave',   icon:'⛏️', name:'Пещера',       accent:'#7faf6a', per:'скорость добычи',        unit:8 },
  { id:'bureau', icon:'✉️', name:'Бюро Ксении',  accent:'#cf8a5a', per:'награды за квесты',      unit:6 },
];

const BURMIL_LINES = [
  'Слэй! Заходи, заходи. Денег не дам, но улучшение оформлю — это почти как деньги, только наоборот.',
  'Кассета дня заедает? Не беда. Перемотаем — у меня этих кассет полный сейф. И один кот в сейфе. Не спрашивай.',
  'Хочешь, чтоб деревня росла — вкладывайся! Кузница сама себя не прокачает. Хотя Агафья пыталась, молотом.',
  'Перемотка дня — дорого, да. Но время в Табуреткино — ресурс ценнее золота. И VHS-кассет.',
  'Я тут подумал… а давай прокачаем Бюро? Ксения завалена письмами, а половина — мне жалобы на банкомат.',
  'Управление деревней — это искусство. И немного магии. И очень много бумажек. В основном бумажки.',
];

function upgCost(lvl: number) { return Math.round(180 + lvl * lvl * 28); }
function upgScrap(lvl: number) { return 4 + lvl * 2; }

export default function OfficePage() {
  const { variables, executeAction } = useStudioStore();
  const goldVar = variables.find(v => ['Золото','gold','Gold'].includes(v.name));
  const storeGold = Number(goldVar?.defaultValue ?? 4200);

  const [goldSpent, setGoldSpent] = useState(0);
  const [scrap, setScrap]         = useState(86);
  const [vhs, setVhs]             = useState(12);
  const [day, setDay]             = useState(7);
  const [burmilIdx, setBurmilIdx] = useState(0);
  const [levels, setLevels]       = useState<Record<string, number>>({ forge:7, tavern:5, shop:4, shaman:3, cave:6, bureau:2 });
  const [rewinding, setRewinding] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [gainGold, setGainGold]   = useState(0);
  const [gainStall, setGainStall] = useState(0);

  const rewindTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gold = Math.max(0, storeGold - goldSpent);
  const villageLvl = Object.values(levels).reduce((a, b) => a + b, 0);

  function upgrade(id: string) {
    const lvl = levels[id];
    if (lvl >= 15) return;
    const cost = upgCost(lvl), sc = upgScrap(lvl);
    if (gold < cost || scrap < sc) { toast.error('Не хватает ресурсов'); return; }
    setGoldSpent(g => g + cost);
    setScrap(s => s - sc);
    setLevels(l => ({ ...l, [id]: l[id] + 1 }));
    toast.success(`Улучшено до ур. ${lvl + 1}`);
  }

  function onRewind() {
    if (rewinding) return;
    if (vhs < 3 || gold < 800) { toast.error('Нужно 📼3 · 💰800'); return; }
    setRewinding(true);
    setShowResult(false);
    const gg = 1400 + Math.floor(Math.random() * 1600);
    const gs = 60 + Math.floor(Math.random() * 90);
    if (rewindTimer.current) clearTimeout(rewindTimer.current);
    rewindTimer.current = setTimeout(() => {
      setVhs(v => v - 3);
      setGoldSpent(g => g + 800 - gg);
      setDay(d => d + 1);
      setGainGold(gg);
      setGainStall(gs);
      setRewinding(false);
      setShowResult(true);
      toast.success(`День перемотан! +💰${gg.toLocaleString('ru-RU')}`);
    }, 1500);
  }

  const canRewind = vhs >= 3 && gold >= 800 && !rewinding;

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
              <span style={{ fontSize:13 }}>🔩</span><span style={{ ...VT, fontSize:18, color:'#b8a888' }}>{scrap}</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', background:'#161009', border:'1px solid #3a2c18', borderRadius:4 }}>
              <span style={{ fontSize:13 }}>📼</span><span style={{ ...VT, fontSize:18, color:'#9ab8d4' }}>{vhs}</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', background:'#161009', border:'1px solid #3a2c18', borderRadius:4 }}>
              <span style={{ fontSize:13 }}>💎</span><span style={{ ...VT, fontSize:18, color:'#b48fc4' }}>3</span>
            </div>
          </div>
        </div>

        {/* TITLE BAND */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 22px', background:'linear-gradient(180deg,#2f2114,#241810)', borderBottom:'1px solid #5a4226', zIndex:3, flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <button onClick={() => executeAction({ type:'goToPage', pageId:'village' })} style={{ cursor:'pointer', display:'flex', alignItems:'center', gap:6, padding:'7px 12px', background:'#46341f', border:'1px solid #6e5430', borderRadius:4, color:'#c39b4e', fontSize:12 }}>← площадь</button>
            <span style={{ ...DOT, fontSize:26, color:'#e7d8b4', letterSpacing:1 }}>КОНТОРА БУРМИЛА</span>
            <span style={{ fontSize:12, color:'#a8916a' }}>улучшения · бумажки · магия кассеты</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:9, padding:'5px 12px', background:'#161009', border:'1px solid #3a2c18', borderRadius:5 }}>
            <span style={{ fontSize:13 }}>📅</span>
            <span style={{ ...MONO, fontSize:10, color:'#a8916a' }}>ДЕНЬ</span>
            <span style={{ ...VT, fontSize:18, color:'#e0c178' }}>{day}</span>
            <span style={{ ...MONO, fontSize:10, color:'#6e5e44' }}>· уровень деревни {villageLvl}/90</span>
          </div>
        </div>

        {/* BODY */}
        <div style={{ flex:1, display:'flex', gap:14, padding:'14px 18px', minHeight:0 }}>

          {/* COL 1 — БУРМИЛ */}
          <div style={{ flex:'0 0 230px', display:'flex', flexDirection:'column', gap:12, minHeight:0 }}>
            <div style={{ position:'relative', flex:1, minHeight:0, background:'radial-gradient(ellipse at 50% 40%, #33240f 0%, #15100a 76%)', border:'1px solid #46341f', borderRadius:8, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ position:'absolute', top:10, left:12, ...SILK, fontSize:9, color:'#7a6648', letterSpacing:1, zIndex:2 }}>ГЛАВА ДЕРЕВНИ</div>
              <div style={{ position:'absolute', top:10, right:12, display:'flex', alignItems:'center', gap:5, zIndex:2 }}>
                <span style={{ display:'block', width:6, height:6, borderRadius:'50%', background:'#e0c178', animation:'of-blinkdot 3s infinite' }} />
                <span style={{ ...MONO, fontSize:9, color:'#e0c178' }}>на месте</span>
              </div>
              <div style={{ position:'absolute', bottom:10, left:12, display:'flex', gap:3, opacity:0.5, zIndex:2 }}>
                <span style={{ fontSize:13 }}>📼</span><span style={{ fontSize:13 }}>📼</span><span style={{ fontSize:13 }}>📼</span>
              </div>
              <div style={{ position:'relative', animation:'of-bubob 4.5s ease-in-out infinite', zIndex:1 }}>
                <div style={{ width:196, height:248, border:'2px solid #c39b4e', borderRadius:10, background:'linear-gradient(135deg,#33240f,#15100a)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 26px rgba(224,193,120,0.25)' }}>
                  <span style={{ fontSize:72 }}>🎩</span>
                </div>
              </div>
            </div>
            <div style={{ background:'#1c130b', border:'1px solid #46341f', borderLeft:'3px solid #c39b4e', borderRadius:8, padding:13, display:'flex', flexDirection:'column', flexShrink:0, minHeight:108 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ ...DOT, fontSize:14, color:'#c39b4e' }}>Бурмил «Крутитель»</span>
                <button onClick={() => setBurmilIdx(i => (i+1) % BURMIL_LINES.length)} style={{ cursor:'pointer', padding:'5px 10px', background:'#46341f', border:'1px solid #6e5430', borderRadius:4, color:'#e0c178', ...DOT, fontSize:11 }}>ещё →</button>
              </div>
              <div style={{ flex:1, display:'flex', alignItems:'center', fontSize:13, fontStyle:'italic', color:'#e6d7bb', lineHeight:1.5, marginTop:7 }}>
                «{BURMIL_LINES[burmilIdx % BURMIL_LINES.length]}»
              </div>
            </div>
          </div>

          {/* COL 2 — УЛУЧШЕНИЯ ЗДАНИЙ */}
          <div style={{ flex:'1 1 0', display:'flex', flexDirection:'column', gap:10, minHeight:0 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
              <span style={{ ...SILK, fontSize:11, color:'#c39b4e', letterSpacing:1 }}>▷ УЛУЧШЕНИЕ ЗДАНИЙ</span>
              <span style={{ ...MONO, fontSize:10, color:'#8a724a' }}>макс. уровень 15</span>
            </div>
            <div style={{ flex:1, minHeight:0, overflowY:'auto', display:'flex', flexDirection:'column', gap:8, paddingRight:4 }}>
              {BUILDINGS_DEF.map(b => {
                const lvl = levels[b.id];
                const maxed = lvl >= 15;
                const cost = upgCost(lvl), sc = upgScrap(lvl);
                const afford = gold >= cost && scrap >= sc && !maxed;
                const pips = Array.from({ length: 15 }, (_, i) => ({ color: i < lvl ? b.accent : '#2c2012' }));
                return (
                  <div key={b.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 13px', background:'#161009', border:`1px solid ${maxed ? '#6e5430' : '#3a2c18'}`, borderRadius:8, boxShadow:'inset 0 2px 6px rgba(0,0,0,0.4)' }}>
                    <div style={{ flexShrink:0, width:46, height:46, borderRadius:8, border:`1.5px solid ${b.accent}`, background:'#1c130b', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>{b.icon}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                        <span style={{ ...DOT, fontSize:15, color:'#e7d8b4' }}>{b.name}</span>
                        <span style={{ ...VT, fontSize:16, color: maxed ? '#e0c178' : '#cdb88a' }}>ур. {lvl}/15</span>
                      </div>
                      <div style={{ display:'flex', gap:2, marginTop:5 }}>
                        {pips.map((p, i) => (
                          <div key={i} style={{ flex:1, height:5, borderRadius:1, background:p.color }} />
                        ))}
                      </div>
                      <div style={{ fontSize:11, color:'#a8916a', marginTop:5 }}>
                        +{lvl * b.unit}% {b.per} · <span style={{ color:'#7faf6a' }}>далее {maxed ? 'максимум' : `+${b.unit}%`}</span>
                      </div>
                    </div>
                    <div onClick={() => upgrade(b.id)} style={{ cursor: afford ? 'pointer' : 'default', flexShrink:0, textAlign:'center', padding:'8px 12px', background: maxed ? '#2a1d10' : (afford ? '#3a2a12' : '#1c130b'), border:`1px solid ${maxed ? '#6e5430' : (afford ? '#a9762a' : '#3a2c18')}`, borderRadius:6 }}>
                      <div style={{ ...DOT, fontSize:12, color: maxed ? '#e0c178' : (afford ? '#e0c178' : '#6e5e44') }}>{maxed ? '✦ МАКС' : 'Улучшить'}</div>
                      {!maxed && <div style={{ ...VT, fontSize:14, color:'#cdb88a', marginTop:1 }}>💰{cost.toLocaleString('ru-RU')} · 🔩{sc}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* COL 3 — МАГИЯ КАССЕТЫ */}
          <div style={{ flex:'0 0 260px', display:'flex', flexDirection:'column', gap:12, minHeight:0 }}>
            <span style={{ ...SILK, fontSize:11, color:'#b48fc4', letterSpacing:1, flexShrink:0 }}>▷ МАГИЯ КАССЕТЫ</span>
            <div style={{ flex:1, minHeight:0, background:'radial-gradient(ellipse at 50% 26%, #2a2030, #160f0a 82%)', border:'1px solid #5a4a60', borderRadius:10, padding:16, display:'flex', flexDirection:'column', alignItems:'center', gap:13 }}>
              {/* VCR deck */}
              <div style={{ width:'100%', background:'linear-gradient(180deg,#2a2018,#1a130c)', border:'1px solid #4a3826', borderRadius:8, padding:'14px 16px', boxShadow:'inset 0 1px 0 rgba(150,120,70,0.2)' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:11 }}>
                  <span style={{ ...SILK, fontSize:9, color:'#9a8a5e', letterSpacing:1 }}>BURMIL VCR-2000</span>
                  <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ display:'block', width:6, height:6, borderRadius:'50%', background:'#cf6a5a' }} />
                    <span style={{ ...VT, fontSize:14, color:'#cf8a5a' }}>{rewinding ? 'REWIND ▶▶' : 'STBY'}</span>
                  </span>
                </div>
                {/* two reels */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:18 }}>
                  {[0, 1].map(i => (
                    <div key={i} style={{ position:'relative', width:64, height:64, borderRadius:'50%', border:'3px solid #6e5430', background:'radial-gradient(circle,#2a1d10 30%,#1a120a 32%)', display:'flex', alignItems:'center', justifyContent:'center', animation: rewinding ? 'of-reelfast 0.4s linear infinite' : 'of-reelspin 6s linear infinite' }}>
                      <div style={{ width:14, height:14, borderRadius:'50%', background:'#c39b4e' }} />
                      <div style={{ position:'absolute', width:54, height:3, background:'#6e5430' }} />
                      <div style={{ position:'absolute', width:3, height:54, background:'#6e5430' }} />
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginTop:13 }}>
                  <span style={{ ...MONO, fontSize:10, color:'#8a724a' }}>ТЕКУЩИЙ ДЕНЬ</span>
                  <span style={{ ...VT, fontSize:30, color:'#e0c178', lineHeight:0.8 }}>{day}</span>
                </div>
              </div>

              <div style={{ width:'100%', fontSize:12, color:'#a8916a', lineHeight:1.55 }}>
                Бурмил перематывает кассету дня вперёд: <span style={{ color:'#9ad27e' }}>шахта отдаёт накопления</span>, <span style={{ color:'#9ab8d4' }}>обновляется ассортимент</span> у Сэма, Милы и Агафьи, <span style={{ color:'#cf8a5a' }}>сбрасываются дневные бусты</span>.
              </div>

              {showResult && (
                <div style={{ width:'100%', background:'#1a1a10', border:'1px solid #6e5430', borderRadius:7, padding:'10px 12px', animation:'of-daypop 0.4s ease-out' }}>
                  <div style={{ ...SILK, fontSize:8, color:'#7faf6a', letterSpacing:1, marginBottom:6 }}>✦ ПЕРЕМОТАНО НА ДЕНЬ {day}</div>
                  <div style={{ display:'flex', gap:14 }}>
                    <span style={{ fontSize:12, color:'#a8916a' }}>💰 <span style={{ ...VT, fontSize:17, color:'#e0c178' }}>+{gainGold.toLocaleString('ru-RU')}</span></span>
                    <span style={{ fontSize:12, color:'#a8916a' }}>🎰 <span style={{ ...VT, fontSize:17, color:'#c9a8d4' }}>+{gainStall}</span></span>
                    <span style={{ fontSize:12, color:'#9ab8d4' }}>🛒 ассортимент обновлён</span>
                  </div>
                </div>
              )}

              <button onClick={onRewind} style={{ marginTop:'auto', width:'100%', cursor: canRewind ? 'pointer' : 'default', display:'flex', flexDirection:'column', alignItems:'center', gap:2, padding:13, background: canRewind ? 'linear-gradient(180deg,#3a2a12,#2a1d0e)' : '#1c130b', border:`1px solid ${canRewind ? '#e0c178' : '#3a2c18'}`, borderRadius:9, boxShadow: canRewind ? '0 0 16px rgba(224,193,120,0.4)' : 'none' }}>
                <span style={{ ...DOT, fontSize:17, color: canRewind ? '#ffe9a8' : '#6e5e44' }}>⏩ ПЕРЕМОТАТЬ ДЕНЬ</span>
                <span style={{ ...MONO, fontSize:10, color: canRewind ? '#cdb88a' : '#6e5e44' }}>{rewinding ? 'кассета крутится…' : 'стоит 📼3 · 💰800'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
