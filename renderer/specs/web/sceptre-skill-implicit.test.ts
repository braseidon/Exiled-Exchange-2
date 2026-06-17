import { describe, expect, it, beforeEach } from "vitest";
import { setupTests } from "@specs/vitest.setup";
import { init } from "@/assets/data";
import { parseClipboard } from "@/parser";
import { initUiModFilters } from "@/web/price-check/filters/create-stat-filters";
import { FilterTag } from "@/web/price-check/filters/interfaces";

// Rare sceptre with Grants Skill: Level 17 Skeletal Warrior Minion (sub-19 — was hidden before fix)
const SCEPTRE_LEVEL_17 = `Item Class: Sceptres
Rarity: Rare
Rage Crack
Rattling Sceptre
--------
Spirit: 100
--------
Requires: Level 72, 126 Int
--------
Item Level: 81
--------
Grants Skill: Level 17 Skeletal Warrior Minion
--------
{ Prefix Modifier "Cremating" (Tier: 1) — Damage, Elemental, Fire, Attack }
Allies in your Presence deal 27(25-29) to 39(39-45) added Attack Fire Damage
{ Prefix Modifier "Frozen" (Tier: 4) — Damage, Elemental, Cold, Attack }
Allies in your Presence deal 13(11-13) to 19(18-21) added Attack Cold Damage
{ Suffix Modifier "of Immortality" (Tier: 1) — Life }
Allies in your Presence Regenerate 30(29.1-33) Life per second
{ Suffix Modifier "of Metamorphosis" (Tier: 1) — Elemental, Fire, Cold, Lightning, Resistance }
Allies in your Presence have +17(17-18)% to all Elemental Resistances
`;

// Rare sceptre with Grants Skill: Level 19 Skeletal Warrior Minion (max level — always showed)
const SCEPTRE_LEVEL_19 = `Item Class: Sceptres
Rarity: Rare
Woe Call
Rattling Sceptre
--------
Spirit: 153 (augmented)
--------
Requires: Level 84, 147 Int
--------
Item Level: 84
--------
Grants Skill: Level 19 Skeletal Warrior Minion
--------
{ Prefix Modifier "Duke's" (Tier: 3) }
53(51-55)% increased Spirit
{ Suffix Modifier "of the Gorilla" (Tier: 4) — Attribute }
+22(21-24) to Strength
{ Suffix Modifier "of Progression" (Tier: 2) — Elemental, Fire, Cold, Lightning, Resistance }
Allies in your Presence have +16(15-16)% to all Elemental Resistances
{ Suffix Modifier "of the Hydra" (Tier: 6) — Life }
Allies in your Presence Regenerate 8.4(6.1-9) Life per second
`;

function buildFilters(text: string) {
  const res = parseClipboard(text);
  if (!res.isOk()) throw new Error(res.error);
  const item = res.value;
  const filters = initUiModFilters(item, {
    searchStatRange: 10,
    defaultAllSelected: false,
  });
  const skillFilter = filters.find((f) => f.tag === FilterTag.Skill);
  return { item, filters, skillFilter };
}

describe("sceptre granted-skill implicit — hide fix regression", () => {
  beforeEach(async () => {
    setupTests();
    await init("en");
  });

  it("level 17 skill filter: exists, NOT hidden, disabled=true, roll=17", () => {
    const { skillFilter } = buildFilters(SCEPTRE_LEVEL_17);

    expect(
      skillFilter,
      "Skill filter should be present for level-17 sceptre",
    ).toBeDefined();
    // After the fix: hidden must NEVER be set (was "filters.hide_not_max_level")
    expect(
      skillFilter!.hidden,
      "hidden should be falsy (fix removed the hide)",
    ).toBeFalsy();
    // Sub-19 → left unchecked (disabled) by default
    expect(
      skillFilter!.disabled,
      "disabled should be true for level < 19",
    ).toBe(true);
    expect(skillFilter!.roll!.value, "roll value should be 17").toBe(17);
  });

  it("level 19 skill filter: exists, NOT hidden, disabled=false, roll=19", () => {
    const { skillFilter } = buildFilters(SCEPTRE_LEVEL_19);

    expect(
      skillFilter,
      "Skill filter should be present for level-19 sceptre",
    ).toBeDefined();
    expect(skillFilter!.hidden, "hidden should be falsy").toBeFalsy();
    // Level >= 19 → enabled/checked
    expect(
      skillFilter!.disabled,
      "disabled should be false for level >= 19",
    ).toBe(false);
    expect(skillFilter!.roll!.value, "roll value should be 19").toBe(19);
  });
});
