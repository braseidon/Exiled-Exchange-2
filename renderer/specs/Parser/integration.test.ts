/**
 * Integration tests for the parser
 */

import { ItemCategory, parseClipboard } from "@/parser";
import {
  CharmQuality,
  NormalItem,
  RareItem,
  SignetWombgift,
  SpectreIncSpirit,
} from "./items";
import { beforeEach, describe, expect, it } from "vitest";
import { setupTests } from "@specs/vitest.setup";
import { init } from "@/assets/data";
import { apiToSatisfySearch } from "@/web/price-check/trade/common";
import type { ItemFilters } from "@/web/price-check/filters/interfaces";

describe("Parse Item Properties", () => {
  // Tests almost everything on items, except for modifiers themselves
  beforeEach(async () => {
    setupTests();
    await init("en");
  });

  it("parses bow dps", () => {
    const item = parseClipboard(RareItem.rawText);

    expect(item.isOk()).toBe(true);

    const parsedItem = item._unsafeUnwrap();

    expect(parsedItem.weaponPHYSICAL).toBe(RareItem.weaponPHYSICAL);
    expect(parsedItem.weaponELEMENTAL).toBe(RareItem.weaponELEMENTAL);
    expect(parsedItem.weaponAS).toBe(RareItem.weaponAS);
    expect(parsedItem.weaponCRIT).toBe(RareItem.weaponCRIT);

    expect(parsedItem.requires).not.toBeUndefined();
    expect(parsedItem.requires?.level).toBe(RareItem.requires?.level);
    expect(parsedItem.requires?.str).toBe(RareItem.requires?.str);
    expect(parsedItem.requires?.dex).toBe(RareItem.requires?.dex);
    expect(parsedItem.requires?.int).toBe(RareItem.requires?.int);
  });

  it("parses a spectre's spirit", () => {
    const item = parseClipboard(SpectreIncSpirit.rawText);

    expect(item.isOk()).toBe(true);

    const parsedItem = item._unsafeUnwrap();

    expect(parsedItem.weaponSPIRIT).toBe(SpectreIncSpirit.weaponSPIRIT);

    expect(parsedItem.requires).not.toBeUndefined();
    expect(parsedItem.requires?.level).toBe(SpectreIncSpirit.requires?.level);
    expect(parsedItem.requires?.str).toBe(SpectreIncSpirit.requires?.str);
    expect(parsedItem.requires?.dex).toBe(SpectreIncSpirit.requires?.dex);
    expect(parsedItem.requires?.int).toBe(SpectreIncSpirit.requires?.int);
  });

  it("parses armour props", () => {
    const item = parseClipboard(NormalItem.rawText);
    const parsedItem = item._unsafeUnwrap();

    expect(parsedItem.armourAR).toBe(NormalItem.armourAR);
    expect(parsedItem.armourEV).toBe(NormalItem.armourEV);
    expect(parsedItem.armourES).toBe(NormalItem.armourES);

    expect(parsedItem.requires).not.toBeUndefined();
    expect(parsedItem.requires?.level).toBe(NormalItem.requires?.level);
    expect(parsedItem.requires?.str).toBe(NormalItem.requires?.str);
    expect(parsedItem.requires?.dex).toBe(NormalItem.requires?.dex);
    expect(parsedItem.requires?.int).toBe(NormalItem.requires?.int);
  });
});

describe("Parse Charm Properties", () => {
  beforeEach(async () => {
    setupTests();
    await init("en");
  });

  it("parses charm quality", () => {
    const item = parseClipboard(CharmQuality.rawText);

    expect(item.isOk()).toBe(true);

    const parsedItem = item._unsafeUnwrap();

    expect(parsedItem.quality).toBe(CharmQuality.quality);
  });
});

describe("Wombgift trade routing", () => {
  beforeEach(async () => {
    setupTests();
    await init("en");
  });

  // Wombgifts are listed on GGG's currency exchange (Breach category), so they
  // should price-check via the exchange (bulk / instant trade). Upstream's #980
  // fix stripped their exchange tradeTag, which forced them onto regular
  // both-online trade; the fork restores the tradeTag. Guard against a future
  // upstream sync re-stripping it.
  it("routes wombgifts to the currency exchange (bulk)", () => {
    const item = parseClipboard(SignetWombgift.rawText);

    expect(item.isOk()).toBe(true);

    const parsedItem = item._unsafeUnwrap();

    // #980 fix: recategorized from generic Currency to Wombgift
    expect(parsedItem.category).toBe(ItemCategory.Wombgift);
    // this fork's fix: the exchange tradeTag must survive
    expect(parsedItem.info.tradeTag).toBe("signet-wombgift");
    // with the tag present and no enabled stat filters, routing picks the exchange
    expect(apiToSatisfySearch(parsedItem, [], {} as ItemFilters)).toBe("bulk");
  });
});
