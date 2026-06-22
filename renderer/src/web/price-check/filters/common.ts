import { ItemCategory, ParsedItem } from "@/parser";
import { EXPLICIT_MOD_TYPES } from "@/parser/modifiers";

export function maxUsefulItemLevel(category: ItemCategory | undefined) {
  const itemLevelCaps: Partial<Record<ItemCategory, number>> = {
    [ItemCategory.Wand]: 81,
    [ItemCategory.Staff]: 81,
    [ItemCategory.Relic]: 80,
    [ItemCategory.Tablet]: 1,
    [ItemCategory.Jewel]: 1,
    [ItemCategory.Map]: 1,
  };

  const maxUsefulItemLevel = category ? (itemLevelCaps[category] ?? 82) : 82;
  return maxUsefulItemLevel;
}

export function explicitModifierCount(item: ParsedItem) {
  const randomMods = item.newMods.filter((mod) =>
    EXPLICIT_MOD_TYPES.has(mod.info.type),
  );
  if (randomMods.length === 0) {
    return { prefixes: 0, suffixes: 0, total: 0 };
  }

  const prefixes = randomMods.filter(
    (mod) => mod.info.generation === "prefix",
  ).length;
  const suffixes = randomMods.filter(
    (mod) => mod.info.generation === "suffix",
  ).length;

  return {
    prefixes,
    suffixes,
    total: prefixes + suffixes,
  };
}
