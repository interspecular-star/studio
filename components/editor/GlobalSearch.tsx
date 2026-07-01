'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useStudioStore } from '@/lib/store';

type ResultItem = {
  id: string;
  label: string;
  sub: string;
  icon: string;
  kind: 'page' | 'variable' | 'item' | 'quest' | 'npc';
  action: () => void;
};

interface Props {
  onClose: () => void;
}

export default function GlobalSearch({ onClose }: Props) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLDivElement>(null);

  const { pages, variables, items, quests, speakers, selectPage } = useStudioStore(s => ({
    pages:     s.pages,
    variables: s.variables,
    items:     s.items,
    quests:    s.quests,
    speakers:  s.speakers,
    selectPage: s.selectPage,
  }));

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const q = query.toLowerCase().trim();

  const results = useMemo<ResultItem[]>(() => {
    if (!q) return [];
    const out: ResultItem[] = [];

    pages.forEach(p => {
      const title = p.title?.ru ?? p.id;
      const en    = p.title?.en ?? '';
      if (p.id.includes(q) || title.toLowerCase().includes(q) || en.toLowerCase().includes(q)) {
        out.push({
          id: `page:${p.id}`,
          label: title,
          sub: p.id,
          icon: p.protected ? '🔒' : '📄',
          kind: 'page',
          action: () => { selectPage(p.id); onClose(); },
        });
      }
    });

    variables.forEach((v: any) => {
      const name = v.displayName?.ru ?? v.name;
      if (v.name.includes(q) || name.toLowerCase().includes(q)) {
        out.push({
          id: `var:${v.id}`,
          label: name,
          sub: `переменная · ${v.type} · ${v.name}`,
          icon: v.type === 'boolean' ? '🔘' : v.type === 'string' ? '🔤' : '🔢',
          kind: 'variable',
          action: () => onClose(),
        });
      }
    });

    items.forEach((item: any) => {
      const name = item.name?.ru ?? item.id;
      if (item.id.includes(q) || name.toLowerCase().includes(q)) {
        out.push({
          id: `item:${item.id}`,
          label: name,
          sub: `предмет · ${item.rarity ?? ''} · ${item.id}`,
          icon: '🎒',
          kind: 'item',
          action: () => onClose(),
        });
      }
    });

    (quests ?? []).forEach((quest: any) => {
      const title = quest.title?.ru ?? quest.id;
      if (quest.id.includes(q) || title.toLowerCase().includes(q)) {
        out.push({
          id: `quest:${quest.id}`,
          label: title,
          sub: `квест · ${quest.id}`,
          icon: '📜',
          kind: 'quest',
          action: () => onClose(),
        });
      }
    });

    (speakers ?? []).forEach((spk: any) => {
      const name = spk.displayName?.ru ?? spk.id;
      if (spk.id.includes(q) || name.toLowerCase().includes(q)) {
        out.push({
          id: `npc:${spk.id}`,
          label: name,
          sub: `персонаж · ${spk.id}`,
          icon: '🗣️',
          kind: 'npc',
          action: () => onClose(),
        });
      }
    });

    return out.slice(0, 20);
  }, [q, pages, variables, items, quests, speakers, selectPage, onClose]);

  useEffect(() => { setCursor(0); }, [results.length]);

  const commit = (item: ResultItem) => item.action();

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    if (e.key === 'Enter' && results[cursor]) commit(results[cursor]);
  };

  useEffect(() => {
    const el = listRef.current?.children[cursor] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const KIND_COLOR: Record<string, string> = {
    page: '#6f8fb0', variable: '#e0c178', item: '#b48fc4', quest: '#7faf6a', npc: '#cf8a5a',
  };
  const KIND_LABEL: Record<string, string> = {
    page: 'стр', variable: 'var', item: 'item', quest: 'квест', npc: 'npc',
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col items-center pt-[18vh]"
      style={{ background: 'rgba(8,5,3,0.72)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-xl rounded-xl overflow-hidden shadow-2xl"
        style={{ background: '#1e1509', border: '1px solid #5a4226' }}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid #2a1d10' }}>
          <span className="text-lg">🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Поиск страниц, переменных, предметов, квестов…"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: '#ecdcc0', fontFamily: 'var(--font-body, system-ui)', caretColor: '#c39b4e' }}
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#2a1d10', color: '#a8916a', border: '1px solid #3a2c18' }}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto">
          {results.length === 0 && q && (
            <div className="px-4 py-6 text-center text-sm" style={{ color: '#6e5e44' }}>
              Ничего не найдено по «{query}»
            </div>
          )}
          {results.length === 0 && !q && (
            <div className="px-4 py-6 text-center text-sm" style={{ color: '#6e5e44' }}>
              Начни вводить — найдём страницу, переменную, предмет или квест
            </div>
          )}
          {results.map((r, i) => (
            <div
              key={r.id}
              onClick={() => commit(r)}
              className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors"
              style={{ background: i === cursor ? '#2a1d10' : 'transparent', borderLeft: i === cursor ? '2px solid #c39b4e' : '2px solid transparent' }}
              onMouseEnter={() => setCursor(i)}
            >
              <span className="text-base w-5 text-center flex-shrink-0">{r.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: '#ecdcc0' }}>{r.label}</div>
                <div className="text-[10px] truncate" style={{ color: '#6e5e44' }}>{r.sub}</div>
              </div>
              <span
                className="text-[9px] px-1.5 py-0.5 rounded font-bold flex-shrink-0"
                style={{ background: KIND_COLOR[r.kind] + '22', color: KIND_COLOR[r.kind], border: `1px solid ${KIND_COLOR[r.kind]}44` }}
              >
                {KIND_LABEL[r.kind]}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="px-4 py-2 flex items-center gap-4 text-[10px]" style={{ borderTop: '1px solid #2a1d10', color: '#6e5e44' }}>
            <span><kbd style={{ background: '#2a1d10', border: '1px solid #3a2c18', borderRadius: 3, padding: '1px 4px' }}>↑↓</kbd> навигация</span>
            <span><kbd style={{ background: '#2a1d10', border: '1px solid #3a2c18', borderRadius: 3, padding: '1px 4px' }}>Enter</kbd> перейти</span>
            <span className="ml-auto">{results.length} результатов</span>
          </div>
        )}
      </div>
    </div>
  );
}
