export type ButtonAction =
  | { type: 'goToPage'; pageId: string }
  | { type: 'startQuest'; questId: string }

  | { type: 'setVariable'; variableId: string; value: number | boolean | string }
  | { type: 'addToVariable'; variableId: string; amount: number }
  | { type: 'subtractFromVariable'; variableId: string; amount: number }

  | { type: 'giveItem'; itemId: string; amount: number }
  | { type: 'removeItem'; itemId: string; amount: number }

  | { type: 'changeRelationship'; characterId: string; delta: number }
  | { type: 'changeReputation'; delta: number }
  | { type: 'changePlayerStat'; stat: 'level' | 'strength'; delta: number }

  | { type: 'giveResource'; resource: 'coins' | 'gasoline' | 'gems'; amount: number }
  | { type: 'removeResource'; resource: 'coins' | 'gasoline' | 'gems'; amount: number }

  | { type: 'openInventory' }
  | { type: 'showItemReward'; items: Array<{ itemId: string; amount: number }>; afterCollect?: ButtonAction[] }
  | { type: 'advanceDialogue' }

  | { type: 'setWidgetProperty'; pageId: string; widgetId: string; key: string; value: any }
  | { type: 'setPortraitVariant'; pageId?: string; widgetId?: string; variant: string }
  | { type: 'setIntensity'; value: number | 'delta'; delta?: number };
