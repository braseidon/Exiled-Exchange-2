/**
 * The Base Item tab (filters.preset_base_item) lets you price-check an item's
 * bare base type. It should appear for every non-unique item that reaches the
 * pseudo/base path — including items with crafted mods, quality, corruption, or
 * a low-value base. Uniques are the only exclusion (no meaningful base search).
 *
 * Tablets are on a separate path: a full Exact tab plus a bare-base tab that
 * keeps only "uses remaining".
 */

import { parseClipboard } from "@/parser";
import { beforeEach, describe, expect, it } from "vitest";
import { setupTests } from "@specs/vitest.setup";
import { init } from "@/assets/data";
import { createPresets } from "@/web/price-check/filters/create-presets";
import { FilterTag } from "@/web/price-check/filters/interfaces";
import { CharmQuality } from "./items";

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

const PSEUDO = "filters.preset_pseudo";
const BASE = "filters.preset_base_item";
const EXACT = "filters.preset_exact";

const CASES: Array<{ name: string; raw: string; expected: string[] }> = [
  {
    // gear: its mods are hidden on the Pseudo tab (rolled into pseudo DPS), so
    // the base tab must keep them — the only place to search the exact roll
    name: "rare crossbow",
    expected: [PSEUDO, BASE],
    raw: `Item Class: Crossbows
Rarity: Rare
Mind Core
Stout Crossbow
--------
Physical Damage: 77-207 (augmented)
Critical Hit Chance: 5.00%
Attacks per Second: 1.55
Reload Time: 0.75
--------
Requires: Level 67, 74 Str, 74 Dex
--------
Item Level: 81
--------
{ Prefix Modifier "Flaring" (Tier: 1) — Damage, Physical, Attack }
Adds 47(37-55) to 88(63-94) Physical Damage
{ Suffix Modifier "of the Vampire" (Tier: 1) — Life, Physical, Attack }
Leeches 9.78(9-9.9)% of Physical Damage as Life
{ Suffix Modifier "of Enveloping" (Tier: 5) — Mana }
Gain 13(10-14) Mana per enemy killed
{ Suffix Modifier "of Nourishment" (Tier: 1) — Life, Attack }
Grants 5 Life per Enemy Hit`,
  },
  {
    // crafted mod previously suppressed the base tab
    name: "rare jewel with crafted + fractured mods",
    expected: [PSEUDO, BASE],
    raw: `Item Class: Jewels
Rarity: Rare
Entropy Eye
Sapphire
--------
Item Level: 22
--------
{ Prefix Modifier "Iconic" (Tier: 1) — Aura }
25(15-25)% increased Presence Area of Effect
{ Crafted Prefix Modifier "" }
44(40-60)% increased Effect of Suffixes — Unscalable Value
{ Fractured Suffix Modifier "of Gripping" (Tier: 1) — Damage, Minion, Critical — 44% Increased }
Minions have 25(15-25)% increased Critical Damage Bonus
{ Suffix Modifier "of Marshalling" (Tier: 1) — Minion, Critical — 44% Increased }
Minions have 20(10-20)% increased Critical Hit Chance
{ Desecrated Suffix Modifier "of Orchestration" (Tier: 1) — Attack, Caster, Speed, Minion — 44% Increased }
Minions have 4(2-4)% increased Attack and Cast Speed
--------
Place into an allocated Jewel Socket on the Passive Skill Tree. Right click to remove from the Socket.
--------
Fractured Item`,
  },
  {
    // quality 20 + crafted mod previously suppressed the base tab
    name: "rare helmet with quality 20 + crafted mod",
    expected: [PSEUDO, BASE],
    raw: `Item Class: Helmets
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
{ Prefix Modifier "Wayfarer's" (Tier: 2) — Mana, Evasion }
36(33-38)% increased Evasion Rating
+30(27-32) to maximum Mana
{ Prefix Modifier "Stag's" (Tier: 1) — Life, Evasion }
41(39-42)% increased Evasion Rating
+42(42-49) to maximum Life
{ Prefix Modifier "Virile" (Tier: 3) — Life }
+118(100-119) to maximum Life
{ Suffix Modifier "of the Despot" (Tier: 1) — Minion, Gem }
+2 to Level of all Minion Skills
{ Desecrated Suffix Modifier "of Amanamu" (Tier: 1) — Elemental, Fire, Chaos, Resistance }
+14(13-17)% to Fire and Chaos Resistances
{ Crafted Suffix Modifier "of the Volcano" (Tier: 3) — Elemental, Fire, Resistance }
+34(31-35)% to Fire Resistance`,
  },
  {
    // corruption (non-modifiable) previously suppressed the base tab
    name: "corrupted rare waystone",
    expected: [PSEUDO, BASE],
    raw: `Item Class: Waystones
Rarity: Rare
Dread Choice
Waystone (Tier 15)
--------
Revives Available: 0 (augmented)
Item Rarity: +41% (augmented)
Pack Size: +28% (augmented)
Monster Rarity: +19% (augmented)
Waystone Drop Chance: +115% (augmented)
--------
Item Level: 80
--------
{ Prefix Modifier "Precise" (Tier: 1) }
Monsters have 34(30-40)% increased Accuracy Rating
{ Prefix Modifier "Thunderous" (Tier: 1) }
Monsters deal 18(15-19)% of Damage as Extra Lightning
{ Prefix Modifier "Shattering" (Tier: 1) }
Monsters Break Armour equal to 29(25-30)% of Physical Damage dealt
{ Prefix Modifier "Venomous" (Tier: 1) }
Monsters have 33(27-33)% chance to Poison on Hit
{ Suffix Modifier "of Evasion" (Tier: 1) }
Monsters are Evasive
{ Suffix Modifier "of Smothering" (Tier: 1) }
Players have 37(40-36)% less Recovery Rate of Life and Energy Shield
{ Suffix Modifier "of Erosion" (Tier: 1) }
Players are periodically Cursed with Elemental Weakness — Unscalable Value
{ Suffix Modifier "of Buffering" (Tier: 1) }
Monsters gain 13(12-25)% of maximum Life as Extra maximum Energy Shield
--------
Can be used in a Map Device, allowing you to enter a Map. Waystones can only be used once.
--------
Corrupted`,
  },
  {
    // already showed the base tab — guard against regression
    name: "clean rare waystone",
    expected: [PSEUDO, BASE],
    raw: `Item Class: Waystones
Rarity: Rare
Desecrated Intent
Waystone (Tier 15)
--------
Revives Available: 2 (augmented)
Item Rarity: +12% (augmented)
Pack Size: +7% (augmented)
Monster Rarity: +18% (augmented)
Monster Effectiveness: +13% (augmented)
Waystone Drop Chance: +60% (augmented)
--------
Item Level: 83
--------
{ Prefix Modifier "Impacting" (Tier: 1) }
Monsters have 94(90-100)% increased Stun Buildup
{ Suffix Modifier "of Enduring" (Tier: 1) }
Monsters are Armoured
{ Suffix Modifier "of Drought" (Tier: 1) }
Players gain 34(35-30)% reduced Flask Charges
{ Suffix Modifier "of Fatigue" (Tier: 1) }
Players have 28(30-25)% less Cooldown Recovery Rate
--------
Can be used in a Map Device, allowing you to enter a Map. Waystones can only be used once.`,
  },
  {
    // already showed the base tab — guard against regression
    name: "magic waystone",
    expected: [PSEUDO, BASE],
    raw: `Item Class: Waystones
Rarity: Magic
Profane Waystone (Tier 15) of Exposure
--------
Revives Available: 4 (augmented)
Item Rarity: +15% (augmented)
Pack Size: +10% (augmented)
Waystone Drop Chance: +40% (augmented)
--------
Item Level: 82
--------
{ Prefix Modifier "Profane" (Tier: 1) }
Monsters deal 15(15-19)% of Damage as Extra Chaos
{ Suffix Modifier "of Exposure" (Tier: 1) }
-6(-8--6)% maximum Player Resistances
--------
Can be used in a Map Device, allowing you to enter a Map. Waystones can only be used once.`,
  },
  {
    // tablets: full Exact tab + bare-base tab (uses-remaining only)
    name: "rare tablet",
    expected: [EXACT, BASE],
    raw: `Item Class: Tablet
Rarity: Rare
Void Terraform
Irradiated Tablet
--------
Item Level: 79
--------
{ Implicit Modifier }
Adds Irradiated to a Map
10 uses remaining
--------
{ Prefix Modifier "Abounding" (Tier: 1) }
Map has 19(15-20)% increased Monster Rarity
{ Prefix Modifier "Bountiful" (Tier: 1) }
32(25-35)% increased Gold found in Map
{ Suffix Modifier "of the Cartographer" (Tier: 1) }
36(30-40)% increased Quantity of Waystones found in Map
{ Suffix Modifier "of the Essence" (Tier: 1) }
Map has 73(70-100)% increased chance to contain Essences
--------
Can be used in a personal Map Device to add modifiers to a Map.`,
  },
  {
    // tablets: full Exact tab + bare-base tab (uses-remaining only)
    name: "magic tablet",
    expected: [EXACT, BASE],
    raw: `Item Class: Tablet
Rarity: Magic
Abyss Tablet of the Depths
--------
Item Level: 80
--------
{ Implicit Modifier }
Adds Abysses to a Map
10 uses remaining
--------
{ Suffix Modifier "of the Depths" (Tier: 1) }
Abysses in Map have 17(10-20)% increased chance to lead to an Abyssal Depths
--------
Can be used in a personal Map Device to add modifiers to a Map.`,
  },
  {
    // currency-exchange socketable (idol / rune / soul core): a commodity traded
    // by its base on the exchange — one Exact tab, no Pseudo/Base Item tab. It's
    // craftable (SoulCore base), so without the SoulCore guard it falls through
    // to the gear/rare path and wrongly gains a Base Item tab.
    name: "currency-exchange idol",
    expected: [EXACT],
    raw: `Item Class: Augment
Rarity: Currency
Hawk Idol
--------
Stack Size: 3/10
Idol
Limited to: 1
--------
Requires: Level 50
--------
Body Armours: 10% increased Deflection Rating
Sceptres: Companions have 12% increased Attack Speed
--------
Place into an empty Augment Socket in a Body Armour or Sceptre to apply its effect to that item. Once socketed it cannot be retrieved but can be replaced by other Augment items.
Shift click to unstack.`,
  },
  {
    // currency-exchange commodity: a stackable orb traded by its base. It carries
    // a tradeTag *and* a craftable category ("Currency"), so the !craftable guard
    // above misses it — without the tradeTag arm it falls through to the gear/rare
    // path and wrongly grows a Pseudo + Base Item tab. One Exact tab, like upstream.
    name: "currency-exchange orb (Orb of Alchemy)",
    expected: [EXACT],
    raw: `Item Class: Stackable Currency
Rarity: Currency
Orb of Alchemy
--------
Stack Size: 11/20
--------
Upgrades a Normal item to a Rare item with new random modifiers
--------
Shift click to unstack.`,
  },
  {
    // a different exchange category (Gems) — proves the tradeTag rule spans more
    // than currency. The leveled name resolves to a tradeTag'd entry.
    name: "currency-exchange gem (Uncut Skill Gem)",
    expected: [EXACT],
    raw: `Item Class: Uncut Skill Gems
Rarity: Currency
Uncut Skill Gem (Level 19)
--------
Creates a Skill Gem or Level an existing gem to level 19
--------
Right Click to engrave a Skill Gem.`,
  },
  {
    // a third exchange category (Fragments) — same rule, different base category.
    name: "currency-exchange fragment (Simulacrum)",
    expected: [EXACT],
    raw: `Item Class: Map Fragments
Rarity: Currency
Simulacrum
--------
Stack Size: 1/10
--------
Travel to the Simulacrum by using this item in a Personal Map Device. Can only be used once.`,
  },
];

describe("Base Item tab presence", () => {
  beforeEach(async () => {
    setupTests();
    await init("en");
  });

  for (const { name, raw, expected } of CASES) {
    it(`${name} → [${expected.join(", ")}]`, () => {
      const res = parseClipboard(raw);
      expect(res.isOk()).toBe(true);
      const { presets } = createPresets(res._unsafeUnwrap(), PRESET_OPTS);
      expect(presets.map((p) => p.id)).toEqual(expected);
    });
  }
});

const rawByName = (name: string) => CASES.find((c) => c.name === name)!.raw;

const baseItemStats = (raw: string) => {
  const { presets } = createPresets(
    parseClipboard(raw)._unsafeUnwrap(),
    PRESET_OPTS,
  );
  return presets.find((p) => p.id === BASE)!.stats;
};

describe("Base Item tab content — gear keeps its rolled mods (pseudo hides them)", () => {
  beforeEach(async () => {
    setupTests();
    await init("en");
  });

  // The Pseudo tab rolls a weapon's added damage into pseudo DPS and hides the
  // raw mod, so the Base Item tab is the only place to search the literal
  // "Adds # to # Physical Damage" roll. Regressed when the strip was keyed on
  // rarity instead of category.
  it("weapon keeps its explicit mods (crossbow)", () => {
    const stats = baseItemStats(rawByName("rare crossbow"));
    expect(stats.map((s) => s.tag)).toContain(FilterTag.Explicit);
    expect(stats.some((s) => /Physical Damage/i.test(s.statRef))).toBe(true);
  });

  // Armour/jewellery resistances + attributes roll into pseudo-totals too — keep
  // them. This helmet has 6 mods, so it also exercises the Base Item tab's
  // bypass of the ">=5 mods ⇒ drop explicit" exact-tab cap: every explicit mod
  // (plus crafted/desecrated) must show, since you uncheck down to the one roll
  // you want rather than exact-matching the whole item.
  it("armour keeps every explicit mod on a 6-mod item (helmet)", () => {
    const tags = baseItemStats(
      rawByName("rare helmet with quality 20 + crafted mod"),
    ).map((s) => s.tag);
    expect(tags).toContain(FilterTag.Explicit);
    expect(tags).toContain(FilterTag.Crafted);
    expect(tags).toContain(FilterTag.Desecrated);
  });
});

describe("Base Item tab content — non-gear bases strip rolled mods", () => {
  beforeEach(async () => {
    setupTests();
    await init("en");
  });

  // Passive jewels are not gear: the Pseudo tab shows their mods unchanged, so
  // the base tab strips them, keeping only the fracture (locked to the base).
  it("keeps the fractured mod but drops removeable mods (jewel)", () => {
    const tags = baseItemStats(
      rawByName("rare jewel with crafted + fractured mods"),
    ).map((s) => s.tag);
    expect(tags).toContain(FilterTag.Fractured);
    expect(tags).not.toContain(FilterTag.Crafted);
    expect(tags).not.toContain(FilterTag.Desecrated);
    expect(tags).not.toContain(FilterTag.Explicit);
  });

  it("omits the empty-modifier filter when over affix capacity (jewel)", () => {
    const refs = baseItemStats(
      rawByName("rare jewel with crafted + fractured mods"),
    ).map((s) => s.statRef);
    expect(refs).not.toContain("# Empty Modifier");
  });
});

describe("Base Item tab content — charms hide rolled mods (any rarity)", () => {
  beforeEach(async () => {
    setupTests();
    await init("en");
  });

  it("magic charm base tab strips explicit/crafted/desecrated", () => {
    const tags = baseItemStats(CharmQuality.rawText).map((s) => s.tag);
    expect(tags).not.toContain(FilterTag.Explicit);
    expect(tags).not.toContain(FilterTag.Crafted);
    expect(tags).not.toContain(FilterTag.Desecrated);
  });

  it("magic charm base tab pre-selects item level (like gear)", () => {
    const { presets } = createPresets(
      parseClipboard(CharmQuality.rawText)._unsafeUnwrap(),
      PRESET_OPTS,
    );
    const base = presets.find((p) => p.id === BASE)!;
    expect(base.filters.itemLevel?.disabled).toBe(false);
  });
});

describe("Base Item tab content — waystones get a corrupted toggle (base only)", () => {
  beforeEach(async () => {
    setupTests();
    await init("en");
  });

  const waystonePresets = () =>
    createPresets(
      parseClipboard(rawByName("clean rare waystone"))._unsafeUnwrap(),
      PRESET_OPTS,
    ).presets;

  it("base tab exposes the corrupted toggle, defaulting to Not Corrupted", () => {
    const base = waystonePresets().find((p) => p.id === BASE)!;
    expect(base.filters.corrupted).toBeDefined();
    expect(base.filters.corrupted?.value).toBe(false);
  });

  it("pseudo tab keeps no corrupted toggle (searched by its mods)", () => {
    const pseudo = waystonePresets().find((p) => p.id === PSEUDO)!;
    expect(pseudo.filters.corrupted).toBeUndefined();
  });
});

describe("Base Item tab content — tablets show only the bare base", () => {
  beforeEach(async () => {
    setupTests();
    await init("en");
  });

  for (const name of ["rare tablet", "magic tablet"]) {
    it(`${name}: base tab keeps only "uses remaining", auto-selected`, () => {
      const stats = baseItemStats(rawByName(name));
      expect(stats.map((s) => s.statRef)).toEqual(["# uses remaining"]);
      expect(stats[0].disabled).toBe(false);
    });

    it(`${name}: no corrupted toggle on any tab (tablets can't be corrupted)`, () => {
      const { presets } = createPresets(
        parseClipboard(rawByName(name))._unsafeUnwrap(),
        PRESET_OPTS,
      );
      for (const preset of presets) {
        expect(preset.filters.corrupted).toBeUndefined();
      }
    });
  }
});

describe("Base Item tab — prices the normal base for waystones/tablets", () => {
  beforeEach(async () => {
    setupTests();
    await init("en");
  });

  // A normal tablet has no rolled mods — just the base + implicit.
  const NORMAL_TABLET = `Item Class: Tablet
Rarity: Normal
Irradiated Tablet
--------
Item Level: 79
--------
{ Implicit Modifier }
Adds Irradiated to a Map
10 uses remaining
--------
Can be used in a personal Map Device to add modifiers to a Map.`;

  const tab = (raw: string, id: string) =>
    createPresets(
      parseClipboard(raw)._unsafeUnwrap(),
      PRESET_OPTS,
    ).presets.find((p) => p.id === id)!;

  // The base tab is pinned to a selected "Normal" badge for every checked
  // rarity — the normal base is the commodity (worth multiples of magic/rare).
  it.each([
    ["rare tablet", () => tab(rawByName("rare tablet"), BASE)],
    ["magic tablet", () => tab(rawByName("magic tablet"), BASE)],
    ["normal tablet", () => tab(NORMAL_TABLET, BASE)],
    ["rare waystone", () => tab(rawByName("clean rare waystone"), BASE)],
    ["magic waystone", () => tab(rawByName("magic waystone"), BASE)],
  ])("%s base tab → Normal, selected", (_name, getBase) => {
    const base = getBase();
    expect(base.filters.rarity?.value).toBe("normal");
    expect(base.filters.rarity?.disabled).toBe(false);
  });

  // The active tab still prices the item as its own rarity — only the base tab
  // diverges to normal.
  it("magic tablet active (exact) tab keeps Magic", () => {
    const active = tab(rawByName("magic tablet"), EXACT);
    expect(active.filters.rarity?.value).toBe("magic");
    expect(active.filters.rarity?.disabled).toBe(false);
  });

  it("rare tablet active (exact) tab stays nonunique", () => {
    expect(tab(rawByName("rare tablet"), EXACT).filters.rarity?.value).toBe(
      "nonunique",
    );
  });

  // Scope guard: gear/jewel bases are NOT pinned — a shell trades across
  // rarities, so its base tab stays any-non-unique.
  it("rare jewel base tab stays nonunique (not pinned to normal)", () => {
    const base = tab(
      rawByName("rare jewel with crafted + fractured mods"),
      BASE,
    );
    expect(base.filters.rarity?.value).toBe("nonunique");
  });
});
