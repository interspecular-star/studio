import type { Variable } from '../types/variables';
import type { Item, EquipmentSlot } from '../types/items';

export type PlaytestSnapshot = {
  variableValues: Record<string, number | boolean | string>;
  equippedItemIds: string[];
  equippedSlots?: Partial<Record<EquipmentSlot, string>>;
  playerAvatar?: string;
};

export function getPlaytestStatValue(
  statIdOrName: string,
  variables: Variable[],
  playtestState: PlaytestSnapshot
): number {
  const byId = variables.find(v => v.id === statIdOrName);
  if (byId) {
    const live = playtestState.variableValues[byId.id];
    return typeof live === 'number' ? live : (byId.defaultValue as number) ?? 0;
  }
  const byName = variables.find(v => v.name === statIdOrName && v.category === 'player');
  if (byName) {
    const live = playtestState.variableValues[byName.id];
    return typeof live === 'number' ? live : (byName.defaultValue as number) ?? 0;
  }
  return 0;
}

export function getEquippedItems(items: Item[], equippedIds: string[]): Item[] {
  return equippedIds
    .map(id => items.find(i => i.id === id))
    .filter((i): i is Item => !!i);
}

export function getAllEquippedItemIds(
  playtestState: PlaytestSnapshot & { equippedSlots?: Partial<Record<EquipmentSlot, string>> }
): string[] {
  const legacy = playtestState.equippedItemIds || [];
  const fromSlots = Object.values(playtestState.equippedSlots || {}).filter((v): v is string => Boolean(v));
  return Array.from(new Set([...legacy, ...fromSlots]));
}

function resolvePlayerVariable(statIdOrName: string, variables: Variable[]): Variable | undefined {
  const byId = variables.find(v => v.id === statIdOrName);
  if (byId) return byId;
  return variables.find(v => v.name === statIdOrName && v.category === 'player');
}

export function getEquippedDefense(items: Item[], playtestState: PlaytestSnapshot): number {
  const allIds = getAllEquippedItemIds(playtestState);
  const equipped = getEquippedItems(items, allIds);
  return equipped.reduce((sum, item) => sum + (item.defenseValue ?? 0), 0);
}

export function canEquipItemToSlot(
  itemSlot: EquipmentSlot | null | undefined,
  targetSlot: EquipmentSlot
): boolean {
  if (!itemSlot) return false;
  if (itemSlot === 'shield') return targetSlot === 'weapon_left' || targetSlot === 'shield';
  if (itemSlot === 'one_handed_weapon') return targetSlot === 'weapon_right' || targetSlot === 'weapon_left';
  if (itemSlot === 'two_handed_weapon') return targetSlot === 'weapon_right' || targetSlot === 'weapon_left';
  return itemSlot === targetSlot;
}

export function getEffectivePlayerStat(
  statIdOrName: string,
  variables: Variable[],
  items: Item[],
  playtestState: PlaytestSnapshot
): number {
  const variable = resolvePlayerVariable(statIdOrName, variables);
  if (!variable) return 0;

  const live = playtestState.variableValues[variable.id];
  const base = typeof live === 'number' ? live : (variable.defaultValue as number) ?? 0;

  const allIds = getAllEquippedItemIds(playtestState);
  const equipped = getEquippedItems(items, allIds);

  const bonus = equipped.reduce((sum, item) => {
    const mods = item.modifiers || [];
    const relevant = mods.filter(m => m.statId === variable.id);
    return sum + relevant.reduce((s, m) => s + (m.value || 0), 0);
  }, 0);

  let total = base + bonus;
  if (variable.name === 'defense') {
    total += getEquippedDefense(items, playtestState);
  }
  return total;
}

export function getEquippedWeaponDamage(items: Item[], playtestState: PlaytestSnapshot): number {
  const allIds = getAllEquippedItemIds(playtestState);
  const equipped = getEquippedItems(items, allIds);
  return equipped.reduce((sum, item) => sum + (item.weaponDamage ?? 0), 0);
}

export function getTotalDamage(
  variables: Variable[],
  items: Item[],
  playtestState: PlaytestSnapshot
): number {
  const effectiveStrength = getEffectivePlayerStat('strength', variables, items, playtestState);
  const weaponDmg = getEquippedWeaponDamage(items, playtestState);
  return Math.max(0, effectiveStrength + weaponDmg);
}

export function getEffectiveCritChance(
  variables: Variable[],
  items: Item[],
  playtestState: PlaytestSnapshot
): number {
  return getEffectivePlayerStat('crit_chance', variables, items, playtestState);
}

export function getEffectiveCritDamage(
  variables: Variable[],
  items: Item[],
  playtestState: PlaytestSnapshot
): number {
  return getEffectivePlayerStat('crit_damage', variables, items, playtestState);
}

export function getEquippedWeaponName(items: Item[], playtestState: PlaytestSnapshot): string | null {
  const allIds = getAllEquippedItemIds(playtestState);
  const equipped = getEquippedItems(items, allIds);
  const weapon = equipped.find(i => i.type === 'weapon' || (i.weaponDamage ?? 0) > 0);
  return weapon ? weapon.name.ru : null;
}
