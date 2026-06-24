'use client';

import { useStudioStore } from '@/lib/store';

export default function ItemRewardModal() {
  const { playtestState, collectItemReward, items } = useStudioStore();
  const reward = playtestState.itemRewardModal;

  if (!reward) return null;

  const resolved = reward.items.map(({ itemId, amount }) => ({
    item: items.find(i => i.id === itemId),
    itemId,
    amount,
  }));

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 rounded-xl border border-[var(--studio-border)] bg-[#1C1814] px-8 py-6 shadow-2xl min-w-[260px] max-w-[400px]">
        <div className="text-sm font-semibold text-[var(--studio-accent)] tracking-wider">ПОЛУЧЕНО</div>

        <div className="flex flex-wrap justify-center gap-3">
          {resolved.map(({ item, itemId, amount }, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className="w-14 h-14 rounded-lg border border-[var(--studio-border)] bg-[#161310] flex items-center justify-center overflow-hidden">
                {item?.icon ? (
                  <img src={item.icon} alt={item.name?.ru || itemId} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-2xl opacity-40">📦</span>
                )}
              </div>
              <div className="text-center">
                <div className="text-[11px] text-[var(--studio-text-primary)]">{item?.name?.ru || itemId}</div>
                {amount > 1 && (
                  <div className="text-[10px] text-[var(--studio-accent)]">× {amount}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={collectItemReward}
          className="mt-1 rounded-lg bg-[var(--studio-accent)] px-6 py-2 text-sm font-semibold text-[#1C1814] hover:brightness-110 active:brightness-90 transition-all"
        >
          Получить
        </button>
      </div>
    </div>
  );
}
