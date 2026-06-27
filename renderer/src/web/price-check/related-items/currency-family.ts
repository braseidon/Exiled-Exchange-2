import { ITEMS_ITERATOR } from "@/assets/data";
import { type ParsedItem } from "@/parser";

export interface FamilyRow {
  ref: string;
  name: string;
  icon: string;
  ns: string;
}

/**
 * Essences whose only tier is the base "Essence of …" — they have no
 * Lesser / Greater / Perfect variant, so they form their own group instead of
 * being lumped into the 19-element Normal group (which they'd otherwise match
 * by the bare `essence-of-*` prefix).
 */
const SPECIAL_ESSENCES = new Set([
  "delirium",
  "horror",
  "hysteria",
  "insanity",
  "the-abyss",
  "the-breach",
]);

/**
 * Group an essence by its tradeTag tier prefix. The bare `essence-of-*` prefix
 * splits again into Special (the tier-less allowlist above) vs Normal (the 19
 * elements that also have Lesser/Greater/Perfect variants). Returns null for a
 * non-essence tradeTag.
 */
function essenceGroup(tradeTag: string): string | null {
  if (tradeTag.startsWith("lesser-essence-of-")) return "lesser";
  if (tradeTag.startsWith("greater-essence-of-")) return "greater";
  if (tradeTag.startsWith("perfect-essence-of-")) return "perfect";
  const base = /^essence-of-(.+)$/.exec(tradeTag);
  if (base) return SPECIAL_ESSENCES.has(base[1]) ? "special" : "normal";
  return null;
}

/**
 * Currency-exchange "family" sidebar: for a checked currency item, the other
 * members of its tier-group, so you can read the whole group's poe.ninja prices
 * at a glance. Returns null when the item isn't a recognised family member.
 * Currently covers essences (grouped by tier — checking a Greater essence shows
 * every Greater essence); other families plug in here later.
 */
export function currencyFamily(item: ParsedItem): FamilyRow[] | null {
  const tag = item.info.tradeTag;
  if (!tag || !item.info.tags.includes("essence")) return null;
  const group = essenceGroup(tag);
  if (!group) return null;

  const rows: FamilyRow[] = [];
  for (const rec of ITEMS_ITERATOR('"tags": ["essence"]')) {
    if (!rec.tradeTag || essenceGroup(rec.tradeTag) !== group) continue;
    rows.push({
      ref: rec.refName,
      name: rec.name,
      icon: rec.icon,
      ns: rec.namespace,
    });
  }
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows.length ? rows : null;
}
