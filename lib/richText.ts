// Rich text parser and layout engine for dialogue boxes.
// Supports: **bold**, *italic*, [red/blue/green/yellow]text[/...], [pause] (stripped), [shake] (stripped, applied at box level).
// Tags can be nested: **[red]bold red[/red]**.

export type TextSegment = {
  text: string;
  bold: boolean;
  italic: boolean;
  color: string | null;
};

export type RenderedWord = {
  text: string;
  x: number;
  y: number;
  bold: boolean;
  italic: boolean;
  color: string;
};

const COLOR_MAP: Record<string, string> = {
  red: '#ff6666',
  blue: '#66aaff',
  green: '#66ff66',
  yellow: '#ffff66',
};

export function parseRichText(raw: string): TextSegment[] {
  const cleaned = raw
    .replace(/\[pause\]/g, '')
    .replace(/\[shake\]/g, '')
    .replace(/\[\/shake\]/g, '');

  const segments: TextSegment[] = [];
  let current = '';
  let bold = false;
  let italic = false;
  let color: string | null = null;

  const flush = () => {
    if (current) {
      segments.push({ text: current, bold, italic, color });
      current = '';
    }
  };

  let i = 0;
  while (i < cleaned.length) {
    // ** bold toggle
    if (cleaned[i] === '*' && cleaned[i + 1] === '*') {
      flush();
      bold = !bold;
      i += 2;
      continue;
    }
    // * italic toggle (single star only)
    if (cleaned[i] === '*') {
      flush();
      italic = !italic;
      i += 1;
      continue;
    }
    // [color] open and [/color] close tags
    let matched = false;
    for (const name of Object.keys(COLOR_MAP)) {
      const open = `[${name}]`;
      if (cleaned.startsWith(open, i)) {
        flush();
        color = COLOR_MAP[name];
        i += open.length;
        matched = true;
        break;
      }
      const close = `[/${name}]`;
      if (cleaned.startsWith(close, i)) {
        flush();
        color = null;
        i += close.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    // Unknown [tag] — skip it
    if (cleaned[i] === '[') {
      const end = cleaned.indexOf(']', i);
      if (end !== -1) { i = end + 1; continue; }
    }
    current += cleaned[i];
    i++;
  }
  flush();

  return segments.filter(s => s.text.length > 0);
}

// Returns the number of visible characters in a raw marked-up string (excluding tag syntax).
export function getVisibleLength(raw: string): number {
  const segments = parseRichText(raw);
  return segments.reduce((sum, s) => sum + s.text.length, 0);
}

// Reusable canvas context for text measurement (lazy-init, client-side only).
let _ctx: CanvasRenderingContext2D | null = null;

function measureToken(text: string, fontSize: number, bold: boolean, italic: boolean): number {
  if (typeof document === 'undefined') {
    return text.length * fontSize * (bold ? 0.62 : 0.55);
  }
  if (!_ctx) {
    const canvas = document.createElement('canvas');
    _ctx = canvas.getContext('2d');
  }
  if (!_ctx) return text.length * fontSize * 0.55;
  const weight = bold ? 'bold' : '500';
  const style = italic ? 'italic' : 'normal';
  _ctx.font = `${style} ${weight} ${fontSize}px Arial`;
  return _ctx.measureText(text).width;
}

export interface LayoutOpts {
  maxWidth: number;
  fontSize: number;
  lineHeightMultiplier: number;
  defaultColor: string;
}

export interface RichTextLayout {
  words: RenderedWord[];
  totalHeight: number;
}

// Lays out parsed segments into positioned words for canvas rendering.
// Handles automatic word-wrap and explicit \n line breaks.
export function layoutRichText(segments: TextSegment[], opts: LayoutOpts): RichTextLayout {
  const { maxWidth, fontSize, lineHeightMultiplier, defaultColor } = opts;
  const lineH = fontSize * lineHeightMultiplier;

  const words: RenderedWord[] = [];
  let curX = 0;
  let curY = 0;

  for (const seg of segments) {
    const color = seg.color ?? defaultColor;
    const { bold, italic } = seg;

    // Split by explicit newlines first
    const lines = seg.text.split('\n');
    for (let li = 0; li < lines.length; li++) {
      if (li > 0) {
        curX = 0;
        curY += lineH;
      }
      // Split into "word+trailing-space" or "pure-whitespace" tokens
      const tokens = lines[li].match(/\S+\s*|\s+/g) ?? [];
      for (const token of tokens) {
        const tw = measureToken(token, fontSize, bold, italic);
        // Wrap if token doesn't fit (but not at line start to avoid infinite loop on wide tokens)
        if (curX + tw > maxWidth && curX > 0) {
          curX = 0;
          curY += lineH;
        }
        // Skip leading whitespace-only tokens at line start
        if (curX === 0 && !token.trim()) continue;
        words.push({ text: token, x: curX, y: curY, bold, italic, color });
        curX += tw;
      }
    }
  }

  return { words, totalHeight: curY + lineH };
}
