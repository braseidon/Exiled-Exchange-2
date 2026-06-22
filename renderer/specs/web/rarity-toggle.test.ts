/**
 * The Magic/Normal rarity badge is auto-selected but can be toggled off. On the
 * exact / Base Item path a Normal item gets filters.rarity = { value: "normal",
 * disabled: false } and a Magic item { value: "magic", disabled: false }. The
 * trade query emits the badge's own rarity (normal/magic) while enabled; toggling
 * it off (disabled: true) falls back to "nonunique" (Any non-unique), since every
 * badged item is non-unique. The badge-less "nonunique" rarity (Pseudo path)
 * emits as before.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { setupTests } from "@specs/vitest.setup";
import { init } from "@/assets/data";
import { parseClipboard } from "@/parser";
import { createFilters } from "@/web/price-check/filters/create-item-filters";
import { createTradeRequest } from "@/web/price-check/trade/pathofexile-trade";
import { createTestCreateOptions } from "@specs/helper";

const EXACT = { ...createTestCreateOptions(), exact: true };
const PSEUDO = { ...createTestCreateOptions(), exact: false };

const NORMAL_BASE = `Item Class: Body Armours
Rarity: Normal
Itinerant Jacket
--------
Evasion Rating: 350
--------
Requires: Level 54, 48 Dex, 48 Int
--------
Item Level: 80
`;

const MAGIC_ITEM = `Item Class: Body Armours
Rarity: Magic
Rogue's Itinerant Jacket of Exile
--------
Evasion Rating: 350 (augmented)
--------
Requires: Level 54, 48 Dex, 48 Int
--------
Item Level: 80
--------
{ Prefix Modifier "Rogue's" (Tier: 2) — Evasion, Energy Shield }
+31(30-39) to Evasion Rating
{ Suffix Modifier "of Exile" (Tier: 2) — Chaos, Resistance }
+22(20-23)% to Chaos Resistance
`;

const RARE_ITEM = `Item Class: Rings
Rarity: Rare
Miracle Grip
Amethyst Ring
--------
Requires: Level 59
--------
Item Level: 74
--------
{ Prefix Modifier "Rotund" (Tier: 2) — Life }
+90(85-99) to maximum Life
{ Suffix Modifier "of the Leopard" (Tier: 3) — Attribute }
+26(25-27) to Dexterity
`;

function parse(text: string) {
  const res = parseClipboard(text);
  if (!res.isOk()) throw new Error(res.error);
  return res.value;
}

describe("rarity-toggle", () => {
  beforeEach(async () => {
    setupTests();
    await init("en");
  });

  // ─── filter creation ──────────────────────────────────────────────────────

  describe("filter creation", () => {
    it("auto-selects (disabled: false) the Normal badge on the exact path", () => {
      const filters = createFilters(parse(NORMAL_BASE), EXACT);
      expect(filters.rarity?.value).toBe("normal");
      expect(filters.rarity?.disabled).toBe(false);
    });

    it("auto-selects (disabled: false) the Magic badge on the exact path", () => {
      const filters = createFilters(parse(MAGIC_ITEM), EXACT);
      expect(filters.rarity?.value).toBe("magic");
      expect(filters.rarity?.disabled).toBe(false);
    });

    it("uses badge-less nonunique on the Pseudo path for a rare item", () => {
      const filters = createFilters(parse(RARE_ITEM), PSEUDO);
      expect(filters.rarity?.value).toBe("nonunique");
    });
  });

  // ─── query emission ───────────────────────────────────────────────────────

  describe("query emission", () => {
    it("emits the rarity option while the badge is enabled", () => {
      const item = parse(NORMAL_BASE);
      const filters = createFilters(item, EXACT);

      const body = createTradeRequest(filters, [], item);

      expect(body.query.filters.type_filters?.filters.rarity?.option).toBe(
        "normal",
      );
    });

    it("falls back to nonunique when the badge is toggled off", () => {
      const item = parse(MAGIC_ITEM);
      const filters = createFilters(item, EXACT);
      // Simulate the user clicking the badge off.
      filters.rarity!.disabled = true;

      const body = createTradeRequest(filters, [], item);

      expect(body.query.filters.type_filters?.filters.rarity?.option).toBe(
        "nonunique",
      );
    });

    it("still emits nonunique on the Pseudo path (badge-less, always on)", () => {
      const item = parse(RARE_ITEM);
      const filters = createFilters(item, PSEUDO);

      const body = createTradeRequest(filters, [], item);

      expect(body.query.filters.type_filters?.filters.rarity?.option).toBe(
        "nonunique",
      );
    });
  });
});
