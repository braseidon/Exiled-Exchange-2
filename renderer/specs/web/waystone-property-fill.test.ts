import { describe, expect, it, beforeEach } from "vitest";
import { setupTests } from "@specs/vitest.setup";
import { init } from "@/assets/data";
import { parseClipboard } from "@/parser";
import { initUiModFilters } from "@/web/price-check/filters/create-stat-filters";

// ---------------------------------------------------------------------------
// Bug #7 — waystone (PoE2 map) implicits ignore the fill % ("roll variance").
//
// Waystone properties (Item Rarity, Pack Size, Monster Rarity, …) are parsed as
// map properties (item.mapItemRarity etc.) and surfaced by filterItemProp as
// FilterTag.Property. calcPropBounds collapses their roll to min===max===value
// (no parsed range), so calculatedStatToFilter's bounds clamp pins the search to
// the exact value — the configured fill % never applies.
//
// Item Rarity rolled +28%; at searchStatRange=10 the search min should fill down
// to floor(28 * 0.9) = 25, not stay pinned at 28.
// ---------------------------------------------------------------------------
const WAYSTONE = `Item Class: Waystones
Rarity: Rare
Stained Edge
Waystone (Tier 15)
--------
Revives Available: 0 (augmented)
Item Rarity: +28% (augmented)
Pack Size: +23% (augmented)
Monster Rarity: +18% (augmented)
Waystone Drop Chance: +90% (augmented)
--------
Item Level: 82
--------
{ Prefix Modifier "Precise" (Tier: 1) }
Monsters have 32(30-40)% increased Accuracy Rating
{ Prefix Modifier "Fleeting" (Tier: 1) }
Monsters have 11(10-15)% increased Attack, Cast and Movement Speed
{ Prefix Modifier "Profane" (Tier: 1) }
Monsters deal 18(15-19)% of Damage as Extra Chaos
{ Suffix Modifier "of Buffering" (Tier: 1) }
Monsters gain 12(12-25)% of maximum Life as Extra maximum Energy Shield
{ Suffix Modifier "of Drought" (Tier: 1) }
Players gain 33(35-30)% reduced Flask Charges
{ Suffix Modifier "of Obstruction" (Tier: 1) }
Monsters take 29(26-30)% reduced Extra Damage from Critical Hits
--------
Can be used in a Map Device, allowing you to enter a Map. Waystones can only be used once.
--------
Corrupted
`;

describe("waystone map-property fill (bug #7)", () => {
  beforeEach(async () => {
    setupTests();
    await init("en");
  });

  it("fills the map Item Rarity property ~10% below the rolled value", () => {
    const res = parseClipboard(WAYSTONE);
    if (!res.isOk()) throw new Error(res.error);
    const item = res.value;

    const filters = initUiModFilters(item, {
      searchStatRange: 10,
      defaultAllSelected: false,
    });

    const rarity = filters.find((f) => f.statRef === "Map Item Rarity: #%");
    expect(rarity).toBeDefined();
    expect(rarity!.roll).toBeDefined();
    expect(rarity!.roll!.value).toBe(28);
    // fill: floor(28 * 0.9) = 25  (was pinned to 28 by the bounds clamp)
    expect(rarity!.roll!.default.min).toBe(25);
    expect(rarity!.roll!.min).toBe(25);
  });
});
