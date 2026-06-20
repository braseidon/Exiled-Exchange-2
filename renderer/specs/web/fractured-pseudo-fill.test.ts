import { describe, expect, it, beforeEach } from "vitest";
import { setupTests } from "@specs/vitest.setup";
import { init } from "@/assets/data";
import { parseClipboard } from "@/parser";
import { initUiModFilters } from "@/web/price-check/filters/create-stat-filters";

// ---------------------------------------------------------------------------
// Fractured mods on RARE items ignore the fill % ("roll variance") in the
// Pseudo tab.
//
// In the Pseudo tab a fractured mod is searched as a normal *explicit* (the
// fracture itself is what the Base Item tab is for). But the perfect-roll gate
// in calculatedStatToFilter keys on the *source modifier's* type, not the
// filter's display tag — so a tier-1 fractured mod sitting at its max roll gets
// percent forced to 0 and the search pins to the exact value, even though the
// UI shows it as "explicit". A non-fractured max roll right next to it respects
// the fill %. That inconsistency is the bug.
//
// Values here are boosted by the "44% increased Effect of Suffixes" crafted mod
// (base 25 -> 36, etc.), so the rolls below are the effective post-boost values.
//
// Crit Damage Bonus is fractured + perfect (36 == effective max): at
// searchStatRange=10 the pseudo search should fill down to floor(36 * 0.9) = 32,
// not pin at 36. Crit Hit Chance is a non-fractured perfect roll (28 == max) and
// already fills to floor(28 * 0.9) = 25 — kept as a control that we didn't touch
// that path.
// ---------------------------------------------------------------------------
const FRACTURED_JEWEL = `Item Class: Jewels
Rarity: Rare
Entropy Eye
Sapphire
--------
Item Level: 22
--------
{ Prefix Modifier "Iconic" (Tier: 1) — Aura }
25(15-25)% increased Presence Area of Effect
{ Crafted Prefix Modifier "" }
44(40-60)% increased Effect of Suffixes — Unscalable Value
{ Fractured Suffix Modifier "of Gripping" (Tier: 1) — Damage, Minion, Critical — 44% Increased }
Minions have 25(15-25)% increased Critical Damage Bonus
{ Suffix Modifier "of Marshalling" (Tier: 1) — Minion, Critical — 44% Increased }
Minions have 20(10-20)% increased Critical Hit Chance
{ Desecrated Suffix Modifier "of Orchestration" (Tier: 1) — Attack, Caster, Speed, Minion — 44% Increased }
Minions have 4(2-4)% increased Attack and Cast Speed
--------
Place into an allocated Jewel Socket on the Passive Skill Tree. Right click to remove from the Socket.
--------
Fractured Item
`;

describe("fractured mod pseudo-tab fill (rare items)", () => {
  beforeEach(async () => {
    setupTests();
    await init("en");
  });

  it("fills a max-rolled fractured mod ~10% below in the pseudo tab", () => {
    const res = parseClipboard(FRACTURED_JEWEL);
    if (!res.isOk()) throw new Error(res.error);
    const item = res.value;

    const filters = initUiModFilters(item, {
      searchStatRange: 10,
      defaultAllSelected: false,
    });

    const fractured = filters.find((f) =>
      f.statRef.includes("Critical Damage Bonus"),
    );
    expect(fractured).toBeDefined();
    expect(fractured!.roll!.value).toBe(36);
    // fill: floor(36 * 0.9) = 32  (was pinned to 36 by the fractured perfect-roll gate)
    expect(fractured!.roll!.default.min).toBe(32);

    // control: the non-fractured perfect roll next to it already fills
    const explicit = filters.find((f) =>
      f.statRef.includes("Critical Hit Chance"),
    );
    expect(explicit!.roll!.value).toBe(28);
    expect(explicit!.roll!.default.min).toBe(25);
  });
});
