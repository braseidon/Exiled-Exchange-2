/**
 * A chat-linked (simple-copy) unique carries no tier ranges, so every mod looked
 * "constant" and hideNotVariableStat hid ALL of them — the whole item sat behind
 * the "show hidden" toggle. The range-only hide is now skipped for simple-copy,
 * so a chat-linked unique surfaces the SAME mods a full (extended) copy shows:
 * real value mods visible, augments/runes still hidden.
 *
 * The two fixtures below are the same item (Forgotten Warden) — extended copy vs
 * the chat-link copy (no `(min-max)` ranges, no `{ ... }` mod headers).
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

const EXTENDED = `Item Class: Body Armours
Rarity: Unique
Forgotten Warden
Primal Markings
--------
Quality: +20% (augmented)
Evasion Rating: 1216 (augmented)
Energy Shield: 372 (augmented)
--------
Requires: Level 84, 67 Dex, 67 Int
--------
Sockets: S S
--------
Item Level: 84
--------
50% reduced effect of Curses on you (rune)
10% increased Deflection Rating (rune)
--------
Grants Skill: Level 19 Spirit Vessel
--------
{ Unique Modifier — Evasion }
+98(70-100) to Deflection Rating per 50 missing Energy Shield
{ Unique Modifier — Evasion, Energy Shield }
278(200-300)% increased Evasion and Energy Shield
{ Unique Modifier — Attribute }
+30(20-30) to Dexterity
{ Unique Modifier — Life, Minion }
Companions have 48(30-50)% increased maximum Life
{ Unique Modifier }
12(10-15)% of Damage from Deflected Hits is taken from Damageable Companion's Life before you
--------
A gift from the Draíocht, lost in Darkness.`;

const SIMPLE = `Item Class: Body Armours
Rarity: Unique
Forgotten Warden
Primal Markings
--------
Quality: +20% (augmented)
Evasion Rating: 1216 (augmented)
Energy Shield: 372 (augmented)
--------
Requires: Level 84, 67 Dex, 67 Int
--------
Sockets: S S
--------
Item Level: 84
--------
50% reduced effect of Curses on you (rune)
10% increased Deflection Rating (rune)
--------
Grants Skill: Level 19 Spirit Vessel
--------
+98 to Deflection Rating per 50 missing Energy Shield
278% increased Evasion and Energy Shield
+30 to Dexterity
Companions have 48% increased maximum Life
12% of Damage from Deflected Hits is taken from Damageable Companion's Life before you
--------
A gift from the Draíocht, lost in Darkness.`;

function pseudoStats(text: string) {
  const item = parseClipboard(text)._unsafeUnwrap();
  const { presets } = createPresets(item, PRESET_OPTS);
  return presets.find((p) => p.id === "filters.preset_pseudo")!.stats;
}

function sets(text: string) {
  const item = parseClipboard(text)._unsafeUnwrap();
  const { presets } = createPresets(item, PRESET_OPTS);
  const stats = presets.find((p) => p.id === "filters.preset_pseudo")!.stats;
  return {
    isSimpleCopy: item.isSimpleCopy,
    visible: stats
      .filter((s) => !s.hidden)
      .map((s) => s.text)
      .sort(),
    hidden: stats
      .filter((s) => s.hidden)
      .map((s) => s.text)
      .sort(),
  };
}

describe("chat-linked unique mod visibility", () => {
  beforeEach(async () => {
    setupTests();
    await init("en");
  });

  it("the two fixtures are the same item, one simple one extended", () => {
    expect(sets(SIMPLE).isSimpleCopy).toBe(true);
    expect(sets(EXTENDED).isSimpleCopy).toBeFalsy();
  });

  it("chat-link surfaces the SAME visible mods as the full copy", () => {
    expect(sets(SIMPLE).visible).toEqual(sets(EXTENDED).visible);
    // Sanity: the visible set is non-empty (regression: it used to be all hidden).
    expect(sets(SIMPLE).visible.length).toBeGreaterThan(0);
  });

  it("chat-link keeps the same mods hidden (runes/augments) as the full copy", () => {
    expect(sets(SIMPLE).hidden).toEqual(sets(EXTENDED).hidden);
  });

  // A chat-linked unique used to pin every mod to its exact roll: with no range,
  // value === max read as a "perfect roll" (percent forced to 0) and the unique
  // range-based fill (percentRollDelta) collapsed to exact. Now simple-copy
  // uniques fill value-based (~searchStatRange below the roll).
  it("fills variable mods below the roll (was pinned exact)", () => {
    const stats = pseudoStats(SIMPLE);
    const min = (substr: string) =>
      stats.find((s) => s.text.includes(substr))!.roll!.min;
    // searchStatRange = 10 → floor(value * 0.9).
    expect(min("Deflection Rating per 50")).toBe(88); // 98
    expect(min("Evasion and Energy Shield")).toBe(250); // 278
    expect(min("to Dexterity")).toBe(27); // 30
    expect(min("Companions have")).toBe(43); // 48
    expect(min("Damage from Deflected")).toBe(10); // 12
  });

  it("keeps the granted skill level exact (control)", () => {
    const skill = pseudoStats(SIMPLE).find((s) =>
      s.text.includes("Spirit Vessel"),
    )!;
    expect(skill.roll!.value).toBe(19);
    expect(skill.roll!.min).toBe(19);
  });
});
