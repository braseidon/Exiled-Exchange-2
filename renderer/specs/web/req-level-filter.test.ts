/**
 * Regression tests for the max required-level filter introduced in
 * create-item-filters.ts (any item with item.requires?.level gets
 * filters.requires = { level: { value: "", disabled: true } }) and the
 * corresponding query emission gate in pathofexile-trade.ts
 * (req_filters.filters.lvl.max only written when enabled + numeric).
 */
import { beforeEach, describe, expect, it } from "vitest";
import { setupTests } from "@specs/vitest.setup";
import { init } from "@/assets/data";
import { parseClipboard } from "@/parser";
import { createFilters } from "@/web/price-check/filters/create-item-filters";
import { createTradeRequest } from "@/web/price-check/trade/pathofexile-trade";
import { createTestCreateOptions } from "@specs/helper";

// Same item used in simple-copy.test.ts — extended (annotated) format so the
// parser gets full tier info and does not flag it as a simple copy.
const RING_EXTENDED = `Item Class: Rings
Rarity: Rare
Miracle Grip
Amethyst Ring
--------
Requires: Level 59
--------
Item Level: 74
--------
{ Implicit Modifier — Chaos, Resistance }
+8(7-13)% to Chaos Resistance
--------
{ Prefix Modifier "Rotund" (Tier: 2) — Life }
+90(85-99) to maximum Life
{ Suffix Modifier "of the Leopard" (Tier: 3) — Attribute }
+26(25-27) to Dexterity
`;

describe("req-level-filter", () => {
  beforeEach(async () => {
    setupTests();
    await init("en");
  });

  // ─── filter creation ──────────────────────────────────────────────────────

  describe("filter creation", () => {
    it("creates requires.level for an item that has a level requirement", () => {
      const res = parseClipboard(RING_EXTENDED);
      if (!res.isOk()) throw new Error(res.error);
      const item = res.value;

      // Sanity-check the parser gave us the right level requirement
      expect(item.requires?.level).toBe(59);

      const filters = createFilters(item, createTestCreateOptions());

      expect(filters.requires?.level).toBeDefined();
    });

    it("leaves requires.level value blank (empty string) by default", () => {
      const res = parseClipboard(RING_EXTENDED);
      if (!res.isOk()) throw new Error(res.error);

      const filters = createFilters(res.value, createTestCreateOptions());

      expect(filters.requires!.level!.value).toBe("");
    });

    it("leaves requires.level disabled by default", () => {
      const res = parseClipboard(RING_EXTENDED);
      if (!res.isOk()) throw new Error(res.error);

      const filters = createFilters(res.value, createTestCreateOptions());

      expect(filters.requires!.level!.disabled).toBe(true);
    });

    it("carries the item's required level as fillOnFocus (click-to-fill)", () => {
      const res = parseClipboard(RING_EXTENDED);
      if (!res.isOk()) throw new Error(res.error);

      const filters = createFilters(res.value, createTestCreateOptions());

      // Blank by default, but focusing the input fills the item's own req level.
      expect(filters.requires!.level!.fillOnFocus).toBe(59);
    });
  });

  // ─── query emission ───────────────────────────────────────────────────────

  describe("query emission", () => {
    it("emits req_filters.filters.lvl.max when the filter is enabled with a numeric value", () => {
      const res = parseClipboard(RING_EXTENDED);
      if (!res.isOk()) throw new Error(res.error);
      const item = res.value;

      const filters = createFilters(item, createTestCreateOptions());
      // Simulate user typing 65 and enabling the filter
      filters.requires!.level = { value: 65, disabled: false };

      const body = createTradeRequest(filters, [], item);

      expect(body.query.filters.req_filters?.filters.lvl?.max).toBe(65);
    });

    it("omits req_filters.filters.lvl when filter is disabled (default state)", () => {
      const res = parseClipboard(RING_EXTENDED);
      if (!res.isOk()) throw new Error(res.error);
      const item = res.value;

      // Default: disabled: true, value: ""
      const filters = createFilters(item, createTestCreateOptions());

      const body = createTradeRequest(filters, [], item);

      expect(body.query.filters.req_filters?.filters.lvl).toBeUndefined();
    });

    it("omits req_filters.filters.lvl when value is blank string even if enabled", () => {
      const res = parseClipboard(RING_EXTENDED);
      if (!res.isOk()) throw new Error(res.error);
      const item = res.value;

      const filters = createFilters(item, createTestCreateOptions());
      // Enabled but the input box was left empty
      filters.requires!.level = { value: "", disabled: false };

      const body = createTradeRequest(filters, [], item);

      expect(body.query.filters.req_filters?.filters.lvl).toBeUndefined();
    });
  });
});
