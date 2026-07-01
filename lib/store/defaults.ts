import type { StudioPage, StudioButton } from '../types/pages';
import type { Speaker } from '../types/core';
import type { ProjectMeta } from '../types/core';
import type { Enemy, Boss, Wave } from '../types/combat';

// ── Default combat enemies ──────────────────────────────────────────────────────
// Balanced for naked lvl 1 hero: HP=100 ATK=30 defFlat=2 defPct=10%
// Each enemy dies in 3 player hits. Enemy effective dmg ≈18/hit → hero survives ~6 hits.
// Active play (dodge ~50%): ~3 mobs ceiling. Auto-battle: ~2 mobs. Matches CDD §18.

export const DEFAULT_ENEMY_STATIST: Enemy = {
  id: 'enemy_statist',
  name: { ru: 'Статист', en: 'Extra' },
  tier: 1,
  hp: 90,
  atk: 22,
  weakPointTrigger: { ru: 'После 2 атак подряд', en: 'After 2 consecutive attacks' },
  furyReply: { ru: 'Ах ты...!', en: 'Why you...!' },
  drops: [],
};

// Гоблин с Пейджером — отвлекается на входящее сообщение
export const DEFAULT_ENEMY_GOBLIN_PAGER: Enemy = {
  id: 'enemy_goblin_pager',
  name: { ru: 'Гоблин с Пейджером', en: 'Pager Goblin' },
  tier: 1,
  hp: 80,
  atk: 24,
  weakPointTrigger: { ru: 'Ждёт ответ на сообщение', en: 'Waiting for a reply' },
  furyReply: { ru: 'МНЕ НАПИСАЛИ! Я ЗЛОЙ!', en: "I GOT A MESSAGE! I'M FURIOUS!" },
  drops: [],
};

// Скелет-алкоголик — руки заняты бутылкой
export const DEFAULT_ENEMY_SKELETON_DRUNK: Enemy = {
  id: 'enemy_skeleton_drunk',
  name: { ru: 'Скелет-алкоголик', en: 'Drunk Skeleton' },
  tier: 1,
  hp: 70,
  atk: 20,
  weakPointTrigger: { ru: 'Делает глоток из бутылки', en: 'Taking a swig' },
  furyReply: { ru: 'ПОСЛЕДНЯЯ КАПЛЯ!', en: 'THE LAST DROP!' },
  drops: [],
};

// Крыса в наушниках — в глубоком фло, ничего не слышит
export const DEFAULT_ENEMY_RAT_HEADPHONES: Enemy = {
  id: 'enemy_rat_headphones',
  name: { ru: 'Крыса в наушниках', en: 'Headphone Rat' },
  tier: 1,
  hp: 60,
  atk: 18,
  weakPointTrigger: { ru: 'Кивает в такт музыке', en: 'Nodding to the beat' },
  furyReply: { ru: 'УБАВЬ ГРОМКОСТЬ!!!', en: 'TURN IT DOWN!!!' },
  drops: [],
};

// VHS-Призрак — завис на моменте перемотки
export const DEFAULT_ENEMY_VHS_GHOST: Enemy = {
  id: 'enemy_vhs_ghost',
  name: { ru: 'VHS-Призрак', en: 'VHS Ghost' },
  tier: 1,
  hp: 85,
  atk: 26,
  weakPointTrigger: { ru: 'Момент перемотки', en: 'Rewinding moment' },
  furyReply: { ru: 'Я НЕ В КАДРЕ!!!', en: "I'M NOT IN FRAME!!!" },
  drops: [],
};

// Медведь-Рэпер 2000-х — замирает на бит
export const DEFAULT_ENEMY_BEAR_RAPPER: Enemy = {
  id: 'enemy_bear_rapper',
  name: { ru: 'Медведь-Рэпер 2000-х', en: '2000s Rapper Bear' },
  tier: 2,
  hp: 110,
  atk: 28,
  weakPointTrigger: { ru: 'Замирает на бит', en: 'Freezes on the beat' },
  furyReply: { ru: 'ГОРЯЧИЙ ТРЕК!', en: 'HOT TRACK!' },
  drops: [],
};

// Холодильник-мимик — отвлекается когда открывает дверцу
export const DEFAULT_ENEMY_FRIDGE_MIMIC: Enemy = {
  id: 'enemy_fridge_mimic',
  name: { ru: 'Холодильник-мимик', en: 'Fridge Mimic' },
  tier: 2,
  hp: 130,
  atk: 24,
  weakPointTrigger: { ru: 'Открывает дверцу', en: 'Opens the door' },
  furyReply: { ru: 'ТАМ НИЧЕГО НЕТ!!!', en: "THERE'S NOTHING THERE!!!" },
  drops: [],
};

// Телевизор на курьих ножках — переключает канал, теряет концентрацию
export const DEFAULT_ENEMY_TV_CHICKEN: Enemy = {
  id: 'enemy_tv_chicken',
  name: { ru: 'Телевизор на курьих ножках', en: 'Chicken-legged TV' },
  tier: 1,
  hp: 75,
  atk: 22,
  weakPointTrigger: { ru: 'Переключает канал', en: 'Switching channels' },
  furyReply: { ru: 'СТАТИКА!!!', en: 'STATIC!!!' },
  drops: [],
};

// Зомби-диджей — переключает трек, теряет фокус
export const DEFAULT_ENEMY_ZOMBIE_DJ: Enemy = {
  id: 'enemy_zombie_dj',
  name: { ru: 'Зомби-диджей', en: 'Zombie DJ' },
  tier: 2,
  hp: 95,
  atk: 25,
  weakPointTrigger: { ru: 'Смена трека', en: 'Track change' },
  furyReply: { ru: 'ДРОПНИ БИТ!!!', en: 'DROP THE BEAT!!!' },
  drops: [],
};

// Режиссёрский Кошмар — гигантская кинокамера со щупальцами
export const DEFAULT_BOSS_DIRECTOR: Boss = {
  id: 'boss_director',
  isBoss: true,
  name: { ru: 'Режиссёрский Кошмар', en: "Director's Nightmare" },
  tier: 5,
  hp: 600,
  atk: 55,
  breakBarMax: 100,
  weakPointTrigger: { ru: 'Объектив перегревается', en: 'Lens overheats' },
  furyReply: { ru: 'СНЯТО! ТЫ УВОЛЕН!', en: "CUT! YOU'RE FIRED!" },
  furyAbility: { ru: 'Стоп-кадр: герой заморожен на 2 сек, +50% атака', en: 'Stop-frame: hero frozen 2s, +50% attack' },
  phases: [
    { hpThreshold: 60, mechanic: { ru: 'Защитный режим: урон по боссу -50%, снимается провокацией', en: 'Shield mode: -50% damage, removed by provoke' } },
    { hpThreshold: 30, mechanic: { ru: 'Ярость: Стоп-кадр каждые 20 сек, +50% атака', en: 'Fury: Stop-frame every 20s, +50% attack' } },
  ],
  drops: [],
};

export const DEFAULT_TEST_WAVE: Wave = {
  id: 'wave_test_01',
  name: { ru: 'Test Combat Wave', en: 'Test Combat Wave' },
  bossId: 'boss_director',
  enemyPool: [
    { enemyId: 'enemy_statist',        weight: 1 },
    { enemyId: 'enemy_goblin_pager',   weight: 2 },
    { enemyId: 'enemy_skeleton_drunk', weight: 2 },
    { enemyId: 'enemy_rat_headphones', weight: 2 },
    { enemyId: 'enemy_vhs_ghost',      weight: 2 },
    { enemyId: 'enemy_bear_rapper',    weight: 2 },
    { enemyId: 'enemy_fridge_mimic',   weight: 1 },
    { enemyId: 'enemy_tv_chicken',     weight: 2 },
    { enemyId: 'enemy_zombie_dj',      weight: 2 },
  ],
  difficulties: ['novice', 'amateur', 'professional', 'stuntman'],
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
  protected: true,
  title: { ru: 'Деревня — Табуреткино', en: 'Village — Taburetkino' },
  background: '',
  speaker: 'none',
  text: { ru: '', en: '' },
  sceneType: 'exploration',
  showTopResourceBar: false,
  uiLayoutPreset: 'freeform',
  uiWidgets: [],
  buttons: [],
  // Rendered as a managed React overlay (VillagePage.tsx) in playtest mode
});

// ── Building stub pages ───────────────────────────────────────────────────────

const buildingStub = (id: string, icon: string, nameRu: string, nameEn: string, npcRu: string): StudioPage => ({
  id,
  protected: true,
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

// ── War Path (pre-combat managed page) ───────────────────────────────────────

const warPathPage = (): StudioPage => ({
  id: 'war_path',
  protected: true,
  title: { ru: 'Примерочная', en: 'Dressing Room' },
  background: '',
  speaker: 'none',
  text: { ru: '', en: '' },
  sceneType: 'exploration',
  showTopResourceBar: false,
  uiLayoutPreset: 'freeform',
  uiWidgets: [],
  buttons: [],
  // Rendered as a managed React overlay (WarPathPage.tsx) in playtest mode
});

// ── Combat results — managed page shown after victory/defeat ─────────────────

const combatResultsPage = (): StudioPage => ({
  id: 'combat_results',
  protected: true,
  title: { ru: 'Итоги дубля', en: 'Take Results' },
  background: '',
  speaker: 'none',
  text: { ru: '', en: '' },
  sceneType: 'exploration',
  showTopResourceBar: false,
  uiLayoutPreset: 'freeform',
  uiWidgets: [],
  buttons: [],
  // Rendered as CombatResultsPage.tsx after combat ends
});

const tavernPage = (): StudioPage => ({
  id: 'tavern_01',
  protected: true,
  title: { ru: 'Таверна «Пьяный Табурет»', en: 'Tavern «Drunk Stool»' },
  background: '', speaker: 'none', text: { ru: '', en: '' },
  sceneType: 'dialog',
  showTopResourceBar: false,
  uiLayoutPreset: 'freeform',
  uiWidgets: [], buttons: [],
});

const forgePage = (): StudioPage => ({
  id: 'forge_01',
  protected: true,
  title: { ru: 'Кузница Агафьи', en: "Agafya's Forge" },
  background: '', speaker: 'none', text: { ru: '', en: '' },
  sceneType: 'dialog',
  showTopResourceBar: false,
  uiLayoutPreset: 'freeform',
  uiWidgets: [], buttons: [],
});

const shopPage = (): StudioPage => ({
  id: 'shop_01',
  protected: true,
  title: { ru: 'Лавка Сэма', en: "Sam's Shop" },
  background: '', speaker: 'none', text: { ru: '', en: '' },
  sceneType: 'dialog',
  showTopResourceBar: false,
  uiLayoutPreset: 'freeform',
  uiWidgets: [], buttons: [],
});

const shamanPage = (): StudioPage => ({
  id: 'shaman_01',
  protected: true,
  title: { ru: 'Логово Зоси', en: "Zosya's Lair" },
  background: '', speaker: 'none', text: { ru: '', en: '' },
  sceneType: 'dialog',
  showTopResourceBar: false,
  uiLayoutPreset: 'freeform',
  uiWidgets: [], buttons: [],
});

const cavePage = (): StudioPage => ({
  id: 'mine_01',
  protected: true,
  title: { ru: 'Пещера', en: 'The Cave' },
  background: '', speaker: 'none', text: { ru: '', en: '' },
  sceneType: 'dialog',
  showTopResourceBar: false,
  uiLayoutPreset: 'freeform',
  uiWidgets: [], buttons: [],
});

const officePage = (): StudioPage => ({
  id: 'office_01',
  protected: true,
  title: { ru: 'Контора Бурмила', en: "Burmil's Office" },
  background: '', speaker: 'none', text: { ru: '', en: '' },
  sceneType: 'dialog',
  showTopResourceBar: false,
  uiLayoutPreset: 'freeform',
  uiWidgets: [], buttons: [],
});

const bureauPage = (): StudioPage => ({
  id: 'bureau_01',
  protected: true,
  title: { ru: 'Бюро Ксении', en: "Ksenia's Bureau" },
  background: '', speaker: 'none', text: { ru: '', en: '' },
  sceneType: 'dialog',
  showTopResourceBar: false,
  uiLayoutPreset: 'freeform',
  uiWidgets: [], buttons: [],
});

export const createDefaultPages = (): StudioPage[] => [
  villagePage(),
  warPathPage(),
  combatResultsPage(),
  tavernPage(),
  forgePage(),
  shopPage(),
  shamanPage(),
  cavePage(),
  officePage(),
  bureauPage(),
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
        action: { type: 'goToPage', pageId: 'mine_01' },
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
