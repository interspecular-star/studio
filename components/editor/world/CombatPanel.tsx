'use client';

import { useState } from 'react';
import { useStudioStore } from '@/lib/store';
import type { Enemy, Boss, Wave, InstinctDef, ScenarioDef, Difficulty } from '@/lib/types';
import { DIFFICULTY_LABELS } from '@/lib/types';

const ALL_DIFFICULTIES: Difficulty[] = ['novice', 'amateur', 'professional', 'stuntman', 'hollywood', 'super_endless'];

const inputCls = 'w-full text-[10px] px-1.5 py-0.5 bg-[#161310] border border-[var(--studio-border)] rounded';
const labelCls = 'text-[9px] text-[var(--studio-text-muted)] block mb-0.5';
const sectionHeaderCls = 'flex items-center justify-between mb-1.5 cursor-pointer';

// ──────────────────────────────────────────────────────────
//  Enemy Editor
// ──────────────────────────────────────────────────────────
function EnemyEditor({ enemy, items, onUpdate, onDelete }: {
  enemy: Enemy;
  items: any[];
  onUpdate: (u: Partial<Omit<Enemy, 'id'>>) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded border ${open ? 'border-[var(--studio-accent)]' : 'border-[var(--studio-border)]'} bg-[#1C1814]`}>
      <div className="flex items-center justify-between px-2 py-1.5 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <span className="text-[10px] truncate flex-1">{enemy.name.ru || enemy.id}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-[var(--studio-text-muted)]">T{enemy.tier} HP:{enemy.hp} ATK:{enemy.atk}</span>
          <button onClick={e => { e.stopPropagation(); if (confirm(`Удалить «${enemy.name.ru}»?`)) onDelete(); }} className="text-red-400 text-[10px] px-1">✕</button>
        </div>
      </div>
      {open && (
        <div className="border-t border-[var(--studio-border)] px-2 py-2 space-y-2">
          <div className="text-[9px] text-[var(--studio-text-muted)] font-mono">ID: {enemy.id}</div>
          <div className="grid grid-cols-2 gap-1">
            <div><label className={labelCls}>Имя (РУ)</label><input value={enemy.name.ru} onChange={e => onUpdate({ name: { ...enemy.name, ru: e.target.value } })} className={inputCls} /></div>
            <div><label className={labelCls}>Имя (EN)</label><input value={enemy.name.en} onChange={e => onUpdate({ name: { ...enemy.name, en: e.target.value } })} className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-3 gap-1">
            <div>
              <label className={labelCls}>Tier</label>
              <select value={enemy.tier} onChange={e => onUpdate({ tier: Number(e.target.value) as any })} className={inputCls}>
                {[1,2,3,4,5].map(t => <option key={t} value={t}>Tier {t}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>HP</label><input type="number" min={1} value={enemy.hp} onChange={e => onUpdate({ hp: parseInt(e.target.value) || 1 })} className={inputCls} /></div>
            <div><label className={labelCls}>ATK</label><input type="number" min={0} value={enemy.atk} onChange={e => onUpdate({ atk: parseInt(e.target.value) || 0 })} className={inputCls} /></div>
          </div>
          <div>
            <label className={labelCls}>Слабая точка (триггер, РУ)</label>
            <input value={enemy.weakPointTrigger?.ru || ''} onChange={e => onUpdate({ weakPointTrigger: { ru: e.target.value, en: enemy.weakPointTrigger?.en || '' } })} className={inputCls} placeholder="когда активируется слабая точка" />
          </div>
          <div>
            <label className={labelCls}>Реплика Fury Mode (РУ)</label>
            <input value={enemy.furyReply?.ru || ''} onChange={e => onUpdate({ furyReply: { ru: e.target.value, en: enemy.furyReply?.en || '' } })} className={inputCls} placeholder="что кричит в Fury Mode" />
          </div>
          {/* Drops */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelCls + ' mb-0'}>Дроп</label>
              <button
                onClick={() => onUpdate({ drops: [...(enemy.drops || []), { itemId: items[0]?.id || '', chance: 20, amount: 1 }] })}
                className="text-[9px] px-1.5 py-0.5 rounded border border-[var(--studio-border)] hover:border-[var(--studio-accent)] text-[var(--studio-text-muted)] hover:text-[var(--studio-accent)]"
              >+ Дроп</button>
            </div>
            {(enemy.drops || []).map((drop, di) => (
              <div key={di} className="grid grid-cols-[1fr_50px_50px_auto] gap-1 mb-0.5 items-center">
                <select value={drop.itemId} onChange={e => { const d = [...(enemy.drops||[])]; d[di]={...drop, itemId:e.target.value}; onUpdate({drops:d}); }} className={inputCls}>
                  <option value="">— предмет —</option>
                  {items.map((i:any) => <option key={i.id} value={i.id}>{i.name?.ru || i.id}</option>)}
                </select>
                <input type="number" min={1} max={100} value={drop.chance} onChange={e => { const d=[...(enemy.drops||[])]; d[di]={...drop, chance:parseInt(e.target.value)||1}; onUpdate({drops:d}); }} className={inputCls} title="Шанс %" />
                <input type="number" min={1} value={drop.amount} onChange={e => { const d=[...(enemy.drops||[])]; d[di]={...drop, amount:parseInt(e.target.value)||1}; onUpdate({drops:d}); }} className={inputCls} title="Кол-во" />
                <button onClick={() => { const d=(enemy.drops||[]).filter((_,i)=>i!==di); onUpdate({drops:d}); }} className="text-red-400 text-[10px] px-1">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
//  Boss Editor
// ──────────────────────────────────────────────────────────
function BossEditor({ boss, items, onUpdate, onDelete }: {
  boss: Boss;
  items: any[];
  onUpdate: (u: Partial<Omit<Boss, 'id' | 'isBoss'>>) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded border ${open ? 'border-amber-500' : 'border-[var(--studio-border)]'} bg-[#1C1814]`}>
      <div className="flex items-center justify-between px-2 py-1.5 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <span className="text-[10px] truncate flex-1 text-amber-400">{boss.name.ru || boss.id}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-[var(--studio-text-muted)]">T{boss.tier} HP:{boss.hp} BB:{boss.breakBarMax}</span>
          <button onClick={e => { e.stopPropagation(); if (confirm(`Удалить босса «${boss.name.ru}»?`)) onDelete(); }} className="text-red-400 text-[10px] px-1">✕</button>
        </div>
      </div>
      {open && (
        <div className="border-t border-[var(--studio-border)] px-2 py-2 space-y-2">
          <div className="text-[9px] text-[var(--studio-text-muted)] font-mono">ID: {boss.id}</div>
          <div className="grid grid-cols-2 gap-1">
            <div><label className={labelCls}>Имя (РУ)</label><input value={boss.name.ru} onChange={e => onUpdate({ name: { ...boss.name, ru: e.target.value } })} className={inputCls} /></div>
            <div><label className={labelCls}>Имя (EN)</label><input value={boss.name.en} onChange={e => onUpdate({ name: { ...boss.name, en: e.target.value } })} className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-4 gap-1">
            <div><label className={labelCls}>Tier</label><select value={boss.tier} onChange={e => onUpdate({ tier: Number(e.target.value) as any })} className={inputCls}>{[1,2,3,4,5].map(t=><option key={t} value={t}>T{t}</option>)}</select></div>
            <div><label className={labelCls}>HP</label><input type="number" min={1} value={boss.hp} onChange={e => onUpdate({ hp: parseInt(e.target.value)||1 })} className={inputCls} /></div>
            <div><label className={labelCls}>ATK</label><input type="number" min={0} value={boss.atk} onChange={e => onUpdate({ atk: parseInt(e.target.value)||0 })} className={inputCls} /></div>
            <div><label className={labelCls}>Break Bar</label><input type="number" min={1} value={boss.breakBarMax} onChange={e => onUpdate({ breakBarMax: parseInt(e.target.value)||100 })} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>Слабая точка (триггер, РУ)</label><input value={boss.weakPointTrigger?.ru||''} onChange={e => onUpdate({ weakPointTrigger: { ru: e.target.value, en: boss.weakPointTrigger?.en||'' } })} className={inputCls} /></div>
          <div><label className={labelCls}>Fury — уникальная способность (РУ)</label><textarea rows={2} value={boss.furyAbility?.ru||''} onChange={e => onUpdate({ furyAbility: { ru: e.target.value, en: boss.furyAbility?.en||'' } })} className={inputCls + ' resize-none'} /></div>
          <div><label className={labelCls}>Щит-механика Фаза 2 (РУ)</label><textarea rows={2} value={boss.shieldMechanic?.ru||''} onChange={e => onUpdate({ shieldMechanic: { ru: e.target.value, en: boss.shieldMechanic?.en||'' } })} className={inputCls + ' resize-none'} /></div>
          {/* Phases */}
          <div>
            <label className={labelCls + ' font-medium'}>Фазы</label>
            {(boss.phases||[]).map((ph, pi) => (
              <div key={pi} className="mb-1 flex gap-1 items-start">
                <div className="text-[9px] text-amber-400 font-mono mt-1 w-7 shrink-0">&lt;{ph.hpThreshold}%</div>
                <input value={ph.mechanic?.ru||''} onChange={e => { const p=[...(boss.phases||[])]; p[pi]={...ph, mechanic:{ru:e.target.value,en:ph.mechanic?.en||''}}; onUpdate({phases:p}); }} placeholder="механика фазы (РУ)" className={inputCls + ' flex-1'} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
//  Wave Editor
// ──────────────────────────────────────────────────────────
function WaveEditor({ wave, enemies, bosses, onUpdate, onDelete }: {
  wave: Wave;
  enemies: Enemy[];
  bosses: Boss[];
  onUpdate: (u: Partial<Omit<Wave, 'id'>>) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded border ${open ? 'border-[var(--studio-accent)]' : 'border-[var(--studio-border)]'} bg-[#1C1814]`}>
      <div className="flex items-center justify-between px-2 py-1.5 cursor-pointer" onClick={() => setOpen(o=>!o)}>
        <span className="text-[10px] truncate flex-1">{wave.name.ru || wave.id}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-[var(--studio-text-muted)]">{wave.enemyPool.length} мобов</span>
          <button onClick={e => { e.stopPropagation(); if (confirm(`Удалить волну «${wave.name.ru}»?`)) onDelete(); }} className="text-red-400 text-[10px] px-1">✕</button>
        </div>
      </div>
      {open && (
        <div className="border-t border-[var(--studio-border)] px-2 py-2 space-y-2">
          <div className="text-[9px] text-[var(--studio-text-muted)] font-mono">ID: {wave.id}</div>
          <div className="grid grid-cols-2 gap-1">
            <div><label className={labelCls}>Название (РУ)</label><input value={wave.name.ru} onChange={e => onUpdate({ name: { ...wave.name, ru: e.target.value } })} className={inputCls} /></div>
            <div><label className={labelCls}>Название (EN)</label><input value={wave.name.en} onChange={e => onUpdate({ name: { ...wave.name, en: e.target.value } })} className={inputCls} /></div>
          </div>
          {/* Difficulty checkboxes */}
          <div>
            <label className={labelCls}>Сложности</label>
            <div className="flex flex-wrap gap-1">
              {ALL_DIFFICULTIES.map(d => (
                <label key={d} className="flex items-center gap-0.5 text-[9px] cursor-pointer">
                  <input type="checkbox" checked={wave.difficulties.includes(d)} onChange={e => {
                    const diff = e.target.checked ? [...wave.difficulties, d] : wave.difficulties.filter(x => x !== d);
                    onUpdate({ difficulties: diff });
                  }} className="accent-[var(--studio-accent)]" />
                  {DIFFICULTY_LABELS[d]}
                </label>
              ))}
            </div>
          </div>
          {/* Enemy Pool */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelCls + ' mb-0'}>Пул врагов</label>
              <button
                onClick={() => { if (enemies.length === 0) return; onUpdate({ enemyPool: [...wave.enemyPool, { enemyId: enemies[0].id, weight: 1 }] }); }}
                className="text-[9px] px-1.5 py-0.5 rounded border border-[var(--studio-border)] hover:border-[var(--studio-accent)] text-[var(--studio-text-muted)] hover:text-[var(--studio-accent)]"
              >+ Враг</button>
            </div>
            {enemies.length === 0 && <p className="text-[9px] text-[var(--studio-text-muted)] italic">Нет врагов. Создай в секции ВРАГИ.</p>}
            {wave.enemyPool.map((entry, ei) => (
              <div key={ei} className="grid grid-cols-[1fr_50px_auto] gap-1 mb-0.5 items-center">
                <select value={entry.enemyId} onChange={e => { const p=[...wave.enemyPool]; p[ei]={...entry,enemyId:e.target.value}; onUpdate({enemyPool:p}); }} className={inputCls}>
                  {enemies.map(en => <option key={en.id} value={en.id}>{en.name.ru} (T{en.tier})</option>)}
                </select>
                <input type="number" min={1} value={entry.weight} onChange={e => { const p=[...wave.enemyPool]; p[ei]={...entry,weight:parseInt(e.target.value)||1}; onUpdate({enemyPool:p}); }} className={inputCls} title="Вес в пуле" />
                <button onClick={() => { const p=wave.enemyPool.filter((_,i)=>i!==ei); onUpdate({enemyPool:p}); }} className="text-red-400 text-[10px] px-1">✕</button>
              </div>
            ))}
          </div>
          {/* Boss */}
          <div>
            <label className={labelCls}>Босс волны</label>
            <select value={wave.bossId||''} onChange={e => onUpdate({ bossId: e.target.value || undefined })} className={inputCls}>
              <option value="">— без босса —</option>
              {bosses.map(b => <option key={b.id} value={b.id}>{b.name.ru}</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
//  Main CombatPanel
// ──────────────────────────────────────────────────────────
export default function CombatPanel() {
  const {
    enemies, bosses, waves, instincts, scenarios, items,
    addEnemy, updateEnemy, deleteEnemy,
    addBoss, updateBoss, deleteBoss,
    addWave, updateWave, deleteWave,
    updateInstinct, resetInstinctsToDefault,
    updateScenario, resetScenariosToDefault,
  } = useStudioStore();

  const [enemiesOpen, setEnemiesOpen] = useState(true);
  const [bossesOpen, setBossesOpen] = useState(false);
  const [wavesOpen, setWavesOpen] = useState(false);
  const [instinctsOpen, setInstinctsOpen] = useState(false);
  const [scenariosOpen, setScenariosOpen] = useState(false);
  const [editingInstinctId, setEditingInstinctId] = useState<string | null>(null);
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null);

  return (
    <div className="space-y-4 p-4">

      {/* === ВРАГИ === */}
      <div className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] p-3">
        <div className={sectionHeaderCls} onClick={() => setEnemiesOpen(o=>!o)}>
          <span className="text-sm font-medium text-[var(--studio-text-secondary)] flex items-center gap-2">
            ВРАГИ
            {enemies.length > 0 && <span className="text-[10px] rounded-full bg-[var(--studio-accent)] text-[#1C1814] px-1.5 py-0.5 leading-none font-bold">{enemies.length}</span>}
          </span>
          <span className="text-xs">{enemiesOpen ? '▼' : '▶'}</span>
        </div>
        {enemiesOpen && (
          <div className="space-y-1.5 mt-2">
            {enemies.length === 0 && <p className="text-[11px] text-[var(--studio-text-muted)] italic">Нет врагов. Создай первого моба.</p>}
            {(enemies as Enemy[]).map(e => (
              <EnemyEditor key={e.id} enemy={e} items={items} onUpdate={u => updateEnemy(e.id, u)} onDelete={() => deleteEnemy(e.id)} />
            ))}
            <button
              onClick={() => {
                const nameRu = prompt('Имя врага (РУ):', 'Новый враг');
                if (!nameRu) return;
                const nameEn = prompt('Имя врага (EN):', nameRu) || nameRu;
                addEnemy({ name: { ru: nameRu, en: nameEn }, tier: 1, hp: 100, atk: 10 });
              }}
              className="w-full text-xs px-2 py-1.5 border border-dashed border-[var(--studio-border)] rounded hover:border-[var(--studio-accent)] text-[var(--studio-text-muted)] hover:text-[var(--studio-accent)] transition-colors"
            >+ Новый враг</button>
          </div>
        )}
      </div>

      {/* === БОССЫ === */}
      <div className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] p-3">
        <div className={sectionHeaderCls} onClick={() => setBossesOpen(o=>!o)}>
          <span className="text-sm font-medium text-amber-400 flex items-center gap-2">
            БОССЫ
            {bosses.length > 0 && <span className="text-[10px] rounded-full bg-amber-500 text-[#1C1814] px-1.5 py-0.5 leading-none font-bold">{bosses.length}</span>}
          </span>
          <span className="text-xs">{bossesOpen ? '▼' : '▶'}</span>
        </div>
        {bossesOpen && (
          <div className="space-y-1.5 mt-2">
            {bosses.length === 0 && <p className="text-[11px] text-[var(--studio-text-muted)] italic">Нет боссов. Создай первого.</p>}
            {(bosses as Boss[]).map(b => (
              <BossEditor key={b.id} boss={b} items={items} onUpdate={u => updateBoss(b.id, u)} onDelete={() => deleteBoss(b.id)} />
            ))}
            <button
              onClick={() => {
                const nameRu = prompt('Имя босса (РУ):', 'Новый босс');
                if (!nameRu) return;
                const nameEn = prompt('Имя босса (EN):', nameRu) || nameRu;
                addBoss({ name: { ru: nameRu, en: nameEn }, tier: 3, hp: 1000, atk: 50, breakBarMax: 100, phases: [{ hpThreshold: 60, mechanic: { ru: '', en: '' } }, { hpThreshold: 30, mechanic: { ru: '', en: '' } }], furyAbility: { ru: '', en: '' } });
              }}
              className="w-full text-xs px-2 py-1.5 border border-dashed border-amber-800 rounded hover:border-amber-500 text-[var(--studio-text-muted)] hover:text-amber-400 transition-colors"
            >+ Новый босс</button>
          </div>
        )}
      </div>

      {/* === ВОЛНЫ === */}
      <div className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] p-3">
        <div className={sectionHeaderCls} onClick={() => setWavesOpen(o=>!o)}>
          <span className="text-sm font-medium text-[var(--studio-text-secondary)] flex items-center gap-2">
            ВОЛНЫ
            {waves.length > 0 && <span className="text-[10px] rounded-full bg-[var(--studio-accent)] text-[#1C1814] px-1.5 py-0.5 leading-none font-bold">{waves.length}</span>}
          </span>
          <span className="text-xs">{wavesOpen ? '▼' : '▶'}</span>
        </div>
        {wavesOpen && (
          <div className="space-y-1.5 mt-2">
            {waves.length === 0 && <p className="text-[11px] text-[var(--studio-text-muted)] italic">Нет волн. Создай первую волну.</p>}
            {(waves as Wave[]).map(w => (
              <WaveEditor key={w.id} wave={w} enemies={enemies as Enemy[]} bosses={bosses as Boss[]} onUpdate={u => updateWave(w.id, u)} onDelete={() => deleteWave(w.id)} />
            ))}
            <button
              onClick={() => {
                const nameRu = prompt('Название волны (РУ):', 'Волна 1');
                if (!nameRu) return;
                const nameEn = prompt('Название волны (EN):', nameRu) || nameRu;
                addWave({ name: { ru: nameRu, en: nameEn }, enemyPool: [], difficulties: ['novice'] });
              }}
              className="w-full text-xs px-2 py-1.5 border border-dashed border-[var(--studio-border)] rounded hover:border-[var(--studio-accent)] text-[var(--studio-text-muted)] hover:text-[var(--studio-accent)] transition-colors"
            >+ Новая волна</button>
          </div>
        )}
      </div>

      {/* === ИНСТИНКТЫ === */}
      <div className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] p-3">
        <div className={sectionHeaderCls} onClick={() => setInstinctsOpen(o=>!o)}>
          <span className="text-sm font-medium text-[var(--studio-text-secondary)]">ИНСТИНКТЫ ({instincts.length})</span>
          <span className="text-xs">{instinctsOpen ? '▼' : '▶'}</span>
        </div>
        {instinctsOpen && (
          <div className="space-y-1.5 mt-2">
            <p className="text-[10px] text-[var(--studio-text-muted)] italic mb-2">Пассивные черты игрока. Предзаданы из CDD, можно редактировать.</p>
            {(instincts as InstinctDef[]).map(inst => {
              const isEd = editingInstinctId === inst.id;
              return (
                <div key={inst.id} className={`rounded border p-1.5 ${isEd ? 'border-[var(--studio-accent)]' : 'border-[var(--studio-border)]'} bg-[#1C1814]`}>
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => setEditingInstinctId(isEd ? null : inst.id)}>
                    <span className="text-[10px] font-medium">{inst.name.ru}</span>
                    <span className="text-[9px] text-[var(--studio-text-muted)]">Лвл {inst.unlockLevel}</span>
                  </div>
                  {isEd && (
                    <div className="mt-1 space-y-1 border-t border-[var(--studio-border)] pt-1.5">
                      <div className="grid grid-cols-2 gap-1">
                        <div><label className={labelCls}>Название (РУ)</label><input value={inst.name.ru} onChange={e => updateInstinct(inst.id, { name: { ...inst.name, ru: e.target.value } })} className={inputCls} /></div>
                        <div><label className={labelCls}>Название (EN)</label><input value={inst.name.en} onChange={e => updateInstinct(inst.id, { name: { ...inst.name, en: e.target.value } })} className={inputCls} /></div>
                      </div>
                      <div><label className={labelCls}>Описание (РУ)</label><textarea rows={2} value={inst.description.ru} onChange={e => updateInstinct(inst.id, { description: { ...inst.description, ru: e.target.value } })} className={inputCls + ' resize-none'} /></div>
                      <div>
                        <label className={labelCls}>Уровень открытия</label>
                        <input type="number" min={1} value={inst.unlockLevel} onChange={e => updateInstinct(inst.id, { unlockLevel: parseInt(e.target.value)||1 })} className={inputCls} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <button onClick={() => { if (confirm('Сбросить все инстинкты к значениям по умолчанию из CDD?')) { resetInstinctsToDefault(); setEditingInstinctId(null); } }} className="w-full text-[10px] px-2 py-1 border border-dashed border-[var(--studio-border)] rounded text-[var(--studio-text-muted)] hover:text-[var(--studio-accent)] hover:border-[var(--studio-accent)] transition-colors">
              Сбросить к дефолтам
            </button>
          </div>
        )}
      </div>

      {/* === СЦЕНАРИИ ВИКИ === */}
      <div className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] p-3">
        <div className={sectionHeaderCls} onClick={() => setScenariosOpen(o=>!o)}>
          <span className="text-sm font-medium text-[var(--studio-text-secondary)]">СЦЕНАРИИ ВИКИ ({scenarios.length})</span>
          <span className="text-xs">{scenariosOpen ? '▼' : '▶'}</span>
        </div>
        {scenariosOpen && (
          <div className="space-y-1.5 mt-2">
            <p className="text-[10px] text-[var(--studio-text-muted)] italic mb-2">Условия к волнам от режиссёра Вики. Можно редактировать.</p>
            {(scenarios as ScenarioDef[]).map(sc => {
              const isEd = editingScenarioId === sc.id;
              return (
                <div key={sc.id} className={`rounded border p-1.5 ${isEd ? 'border-[var(--studio-accent)]' : 'border-[var(--studio-border)]'} bg-[#1C1814]`}>
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => setEditingScenarioId(isEd ? null : sc.id)}>
                    <span className="text-[10px] font-medium">{sc.name.ru}</span>
                    <span className="text-[9px] text-[var(--studio-accent)] truncate max-w-[120px]">{sc.reward.ru}</span>
                  </div>
                  {isEd && (
                    <div className="mt-1 space-y-1 border-t border-[var(--studio-border)] pt-1.5">
                      <div className="grid grid-cols-2 gap-1">
                        <div><label className={labelCls}>Название (РУ)</label><input value={sc.name.ru} onChange={e => updateScenario(sc.id, { name: { ...sc.name, ru: e.target.value } })} className={inputCls} /></div>
                        <div><label className={labelCls}>Название (EN)</label><input value={sc.name.en} onChange={e => updateScenario(sc.id, { name: { ...sc.name, en: e.target.value } })} className={inputCls} /></div>
                      </div>
                      <div><label className={labelCls}>Условие (РУ)</label><textarea rows={2} value={sc.condition.ru} onChange={e => updateScenario(sc.id, { condition: { ...sc.condition, ru: e.target.value } })} className={inputCls + ' resize-none'} /></div>
                      <div><label className={labelCls}>Награда (РУ)</label><input value={sc.reward.ru} onChange={e => updateScenario(sc.id, { reward: { ...sc.reward, ru: e.target.value } })} className={inputCls} /></div>
                      <div>
                        <label className={labelCls}>Доступно на сложностях</label>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {ALL_DIFFICULTIES.map(d => (
                            <label key={d} className="flex items-center gap-0.5 text-[9px] cursor-pointer">
                              <input type="checkbox" checked={sc.availableDifficulties.includes(d)} onChange={e => {
                                const diff = e.target.checked ? [...sc.availableDifficulties, d] : sc.availableDifficulties.filter(x => x !== d);
                                updateScenario(sc.id, { availableDifficulties: diff });
                              }} className="accent-[var(--studio-accent)]" />
                              {DIFFICULTY_LABELS[d]}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <button onClick={() => { if (confirm('Сбросить все сценарии к значениям по умолчанию из CDD?')) { resetScenariosToDefault(); setEditingScenarioId(null); } }} className="w-full text-[10px] px-2 py-1 border border-dashed border-[var(--studio-border)] rounded text-[var(--studio-text-muted)] hover:text-[var(--studio-accent)] hover:border-[var(--studio-accent)] transition-colors">
              Сбросить к дефолтам
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
