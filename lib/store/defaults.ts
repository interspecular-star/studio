import type { StudioPage, StudioButton } from '../types/pages';
import type { Speaker } from '../types/core';
import type { ProjectMeta } from '../types/core';

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

export const createDefaultPages = (): StudioPage[] => [
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
  {
    id: 'tavern_01',
    title: { ru: 'Таверна. Мила', en: 'The Tavern. Mila' },
    background: '',
    speaker: 'mila',
    text: {
      ru: 'Ого, Слэй... Давно не заходил. Выглядишь, будто тебя переехал грузовик. **Что случилось?** [red]Ты в порядке?[/red]',
      en: 'Well, well, Slay... Haven\'t seen you in a while. You look like you got hit by a truck. **What happened?** [red]Are you okay?[/red]',
    },
    buttons: [
      {
        id: 'btn_angry',
        text: { ru: 'Разозлить Милу', en: 'Make Mila angry' },
        layout: { x: 70, y: 85, width: 25, height: 8, style: 'danger' },
        action: { type: 'setPortraitVariant', variant: 'angry' },
      },
      {
        id: 'btn_neutral',
        text: { ru: 'Успокоить', en: 'Calm down' },
        layout: { x: 40, y: 85, width: 25, height: 8, style: 'default' },
        action: { type: 'setPortraitVariant', variant: 'neutral' },
      },
      {
        id: 'btn_int_high',
        text: { ru: 'Поднять накал', en: 'Raise intensity' },
        layout: { x: 10, y: 92, width: 20, height: 5, style: 'important' },
        action: { type: 'setIntensity', value: 85 },
      },
      {
        id: 'btn_dramatic',
        text: { ru: 'Драматический текст', en: 'Dramatic text' },
        layout: { x: 32, y: 92, width: 20, height: 5, style: 'default' },
        action: { type: 'setWidgetProperty', pageId: 'tavern_01', widgetId: 'w_dlg1', key: 'text', value: { ru: 'Ты... **предатель**! [red]Убирайся отсюда![/red]', en: 'You... **traitor**! [red]Get out of here![/red]' } },
      },
    ] as StudioButton[],
    showTopResourceBar: false,
    sceneType: 'dialog',
    uiWidgets: [
      { id: 'w_dlg1', type: 'dialogueBox', layout: { x: 16, y: 78, width: 68, height: 12, z: 20 }, style: 'default', data: { textSource: 'page' }, text: { ru: '', en: '' } },
      { id: 'w_port1', type: 'portrait', layout: { x: 75, y: 30, width: 20, height: 40, z: 5 }, data: { speakerId: 'mila' } },
      { id: 'w_port2', type: 'portrait', layout: { x: 2, y: 30, width: 20, height: 40, z: 5 }, data: { speakerId: 'slay' } },
      { id: 'w_q1', type: 'quickAction', layout: { x: 2, y: 15, width: 7, height: 7, z: 30 }, data: { actionType: 'inventory' } },
    ],
    uiLayoutPreset: 'classic_vn',
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
