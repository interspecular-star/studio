import type { LocalizedString } from './core';

export type QuestStage = {
  id: string;
  description: LocalizedString;
};

export type Quest = {
  id: string;
  title: LocalizedString;
  description: LocalizedString;
  stages: QuestStage[];
  rewards?: Array<{ itemId: string; amount: number }>;
};
