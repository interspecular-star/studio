'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStudioStore } from '@/lib/store';
import type { ButtonAction } from '@/lib/types/actions';

// ── Speaker catalogue ──────────────────────────────────────────────────────────
const SPK_DATA: Record<string, { color: string; emoji: string }> = {
  narrator: { color: '#9a8a6e', emoji: '📜' },
  slay:     { color: '#c39b4e', emoji: '⚔️'  },
  mila:     { color: '#c47a93', emoji: '🍺'  },
  zyrk:     { color: '#7faf6a', emoji: '⛏️' },
  zosya:    { color: '#b48fc4', emoji: '🔮'  },
  burmil:   { color: '#d6a24e', emoji: '🎩'  },
  ksenia:   { color: '#cf8a5a', emoji: '📮'  },
};
const DEFAULT_SPK = { color: '#a8916a', emoji: '💬' };

const VT:   React.CSSProperties = { fontFamily: 'var(--font-vt, VT323, monospace)',         lineHeight: 1 };
const DOT:  React.CSSProperties = { fontFamily: 'var(--font-dot, DotGothic16, sans-serif)' };
const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono, Space Mono, monospace)' };

const TW_INTERVAL_MS = 28;  // typewriter speed (ms per char)
const PUNCT_PAUSE    = 160; // extra pause on . , ! ? (ms)

// ── CSS injected once ──────────────────────────────────────────────────────────
const NOVEL_CSS = `
@keyframes nh-cursor { 0%,45%{ opacity:1; } 55%,100%{ opacity:0; } }
@keyframes nh-pop    { 0%{ transform:scale(0.85); opacity:0; } 60%{ transform:scale(1.06); } 100%{ transform:scale(1); opacity:1; } }
@keyframes nh-slidein{ 0%{ transform:translateY(10px); opacity:0; } 100%{ transform:translateY(0); opacity:1; } }
`;

// ── Managed page IDs — NovelHUD stays silent for these ────────────────────────
const MANAGED = new Set([
  'village', 'war_path', 'combat_results',
  'tavern_01', 'forge_01', 'shop_01', 'shaman_01', 'mine_01', 'office_01', 'bureau_01',
]);

// ── Helpers ────────────────────────────────────────────────────────────────────
function isPunct(ch: string) { return '.!?,;:…'.includes(ch); }

// ── Main component ─────────────────────────────────────────────────────────────
export default function NovelHUD() {
  const {
    selectedPageId, pages, speakers, playtestState, mode, executeAction,
  } = useStudioStore(useShallow(s => ({
    selectedPageId:  s.selectedPageId,
    pages:           s.pages,
    speakers:        s.speakers,
    playtestState:   s.playtestState,
    mode:            s.mode,
    executeAction:   s.executeAction,
  })));

  const currentPage = pages.find((p: any) => p.id === selectedPageId);

  // ── Guard conditions ──────────────────────────────────────────────────────
  const show = (
    mode === 'playtest' &&
    currentPage &&
    currentPage.speaker &&
    currentPage.speaker !== 'none' &&
    !MANAGED.has(selectedPageId ?? '')
  );

  // ── Dialogue state ────────────────────────────────────────────────────────
  const dlLines     = currentPage?.dialogueLines ?? [];
  const dlStarted   = playtestState.dialogueStarted ?? false;
  const dlIndex     = playtestState.dialogueLineIndex ?? 0;
  const isLastLine  = dlLines.length === 0 || dlIndex >= dlLines.length - 1;

  // Resolve current speaker + text
  const currentLine = dlLines.length > 0 ? dlLines[Math.min(dlIndex, dlLines.length - 1)] : null;
  const activeSpeakerId: string = (currentLine?.speaker || currentPage?.speaker || 'narrator') as string;
  const spkDef    = SPK_DATA[activeSpeakerId] ?? DEFAULT_SPK;
  const spkObj    = (speakers as any[]).find((s: any) => s.id === activeSpeakerId);
  const spkName   = spkObj?.displayName?.ru ?? activeSpeakerId;
  const rawText   = currentLine?.text?.ru ?? currentPage?.text?.ru ?? '';
  const pageButtons: any[] = currentPage?.buttons ?? [];

  // ── Typewriter ────────────────────────────────────────────────────────────
  const [displayLen, setDisplayLen] = useState(0);
  const [cursorOn,   setCursorOn]   = useState(true);
  const twRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cursorRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pauseRef = useRef(false);
  const pauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopTw = useCallback(() => {
    if (twRef.current) clearTimeout(twRef.current);
    if (pauseTimer.current) clearTimeout(pauseTimer.current);
    pauseRef.current = false;
  }, []);

  const runTw = useCallback((text: string, startIdx = 0) => {
    stopTw();
    if (startIdx >= text.length) { setDisplayLen(text.length); return; }
    const step = (idx: number) => {
      setDisplayLen(idx + 1);
      if (idx + 1 >= text.length) return;
      const ch = text[idx];
      const delay = isPunct(ch) ? PUNCT_PAUSE : TW_INTERVAL_MS;
      twRef.current = setTimeout(() => step(idx + 1), delay);
    };
    twRef.current = setTimeout(() => step(startIdx), TW_INTERVAL_MS);
  }, [stopTw]);

  // Reset + restart typewriter when page or dialogue line changes
  useEffect(() => {
    setDisplayLen(0);
    runTw(rawText, 0);
    return stopTw;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPageId, dlIndex, dlStarted]);

  // Cursor blink
  useEffect(() => {
    cursorRef.current = setInterval(() => setCursorOn(v => !v), 530);
    return () => { if (cursorRef.current) clearInterval(cursorRef.current); };
  }, []);

  const twDone = displayLen >= rawText.length;

  // Skip typewriter or advance
  const handleAdvance = useCallback(() => {
    if (!twDone) {
      stopTw();
      setDisplayLen(rawText.length);
      return;
    }
    if (!isLastLine || dlLines.length > 0) {
      executeAction({ type: 'advanceDialogue' });
    }
  }, [twDone, isLastLine, dlLines.length, rawText.length, stopTw, executeAction]);

  // Space / Enter shortcut
  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleAdvance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [show, handleAdvance]);

  // ── Choice buttons logic ───────────────────────────────────────────────────
  // Show choice buttons when on last line + text done
  const choiceButtons = pageButtons.filter((b: any) => b.action?.type !== 'advanceDialogue');
  const showChoices  = twDone && isLastLine && choiceButtons.length > 0;
  const showNextBtn  = !showChoices;

  const handleBtn = useCallback((action: ButtonAction) => {
    executeAction(action);
  }, [executeAction]);

  if (!show) return null;

  const displayed = rawText.slice(0, displayLen);

  return (
    <>
      <style>{NOVEL_CSS}</style>

      {/* Full-width bottom HUD — 196px tall */}
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 25,
          height: 196,
          background: 'linear-gradient(180deg,rgba(26,19,11,0.0) 0%, rgba(26,19,11,0.86) 12%, #1a130b 28%)',
          borderTop: '1px solid #5a4226',
          display: 'flex',
          gap: 0,
          animation: 'nh-slidein 0.25s ease-out',
        }}
        onClick={e => {
          // Click on backdrop (not a button) → advance
          if ((e.target as HTMLElement).closest('button')) return;
          handleAdvance();
        }}
      >
        {/* ── LEFT: Avatar + name ─────────────────────────────────────────── */}
        <div style={{ flexShrink: 0, width: 164, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 20, gap: 8 }}>
          {/* Portrait ring */}
          <div
            key={activeSpeakerId}
            style={{
              width: 84, height: 84, borderRadius: '50%',
              border: `2.5px solid ${spkDef.color}`,
              background: `radial-gradient(circle, ${spkDef.color}22 0%, #1a130b 70%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 20px ${spkDef.color}44`,
              animation: 'nh-pop 0.3s ease-out',
            }}
          >
            <span style={{ fontSize: 38 }}>{spkDef.emoji}</span>
          </div>
          {/* Speaker name */}
          <span style={{ ...DOT, fontSize: 13, color: spkDef.color, textAlign: 'center', lineHeight: 1.1, maxWidth: 140 }}>
            {spkName}
          </span>
        </div>

        {/* ── CENTER: Dialogue text ────────────────────────────────────────── */}
        <div
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
            paddingBottom: 22, paddingTop: 14, paddingRight: 16,
            borderLeft: `2px solid ${spkDef.color}55`,
            paddingLeft: 20,
          }}
        >
          {/* Progress indicator if multi-line */}
          {dlLines.length > 1 && (
            <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
              {dlLines.map((_: any, i: number) => (
                <div
                  key={i}
                  style={{
                    width: 18, height: 3, borderRadius: 1.5,
                    background: i <= dlIndex ? spkDef.color : '#3a2c18',
                  }}
                />
              ))}
            </div>
          )}

          {/* Text body */}
          <div
            style={{
              fontSize: 15, lineHeight: 1.7, color: '#ecdcc0',
              fontFamily: 'Hanken Grotesk, system-ui, sans-serif',
              overflowWrap: 'break-word',
              minHeight: 60,
            }}
          >
            {displayed}
            {/* Blinking cursor while typing */}
            {!twDone && (
              <span
                style={{ color: spkDef.color, fontWeight: 700, opacity: cursorOn ? 1 : 0 }}
              >▌</span>
            )}
          </div>

          {/* «Done» spark when text finished + no choices */}
          {twDone && showNextBtn && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              {isLastLine && choiceButtons.length === 0 ? (
                <span style={{ ...MONO, fontSize: 10, color: spkDef.color + '80' }}>[ ПРОБЕЛ / ENTER ]</span>
              ) : (
                <span
                  style={{ ...MONO, fontSize: 10, color: spkDef.color, opacity: cursorOn ? 1 : 0.3 }}
                >▼ продолжить</span>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT: "далее" button or choice buttons ─────────────────────── */}
        <div
          style={{
            flexShrink: 0, width: 220, display: 'flex', flexDirection: 'column',
            alignItems: 'stretch', justifyContent: 'flex-end',
            paddingBottom: 20, paddingTop: 14, paddingRight: 20, paddingLeft: 12,
            gap: 7,
          }}
        >
          {showChoices ? (
            <>
              {/* Choice header */}
              <div style={{ ...MONO, fontSize: 9, color: '#8a724a', letterSpacing: 1, marginBottom: 2 }}>▷ ВЫБОР</div>
              {choiceButtons.slice(0, 4).map((btn: any, i: number) => (
                <button
                  key={btn.id ?? i}
                  onClick={e => { e.stopPropagation(); handleBtn(btn.action); }}
                  style={{
                    cursor: 'pointer',
                    padding: '9px 14px',
                    background: 'linear-gradient(180deg,#2f2114,#1c130b)',
                    border: `1px solid ${spkDef.color}88`,
                    borderRadius: 7,
                    color: '#ecdcc0',
                    fontFamily: 'Hanken Grotesk, system-ui, sans-serif',
                    fontSize: 13,
                    textAlign: 'left',
                    lineHeight: 1.3,
                    animation: `nh-pop ${0.2 + i * 0.08}s ease-out`,
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = spkDef.color;
                    (e.currentTarget as HTMLElement).style.background = 'linear-gradient(180deg,#3a2a12,#2a1d0e)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = spkDef.color + '88';
                    (e.currentTarget as HTMLElement).style.background = 'linear-gradient(180deg,#2f2114,#1c130b)';
                  }}
                >
                  <span style={{ color: spkDef.color, marginRight: 6 }}>{i + 1}.</span>
                  {btn.text?.ru ?? '…'}
                </button>
              ))}
            </>
          ) : (
            /* "Далее" / skip button */
            <button
              onClick={e => { e.stopPropagation(); handleAdvance(); }}
              style={{
                cursor: 'pointer', marginTop: 'auto',
                padding: '12px 18px',
                background: twDone
                  ? `linear-gradient(180deg,#3a2a12,#241810)`
                  : 'transparent',
                border: `1px solid ${twDone ? spkDef.color : spkDef.color + '33'}`,
                borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.2s',
                boxShadow: twDone ? `0 0 16px ${spkDef.color}33` : 'none',
              }}
            >
              <span style={{ ...DOT, fontSize: 15, color: twDone ? '#ffe9a8' : spkDef.color + '66' }}>
                {twDone
                  ? (isLastLine ? 'ЗАКРЫТЬ ✦' : 'ДАЛЕЕ ▶')
                  : '…'
                }
              </span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}
