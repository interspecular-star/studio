import type { LocalizedString } from './core';
import type { ButtonAction } from './actions';
import type { Condition } from './variables';

export interface ChoiceItem {
  id: string;
  text: { ru: string; en: string };
  actions?: ButtonAction[];
  visibleWhen?: Condition;
}

export type UIWidgetType =
  | 'dialogueBox'
  | 'portrait'
  | 'choiceButton'
  | 'quickAction'
  | 'intensityBar'
  | 'textLabel'
  | 'container'
  | 'speechBubble'
  | 'inventory';

export interface UIWidget {
  id: string;
  type: UIWidgetType;
  layout: {
    x: number;
    y: number;
    width: number;
    height: number;
    z?: number;
  };
  assetId?: string;
  style?: string;
  text?: LocalizedString;
  action?: ButtonAction;
  actions?: ButtonAction[];
  visibleWhen?: Condition;
  data?: {
    speakerId?: string;
    variant?: string;
    speakerName?: string;
    textSource?: 'page' | 'custom';
    clickable?: boolean;
    linkedButtonId?: string;
    imageOnly?: boolean;
    items?: ChoiceItem[];
    count?: number;
    valueVar?: string;
    parts?: number;
    colors?: string[];
    actionType?: 'inventory' | 'map' | 'skills' | 'custom';
    setIntensity?: number;
    title?: string;
    tailDirection?: 'bottom' | 'left' | 'right' | 'none';
    cols?: number;
    rows?: number;
    showTitle?: boolean;
  };
}

export type UIAsset = {
  id: string;
  name: LocalizedString;
  type: 'buttonSkin' | 'portrait' | 'bar' | 'icon';
  url: string;
  nineSlice?: { top: number; right: number; bottom: number; left: number };
  defaultWidth?: number;
  defaultHeight?: number;
  variants?: Record<string, string>;
};
