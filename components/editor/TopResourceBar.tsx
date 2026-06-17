'use client';

import React from 'react';
import { Heart, Zap, Star, Coins, Flame, Gem, Swords, User } from 'lucide-react';
import type { Variable } from '@/lib/store';

interface TopResourceBarProps {
  currentPage: any; // StudioPage
  variables: Variable[];
  playtestState: {
    variableValues: Record<string, number | boolean | string>;
    isInventoryOpen?: boolean;
    playerAvatar?: string;
    // ... other fields ok
  };
}

// Pure helper: compute current avatar id from live state (auto evolution, no player input)
export function getCurrentPlayerAvatar(
  variables: Variable[],
  playtestState: { variableValues: Record<string, number | boolean | string> }
): string {
  const getVal = (name: string): number => {
    const v = variables.find((vv) => vv.name === name);
    if (!v) return 0;
    const live = playtestState.variableValues[v.id];
    return typeof live === 'number' ? live : (v.defaultValue as number) ?? 0;
  };

  const health = getVal('health');
  const healthMax = getVal('health_max') || 100;
  const level = getVal('level') || 1;
  const souls = getVal('souls') || 0;

  if (healthMax > 0 && health / healthMax < 0.3) return 'wounded';
  if (level >= 5 && souls >= 5) return 'veteran';
  return 'default';
}

function formatNum(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return Math.floor(n).toString();
}

export default function TopResourceBar({ variables, playtestState }: TopResourceBarProps) {
  const getVal = (name: string): number => {
    const v = variables.find((vv) => vv.name === name);
    if (!v) return 0;
    const live = playtestState.variableValues[v.id];
    return typeof live === 'number' ? live : (v.defaultValue as number) ?? 0;
  };

  const health = getVal('health');
  const healthMax = getVal('health_max') || 100;
  const mana = getVal('mana');
  const manaMax = getVal('mana_max') || 50;
  const exp = getVal('exp');
  const level = getVal('level') || 1;
  const coins = getVal('coins');
  const fuel = getVal('gasoline'); // internal key, display "Топливо"
  const stallons = getVal('gems'); // internal key, display "Сталлонки"
  const souls = getVal('souls');

  // Simple EXP to next level (port/adapt idea from old + reasonable curve)
  const expToNext = Math.max(80, Math.floor(level * 80 + 20));
  const expPercent = Math.min(100, Math.max(0, (exp % expToNext) / expToNext * 100));

  const hpPercent = healthMax > 0 ? Math.min(100, Math.max(0, (health / healthMax) * 100)) : 100;
  const mpPercent = manaMax > 0 ? Math.min(100, Math.max(0, (mana / manaMax) * 100)) : 100;

  const avatarId = playtestState.playerAvatar || getCurrentPlayerAvatar(variables, playtestState);

  const getAvatarVisual = (id: string) => {
    switch (id) {
      case 'wounded':
        return { emoji: '🤕', label: 'Ранен', color: 'border-red-600/70 text-red-400' };
      case 'veteran':
        return { emoji: '🛡️', label: 'Ветеран', color: 'border-amber-500/70 text-amber-300' };
      default:
        return { emoji: '🧔', label: 'Слэй', color: 'border-[var(--studio-accent)] text-[var(--studio-accent)]' };
    }
  };

  const avatar = getAvatarVisual(avatarId);
  const isLowHp = hpPercent < 25;

  return (
    <div className="w-full pointer-events-none">
      <div
        className="flex w-full items-center gap-2 bg-[var(--studio-bg-elevated)]/90 px-2.5 py-1 text-[10px] border-b border-[var(--studio-border)]/70 backdrop-blur-sm pointer-events-auto"
      >
        {/* Avatar */}
        <div
          className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border bg-[#161310] text-sm ${avatar.color} ${isLowHp ? 'animate-pulse' : ''}`}
          title={`Аватар: ${avatar.label} (меняется автоматически)`}
        >
          <span className="leading-none">{avatar.emoji}</span>
        </div>

        {/* Level + EXP bar */}
        <div className="flex items-center gap-1.5 pl-0.5 pr-2">
          <div className="font-mono text-[11px] font-semibold text-[var(--studio-accent)] tabular-nums">УР.{level}</div>
          <div className="w-16 h-1.5 rounded bg-[#161310] border border-[var(--studio-border)] overflow-hidden">
            <div
              className="h-full bg-[var(--studio-accent)] transition-all duration-200"
              style={{ width: `${expPercent}%` }}
            />
          </div>
          <div className="font-mono text-[9px] text-[var(--studio-text-muted)] tabular-nums w-8 text-right">{formatNum(exp)}</div>
        </div>

        <div className="h-3 w-px bg-[var(--studio-border)] mx-0.5" />

        {/* HP bar */}
        <div className="flex items-center gap-1">
          <Heart className="h-3.5 w-3.5 text-red-500" />
          <div className="w-14 h-1.5 rounded bg-[#161310] border border-[var(--studio-border)] overflow-hidden">
            <div
              className={`h-full transition-all duration-200 ${isLowHp ? 'bg-red-600' : 'bg-red-500'}`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>
          <div className={`font-mono text-[9px] tabular-nums ${isLowHp ? 'text-red-400' : 'text-[var(--studio-text-secondary)]'}`}>
            {Math.floor(health)}/{Math.floor(healthMax)}
          </div>
        </div>

        {/* MP bar */}
        <div className="flex items-center gap-1">
          <Zap className="h-3.5 w-3.5 text-blue-400" />
          <div className="w-11 h-1.5 rounded bg-[#161310] border border-[var(--studio-border)] overflow-hidden">
            <div
              className="h-full bg-blue-400 transition-all duration-200"
              style={{ width: `${mpPercent}%` }}
            />
          </div>
          <div className="font-mono text-[9px] text-[var(--studio-text-secondary)] tabular-nums">
            {Math.floor(mana)}/{Math.floor(manaMax)}
          </div>
        </div>

        <div className="h-3 w-px bg-[var(--studio-border)] mx-0.5" />

        {/* Currencies */}
        <div className="flex items-center gap-2.5 pl-1 text-[var(--studio-text-secondary)]">
          <div className="flex items-center gap-0.5" title="Монеты">
            <Coins className="h-3.5 w-3.5 text-yellow-500" />
            <span className="font-mono tabular-nums">{formatNum(coins)}</span>
          </div>
          <div className="flex items-center gap-0.5" title="Топливо">
            <Flame className="h-3.5 w-3.5 text-orange-400" />
            <span className="font-mono tabular-nums">{formatNum(fuel)}</span>
          </div>
          <div className="flex items-center gap-0.5" title="Сталлонки">
            <Gem className="h-3.5 w-3.5 text-sky-400" />
            <span className="font-mono tabular-nums">{formatNum(stallons)}</span>
          </div>
          <div className="flex items-center gap-0.5" title="Души">
            <Swords className="h-3.5 w-3.5 text-red-400" />
            <span className="font-mono tabular-nums">{formatNum(souls)}</span>
          </div>
        </div>

        <div className="ml-auto text-[8px] text-[var(--studio-text-muted)]/60 pr-1 select-none">HUD</div>
      </div>
    </div>
  );
}
