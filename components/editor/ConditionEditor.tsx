'use client';

import React from 'react';

interface ConditionEditorProps {
  label: string;
  condition?: any;
  onChange: (condition?: any) => void;
  variables: any[];
  items: any[];
  quests?: any[];
  speakers?: any[];
}

export default function ConditionEditor({
  label,
  condition,
  onChange,
  variables,
  items,
  quests = [],
  speakers = [],
}: ConditionEditorProps) {
  const hasCondition = !!condition;

  const toggleCondition = () => {
    if (hasCondition) {
      onChange(undefined);
    } else {
      const firstVar =
        variables.find((v: any) => v.category === 'custom') ||
        variables.find((v: any) => v.type === 'number') ||
        variables[0];
      if (firstVar) {
        onChange({
          type: 'variable',
          variableId: firstVar.id,
          operator: firstVar.type === 'boolean' ? '==' : '>=',
          value: firstVar.type === 'boolean' ? true : firstVar.type === 'number' ? 1 : true,
        });
      } else if (quests.length > 0) {
        onChange({ type: 'questState', questId: quests[0].id, state: 'not_started' });
      } else {
        onChange({ type: 'variable', variableId: '', operator: '==', value: true });
      }
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[10px] font-medium text-[var(--studio-text-secondary)]">{label}</label>
        <button
          onClick={toggleCondition}
          className={`text-[10px] px-2 py-0.5 rounded transition ${
            hasCondition
              ? 'bg-[var(--studio-accent)] text-[#1C1814]'
              : 'border border-[var(--studio-border)] hover:bg-[var(--studio-bg-panel)]'
          }`}
        >
          {hasCondition ? 'Есть условие' : 'Всегда'}
        </button>
      </div>

      {hasCondition && (
        <div className="space-y-2 rounded border border-[var(--studio-border)] bg-[#1C1814] p-2">
          <select
            value={condition.type}
            onChange={(e) => {
              const newType = e.target.value as any;

              if (['variable', 'itemQuantity', 'relationship', 'reputation', 'playerStat', 'resource', 'questState'].includes(newType)) {
                if (newType === 'variable') {
                  const firstVar = variables.find((v: any) => v.type === 'number') || variables[0];
                  onChange({ type: 'variable', variableId: firstVar?.id || '', operator: '>=', value: firstVar?.type === 'number' ? 1 : true });
                } else if (newType === 'itemQuantity') {
                  onChange({ type: 'itemQuantity', itemId: items[0]?.id || '', operator: '>=', value: 1 });
                } else if (newType === 'relationship') {
                  onChange({ type: 'relationship', characterId: 'mila', operator: '>=', value: 0 });
                } else if (newType === 'reputation') {
                  onChange({ type: 'reputation', operator: '>=', value: 0 });
                } else if (newType === 'playerStat') {
                  onChange({ type: 'playerStat', stat: 'level', operator: '>=', value: 1 });
                } else if (newType === 'resource') {
                  onChange({ type: 'resource', resource: 'coins', operator: '>=', value: 0 });
                } else if (newType === 'questState') {
                  onChange({ type: 'questState', questId: quests[0]?.id || '', state: 'not_started' });
                }
              } else if (newType === 'and' || newType === 'or') {
                const children = condition ? [condition] : [];
                onChange({ type: newType, conditions: children });
              } else if (newType === 'not') {
                onChange({ type: 'not', condition: condition || { type: 'variable', variableId: '', operator: '>=', value: 0 } });
              }
            }}
            className="w-full rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-2 py-1 text-xs"
          >
            <option value="variable">Переменная</option>
            <option value="itemQuantity">Количество предмета</option>
            <option value="relationship">Отношения с персонажем</option>
            <option value="reputation">Репутация в городе</option>
            <option value="playerStat">Характеристика игрока</option>
            <option value="resource">Ресурс</option>
            <option value="questState">Состояние квеста</option>
            <option value="and">Группа И (AND)</option>
            <option value="or">Группа ИЛИ (OR)</option>
            <option value="not">Отрицание (NOT)</option>
          </select>

          {/* Variable */}
          {condition.type === 'variable' && (() => {
            const selVar = variables.find((v: any) => v.id === condition.variableId);
            const isBool = selVar?.type === 'boolean';
            return (
              <div className="grid grid-cols-3 gap-1">
                <select value={condition.variableId} onChange={(e) => {
                  const v = variables.find((vv: any) => vv.id === e.target.value);
                  onChange({ ...condition, variableId: e.target.value, operator: v?.type === 'boolean' ? '==' : condition.operator, value: v?.type === 'boolean' ? true : condition.value });
                }} className="rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-1 py-1 text-xs">
                  <option value="">— переменная —</option>
                  {variables.map((v: any) => <option key={v.id} value={v.id}>{v.displayName.ru}</option>)}
                </select>
                <select value={condition.operator} onChange={(e) => onChange({ ...condition, operator: e.target.value })} className="rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-1 py-1 text-xs">
                  {isBool ? (
                    <><option value="==">равно</option><option value="!=">≠</option></>
                  ) : (
                    <><option value=">=">&gt;=</option><option value="<=">&lt;=</option><option value="==">=</option><option value=">">&gt;</option><option value="<">&lt;</option><option value="!=">≠</option></>
                  )}
                </select>
                {isBool ? (
                  <select value={condition.value === true || condition.value === 1 ? 'true' : 'false'} onChange={(e) => onChange({ ...condition, value: e.target.value === 'true' })} className="rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-1 py-1 text-xs">
                    <option value="true">Да</option>
                    <option value="false">Нет</option>
                  </select>
                ) : (
                  <input type={selVar?.type === 'number' ? 'number' : 'text'} value={condition.value} onChange={(e) => { onChange({ ...condition, value: selVar?.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }); }} className="rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-2 py-1 text-xs" />
                )}
              </div>
            );
          })()}

          {/* Item Quantity */}
          {condition.type === 'itemQuantity' && (
            <div className="grid grid-cols-3 gap-1">
              <select value={condition.itemId} onChange={(e)=>onChange({...condition, itemId:e.target.value})} className="rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-1 py-1 text-xs">
                {items.length===0 && <option value="">Нет предметов</option>}
                {items.map((i:any)=><option key={i.id} value={i.id}>{i.name.ru}</option>)}
              </select>
              <select value={condition.operator} onChange={(e)=>onChange({...condition, operator:e.target.value})} className="rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-1 py-1 text-xs">
                <option value=">=">&gt;=</option><option value="<=">&lt;=</option><option value="==">=</option>
              </select>
              <input type="number" value={condition.value} onChange={(e)=>onChange({...condition, value:parseInt(e.target.value)||0})} className="rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-2 py-1 text-xs" />
            </div>
          )}

          {/* Relationship */}
          {condition.type === 'relationship' && (
            <div className="grid grid-cols-3 gap-1">
              {speakers.length > 0 ? (
                <select value={condition.characterId || ''} onChange={(e) => onChange({ ...condition, characterId: e.target.value })} className="rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-1 py-1 text-xs">
                  <option value="">— персонаж —</option>
                  {speakers.map((s: any) => <option key={s.id} value={s.id}>{s.displayName?.ru || s.id}</option>)}
                </select>
              ) : (
                <input value={condition.characterId || ''} onChange={(e)=>onChange({...condition, characterId:e.target.value})} placeholder="mila / zyrk / ..." className="rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-2 py-1 text-xs" />
              )}
              <select value={condition.operator} onChange={(e)=>onChange({...condition, operator:e.target.value})} className="rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-1 py-1 text-xs">
                <option value=">=">&gt;=</option><option value="<=">&lt;=</option><option value="==">=</option><option value="!=">≠</option>
              </select>
              <input type="number" value={condition.value} onChange={(e)=>onChange({...condition, value:parseInt(e.target.value)||0})} className="rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-2 py-1 text-xs" />
            </div>
          )}

          {/* Quest State */}
          {condition.type === 'questState' && (
            <div className="grid grid-cols-2 gap-1">
              {quests.length > 0 ? (
                <select
                  value={condition.questId || ''}
                  onChange={(e) => onChange({ ...condition, questId: e.target.value })}
                  className="rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-1 py-1 text-xs"
                >
                  <option value="">— квест —</option>
                  {quests.map((q: any) => <option key={q.id} value={q.id}>{q.title?.ru || q.id}</option>)}
                </select>
              ) : (
                <div className="text-[10px] text-[var(--studio-text-muted)] self-center italic">Нет квестов</div>
              )}
              <select
                value={condition.state || 'not_started'}
                onChange={(e) => onChange({ ...condition, state: e.target.value })}
                className="rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-1 py-1 text-xs"
              >
                <option value="not_started">Не начат</option>
                <option value="in_progress">В процессе</option>
                <option value="completed">Завершён</option>
              </select>
            </div>
          )}

          {/* Reputation / PlayerStat / Resource */}
          {(['reputation','playerStat','resource'] as const).includes(condition.type) && (
            <div className="grid grid-cols-3 gap-1">
              {condition.type === 'playerStat' && (
                <select value={condition.stat} onChange={(e)=>onChange({...condition, stat:e.target.value})} className="rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-1 py-1 text-xs">
                  <option value="level">Уровень</option><option value="strength">Сила</option>
                </select>
              )}
              {condition.type === 'resource' && (
                <select value={condition.resource} onChange={(e)=>onChange({...condition, resource:e.target.value})} className="rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-1 py-1 text-xs">
                  <option value="coins">Монеты</option><option value="gasoline">Бензин</option><option value="gems">Драгоценности</option>
                </select>
              )}
              {condition.type === 'reputation' && <div className="text-xs text-[var(--studio-text-muted)] self-center">Репутация</div>}

              <select value={condition.operator} onChange={(e)=>onChange({...condition, operator:e.target.value})} className="rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-1 py-1 text-xs">
                <option value=">=">&gt;=</option><option value="<=">&lt;=</option><option value="==">=</option>
              </select>
              <input type="number" value={condition.value} onChange={(e)=>onChange({...condition, value:parseInt(e.target.value)||0})} className="rounded border border-[var(--studio-border)] bg-[var(--studio-bg-panel)] px-2 py-1 text-xs" />
            </div>
          )}

          {/* Logical Groups: AND / OR */}
          {(condition.type === 'and' || condition.type === 'or') && (
            <div className="space-y-2 border-l-2 border-[var(--studio-accent)] pl-3">
              <div className="text-[10px] font-medium text-[var(--studio-accent)]">
                {condition.type === 'and' ? 'И (все условия должны быть истинны)' : 'ИЛИ (хотя бы одно условие истинно)'}
              </div>

              {(condition.conditions || []).map((subCondition: any, index: number) => (
                <div key={index} className="rounded border border-[var(--studio-border)] bg-[#161310] p-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-[var(--studio-text-muted)]">Условие #{index + 1}</span>
                    <button
                      onClick={() => {
                        const newConditions = [...condition.conditions];
                        newConditions.splice(index, 1);
                        onChange({ ...condition, conditions: newConditions.length > 0 ? newConditions : undefined });
                      }}
                      className="text-[var(--studio-danger)] text-xs hover:underline"
                    >
                      Удалить
                    </button>
                  </div>
                  <ConditionEditor
                    label=""
                    condition={subCondition}
                    onChange={(updatedSub) => {
                      const newConditions = [...condition.conditions];
                      newConditions[index] = updatedSub;
                      onChange({ ...condition, conditions: newConditions });
                    }}
                    variables={variables}
                    items={items}
                    quests={quests}
                    speakers={speakers}
                  />
                </div>
              ))}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    const firstVar = variables.find((v: any) => v.type === 'number') || variables[0];
                    const newCond = firstVar
                      ? { type: 'variable', variableId: firstVar.id, operator: '>=', value: firstVar.type === 'number' ? 0 : false }
                      : { type: 'variable', variableId: '', operator: '>=', value: 0 };

                    onChange({
                      ...condition,
                      conditions: [...(condition.conditions || []), newCond],
                    });
                  }}
                  className="text-[10px] px-2 py-0.5 rounded border border-[var(--studio-border)] hover:bg-[var(--studio-bg-panel)]"
                >
                  + Условие
                </button>
                <button
                  onClick={() => {
                    onChange({
                      ...condition,
                      conditions: [...(condition.conditions || []), { type: 'and', conditions: [] }],
                    });
                  }}
                  className="text-[10px] px-2 py-0.5 rounded border border-[var(--studio-border)] hover:bg-[var(--studio-bg-panel)]"
                >
                  + Группа И
                </button>
                <button
                  onClick={() => {
                    onChange({
                      ...condition,
                      conditions: [...(condition.conditions || []), { type: 'or', conditions: [] }],
                    });
                  }}
                  className="text-[10px] px-2 py-0.5 rounded border border-[var(--studio-border)] hover:bg-[var(--studio-bg-panel)]"
                >
                  + Группа ИЛИ
                </button>
              </div>
            </div>
          )}

          {/* NOT */}
          {condition.type === 'not' && (
            <div className="border-l-2 border-[var(--studio-danger)] pl-3">
              <div className="text-[10px] text-[var(--studio-danger)] mb-1">НЕ (отрицание)</div>
              <ConditionEditor
                label=""
                condition={condition.condition}
                onChange={(updated) => onChange({ ...condition, condition: updated })}
                variables={variables}
                items={items}
                quests={quests}
                speakers={speakers}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
