'use client';

interface ActionEditorProps {
  action: any;
  onChange: (action: any) => void;
  variables: any[];
  items: any[];
  widgets?: any[]; // uiWidgets of current page, for widget-targeting actions
}

export default function ActionEditor({ action, onChange, variables, items, widgets = [] }: ActionEditorProps) {
  const type = action.type;

  const portraitWidgets = widgets.filter((w: any) => w.type === 'portrait');

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
    else if (newType === 'setPortraitVariant') newAction = { type: 'setPortraitVariant', variant: 'angry', widgetId: undefined };
    else if (newType === 'setIntensity') newAction = { type: 'setIntensity', value: 80 };
    else if (newType === 'setWidgetProperty') newAction = { type: 'setWidgetProperty', pageId: '', widgetId: widgets[0]?.id || '', key: 'text', value: '' };

    onChange(newAction);
  };

  // Parse value string: try JSON, fallback to string
  const parseWidgetValue = (raw: string) => {
    try { return JSON.parse(raw); } catch { return raw; }
  };

  const widgetPropertyValueStr = (v: any): string => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  };

  const inputCls = 'w-full rounded-md border border-[var(--studio-border)] bg-[#1C1814] px-3 py-1.5 text-sm';
  const selectCls = 'rounded-md border border-[var(--studio-border)] bg-[#1C1814] px-2 py-1.5 text-sm';

  return (
    <div className="space-y-2">
      <select
        value={type}
        onChange={(e) => changeType(e.target.value)}
        className={inputCls}
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
          <option value="setWidgetProperty">Изменить свойство виджета</option>
        </optgroup>
      </select>

      {type === 'goToPage' && (
        <input
          className={inputCls + ' font-mono'}
          placeholder="ID страницы (tavern_01)"
          value={action.pageId || ''}
          onChange={(e) => onChange({ ...action, pageId: e.target.value })}
        />
      )}

      {(type === 'setVariable' || type === 'addToVariable' || type === 'subtractFromVariable') && (
        <div className="grid grid-cols-2 gap-2">
          <select value={action.variableId || ''} onChange={(e) => onChange({ ...action, variableId: e.target.value })} className={selectCls}>
            {variables.map((v: any) => <option key={v.id} value={v.id}>{v.displayName.ru}</option>)}
          </select>
          <input type="number" value={action.amount ?? action.value ?? 0} onChange={(e) => onChange({ ...action, ...(type === 'setVariable' ? { value: parseFloat(e.target.value) || 0 } : { amount: parseFloat(e.target.value) || 0 }) })} className={selectCls} />
        </div>
      )}

      {(type === 'giveItem' || type === 'removeItem') && (
        <div className="grid grid-cols-2 gap-2">
          <select value={action.itemId || ''} onChange={(e) => onChange({ ...action, itemId: e.target.value })} className={selectCls}>
            {items.map((i: any) => <option key={i.id} value={i.id}>{i.name.ru}</option>)}
          </select>
          <input type="number" value={action.amount || 1} onChange={(e) => onChange({ ...action, amount: parseInt(e.target.value) || 1 })} className={selectCls} />
        </div>
      )}

      {(type === 'changeRelationship' || type === 'changeReputation' || type === 'changePlayerStat') && (
        <div className="grid grid-cols-2 gap-2">
          {type === 'changeRelationship' && <input value={action.characterId || ''} onChange={(e) => onChange({ ...action, characterId: e.target.value })} placeholder="mila" className={selectCls} />}
          {type === 'changePlayerStat' && <select value={action.stat || 'strength'} onChange={(e) => onChange({ ...action, stat: e.target.value })} className={selectCls}><option value="strength">Сила</option><option value="level">Уровень</option></select>}
          <input type="number" value={action.delta ?? 0} onChange={(e) => onChange({ ...action, delta: parseInt(e.target.value) || 0 })} className={selectCls} />
        </div>
      )}

      {type === 'openInventory' && (
        <p className="text-xs text-[var(--studio-text-muted)] italic">
          Откроет модальное окно инвентаря с манекеном и ячейками.
        </p>
      )}

      {/* === setPortraitVariant: widgetId picker + variant === */}
      {type === 'setPortraitVariant' && (
        <div className="space-y-1.5">
          {portraitWidgets.length > 0 && (
            <select
              value={action.widgetId || ''}
              onChange={(e) => onChange({ ...action, widgetId: e.target.value || undefined })}
              className={'w-full ' + selectCls}
            >
              <option value="">(авто — первый портрет)</option>
              {portraitWidgets.map((w: any) => (
                <option key={w.id} value={w.id}>
                  {w.id}{w.data?.speakerId ? ` · ${w.data.speakerId}` : ''}
                </option>
              ))}
            </select>
          )}
          <input
            className={inputCls}
            placeholder="variant (angry, happy, sad...)"
            value={action.variant || ''}
            onChange={(e) => onChange({ ...action, variant: e.target.value })}
          />
        </div>
      )}

      {/* === setIntensity: absolute or delta === */}
      {type === 'setIntensity' && (
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-xs text-[var(--studio-text-secondary)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={action.value === 'delta'}
              onChange={(e) => {
                if (e.target.checked) {
                  onChange({ ...action, value: 'delta', delta: action.delta ?? 10 });
                } else {
                  onChange({ ...action, value: typeof action.delta === 'number' ? Math.max(0, Math.min(100, action.delta)) : 50, delta: undefined });
                }
              }}
              className="accent-[var(--studio-accent)]"
            />
            Режим дельты (±)
          </label>
          {action.value === 'delta' ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={action.delta ?? 10}
                onChange={(e) => onChange({ ...action, delta: parseInt(e.target.value) || 0 })}
                className={inputCls}
                placeholder="±delta (напр. 15 или -20)"
              />
              <span className="text-xs text-[var(--studio-text-muted)] whitespace-nowrap">к текущему</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                value={typeof action.value === 'number' ? action.value : 80}
                onChange={(e) => onChange({ ...action, value: parseInt(e.target.value) || 0 })}
                className={inputCls}
              />
              <span className="text-xs text-[var(--studio-text-muted)]">0–100</span>
            </div>
          )}
        </div>
      )}

      {/* === setWidgetProperty === */}
      {type === 'setWidgetProperty' && (
        <div className="space-y-1.5">
          {widgets.length > 0 ? (
            <select
              value={action.widgetId || ''}
              onChange={(e) => onChange({ ...action, widgetId: e.target.value })}
              className={'w-full ' + selectCls}
            >
              <option value="">(выбери виджет)</option>
              {widgets.map((w: any) => (
                <option key={w.id} value={w.id}>
                  {w.type} · {w.id}
                </option>
              ))}
            </select>
          ) : (
            <input
              className={inputCls + ' font-mono'}
              placeholder="widgetId"
              value={action.widgetId || ''}
              onChange={(e) => onChange({ ...action, widgetId: e.target.value })}
            />
          )}
          <input
            className={inputCls + ' font-mono'}
            placeholder='ключ (напр. text, data.variant)'
            value={action.key || ''}
            onChange={(e) => onChange({ ...action, key: e.target.value })}
          />
          <input
            className={inputCls}
            placeholder='значение (JSON или строка, напр. {"ru":"Привет","en":"Hi"})'
            value={widgetPropertyValueStr(action.value)}
            onChange={(e) => onChange({ ...action, value: parseWidgetValue(e.target.value) })}
          />
          <p className="text-[10px] text-[var(--studio-text-muted)] italic leading-tight">
            JSON-объекты парсятся автоматически. Для текста диалога ключ = <span className="font-mono">text</span>.
          </p>
        </div>
      )}
    </div>
  );
}
