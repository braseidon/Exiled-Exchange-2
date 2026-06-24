import { describe, expect, it, beforeEach } from "vitest";
import { setupTests } from "@specs/vitest.setup";
import { init, ITEM_BY_REF } from "@/assets/data";
import { parseClipboard, ItemCategory } from "@/parser";

// ---------------------------------------------------------------------------
// Unpriceable idols — the "No price data" alert preconditions.
//
// Hawk/Panther/Stoat idols are the only SoulCore-category items GGG's trade API
// has no tradeTag for, and they're absent from poe.ninja too — so nothing
// reliable prices them. CheckedItem warns when:
//   item.category === SoulCore && !item.info.tradeTag && no ninja entry
//
// These parse-derived assertions guard the data invariants that trigger feeds
// on: the parser must resolve these clipboard names to the SoulCore base with
// NO tradeTag. (Rarity "Currency" sets item.category to Currency, so the signal
// is the base's craftable.category, not item.category.) If a data regen ever
// tags them (GGG fix) or recategorizes idols, these flip — a signal to revisit
// the now-stale alert. The control proves the !tradeTag clause is
// discriminating, not vacuous: a SoulCore idol that IS on the exchange (Stag)
// carries a tradeTag and would not trigger.
// ---------------------------------------------------------------------------
const PANTHER_IDOL = `Item Class: Augment
Rarity: Currency
Panther Idol
--------
Stack Size: 1/10
Idol
Limited to: 1
--------
Requires: Level 50
--------
Body Armours: +10% of Armour also applies to Chaos Damage
Sceptres: Minions have +20% to Chaos Resistance
--------
Place into an empty Augment Socket in a Body Armour or Sceptre to apply its effect to that item. Once socketed it cannot be retrieved but can be replaced by other Augment items.
`;

const HAWK_IDOL = `Item Class: Augment
Rarity: Currency
Hawk Idol
--------
Stack Size: 3/10
Idol
Limited to: 1
--------
Requires: Level 50
--------
Body Armours: 10% increased Deflection Rating
Sceptres: Companions have 12% increased Attack Speed
--------
Place into an empty Augment Socket in a Body Armour or Sceptre to apply its effect to that item. Once socketed it cannot be retrieved but can be replaced by other Augment items.
Shift click to unstack.
`;

const STOAT_IDOL = `Item Class: Augment
Rarity: Currency
Stoat Idol
--------
Stack Size: 1/10
Idol
Limited to: 1
--------
Requires: Level 50
--------
Body Armours: 5% of Damage taken bypasses Energy Shield
Sceptres: Companions have 25% increased maximum Life
--------
Place into an empty Augment Socket in a Body Armour or Sceptre to apply its effect to that item. Once socketed it cannot be retrieved but can be replaced by other Augment items.
`;

describe("unpriceable idol alert preconditions", () => {
  beforeEach(async () => {
    setupTests();
    await init("en");
  });

  it.each([
    ["Panther Idol", PANTHER_IDOL],
    ["Hawk Idol", HAWK_IDOL],
    ["Stoat Idol", STOAT_IDOL],
  ])("%s parses to a SoulCore base with no tradeTag", (_name, text) => {
    const res = parseClipboard(text);
    if (!res.isOk()) throw new Error(res.error);
    const item = res.value;

    expect(item.info.craftable?.category).toBe(ItemCategory.SoulCore);
    expect(item.info.tradeTag).toBeUndefined();
  });

  it("control: a SoulCore idol that IS on the exchange carries a tradeTag", () => {
    // Stag Idol shares the SoulCore category but has a tradeTag, so the alert's
    // `!item.info.tradeTag` clause excludes it (it routes to the exchange).
    const stag = ITEM_BY_REF("ITEM", "Stag Idol");
    expect(stag).toBeDefined();
    expect(stag![0].craftable!.category).toBe(ItemCategory.SoulCore);
    expect(stag![0].tradeTag).toBe("stag-idol");
  });
});
