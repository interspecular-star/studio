'use client';

import { useState } from 'react';
import {
  useStudioStore,
  type EquipmentSlot,
  type Item,
  type ItemRarity,
  EquipmentSlotLabels,
  RarityFilterOrder,
  RarityFilterLabels,
  RarityColors,
  getEffectivePlayerStat,
  getAllEquippedItemIds,
  getTotalDamage,
} from '@/lib/store';
import InventoryMannequin from './InventoryMannequin';
import GameHUD from '../game/GameHUD';
import { toast } from 'sonner';

// ── Wood & Brass font styles ─────────────────────────────────────────────────
const VT:   React.CSSProperties = { fontFamily: 'var(--font-vt, VT323, monospace)',        lineHeight: 1 };
const SILK: React.CSSProperties = { fontFamily: 'var(--font-silk, Silkscreen, monospace)', letterSpacing: '0.5px' };
const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono, Space Mono, monospace)' };
const DOT:  React.CSSProperties = { fontFamily: 'var(--font-dot, DotGothic16, sans-serif)' };

const LCD: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '5px 11px',
  background: '#161009', border: '1px solid #3a2c18', borderRadius: 4,
};

const WOOD_BG =
  'repeating-linear-gradient(92deg, rgba(0,0,0,0.10) 0px, rgba(0,0,0,0.10) 1px, transparent 1px, transparent 9px),' +
  'repeating-linear-gradient(92deg, rgba(140,104,58,0.05) 3px, transparent 4px, transparent 16px)';

interface InventoryModalProps { onClose: () => void; }

export default function InventoryModal({ onClose }: InventoryModalProps) {
  const {
    closeInventory, playtestState,
    getPlayerInventory, equipItem, unequipItem, dropItem,
    items, variables,
  } = useStudioStore();

  const handleClose = () => { closeInventory(); onClose?.(); };
  const playerInventory = getPlayerInventory();

  // ── Confirmation modal ───────────────────────────────────────────────────
  type PendingConfirmation =
    | { kind: 'replace';    newItem: Item; targetSlot: EquipmentSlot; currentItem: Item; message: string }
    | { kind: 'twoHanded';  newItem: Item; displaced: Item[];          message: string }
    | { kind: 'chooseHand'; newItem: Item;                             message: string };

  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const [pendingDrop,   setPendingDrop]   = useState<{ item: Item; maxQuantity: number } | null>(null);
  const [dropAmount,    setDropAmount]    = useState(1);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [selId,         setSelId]         = useState<string | null>(null);
  const [filterRarity,  setFilterRarity]  = useState<'all' | ItemRarity>('all');

  // ── Backpack ─────────────────────────────────────────────────────────────
  const backpackItems = playerInventory.map(({ item, quantity }) => {
    const eq = Object.values(playtestState.equippedSlots || {}).filter(id => id === item.id).length;
    return { item, quantity: Math.max(0, quantity - eq) };
  }).filter(({ quantity }) => quantity > 0);

  const filteredItems = backpackItems.filter(({ item }) =>
    filterRarity === 'all' || item.rarity === filterRarity
  );

  // ── Selected item ────────────────────────────────────────────────────────
  const selEntry = selId ? backpackItems.find(({ item }) => item.id === selId) ?? null : null;
  const selItem  = selEntry?.item ?? null;
  const selQty   = selEntry?.quantity ?? 0;

  // ── Stats ────────────────────────────────────────────────────────────────
  const getStat = (key: string) => {
    try { return Math.round(getEffectivePlayerStat(key, variables, items, playtestState) || 0); } catch { return 0; }
  };
  const statDmg  = (() => { try { return Math.round(getTotalDamage(variables, items, playtestState)); } catch { return 0; } })();

  // ── Weight & gold ────────────────────────────────────────────────────────
  let weightMax = 60;
  try { weightMax = Math.max(60, Math.floor(getEffectivePlayerStat('endurance', variables, items, playtestState) || 60)); } catch {}
  const weightCur = backpackItems.length;
  const goldVar = variables.find(v => ['gold', 'Gold', 'Золото'].includes(v.name));
  const goldVal = goldVar ? (playtestState.variableValues?.[goldVar.id] ?? goldVar.defaultValue ?? 0) : 0;

  // ── Slot helpers ─────────────────────────────────────────────────────────
  const isSlotOccupied      = (slot: EquipmentSlot) => !!playtestState.equippedSlots?.[slot];
  const getEquippedInSlot   = (slot: EquipmentSlot) => {
    const id = playtestState.equippedSlots?.[slot];
    return id ? items.find(i => i.id === id) ?? null : null;
  };
  const getDisplacedTwoHand = () =>
    [getEquippedInSlot('weapon_right'), getEquippedInSlot('weapon_left')].filter(Boolean) as Item[];

  const computeEquipMessage = (newItem: Item, slots: EquipmentSlot[], remove: Item[]): string => {
    const sim: Partial<Record<EquipmentSlot, string>> = { ...(playtestState.equippedSlots || {}) };
    remove.forEach(it => { Object.keys(sim).forEach(k => { if (sim[k as EquipmentSlot] === it.id) delete sim[k as EquipmentSlot]; }); });
    slots.forEach(slot => { sim[slot] = newItem.id; });
    const simState = { ...playtestState, equippedSlots: sim };
    const lines: string[] = [];
    [['strength','Сила'],['defense','Защита'],['agility','Ловкость'],['magic_power','Магия']].forEach(([key, label]) => {
      try {
        const b = getEffectivePlayerStat(key, variables, items, playtestState);
        const a = getEffectivePlayerStat(key, variables, items, simState as any);
        const d = a - b;
        if (Math.abs(d) > 0.0005) lines.push(`${label}: ${b} → ${a} (${d > 0 ? '+' : ''}${d})`);
      } catch {}
    });
    try {
      const db = Math.round(getTotalDamage(variables, items, playtestState));
      const da = Math.round(getTotalDamage(variables, items, simState as any));
      if (Math.abs(da - db) > 0) lines.push(`Урон: ${db} → ${da} (${da - db > 0 ? '+' : ''}${da - db})`);
    } catch {}
    const header = remove.length
      ? `Будет снято: ${remove.map(i => i.name.ru).join(' + ')}\n\nОдеть «${newItem.name.ru}»?`
      : `Одеть «${newItem.name.ru}»?`;
    return header + (lines.length ? '\n\n' + lines.join('\n') : '\n\nХарактеристики не изменятся.') + '\n\nПродолжить?';
  };

  const handleEquipItem = (itemId: string, preferredSlot?: EquipmentSlot) => {
    const item = items.find(i => i.id === itemId);
    if (!item?.isEquippable || !item.slot) { toast.error('Нельзя экипировать'); return; }

    if (item.slot === 'one_handed_weapon') {
      const rf = !isSlotOccupied('weapon_right'), lf = !isSlotOccupied('weapon_left');
      if (!rf && !lf) { toast.error('Обе руки заняты'); return; }
      let hand: EquipmentSlot | null = null;
      if (preferredSlot === 'weapon_right' || preferredSlot === 'weapon_left') {
        if (!isSlotOccupied(preferredSlot)) { hand = preferredSlot; }
        else { const cur = getEquippedInSlot(preferredSlot)!; setPendingConfirmation({ kind: 'replace', newItem: item, targetSlot: preferredSlot, currentItem: cur, message: computeEquipMessage(item, [preferredSlot], [cur]) }); return; }
      }
      if (!hand) {
        if (rf && lf) { setPendingConfirmation({ kind: 'chooseHand', newItem: item, message: `В какую руку одеть «${item.name.ru}»?` }); return; }
        hand = rf ? 'weapon_right' : 'weapon_left';
      }
      equipItem(itemId, hand); toast.success(`${item.name.ru} экипирован`); return;
    }
    if (item.slot === 'two_handed_weapon') {
      const disp = getDisplacedTwoHand();
      if (disp.length) { setPendingConfirmation({ kind: 'twoHanded', newItem: item, displaced: disp, message: computeEquipMessage(item, ['weapon_right', 'weapon_left'], disp) }); return; }
      equipItem(itemId, 'weapon_right'); equipItem(itemId, 'weapon_left'); toast.success(`${item.name.ru} экипировано`); return;
    }
    if (item.slot === 'shield') {
      if (isSlotOccupied('weapon_left')) { toast.warning('Левая рука занята'); return; }
      equipItem(itemId, 'weapon_left'); toast.success(`${item.name.ru} экипирован`); return;
    }
    if (isSlotOccupied(item.slot)) {
      const cur = getEquippedInSlot(item.slot)!;
      setPendingConfirmation({ kind: 'replace', newItem: item, targetSlot: item.slot, currentItem: cur, message: computeEquipMessage(item, [item.slot], [cur]) }); return;
    }
    equipItem(itemId, item.slot); toast.success(`${item.name.ru} экипирован`);
  };

  const handleUnequipFromSlot = (slot: EquipmentSlot) => {
    const id = playtestState.equippedSlots?.[slot];
    if (id) { const it = items.find(i => i.id === id); unequipItem(id); if (it) toast.info(`${it.name.ru} снят`); }
  };

  const handleDropOnMannequin = (itemId: string, targetSlot: EquipmentSlot) => {
    const item = items.find(i => i.id === itemId);
    if (!item?.isEquippable) { toast.error('Нельзя экипировать'); setDraggedItemId(null); return; }
    handleEquipItem(itemId, targetSlot);
    setDraggedItemId(null);
  };

  const unequipDropHandlers = {
    onDragOver: (e: React.DragEvent) => { if (draggedItemId) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      const id = e.dataTransfer.getData('text/plain');
      if (id) { const it = items.find(i => i.id === id); unequipItem(id); if (it) toast.info(`${it.name.ru} снят`); }
      setDraggedItemId(null);
    },
  };

  const renderIcon = (icon: string | undefined, size = 23): React.ReactNode => {
    if (!icon) return <span style={{ fontSize: size, opacity: 0.3 }}>?</span>;
    if (icon.startsWith('http') || icon.startsWith('/'))
      return <img src={icon} alt="" style={{ width: size, height: size, objectFit: 'contain' }} />;
    return <span style={{ fontSize: size }}>{icon}</span>;
  };

  const rc = (r: string) => RarityColors[r as ItemRarity] || '#8a724a';

  // Rarity filter order — exclude 'all' from the store's list (we prepend it manually)
  const rarityOptions = RarityFilterOrder.filter((r): r is ItemRarity => r !== 'all');

  return (
    <div
      className="absolute inset-0 z-[100] flex flex-col overflow-hidden"
      style={{ background: '#241810', backgroundImage: WOOD_BG, color: '#ecdcc0' }}
    >
      <GameHUD />
      {/* ── TITLE BAND ────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 22px', flexShrink: 0,
        background: 'linear-gradient(180deg, #2f2114, #241810)',
        borderBottom: '1px solid #5a4226',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={handleClose}
            style={{ ...MONO, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#46341f', border: '1px solid #6e5430', borderRadius: 4, color: '#c39b4e', fontSize: 12, cursor: 'pointer' }}
          >← площадь</button>
          <span style={{ ...DOT, fontSize: 28, color: '#e7d8b4', letterSpacing: 1 }}>ИНВЕНТАРЬ</span>
          <span style={{ fontSize: 12, color: '#a8916a' }}>сумка Слэя · хлам, добытый кровью и иронией</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={LCD}>
            <span style={{ ...MONO, fontSize: 10, color: '#a8916a' }}>ВЕС</span>
            <span style={{ ...VT, fontSize: 17, color: '#e0c178' }}>{weightCur}/{weightMax}</span>
          </div>
          <div style={LCD}>
            <span style={{ fontSize: 14 }}>💰</span>
            <span style={{ ...VT, fontSize: 17, color: '#e0c178' }}>{String(goldVal)}</span>
          </div>
        </div>
      </div>

      {/* ── BODY ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', gap: 16, padding: '16px 22px', minHeight: 0, overflow: 'hidden' }}>

        {/* LEFT — mannequin + stats */}
        <div style={{ flex: '0 0 320px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
          <div style={{ ...SILK, fontSize: 11, color: '#c39b4e' }}>▷ СНАРЯЖЕНИЕ</div>

          <div style={{
            flex: 1, minHeight: 0, overflowY: 'auto',
            background: '#161009', border: '1px solid #3a2c18', borderRadius: 7,
            boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)', padding: 12,
          }}>
            <InventoryMannequin
              equippedItemIds={getAllEquippedItemIds(playtestState)}
              onUnequipFromSlot={handleUnequipFromSlot}
              onSlotClick={() => {}}
              draggedItemId={draggedItemId}
              onDropItem={handleDropOnMannequin}
              onDragStartItem={setDraggedItemId}
              onDragEndItem={() => setDraggedItemId(null)}
            />
          </div>

          {/* Stats grid */}
          <div style={{ background: '#1c130b', border: '1px solid #3a2c18', borderRadius: 6, padding: '11px 14px', flexShrink: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '7px 14px' }}>
              {[
                { label: 'Урон',   val: statDmg,          color: '#d98a6a' },
                { label: 'Защита', val: getStat('defense'), color: '#7faf6a' },
                { label: 'Магия',  val: getStat('magic_power'), color: '#6f8fb0' },
                { label: 'Уворот', val: getStat('agility'), color: '#e0c178' },
                { label: 'Удача',  val: getStat('luck'),   color: '#b48fc4' },
                { label: 'Сила',   val: getStat('strength'), color: '#c39b4e' },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 12, color: '#a8916a' }}>{label}</span>
                  <span style={{ ...VT, fontSize: 17, color }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — bag */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 11, minHeight: 0 }}>

          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ ...SILK, fontSize: 11, color: '#c39b4e' }}>▷ СУМКА</span>
            <span style={{ ...MONO, fontSize: 10, color: '#8a724a' }}>
              {filteredItems.length} предм. · вес {weightCur}/{weightMax}
            </span>
          </div>

          {/* Rarity filter pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flexShrink: 0 }}>
            {/* All */}
            {[{ key: 'all', label: 'Все', color: '#c39b4e' },
              ...rarityOptions.map(r => ({ key: r, label: RarityFilterLabels[r] || String(r), color: rc(r) })),
            ].map(({ key, label, color }) => {
              const active = filterRarity === key;
              return (
                <button
                  key={key}
                  onClick={() => setFilterRarity(key as 'all' | ItemRarity)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 11px', borderRadius: 14,
                    border: `1px solid ${active ? color : '#3a2c18'}`,
                    background: active ? color : '#1c130b',
                    cursor: 'pointer',
                    boxShadow: active && key === 'overpowered' ? `0 0 12px ${color}88` : 'none',
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: active ? '#1a120b' : '#cdb88a' }}>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Item grid */}
          <div
            style={{
              flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden',
              background: '#161009', border: '1px solid #3a2c18', borderRadius: 7,
              boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)', padding: 12,
            }}
            {...unequipDropHandlers}
          >
            {filteredItems.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#6e5e44', fontStyle: 'italic', fontSize: 13 }}>
                Слэй смотрит в пустую сумку с лёгким презрением.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 8 }}>
                {filteredItems.map(({ item, quantity }) => {
                  const isSel   = item.id === selId;
                  const col     = rc(item.rarity);
                  const isHigh  = item.rarity === 'overpowered' || item.rarity === 'mythic';
                  return (
                    <div
                      key={item.id}
                      draggable={!!(item.isEquippable && item.slot)}
                      onDragStart={e => { e.dataTransfer.setData('text/plain', item.id); setDraggedItemId(item.id); }}
                      onDragEnd={() => setDraggedItemId(null)}
                      onClick={() => setSelId(isSel ? null : item.id)}
                      title={`${item.name.ru} · ${RarityFilterLabels[item.rarity] || item.rarity}`}
                      style={{
                        aspectRatio: '1', borderRadius: 6, cursor: 'pointer',
                        border: `1.5px solid ${isSel ? '#f2e6c6' : col}`,
                        background: item.rarity === 'overpowered' ? '#2a2113' : '#231711',
                        boxShadow: isSel
                          ? '0 0 0 2px #e0c178, 0 0 12px rgba(224,193,120,0.5)'
                          : isHigh ? `0 0 9px ${col}55` : 'inset 0 2px 5px rgba(0,0,0,0.4)',
                        position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: draggedItemId === item.id ? 0.5 : 1,
                        transition: 'border-color 0.15s',
                      }}
                    >
                      {renderIcon(item.icon, 23)}
                      {quantity > 1 && (
                        <span style={{
                          position: 'absolute', right: 3, bottom: 1,
                          ...VT, fontSize: 14, color: '#ecdcc0', textShadow: '0 1px 2px #000',
                        }}>{quantity}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detail panel */}
          <div style={{
            background: '#1c130b', border: '1px solid #46341f', borderRadius: 7,
            padding: '13px 14px', minHeight: 108, flexShrink: 0,
          }}>
            {selItem ? (
              <div style={{ display: 'flex', gap: 14 }}>
                {/* Icon */}
                <div style={{
                  flexShrink: 0, width: 62, height: 62, borderRadius: 7,
                  border: `2px solid ${rc(selItem.rarity)}`, background: '#161009',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 14px ${rc(selItem.rarity)}55`,
                }}>
                  {renderIcon(selItem.icon, 30)}
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, flexWrap: 'wrap' }}>
                    <span style={{ ...DOT, fontSize: 17, color: rc(selItem.rarity) }}>{selItem.name.ru}</span>
                    <span style={{ ...MONO, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.5px', color: rc(selItem.rarity) }}>
                      {RarityFilterLabels[selItem.rarity] || selItem.rarity}
                    </span>
                    {selItem.slot && (
                      <span style={{ fontSize: 10, color: '#6e5e44' }}>
                        · {EquipmentSlotLabels[selItem.slot] || selItem.slot}
                      </span>
                    )}
                  </div>
                  <div style={{ ...VT, fontSize: 17, color: '#cdb88a', marginTop: 3 }}>
                    {[
                      selItem.weaponDamage ? `Урон +${selItem.weaponDamage}` : '',
                      ...(selItem.modifiers || []).map(m => {
                        const v = variables.find(v2 => v2.id === m.statId);
                        return `${v?.displayName?.ru || v?.name || m.statId} +${m.value}`;
                      }),
                    ].filter(Boolean).join(' · ')}
                  </div>
                  {selItem.description?.ru && (
                    <div style={{ fontSize: 12, fontStyle: 'italic', color: '#a8916a', lineHeight: 1.4, marginTop: 5 }}>
                      «{selItem.description.ru}»
                    </div>
                  )}
                </div>
                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                  {selItem.isEquippable && (
                    <button
                      onClick={() => handleEquipItem(selItem.id)}
                      style={{ ...DOT, textAlign: 'center', padding: '7px 16px', background: '#e7d8b4', color: '#2e2012', borderRadius: 4, fontSize: 13, cursor: 'pointer', border: 'none' }}
                    >Надеть</button>
                  )}
                  <button
                    onClick={() => { setPendingDrop({ item: selItem, maxQuantity: selQty }); setDropAmount(1); }}
                    style={{ textAlign: 'center', padding: '6px 16px', background: '#2a1610', border: '1px solid #7a4030', color: '#d98a6a', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}
                  >Выкинуть</button>
                </div>
              </div>
            ) : (
              <div style={{ height: 84, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#6e5e44', fontStyle: 'italic' }}>
                Выбери предмет в сумке — Слэй посмотрит на него с лёгким презрением.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── CONFIRMATION MODAL ────────────────────────────────────────── */}
      {pendingConfirmation && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div style={{ background: '#1c130b', border: '1px solid #5a4226', borderRadius: 10, padding: 24, width: 440, maxWidth: '92%' }}>
            <div style={{ ...DOT, fontSize: 18, color: '#e7d8b4', marginBottom: 12 }}>
              {pendingConfirmation.kind === 'chooseHand' ? 'Выбор руки' : 'Подтверждение'}
            </div>
            <div style={{ fontSize: 13, whiteSpace: 'pre-line', marginBottom: 20, color: '#a8916a', lineHeight: 1.5 }}>
              {pendingConfirmation.message}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setPendingConfirmation(null)}
                style={{ padding: '7px 16px', borderRadius: 4, background: '#46341f', border: '1px solid #6e5430', color: '#e0c178', cursor: 'pointer' }}
              >Отмена</button>

              {pendingConfirmation.kind === 'chooseHand' && (
                <>
                  {(['weapon_right', 'weapon_left'] as EquipmentSlot[]).map((hand, i) => (
                    <button key={hand} onClick={() => {
                      const { newItem } = pendingConfirmation;
                      if (isSlotOccupied(hand)) {
                        const cur = getEquippedInSlot(hand)!;
                        setPendingConfirmation({ kind: 'replace', newItem, targetSlot: hand, currentItem: cur, message: computeEquipMessage(newItem, [hand], [cur]) });
                      } else {
                        equipItem(newItem.id, hand); toast.success(`${newItem.name.ru} экипирован`); setPendingConfirmation(null);
                      }
                    }} style={{ ...DOT, padding: '7px 16px', borderRadius: 4, fontSize: 13, cursor: 'pointer', border: `1px solid ${i === 0 ? '#c39b4e' : '#6e5430'}`, background: i === 0 ? '#e7d8b4' : '#46341f', color: i === 0 ? '#2e2012' : '#e0c178' }}>
                      {i === 0 ? 'Правая рука' : 'Левая рука'}
                    </button>
                  ))}
                </>
              )}
              {pendingConfirmation.kind === 'replace' && (
                <button onClick={() => {
                  const { newItem, targetSlot, currentItem } = pendingConfirmation;
                  if (currentItem) unequipItem(currentItem.id);
                  equipItem(newItem.id, targetSlot); toast.success(`${newItem.name.ru} экипирован`); setPendingConfirmation(null);
                }} style={{ ...DOT, padding: '7px 16px', borderRadius: 4, fontSize: 13, cursor: 'pointer', border: 'none', background: '#e7d8b4', color: '#2e2012' }}>Заменить</button>
              )}
              {pendingConfirmation.kind === 'twoHanded' && (
                <button onClick={() => {
                  const { newItem, displaced } = pendingConfirmation;
                  displaced.forEach(it => unequipItem(it.id));
                  equipItem(newItem.id, 'weapon_right'); equipItem(newItem.id, 'weapon_left');
                  toast.success(`${newItem.name.ru} экипировано`); setPendingConfirmation(null);
                }} style={{ ...DOT, padding: '7px 16px', borderRadius: 4, fontSize: 13, cursor: 'pointer', border: 'none', background: '#e7d8b4', color: '#2e2012' }}>Одеть двуручное</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── DROP CONFIRMATION ─────────────────────────────────────────── */}
      {pendingDrop && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div style={{ background: '#1c130b', border: '1px solid #5a4226', borderRadius: 10, padding: 24, width: 380, maxWidth: '92%' }}>
            <div style={{ ...DOT, fontSize: 18, color: '#e7d8b4', marginBottom: 10 }}>Выбросить предмет</div>
            <div style={{ marginBottom: 14, fontSize: 13, color: '#a8916a' }}>{pendingDrop.item.name.ru}</div>
            {pendingDrop.maxQuantity > 1 && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: '#6e5e44', display: 'block', marginBottom: 4 }}>
                  Количество (макс. {pendingDrop.maxQuantity})
                </label>
                <input
                  type="number" min={1} max={pendingDrop.maxQuantity} value={dropAmount}
                  onChange={e => setDropAmount(Math.max(1, Math.min(pendingDrop.maxQuantity, parseInt(e.target.value) || 1)))}
                  style={{ ...MONO, width: '100%', borderRadius: 4, border: '1px solid #3a2c18', background: '#161009', color: '#ecdcc0', padding: '8px 12px', fontSize: 16 }}
                />
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => { setPendingDrop(null); setDropAmount(1); }} style={{ padding: '7px 16px', borderRadius: 4, background: '#46341f', border: '1px solid #6e5430', color: '#e0c178', cursor: 'pointer' }}>Отмена</button>
              <button onClick={() => {
                const amount = Math.min(dropAmount, pendingDrop.maxQuantity);
                dropItem(pendingDrop.item.id, amount);
                toast.info(`${pendingDrop.item.name.ru} ×${amount} выброшен`);
                setPendingDrop(null); setDropAmount(1);
              }} style={{ padding: '7px 16px', borderRadius: 4, background: '#7a2515', border: '1px solid #b03020', color: '#f0a090', cursor: 'pointer' }}>
                Выбросить{dropAmount > 1 ? ` ×${dropAmount}` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
