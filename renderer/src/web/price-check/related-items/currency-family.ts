import { ITEMS_ITERATOR, type BaseType } from "@/assets/data";
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

const subTag = (item: BaseType, prefix: string): string | null =>
  item.tags.find((t) => t.startsWith(prefix)) ?? null;

/**
 * A currency-exchange "family": items sharing the primary `tag`, sub-divided
 * into groups by `groupKey`. A checked item shows the other members of its own
 * group, gem-ladder style. `groupKey` returns null to exclude a record — e.g.
 * the named "ancient" runes share the `rune` tag but carry no tier sub-tag, so
 * they never form a (130-strong, useless) group.
 */
interface Family {
  tag: string;
  groupKey: (item: BaseType) => string | null;
}

const FAMILIES: Family[] = [
  // Essences — tier prefix; bare prefix splits into Normal vs the 6 Special.
  {
    tag: "essence",
    groupKey: (i) => (i.tradeTag ? essenceGroup(i.tradeTag) : null),
  },
  // Soul cores — tier sub-tag (soul_core_tier1/2/3 / soul_core_vaal).
  { tag: "soul_core", groupKey: (i) => subTag(i, "soul_core_") },
  // Catalysts — two flat families (regular / refined-jewel), each shown whole.
  { tag: "catalyst", groupKey: () => "catalyst" },
  { tag: "jewel_catalyst", groupKey: () => "jewel_catalyst" },
  // Runes — tier sub-tag (rune_lesser/normal/greater/perfect); the named runes
  // carry only the bare `rune` tag → null → excluded.
  { tag: "rune", groupKey: (i) => subTag(i, "rune_") },
];

/**
 * Currency-exchange family sidebar: for a checked currency item, the other
 * members of its tier/type group, so you can read the whole group's poe.ninja
 * prices at a glance. Returns null when the item isn't a recognised family
 * member. New families plug in via the FAMILIES table above.
 */
export function currencyFamily(item: ParsedItem): FamilyRow[] | null {
  const family = FAMILIES.find(
    (f) => item.info.tags.includes(f.tag) && f.groupKey(item.info) != null,
  );
  if (!family) return null;
  const group = family.groupKey(item.info);

  const rows: FamilyRow[] = [];
  for (const rec of ITEMS_ITERATOR(`"${family.tag}"`)) {
    if (!rec.tradeTag || !rec.tags.includes(family.tag)) continue;
    if (family.groupKey(rec) !== group) continue;
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
