'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useStudioStore } from '@/lib/store';
import { toast } from 'sonner';

const VT:   React.CSSProperties = { fontFamily: 'var(--font-vt, VT323, monospace)', lineHeight: 1 };
const SILK: React.CSSProperties = { fontFamily: 'var(--font-silk, Silkscreen, monospace)', letterSpacing: '0.5px' };
const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono, Space Mono, monospace)' };
const DOT:  React.CSSProperties = { fontFamily: 'var(--font-dot, DotGothic16, sans-serif)' };

const ROCK_BG = `repeating-linear-gradient(125deg, rgba(0,0,0,0.18) 0px, rgba(0,0,0,0.18) 1px, transparent 1px, transparent 7px), repeating-linear-gradient(60deg, rgba(120,90,52,0.05) 2px, transparent 3px, transparent 13px)`;

const CSS = `
@keyframes cv-zybob { 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(-5px); } }
@keyframes cv-pick { 0%,100%{ transform:rotate(-18deg); } 45%{ transform:rotate(26deg); } 55%{ transform:rotate(22deg); } }
@keyframes cv-oreglint { 0%,100%{ opacity:0.3; transform:scale(1); } 50%{ opacity:1; transform:scale(1.25); } }
@keyframes cv-cartrun { 0%{ top:84%; } 48%{ top:4%; } 52%{ top:4%; } 100%{ top:84%; } }
@keyframes cv-lampflick { 0%,100%{ opacity:0.85; } 45%{ opacity:1; } 47%{ opacity:0.6; } 60%{ opacity:0.95; } }
@keyframes cv-jackglow { 0%,100%{ transform:scale(1); box-shadow:0 0 14px rgba(224,193,120,0.7); } 50%{ transform:scale(1.12); box-shadow:0 0 26px rgba(224,193,120,1); } }
@keyframes cv-blinkdot { 0%,92%,100%{ opacity:1; } 95%{ opacity:0.1; } }
@keyframes cv-fillpulse { 0%,100%{ opacity:1; } 50%{ opacity:0.7; } }
`;

const FLOORS_DEF = [
  { id:1, worker:'⛏️', name:'Верхний штрек',      res:'gold',  base:42, goblins:2, tag:'монеты',   tagBg:'#2a2113', tagColor:'#e0c178', accent:'#c39b4e', minDepth:1 },
  { id:2, worker:'⛏️', name:'Золотая жила',        res:'gold',  base:88, goblins:2, tag:'монеты',   tagBg:'#2a2113', tagColor:'#e0c178', accent:'#d6a24e', minDepth:2 },
  { id:3, worker:'🪏', name:'Сталлониевый пласт', res:'stall', base:14, goblins:1, tag:'сталлонки', tagBg:'#241830', tagColor:'#c9a8d4', accent:'#b48fc4', minDepth:3 },
  { id:4, worker:'📼', name:'VHS-залежи',          res:'vhs',   base:0,  goblins:0, tag:'📼 редкое', tagBg:'#14202a', tagColor:'#9ab8d4', accent:'#6f8fb0', minDepth:5 },
];

const UPGRADES_DEF = [
  { id:'depth', icon:'⬇️', name:'Копать глубже',   accent:'#c39b4e', effect:'+1 этаж · больше жил', kind:'depth' as const },
  { id:'eff',   icon:'⚙️', name:'Эффективность',   accent:'#7faf6a', effect:'+25% к добыче',         kind:'eff'   as const },
  { id:'cap',   icon:'📦', name:'Склад',            accent:'#d6a24e', effect:'+50% ёмкость хранилища', kind:'cap'   as const },
  { id:'off',   icon:'🌙', name:'Оффлайн-модуль',  accent:'#6f8fb0', effect:'выше доход пока офлайн', kind:'off'   as const },
  { id:'auto',  icon:'🔄', name:'Авто-продажа',    accent:'#cf8a5a', effect:'склад сам уходит в кошелёк', kind:'auto' as const },
];

const MERCS_DEF = [
  { id:'m1', icon:'🪓', name:'Грог', accent:'#7faf6a', mult:0.30 },
  { id:'m2', icon:'🏹', name:'Фина', accent:'#6f8fb0', mult:0.18 },
];

const ZYRK_LINES = [
  'Копаем, копаем! Я, правда, больше руковожу… с безопасного расстояния. За бочкой.',
  'Нашли жилу золота и одну дискету. Дискету я забрал. Это премия. Себе.',
  'Слэй, склад почти полный! Собери, а то гоблины начнут прятать монеты в носки.',
  'Глубже копать страшно. Там, говорят, живёт ОНО. Но платит хорошо, так что копаем.',
  'Вагонетка опять уехала сама. Третий раз за смену. Думаю, у неё планы.',
  'Если увидишь блестящую жилу — хватай быстрее! Удача, она… ну, недолго блестит.',
];

type UpgradeKind = 'depth' | 'eff' | 'cap' | 'off' | 'auto';
const COSTS: Record<UpgradeKind, number> = { depth:450, eff:220, cap:180, off:260, auto:600 };

export default function CavePage() {
  const { variables, executeAction } = useStudioStore();
  const goldVar = variables.find(v => ['Золото','gold','Gold'].includes(v.name));
  const storeGold = Number(goldVar?.defaultValue ?? 1240);

  const [stallonki, setStallonki] = useState(312);
  const [storeGoldLocal, setStoreGoldLocal] = useState(0);
  const [storeStall, setStoreStall]         = useState(0);
  const [depthLv, setDepthLv]   = useState(3);
  const [eff, setEff]           = useState(1);
  const [capLv, setCapLv]       = useState(1);
  const [offLv, setOffLv]       = useState(1);
  const [autosell, setAutosell] = useState(false);
  const [zyrkIdx, setZyrkIdx]   = useState(0);
  const [jackpot, setJackpot]   = useState(false);
  const [offlineShow, setOfflineShow] = useState(true);
  const [mercState, setMercState] = useState<Record<string, number>>({ m1:11700, m2:26400 });
  const [goldSpent, setGoldSpent] = useState(0);

  const fracRef = useRef({ g: 0, s: 0 });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const jackRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const gold = Math.max(0, storeGold - goldSpent);
  const BASE_CAP = 6000;

  function effMult() { return 1 + 0.25 * (eff - 1); }
  function mercMult() {
    let m = 1;
    MERCS_DEF.forEach(md => { if ((mercState[md.id] ?? 0) > 0) m += md.mult; });
    return m;
  }
  function cap() { return Math.round(BASE_CAP * (1 + 0.5 * (capLv - 1))); }
  function ratesPerSec() {
    const k = effMult() * mercMult();
    let g = 0, s = 0;
    FLOORS_DEF.forEach(f => {
      if (depthLv < f.minDepth) return;
      if (f.res === 'gold')  g += f.base * k;
      if (f.res === 'stall') s += f.base * k * 0.12;
    });
    return { g: g/60, s: s/60 };
  }

  useEffect(() => {
    timerRef.current = setInterval(() => {
      const r = ratesPerSec();
      fracRef.current.g += r.g;
      fracRef.current.s += r.s;
      const ig = Math.floor(fracRef.current.g);
      const is = Math.floor(fracRef.current.s);
      fracRef.current.g -= ig;
      fracRef.current.s -= is;
      setStoreGoldLocal(v => Math.min(cap(), v + ig));
      setStoreStall(v => v + is);
      setMercState(ms => {
        const next = { ...ms };
        Object.keys(next).forEach(k => { if (next[k] > 0) next[k] = Math.max(0, next[k] - 1); });
        return next;
      });
      if (autosell) {
        setStoreGoldLocal(0);
        setStoreStall(0);
      }
    }, 1000);
    jackRef.current = setInterval(() => {
      if (Math.random() < 0.5) setJackpot(true);
    }, 6000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (jackRef.current)  clearInterval(jackRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depthLv, eff, capLv, autosell]);

  function collect() {
    if (storeGoldLocal <= 0 && storeStall <= 0) return;
    setGoldSpent(g => g - storeGoldLocal);
    setStallonki(s => s + storeStall);
    setStoreGoldLocal(0);
    setStoreStall(0);
    toast.success(`Собрано: 💰${storeGoldLocal} · 🎰${storeStall}`);
  }

  function buyUpgrade(kind: UpgradeKind) {
    const cost = COSTS[kind];
    if (stallonki < cost) { toast.error('Не хватает сталлонок'); return; }
    if (kind === 'auto') { if (autosell) return; setAutosell(true); }
    else if (kind === 'depth') setDepthLv(v => v + 1);
    else if (kind === 'eff')   setEff(v => v + 1);
    else if (kind === 'cap')   setCapLv(v => v + 1);
    else if (kind === 'off')   setOffLv(v => v + 1);
    setStallonki(s => s - cost);
    toast.success('Улучшение куплено!');
  }

  function grabJackpot() {
    const bonus = 600 + Math.floor(Math.random() * 900);
    setJackpot(false);
    setGoldSpent(g => g - bonus);
    toast.success(`Жила удачи! +💰${bonus}`);
  }

  function fmt(sec: number) {
    const s = Math.max(0, sec);
    const h = Math.floor(s/3600), m = Math.floor((s%3600)/60);
    if (h > 0) return `${h}ч ${String(m).padStart(2,'0')}м`;
    return `${m}:${String(s%60).padStart(2,'0')}`;
  }

  const r = ratesPerSec();
  const goldPerMin = Math.round(r.g * 60);
  const stallPerMin = Math.round(r.s * 60);
  const CAP = cap();
  const pct = Math.min(100, Math.round(storeGoldLocal / CAP * 100));
  const full = storeGoldLocal >= CAP;
  const empty = storeGoldLocal <= 0 && storeStall <= 0;
  let goblinsUsed = 0;
  FLOORS_DEF.forEach(f => { if (depthLv >= f.minDepth) goblinsUsed += f.goblins; });

  return (
    <>
      <style>{CSS}</style>
      <div style={{ position:'absolute', inset:0, zIndex:30, overflow:'hidden', display:'flex', flexDirection:'column', background:`${ROCK_BG}, #1c1410`, border:'1px solid #4a3826', color:'#ecdcc0', fontFamily:'Hanken Grotesk,system-ui,sans-serif' }}>

        {/* HUD */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 18px', background:'#150f0a', borderBottom:'1px solid #4a3826', zIndex:3, flexShrink:0 }}>
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
            <div style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 11px', background:'#160f09', border:'1px solid #5a4226', borderRadius:4, boxShadow:'0 0 10px rgba(224,193,120,0.15)' }}>
              <span style={{ fontSize:13 }}>💰</span><span style={{ ...VT, fontSize:18, color:'#e0c178' }}>{gold.toLocaleString('ru-RU')}</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 11px', background:'#160f09', border:'1px solid #5a4a60', borderRadius:4, boxShadow:'0 0 10px rgba(180,143,196,0.15)' }}>
              <span style={{ fontSize:13 }}>🎰</span><span style={{ ...VT, fontSize:18, color:'#c9a8d4' }}>{stallonki.toLocaleString('ru-RU')}</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', background:'#160f09', border:'1px solid #3a2c18', borderRadius:4 }}>
              <span style={{ fontSize:13 }}>📼</span><span style={{ ...VT, fontSize:18, color:'#9ab8d4' }}>12</span>
            </div>
            <div style={{ cursor:'pointer', width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', background:'#2a1d11', border:'1px solid #4a3722', borderRadius:4, fontSize:13 }}>🎒</div>
          </div>
        </div>

        {/* TITLE BAND */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 22px', background:'linear-gradient(180deg,#2a1f15,#1c1410)', borderBottom:'1px solid #4a3826', zIndex:3, flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <button onClick={() => executeAction({ type:'goToPage', pageId:'village' })} style={{ cursor:'pointer', display:'flex', alignItems:'center', gap:6, padding:'7px 12px', background:'#46341f', border:'1px solid #6e5430', borderRadius:4, color:'#c39b4e', fontSize:12 }}>← площадь</button>
            <span style={{ ...DOT, fontSize:26, color:'#e7d8b4', letterSpacing:1 }}>ПЕЩЕРА · ШАХТА</span>
            <span style={{ fontSize:12, color:'#a8916a' }}>копает сама, даже пока тебя нет</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:9, padding:'5px 12px', background:'#160f09', border:'1px solid #3a2c18', borderRadius:5 }}>
            <span style={{ fontSize:13 }}>⛏️</span>
            <span style={{ ...MONO, fontSize:10, color:'#a8916a' }}>ГЛУБИНА:</span>
            <span style={{ ...VT, fontSize:17, color:'#e0c178' }}>{depthLv * 120} м</span>
          </div>
        </div>

        {/* BODY */}
        <div style={{ flex:1, display:'flex', gap:14, padding:'14px 18px', minHeight:0 }}>

          {/* COL 1 — ЗЫРК + ОФФЛАЙН */}
          <div style={{ flex:'0 0 220px', display:'flex', flexDirection:'column', gap:12, minHeight:0 }}>
            <div style={{ position:'relative', flex:1, minHeight:0, background:'radial-gradient(ellipse at 50% 40%, #2a2014 0%, #120c08 76%)', border:'1px solid #46341f', borderRadius:8, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ position:'absolute', top:14, left:'50%', transform:'translateX(-50%)', width:140, height:120, background:'radial-gradient(ellipse at 50% 0%, rgba(224,193,120,0.22), transparent 70%)', animation:'cv-lampflick 3s ease-in-out infinite', pointerEvents:'none' }} />
              <div style={{ position:'absolute', top:10, left:12, ...SILK, fontSize:9, color:'#7a6648', letterSpacing:1, zIndex:2 }}>БРИГАДИР</div>
              <div style={{ position:'absolute', top:10, right:12, display:'flex', alignItems:'center', gap:5, zIndex:2 }}>
                <span style={{ display:'block', width:6, height:6, borderRadius:'50%', background:'#7faf6a', animation:'cv-blinkdot 3s infinite' }} />
                <span style={{ ...MONO, fontSize:9, color:'#7faf6a' }}>смена идёт</span>
              </div>
              <div style={{ position:'relative', animation:'cv-zybob 4.5s ease-in-out infinite', zIndex:1 }}>
                <div style={{ width:188, height:236, border:'2px solid #7faf6a', borderRadius:10, background:'linear-gradient(135deg,#2a1d10,#120c08)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 26px rgba(127,175,106,0.22)' }}>
                  <span style={{ fontSize:72 }}>🪖</span>
                </div>
              </div>
            </div>
            {/* Zyrk speech */}
            <div style={{ background:'#1c130b', border:'1px solid #46341f', borderLeft:'3px solid #7faf6a', borderRadius:8, padding:13, display:'flex', flexDirection:'column', flexShrink:0, minHeight:96 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                  <span style={{ ...DOT, fontSize:15, color:'#7faf6a' }}>Зырк</span>
                  <span style={{ ...MONO, fontSize:9, color:'#8a724a', textTransform:'uppercase' }}>гоблин-бригадир</span>
                </div>
                <button onClick={() => setZyrkIdx(i => (i+1) % ZYRK_LINES.length)} style={{ cursor:'pointer', padding:'5px 10px', background:'#46341f', border:'1px solid #6e5430', borderRadius:4, color:'#e0c178', ...DOT, fontSize:11 }}>ещё →</button>
              </div>
              <div style={{ flex:1, display:'flex', alignItems:'center', fontSize:13, fontStyle:'italic', color:'#e6d7bb', lineHeight:1.5, marginTop:7 }}>
                «{ZYRK_LINES[zyrkIdx % ZYRK_LINES.length]}»
              </div>
            </div>
            {/* offline card */}
            {offlineShow && (
              <div style={{ background:'#16110a', border:'1px dashed #6e5430', borderRadius:8, padding:'12px 13px', flexShrink:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                  <span style={{ fontSize:14 }}>😴</span>
                  <span style={{ ...SILK, fontSize:9, color:'#cf8a5a', letterSpacing:1 }}>ПОКА ТЕБЯ НЕ БЫЛО · 3 ч 14 м</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:9 }}>
                  <div style={{ display:'flex', gap:12 }}>
                    <span style={{ fontSize:13, color:'#a8916a' }}>💰 <span style={{ ...VT, fontSize:17, color:'#e0c178' }}>+4 820</span></span>
                    <span style={{ fontSize:13, color:'#a8916a' }}>🎰 <span style={{ ...VT, fontSize:17, color:'#c9a8d4' }}>+96</span></span>
                  </div>
                  <button onClick={() => { setOfflineShow(false); setGoldSpent(g => g - 4820); setStallonki(s => s + 96); toast.success('Накопления собраны!'); }} style={{ cursor:'pointer', padding:'7px 14px', background:'#e7d8b4', color:'#2e2012', borderRadius:5, ...DOT, fontSize:12 }}>Забрать</button>
                </div>
              </div>
            )}
          </div>

          {/* COL 2 — РАЗРЕЗ ШАХТЫ */}
          <div style={{ flex:'1 1 0', display:'flex', flexDirection:'column', gap:10, minHeight:0 }}>
            {/* production summary */}
            <div style={{ display:'flex', gap:10, flexShrink:0 }}>
              <div style={{ flex:1, background:'#160f09', border:'1px solid #3a2c18', borderRadius:8, padding:'9px 13px' }}>
                <div style={{ ...MONO, fontSize:9, color:'#6e5e44', letterSpacing:1 }}>ДОБЫЧА · МОНЕТЫ</div>
                <div style={{ display:'flex', alignItems:'baseline', gap:5, marginTop:2 }}>
                  <span style={{ ...VT, fontSize:28, color:'#e0c178', lineHeight:0.8 }}>{goldPerMin.toLocaleString('ru-RU')}</span>
                  <span style={{ fontSize:11, color:'#8a724a' }}>/мин</span>
                </div>
              </div>
              <div style={{ flex:1, background:'#160f09', border:'1px solid #4a3a50', borderRadius:8, padding:'9px 13px' }}>
                <div style={{ ...MONO, fontSize:9, color:'#6e5e44', letterSpacing:1 }}>ДОБЫЧА · СТАЛЛОНКИ</div>
                <div style={{ display:'flex', alignItems:'baseline', gap:5, marginTop:2 }}>
                  <span style={{ ...VT, fontSize:28, color:'#c9a8d4', lineHeight:0.8 }}>{stallPerMin}</span>
                  <span style={{ fontSize:11, color:'#8a724a' }}>/мин</span>
                </div>
              </div>
              <div style={{ flex:'0 0 auto', width:90, background:'#160f09', border:'1px solid #3a2c18', borderRadius:8, padding:'9px 13px' }}>
                <div style={{ ...MONO, fontSize:9, color:'#6e5e44', letterSpacing:1 }}>ГОБЛИНОВ</div>
                <div style={{ display:'flex', alignItems:'baseline', gap:5, marginTop:2 }}>
                  <span style={{ ...VT, fontSize:28, color:'#7faf6a', lineHeight:0.8 }}>{goblinsUsed}</span>
                  <span style={{ fontSize:11, color:'#8a724a' }}>/8</span>
                </div>
              </div>
            </div>

            {/* shaft cross-section */}
            <div style={{ flex:1, minHeight:0, position:'relative', background:'#100b07', border:'1px solid #3a2c18', borderRadius:8, overflow:'hidden', boxShadow:'inset 0 2px 12px rgba(0,0,0,0.6)', display:'flex' }}>
              {/* floors */}
              <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column' }}>
                {FLOORS_DEF.map(f => {
                  const active = depthLv >= f.minDepth;
                  const rateLabel = !active ? '🔒' : f.res === 'gold' ? `+${Math.round(f.base * effMult() * mercMult())}` : f.res === 'stall' ? `+${Math.round(f.base * effMult() * mercMult() * 0.12)}` : 'скоро';
                  const rateColor = !active ? '#6e5e44' : f.res === 'gold' ? '#e0c178' : f.res === 'stall' ? '#c9a8d4' : '#6e5e44';
                  return (
                    <div key={f.id} style={{ flex:1, position:'relative', display:'flex', alignItems:'center', gap:11, padding:'0 14px', background: active ? 'rgba(40,28,16,0.5)' : '#120c08', borderBottom:'1px solid #241810', borderLeft:`3px solid ${active ? f.accent : '#3a2c18'}`, opacity: active ? 1 : 0.5 }}>
                      <div style={{ flexShrink:0, fontSize:25, animation: active && f.goblins > 0 ? 'cv-pick 0.9s ease-in-out infinite' : 'none', transformOrigin:'bottom center' }}>{active ? f.worker : '🪨'}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ ...DOT, fontSize:14, color: active ? '#e7d8b4' : '#8a7d62' }}>{f.name}</span>
                          <span style={{ ...MONO, fontSize:9, padding:'1px 6px', borderRadius:8, background: active ? f.tagBg : '#1a1208', color: active ? f.tagColor : '#6e5e44' }}>{f.tag}</span>
                        </div>
                        <div style={{ fontSize:11, color:'#8a724a', marginTop:1 }}>{active ? `${f.goblins} гоблина · ${f.tag}` : `нужна глубина ${f.minDepth} лвл`}</div>
                      </div>
                      {active && (
                        <>
                          <span style={{ position:'absolute', right:120, top:'30%', width:6, height:6, borderRadius:'50%', background:f.accent, animation:'cv-oreglint 2.4s ease-in-out infinite' }} />
                          <span style={{ position:'absolute', right:60, bottom:'24%', width:5, height:5, borderRadius:'50%', background:f.accent, animation:'cv-oreglint 3s ease-in-out infinite 0.6s' }} />
                        </>
                      )}
                      <div style={{ flexShrink:0, textAlign:'right' }}>
                        <div style={{ ...VT, fontSize:17, color:rateColor, lineHeight:1 }}>{rateLabel}</div>
                        <div style={{ ...MONO, fontSize:8, color:'#6e5e44' }}>{active ? `×${f.goblins}` : 'закрыто'}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* rail + cart */}
              <div style={{ flexShrink:0, width:54, position:'relative', background:'linear-gradient(180deg,#1a130b,#0c0805)', borderLeft:'1px solid #3a2c18' }}>
                <div style={{ position:'absolute', left:'50%', top:0, bottom:0, width:3, transform:'translateX(-50%)', background:'repeating-linear-gradient(180deg,#46341f 0,#46341f 6px,transparent 6px,transparent 12px)' }} />
                <div style={{ position:'absolute', left:'50%', transform:'translateX(-50%)', animation:'cv-cartrun 7s ease-in-out infinite' }}>
                  <div style={{ fontSize:26 }}>🛒</div>
                </div>
                {jackpot && (
                  <div onClick={grabJackpot} title="Жила удачи!" style={{ position:'absolute', left:'50%', top:'46%', transform:'translateX(-50%)', cursor:'pointer', width:34, height:34, borderRadius:'50%', background:'radial-gradient(circle,#ffe9a8,#e0c178)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, animation:'cv-jackglow 1s ease-in-out infinite', zIndex:3 }}>💎</div>
                )}
                <div style={{ position:'absolute', bottom:6, left:0, right:0, textAlign:'center', ...SILK, fontSize:7, color:'#6e5e44', letterSpacing:1 }}>ВАГОН</div>
              </div>
            </div>

            {/* storage */}
            <div style={{ background:'#160f09', border:'1px solid #5a4226', borderRadius:8, padding:'11px 13px', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:7 }}>
                <span style={{ ...MONO, fontSize:9, color:'#8a724a', letterSpacing:1 }}>СКЛАД · {pct}% / {CAP.toLocaleString('ru-RU')}</span>
                <span style={{ fontSize:11, color: full ? '#cf6a5a' : '#7faf6a' }}>{full ? '⚠ склад полон — собери!' : 'идёт добыча'}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:11 }}>
                <div style={{ flex:1 }}>
                  <div style={{ height:16, background:'#241810', border:'1px solid #3a2c18', borderRadius:8, overflow:'hidden', position:'relative' }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#a9762a,#e0c178)', transition:'width 0.4s', animation: full ? 'cv-fillpulse 1s ease-in-out infinite' : 'none' }} />
                  </div>
                  <div style={{ display:'flex', gap:14, marginTop:6 }}>
                    <span style={{ fontSize:12, color:'#a8916a' }}>💰 <span style={{ ...VT, fontSize:17, color:'#e0c178' }}>{Math.round(storeGoldLocal).toLocaleString('ru-RU')}</span></span>
                    <span style={{ fontSize:12, color:'#a8916a' }}>🎰 <span style={{ ...VT, fontSize:17, color:'#c9a8d4' }}>{Math.round(storeStall)}</span></span>
                  </div>
                </div>
                <button onClick={collect} style={{ cursor: empty ? 'default' : 'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:1, padding:'11px 22px', background: empty ? '#2a1d11' : 'linear-gradient(180deg,#e7d8b4,#cdb98a)', border:`1px solid ${empty ? '#3a2c18' : '#f0e3c0'}`, borderRadius:7, boxShadow:'0 2px 0 rgba(0,0,0,0.3)' }}>
                  <span style={{ ...DOT, fontSize:16, color: empty ? '#6e5e44' : '#2e2012' }}>СОБРАТЬ</span>
                  <span style={{ ...MONO, fontSize:8, color: empty ? '#6e5e44' : '#6e4a1c' }}>{autosell ? 'авто-режим' : 'в кошелёк'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* COL 3 — БРИГАДА + УЛУЧШЕНИЯ */}
          <div style={{ flex:'0 0 220px', display:'flex', flexDirection:'column', gap:10, minHeight:0 }}>
            {/* mercs */}
            <div style={{ flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ ...SILK, fontSize:11, color:'#c39b4e', letterSpacing:1 }}>▷ БРИГАДА</span>
                <span style={{ ...MONO, fontSize:10, color:'#8a724a' }}>2/4 в шахте</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:8 }}>
                {[...MERCS_DEF, { id:'slot3', icon:'➕', name:'Нанять', accent:'#4a3722', mult:0 }, { id:'slot4', icon:'➕', name:'Нанять', accent:'#4a3722', mult:0 }].map(m => {
                  const left = mercState[m.id] ?? 0;
                  const working = left > 0;
                  const isEmpty = m.mult === 0 && !working;
                  return (
                    <div key={m.id} style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 10px', background: isEmpty ? '#130d08' : '#1c130b', border:`1px solid ${isEmpty ? '#3a2c18' : '#46341f'}`, borderRadius:7 }}>
                      <div style={{ flexShrink:0, width:34, height:40, borderRadius:5, border:`1.5px solid ${m.accent}`, background:'repeating-linear-gradient(45deg,#2a1d10,#2a1d10 4px,#211610 4px,#211610 8px)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17 }}>{m.icon}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ ...DOT, fontSize:12, color: isEmpty ? '#8a724a' : '#e7d8b4', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{isEmpty ? 'Нанять' : m.name}</div>
                        <div style={{ fontSize:10, color: isEmpty ? '#6e5e44' : '#a8916a' }}>{isEmpty ? 'в таверне' : `+${Math.round(m.mult*100)}% добыча`}</div>
                        {working && <div style={{ ...VT, fontSize:14, color:'#7faf6a', lineHeight:1, marginTop:2 }}>⏱ {fmt(left)}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* upgrades */}
            <div style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8, flexShrink:0 }}>
                <span style={{ ...SILK, fontSize:11, color:'#c9a8d4', letterSpacing:1 }}>▷ УЛУЧШЕНИЯ</span>
                <span style={{ ...MONO, fontSize:10, color:'#8a724a' }}>платишь 🎰</span>
              </div>
              <div style={{ flex:1, minHeight:0, overflowY:'auto', display:'flex', flexDirection:'column', gap:8, paddingRight:3 }}>
                {UPGRADES_DEF.map(u => {
                  const cost = COSTS[u.kind];
                  const done = u.kind === 'auto' ? autosell : false;
                  const lvl = u.kind === 'depth' ? `гл.${depthLv}` : u.kind === 'eff' ? `ур.${eff}` : u.kind === 'cap' ? `ур.${capLv}` : u.kind === 'off' ? `ур.${offLv}` : autosell ? 'вкл' : 'выкл';
                  const afford = stallonki >= cost && !done;
                  return (
                    <div key={u.id} style={{ display:'flex', alignItems:'center', gap:11, padding:'10px 11px', background:'#160f09', border:`1px solid ${done ? '#4a6e3a' : '#3a2c18'}`, borderRadius:7 }}>
                      <div style={{ flexShrink:0, width:38, height:38, borderRadius:7, border:`1.5px solid ${u.accent}`, background:'#1c130b', display:'flex', alignItems:'center', justifyContent:'center', fontSize:19 }}>{u.icon}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'baseline', gap:7 }}>
                          <span style={{ ...DOT, fontSize:13, color:'#e7d8b4' }}>{u.name}</span>
                          <span style={{ ...MONO, fontSize:9, color:'#7faf6a' }}>{lvl}</span>
                        </div>
                        <div style={{ fontSize:10.5, color:'#8a724a', marginTop:1 }}>{u.effect}</div>
                      </div>
                      <button onClick={() => buyUpgrade(u.kind)} style={{ cursor: afford ? 'pointer' : 'default', flexShrink:0, textAlign:'center', padding:'8px 11px', background: done ? '#1e2a16' : (afford ? '#3a2842' : '#160f09'), border:`1px solid ${done ? '#4a6e3a' : (afford ? '#5a4a60' : '#3a2c18')}`, borderRadius:5, ...VT, fontSize:16, color: done ? '#9ad27e' : (afford ? '#c9a8d4' : '#6e5e44'), lineHeight:1 }}>
                        {done ? '✓' : `🎰${cost}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
