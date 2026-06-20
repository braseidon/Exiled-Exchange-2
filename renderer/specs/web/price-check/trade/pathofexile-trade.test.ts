import { beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { init } from "@/assets/data";
import {
  __testExports,
  DisplayItemLine,
} from "@/web/price-check/trade/pathofexile-trade";
import { setupTests } from "@specs/vitest.setup";

function getFetchResult(idPrefix: string) {
  const filePath = path.resolve(__dirname, "../../../docs/fetchResponses.json");
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return data.result.find((result: { id: string }) =>
    result.id.startsWith(idPrefix),
  );
}
function getTiers(lines: DisplayItemLine[] | undefined) {
  return lines?.map((line) => line.tier);
}

describe("pathofexile-trade tooltip parsing", () => {
  beforeEach(async () => {
    setupTests();
    await init("en");
  });

  it("preserves affix tiers for listing tooltip modifiers", () => {
    const displayItem = __testExports.parseFetchResult(
      getFetchResult("65c7c4e8"),
    );
    const tiers = getTiers(displayItem.explicitMods);

    expect(tiers).toEqual(["P2", "S3"]);
  });

  it("reuses the same affix tier for hybrid modifier lines", () => {
    const displayItem = __testExports.parseFetchResult(
      getFetchResult("ece06af2"),
    );
    const tiers = getTiers(displayItem.explicitMods);

    expect(tiers).toEqual(["P7", "P7", "P5", "S5", "S6"]);
  });

  it("can do many tiers to one mod", () => {
    const displayItem = __testExports.parseFetchResult(
      getFetchResult("2fa2f1ee"),
    );
    const tiers = getTiers(displayItem.explicitMods);

    expect(tiers).toEqual(["P2 + P5", "P6", "P5", "S4", "S4", "S4"]);
  });

  it("can do many mods from one tier", () => {
    const displayItem = __testExports.parseFetchResult(
      getFetchResult("91c9f13"),
    );
    const tiers = getTiers(displayItem.explicitMods);

    expect(tiers).toEqual(["P19", "S1", "S1", "S1"]);
  });

  it("does not crash when an object-schema mod omits its `mods` tier array", () => {
    // GGG's object-schema fetch results can return a mod with `description`
    // and `hash` but no `mods` breakdown (e.g. pseudo/implicit lines like a
    // tablet's "uses remaining"). getTierV2 must tolerate the missing array.
    const result = {
      id: "test-missing-mods",
      item: {
        name: "",
        typeLine: "Ritual Tablet",
        baseType: "Ritual Tablet",
        identified: true,
        rarity: "Rare",
        explicitMods: [
          {
            description: "28% increased Gold found in Map",
            hash: "x",
            mods: [{ tier: "P1" }],
          },
          { description: "10 uses remaining", hash: "y" }, // no `mods`
        ],
      },
    } as unknown as Parameters<typeof __testExports.parseFetchResult>[0];

    let displayItem!: ReturnType<typeof __testExports.parseFetchResult>;
    expect(() => {
      displayItem = __testExports.parseFetchResult(result);
    }).not.toThrow();
    expect(getTiers(displayItem.explicitMods)).toEqual(["P1", undefined]);
  });
});
