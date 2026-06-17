import { describe, expect, it, beforeEach } from "vitest";
import { setupTests } from "@specs/vitest.setup";
import { init } from "@/assets/data";
import { parseClipboard } from "@/parser";
import { calculatedStatToFilter } from "@/web/price-check/filters/create-stat-filters";

// ---------------------------------------------------------------------------
// Fixture 1 — Bug 1: sub-step fill guard
//
// "# additional Rare Monsters are spawned from Abysses in Map" rolled 2, range 1–2.
// At percent=10: (2 * 10) / 100 = 0.2 < 1 → subStepFill fires → exact pin (not 1).
// The larger "Map has #% increased number of Rare Monsters" rolled 32 must still fill
// normally, proving the guard is scoped only to small-step values.
// ---------------------------------------------------------------------------
const ABYSS_TABLET_SMALL_VALUE = `Item Class: Tablet
Rarity: Rare
Celestial Instigation
Abyss Tablet
--------
Item Level: 81
--------
{ Implicit Modifier }
Adds Abysses to a Map
10 uses remaining
--------
{ Prefix Modifier "Abounding" (Tier: 1) }
Map has 20(15-20)% increased Monster Rarity
{ Prefix Modifier "Brimming" (Tier: 1) }
Map has 32(25-35)% increased number of Rare Monsters
{ Suffix Modifier "of Dark Power" (Tier: 1) }
26(20-30)% increased chance for Abyssal monsters in Map to have Abyssal Modifiers
{ Suffix Modifier "of Champions" (Tier: 1) }
2(1-2) additional Rare Monsters are spawned from Abysses in Map
--------
Can be used in a personal Map Device to add modifiers to a Map.
`;

// ---------------------------------------------------------------------------
// Fixture 2 — Bug 2: Unscalable Value pin
//
// "Abyss Pits in Map are twice as likely to have Rewards" is flagged Unscalable.
// isUnscalable fires → filter is pinned to exact roll value (-50), not percentage-filled.
// ---------------------------------------------------------------------------
const ABYSS_TABLET_UNSCALABLE = `Item Class: Tablet
Rarity: Rare
Celestial Myth
Abyss Tablet
--------
Item Level: 80
--------
{ Implicit Modifier }
Adds Abysses to a Map
10 uses remaining
--------
{ Prefix Modifier "Collector's" (Tier: 1) }
11(8-12)% increased Rarity of Items found in Map
{ Prefix Modifier "Treasurer's" (Tier: 1) }
Map contains 2(2-3) additional Rare Chests
{ Suffix Modifier "of Ossification" (Tier: 1) }
21(20-30)% increased chance for Desecrated Currency from Abysses in Map
{ Suffix Modifier "of Treasures" (Tier: 1) }
Abyss Pits in Map are twice as likely to have Rewards — Unscalable Value
--------
Can be used in a personal Map Device to add modifiers to a Map.
`;

// Ground-truth refs discovered by running fixtures through the parser:
//
// Fixture 1:
//   SMALL_VALUE_REF  value=2, min=1, max=2, dp=false, default.min=2 (pinned by subStepFill)
//   LARGE_VALUE_REF  value=32, min=25, max=35, dp=false, default.min=28 (normal fill)
//
// Fixture 2:
//   UNSCALABLE_REF   value=-50, min=-50, max=-50, dp=false, isUnscalable=true, default.min=-50 (pinned by isUnscalable)

const SMALL_VALUE_REF =
  "# additional Rare Monsters are spawned from Abysses in Map";
const LARGE_VALUE_REF = "Map has #% increased number of Rare Monsters";
const UNSCALABLE_REF = "Abyss Pits in Map are twice as likely to have Rewards";

describe("fill edge-cases — small-value & unscalable guards", () => {
  beforeEach(async () => {
    setupTests();
    await init("en");
  });

  // -------------------------------------------------------------------------
  // Bug 1 — sub-step guard: small integer stat is pinned to exact value
  // -------------------------------------------------------------------------
  it("small-value stat (value=2, 10%) is pinned to exact value, not floored to 1", () => {
    const res = parseClipboard(ABYSS_TABLET_SMALL_VALUE);
    if (!res.isOk()) throw new Error(res.error);
    const item = res.value;

    const calc = item.statsByType.find((c) => c.stat.ref === SMALL_VALUE_REF);
    expect(calc).toBeDefined();

    const filter = calculatedStatToFilter(calc!, 10, item);

    // The fix: (2 * 10) / 100 = 0.2 < 1 → subStepFill → exact pin
    expect(filter.roll).toBeDefined();
    expect(filter.roll!.value).toBe(2);
    expect(filter.roll!.default.min).toBe(2); // must NOT be 1
  });

  it("large stat on same tablet (value=32, 10%) still fills below rolled value", () => {
    const res = parseClipboard(ABYSS_TABLET_SMALL_VALUE);
    if (!res.isOk()) throw new Error(res.error);
    const item = res.value;

    const calc = item.statsByType.find((c) => c.stat.ref === LARGE_VALUE_REF);
    expect(calc).toBeDefined();

    const filter = calculatedStatToFilter(calc!, 10, item);

    // (32 * 10) / 100 = 3.2 ≥ 1 → normal fill: floor(32 * 0.9) = 28
    expect(filter.roll).toBeDefined();
    expect(filter.roll!.value).toBe(32);
    expect(filter.roll!.default.min).toBeLessThan(32); // filled, not pinned
    expect(filter.roll!.default.min).toBe(28);
  });

  // -------------------------------------------------------------------------
  // Bug 2 — unscalable guard: Unscalable Value mod is pinned to exact value
  // -------------------------------------------------------------------------
  it("unscalable flag is reachable on the parsed stat sources", () => {
    const res = parseClipboard(ABYSS_TABLET_UNSCALABLE);
    if (!res.isOk()) throw new Error(res.error);
    const item = res.value;

    const calc = item.statsByType.find((c) => c.stat.ref === UNSCALABLE_REF);
    expect(calc).toBeDefined();

    // Confirm the fix can read the flag from where it looks
    expect(calc!.sources.some((s) => s.stat.roll?.unscalable)).toBe(true);
  });

  it("does not pre-fill a search bound for Unscalable Value mods", () => {
    const res = parseClipboard(ABYSS_TABLET_UNSCALABLE);
    if (!res.isOk()) throw new Error(res.error);
    const item = res.value;

    const calc = item.statsByType.find((c) => c.stat.ref === UNSCALABLE_REF);
    expect(calc).toBeDefined();

    // Confirm the unscalable flag is present on the parsed stat sources
    expect(calc!.sources.some((s) => s.stat.roll?.unscalable)).toBe(true);

    const filter = calculatedStatToFilter(calc!, 10, item);

    // The stat produces a roll object (value=-50 is a real numeric value)
    expect(filter.roll).toBeDefined();
    // The rolled value is still recorded
    expect(filter.roll!.value).toBe(-50);
    // The default remains at the exact value (unchanged)
    expect(filter.roll!.default.min).toBe(-50);
    // NEW behavior: search bounds are cleared → empty "has this mod" search
    expect(filter.roll!.min).toBeUndefined();
    expect(filter.roll!.max).toBeUndefined();
  });
});
