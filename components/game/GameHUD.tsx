'use client';
import React, { useCallback } from 'react';
import { useStudioStore } from '@/lib/store';

const VT:   React.CSSProperties = { fontFamily: 'var(--font-vt, VT323, monospace)',         lineHeight: 1 };
const SILK: React.CSSProperties = { fontFamily: 'var(--font-silk, Silkscreen, monospace)',   letterSpacing: '0.5px' };
const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono, Space Mono, monospace)' };
const DOT:  React.CSSProperties = { fontFamily: 'var(--font-dot, DotGothic16, sans-serif)' };

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'k';
  return Math.floor(Math.max(0, n)).toString();
}

interface Props {
  coinsDisplay?: number;
}

export default function GameHUD({ coinsDisplay }: Props) {
  const { variables, playtestState } = useStudioStore();

  const getVal = useCallback((name: string): number => {
    const v = variables.find(vv => vv.name === name);
    if (!v) return 0;
    const live = playtestState.variableValues[v.id];
    return typeof live === 'number' ? live : (v.defaultValue as number) ?? 0;
  }, [variables, playtestState.variableValues]);

  const hp    = getVal('health');
  const hpMax = getVal('health_max') || 100;
  const mp    = getVal('mana');
  const mpMax = getVal('mana_max') || 50;
  const exp   = getVal('exp');
  const level = getVal('level') || 1;
  const coins = coinsDisplay !== undefined ? coinsDisplay : getVal('coins');
  const fuel  = getVal('gasoline');
  const vhs   = getVal('vhs');
  const gems  = getVal('gems');
  const souls = getVal('souls');

  const hpPct     = hpMax > 0 ? Math.min(100, (hp / hpMax) * 100) : 100;
  const mpPct     = mpMax > 0 ? Math.min(100, (mp / mpMax) * 100) : 100;
  const expToNext = Math.max(80, Math.floor(level * 80 + 20));
  const expPct    = Math.min(100, ((exp % expToNext) / expToNext) * 100);
  const isLowHp   = hpPct < 25;

  const lcd: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '5px 10px', background: '#161009', border: '1px solid #3a2c18', borderRadius: 4,
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 18px', background: '#1a120a', borderBottom: '1px solid #5a4226', flexShrink: 0,
    }}>
      {/* Avatar + name + bars */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 36, height: 36, border: '2px solid #c39b4e', borderRadius: 4,
          background: 'repeating-linear-gradient(45deg,#2a1d10,#2a1d10 4px,#241810 4px,#241810 8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ ...SILK, fontSize: 8, color: '#c39b4e' }}>СЛЭЙ</span>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ ...DOT, fontSize: 14, color: '#e7d8b4' }}>СЛЭЙ</span>
            <span style={{ ...MONO, fontSize: 10, color: '#a8916a' }}>наёмник · ур.{level}</span>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ ...MONO, fontSize: 9, color: '#7faf6a' }}>HP</span>
              <div style={{ width: 74, height: 6, background: '#2a1d10', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${hpPct}%`, background: isLowHp ? '#b15539' : '#7faf6a', transition: 'width 0.3s' }} />
              </div>
              <span style={{ ...VT, fontSize: 13, color: '#9ad27e', minWidth: 44 }}>{Math.floor(hp)}/{Math.floor(hpMax)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ ...MONO, fontSize: 9, color: '#6f8fb0' }}>MP</span>
              <div style={{ width: 54, height: 6, background: '#2a1d10', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${mpPct}%`, background: '#6f8fb0', transition: 'width 0.3s' }} />
              </div>
              <span style={{ ...VT, fontSize: 13, color: '#9ab8d4', minWidth: 36 }}>{Math.floor(mp)}/{Math.floor(mpMax)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ ...MONO, fontSize: 9, color: '#a8916a' }}>EXP</span>
              <div style={{ width: 34, height: 6, background: '#2a1d10', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${expPct}%`, background: '#6f8fb0', transition: 'width 0.3s' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Currencies */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <div style={lcd}><span style={{ fontSize: 13 }}>💰</span><span style={{ ...VT, fontSize: 18, color: '#e0c178' }}>{fmtNum(coins)}</span></div>
        <div style={lcd}><span style={{ fontSize: 13 }}>⛽</span><span style={{ ...VT, fontSize: 18, color: '#d98a6a' }}>{fmtNum(fuel)}</span></div>
        <div style={lcd}><span style={{ fontSize: 13 }}>📼</span><span style={{ ...VT, fontSize: 18, color: '#b8a888' }}>{fmtNum(vhs)}</span></div>
        <div style={lcd}><span style={{ fontSize: 13 }}>💎</span><span style={{ ...VT, fontSize: 18, color: '#b48fc4' }}>{fmtNum(gems)}</span></div>
        <div style={lcd}><span style={{ fontSize: 13 }}>💀</span><span style={{ ...VT, fontSize: 18, color: '#9aa0a6' }}>{fmtNum(souls)}</span></div>
      </div>
    </div>
  );
}
