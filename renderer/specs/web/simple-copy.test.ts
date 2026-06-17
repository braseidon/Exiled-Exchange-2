import { describe, expect, it, beforeEach } from "vitest";
import { setupTests } from "@specs/vitest.setup";
import { init } from "@/assets/data";
import { parseClipboard } from "@/parser";

const RING_SIMPLE = `Item Class: Rings
Rarity: Rare
Miracle Grip
Amethyst Ring
--------
Requires: Level 59
--------
Item Level: 74
--------
+8% to Chaos Resistance (implicit)
--------
+108 to Evasion Rating
+90 to maximum Life
16% increased Rarity of Items found
+26 to Dexterity
+31 to Intelligence
+13% to all Elemental Resistances
`;

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
{ Prefix Modifier "Hoarder's" (Tier: 1) }
16(16-19)% increased Rarity of Items found
{ Prefix Modifier "Phased" (Tier: 4) — Evasion }
+108(108-141) to Evasion Rating
{ Suffix Modifier "of the Virtuoso" (Tier: 1) — Attribute }
+31(31-33) to Intelligence
{ Suffix Modifier "of the Leopard" (Tier: 3) — Attribute }
+26(25-27) to Dexterity
{ Suffix Modifier "of Variegation" (Tier: 2) — Elemental, Fire, Cold, Lightning, Resistance }
+13(12-14)% to all Elemental Resistances
`;

const CHARM_SIMPLE = `Item Class: Charms
Rarity: Unique
Nascent Hope
Thawing Charm
--------
Lasts 3 Seconds
Consumes 40 of 40 Charges on use
Currently has 40 Charges
Grants Immunity to Freeze
--------
Requires: Level 12
--------
Item Level: 80
--------
Used when you become Frozen (implicit)
--------
23% Chance to gain a Charge when you kill an enemy
Energy Shield Recharge starts on use
--------
"Even in the face of the Winter of the World,
life found a way. The Spirit always provides."
--------
Used automatically when condition is met. Can only hold charges while in belt. Refill at Wells or by killing monsters.
`;

const CHARM_EXTENDED = `Item Class: Charms
Rarity: Unique
Nascent Hope
Thawing Charm
--------
Lasts 3 Seconds
Consumes 40 of 40 Charges on use
Currently has 40 Charges
Grants Immunity to Freeze
--------
Requires: Level 12
--------
Item Level: 80
--------
{ Implicit Modifier }
Used when you become Frozen — Unscalable Value
--------
{ Unique Modifier — Charm }
Energy Shield Recharge starts on use — Unscalable Value
{ Unique Modifier }
23(20-25)% Chance to gain a Charge when you kill an enemy
--------
"Even in the face of the Winter of the World,
life found a way. The Spirit always provides."
--------
Used automatically when condition is met. Can only hold charges while in belt. Refill at Wells or by killing monsters.
`;

const HELMET_SIMPLE = `Item Class: Helmets
Rarity: Rare
Corpse Horn
Trapper Hood
--------
Quality: +20% (augmented)
Evasion Rating: 692 (augmented)
--------
Requires: Level 75, 107 Dex
--------
Sockets: S
--------
Item Level: 81
--------
8% increased Reservation Efficiency of Minion Skills (rune)
--------
77% increased Evasion Rating
+160 to maximum Life
+30 to maximum Mana
+2 to Level of all Minion Skills
+34% to Fire Resistance (crafted)
+14% to Fire and Chaos Resistances (desecrated)
`;

function flatten(text: string) {
  const res = parseClipboard(text);
  if (!res.isOk()) throw new Error(res.error);
  const item = res.value;
  const stats = item.newMods.flatMap((m) =>
    m.stats.map((s) => ({
      ref: s.stat.ref,
      type: m.info.type,
      value: s.roll?.value,
      tradeIds: s.stat.trade.ids[m.info.type],
    })),
  );
  return { item, stats };
}
const find = (stats: ReturnType<typeof flatten>["stats"], ref: string) =>
  stats.find((s) => s.ref === ref);
const FLAVOR = '"Even in the face of the Winter of the World,';

describe("simple-format (chat-linked) parsing", () => {
  beforeEach(async () => {
    setupTests();
    await init("en");
  });

  it("resolves the simple ring to the same trade IDs/values as extended", () => {
    const { item, stats } = flatten(RING_SIMPLE);
    expect(item.isSimpleCopy).toBe(true);
    expect(find(stats, "#% to Chaos Resistance")).toMatchObject({
      type: "implicit",
      value: 8,
      tradeIds: ["implicit.stat_2923486259"],
    });
    expect(find(stats, "# to maximum Life")).toMatchObject({
      type: "explicit",
      value: 90,
      tradeIds: ["explicit.stat_3299347043"],
    });
    expect(find(stats, "#% increased Rarity of Items found")?.tradeIds).toEqual([
      "explicit.stat_3917489142",
      "explicit.stat_2306002879",
    ]);
    expect(find(stats, "# to Evasion Rating")?.tradeIds).toEqual([
      "explicit.stat_2144192055",
      "explicit.stat_53045048",
    ]);
    expect(stats).toHaveLength(7);
  });

  it("leaves the extended ring unchanged (no regression, flag off)", () => {
    const { item, stats } = flatten(RING_EXTENDED);
    expect(item.isSimpleCopy).toBeFalsy();
    expect(find(stats, "# to maximum Life")?.tradeIds).toEqual([
      "explicit.stat_3299347043",
    ]);
    expect(find(stats, "#% to Chaos Resistance")?.type).toBe("implicit");
    expect(stats).toHaveLength(7);
  });

  it("resolves value-less flag mods on a simple charm; no flavor pollution", () => {
    const { item, stats } = flatten(CHARM_SIMPLE);
    expect(item.isSimpleCopy).toBe(true);
    expect(find(stats, "Used when you become Frozen")).toMatchObject({
      type: "implicit",
      tradeIds: ["implicit.stat_1691862754"],
    });
    expect(find(stats, "Energy Shield Recharge starts on use")?.tradeIds).toEqual(
      ["explicit.stat_1056492907"],
    );
    expect(
      find(stats, "#% Chance to gain a Charge when you kill an enemy")?.value,
    ).toBe(23);
    expect(item.unknownModifiers.map((u) => u.text)).not.toContain(FLAVOR);
  });

  it("buckets per-line types + coalesced rolls on a simple helmet", () => {
    const { item, stats } = flatten(HELMET_SIMPLE);
    expect(item.isSimpleCopy).toBe(true);
    expect(item.armourEV).toBe(692);
    expect(find(stats, "#% to Fire Resistance")?.type).toBe("crafted");
    expect(find(stats, "#% to Fire and Chaos Resistances")?.type).toBe(
      "desecrated",
    );
    expect(find(stats, "# to maximum Life")?.value).toBe(160);
    expect(find(stats, "#% increased Evasion Rating")?.tradeIds).toEqual([
      "explicit.stat_124859000",
      "explicit.stat_2106365538",
    ]);
  });

  it("does not touch an extended charm (gate holds; flavor not parsed)", () => {
    const { item } = flatten(CHARM_EXTENDED);
    expect(item.isSimpleCopy).toBeFalsy();
    expect(item.unknownModifiers.map((u) => u.text)).not.toContain(FLAVOR);
  });
});
