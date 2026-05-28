import type { Condition, Variable, Item } from './store';

/**
 * Оценивает условие.
 * Для превью используем defaultValue переменных + простой mock state.
 */
export function evaluateCondition(
  condition: Condition | undefined,
  variables: Variable[],
  items: Item[],
  // Для превью: возвращает значение переменной (обычно defaultValue)
  getVariableValue: (variableId: string) => number | boolean | string | undefined,
  // Опциональный mock state для превью (уровень, репутация и т.д.)
  previewState: Record<string, number> = {}
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
      const current = previewState[`relationship_${condition.characterId}`] ?? 0;
      return compareValues(current, condition.operator, condition.value);
    }

    case 'reputation': {
      const current = previewState.reputation ?? 0;
      return compareValues(current, condition.operator, condition.value);
    }

    case 'playerStat': {
      const current = previewState[condition.stat] ?? 0;
      return compareValues(current, condition.operator, condition.value);
    }

    case 'resource': {
      const current = previewState[condition.resource] ?? 0;
      return compareValues(current, condition.operator, condition.value);
    }

    case 'and':
      return condition.conditions.every(c =>
        evaluateCondition(c, variables, items, getVariableValue, previewState)
      );

    case 'or':
      return condition.conditions.some(c =>
        evaluateCondition(c, variables, items, getVariableValue, previewState)
      );

    case 'not':
      return !evaluateCondition(condition.condition, variables, items, getVariableValue, previewState);

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
