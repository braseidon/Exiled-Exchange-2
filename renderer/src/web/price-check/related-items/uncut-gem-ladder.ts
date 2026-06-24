import { ITEMS_ITERATOR } from "@/assets/data";
import { ItemCategory, type ParsedItem } from "@/parser";

export interface UncutGemRow {
  ref: string;
  name: string;
  icon: string;
  ns: string;
  level: number;
}

const LEVEL_SUFFIX = / \(Level (\d+)\)$/;

/**
 * Uncut gems carry `Rarity: Currency`, so the parser sets `item.category` to
 * Currency, not UncutGem (same gotcha as SoulCore). Detect via the base's
 * craftable category instead. Covers all three types (Skill / Spirit / Support)
 * — they share the `UncutSkillGem` category and differ only by name.
 */
export function isUncutGem(item: ParsedItem): boolean {
  return item.info.craftable?.category === ItemCategory.UncutGem;
}

/**
 * Every level of the checked uncut gem's own type (Skill / Spirit / Support),
 * ascending and deduped. Derived from the live item data via the gem's name
 * prefix, so the level range follows patches instead of being hardcoded.
 */
export function uncutGemLadder(item: ParsedItem): UncutGemRow[] {
  if (!isUncutGem(item)) return [];
  const baseName = item.info.refName.replace(LEVEL_SUFFIX, "");
  const rows: UncutGemRow[] = [];
  const seen = new Set<number>();
  for (const rec of ITEMS_ITERATOR(`${baseName} (Level`)) {
    const m = rec.refName.match(LEVEL_SUFFIX);
    if (!m) continue;
    const level = Number(m[1]);
    if (seen.has(level)) continue;
    seen.add(level);
    rows.push({
      ref: rec.refName,
      name: rec.name,
      icon: rec.icon,
      ns: rec.namespace,
      level,
    });
  }
  rows.sort((a, b) => a.level - b.level);
  return rows;
}
