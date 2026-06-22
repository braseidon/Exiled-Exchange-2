/**
 * Unrevealed desecrated affixes parse as ModifierType.Veiled (GGG reused PoE1's
 * ItemDisplayVeiled* string IDs — VEILED_SUFFIX === "Desecrated Suffix"), so the
 * item gets isVeiled. Such an item must NOT pre-select item level on the Pseudo
 * tab (its visible mods carry the search); the Base Item / exact tab still does,
 * as the hidden affix leaves item level as the only base proxy there.
 */
import { parseClipboard } from "@/parser";
import { beforeEach, describe, expect, it } from "vitest";
import { setupTests } from "@specs/vitest.setup";
import { init } from "@/assets/data";
import { createPresets } from "@/web/price-check/filters/create-presets";

const PRESET_OPTS = {
  league: "Standard",
  currency: undefined,
  listingType: undefined,
  collapseListings: "api" as const,
  activateStockFilter: false,
  searchStatRange: 10,
  useEn: true,
  defaultAllSelected: false,
  autoFillEmptyAugmentSockets: false as const,
};

const PSEUDO = "filters.preset_pseudo";
const BASE = "filters.preset_base_item";

// Rare chest with an unrevealed desecrated suffix ({ Suffix Modifier "of the
// Veil" } + body line "Desecrated Suffix").
const VEILED_CHEST = `Item Class: Body Armours
Rarity: Rare
Miracle Shelter
Itinerant Jacket
--------
Evasion Rating: 691 (augmented)
Energy Shield: 216 (augmented)
--------
Requires: Level 54, 48 Dex, 48 Int
--------
Item Level: 80
--------
{ Prefix Modifier "Spirit's" (Tier: 4) — Evasion, Energy Shield }
+93(79-94) to Evasion Rating
+27(26-29) to maximum Energy Shield
{ Prefix Modifier "Rogue's" (Tier: 2) — Evasion, Energy Shield }
+31(30-39) to Evasion Rating
+12(11-12) to maximum Energy Shield
35(33-38)% increased Evasion and Energy Shield
{ Prefix Modifier "Evanescent" (Tier: 4) — Evasion, Energy Shield }
73(68-79)% increased Evasion and Energy Shield
{ Suffix Modifier "of Exile" (Tier: 2) — Chaos, Resistance }
+22(20-23)% to Chaos Resistance
{ Suffix Modifier "of the Veil" }
Desecrated Suffix`;

describe("unrevealed desecrated (veiled) item", () => {
  beforeEach(async () => {
    setupTests();
    await init("en");
  });

  it("parses the unrevealed desecrated affix as veiled", () => {
    const res = parseClipboard(VEILED_CHEST);
    expect(res.isOk()).toBe(true);
    expect(res._unsafeUnwrap().isVeiled).toBe(true);
  });

  it("does NOT pre-select item level on the Pseudo tab", () => {
    const { presets } = createPresets(
      parseClipboard(VEILED_CHEST)._unsafeUnwrap(),
      PRESET_OPTS,
    );
    const pseudo = presets.find((p) => p.id === PSEUDO)!;
    expect(pseudo.filters.itemLevel?.disabled).toBe(true);
  });

  it("still pre-selects item level on the Base Item tab", () => {
    const { presets } = createPresets(
      parseClipboard(VEILED_CHEST)._unsafeUnwrap(),
      PRESET_OPTS,
    );
    const base = presets.find((p) => p.id === BASE)!;
    expect(base.filters.itemLevel?.disabled).toBe(false);
  });
});
