'use client';

interface ActionEditorProps {
  action: any;
  onChange: (action: any) => void;
  variables: any[];
  items: any[];
}

export default function ActionEditor({ action, onChange, variables, items }: ActionEditorProps) {
  const type = action.type;

  const changeType = (newType: string) => {
    let newAction: any = { type: newType };

    if (newType === 'goToPage') newAction = { type: 'goToPage', pageId: '' };
    else if (newType === 'startQuest') newAction = { type: 'startQuest', questId: '' };
    else if (newType === 'setVariable') newAction = { type: 'setVariable', variableId: variables[0]?.id || '', value: 0 };
    else if (newType === 'addToVariable') newAction = { type: 'addToVariable', variableId: variables[0]?.id || '', amount: 1 };
    else if (newType === 'subtractFromVariable') newAction = { type: 'subtractFromVariable', variableId: variables[0]?.id || '', amount: 1 };
    else if (newType === 'giveItem') newAction = { type: 'giveItem', itemId: items[0]?.id || '', amount: 1 };
    else if (newType === 'removeItem') newAction = { type: 'removeItem', itemId: items[0]?.id || '', amount: 1 };
    else if (newType === 'changeRelationship') newAction = { type: 'changeRelationship', characterId: 'mila', delta: 5 };
    else if (newType === 'changeReputation') newAction = { type: 'changeReputation', delta: 5 };
    else if (newType === 'changePlayerStat') newAction = { type: 'changePlayerStat', stat: 'strength', delta: 1 };
    else if (newType === 'giveResource') newAction = { type: 'giveResource', resource: 'coins', amount: 10 };
    else if (newType === 'removeResource') newAction = { type: 'removeResource', resource: 'coins', amount: 10 };
    else if (newType === 'openInventory') newAction = { type: 'openInventory' };
    else if (newType === 'setPortraitVariant') newAction = { type: 'setPortraitVariant', variant: 'angry' };
    else if (newType === 'setIntensity') newAction = { type: 'setIntensity', value: 80 };

    onChange(newAction);
  };

  return (
    <div className="space-y-2">
      <select
        value={type}
        onChange={(e) => changeType(e.target.value)}
        className="w-full rounded-md border border-[var(--studio-border)] bg-[#1C1814] px-3 py-1.5 text-sm"
      >
        <option value="goToPage">Перейти на страницу</option>
        <option value="startQuest">Начать квест</option>
        <optgroup label="Переменные">
          <option value="setVariable">Установить переменную</option>
          <option value="addToVariable">Добавить к переменной</option>
          <option value="subtractFromVariable">Вычесть из переменной</option>
        </optgroup>
        <optgroup label="Предметы">
          <option value="giveItem">Выдать предмет</option>
          <option value="removeItem">Забрать предмет</option>
        </optgroup>
        <optgroup label="Отношения / Репутация">
          <option value="changeRelationship">Изменить отношения</option>
          <option value="changeReputation">Изменить репутацию</option>
        </optgroup>
        <optgroup label="Игрок">
          <option value="changePlayerStat">Изменить стат игрока</option>
        </optgroup>
        <optgroup label="Интерфейс">
          <option value="openInventory">Открыть инвентарь</option>
        </optgroup>
        <optgroup label="UI Виджеты (диалог)">
          <option value="setPortraitVariant">Сменить вариант портрета</option>
          <option value="setIntensity">Установить накал</option>
        </optgroup>
      </select>

      {type === 'goToPage' && (
        <input
          className="w-full rounded-md border border-[var(--studio-border)] bg-[#1C1814] px-3 py-1.5 text-sm font-mono"
          placeholder="ID страницы (tavern_01)"
          value={action.pageId || ''}
          onChange={(e) => onChange({ ...action, pageId: e.target.value })}
        />
      )}

      {(type === 'setVariable' || type === 'addToVariable' || type === 'subtractFromVariable') && (
        <div className="grid grid-cols-2 gap-2">
          <select value={action.variableId || ''} onChange={(e) => onChange({ ...action, variableId: e.target.value })} className="rounded-md border border-[var(--studio-border)] bg-[#1C1814] px-2 py-1.5 text-sm">
            {variables.map((v: any) => <option key={v.id} value={v.id}>{v.displayName.ru}</option>)}
          </select>
          <input type="number" value={action.amount ?? action.value ?? 0} onChange={(e) => onChange({ ...action, ...(type === 'setVariable' ? { value: parseFloat(e.target.value) || 0 } : { amount: parseFloat(e.target.value) || 0 }) })} className="rounded-md border border-[var(--studio-border)] bg-[#1C1814] px-3 py-1.5 text-sm" />
        </div>
      )}

      {(type === 'giveItem' || type === 'removeItem') && (
        <div className="grid grid-cols-2 gap-2">
          <select value={action.itemId || ''} onChange={(e) => onChange({ ...action, itemId: e.target.value })} className="rounded-md border border-[var(--studio-border)] bg-[#1C1814] px-2 py-1.5 text-sm">
            {items.map((i: any) => <option key={i.id} value={i.id}>{i.name.ru}</option>)}
          </select>
          <input type="number" value={action.amount || 1} onChange={(e) => onChange({ ...action, amount: parseInt(e.target.value) || 1 })} className="rounded-md border border-[var(--studio-border)] bg-[#1C1814] px-3 py-1.5 text-sm" />
        </div>
      )}

      {(type === 'changeRelationship' || type === 'changeReputation' || type === 'changePlayerStat') && (
        <div className="grid grid-cols-2 gap-2">
          {type === 'changeRelationship' && <input value={action.characterId || ''} onChange={(e) => onChange({ ...action, characterId: e.target.value })} placeholder="mila" className="rounded-md border border-[var(--studio-border)] bg-[#1C1814] px-3 py-1.5 text-sm" />}
          {type === 'changePlayerStat' && <select value={action.stat || 'strength'} onChange={(e) => onChange({ ...action, stat: e.target.value })} className="rounded-md border border-[var(--studio-border)] bg-[#1C1814] px-2 py-1.5 text-sm"><option value="strength">Сила</option><option value="level">Уровень</option></select>}
          <input type="number" value={action.delta ?? 0} onChange={(e) => onChange({ ...action, delta: parseInt(e.target.value) || 0 })} className="rounded-md border border-[var(--studio-border)] bg-[#1C1814] px-3 py-1.5 text-sm" />
        </div>
      )}

      {type === 'openInventory' && (
        <p className="text-xs text-[var(--studio-text-muted)] italic">
          Откроет модальное окно инвентаря с манекеном и ячейками.
        </p>
      )}

      {type === 'setPortraitVariant' && (
        <input
          className="w-full rounded-md border border-[var(--studio-border)] bg-[#1C1814] px-3 py-1.5 text-sm"
          placeholder="variant (angry, happy...)"
          value={action.variant || ''}
          onChange={(e) => onChange({ ...action, variant: e.target.value })}
        />
      )}

      {type === 'setIntensity' && (
        <input type="number" value={action.value ?? 50} onChange={(e) => onChange({ ...action, value: parseInt(e.target.value) || 0 })} className="w-full rounded-md border border-[var(--studio-border)] bg-[#1C1814] px-3 py-1.5 text-sm" />
      )}
    </div>
  );
}
