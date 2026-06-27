/**
 * The price-check sidebar shows, for a checked currency-exchange item, the other
 * members of its tier-group so you can read the whole group's prices at a glance.
 * Essences parse as `Rarity: Currency` with `craftable.category` Currency (same
 * for every currency), so the family keys on the `essence` tag + tradeTag tier
 * prefix. Groups are derived from the live item data, not hardcoded lists.
 */

import { parseClipboard } from "@/parser";
import { beforeEach, describe, expect, it } from "vitest";
import { setupTests } from "@specs/vitest.setup";
import { init } from "@/assets/data";
import { currencyFamily } from "@/web/price-check/related-items/currency-family";

const essence = (name: string) => `Item Class: Stackable Currency
Rarity: Currency
${name}
--------
Stack Size: 1/10
--------
Upgrades a normal item to a magic item with a modifier
--------
Right click this item then left click a normal item to apply it.`;

// control: a plain currency-exchange item that is NOT an essence
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

describe("currency family — essences", () => {
  beforeEach(async () => {
    setupTests();
    await init("en");
  });

  const CASES = [
    // tier, checked essence, expected group size, a prefix every member shares
    { tier: "Lesser", checked: "Lesser Essence of Haste", size: 19 },
    { tier: "Normal", checked: "Essence of Flames", size: 19 },
    { tier: "Greater", checked: "Greater Essence of Ruin", size: 19 },
    { tier: "Perfect", checked: "Perfect Essence of the Body", size: 19 },
    { tier: "Special", checked: "Essence of Delirium", size: 6 },
  ];

  for (const { tier, checked, size } of CASES) {
    it(`${checked} → the ${tier} group (${size} members), checked one highlighted`, () => {
      const item = parse(essence(checked));
      const rows = currencyFamily(item);

      expect(rows).not.toBeNull();
      expect(rows!.length).toBe(size);
      // the checked essence is itself part of its group (gets highlighted in UI)
      expect(rows!.some((r) => r.ref === checked)).toBe(true);
      // sorted alphabetically for a stable display
      expect(rows!.map((r) => r.name)).toEqual(
        [...rows!.map((r) => r.name)].sort((a, b) => a.localeCompare(b)),
      );
    });
  }

  it("groups by tier, not element — Normal excludes the 6 special essences", () => {
    const normal = currencyFamily(parse(essence("Essence of Flames")))!;
    const refs = normal.map((r) => r.ref);
    expect(refs).toContain("Essence of Flames");
    // a special (tier-less) essence must NOT bleed into the Normal group
    expect(refs).not.toContain("Essence of Delirium");
    // a tiered variant of the same element must NOT bleed in either
    expect(refs).not.toContain("Greater Essence of Flames");
  });

  it("special essences group only with each other", () => {
    const special = currencyFamily(parse(essence("Essence of Horror")))!;
    expect(special.length).toBe(6);
    expect(special.every((r) => /^Essence of /.test(r.ref))).toBe(true);
    expect(special.map((r) => r.ref).sort()).toEqual([
      "Essence of Delirium",
      "Essence of Horror",
      "Essence of Hysteria",
      "Essence of Insanity",
      "Essence of the Abyss",
      "Essence of the Breach",
    ]);
  });

  it("non-essence currency is ignored", () => {
    const orb = parse(ORB);
    expect(currencyFamily(orb)).toBeNull();
  });
});
