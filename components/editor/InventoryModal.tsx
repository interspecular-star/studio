'use client';

import { useStudioStore } from '@/lib/store';
import InventoryMannequin from './InventoryMannequin';
import { X } from 'lucide-react';

interface InventoryModalProps {
  onClose: () => void;
}

/**
 * Модальное окно инвентаря (Playtest)
 * 
 * Структура:
 * - Левая часть: Манекен с слотами (оружие, броня, аксессуар)
 * - Правая часть: Сетка инвентаря (пока 10 ячеек, позже зависит от Выносливости)
 */
export default function InventoryModal({ onClose }: InventoryModalProps) {
  const { 
    closeInventory, 
    playtestState 
  } = useStudioStore();

  const handleClose = () => {
    closeInventory();
    onClose?.();
  };

  // Временно жёстко 10 ячеек (как сказал пользователь)
  // В будущем: вычислять по effective endurance
  const inventorySize = 10;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70">
      <div 
        className="w-[920px] max-w-[95vw] rounded-2xl border border-[var(--studio-border)] bg-[#1C1814] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--studio-border)] bg-[#161310] px-6 py-4">
          <div>
            <span className="text-lg font-semibold tracking-tight">Инвентарь</span>
            <span className="ml-3 text-xs text-[var(--studio-text-muted)]">
              (Выносливость влияет на количество ячеек — сейчас 10)
            </span>
          </div>
          <button 
            onClick={handleClose}
            className="rounded p-1 hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex h-[555px]">
          {/* === МАНЕКЕН (левая колонка) === */}
          <div className="w-[340px] border-r border-[var(--studio-border)] p-5 flex flex-col">
            <div className="mb-2 text-sm font-medium text-[var(--studio-text-secondary)]">
              ЭКИПИРОВКА
            </div>

            <div className="flex-1 flex items-start justify-center overflow-hidden">
              <InventoryMannequin
                equippedItemIds={playtestState.equippedItemIds || []}
                onSlotClick={(slot) => {
                  console.log('Clicked slot:', slot);
                }}
              />
            </div>
          </div>

          {/* === СЕТКА ИНВЕНТАРЯ === */}
          <div className="flex-1 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm font-medium text-[var(--studio-text-secondary)]">
                РЮКЗАК
              </div>
              <div className="text-xs text-[var(--studio-text-muted)]">
                {inventorySize} ячеек
              </div>
            </div>

            {/* Сетка */}
            <div className="grid grid-cols-5 gap-2.5">
              {Array.from({ length: inventorySize }).map((_, index) => (
                <div 
                  key={index}
                  className="aspect-square w-full max-w-[62px] rounded-xl border border-[var(--studio-border)] bg-[#161310] flex items-center justify-center text-[var(--studio-text-muted)] hover:border-[var(--studio-accent)] transition-colors cursor-pointer mx-auto"
                >
                  <div className="text-[10px] opacity-30">#{index + 1}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 text-center text-xs text-[var(--studio-text-muted)]">
              Пока здесь только пустые ячейки.<br />
              Скоро появится drag &amp; drop и реальные предметы.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--studio-border)] bg-[#161310] px-6 py-3 text-right">
          <button 
            onClick={handleClose}
            className="rounded-md bg-[var(--studio-accent)] px-4 py-1.5 text-sm font-medium text-[#1C1814] hover:bg-[var(--studio-accent-hover)]"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
