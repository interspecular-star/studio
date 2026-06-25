export type LocalizedString = {
  ru: string;
  en: string;
};

export type Speaker = {
  id: string;
  displayName: LocalizedString;
  portraitAssetId?: string;
};

export type DialogueTheme = {
  boxFill: string;
  boxStroke: string;
  boxCornerRadius: number;
  textColor: string;
  nameTagColor: string;
  fontFamily: string;
};

export const DIALOGUE_THEME_PRESETS: Record<string, DialogueTheme & { label: string }> = {
  darkFantasy: {
    label: 'Dark Fantasy',
    boxFill: 'rgba(33,29,24,0.94)',
    boxStroke: '#534B40',
    boxCornerRadius: 10,
    textColor: '#EDE4D4',
    nameTagColor: '#C5A46E',
    fontFamily: 'Arial',
  },
  lightScroll: {
    label: 'Light Scroll',
    boxFill: 'rgba(245,235,210,0.96)',
    boxStroke: '#8B6914',
    boxCornerRadius: 6,
    textColor: '#2a1a0a',
    nameTagColor: '#7a5010',
    fontFamily: 'Georgia',
  },
  cyberpunk: {
    label: 'Cyberpunk',
    boxFill: 'rgba(0,8,24,0.95)',
    boxStroke: '#00ffcc',
    boxCornerRadius: 2,
    textColor: '#d0fff8',
    nameTagColor: '#ff3366',
    fontFamily: 'Arial',
  },
  cleanWhite: {
    label: 'Clean White',
    boxFill: 'rgba(255,255,255,0.96)',
    boxStroke: '#cccccc',
    boxCornerRadius: 8,
    textColor: '#111111',
    nameTagColor: '#555555',
    fontFamily: 'Arial',
  },
};

export type DialogueLine = {
  id: string;
  text: LocalizedString;
  speaker?: string;
  portraitVariant?: string;
};

export type StudioAct = {
  id: string;
  title: string;
  color?: string;
  collapsed: boolean;
  pageIds: string[];
};

export type ProjectMeta = {
  name: string;
  lastSaved: string | null;
  schemaVersion: string;
};
