import type { Condition, Variable, Item } from './store';

/**
 * Оценивает условие на основе текущего состояния переменных и предметов.
 * Это сердце будущей системы условий.
 */
export function evaluateCondition(
  condition: Condition | undefined,
  variables: Variable[],
  items: Item[],
  // Пока что quantities живут в переменных. В будущем здесь может быть отдельный inventory state.
  getVariableValue: (variableId: string) => number | boolean | string | undefined
): boolean {
  if (!condition) return true; // Нет условия = всегда выполняется

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

    case 'and':
      return condition.conditions.every(c =>
        evaluateCondition(c, variables, items, getVariableValue)
      );

    case 'or':
      return condition.conditions.some(c =>
        evaluateCondition(c, variables, items, getVariableValue)
      );

    case 'not':
      return !evaluateCondition(condition.condition, variables, items, getVariableValue);

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
