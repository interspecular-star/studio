import type { StudioPage, StudioButton } from '../types/pages';
import type { Speaker } from '../types/core';
import type { ProjectMeta } from '../types/core';
import type { Enemy, Wave } from '../types/combat';

// ── Default test enemy ─────────────────────────────────────────────────────────
// Tier 1 "Статист" balanced for naked lvl 1 hero (str:6 agi:5 end:5 mag:3 lck:4 lvl:1)
// Hero: 160 HP, 34 ATK, 13 defFlat, 6% defPct
// Enemy effective dmg: round(42*0.94-13) = 26 per signal hit → player dies in ~6 hits
// Enemy HP 90 → dies in 3 non-crit player hits — wave of 3 is the lvl 1 naked ceiling
export const DEFAULT_ENEMY_STATIST: Enemy = {
  id: 'enemy_statist',
  name: { ru: 'Статист', en: 'Extra' },
  tier: 1,
  hp: 90,
  atk: 42,
  weakPointTrigger: { ru: 'После 2 атак подряд', en: 'After 2 consecutive attacks' },
  furyReply: { ru: 'Ах ты...!', en: 'Why you...!' },
  drops: [],
};

export const DEFAULT_TEST_WAVE: Wave = {
  id: 'wave_test_01',
  name: { ru: 'Test Combat Wave', en: 'Test Combat Wave' },
  enemyPool: [{ enemyId: 'enemy_statist', weight: 1 }],
  difficulties: ['novice', 'amateur', 'professional'],
};

export const createDefaultPage = (id: string): StudioPage => ({
  id,
  title: { ru: 'Новая страница', en: 'New Page' },
  background: '',
  speaker: 'none',
  text: { ru: '', en: '' },
  buttons: [],
  showTopResourceBar: true,
  sceneType: 'exploration',
  uiWidgets: [],
  uiLayoutPreset: 'freeform',
});

const DEFAULT_PROJECT_NAME = 'Табуреткино — Акт 1';

// ── Village page ──────────────────────────────────────────────────────────────

const BUILDING_CARDS = [
  { key: 'forge',  icon: '⚒️',  nameRu: 'Кузница',  nameEn: 'Forge',    npcRu: 'Агафья', npcEn: 'Agafya', pageId: 'forge_01',  x: 2  },
  { key: 'tavern', icon: '🍺',  nameRu: 'Таверна',  nameEn: 'Tavern',   npcRu: 'Мила',   npcEn: 'Mila',   pageId: 'tavern_01', x: 21 },
  { key: 'shop',   icon: '🛒',  nameRu: 'Лавка',    nameEn: 'Shop',     npcRu: 'Сэм',    npcEn: 'Sam',    pageId: 'shop_01',   x: 40 },
  { key: 'shaman', icon: '🔮',  nameRu: 'Шаманка',  nameEn: "Shaman's", npcRu: 'Зося',   npcEn: 'Zosya',  pageId: 'shaman_01', x: 59 },
  { key: 'mine',   icon: '⛏️', nameRu: 'Шахта',    nameEn: 'Mine',     npcRu: '—',      npcEn: '—',      pageId: 'mine_01',   x: 78 },
] as const;

const villagePage = (): StudioPage => ({
  id: 'village',
  title: { ru: 'Деревня — Табуреткино', en: 'Village — Taburetkino' },
  background: '',
  speaker: 'none',
  text: { ru: '', en: '' },
  sceneType: 'exploration',
  showTopResourceBar: true,
  uiLayoutPreset: 'freeform',
  uiWidgets: [
    { id: 'vw_title', type: 'textLabel', layout: { x: 10, y: 4, width: 80, height: 10, z: 10 }, text: { ru: '🎬 ТАБУРЕТКИНО', en: '🎬 TABURETKINO' } },
  ],
  buttons: [
    // Buildings — one button each, clearly labeled
    ...BUILDING_CARDS.map(b => ({
      id: `vbtn_${b.key}`,
      text: { ru: `${b.icon} ${b.nameRu}`, en: `${b.icon} ${b.nameEn}` },
      layout: { x: b.x, y: 18, width: 17, height: 44, style: 'default' as const },
      action: { type: 'goToPage' as const, pageId: b.pageId },
    })),
    // СЪЁМКА — combat entry
    {
      id: 'vbtn_combat',
      text: { ru: '🎬  СЪЁМКА', en: '🎬  SHOOT' },
      layout: { x: 28, y: 68, width: 44, height: 14, style: 'important' as const },
      action: { type: 'goToPage' as const, pageId: 'combat_wave_select' },
    },
  ],
});

// ── Building stub pages ───────────────────────────────────────────────────────

const buildingStub = (id: string, icon: string, nameRu: string, nameEn: string, npcRu: string): StudioPage => ({
  id,
  title: { ru: nameRu, en: nameEn },
  background: '',
  speaker: 'none',
  text: { ru: '', en: '' },
  sceneType: 'dialog',
  showTopResourceBar: true,
  uiLayoutPreset: 'freeform',
  uiWidgets: [
    { id: `${id}_icon`, type: 'textLabel', layout: { x: 43, y: 20, width: 14, height: 14, z: 10 }, text: { ru: icon, en: icon } },
    { id: `${id}_name`, type: 'textLabel', layout: { x: 25, y: 35, width: 50, height: 10, z: 10 }, text: { ru: nameRu, en: nameEn } },
    { id: `${id}_npc`,  type: 'textLabel', layout: { x: 25, y: 45, width: 50, height: 7,  z: 10 }, text: { ru: npcRu,  en: npcRu   } },
    { id: `${id}_hint`, type: 'textLabel', layout: { x: 20, y: 54, width: 60, height: 6,  z: 10 }, text: { ru: '(скоро)',  en: '(coming soon)'  } },
  ],
  buttons: [
    { id: `${id}_back`, text: { ru: '← Деревня', en: '← Village' }, layout: { x: 2, y: 88, width: 22, height: 9, style: 'subtle' as const }, action: { type: 'goToPage' as const, pageId: 'village' } },
  ],
});

// ── Combat wave select stub ───────────────────────────────────────────────────

const combatWaveSelectPage = (): StudioPage => ({
  id: 'combat_wave_select',
  title: { ru: 'Выбор волны', en: 'Wave Select' },
  background: '',
  speaker: 'none',
  text: { ru: '', en: '' },
  sceneType: 'combat',
  showTopResourceBar: true,
  uiLayoutPreset: 'freeform',
  uiWidgets: [
    { id: 'cws_title', type: 'textLabel', layout: { x: 15, y: 10, width: 70, height: 12, z: 10 }, text: { ru: '🎬 СЪЁМКА', en: '🎬 SHOOT' } },
    { id: 'cws_hint',  type: 'textLabel', layout: { x: 15, y: 25, width: 70, height: 8,  z: 10 }, text: { ru: 'Выбор волны и сложности — здесь будет интерфейс боя (C2)', en: 'Wave & difficulty select — combat UI goes here (C2)' } },
  ],
  buttons: [
    { id: 'cws_back', text: { ru: '← Деревня', en: '← Village' }, layout: { x: 2, y: 88, width: 22, height: 9, style: 'subtle' as const }, action: { type: 'goToPage' as const, pageId: 'village' } },
  ],
});

export const createDefaultPages = (): StudioPage[] => [
  villagePage(),
  buildingStub('forge_01',  '⚒️',  'Кузница',  'Forge',    'Агафья'),
  buildingStub('tavern_01', '🍺',  'Таверна',  'Tavern',   'Мила'),
  buildingStub('shop_01',   '🛒',  'Лавка',    'Shop',     'Сэм'),
  buildingStub('shaman_01', '🔮',  'Шаманка',  "Shaman's", 'Зося'),
  buildingStub('mine_01',   '⛏️', 'Шахта',    'Mine',     '—'),
  combatWaveSelectPage(),
  {
    id: 'intro_01',
    title: { ru: 'Введение — Окраина Табуреткино', en: 'Introduction — Edge of Taburetkiно' },
    background: '',
    speaker: 'narrator',
    text: {
      ru: 'Ты стоишь на окраине Табуреткино. В воздухе пахнет свежим хлебом и старым магическим бензином.',
      en: 'You stand at the edge of Taburetkiно. The air smells of fresh bread and old magical gasoline.',
    },
    buttons: [
      {
        id: 'btn_tavern',
        text: { ru: 'Пойти в таверну', en: 'Go to the tavern' },
        layout: { x: 26, y: 68, width: 24, height: 11, style: 'important' },
        action: { type: 'goToPage', pageId: 'tavern_01' },
      },
      {
        id: 'btn_cave',
        text: { ru: 'Проверить пещеру', en: 'Check your cave' },
        layout: { x: 58, y: 68, width: 24, height: 11, style: 'default' },
        action: { type: 'goToPage', pageId: 'cave_01' },
      },
    ] as StudioButton[],
    uiWidgets: [],
    uiLayoutPreset: 'freeform',
  },
];

export const createInitialMeta = (): ProjectMeta => ({
  name: DEFAULT_PROJECT_NAME,
  lastSaved: null,
  schemaVersion: '1.0.0',
});

export const createDefaultSpeakers = (): Speaker[] => [
  { id: 'narrator', displayName: { ru: 'Рассказчик', en: 'Narrator' } },
  { id: 'slay',     displayName: { ru: 'Слэй',       en: 'Slay'     } },
  { id: 'mila',     displayName: { ru: 'Мила',       en: 'Mila'     } },
  { id: 'zyrk',     displayName: { ru: 'Зырк',       en: 'Zyrk'     } },
  { id: 'zosya',    displayName: { ru: 'Зося',       en: 'Zosya'    } },
  { id: 'burmil',   displayName: { ru: 'Бурмил',     en: 'Burmil'   } },
];
