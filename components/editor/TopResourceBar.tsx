'use client';

import React from 'react';
import type { Variable } from '@/lib/store';

interface TopResourceBarProps {
  currentPage: any;
  variables: Variable[];
  playtestState: {
    variableValues: Record<string, number | boolean | string>;
    isInventoryOpen?: boolean;
    playerAvatar?: string;
  };
}

export function getCurrentPlayerAvatar(
  variables: Variable[],
  playtestState: { variableValues: Record<string, number | boolean | string> }
): string {
  const getVal = (name: string): number => {
    const v = variables.find(vv => vv.name === name);
    if (!v) return 0;
    const live = playtestState.variableValues[v.id];
    return typeof live === 'number' ? live : (v.defaultValue as number) ?? 0;
  };
  const health    = getVal('health');
  const healthMax = getVal('health_max') || 100;
  const level     = getVal('level') || 1;
  const souls     = getVal('souls') || 0;
  if (healthMax > 0 && health / healthMax < 0.3) return 'wounded';
  if (level >= 5 && souls >= 5) return 'veteran';
  return 'default';
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'k';
  return Math.floor(n).toString();
}

const VT: React.CSSProperties = { fontFamily: 'var(--font-vt, VT323, monospace)', lineHeight: 1 };
const SILK: React.CSSProperties = { fontFamily: 'var(--font-silk, Silkscreen, monospace)', letterSpacing: '0.5px' };
const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono, Space Mono, monospace)' };
const DOT: React.CSSProperties = { fontFamily: 'var(--font-dot, DotGothic16, sans-serif)' };

const LCD: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 4,
  padding: '3px 8px',
  background: '#161009',
  border: '1px solid #3a2c18',
  borderRadius: 3,
};

export default function TopResourceBar({ variables, playtestState }: TopResourceBarProps) {
  const getVal = (name: string): number => {
    const v = variables.find(vv => vv.name === name);
    if (!v) return 0;
    const live = playtestState.variableValues[v.id];
    return typeof live === 'number' ? live : (v.defaultValue as number) ?? 0;
  };

  const hp      = getVal('health');
  const hpMax   = getVal('health_max') || 100;
  const mp      = getVal('mana');
  const mpMax   = getVal('mana_max') || 50;
  const exp     = getVal('exp');
  const level   = getVal('level') || 1;
  const coins   = getVal('coins');
  const fuel    = getVal('gasoline');
  const vhs     = getVal('vhs');
  const gems    = getVal('gems');
  const souls   = getVal('souls');

  const hpPct  = hpMax > 0 ? Math.min(100, (hp / hpMax) * 100) : 100;
  const mpPct  = mpMax > 0 ? Math.min(100, (mp / mpMax) * 100) : 100;
  const expToNext = Math.max(80, Math.floor(level * 80 + 20));
  const expPct = Math.min(100, ((exp % expToNext) / expToNext) * 100);
  const isLowHp = hpPct < 25;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '6px 16px',
      background: '#1a120a',
      borderBottom: '1px solid #5a4226',
      flexShrink: 0,
    }}>
      {/* Avatar + stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Avatar */}
        <div style={{
          width: 30, height: 30, border: '2px solid #c39b4e', borderRadius: 4,
          background: 'repeating-linear-gradient(45deg,#2a1d10,#2a1d10 3px,#241810 3px,#241810 6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: isLowHp ? 'pulse 1s infinite' : undefined,
        }}>
          <span style={{ ...SILK, fontSize: '7px', color: '#c39b4e' }}>СЛЭЙ</span>
        </div>

        {/* Name + level */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ ...DOT, fontSize: '13px', color: '#e7d8b4' }}>СЛЭЙ</span>
            <span style={{ ...MONO, fontSize: '9px', color: '#a8916a' }}>ур.{level}</span>
          </div>
          {/* Bars */}
          <div style={{ display: 'flex', gap: 8, marginTop: 3, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ ...MONO, fontSize: '8px', color: '#7faf6a' }}>HP</span>
              <div style={{ width: 56, height: 5, background: '#2a1d10', borderRadius: 3, overflow: 'hidden', border: '1px solid #3a2c18' }}>
                <div style={{ height: '100%', width: `${hpPct}%`, background: isLowHp ? '#b15539' : '#7faf6a', transition: 'width 0.3s' }} />
              </div>
              <span style={{ ...VT, fontSize: '13px', color: '#9ad27e', minWidth: 38 }}>{Math.floor(hp)}/{Math.floor(hpMax)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ ...MONO, fontSize: '8px', color: '#6f8fb0' }}>MP</span>
              <div style={{ width: 44, height: 5, background: '#2a1d10', borderRadius: 3, overflow: 'hidden', border: '1px solid #3a2c18' }}>
                <div style={{ height: '100%', width: `${mpPct}%`, background: '#6f8fb0', transition: 'width 0.3s' }} />
              </div>
              <span style={{ ...VT, fontSize: '13px', color: '#9ab8d4', minWidth: 30 }}>{Math.floor(mp)}/{Math.floor(mpMax)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ ...MONO, fontSize: '8px', color: '#a8916a' }}>EXP</span>
              <div style={{ width: 28, height: 5, background: '#2a1d10', borderRadius: 3, overflow: 'hidden', border: '1px solid #3a2c18' }}>
                <div style={{ height: '100%', width: `${expPct}%`, background: '#6f8fb0', transition: 'width 0.3s' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Currencies */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={LCD}><span style={{ fontSize: 11 }}>💰</span><span style={{ ...VT, fontSize: '16px', color: '#e0c178' }}>{fmtNum(coins)}</span></div>
        <div style={LCD}><span style={{ fontSize: 11 }}>⛽</span><span style={{ ...VT, fontSize: '16px', color: '#d98a6a' }}>{fmtNum(fuel)}</span></div>
        <div style={LCD}><span style={{ fontSize: 11 }}>📼</span><span style={{ ...VT, fontSize: '16px', color: '#b8a888' }}>{fmtNum(vhs)}</span></div>
        <div style={LCD}><span style={{ fontSize: 11 }}>💎</span><span style={{ ...VT, fontSize: '16px', color: '#b48fc4' }}>{fmtNum(gems)}</span></div>
        <div style={LCD}><span style={{ fontSize: 11 }}>💀</span><span style={{ ...VT, fontSize: '16px', color: '#9aa0a6' }}>{fmtNum(souls)}</span></div>
      </div>
    </div>
  );
}
