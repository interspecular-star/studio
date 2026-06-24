import type { UIWidgetType, UIWidget } from './store';

// ─── Widget definition ────────────────────────────────────────────────────────

export type WidgetCatalogCategory =
  | 'dialogue'
  | 'choice'
  | 'media'
  | 'ui'
  | 'effects';

export interface WidgetDefinition {
  type: UIWidgetType;
  name: string;
  description: string;
  category: WidgetCatalogCategory;
  emoji: string;
  defaultLayout: UIWidget['layout'];
  defaultData?: UIWidget['data'];
  defaultText?: UIWidget['text'];
  defaultStyle?: string;
}

export const WIDGET_CATEGORY_LABELS: Record<WidgetCatalogCategory, string> = {
  dialogue: 'Диалог & текст',
  choice: 'Выбор',
  media: 'Медиа',
  ui: 'UI элементы',
  effects: 'Эффекты',
};

// ─── Catalog ──────────────────────────────────────────────────────────────────

export const WIDGET_CATALOG: WidgetDefinition[] = [
  // ── Dialogue & Text ──
  {
    type: 'dialogueBox',
    name: 'Диалоговое окно',
    description: 'Основное окно с текстом диалога и именем говорящего',
    category: 'dialogue',
    emoji: '💬',
    defaultLayout: { x: 5, y: 70, width: 90, height: 25 },
    defaultData: { speakerName: '', textSource: 'page' },
    defaultStyle: 'default',
  },
  {
    type: 'textLabel',
    name: 'Текстовый блок',
    description: 'Произвольный текст: нарратив, подсказка, аннотация',
    category: 'dialogue',
    emoji: '📝',
    defaultLayout: { x: 10, y: 10, width: 80, height: 15 },
    defaultText: { ru: 'Нарратив...', en: 'Narration...' },
    defaultStyle: 'default',
  },
  {
    type: 'speechBubble',
    name: 'Речевой пузырь',
    description: 'Пузырь речи с указателем-хвостом',
    category: 'dialogue',
    emoji: '🗯️',
    defaultLayout: { x: 20, y: 10, width: 40, height: 20 },
    defaultData: { tailDirection: 'bottom' },
    defaultText: { ru: 'Текст...', en: 'Text...' },
  },

  // ── Choice ──
  {
    type: 'choiceButton',
    name: 'Кнопки выбора',
    description: 'Ряд из 1–5 вариантов с авто-центрированием (скрытые кнопки не оставляют дырок)',
    category: 'choice',
    emoji: '🔘',
    defaultLayout: { x: 10, y: 85, width: 80, height: 8 },
    defaultData: {
      count: 2,
      items: [
        { id: 'ci_1', text: { ru: 'Выбор 1', en: 'Choice 1' }, actions: [] },
        { id: 'ci_2', text: { ru: 'Выбор 2', en: 'Choice 2' }, actions: [] },
      ],
    },
    defaultStyle: 'default',
  },
  {
    type: 'quickAction',
    name: 'Быстрое действие',
    description: 'Иконка быстрого доступа (инвентарь, карта, навыки)',
    category: 'choice',
    emoji: '⚡',
    defaultLayout: { x: 85, y: 5, width: 10, height: 10 },
    defaultData: { actionType: 'inventory' },
  },

  // ── Media ──
  {
    type: 'portrait',
    name: 'Портрет персонажа',
    description: 'Изображение говорящего персонажа',
    category: 'media',
    emoji: '🧑',
    defaultLayout: { x: 2, y: 20, width: 30, height: 55 },
    defaultData: { speakerId: '', variant: 'neutral' },
  },
  {
    type: 'container',
    name: 'Контейнер',
    description: 'Рамка-контейнер для группировки элементов',
    category: 'media',
    emoji: '🖼️',
    defaultLayout: { x: 10, y: 10, width: 80, height: 80 },
    defaultData: { title: '' },
    defaultStyle: 'default',
  },

  // ── UI ──
  {
    type: 'inventory',
    name: 'Инвентарь',
    description: 'Кнопка открытия инвентаря (с манекеном и слотами экипировки)',
    category: 'ui',
    emoji: '🎒',
    defaultLayout: { x: 40, y: 40, width: 20, height: 15 },
  },
  {
    type: 'intensityBar',
    name: 'Полоса значения',
    description: 'Визуальная шкала переменной (HP, мана, репутация)',
    category: 'ui',
    emoji: '📊',
    defaultLayout: { x: 5, y: 5, width: 30, height: 5 },
    defaultData: { valueVar: '', parts: 10, colors: ['#e74c3c', '#f39c12', '#2ecc71'] },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function catalogByCategory(): Record<WidgetCatalogCategory, WidgetDefinition[]> {
  const result = {} as Record<WidgetCatalogCategory, WidgetDefinition[]>;
  for (const cat of Object.keys(WIDGET_CATEGORY_LABELS) as WidgetCatalogCategory[]) {
    result[cat] = WIDGET_CATALOG.filter(w => w.category === cat);
  }
  return result;
}

export function makeWidgetFromDefinition(def: WidgetDefinition): Omit<UIWidget, 'id'> {
  return {
    type: def.type,
    layout: { ...def.defaultLayout },
    ...(def.defaultData ? { data: { ...def.defaultData } } : {}),
    ...(def.defaultText ? { text: { ...def.defaultText } } : {}),
    ...(def.defaultStyle ? { style: def.defaultStyle } : {}),
  };
}
