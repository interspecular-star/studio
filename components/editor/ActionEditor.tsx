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
    else if (newType === 'showItemReward') newAction = { type: 'showItemReward', items: [{ itemId: items[0]?.id || '', amount: 1 }] };
    else if (newType === 'advanceDialogue') newAction = { type: 'advanceDialogue' };
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
        <optgroup label="Ресурсы">
          <option value="giveResource">Выдать ресурс</option>
          <option value="removeResource">Забрать ресурс</option>
        </optgroup>
        <optgroup label="Интерфейс">
          <option value="openInventory">Открыть инвентарь</option>
          <option value="showItemReward">Показать награду</option>
          <option value="advanceDialogue">Продвинуть диалог</option>
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

      {(type === 'setVariable' || type === 'addToVariable' || type === 'subtractFromVariable') && (() => {
        const selectedVar = variables.find((v: any) => v.id === action.variableId);
        const isBool = selectedVar?.type === 'boolean';
        return (
          <div className="grid grid-cols-2 gap-2">
            <select value={action.variableId || ''} onChange={(e) => onChange({ ...action, variableId: e.target.value })} className={selectCls}>
              <option value="">— переменная —</option>
              {variables.map((v: any) => <option key={v.id} value={v.id}>{v.displayName.ru}</option>)}
            </select>
            {type === 'setVariable' && isBool ? (
              <select value={action.value === true || action.value === 1 ? 'true' : 'false'} onChange={(e) => onChange({ ...action, value: e.target.value === 'true' })} className={selectCls}>
                <option value="true">Да (true)</option>
                <option value="false">Нет (false)</option>
              </select>
            ) : (
              <input type="number" value={action.amount ?? action.value ?? 0} onChange={(e) => onChange({ ...action, ...(type === 'setVariable' ? { value: parseFloat(e.target.value) || 0 } : { amount: parseFloat(e.target.value) || 0 }) })} className={selectCls} />
            )}
          </div>
        );
      })()}

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

      {(type === 'giveResource' || type === 'removeResource') && (
        <div className="grid grid-cols-2 gap-2">
          <select value={action.resource || 'coins'} onChange={(e) => onChange({ ...action, resource: e.target.value })} className={selectCls}>
            <option value="coins">Монеты</option>
            <option value="gasoline">Бензин</option>
            <option value="gems">Кристаллы</option>
          </select>
          <input type="number" value={action.amount || 1} onChange={(e) => onChange({ ...action, amount: parseInt(e.target.value) || 1 })} className={selectCls} />
        </div>
      )}

      {type === 'openInventory' && (
        <p className="text-xs text-[var(--studio-text-muted)] italic">
          Откроет модальное окно инвентаря с манекеном и ячейками.
        </p>
      )}

      {type === 'advanceDialogue' && (
        <p className="text-xs text-[var(--studio-text-muted)] italic leading-snug">
          1-й клик запускает реплики диалога, последующие — переключают строки. После последней реплики срабатывают действия «Конец диалога» страницы.
        </p>
      )}

      {type === 'showItemReward' && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-[var(--studio-text-muted)] italic">Предметы для отображения в модалке награды:</p>
          {(action.items || []).map((entry: any, i: number) => (
            <div key={i} className="grid grid-cols-[1fr_60px_auto] gap-1 items-center">
              <select
                value={entry.itemId || ''}
                onChange={(e) => {
                  const next = [...action.items];
                  next[i] = { ...entry, itemId: e.target.value };
                  onChange({ ...action, items: next });
                }}
                className={selectCls}
              >
                <option value="">— предмет —</option>
                {items.map((it: any) => <option key={it.id} value={it.id}>{it.name?.ru || it.id}</option>)}
              </select>
              <input
                type="number"
                min={1}
                value={entry.amount ?? 1}
                onChange={(e) => {
                  const next = [...action.items];
                  next[i] = { ...entry, amount: parseInt(e.target.value) || 1 };
                  onChange({ ...action, items: next });
                }}
                className={selectCls}
              />
              <button
                onClick={() => {
                  const next = [...action.items];
                  next.splice(i, 1);
                  onChange({ ...action, items: next });
                }}
                className="text-[var(--studio-danger,#ef4444)] text-xs px-1 hover:underline"
              >✕</button>
            </div>
          ))}
          <button
            onClick={() => onChange({ ...action, items: [...(action.items || []), { itemId: items[0]?.id || '', amount: 1 }] })}
            className="w-full text-[10px] px-2 py-1 border border-dashed border-[var(--studio-border)] rounded hover:border-[var(--studio-accent)] text-[var(--studio-text-muted)] hover:text-[var(--studio-accent)] transition-colors"
          >
            + Предмет
          </button>

          {/* afterCollect — действия при нажатии "Получить" */}
          <div className="border-t border-[var(--studio-border)] pt-1.5 mt-1">
            <p className="text-[10px] text-[var(--studio-text-muted)] italic mb-1">При нажатии «Получить»:</p>
            {(action.afterCollect || []).map((ac: any, i: number) => (
              <div key={i} className="mb-1.5 rounded border border-[var(--studio-border)] bg-[#161310] p-1.5 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-[var(--studio-text-muted)] font-mono">#{i + 1}</span>
                  <button
                    onClick={() => {
                      const next = [...(action.afterCollect || [])];
                      next.splice(i, 1);
                      onChange({ ...action, afterCollect: next });
                    }}
                    className="text-[9px] text-[var(--studio-danger,#ef4444)] hover:underline"
                  >✕</button>
                </div>
                <ActionEditor
                  action={ac}
                  onChange={(updated: any) => {
                    const next = [...(action.afterCollect || [])];
                    next[i] = updated;
                    onChange({ ...action, afterCollect: next });
                  }}
                  variables={variables}
                  items={items}
                  widgets={widgets}
                />
              </div>
            ))}
            <button
              onClick={() => onChange({ ...action, afterCollect: [...(action.afterCollect || []), { type: 'setVariable', variableId: variables[0]?.id || '', value: true }] })}
              className="w-full text-[10px] px-2 py-1 border border-dashed border-[var(--studio-border)] rounded hover:border-[var(--studio-accent)] text-[var(--studio-text-muted)] hover:text-[var(--studio-accent)] transition-colors"
            >
              + Действие после получения
            </button>
          </div>
        </div>
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
