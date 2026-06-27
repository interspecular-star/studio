import type { LocalizedString } from './core';

export type VariableType = 'number' | 'boolean' | 'string';

export type VariableCategory =
  | 'player'
  | 'resources'
  | 'reputation'
  | 'relationships'
  | 'inventory'
  | 'custom';

export type Variable = {
  id: string;
  name: string;
  displayName: LocalizedString;
  type: VariableType;
  defaultValue: number | boolean | string;
  category: VariableCategory;
};

export type ComparisonOperator = '==' | '!=' | '>' | '>=' | '<' | '<=';

export type QuestStateValue = 'not_started' | 'in_progress' | 'completed';

export type Condition =
  | { type: 'variable'; variableId: string; operator: ComparisonOperator; value: number | boolean | string }
  | { type: 'itemQuantity'; itemId: string; operator: ComparisonOperator; value: number }
  | { type: 'relationship'; characterId: string; operator: ComparisonOperator; value: number }
  | { type: 'reputation'; operator: ComparisonOperator; value: number }
  | { type: 'playerStat'; stat: 'level' | 'strength'; operator: ComparisonOperator; value: number }
  | { type: 'resource'; resource: 'coins' | 'gasoline' | 'gems'; operator: ComparisonOperator; value: number }
  | { type: 'questState'; questId: string; state: QuestStateValue }
  | { type: 'and'; conditions: Condition[] }
  | { type: 'or'; conditions: Condition[] }
  | { type: 'not'; condition: Condition };
