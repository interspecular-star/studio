'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { ItemType, ItemRarity, EquipmentSlot, ItemRarityLabels, ItemTypeLabels, EquipmentSlotLabels } from '@/lib/store';

interface ItemCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (item: Omit<any, 'id'>) => void;
  variables: any[];
  items: any[];
}

export default function ItemCreationModal({ isOpen, onClose, onCreate, variables, items }: ItemCreationModalProps) {
  const [form, setForm] = useState({
    nameRu: 'Новый предмет',
    nameEn: 'New Item',
    descriptionRu: '',
    descriptionEn: '',
    type: 'misc' as ItemType,
    rarity: 'common' as ItemRarity,
    isEquippable: false,
    slot: null as EquipmentSlot | null,
    price: 0,
    maxDurability: 100,
    durability: 100,
    weaponDamage: 0,
    defenseValue: 0,
    icon: '',
    quantityVariableId: '',
    modifiers: [] as { statId: string; value: number }[],
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newItem: any = {
      name: { ru: form.nameRu, en: form.nameEn },
      description: { ru: form.descriptionRu, en: form.descriptionEn },
      type: form.type,
      rarity: form.rarity,
      isEquippable: form.isEquippable,
      slot: form.isEquippable ? form.slot : null,
      price: form.price,
      maxDurability: form.maxDurability,
      durability: form.durability,
      weaponDamage: form.weaponDamage || undefined,
      defenseValue: form.defenseValue || undefined,
      icon: form.icon || undefined,
      quantityVariableId: form.quantityVariableId || undefined,
      modifiers: form.modifiers.length > 0 ? form.modifiers : undefined,
    };

    onCreate(newItem);
    onClose();

    // Reset form
    setForm({
      nameRu: 'Новый предмет',
      nameEn: 'New Item',
      descriptionRu: '',
      descriptionEn: '',
      type: 'misc',
      rarity: 'common',
      isEquippable: false,
      slot: null,
      price: 0,
      maxDurability: 100,
      durability: 100,
      weaponDamage: 0,
      defenseValue: 0,
      icon: '',
      quantityVariableId: '',
      modifiers: [],
    });
  };

  const addModifier = () => {
    setForm(prev => ({
      ...prev,
      modifiers: [...prev.modifiers, { statId: variables[0]?.id || '', value: 1 }],
    }));
  };

  const updateModifier = (index: number, field: 'statId' | 'value', value: string | number) => {
    setForm(prev => {
      const newMods = [...prev.modifiers];
      newMods[index] = { ...newMods[index], [field]: value };
      return { ...prev, modifiers: newMods };
    });
  };

  const removeModifier = (index: number) => {
    setForm(prev => ({
      ...prev,
      modifiers: prev.modifiers.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80">
      <div className="w-[720px] max-w-[95vw] max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--studio-border)] bg-[#1C1814] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--studio-border)] bg-[#161310] px-6 py-4">
          <span className="text-lg font-semibold tracking-tight">Создать предмет</span>
          <button onClick={onClose} className="rounded p-1 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Names */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--studio-text-secondary)] mb-1">Название (РУ)</label>
              <input
                value={form.nameRu}
                onChange={(e) => setForm({ ...form, nameRu: e.target.value })}
                className="w-full rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--studio-text-secondary)] mb-1">Name (EN)</label>
              <input
                value={form.nameEn}
                onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                className="w-full rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] px-3 py-2 text-sm"
                required
              />
            </div>
          </div>

          {/* Descriptions */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--studio-text-secondary)] mb-1">Описание (РУ)</label>
              <textarea
                value={form.descriptionRu}
                onChange={(e) => setForm({ ...form, descriptionRu: e.target.value })}
                className="w-full h-20 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] px-3 py-2 text-sm resize-y"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--studio-text-secondary)] mb-1">Description (EN)</label>
              <textarea
                value={form.descriptionEn}
                onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
                className="w-full h-20 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] px-3 py-2 text-sm resize-y"
              />
            </div>
          </div>

          {/* Type & Rarity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--studio-text-secondary)] mb-1">Тип</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as ItemType })}
                className="w-full rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] px-3 py-2 text-sm"
              >
                {Object.entries(ItemTypeLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--studio-text-secondary)] mb-1">Редкость</label>
              <select
                value={form.rarity}
                onChange={(e) => setForm({ ...form, rarity: e.target.value as ItemRarity })}
                className="w-full rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] px-3 py-2 text-sm"
              >
                {Object.entries(ItemRarityLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Equippable */}
          <div className="flex items-center gap-3">
            <label className="text-sm">Можно экипировать</label>
            <input
              type="checkbox"
              checked={form.isEquippable}
              onChange={(e) => setForm({ ...form, isEquippable: e.target.checked })}
              className="h-4 w-4"
            />
          </div>

          {form.isEquippable && (
            <div>
              <label className="block text-xs font-medium text-[var(--studio-text-secondary)] mb-1">Слот</label>
              <select
                value={form.slot || ''}
                onChange={(e) => setForm({ ...form, slot: (e.target.value || null) as EquipmentSlot | null })}
                className="w-full rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] px-3 py-2 text-sm"
              >
                <option value="">Выберите слот</option>
                {Object.entries(EquipmentSlotLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Combat stats */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--studio-text-secondary)] mb-1">Урон оружия</label>
              <input type="number" value={form.weaponDamage} onChange={(e) => setForm({ ...form, weaponDamage: parseInt(e.target.value) || 0 })} className="w-full rounded border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--studio-text-secondary)] mb-1">Защита</label>
              <input type="number" value={form.defenseValue} onChange={(e) => setForm({ ...form, defenseValue: parseInt(e.target.value) || 0 })} className="w-full rounded border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--studio-text-secondary)] mb-1">Прочность</label>
              <input type="number" value={form.durability} onChange={(e) => setForm({ ...form, durability: parseInt(e.target.value) || 0 })} className="w-full rounded border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--studio-text-secondary)] mb-1">Макс. прочность</label>
              <input type="number" value={form.maxDurability} onChange={(e) => setForm({ ...form, maxDurability: parseInt(e.target.value) || 0 })} className="w-full rounded border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] px-2 py-1 text-sm" />
            </div>
          </div>

          {/* Price & Icon */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--studio-text-secondary)] mb-1">Цена</label>
              <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })} className="w-full rounded border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--studio-text-secondary)] mb-1">Путь к иконке</label>
              <input
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                placeholder="/icons/sword.png"
                className="w-full rounded border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] px-2 py-1 text-sm font-mono"
              />
            </div>
          </div>

          {/* Quantity variable */}
          <div>
            <label className="block text-xs font-medium text-[var(--studio-text-secondary)] mb-1">Переменная для количества (опционально)</label>
            <select
              value={form.quantityVariableId}
              onChange={(e) => setForm({ ...form, quantityVariableId: e.target.value })}
              className="w-full rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] px-3 py-2 text-sm"
            >
              <option value="">Нет</option>
              {variables.filter((v: any) => v.type === 'number').map((v: any) => (
                <option key={v.id} value={v.id}>{v.displayName.ru}</option>
              ))}
            </select>
          </div>

          {/* Modifiers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-[var(--studio-text-secondary)]">Модификаторы статов</label>
              <button type="button" onClick={addModifier} className="text-[10px] px-2 py-0.5 rounded bg-[var(--studio-accent)] text-[#1C1814]">+ Добавить</button>
            </div>
            {form.modifiers.map((mod, idx) => (
              <div key={idx} className="flex gap-2 mb-2 items-center">
                <select
                  value={mod.statId}
                  onChange={(e) => updateModifier(idx, 'statId', e.target.value)}
                  className="flex-1 rounded border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] px-2 py-1 text-sm"
                >
                  {variables.map((v: any) => (
                    <option key={v.id} value={v.id}>{v.displayName.ru}</option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.1"
                  value={mod.value}
                  onChange={(e) => updateModifier(idx, 'value', parseFloat(e.target.value) || 0)}
                  className="w-24 rounded border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] px-2 py-1 text-sm"
                />
                <button type="button" onClick={() => removeModifier(idx)} className="text-[var(--studio-danger)]">✕</button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--studio-border)]">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded border border-[var(--studio-border)] hover:bg-[var(--studio-bg-panel)]">Отмена</button>
            <button type="submit" className="px-4 py-2 rounded bg-[var(--studio-accent)] text-[#1C1814] font-medium hover:bg-[var(--studio-accent-hover)]">Создать предмет</button>
          </div>
        </form>
      </div>
    </div>
  );
}
