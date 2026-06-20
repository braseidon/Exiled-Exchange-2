import { describe, expect, it, beforeEach } from "vitest";
import { setupTests } from "@specs/vitest.setup";
import { init } from "@/assets/data";
import { parseClipboard } from "@/parser";
import { initUiModFilters } from "@/web/price-check/filters/create-stat-filters";

// ---------------------------------------------------------------------------
// Waystone (PoE2 map) price-check should pre-select every visible map property
// (Item Rarity, Pack Size, Monster Rarity, Monster Effectiveness, Drop Chance,
// …) so the whole roll is searched at once. They are each created disabled, so
// the user had to tick all ~6-8 by hand. Hidden properties (e.g. Revives) stay
// unselected.
// ---------------------------------------------------------------------------
const WAYSTONE = `Item Class: Waystones
Rarity: Rare
Terror Control
Waystone (Tier 15)
--------
Revives Available: 0 (augmented)
Item Rarity: +29% (augmented)
Pack Size: +6% (augmented)
Monster Rarity: +18% (augmented)
Monster Effectiveness: +28% (augmented)
Waystone Drop Chance: +80% (augmented)
--------
Item Level: 80
--------
{ Suffix Modifier "of Smothering" (Tier: 1) }
Players have 37(40-36)% less Recovery Rate of Life and Energy Shield
{ Suffix Modifier "of the Prism" (Tier: 1) }
+30(30-34)% Monster Elemental Resistances
{ Suffix Modifier "Flaming" (Tier: 1) }
Area has patches of Ignited Ground
--------
Can be used in a Map Device, allowing you to enter a Map. Waystones can only be used once.
--------
Corrupted
`;

describe("waystone map-property auto-select", () => {
  beforeEach(async () => {
    setupTests();
    await init("en");
  });

  it("pre-selects every visible map property", () => {
    const res = parseClipboard(WAYSTONE);
    if (!res.isOk()) throw new Error(res.error);
    const item = res.value;

    const filters = initUiModFilters(item, {
      searchStatRange: 10,
      defaultAllSelected: false,
    });

    const expectedRefs = [
      "Map Item Rarity: #%",
      "Monster Pack Size: #",
      "Monster Rarity: #%",
      "Monster Effectiveness: #%",
      "Waystone Drop Chance: #%",
    ];

    for (const ref of expectedRefs) {
      const f = filters.find((f) => f.statRef === ref);
      expect(f, `missing property filter: ${ref}`).toBeDefined();
      expect(f!.hidden, `should be visible: ${ref}`).toBeFalsy();
      // each property is created disabled individually; auto-select flips it on
      expect(f!.disabled, `should be pre-selected: ${ref}`).toBe(false);
    }
  });
});
