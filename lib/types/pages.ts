import type { LocalizedString, DialogueLine } from './core';
import type { ButtonAction } from './actions';
import type { Condition } from './variables';
import type { UIWidget } from './widgets';

export type BackgroundSettings = {
  scale: number;
  offsetX: number;
  offsetY: number;
  brightness: number;
  opacity: number;
  fitMode: 'cover' | 'contain' | 'fill' | 'manual';
  parallax: {
    enabled: boolean;
    speedX: number;
    speedY: number;
    reverse: boolean;
  };
};

export type Background = {
  id: string;
  name: LocalizedString;
  url?: string;
  settings: BackgroundSettings;
  isBuiltIn?: boolean;
};

export type StudioButton = {
  id: string;
  text: LocalizedString;
  layout: {
    x: number;
    y: number;
    width: number;
    height: number;
    style: 'default' | 'important' | 'danger' | 'subtle';
  };
  action: ButtonAction;
  visibleWhen?: Condition;
  enabledWhen?: Condition;
  image?: string;
  history?: Array<{
    layout: StudioButton['layout'];
    ts: string;
    authorId?: string;
  }>;
};

export type StudioPage = {
  id: string;
  title: LocalizedString;
  background: string;
  speaker: string;
  text: LocalizedString;
  buttons: StudioButton[];
  showTopResourceBar?: boolean;
  sceneType?: 'exploration' | 'dialog' | 'combat' | 'menu';
  uiWidgets?: UIWidget[];
  uiLayoutPreset?: 'classic_vn' | 'bottom_bar' | 'left_bar' | 'full_dialogue_demo' | 'freeform' | 'custom';
  dialogueLines?: DialogueLine[];
  onEnter?: ButtonAction[];
  onDialogueEnd?: ButtonAction[];
};
