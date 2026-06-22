// Rich text parser and layout engine for dialogue boxes.
// Supported markup:
//   **bold**                — жирный
//   *italic*                — курсив
//   [red]...[/red]          — цвет (именованный: red/blue/green/yellow/purple/orange/white/gray/gold)
//   [color:#HEX]...[/color] — произвольный hex-цвет
//   [size:N]...[/size]      — размер шрифта (px)
//   [pause]                 — пауза typewriter ~450ms (удаляется из текста)
//   [shake]                 — тряска диалогового блока (удаляется, применяется на уровне box)
//   [wave]                  — волновая анимация букв (удаляется, применяется в рендерере)
// Теги можно комбинировать: **[red]жирный красный[/red]**

export type TextSegment = {
  text: string;
  bold: boolean;
  italic: boolean;
  color: string | null;
  size: number | null; // null = использовать дефолтный fontSize
};

export type RenderedWord = {
  text: string;
  x: number;
  y: number;
  bold: boolean;
  italic: boolean;
  color: string;
  size: number; // итоговый размер шрифта для этого слова
};

const COLOR_MAP: Record<string, string> = {
  red:    '#ff6666',
  blue:   '#66aaff',
  green:  '#66ff66',
  yellow: '#ffff66',
  purple: '#cc88ff',
  orange: '#ffaa44',
  white:  '#ffffff',
  gray:   '#aaaaaa',
  gold:   '#C5A46E',
};

export function parseRichText(raw: string): TextSegment[] {
  const cleaned = raw
    .replace(/\[pause\]/g, '')
    .replace(/\[shake\]/g, '')
    .replace(/\[\/shake\]/g, '')
    .replace(/\[wave\]/g, '')
    .replace(/\[\/wave\]/g, '');

  const segments: TextSegment[] = [];
  let current = '';
  let bold = false;
  let italic = false;
  let color: string | null = null;
  let size: number | null = null;

  const flush = () => {
    if (current) {
      segments.push({ text: current, bold, italic, color, size });
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
    // * italic toggle (single star, not double)
    if (cleaned[i] === '*' && cleaned[i + 1] !== '*') {
      flush();
      italic = !italic;
      i += 1;
      continue;
    }

    let matched = false;

    // [color:#HEX]...[/color]
    const hexMatch = cleaned.slice(i).match(/^\[color:(#[0-9a-fA-F]{3,8})\]/);
    if (hexMatch) {
      flush();
      color = hexMatch[1];
      i += hexMatch[0].length;
      continue;
    }
    if (cleaned.startsWith('[/color]', i)) {
      flush();
      color = null;
      i += 8;
      continue;
    }

    // [size:N]...[/size]
    const sizeMatch = cleaned.slice(i).match(/^\[size:(\d+)\]/);
    if (sizeMatch) {
      flush();
      size = parseInt(sizeMatch[1], 10);
      i += sizeMatch[0].length;
      continue;
    }
    if (cleaned.startsWith('[/size]', i)) {
      flush();
      size = null;
      i += 7;
      continue;
    }

    // Named color tags: [red]...[/red] etc.
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

    // Unknown [tag] — skip silently
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

// Количество видимых символов в размеченной строке (без тегов и маркеров).
export function getVisibleLength(raw: string): number {
  return parseRichText(raw).reduce((sum, s) => sum + s.text.length, 0);
}

// Продвигает позицию в raw-строке на `speed` ВИДИМЫХ символов,
// перепрыгивая теги и маркеры. Останавливается перед [pause].
export function advanceTypewriter(raw: string, pos: number, speed: number): number {
  let visible = 0;
  let i = pos;
  while (i < raw.length && visible < speed) {
    // Стоп перед [pause]
    if (raw[i] === '[' && raw.startsWith('[pause]', i)) break;

    // Пропускаем любой другой [тег]
    if (raw[i] === '[') {
      const end = raw.indexOf(']', i);
      if (end !== -1) { i = end + 1; continue; }
    }

    // Пропускаем ** и * маркеры
    if (raw[i] === '*') {
      i += raw[i + 1] === '*' ? 2 : 1;
      continue;
    }

    i++;
    visible++;
  }
  return i;
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

// Раскладывает сегменты в позиционированные слова для рендеринга на канвасе.
// Поддерживает автоперенос, \n, и разные размеры шрифта per-segment.
// Примечание: высота строки основана на дефолтном fontSize — слова с [size:N]
// могут немного выходить за пределы строки, что допустимо для выделений.
export function layoutRichText(segments: TextSegment[], opts: LayoutOpts): RichTextLayout {
  const { maxWidth, fontSize, lineHeightMultiplier, defaultColor } = opts;
  const lineH = fontSize * lineHeightMultiplier;

  const words: RenderedWord[] = [];
  let curX = 0;
  let curY = 0;

  for (const seg of segments) {
    const color = seg.color ?? defaultColor;
    const { bold, italic } = seg;
    const segFontSize = seg.size ?? fontSize;

    const lines = seg.text.split('\n');
    for (let li = 0; li < lines.length; li++) {
      if (li > 0) {
        curX = 0;
        curY += lineH;
      }
      const tokens = lines[li].match(/\S+\s*|\s+/g) ?? [];
      for (const token of tokens) {
        const tw = measureToken(token, segFontSize, bold, italic);
        if (curX + tw > maxWidth && curX > 0) {
          curX = 0;
          curY += lineH;
        }
        if (curX === 0 && !token.trim()) continue;
        words.push({ text: token, x: curX, y: curY, bold, italic, color, size: segFontSize });
        curX += tw;
      }
    }
  }

  return { words, totalHeight: curY + lineH };
}
