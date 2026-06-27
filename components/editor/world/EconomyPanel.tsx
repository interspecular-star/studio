"use client";

import { useState, useCallback } from 'react';
import { useStudioStore } from '@/lib/store';
import { validateCombatPack, type ValidationIssue } from '@/lib/validation/validate';
import {
  DIFFICULTY_LABELS, MERCENARY_RARITY_LABELS, MERCENARY_RARITY_COLORS,
  buildingUpgradeCost,
  type Building, type BuildingId, type BuildingTier,
  type Mercenary, type MercenaryRarity,
  type RewardEntry,
} from '@/lib/types';

type EcoTab = 'buildings' | 'mercenaries' | 'rewards' | 'mine' | 'export';

// ── Shared helpers ─────────────────────────────────────────────────────────────

function SectionBox({ title, children, onReset }: {
  title: string; children: React.ReactNode; onReset?: () => void;
}) {
  return (
    <div className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] p-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-semibold text-[var(--studio-text-secondary)]">{title}</p>
        {onReset && (
          <button
            onClick={onReset}
            className="text-[10px] text-[var(--studio-text-muted)] hover:text-amber-400 transition-colors"
          >
            Сброс
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function LocField({
  label, ru, en,
  onChangeRu, onChangeEn,
}: {
  label: string;
  ru: string; en: string;
  onChangeRu: (v: string) => void;
  onChangeEn: (v: string) => void;
}) {
  return (
    <div className="space-y-0.5">
      {label && <p className="text-[10px] text-[var(--studio-text-muted)]">{label}</p>}
      <div className="flex gap-1">
        <input
          value={ru}
          onChange={e => onChangeRu(e.target.value)}
          placeholder="RU"
          className="flex-1 text-xs bg-[var(--studio-bg)] border border-[var(--studio-border)] rounded px-1.5 py-0.5 text-[var(--studio-text)]"
        />
        <input
          value={en}
          onChange={e => onChangeEn(e.target.value)}
          placeholder="EN"
          className="flex-1 text-xs bg-[var(--studio-bg)] border border-[var(--studio-border)] rounded px-1.5 py-0.5 text-[var(--studio-text)]"
        />
      </div>
    </div>
  );
}

function NumField({ label, value, min, max, step, onChange }: {
  label: string; value: number; min?: number; max?: number; step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-[var(--studio-text-muted)] shrink-0 w-28">{label}</span>
      <input
        type="number" value={value} min={min} max={max} step={step ?? 1}
        onChange={e => onChange(Number(e.target.value))}
        className="w-20 text-xs text-right bg-[var(--studio-bg)] border border-[var(--studio-border)] rounded px-1.5 py-0.5 text-[var(--studio-text)] font-mono"
      />
    </div>
  );
}

// ── Tab: ЗДАНИЯ ───────────────────────────────────────────────────────────────

const UPGRADE_COSTS = Array.from({ length: 14 }, (_, i) => buildingUpgradeCost(i + 1));
const TOTAL_COSTS = UPGRADE_COSTS.reduce<number[]>((acc, c) => [...acc, (acc[acc.length - 1] ?? 0) + c], []);

function BuildingsTab() {
  const { buildings, updateBuilding, resetBuildingsToDefault } = useStudioStore();
  const [expandedId, setExpandedId] = useState<BuildingId | null>(null);
  const [showCosts, setShowCosts] = useState(false);

  return (
    <div className="space-y-3">
      {/* Cost table toggle */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-[var(--studio-text-muted)]">5 зданий (фиксированный набор)</p>
        <button
          onClick={() => setShowCosts(v => !v)}
          className="text-[10px] text-[var(--studio-accent)] hover:opacity-80"
        >
          {showCosts ? 'Скрыть цены' : 'Таблица цен ↗'}
        </button>
      </div>

      {showCosts && (
        <div className="overflow-x-auto rounded border border-[var(--studio-border)]">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="bg-[var(--studio-bg-elevated)]">
                <th className="px-2 py-1 text-left border-b border-[var(--studio-border)] text-[var(--studio-text-muted)]">Ур.</th>
                <th className="px-2 py-1 text-right border-b border-[var(--studio-border)] text-[var(--studio-text-muted)]">Стоимость</th>
                <th className="px-2 py-1 text-right border-b border-[var(--studio-border)] text-[var(--studio-text-muted)]">Суммарно</th>
              </tr>
            </thead>
            <tbody>
              {UPGRADE_COSTS.map((cost, i) => (
                <tr key={i} className={i % 2 === 0 ? '' : 'bg-[var(--studio-bg-elevated)]/40'}>
                  <td className="px-2 py-0.5 border-b border-[var(--studio-border)] text-[var(--studio-text)]">{i + 1}→{i + 2}</td>
                  <td className="px-2 py-0.5 border-b border-[var(--studio-border)] text-right text-amber-400 font-mono">{cost}</td>
                  <td className="px-2 py-0.5 border-b border-[var(--studio-border)] text-right text-[var(--studio-text-muted)] font-mono">{TOTAL_COSTS[i]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10px] text-[var(--studio-text-muted)] p-2">Формула: 40 × N^1.8 Сталлонок</p>
        </div>
      )}

      {/* Building list */}
      <div className="space-y-2">
        {buildings.map((b: Building) => (
          <div key={b.id} className="rounded border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)]">
            <button
              onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
              className="w-full flex items-center gap-2 p-2 text-left"
            >
              <span className="text-base">{b.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[var(--studio-text)]">{b.name.ru}</p>
                <p className="text-[10px] text-[var(--studio-text-muted)]">{b.ownerName.ru} · макс. {b.maxLevel} ур.</p>
              </div>
              <span className="text-[10px] text-[var(--studio-text-muted)]">{expandedId === b.id ? '▲' : '▼'}</span>
            </button>

            {expandedId === b.id && (
              <div className="border-t border-[var(--studio-border)] p-2 space-y-3">
                <LocField
                  label="Название здания"
                  ru={b.name.ru} en={b.name.en}
                  onChangeRu={v => updateBuilding(b.id, { name: { ...b.name, ru: v } })}
                  onChangeEn={v => updateBuilding(b.id, { name: { ...b.name, en: v } })}
                />
                <LocField
                  label="Имя владельца"
                  ru={b.ownerName.ru} en={b.ownerName.en}
                  onChangeRu={v => updateBuilding(b.id, { ownerName: { ...b.ownerName, ru: v } })}
                  onChangeEn={v => updateBuilding(b.id, { ownerName: { ...b.ownerName, en: v } })}
                />
                <div>
                  <p className="text-[10px] font-semibold text-[var(--studio-text-secondary)] mb-1.5">ТИРЫ (ОПИСАНИЯ)</p>
                  <div className="space-y-2">
                    {b.tiers.map((tier: BuildingTier, idx: number) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-amber-400 shrink-0">Ур. {tier.levels}</span>
                          <input
                            value={tier.levels}
                            onChange={e => {
                              const newTiers = [...b.tiers];
                              newTiers[idx] = { ...tier, levels: e.target.value };
                              updateBuilding(b.id, { tiers: newTiers });
                            }}
                            className="w-16 text-[10px] bg-[var(--studio-bg)] border border-[var(--studio-border)] rounded px-1 py-0.5 text-[var(--studio-text)]"
                          />
                        </div>
                        <LocField
                          label=""
                          ru={tier.description.ru} en={tier.description.en}
                          onChangeRu={v => {
                            const newTiers = [...b.tiers];
                            newTiers[idx] = { ...tier, description: { ...tier.description, ru: v } };
                            updateBuilding(b.id, { tiers: newTiers });
                          }}
                          onChangeEn={v => {
                            const newTiers = [...b.tiers];
                            newTiers[idx] = { ...tier, description: { ...tier.description, en: v } };
                            updateBuilding(b.id, { tiers: newTiers });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={resetBuildingsToDefault}
        className="w-full py-1 text-[10px] text-[var(--studio-text-muted)] hover:text-amber-400 border border-dashed border-[var(--studio-border)] rounded transition-colors"
      >
        Сбросить здания к дефолту из CDD
      </button>
    </div>
  );
}

// ── Tab: НАЁМНИКИ ─────────────────────────────────────────────────────────────

const RARITIES: MercenaryRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

function MercenaryCard({ merc }: { merc: Mercenary }) {
  const { updateMercenary, deleteMercenary } = useStudioStore();
  const [expanded, setExpanded] = useState(false);
  const color = MERCENARY_RARITY_COLORS[merc.rarity];

  const upd = (updates: Partial<Omit<Mercenary, 'id'>>) => updateMercenary(merc.id, updates);

  return (
    <div className="rounded border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)]">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 p-2 text-left"
      >
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[var(--studio-text)]">
            {merc.name.ru}
            {merc.isNamed && <span className="ml-1 text-[10px] text-amber-400">★</span>}
          </p>
          <p className="text-[10px] text-[var(--studio-text-muted)]">
            {MERCENARY_RARITY_LABELS[merc.rarity]} · {merc.durationHours}ч · {merc.costMin}–{merc.costMax} ⭐
          </p>
        </div>
        <span className="text-[10px] text-[var(--studio-text-muted)]">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="border-t border-[var(--studio-border)] p-2 space-y-2">
          <LocField
            label="Имя"
            ru={merc.name.ru} en={merc.name.en}
            onChangeRu={v => upd({ name: { ...merc.name, ru: v } })}
            onChangeEn={v => upd({ name: { ...merc.name, en: v } })}
          />
          <div className="flex gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-[var(--studio-text-muted)]">Редкость:</span>
              <select
                value={merc.rarity}
                onChange={e => upd({ rarity: e.target.value as MercenaryRarity })}
                className="text-[10px] bg-[var(--studio-bg)] border border-[var(--studio-border)] rounded px-1 py-0.5 text-[var(--studio-text)]"
              >
                {RARITIES.map(r => (
                  <option key={r} value={r}>{MERCENARY_RARITY_LABELS[r]}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-1 text-[10px] text-[var(--studio-text-muted)] cursor-pointer">
              <input
                type="checkbox" checked={!!merc.isNamed}
                onChange={e => upd({ isNamed: e.target.checked })}
                className="accent-[var(--studio-accent)]"
              />
              Именной
            </label>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <NumField label="Цена мин. (⭐)" value={merc.costMin} min={0} onChange={v => upd({ costMin: v })} />
            <NumField label="Цена макс. (⭐)" value={merc.costMax} min={0} onChange={v => upd({ costMax: v })} />
            <NumField label="Длительность (ч)" value={merc.durationHours} min={1} onChange={v => upd({ durationHours: v })} />
            <NumField label="Бонус шахты (%)" value={merc.mineBonusPct} min={0} onChange={v => upd({ mineBonusPct: v })} />
            <NumField label="Тавера ур. (мин)" value={merc.tavernLevelRequired} min={1} max={15} onChange={v => upd({ tavernLevelRequired: v })} />
          </div>
          {merc.isNamed && (
            <LocField
              label="Условие разблокировки"
              ru={merc.unlockCondition?.ru ?? ''} en={merc.unlockCondition?.en ?? ''}
              onChangeRu={v => upd({ unlockCondition: { ...merc.unlockCondition, ru: v, en: merc.unlockCondition?.en ?? '' } })}
              onChangeEn={v => upd({ unlockCondition: { ...merc.unlockCondition, ru: merc.unlockCondition?.ru ?? '', en: v } })}
            />
          )}
          <LocField
            label="Помощь в бою"
            ru={merc.combatHelp?.ru ?? ''} en={merc.combatHelp?.en ?? ''}
            onChangeRu={v => upd({ combatHelp: { ...merc.combatHelp, ru: v, en: merc.combatHelp?.en ?? '' } })}
            onChangeEn={v => upd({ combatHelp: { ...merc.combatHelp, ru: merc.combatHelp?.ru ?? '', en: v } })}
          />
          <button
            onClick={() => deleteMercenary(merc.id)}
            className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
          >
            Удалить наёмника
          </button>
        </div>
      )}
    </div>
  );
}

function MercenariesTab() {
  const { mercenaries, addMercenary } = useStudioStore();

  const handleAdd = () => {
    addMercenary({
      name: { ru: 'Новый наёмник', en: 'New Mercenary' },
      rarity: 'common',
      costMin: 200, costMax: 400,
      durationHours: 4,
      mineBonusPct: 10,
      tavernLevelRequired: 1,
    });
  };

  const named = mercenaries.filter((m: Mercenary) => m.isNamed);
  const generic = mercenaries.filter((m: Mercenary) => !m.isNamed);

  return (
    <div className="space-y-3">
      {named.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-amber-400">ИМЕННЫЕ</p>
          {named.map((m: Mercenary) => <MercenaryCard key={m.id} merc={m} />)}
        </div>
      )}
      {generic.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-[var(--studio-text-secondary)]">ОБЫЧНЫЕ</p>
          {generic.map((m: Mercenary) => <MercenaryCard key={m.id} merc={m} />)}
        </div>
      )}
      {mercenaries.length === 0 && (
        <p className="text-xs text-[var(--studio-text-muted)] text-center py-4">Нет наёмников</p>
      )}
      <button
        onClick={handleAdd}
        className="w-full py-1.5 rounded text-xs font-medium border border-dashed border-[var(--studio-border)] text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] hover:border-[var(--studio-accent)] transition-colors"
      >
        + Добавить наёмника
      </button>
    </div>
  );
}

// ── Tab: НАГРАДЫ ──────────────────────────────────────────────────────────────

function RewardsTab() {
  const { rewardTables, updateRewardEntry, resetRewardTablesToDefault } = useStudioStore();
  const [editingDiff, setEditingDiff] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-[var(--studio-text-muted)]">Базовые награды за 100% прохождение</p>
        <button
          onClick={resetRewardTablesToDefault}
          className="text-[10px] text-[var(--studio-text-muted)] hover:text-amber-400 transition-colors"
        >
          Сброс
        </button>
      </div>

      {/* Summary table */}
      <div className="overflow-x-auto rounded border border-[var(--studio-border)]">
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="bg-[var(--studio-bg-elevated)]">
              {['Сложность', 'Монеты', 'Стелл.', 'VHS%', 'Ред%', 'XP'].map(h => (
                <th key={h} className="px-1.5 py-1 text-left border-b border-[var(--studio-border)] text-[var(--studio-text-muted)] whitespace-nowrap">{h}</th>
              ))}
              <th className="px-1.5 py-1 border-b border-[var(--studio-border)]" />
            </tr>
          </thead>
          <tbody>
            {rewardTables.map((r: RewardEntry) => (
              <tr
                key={r.difficulty}
                className={editingDiff === r.difficulty ? 'bg-[var(--studio-accent)]/10' : 'hover:bg-[var(--studio-bg-elevated)]/60'}
              >
                <td className="px-1.5 py-0.5 border-b border-[var(--studio-border)] text-[var(--studio-text)] font-medium whitespace-nowrap">
                  {DIFFICULTY_LABELS[r.difficulty]}
                </td>
                <td className="px-1.5 py-0.5 border-b border-[var(--studio-border)] text-[var(--studio-text-muted)]">
                  {r.coinsMin}–{r.coinsMax}
                </td>
                <td className="px-1.5 py-0.5 border-b border-[var(--studio-border)] text-[var(--studio-text-muted)]">
                  {r.stallonkasMin}–{r.stallonkasMax}
                </td>
                <td className="px-1.5 py-0.5 border-b border-[var(--studio-border)] text-[var(--studio-text-muted)]">
                  {r.vhsChancePct}%
                </td>
                <td className="px-1.5 py-0.5 border-b border-[var(--studio-border)] text-[var(--studio-text-muted)]">
                  {r.rareItemChancePct}%
                </td>
                <td className="px-1.5 py-0.5 border-b border-[var(--studio-border)] text-[var(--studio-text-muted)]">
                  {r.xpMin}–{r.xpMax}
                </td>
                <td className="px-1.5 py-0.5 border-b border-[var(--studio-border)]">
                  <button
                    onClick={() => setEditingDiff(editingDiff === r.difficulty ? null : r.difficulty)}
                    className="text-[10px] text-[var(--studio-accent)] hover:opacity-80"
                  >
                    {editingDiff === r.difficulty ? 'Готово' : 'Ред.'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit panel for selected difficulty */}
      {editingDiff && (() => {
        const r = rewardTables.find((x: RewardEntry) => x.difficulty === editingDiff);
        if (!r) return null;
        const upd = (updates: Partial<Omit<RewardEntry, 'difficulty'>>) => updateRewardEntry(r.difficulty, updates);
        return (
          <div className="rounded border border-[var(--studio-accent)]/40 bg-[var(--studio-bg-elevated)] p-3 space-y-2">
            <p className="text-[10px] font-semibold text-[var(--studio-accent)]">
              Редактируешь: {DIFFICULTY_LABELS[r.difficulty]}
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <NumField label="Монеты (мин)" value={r.coinsMin} min={0} onChange={v => upd({ coinsMin: v })} />
              <NumField label="Монеты (макс)" value={r.coinsMax} min={0} onChange={v => upd({ coinsMax: v })} />
              <NumField label="Сталлонки (мин)" value={r.stallonkasMin} min={0} onChange={v => upd({ stallonkasMin: v })} />
              <NumField label="Сталлонки (макс)" value={r.stallonkasMax} min={0} onChange={v => upd({ stallonkasMax: v })} />
              <NumField label="Шанс VHS (%)" value={r.vhsChancePct} min={0} max={100} onChange={v => upd({ vhsChancePct: v })} />
              <NumField label="Шанс редкого (%)" value={r.rareItemChancePct} min={0} max={100} onChange={v => upd({ rareItemChancePct: v })} />
              <NumField label="XP (мин)" value={r.xpMin} min={0} onChange={v => upd({ xpMin: v })} />
              <NumField label="XP (макс)" value={r.xpMax} min={0} onChange={v => upd({ xpMax: v })} />
            </div>
          </div>
        );
      })()}

      {/* Partial reward info */}
      <div className="rounded border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] p-2">
        <p className="text-[10px] font-semibold text-[var(--studio-text-secondary)] mb-1.5">СИСТЕМА ЧАСТИЧНОЙ НАГРАДЫ</p>
        <div className="space-y-0.5">
          {[
            ['0–29% волны', '0% награды'],
            ['30–59%', '10% от базовой'],
            ['60–99%', '30% от базовой'],
            ['100%', '100% + бонус ×1.2–1.5'],
          ].map(([pct, reward]) => (
            <div key={pct} className="flex justify-between text-[10px]">
              <span className="text-[var(--studio-text-muted)]">{pct}</span>
              <span className="text-[var(--studio-text)]">{reward}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab: ШАХТА ────────────────────────────────────────────────────────────────

function MineTab() {
  const { mineConfig, updateMineConfig, resetMineConfigToDefault } = useStudioStore();

  return (
    <div className="space-y-3">
      <SectionBox title="БАЗОВЫЕ ПОКАЗАТЕЛИ (ур. 1, без наёмников)" onReset={resetMineConfigToDefault}>
        <div className="space-y-1.5">
          <NumField label="Монеты / час" value={mineConfig.baseCoinsPerHour} min={0} onChange={v => updateMineConfig({ baseCoinsPerHour: v })} />
          <NumField label="Сталлонки / час" value={mineConfig.baseStallonkasPerHour} min={0} onChange={v => updateMineConfig({ baseStallonkasPerHour: v })} />
          <NumField label="Оффлайн эффект. (%)" value={mineConfig.offlineEfficiencyPct} min={0} max={100} onChange={v => updateMineConfig({ offlineEfficiencyPct: v })} />
          <NumField label="Макс. оффлайн (ч)" value={mineConfig.maxOfflineHours} min={1} max={24} onChange={v => updateMineConfig({ maxOfflineHours: v })} />
        </div>
      </SectionBox>

      {/* Mercenary multipliers reference */}
      <SectionBox title="ВЛИЯНИЕ НАЁМНИКОВ (СПРАВКА)">
        <div className="space-y-0.5">
          {[
            ['1 обычный', '+10% → 55% офлайн'],
            ['2 необычных', '+40% → 70% офлайн'],
            ['3 редких', '+105% → 85% офлайн'],
            ['4 эпических', '+220% → 95% офлайн'],
          ].map(([merc, effect]) => (
            <div key={merc} className="flex justify-between text-[10px]">
              <span className="text-[var(--studio-text-muted)]">{merc}</span>
              <span className="text-[var(--studio-text)]">{effect}</span>
            </div>
          ))}
        </div>
      </SectionBox>

      {/* Live calculation */}
      <SectionBox title="РАСЧЁТ (ур. 1)">
        <div className="space-y-0.5">
          <div className="flex justify-between text-[10px]">
            <span className="text-[var(--studio-text-muted)]">Монеты за 8ч онлайн</span>
            <span className="text-[var(--studio-text)] font-mono">{mineConfig.baseCoinsPerHour * 8}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-[var(--studio-text-muted)]">Монеты за {mineConfig.maxOfflineHours}ч оффлайн</span>
            <span className="text-[var(--studio-text)] font-mono">
              {Math.round(mineConfig.baseCoinsPerHour * mineConfig.maxOfflineHours * mineConfig.offlineEfficiencyPct / 100)}
            </span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-[var(--studio-text-muted)]">Сталлонки за 8ч онлайн</span>
            <span className="text-[var(--studio-text)] font-mono">{mineConfig.baseStallonkasPerHour * 8}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-[var(--studio-text-muted)]">Сталлонки за {mineConfig.maxOfflineHours}ч оффлайн</span>
            <span className="text-[var(--studio-text)] font-mono">
              {Math.round(mineConfig.baseStallonkasPerHour * mineConfig.maxOfflineHours * mineConfig.offlineEfficiencyPct / 100)}
            </span>
          </div>
        </div>
      </SectionBox>
    </div>
  );
}

// ── Tab: ЭКСПОРТ ──────────────────────────────────────────────────────────────

function ExportTab() {
  const {
    enemies, bosses, waves, instincts, scenarios,
    buildings, mercenaries, rewardTables, mineConfig,
    items, exportCombatPack,
  } = useStudioStore();

  const [result, setResult] = useState<{ ok: boolean; issues: ValidationIssue[] } | null>(null);

  const runValidation = useCallback(() => {
    const r = validateCombatPack({
      enemies, bosses, waves, instincts, scenarios,
      buildings, mercenaries, rewardTables, mineConfig,
      items,
    });
    setResult(r);
  }, [enemies, bosses, waves, instincts, scenarios, buildings, mercenaries, rewardTables, mineConfig, items]);

  const handleExport = () => {
    runValidation();
    exportCombatPack();
  };

  const errors   = result?.issues.filter(i => i.severity === 'error')   ?? [];
  const warnings = result?.issues.filter(i => i.severity === 'warning')  ?? [];

  const byCategory = (issues: ValidationIssue[]) => {
    const map = new Map<string, ValidationIssue[]>();
    for (const issue of issues) {
      if (!map.has(issue.category)) map.set(issue.category, []);
      map.get(issue.category)!.push(issue);
    }
    return map;
  };

  return (
    <div className="space-y-3">
      {/* Export buttons */}
      <div className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] p-3 space-y-2">
        <p className="text-[10px] font-semibold text-[var(--studio-text-secondary)]">ЭКСПОРТ ДАННЫХ ДЛЯ ДВИЖКА</p>
        <p className="text-[10px] text-[var(--studio-text-muted)]">
          Отдельный JSON-файл с врагами, волнами, инстинктами, сценариями, зданиями, наёмниками, наградами и шахтой.
          Перед скачиванием запускается автовалидация.
        </p>
        <div className="flex gap-2">
          <button
            onClick={runValidation}
            className="flex-1 py-1.5 rounded text-xs font-medium border border-[var(--studio-border)] text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] hover:border-[var(--studio-accent)] transition-colors"
          >
            Проверить
          </button>
          <button
            onClick={handleExport}
            className="flex-1 py-1.5 rounded text-xs font-medium bg-[var(--studio-accent)] text-white hover:opacity-90 transition-opacity"
          >
            Экспорт combat pack ↓
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] p-3">
        <p className="text-[10px] font-semibold text-[var(--studio-text-secondary)] mb-2">СОДЕРЖИМОЕ ПАКЕТА</p>
        {[
          ['Враги',       enemies.length],
          ['Боссы',       bosses.length],
          ['Волны',       waves.length],
          ['Инстинкты',   instincts.length],
          ['Сценарии',    scenarios.length],
          ['Здания',      buildings.length],
          ['Наёмники',    mercenaries.length],
          ['Таблицы наград', rewardTables.length],
        ].map(([label, count]) => (
          <div key={String(label)} className="flex justify-between text-[10px] py-0.5 border-b border-[var(--studio-border)] last:border-0">
            <span className="text-[var(--studio-text-muted)]">{label}</span>
            <span className={`font-mono font-semibold ${Number(count) === 0 ? 'text-amber-500' : 'text-[var(--studio-text)]'}`}>
              {count}
            </span>
          </div>
        ))}
      </div>

      {/* Validation results */}
      {result && (
        <div className={`rounded-lg border p-3 ${result.ok ? 'border-green-500/40 bg-green-500/5' : 'border-red-500/40 bg-red-500/5'}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-sm ${result.ok ? 'text-green-400' : 'text-red-400'}`}>
              {result.ok ? '✓' : '✗'}
            </span>
            <p className={`text-xs font-semibold ${result.ok ? 'text-green-400' : 'text-red-400'}`}>
              {result.ok
                ? `Валидация пройдена${warnings.length > 0 ? ` (${warnings.length} предупреждений)` : ''}`
                : `${errors.length} ошибок, ${warnings.length} предупреждений`}
            </p>
          </div>

          {errors.length > 0 && (
            <div className="space-y-2 mb-2">
              {Array.from(byCategory(errors).entries()).map(([cat, catIssues]) => (
                <div key={cat}>
                  <p className="text-[10px] font-semibold text-red-400 mb-0.5">{cat}</p>
                  {catIssues.map((issue, i) => (
                    <p key={i} className="text-[10px] text-red-300 pl-2">• {issue.message}</p>
                  ))}
                </div>
              ))}
            </div>
          )}

          {warnings.length > 0 && (
            <div className="space-y-2">
              {Array.from(byCategory(warnings).entries()).map(([cat, catIssues]) => (
                <div key={cat}>
                  <p className="text-[10px] font-semibold text-amber-400 mb-0.5">{cat}</p>
                  {catIssues.map((issue, i) => (
                    <p key={i} className="text-[10px] text-amber-300 pl-2">• {issue.message}</p>
                  ))}
                </div>
              ))}
            </div>
          )}

          {result.ok && warnings.length === 0 && (
            <p className="text-[10px] text-green-300">Все проверки пройдены — данные готовы для движка.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function EconomyPanel() {
  const [tab, setTab] = useState<EcoTab>('buildings');

  const tabs: { id: EcoTab; label: string }[] = [
    { id: 'buildings',    label: 'ЗДАНИЯ'   },
    { id: 'mercenaries',  label: 'НАЁМНИКИ' },
    { id: 'rewards',      label: 'НАГРАДЫ'  },
    { id: 'mine',         label: 'ШАХТА'    },
    { id: 'export',       label: 'ЭКСПОРТ'  },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-[var(--studio-border)] shrink-0">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-1.5 text-[10px] font-medium transition-colors ${
              tab === t.id
                ? 'text-[var(--studio-accent)] border-b-2 border-[var(--studio-accent)]'
                : 'text-[var(--studio-text-muted)] hover:text-[var(--studio-text-secondary)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {tab === 'buildings'   && <BuildingsTab />}
        {tab === 'mercenaries' && <MercenariesTab />}
        {tab === 'rewards'     && <RewardsTab />}
        {tab === 'mine'        && <MineTab />}
        {tab === 'export'      && <ExportTab />}
      </div>
    </div>
  );
}
