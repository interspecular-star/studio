'use client';
import React, { useEffect, useState } from 'react';
import { useStudioStore } from '@/lib/store';
import { toast } from 'sonner';

const VT:   React.CSSProperties = { fontFamily: 'var(--font-vt, VT323, monospace)', lineHeight: 1 };
const SILK: React.CSSProperties = { fontFamily: 'var(--font-silk, Silkscreen, monospace)', letterSpacing: '0.5px' };
const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono, Space Mono, monospace)' };
const DOT:  React.CSSProperties = { fontFamily: 'var(--font-dot, DotGothic16, sans-serif)' };
const WOOD_BG = `repeating-linear-gradient(92deg, rgba(0,0,0,0.10) 0px, rgba(0,0,0,0.10) 1px, transparent 1px, transparent 9px), repeating-linear-gradient(92deg, rgba(140,104,58,0.05) 3px, transparent 4px, transparent 16px)`;

const CSS = `
@keyframes sha-zfloat { 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(-9px); } }
@keyframes sha-auraglow { 0%,100%{ opacity:0.45; transform:scale(1); } 50%{ opacity:0.8; transform:scale(1.06); } }
@keyframes sha-incense { 0%{ transform:translateY(0) scaleX(1); opacity:0; } 30%{ opacity:0.45; } 100%{ transform:translateY(-58px) scaleX(2) translateX(10px); opacity:0; } }
@keyframes sha-runefloat { 0%,100%{ transform:translateY(0) rotate(0deg); opacity:0.5; } 50%{ transform:translateY(-12px) rotate(8deg); opacity:0.95; } }
@keyframes sha-eyeblink { 0%,94%,100%{ transform:scaleY(1); } 97%{ transform:scaleY(0.1); } }
@keyframes sha-twinkle { 0%,100%{ opacity:0.25; } 50%{ opacity:0.9; } }
@keyframes sha-mistswirl { 0%{ transform:rotate(0deg); } 100%{ transform:rotate(360deg); } }
@keyframes sha-mistswirl2 { 0%{ transform:rotate(0deg); } 100%{ transform:rotate(-360deg); } }
@keyframes sha-ballpulse { 0%,100%{ box-shadow:0 0 26px rgba(180,143,196,0.4), inset 0 0 30px rgba(111,163,160,0.3); } 50%{ box-shadow:0 0 40px rgba(180,143,196,0.6), inset 0 0 40px rgba(111,163,160,0.45); } }
@keyframes sha-blink { 0%,92%,100%{ opacity:1; } 95%{ opacity:0.1; } }
`;

const NODES_DEF = [
  { id:'root',    icon:'🌀', x:180, y:270, name:'Связь с Границей', effect:'Открывает доступ к древу. +5% ко всей магии за уровень.', max:3, cost:4,  accent:'#b48fc4', glow:'rgba(180,143,196,0.6)', req:null as string|null },
  { id:'whisper', icon:'💀', x:92,  y:178, name:'Шёпот мёртвых',    effect:'Павшие враги дают +1 душу за уровень.',                  max:5, cost:5,  accent:'#9a8ac0', glow:'rgba(154,138,192,0.6)', req:'root' },
  { id:'mend',    icon:'🩹', x:268, y:178, name:'Перемотка ран',     effect:'Лечение в бою +20% за уровень.',                         max:5, cost:6,  accent:'#6fa3a0', glow:'rgba(111,163,160,0.6)', req:'root' },
  { id:'static',  icon:'📺', x:180, y:88,  name:'Помехи судьбы',     effect:'+4% уворот за уровень — реальность не прогружается.',    max:4, cost:7,  accent:'#7a9ec4', glow:'rgba(122,158,196,0.6)', req:'root' },
  { id:'eye',     icon:'👁️', x:56,  y:84,  name:'Глаз Зоси',         effect:'+5% крит за уровень. Видит слабые места и грехи.',      max:4, cost:7,  accent:'#c9a8d4', glow:'rgba(201,168,212,0.6)', req:'whisper' },
  { id:'beyond',  icon:'⚡', x:304, y:84,  name:'Зов из-за грани',   effect:'УЛЬТА: раз в бой призывает помехо-духа. Бьёт всех.',    max:1, cost:12, accent:'#e0c178', glow:'rgba(224,193,120,0.7)', req:'mend' },
];

const LINKS: [string, string][] = [
  ['root','static'], ['root','whisper'], ['root','mend'], ['whisper','eye'], ['mend','beyond'],
];

const ZOSYA_LINES = [
  'Твоя аура цвета непрожаренного тоста. Это… не к добру, но вкусно.',
  'Я говорила с холодильником. Он передаёт привет и просит пива. Снова.',
  'Звёзды сегодня молчат. Зато телевизор шипит — а он врать не станет.',
  'Душа — как кассета: если зажевало, перематывай карандашом. Аккуратно.',
  'Вижу твоё будущее… ой, нет, это реклама. Подожди, сейчас пройдёт.',
  'Не бойся смерти. Бойся понедельника. Понедельник — древнее зло.',
  'Границу Миров я закрыла на щеколду. Но щеколда деревянная, так что… молись.',
];

const PROPHECIES = [
  'Сегодня ты встретишь курицу. Она будет вооружена. Не смейся.',
  'Богатство придёт к тебе… через починку чужого утюга. Опять.',
  'Остерегайся табурета о трёх ногах. Он помнит, что ты сделал.',
  'Дискета судьбы ближе, чем кажется. Проверь карман. Нет, другой.',
  'Великий дубль ждёт. Не забудь накопить комбо, дитя помех.',
  'Звёзды сложились в слово «пельмени». Толкование утеряно.',
];

const CHARMS = [
  { id:'ward',   icon:'🧿', name:'Оберег от сглаза', effect:'−15% урон от боссов · 1 бой', cost:3, accent:'#7a9ec4' },
  { id:'bone',   icon:'🦴', name:'Костяной амулет',  effect:'+1 душа за моба · 5 мин',     cost:5, accent:'#9a8ac0' },
  { id:'candle', icon:'🕯️', name:'Свеча прозрения',  effect:'видны редкие дропы · 10 мин', cost:4, accent:'#c9a8d4' },
];

type Levels = Record<string, number>;

export default function ShamanPage() {
  const { variables, executeAction } = useStudioStore();
  const goldVar = variables.find(v => ['Золото','gold','Gold'].includes(v.name));
  const storeGold = Number(goldVar?.defaultValue ?? 1240);

  const [souls, setSouls]     = useState(47);
  const [zosyaIdx, setZosyaIdx] = useState(0);
  const [selNode, setSelNode] = useState('root');
  const [levels, setLevels]   = useState<Levels>({ root:1, whisper:0, mend:0, eye:0, static:0, beyond:0 });
  const [prophIdx, setProphIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setZosyaIdx(i => (i + 1) % ZOSYA_LINES.length), 7000);
    return () => clearInterval(t);
  }, []);

  const byId = Object.fromEntries(NODES_DEF.map(n => [n.id, n]));

  function isUnlocked(id: string): boolean {
    const def = byId[id];
    if (!def.req) return true;
    return (levels[def.req] ?? 0) >= 1;
  }

  function upgrade() {
    const sel = byId[selNode];
    const lvl = levels[selNode] ?? 0;
    if (!isUnlocked(selNode) || lvl >= sel.max || souls < sel.cost) return;
    setSouls(s => s - sel.cost);
    setLevels(l => ({ ...l, [selNode]: lvl + 1 }));
    toast.success(`${sel.name} · ур. ${lvl + 1}/${sel.max}`);
  }

  function buyCharm(charm: typeof CHARMS[0]) {
    if (souls < charm.cost) { toast.error('Недостаточно душ'); return; }
    setSouls(s => s - charm.cost);
    toast.success(`${charm.name} — активировано`);
  }

  function scry() {
    if (souls < 1) { toast.error('Недостаточно душ'); return; }
    setSouls(s => s - 1);
    setProphIdx(i => (i + 1 + Math.floor(Math.random() * 2)) % PROPHECIES.length);
  }

  const links = LINKS.map(([a, b]) => {
    const active = (levels[a] ?? 0) >= 1 && (levels[b] ?? 0) >= 1;
    return { x1: byId[a].x, y1: byId[a].y, x2: byId[b].x, y2: byId[b].y, active };
  });

  const sel = byId[selNode];
  const selLvl = levels[selNode] ?? 0;
  const selUnlocked = isUnlocked(selNode);
  const selMaxed = selLvl >= sel.max;
  const canUp = selUnlocked && !selMaxed && souls >= sel.cost;

  return (
    <>
      <style>{CSS}</style>
      <div style={{ position:'absolute', inset:0, zIndex:30, overflow:'hidden', display:'flex', flexDirection:'column', background:`${WOOD_BG}, #231522`, border:'1px solid #4a3550', color:'#ecdcc0', fontFamily:'Hanken Grotesk,system-ui,sans-serif' }}>

        {/* HUD */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 18px', background:'#1a1018', borderBottom:'1px solid #4a3550', zIndex:3, flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:36, height:36, border:'2px solid #b48fc4', borderRadius:4, background:'repeating-linear-gradient(45deg,#2a1d28,#2a1d28 4px,#241820 4px,#241820 8px)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ ...SILK, fontSize:8, color:'#b48fc4' }}>СЛЭЙ</span>
            </div>
            <div>
              <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                <span style={{ ...DOT, fontSize:14, color:'#e7d8b4' }}>СЛЭЙ</span>
                <span style={{ ...MONO, fontSize:10, color:'#a890a8' }}>наёмник · ур.24</span>
              </div>
              <div style={{ display:'flex', gap:10, marginTop:4, alignItems:'center' }}>
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ ...MONO, fontSize:9, color:'#a890a8' }}>HP</span>
                  <div style={{ width:74, height:6, background:'#2a1d28', borderRadius:3, overflow:'hidden' }}><div style={{ height:'100%', width:'84%', background:'#7faf6a' }} /></div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ ...MONO, fontSize:9, color:'#a890a8' }}>MP</span>
                  <div style={{ width:54, height:6, background:'#2a1d28', borderRadius:3, overflow:'hidden' }}><div style={{ height:'100%', width:'65%', background:'#6fa3a0' }} /></div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <div style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 11px', background:'#190f17', border:'1px solid #5a3f60', borderRadius:4, boxShadow:'0 0 10px rgba(180,143,196,0.18)' }}>
              <span style={{ fontSize:13 }}>💀</span><span style={{ ...VT, fontSize:18, color:'#c9a8d4' }}>{souls}</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', background:'#190f17', border:'1px solid #3a2c38', borderRadius:4 }}>
              <span style={{ fontSize:13 }}>💰</span><span style={{ ...VT, fontSize:18, color:'#e0c178' }}>{storeGold.toLocaleString('ru-RU')}</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', background:'#190f17', border:'1px solid #3a2c38', borderRadius:4 }}>
              <span style={{ fontSize:13 }}>📼</span><span style={{ ...VT, fontSize:18, color:'#b8a888' }}>12</span>
            </div>
            <div style={{ cursor:'pointer', width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', background:'#2a1d28', border:'1px solid #4a3550', borderRadius:4, fontSize:13 }}>🎒</div>
          </div>
        </div>

        {/* TITLE BAND */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 22px', background:'linear-gradient(180deg,#2c1a2a,#231522)', borderBottom:'1px solid #4a3550', zIndex:3, flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <button onClick={() => executeAction({ type:'goToPage', pageId:'village' })} style={{ cursor:'pointer', display:'flex', alignItems:'center', gap:6, padding:'7px 12px', background:'#3a2842', border:'1px solid #5a3f60', borderRadius:4, color:'#b48fc4', fontSize:12 }}>← площадь</button>
            <span style={{ ...DOT, fontSize:26, color:'#e0d0e4', letterSpacing:1 }}>ЛОГОВО ЗОСИ</span>
            <span style={{ fontSize:12, color:'#a890a8' }}>шаманка-алхимик · вход по записи в астрале</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:9, padding:'5px 12px', background:'#190f17', border:'1px solid #3a2c38', borderRadius:5 }}>
            <span style={{ fontSize:13 }}>🌙</span>
            <span style={{ ...VT, fontSize:16, color:'#c9a8d4' }}>луна растущая · помех много</span>
          </div>
        </div>

        {/* BODY */}
        <div style={{ flex:1, display:'flex', gap:14, padding:'14px 18px', minHeight:0 }}>

          {/* COL 1 — ЗОСЯ */}
          <div style={{ flex:'0 0 252px', display:'flex', flexDirection:'column', gap:12, minHeight:0 }}>
            <div style={{ position:'relative', flex:1, minHeight:0, background:'radial-gradient(ellipse at 50% 45%, #2e203a 0%, #160f16 75%)', border:'1px solid #4a3550', borderRadius:8, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ position:'absolute', width:240, height:240, borderRadius:'50%', background:'radial-gradient(circle, rgba(180,143,196,0.3), transparent 68%)', animation:'sha-auraglow 4s ease-in-out infinite', pointerEvents:'none' }} />
              <div style={{ position:'absolute', top:24, left:30, width:3, height:3, background:'#c9a8d4', borderRadius:'50%', animation:'sha-twinkle 2.6s infinite' }} />
              <div style={{ position:'absolute', top:60, right:34, width:2, height:2, background:'#6fa3a0', borderRadius:'50%', animation:'sha-twinkle 3.1s infinite 0.5s' }} />
              <div style={{ position:'absolute', bottom:54, left:46, width:2, height:2, background:'#e0d0e4', borderRadius:'50%', animation:'sha-twinkle 2.2s infinite 1s' }} />
              <div style={{ position:'absolute', top:40, left:22, ...DOT, fontSize:18, color:'rgba(201,168,212,0.7)', animation:'sha-runefloat 5s ease-in-out infinite' }}>⛧</div>
              <div style={{ position:'absolute', bottom:60, right:26, ...DOT, fontSize:16, color:'rgba(111,163,160,0.7)', animation:'sha-runefloat 6s ease-in-out infinite 1.2s' }}>✷</div>
              <div style={{ position:'absolute', top:10, left:12, ...SILK, fontSize:9, color:'#7a6080', letterSpacing:1, zIndex:2 }}>АСТРАЛ</div>
              <div style={{ position:'absolute', top:10, right:12, display:'flex', alignItems:'center', gap:5, zIndex:2 }}>
                <span style={{ display:'block', width:6, height:6, borderRadius:'50%', background:'#b48fc4', animation:'sha-blink 2s infinite' }} />
                <span style={{ ...MONO, fontSize:9, color:'#b48fc4' }}>в трансе</span>
              </div>
              <div style={{ position:'relative', animation:'sha-zfloat 5s ease-in-out infinite', zIndex:1 }}>
                <div style={{ width:200, height:264, border:'2px solid #b48fc4', borderRadius:10, background:'linear-gradient(135deg,#2e203a,#1a1020)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 30px rgba(180,143,196,0.3)' }}>
                  <span style={{ fontSize:72 }}>🔮</span>
                </div>
                <div style={{ position:'absolute', top:38, left:'50%', transform:'translateX(-50%)', width:22, height:14, background:'radial-gradient(circle,#e0d0e4,#6fa3a0)', borderRadius:'50%', animation:'sha-eyeblink 4s infinite', boxShadow:'0 0 12px rgba(201,168,212,0.7)' }} />
                <div style={{ position:'absolute', bottom:6, left:18, width:6, height:10, background:'rgba(201,168,212,0.4)', borderRadius:'50%', animation:'sha-incense 3.4s ease-out infinite' }} />
                <div style={{ position:'absolute', bottom:6, right:22, width:5, height:9, background:'rgba(111,163,160,0.4)', borderRadius:'50%', animation:'sha-incense 4s ease-out infinite 1.4s' }} />
              </div>
            </div>
            <div style={{ background:'#1c1320', border:'1px solid #4a3550', borderLeft:'3px solid #6fa3a0', borderRadius:8, padding:14, display:'flex', flexDirection:'column', flexShrink:0, minHeight:108 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                  <span style={{ ...DOT, fontSize:16, color:'#6fa3a0' }}>Зося</span>
                  <span style={{ ...MONO, fontSize:9, color:'#8a7090', textTransform:'uppercase' }}>шаманка-алхимик</span>
                </div>
                <button onClick={() => setZosyaIdx(i => (i+1) % ZOSYA_LINES.length)} style={{ cursor:'pointer', padding:'5px 11px', background:'#3a2842', border:'1px solid #5a3f60', borderRadius:4, color:'#c9a8d4', ...DOT, fontSize:11 }}>ещё →</button>
              </div>
              <div style={{ flex:1, display:'flex', alignItems:'center', fontSize:13, fontStyle:'italic', color:'#dcc8e0', lineHeight:1.5, marginTop:8 }}>
                «{ZOSYA_LINES[zosyaIdx % ZOSYA_LINES.length]}»
              </div>
            </div>
          </div>

          {/* COL 2 — ДРЕВО ДУШ */}
          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:10, minHeight:0 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
              <span style={{ ...SILK, fontSize:11, color:'#b48fc4', letterSpacing:1 }}>▷ ДРЕВО ДУШ</span>
              <div style={{ display:'flex', alignItems:'center', gap:6, padding:'3px 10px', background:'#190f17', border:'1px solid #5a3f60', borderRadius:10 }}>
                <span style={{ fontSize:12 }}>💀</span>
                <span style={{ ...VT, fontSize:16, color:'#c9a8d4' }}>{souls} душ</span>
              </div>
            </div>
            {/* constellation */}
            <div style={{ flex:1, minHeight:0, position:'relative', background:'radial-gradient(ellipse at 50% 30%, #221830 0%, #140d14 80%)', border:'1px solid #4a3550', borderRadius:8, overflow:'hidden', boxShadow:'inset 0 2px 10px rgba(0,0,0,0.5)' }}>
              <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(rgba(201,168,212,0.18) 1px, transparent 1px)', backgroundSize:'26px 26px', pointerEvents:'none' }} />
              <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:360, height:340 }}>
                <svg width="360" height="340" viewBox="0 0 360 340" style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
                  {links.map((ln, i) => (
                    <line key={i} x1={ln.x1} y1={ln.y1} x2={ln.x2} y2={ln.y2}
                      stroke={ln.active ? '#b48fc4' : '#4a3550'} strokeWidth="2"
                      strokeDasharray={ln.active ? '0' : '4 4'} />
                  ))}
                </svg>
                {NODES_DEF.map(n => {
                  const lvl = levels[n.id] ?? 0;
                  const unlocked = isUnlocked(n.id);
                  const maxed = lvl >= n.max;
                  const isSel = selNode === n.id;
                  return (
                    <div key={n.id} onClick={() => { if (unlocked) setSelNode(n.id); }} title={n.name}
                      style={{ position:'absolute', left:n.x, top:n.y, transform:'translate(-50%,-50%)', cursor: unlocked ? 'pointer' : 'not-allowed', width:50, height:50, borderRadius:'50%', border:`2px solid ${isSel ? '#e0d0e4' : (lvl>0 ? n.accent : '#5a3f60')}`, background: lvl>0 ? '#2a1d30' : '#190f17', display:'flex', alignItems:'center', justifyContent:'center', fontSize:21, boxShadow:`0 0 ${lvl>0?14:6}px ${lvl>0?n.glow:'rgba(90,63,96,0.3)'}`, opacity: unlocked ? 1 : 0.4 }}>
                      {n.icon}
                      <span style={{ position:'absolute', bottom:-17, left:'50%', transform:'translateX(-50%)', ...VT, fontSize:13, color: maxed ? '#e0c178' : (lvl>0 ? '#c9a8d4' : '#7a6080'), whiteSpace:'nowrap' }}>
                        {unlocked ? `${lvl}/${n.max}` : '🔒'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* node detail */}
            <div style={{ background:'#1c1320', border:'1px solid #5a3f60', borderRadius:8, padding:'13px 15px', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ flexShrink:0, width:46, height:46, borderRadius:'50%', border:`2px solid ${sel.accent}`, background:'#160f16', display:'flex', alignItems:'center', justifyContent:'center', fontSize:23, boxShadow:`0 0 14px ${sel.glow}` }}>{sel.icon}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'baseline', gap:9 }}>
                    <span style={{ ...DOT, fontSize:15, color:'#e0d0e4' }}>{sel.name}</span>
                    <span style={{ ...VT, fontSize:14, color:'#c9a8d4' }}>{selUnlocked ? `ур. ${selLvl}/${sel.max}` : 'заблокировано'}</span>
                  </div>
                  <div style={{ fontSize:11.5, color:'#a890a8', lineHeight:1.4, marginTop:2 }}>{sel.effect}</div>
                </div>
                <button onClick={upgrade} style={{ cursor: canUp ? 'pointer' : 'not-allowed', flexShrink:0, padding:'9px 15px', background: !selUnlocked ? '#190f17' : selMaxed ? '#2a1d10' : canUp ? '#3a2842' : '#190f17', border:`1px solid ${!selUnlocked ? '#3a2c38' : selMaxed ? '#6e5430' : canUp ? '#5a3f60' : '#3a2c38'}`, borderRadius:6, ...DOT, fontSize:13, color: !selUnlocked ? '#7a6080' : selMaxed ? '#e0c178' : canUp ? '#c9a8d4' : '#7a6080' }}>
                  {!selUnlocked ? `🔒 «${byId[sel.req!]?.name}»` : selMaxed ? '✦ максимум' : `Влить душу · 💀${sel.cost}`}
                </button>
              </div>
            </div>
          </div>

          {/* COL 3 — ОБЕРЕГИ + ШАР */}
          <div style={{ flex:'0 0 252px', display:'flex', flexDirection:'column', gap:12, minHeight:0 }}>
            <div style={{ display:'flex', flexDirection:'column', gap:8, flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ ...SILK, fontSize:11, color:'#6fa3a0', letterSpacing:1 }}>▷ ОБЕРЕГИ</span>
                <span style={{ ...MONO, fontSize:10, color:'#8a7090' }}>платишь душами</span>
              </div>
              {CHARMS.map(c => {
                const ok = souls >= c.cost;
                return (
                  <div key={c.id} style={{ display:'flex', alignItems:'center', gap:11, padding:'10px 12px', background:'#1c1320', border:'1px solid #3a2c38', borderRadius:7 }}>
                    <div style={{ flexShrink:0, width:42, height:42, borderRadius:7, border:`1.5px solid ${c.accent}`, background:'#160f16', display:'flex', alignItems:'center', justifyContent:'center', fontSize:21 }}>{c.icon}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ ...DOT, fontSize:13, color:'#e0d0e4' }}>{c.name}</div>
                      <div style={{ fontSize:11, color:'#a890a8' }}>{c.effect}</div>
                    </div>
                    <button onClick={() => buyCharm(c)} style={{ cursor:'pointer', flexShrink:0, display:'flex', alignItems:'center', gap:4, padding:'7px 11px', background: ok ? '#3a2842' : '#190f17', border:`1px solid ${ok ? '#5a3f60' : '#3a2c38'}`, borderRadius:5 }}>
                      <span style={{ fontSize:11 }}>💀</span>
                      <span style={{ ...VT, fontSize:16, color: ok ? '#c9a8d4' : '#7a6080' }}>{c.cost}</span>
                    </button>
                  </div>
                );
              })}
            </div>
            {/* Crystal ball */}
            <div style={{ flex:1, minHeight:0, background:'radial-gradient(ellipse at 50% 30%, #241830, #140d14)', border:'1px solid #5a3f60', borderRadius:8, padding:14, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12 }}>
              <div style={{ ...SILK, fontSize:10, color:'#b48fc4', letterSpacing:1 }}>✦ ШАР ПРЕДСКАЗАНИЙ ✦</div>
              <div style={{ position:'relative', width:120, height:120 }}>
                <div style={{ position:'absolute', inset:0, borderRadius:'50%', overflow:'hidden', background:'radial-gradient(circle at 38% 32%, #3a2c4a, #1a1020)', border:'2px solid #6e5478', animation:'sha-ballpulse 3.5s ease-in-out infinite' }}>
                  <div style={{ position:'absolute', inset:'-30%', background:'conic-gradient(from 0deg, rgba(180,143,196,0.5), rgba(111,163,160,0.1), rgba(201,168,212,0.5), rgba(111,163,160,0.1), rgba(180,143,196,0.5))', filter:'blur(12px)', animation:'sha-mistswirl 9s linear infinite' }} />
                  <div style={{ position:'absolute', inset:'-10%', background:'radial-gradient(circle at 60% 65%, rgba(111,163,160,0.4), transparent 50%)', filter:'blur(8px)', animation:'sha-mistswirl2 12s linear infinite' }} />
                  <div style={{ position:'absolute', top:14, left:20, width:34, height:22, background:'radial-gradient(circle, rgba(255,255,255,0.5), transparent 70%)', borderRadius:'50%', filter:'blur(2px)' }} />
                </div>
                <div style={{ position:'absolute', bottom:-8, left:'50%', transform:'translateX(-50%)', width:64, height:16, background:'linear-gradient(180deg,#3a2842,#241820)', border:'1px solid #5a3f60', borderRadius:4 }} />
              </div>
              <div style={{ textAlign:'center', minHeight:56, display:'flex', alignItems:'center', padding:'0 4px' }}>
                <div style={{ fontSize:13, fontStyle:'italic', color:'#dcc8e0', lineHeight:1.5 }}>
                  «{PROPHECIES[prophIdx % PROPHECIES.length]}»
                </div>
              </div>
              <button onClick={scry} style={{ cursor: souls >= 1 ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', gap:7, padding:'8px 18px', background: souls >= 1 ? '#3a2842' : '#190f17', border:`1px solid ${souls >= 1 ? '#5a3f60' : '#3a2c38'}`, borderRadius:6, ...DOT, fontSize:13, color: souls >= 1 ? '#c9a8d4' : '#7a6080' }}>
                🔮 Погадать · 💀1
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
