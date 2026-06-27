/**
 * Two belt price-check tweaks, exercised through the real preset pipeline:
 *
 *  1. Mageblood with 0 duplicate legacies → the "increased effect per duplicate"
 *     mod does nothing, so it's unchecked by default (left checked at >=1 dup).
 *  2. Belt charm-slot filter is enabled and its searched min capped at 2 (a free
 *     campaign slot + a cap of 3 total make >2 belt slots worthless), but ONLY
 *     when a belt is priced by its mods (Magic/Rare/Mageblood = pseudo / unique
 *     path) — never on Normal belts, which price as bases (exact path).
 */
import { beforeEach, describe, expect, it } from "vitest";
import { setupTests } from "@specs/vitest.setup";
import { init } from "@/assets/data";
import { parseClipboard } from "@/parser";
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

const CHARM_REF = "Has # Charm Slot";
const EFFECT_REF = "All Mage's Legacies";

// 4 distinct legacies → 0 duplicates; 3 charm slots. Trips both tweaks.
const MAGEBLOOD_NO_DUPES = `Item Class: Belts
Rarity: Unique
Mageblood
Utility Belt
--------
Requires: Level 55
--------
Item Level: 80
--------
{ Implicit Modifier }
20% of Flask Recovery applied Instantly
{ Implicit Modifier — Charm }
Has 3(1-3) Charm Slots
--------
{ Unique Modifier }
Legacy of Diamond(Amethyst-Topaz) — Unscalable Value
{ Unique Modifier }
Legacy of Bismuth(Amethyst-Topaz) — Unscalable Value
{ Unique Modifier }
Legacy of Amethyst(Amethyst-Topaz) — Unscalable Value
{ Unique Modifier }
Legacy of Stibnite(Amethyst-Topaz) — Unscalable Value
{ Unique Modifier }
All Mage's Legacies have 37(25-50)% increased effect per duplicate Mage's Legacy you have
--------
Rivers of power coursed through their veins.
Now, that power is yours, for good or ill.
`;

// Jade duplicated → 1 duplicate; 2 charm slots. Effect mod must stay checked.
const MAGEBLOOD_ONE_DUPE = `Item Class: Belts
Rarity: Unique
Mageblood
Utility Belt
--------
Requires: Level 55
--------
Item Level: 81
--------
{ Implicit Modifier }
20% of Flask Recovery applied Instantly
{ Implicit Modifier — Charm }
Has 2(1-3) Charm Slots
--------
{ Unique Modifier }
Legacy of Stibnite(Amethyst-Topaz) — Unscalable Value
{ Unique Modifier }
Legacy of Jade(Amethyst-Topaz) — Unscalable Value
{ Unique Modifier }
Legacy of Silver(Amethyst-Topaz) — Unscalable Value
{ Unique Modifier }
Legacy of Jade(Amethyst-Topaz) — Unscalable Value
{ Unique Modifier }
All Mage's Legacies have 50(25-50)% increased effect per duplicate Mage's Legacy you have
--------
Rivers of power coursed through their veins.
Now, that power is yours, for good or ill.
`;

// Rare belt with 3 charm slots → priced by mods (pseudo path).
const RARE_BELT = `Item Class: Belts
Rarity: Rare
Cataclysm Clasp
Utility Belt
--------
Requires: Level 55
--------
Item Level: 81
--------
{ Implicit Modifier — Charm }
Has 3(1-3) Charm Slots
--------
{ Prefix Modifier "Athlete's" (Tier: 1) }
+120(110-129) to maximum Life
{ Suffix Modifier "of the Polar Bear" (Tier: 1) }
+42(40-45)% to Cold Resistance
--------
`;

// Normal belt with 3 charm slots → priced as a base (exact path). Control: the
// belt rule must NOT touch it.
const NORMAL_BELT = `Item Class: Belts
Rarity: Normal
Utility Belt
--------
Item Level: 81
--------
{ Implicit Modifier — Charm }
Has 3(1-3) Charm Slots
--------
`;

function statsFor(text: string, presetId: string) {
  const item = parseClipboard(text)._unsafeUnwrap();
  const { presets } = createPresets(item, PRESET_OPTS);
  const preset = presets.find((p) => p.id === presetId);
  if (!preset) throw new Error(`no preset ${presetId}`);
  return preset.stats;
}

describe("Mageblood & belt charm-slot rules", () => {
  beforeEach(async () => {
    setupTests();
    await init("en");
  });

  it("Mageblood with 0 duplicates: unchecks the per-duplicate effect mod", () => {
    const stats = statsFor(MAGEBLOOD_NO_DUPES, "filters.preset_exact");
    const effect = stats.find((s) => s.statRef.startsWith(EFFECT_REF));
    expect(effect).toBeDefined();
    expect(effect!.disabled).toBe(true);
  });

  it("Mageblood with 1 duplicate: keeps the per-duplicate effect mod checked", () => {
    const stats = statsFor(MAGEBLOOD_ONE_DUPE, "filters.preset_exact");
    const effect = stats.find((s) => s.statRef.startsWith(EFFECT_REF));
    expect(effect).toBeDefined();
    expect(effect!.disabled).toBe(false);
  });

  it("Mageblood (a belt): charm-slot filter enabled and capped at min 2", () => {
    const stats = statsFor(MAGEBLOOD_NO_DUPES, "filters.preset_exact");
    const charm = stats.find((s) => s.statRef === CHARM_REF);
    expect(charm).toBeDefined();
    expect(charm!.disabled).toBe(false);
    expect(charm!.roll!.value).toBe(3); // rolled value preserved
    expect(charm!.roll!.min).toBe(2); // searched min capped 3 -> 2
  });

  it("Rare belt: charm-slot filter enabled and capped at min 2", () => {
    const stats = statsFor(RARE_BELT, "filters.preset_pseudo");
    const charm = stats.find((s) => s.statRef === CHARM_REF);
    expect(charm).toBeDefined();
    expect(charm!.disabled).toBe(false);
    expect(charm!.roll!.value).toBe(3);
    expect(charm!.roll!.min).toBe(2);
  });

  it("Normal belt (control): charm-slot filter is NOT capped to 2", () => {
    const stats = statsFor(NORMAL_BELT, "filters.preset_exact");
    const charm = stats.find((s) => s.statRef === CHARM_REF);
    expect(charm).toBeDefined();
    // The belt rule never ran on the exact path, so the searched min is the
    // full rolled value, not the capped 2.
    expect(charm!.roll!.min).not.toBe(2);
    expect(charm!.roll!.min).toBe(3);
  });
});
