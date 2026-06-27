import type { Condition, Variable, Item, ComparisonOperator, QuestStateValue } from './store';

export function evaluateCondition(
  condition: Condition | undefined,
  variables: Variable[],
  items: Item[],
  getVariableValue: (variableId: string) => number | boolean | string | undefined,
  previewState: Record<string, number> = {},
  getQuestState?: (questId: string) => QuestStateValue
): boolean {
  if (!condition) return true;

  switch (condition.type) {
    case 'variable': {
      const currentValue = getVariableValue(condition.variableId);
      if (currentValue === undefined) return false;
      return compareValues(currentValue, condition.operator, condition.value);
    }

    case 'itemQuantity': {
      const item = items.find(i => i.id === condition.itemId);
      if (!item || !item.quantityVariableId) return false;

      const currentValue = getVariableValue(item.quantityVariableId);
      if (typeof currentValue !== 'number') return false;

      return compareValues(currentValue, condition.operator, condition.value);
    }

    case 'relationship': {
      const varName = `relationship_${condition.characterId}`;
      const relVar = variables.find(v => v.name === varName);
      if (relVar) {
        const val = getVariableValue(relVar.id);
        return compareValues(typeof val === 'number' ? val : 0, condition.operator, condition.value);
      }
      const current = previewState[`relationship_${condition.characterId}`] ?? 0;
      return compareValues(current, condition.operator, condition.value);
    }

    case 'reputation': {
      const repVar = variables.find(v => v.name === 'reputation');
      if (repVar) {
        const val = getVariableValue(repVar.id);
        return compareValues(typeof val === 'number' ? val : 0, condition.operator, condition.value);
      }
      const current = previewState.reputation ?? 0;
      return compareValues(current, condition.operator, condition.value);
    }

    case 'playerStat': {
      const statVar = variables.find(v => v.name === condition.stat);
      if (statVar) {
        const val = getVariableValue(statVar.id);
        return compareValues(typeof val === 'number' ? val : 0, condition.operator, condition.value);
      }
      const current = previewState[condition.stat] ?? 0;
      return compareValues(current, condition.operator, condition.value);
    }

    case 'resource': {
      const resVar = variables.find(v => v.name === condition.resource);
      if (resVar) {
        const val = getVariableValue(resVar.id);
        return compareValues(typeof val === 'number' ? val : 0, condition.operator, condition.value);
      }
      const current = previewState[condition.resource] ?? 0;
      return compareValues(current, condition.operator, condition.value);
    }

    case 'questState': {
      if (!getQuestState) return true;
      const actual = getQuestState(condition.questId);
      return actual === condition.state;
    }

    case 'and':
      return condition.conditions.every(c =>
        evaluateCondition(c, variables, items, getVariableValue, previewState, getQuestState)
      );

    case 'or':
      return condition.conditions.some(c =>
        evaluateCondition(c, variables, items, getVariableValue, previewState, getQuestState)
      );

    case 'not':
      return !evaluateCondition(condition.condition, variables, items, getVariableValue, previewState, getQuestState);

    default:
      return true;
  }
}

function compareValues(
  current: number | boolean | string,
  operator: ComparisonOperator,
  target: number | boolean | string
): boolean {
  // Приводим к одному типу для сравнения где возможно
  if (typeof current === 'number' && typeof target === 'number') {
    switch (operator) {
      case '==': return current === target;
      case '!=': return current !== target;
      case '>':  return current > target;
      case '>=': return current >= target;
      case '<':  return current < target;
      case '<=': return current <= target;
    }
  }

  if (typeof current === 'boolean' && typeof target === 'boolean') {
    return operator === '==' ? current === target : current !== target;
  }

  // Строковое сравнение
  const c = String(current);
  const t = String(target);

  switch (operator) {
    case '==': return c === t;
    case '!=': return c !== t;
    case '>':  return c > t;
    case '>=': return c >= t;
    case '<':  return c < t;
    case '<=': return c <= t;
  }

  return false;
}
