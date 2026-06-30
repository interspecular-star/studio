'use client';
import React, { useState } from 'react';
import { useStudioStore } from '@/lib/store';
import { toast } from 'sonner';

const VT:   React.CSSProperties = { fontFamily: 'var(--font-vt, VT323, monospace)', lineHeight: 1 };
const SILK: React.CSSProperties = { fontFamily: 'var(--font-silk, Silkscreen, monospace)', letterSpacing: '0.5px' };
const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono, Space Mono, monospace)' };
const DOT:  React.CSSProperties = { fontFamily: 'var(--font-dot, DotGothic16, sans-serif)' };
const WOOD_BG = `repeating-linear-gradient(92deg, rgba(0,0,0,0.10) 0px, rgba(0,0,0,0.10) 1px, transparent 1px, transparent 9px), repeating-linear-gradient(92deg, rgba(140,104,58,0.05) 3px, transparent 4px, transparent 16px)`;

const CSS = `
@keyframes bu-bubob { 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(-5px); } }
@keyframes bu-blinkdot { 0%,92%,100%{ opacity:1; } 95%{ opacity:0.1; } }
@keyframes bu-tube { 0%{ transform:translateY(0) scaleX(1); } 40%{ transform:translateY(-220px) scaleX(0.85); } 60%{ transform:translateY(-220px) scaleX(0.85) rotate(4deg); } 90%{ transform:translateY(0) scaleX(1); } 100%{ transform:translateY(0) scaleX(1); } }
@keyframes bu-stampin { 0%{ transform:scale(2.2) rotate(-8deg); opacity:0; } 55%{ transform:scale(0.95) rotate(2deg); opacity:1; } 75%{ transform:scale(1.05) rotate(-1deg); opacity:1; } 100%{ transform:scale(1) rotate(0); opacity:1; } }
`;

type Tab = 'mail' | 'quests' | 'notif';

interface Msg { id: number; icon: string; accent: string; title: string; from: string; body: string; unread: boolean; reward?: string; action?: string; }
interface Quest { id: number; icon: string; accent: string; title: string; desc: string; reward: string; unread: boolean; }
interface Notif { id: number; icon: string; accent: string; title: string; body: string; unread: boolean; }

const MAIL_DATA: Msg[] = [
  { id:1, icon:'✉️', accent:'#cf8a5a', title:'Спасибо от Агафьи', from:'Кузница', body:'Слэй! Заказ на усиление молота выполнен. Зашла бы, проверила — или деньгами выразишь признательность?', unread:true, reward:'💰300', action:'Получить' },
  { id:2, icon:'📬', accent:'#c39b4e', title:'Новый товар у Сэма', from:'Лавка', body:'Скороход-2000 снова под завязку. Заходи, крути — может, выпадет что-то не из мусора.', unread:true },
  { id:3, icon:'📭', accent:'#a8916a', title:'Зося шлёт привет', from:'Логово', body:'Хрустальный шар мутный стал — надо бы протереть. И душ подкинуть бы. В смысле, ресурсов.', unread:false },
];
const QUESTS_DATA: Quest[] = [
  { id:1, icon:'⚔️', accent:'#e07050', title:'Зачистка 5 подземелий', desc:'Пройди 5 любых подземелий в режиме наёмника. Сделай это быстрее чем за 3 хода.', reward:'💰1200 + 🔩40', unread:true },
  { id:2, icon:'🏆', accent:'#e0c178', title:'Поднять уровень деревни до 40', desc:'Суммарный уровень всех зданий должен достичь отметки 40. Бурмил следит.', reward:'💰3000 + 📼5', unread:false },
  { id:3, icon:'🛡️', accent:'#7faf6a', title:'Пережить волну нежити', desc:'Завершить боевую волну «НЕЖИТЬ-2» без потери HP ниже 20%.', reward:'💎1 + 💰500', unread:false },
];
const NOTIF_DATA: Notif[] = [
  { id:1, icon:'🔔', accent:'#cf6a5a', title:'Кассета дня кончается', body:'До конца дня осталось 4 часа. Бурмил напоминает: перемотать не забудь.', unread:true },
  { id:2, icon:'⛏️', accent:'#7faf6a', title:'Пещера переполнена', body:'Хранилище в Пещере заполнено на 100%. Зырк волнуется. Зайди, собери.', unread:true },
  { id:3, icon:'💬', accent:'#b48fc4', title:'Пророчество Зоси', body:'«Большие перемены грядут с запада. Или с востока. Хрустальный шар мутный.»', unread:false },
];

const BUFFS_DEF = [
  { id:'swiftness', icon:'🍺', name:'Расторопность',      cost:120 },
  { id:'oxbroth',   icon:'🍲', name:'Бычий Бульон',        cost:160 },
  { id:'luck',      icon:'🍀', name:'Щепотка Удачи',       cost:220 },
  { id:'ward',      icon:'🛡️', name:'Оберег от Оборотней', cost:200 },
  { id:'focus',     icon:'⚒️', name:'Шахтёрский Фокус',   cost:140 },
];
const DELIVERY_FEE = 60;

export default function BureauPage() {
  const { variables, executeAction } = useStudioStore();
  const goldVar   = variables.find(v => ['Золото','gold','Gold'].includes(v.name));
  const storeGold = Number(goldVar?.defaultValue ?? 4200);

  const [goldSpent, setGoldSpent] = useState(0);
  const [vhs]   = useState(12);
  const [tab, setTab]   = useState<Tab>('mail');
  const [ksenyaIdx, setKsenyaIdx] = useState(0);
  const [unreadMail,   setUnreadMail]   = useState(MAIL_DATA.filter(m => m.unread).map(m => m.id));
  const [unreadQuests, setUnreadQuests] = useState(QUESTS_DATA.filter(q => q.unread).map(q => q.id));
  const [unreadNotif,  setUnreadNotif]  = useState(NOTIF_DATA.filter(n => n.unread).map(n => n.id));
  const [selectedBufIds, setSelectedBufIds] = useState<string[]>([]);
  const [delivering, setDelivering]  = useState(false);
  const [delivered, setDelivered]    = useState(false);
  const [tubeVisible, setTubeVisible] = useState(false);

  const gold = Math.max(0, storeGold - goldSpent);
  const totalUnread = unreadMail.length + unreadQuests.length + unreadNotif.length;

  const buffTotal = selectedBufIds.reduce((s, id) => {
    const b = BUFFS_DEF.find(x => x.id === id);
    return s + (b ? b.cost : 0);
  }, 0) + (selectedBufIds.length > 0 ? DELIVERY_FEE : 0);

  const KSENIA_LINES = [
    'Вам письмо! Или нет? Проверьте сами, я тут почтальон, а не телепат.',
    'Срочная доставка — это я могу. Но только если трубопровод не засорён. Он снова засорён.',
    'Задания берите — получайте. Зоси хрустальный шар прислала, говорит «ауры у вас тревожная». Ну я не знаю.',
    'Экспресс-доставка бустов! Трубка пыхтит, кот орёт, результат — всегда неожиданный.',
    'Уведомления свежие! Почти. Ладно, одно пятидневной давности. Зато актуальное по духу.',
  ];

  function claimMail(id: number, reward?: string) {
    setUnreadMail(ids => ids.filter(x => x !== id));
    if (reward) {
      setGoldSpent(g => g - 300);
      toast.success(`Получено: ${reward}`);
    }
  }
  function readQuest(id: number) { setUnreadQuests(ids => ids.filter(x => x !== id)); }
  function readNotif(id: number) { setUnreadNotif(ids => ids.filter(x => x !== id)); }

  function toggleBuff(id: string) {
    setSelectedBufIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
    setDelivered(false);
  }

  function onDeliver() {
    if (delivering || delivered) return;
    if (selectedBufIds.length === 0 || gold < buffTotal) { toast.error('Выберите боевые бусты и убедитесь что хватает золота'); return; }
    setDelivering(true);
    setTubeVisible(true);
    setTimeout(() => {
      setGoldSpent(g => g + buffTotal);
      setDelivered(true);
      setDelivering(false);
      toast.success('Бусты доставлены!');
    }, 1900);
  }

  const tabDefs: { id: Tab; label: string; badge: number }[] = [
    { id:'mail',   label:'✉️ Письма',     badge: unreadMail.length },
    { id:'quests', label:'⚔️ Задания',    badge: unreadQuests.length },
    { id:'notif',  label:'🔔 Уведомления', badge: unreadNotif.length },
  ];

  return (
    <>
      <style>{CSS}</style>
      <div style={{ position:'absolute', inset:0, zIndex:30, overflow:'hidden', display:'flex', flexDirection:'column', background:`${WOOD_BG}, #241810`, border:'1px solid #5a4226', color:'#ecdcc0', fontFamily:'Hanken Grotesk,system-ui,sans-serif' }}>

        {/* HUD */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 18px', background:'#1a120a', borderBottom:'1px solid #5a4226', zIndex:3, flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:36, height:36, border:'2px solid #cf8a5a', borderRadius:4, background:'repeating-linear-gradient(45deg,#2a1d10,#2a1d10 4px,#241810 4px,#241810 8px)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ ...SILK, fontSize:8, color:'#cf8a5a' }}>СЛЭЙ</span>
            </div>
            <div>
              <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                <span style={{ ...DOT, fontSize:14, color:'#e7d8b4' }}>СЛЭЙ</span>
                <span style={{ ...MONO, fontSize:10, color:'#a8916a' }}>наёмник · ур.24</span>
              </div>
              <div style={{ display:'flex', gap:10, marginTop:4 }}>
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ ...MONO, fontSize:9, color:'#a8916a' }}>HP</span>
                  <div style={{ width:74, height:6, background:'#2a1d10', borderRadius:3, overflow:'hidden' }}><div style={{ height:'100%', width:'84%', background:'#7faf6a' }} /></div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            {totalUnread > 0 && (
              <div style={{ padding:'4px 10px', background:'#3a1f10', border:'1px solid #cf8a5a', borderRadius:12, display:'flex', alignItems:'center', gap:5 }}>
                <span style={{ fontSize:12 }}>📬</span>
                <span style={{ ...VT, fontSize:16, color:'#cf8a5a' }}>{totalUnread} непрочитано</span>
              </div>
            )}
            <div style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 11px', background:'#161009', border:'1px solid #5a4226', borderRadius:4, boxShadow:'0 0 10px rgba(224,193,120,0.15)' }}>
              <span style={{ fontSize:13 }}>💰</span><span style={{ ...VT, fontSize:18, color:'#e0c178' }}>{gold.toLocaleString('ru-RU')}</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', background:'#161009', border:'1px solid #3a2c18', borderRadius:4 }}>
              <span style={{ fontSize:13 }}>📼</span><span style={{ ...VT, fontSize:18, color:'#9ab8d4' }}>{vhs}</span>
            </div>
          </div>
        </div>

        {/* TITLE BAND */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 22px', background:'linear-gradient(180deg,#2f2114,#241810)', borderBottom:'1px solid #5a4226', zIndex:3, flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <button onClick={() => executeAction({ type:'goToPage', pageId:'village' })} style={{ cursor:'pointer', display:'flex', alignItems:'center', gap:6, padding:'7px 12px', background:'#46341f', border:'1px solid #6e5430', borderRadius:4, color:'#cf8a5a', fontSize:12 }}>← площадь</button>
            <span style={{ ...DOT, fontSize:26, color:'#e7d8b4', letterSpacing:1 }}>БЮРО КСЕНИИ</span>
            <span style={{ fontSize:12, color:'#a8916a' }}>почта · задания · уведомления</span>
          </div>
        </div>

        {/* BODY */}
        <div style={{ flex:1, display:'flex', gap:14, padding:'14px 18px', minHeight:0 }}>

          {/* COL 1 — КСЕНИЯ */}
          <div style={{ flex:'0 0 210px', display:'flex', flexDirection:'column', gap:12, minHeight:0 }}>
            <div style={{ position:'relative', flex:1, minHeight:0, background:'radial-gradient(ellipse at 50% 40%, #33240f 0%, #15100a 76%)', border:'1px solid #46341f', borderRadius:8, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ position:'absolute', top:10, left:12, ...SILK, fontSize:9, color:'#7a6648', letterSpacing:1, zIndex:2 }}>НАЧАЛЬНИК БЮРО</div>
              <div style={{ position:'absolute', top:10, right:12, display:'flex', alignItems:'center', gap:5, zIndex:2 }}>
                <span style={{ display:'block', width:6, height:6, borderRadius:'50%', background:'#cf8a5a', animation:'bu-blinkdot 2.7s infinite' }} />
                <span style={{ ...MONO, fontSize:9, color:'#cf8a5a' }}>на почте</span>
              </div>
              <div style={{ position:'absolute', bottom:10, left:12, display:'flex', gap:3, opacity:0.4, zIndex:2 }}>
                <span style={{ fontSize:12 }}>📬</span><span style={{ fontSize:12 }}>📬</span>
              </div>
              <div style={{ position:'relative', animation:'bu-bubob 4s ease-in-out infinite', zIndex:1 }}>
                <div style={{ width:180, height:228, border:'2px solid #cf8a5a', borderRadius:10, background:'linear-gradient(135deg,#33240f,#15100a)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 22px rgba(207,138,90,0.22)' }}>
                  <span style={{ fontSize:68 }}>📮</span>
                </div>
              </div>
            </div>
            <div style={{ background:'#1c130b', border:'1px solid #46341f', borderLeft:'3px solid #cf8a5a', borderRadius:8, padding:12, display:'flex', flexDirection:'column', flexShrink:0, minHeight:98 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ ...DOT, fontSize:13, color:'#cf8a5a' }}>Ксения</span>
                <button onClick={() => setKsenyaIdx(i => (i+1) % KSENIA_LINES.length)} style={{ cursor:'pointer', padding:'4px 9px', background:'#46341f', border:'1px solid #6e5430', borderRadius:4, color:'#e0c178', ...DOT, fontSize:10 }}>ещё →</button>
              </div>
              <div style={{ flex:1, display:'flex', alignItems:'center', fontSize:12, fontStyle:'italic', color:'#e6d7bb', lineHeight:1.5, marginTop:6 }}>
                «{KSENIA_LINES[ksenyaIdx % KSENIA_LINES.length]}»
              </div>
            </div>
          </div>

          {/* COL 2 — TABS + MESSAGES */}
          <div style={{ flex:'1 1 0', display:'flex', flexDirection:'column', gap:10, minHeight:0 }}>
            {/* Tabs */}
            <div style={{ display:'flex', gap:6, flexShrink:0 }}>
              {tabDefs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{ cursor:'pointer', flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:7, padding:'8px 0', background: tab === t.id ? '#2f2114' : '#161009', border:`1px solid ${tab === t.id ? '#cf8a5a' : '#3a2c18'}`, borderRadius:6, color: tab === t.id ? '#e7d8b4' : '#8a724a', fontSize:13 }}>
                  {t.label}
                  {t.badge > 0 && (
                    <span style={{ background:'#cf8a5a', borderRadius:9, padding:'1px 7px', ...MONO, fontSize:10, color:'#1a0f08' }}>{t.badge}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div style={{ flex:1, minHeight:0, overflowY:'auto', display:'flex', flexDirection:'column', gap:8, paddingRight:4 }}>
              {tab === 'mail' && MAIL_DATA.map(m => (
                <div key={m.id} style={{ padding:'12px 14px', background:'#161009', border:`1px solid ${unreadMail.includes(m.id) ? m.accent : '#2c2012'}`, borderLeft:`4px solid ${m.accent}`, borderRadius:8, position:'relative' }}>
                  {unreadMail.includes(m.id) && (
                    <span style={{ position:'absolute', top:10, right:12, width:8, height:8, borderRadius:'50%', background:'#cf8a5a', display:'block' }} />
                  )}
                  <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:4 }}>
                    <span style={{ fontSize:16 }}>{m.icon}</span>
                    <span style={{ ...DOT, fontSize:14, color:'#e7d8b4' }}>{m.title}</span>
                    <span style={{ fontSize:11, color:'#6e5e44' }}>от: {m.from}</span>
                  </div>
                  <div style={{ fontSize:12, color:'#b8a888', lineHeight:1.55 }}>{m.body}</div>
                  {(m.reward || m.action) && (
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:8 }}>
                      {m.reward && <span style={{ ...VT, fontSize:16, color:'#e0c178' }}>{m.reward}</span>}
                      {m.action && (
                        <button onClick={() => claimMail(m.id, m.reward)} style={{ cursor:'pointer', padding:'5px 12px', background:'#3a2a12', border:'1px solid #c39b4e', borderRadius:5, color:'#e0c178', ...DOT, fontSize:11 }}>{m.action}</button>
                      )}
                      {!m.action && unreadMail.includes(m.id) && (
                        <button onClick={() => claimMail(m.id)} style={{ cursor:'pointer', padding:'5px 12px', background:'#1c1008', border:'1px solid #3a2c18', borderRadius:5, color:'#a8916a', fontSize:11 }}>отметить прочитанным</button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {tab === 'quests' && QUESTS_DATA.map(q => (
                <div key={q.id} onClick={() => readQuest(q.id)} style={{ cursor:'pointer', padding:'12px 14px', background:'#161009', border:`1px solid ${unreadQuests.includes(q.id) ? q.accent : '#2c2012'}`, borderLeft:`4px solid ${q.accent}`, borderRadius:8, position:'relative' }}>
                  {unreadQuests.includes(q.id) && (
                    <span style={{ position:'absolute', top:10, right:12, width:8, height:8, borderRadius:'50%', background:'#e0c178', display:'block' }} />
                  )}
                  <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:4 }}>
                    <span style={{ fontSize:16 }}>{q.icon}</span>
                    <span style={{ ...DOT, fontSize:14, color:'#e7d8b4' }}>{q.title}</span>
                  </div>
                  <div style={{ fontSize:12, color:'#b8a888', lineHeight:1.55, marginBottom:6 }}>{q.desc}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ ...MONO, fontSize:10, color:'#8a724a' }}>НАГРАДА:</span>
                    <span style={{ ...VT, fontSize:15, color:'#e0c178' }}>{q.reward}</span>
                  </div>
                </div>
              ))}
              {tab === 'notif' && NOTIF_DATA.map(n => (
                <div key={n.id} onClick={() => readNotif(n.id)} style={{ cursor:'pointer', padding:'12px 14px', background:'#161009', border:`1px solid ${unreadNotif.includes(n.id) ? n.accent : '#2c2012'}`, borderLeft:`4px solid ${n.accent}`, borderRadius:8, position:'relative' }}>
                  {unreadNotif.includes(n.id) && (
                    <span style={{ position:'absolute', top:10, right:12, width:8, height:8, borderRadius:'50%', background:n.accent, display:'block' }} />
                  )}
                  <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:4 }}>
                    <span style={{ fontSize:16 }}>{n.icon}</span>
                    <span style={{ ...DOT, fontSize:14, color:'#e7d8b4' }}>{n.title}</span>
                  </div>
                  <div style={{ fontSize:12, color:'#b8a888', lineHeight:1.55 }}>{n.body}</div>
                </div>
              ))}
            </div>
          </div>

          {/* COL 3 — ЭКСПРЕСС-СБОРКА */}
          <div style={{ flex:'0 0 250px', display:'flex', flexDirection:'column', gap:12, minHeight:0 }}>
            <span style={{ ...SILK, fontSize:11, color:'#cf8a5a', letterSpacing:1, flexShrink:0 }}>▷ ЭКСПРЕСС-СБОРКА</span>
            <div style={{ flex:1, minHeight:0, background:'#1a130b', border:'1px solid #46341f', borderRadius:10, padding:14, display:'flex', flexDirection:'column', gap:11, position:'relative', overflow:'hidden' }}>
              {/* pneumatic tube capsule */}
              <div style={{ position:'relative', height:52, background:'#161009', borderRadius:8, border:'1px solid #3a2c18', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:2 }}>
                <div style={{ fontSize:10, color:'#a8916a', ...MONO }}>ПНЕВМОПОЧТА Mk.3</div>
                {tubeVisible && (
                  <div style={{ position:'absolute', left:'50%', transform:'translateX(-50%)', bottom:0, width:34, height:28, background:'linear-gradient(135deg,#3a2a12,#1a1008)', border:'1px solid #c39b4e', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', animation:'bu-tube 1.9s ease-in-out forwards' }}>
                    <span style={{ fontSize:16 }}>📦</span>
                  </div>
                )}
              </div>
              <div style={{ ...MONO, fontSize:10, color:'#8a724a' }}>ВЫБЕРИТЕ БОЕВЫЕ БУСТЫ</div>
              {BUFFS_DEF.map(b => {
                const sel = selectedBufIds.includes(b.id);
                return (
                  <div key={b.id} onClick={() => !delivered && toggleBuff(b.id)} style={{ cursor: delivered ? 'default' : 'pointer', display:'flex', alignItems:'center', gap:9, padding:'8px 10px', background: sel ? '#2a1d10' : '#161009', border:`1px solid ${sel ? '#c39b4e' : '#2c2012'}`, borderRadius:6 }}>
                    <span style={{ fontSize:14 }}>{b.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, color: sel ? '#e7d8b4' : '#a8916a' }}>{b.name}</div>
                      <div style={{ ...VT, fontSize:14, color:'#cdb88a' }}>💰{b.cost}</div>
                    </div>
                    <div style={{ width:14, height:14, borderRadius:3, border:`1.5px solid ${sel ? '#c39b4e' : '#4a3826'}`, background: sel ? '#c39b4e' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#1a0f08' }}>
                      {sel && '✓'}
                    </div>
                  </div>
                );
              })}
              <div style={{ marginTop:'auto', padding:'8px 10px', background:'#161009', border:'1px solid #3a2c18', borderRadius:7 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#8a724a' }}>
                  <span>Бусты: {selectedBufIds.length}</span>
                  <span>+комиссия трубопровода {DELIVERY_FEE}💰</span>
                </div>
                <div style={{ ...VT, fontSize:20, color:'#e0c178', marginTop:4 }}>ИТОГО: 💰{buffTotal}</div>
              </div>
              <button onClick={onDeliver} style={{ cursor: (selectedBufIds.length > 0 && gold >= buffTotal && !delivered) ? 'pointer' : 'default', display:'flex', flexDirection:'column', alignItems:'center', gap:2, padding:11, background: (selectedBufIds.length > 0 && gold >= buffTotal && !delivered) ? 'linear-gradient(180deg,#3a2a12,#2a1d0e)' : '#1c130b', border:`1px solid ${(selectedBufIds.length > 0 && gold >= buffTotal && !delivered) ? '#cf8a5a' : '#2c2012'}`, borderRadius:8, boxShadow:(selectedBufIds.length > 0 && gold >= buffTotal && !delivered) ? '0 0 14px rgba(207,138,90,0.4)' : 'none' }}>
                <span style={{ ...DOT, fontSize:15, color: (selectedBufIds.length > 0 && gold >= buffTotal && !delivered) ? '#ffe9a8' : '#5a4a30' }}>{delivering ? 'ДОСТАВКА…' : (delivered ? '✦ ДОСТАВЛЕНО' : 'ПОЛУЧИТЬ И НАВЕСИТЬ')}</span>
              </button>
              {delivered && (
                <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(26,12,6,0.60)', pointerEvents:'none' }}>
                  <div style={{ padding:'14px 24px', background:'linear-gradient(135deg,#3a2a12,#241810)', border:'3px solid #cf8a5a', borderRadius:10, animation:'bu-stampin 0.5s ease-out forwards' }}>
                    <div style={{ ...DOT, fontSize:28, color:'#cf8a5a', letterSpacing:2, textAlign:'center' }}>ДОСТАВЛЕНО</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
