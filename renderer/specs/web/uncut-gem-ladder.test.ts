/**
 * The price-check sidebar shows, for a checked uncut gem, the whole level ladder
 * of that same uncut type (Skill / Spirit / Support) so you can read the going
 * rate at every level. Uncut gems parse as `Rarity: Currency` (category Currency,
 * NOT UncutGem), so detection keys on the base's craftable category, and the
 * ladder is derived from the live item data rather than hardcoded ranges.
 */

import { parseClipboard } from "@/parser";
import { beforeEach, describe, expect, it } from "vitest";
import { setupTests } from "@specs/vitest.setup";
import { init } from "@/assets/data";
import {
  isUncutGem,
  uncutGemLadder,
} from "@/web/price-check/related-items/uncut-gem-ladder";

const UNCUT_SKILL = `Item Class: Uncut Skill Gems
Rarity: Currency
Uncut Skill Gem (Level 19)
--------
Creates a Skill Gem or Level an existing gem to level 19
--------
Right Click to engrave a Skill Gem.`;

const UNCUT_SPIRIT = `Item Class: Uncut Spirit Gems
Rarity: Currency
Uncut Spirit Gem (Level 17)
--------
Creates a Persistent Skill Gem or Level an existing gem to Level 17
--------
Right Click to engrave a Persistent Skill Gem.`;

const UNCUT_SUPPORT = `Item Class: Uncut Support Gems
Rarity: Currency
Uncut Support Gem (Level 5)
--------
Creates a Support Gem
--------
Right Click to engrave a Support Gem.`;

// control: a plain currency-exchange item that is NOT an uncut gem
const ORB = `Item Class: Stackable Currency
Rarity: Currency
Orb of Alchemy
--------
Stack Size: 11/20
--------
Upgrades a Normal item to a Rare item with new random modifiers
--------
Shift click to unstack.`;

const parse = (raw: string) => parseClipboard(raw)._unsafeUnwrap();

describe("uncut gem ladder", () => {
  beforeEach(async () => {
    setupTests();
    await init("en");
  });

  const CASES = [
    {
      name: "Uncut Skill Gem",
      raw: UNCUT_SKILL,
      prefix: "Uncut Skill Gem",
      min: 1,
      max: 20,
      checked: 19,
    },
    {
      name: "Uncut Spirit Gem",
      raw: UNCUT_SPIRIT,
      prefix: "Uncut Spirit Gem",
      min: 4,
      max: 20,
      checked: 17,
    },
    {
      name: "Uncut Support Gem",
      raw: UNCUT_SUPPORT,
      prefix: "Uncut Support Gem",
      min: 1,
      max: 5,
      checked: 5,
    },
  ];

  for (const { name, raw, prefix, min, max, checked } of CASES) {
    it(`${name} → its own ${min}-${max} ladder, ascending & deduped`, () => {
      const item = parse(raw);
      expect(isUncutGem(item)).toBe(true);

      const rows = uncutGemLadder(item);
      const levels = rows.map((r) => r.level);

      // ladder spans the full level range of this type
      expect(levels[0]).toBe(min);
      expect(levels[levels.length - 1]).toBe(max);
      // strictly ascending (sorted + no duplicate levels)
      expect(levels).toEqual([...new Set(levels)].sort((a, b) => a - b));
      // every row is the SAME uncut type as the checked gem (no cross-type bleed)
      expect(rows.every((r) => r.ref.startsWith(`${prefix} (Level`))).toBe(
        true,
      );
      // the checked level is itself part of the ladder (gets highlighted in the UI)
      expect(levels).toContain(checked);
    });
  }

  it("does not bleed across uncut types (skill ≠ spirit ≠ support)", () => {
    const skill = uncutGemLadder(parse(UNCUT_SKILL));
    expect(skill.some((r) => /Spirit|Support/.test(r.ref))).toBe(false);
  });

  it("non-uncut-gem items are ignored", () => {
    const orb = parse(ORB);
    expect(isUncutGem(orb)).toBe(false);
    expect(uncutGemLadder(orb)).toEqual([]);
  });
});
