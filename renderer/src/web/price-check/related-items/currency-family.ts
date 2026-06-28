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

/** Omens split by source: Abyss (this allowlist) vs Ritual (everything else). */
const ABYSS_OMENS = new Set([
  "omen-of-abyssal-echoes",
  "omen-of-the-sovereign",
  "omen-of-the-liege",
  "omen-of-the-blackblooded",
  "omen-of-putrefaction",
  "omen-of-light",
  "omen-of-sinistral-necromancy",
  "omen-of-dextral-necromancy",
]);

/**
 * PoE1 leftover omens still in the data but absent from the PoE2 currency
 * exchange (confirmed in-game 2026-06-27). Kept out of the Ritual group so it
 * matches what's actually tradeable. (`uhtreds-omen` is excluded for free — it
 * isn't an `omen-of-*` name.)
 */
const LEGACY_OMENS = new Set([
  "omen-of-corruption",
  "omen-of-homogenising-coronation",
  "omen-of-homogenising-exaltation",
]);

function omenGroup(tradeTag: string): string | null {
  if (!tradeTag.startsWith("omen-of-")) return null;
  if (LEGACY_OMENS.has(tradeTag)) return null;
  return ABYSS_OMENS.has(tradeTag) ? "abyss" : "ritual";
}

const subTag = (item: BaseType, prefix: string): string | null =>
  item.tags.find((t) => t.startsWith(prefix)) ?? null;

/**
 * A currency-exchange "family": `scan` is an ndjson substring (good entropy)
 * that finds candidate members, `match` confirms membership, and `groupKey`
 * sub-divides them — returning null to exclude a record (e.g. the named runes,
 * which share the `rune` tag but carry no tier sub-tag, or legacy omens). A
 * checked item shows the other members of its own group, gem-ladder style.
 */
interface Family {
  scan: string;
  match: (item: BaseType) => boolean;
  groupKey: (item: BaseType) => string | null;
}

/** Most families are identified by a single tag carried in the `tags` array. */
const byTag = (tag: string): Pick<Family, "scan" | "match"> => ({
  scan: `"${tag}"`,
  match: (i) => i.tags.includes(tag),
});

const FAMILIES: Family[] = [
  // Essences — tier prefix; bare prefix splits into Normal vs the 6 Special.
  {
    ...byTag("essence"),
    groupKey: (i) => (i.tradeTag ? essenceGroup(i.tradeTag) : null),
  },
  // Soul cores — tier sub-tag (soul_core_tier1/2/3 / soul_core_vaal).
  { ...byTag("soul_core"), groupKey: (i) => subTag(i, "soul_core_") },
  // Catalysts — two flat families (regular / refined-jewel), each shown whole.
  { ...byTag("catalyst"), groupKey: () => "catalyst" },
  { ...byTag("jewel_catalyst"), groupKey: () => "jewel_catalyst" },
  // Runes — tier sub-tag (rune_lesser/normal/greater/perfect); the named runes
  // carry only the bare `rune` tag → null → excluded.
  { ...byTag("rune"), groupKey: (i) => subTag(i, "rune_") },
  // Idols — one flat group; the in-game Idol Stash Tab groups only by icon (no
  // usable text split), so show them all together (two-column, like the omens).
  { ...byTag("idol"), groupKey: () => "idol" },
  // Omens — no `tags`, so key on the tradeTag prefix; split Abyss vs Ritual.
  {
    scan: "omen-of-",
    match: (i) => i.tradeTag?.startsWith("omen-of-") ?? false,
    groupKey: (i) => (i.tradeTag ? omenGroup(i.tradeTag) : null),
  },
];

/**
 * Currency-exchange family sidebar: for a checked currency item, the other
 * members of its tier/type group, so you can read the whole group's poe.ninja
 * prices at a glance. Returns null when the item isn't a recognised family
 * member. New families plug in via the FAMILIES table above.
 */
export function currencyFamily(item: ParsedItem): FamilyRow[] | null {
  const family = FAMILIES.find(
    (f) => f.match(item.info) && f.groupKey(item.info) != null,
  );
  if (!family) return null;
  const group = family.groupKey(item.info);

  const rows: FamilyRow[] = [];
  for (const rec of ITEMS_ITERATOR(family.scan)) {
    if (!rec.tradeTag || !family.match(rec)) continue;
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
