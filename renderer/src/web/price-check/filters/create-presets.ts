import { createFilters } from "./create-item-filters";
import {
  createExactStatFilters,
  initUiModFilters,
} from "./create-stat-filters";
import { sumStatsByModType } from "@/parser/modifiers";
import { ItemCategory, ItemRarity, ParsedItem } from "@/parser";
import { FilterTag, type FilterPreset } from "./interfaces";
import { PriceCheckWidget } from "@/web/overlay/widgets";
import { createUniquePresets, PRESET_UNIQUES } from "./create-unique-filters";

const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V"];

// The Base Item tab on waystones (Map) and tablets prices the *normal* base —
// the rarity that trades as its own commodity (white waystones for rolling,
// normal tablets for chancing/value), often worth several times the magic/rare
// version. Pin the rarity badge to a selected "Normal" (toggleable off → any
// non-unique) regardless of the checked item's rarity. Gear/jewel bases stay
// non-unique: a shell trades across rarities. Done here, not in createFilters,
// because the active and base tabs share one createFilters call — only the base
// preset diverges to normal.
function pinBaseTabToNormal(preset: FilterPreset): void {
  preset.filters.rarity = { value: "normal", disabled: false };
}

export function createPresets(
  item: ParsedItem,
  opts: {
    league: string;
    currency: string | undefined;
    listingType:
      | "securable"
      | "any"
      | "online"
      | "available"
      | "onlineleague"
      | undefined;
    collapseListings: "app" | "api";
    activateStockFilter: boolean;
    searchStatRange: number;
    useEn: boolean;
    defaultAllSelected: boolean;
    autoFillEmptyAugmentSockets: PriceCheckWidget["autoFillEmptyRuneSockets"];
  },
): { presets: FilterPreset[]; active: string } {
  // logbooks aren't real anymore
  if (item.info.refName === "logbook here") {
    return {
      active: ROMAN_NUMERALS[0],
      presets: item.logbookAreaMods!.map<FilterPreset>((area, idx) => ({
        id: ROMAN_NUMERALS[idx],
        filters: createFilters(item, { ...opts, exact: true }),
        stats: createExactStatFilters(item, sumStatsByModType(area), opts),
      })),
    };
  }

  if (
    item.isUnidentified ||
    item.rarity === ItemRarity.Normal ||
    (!item.info.craftable && item.rarity !== ItemRarity.Unique) ||
    ((item.category === ItemCategory.Flask ||
      item.category === ItemCategory.Relic ||
      item.category === ItemCategory.Tincture ||
      item.category === ItemCategory.MemoryLine ||
      item.category === ItemCategory.Invitation ||
      item.category === ItemCategory.HeistContract ||
      item.category === ItemCategory.HeistBlueprint ||
      item.category === ItemCategory.Sentinel ||
      item.category === ItemCategory.Tablet ||
      item.category === ItemCategory.Wombgift) &&
      item.rarity !== ItemRarity.Unique) ||
    (item.category === ItemCategory.Currency && item.trials?.numberOfTrials)
  ) {
    const exactPreset: FilterPreset = {
      id: "filters.preset_exact",
      filters: createFilters(item, { ...opts, exact: true }),
      stats: createExactStatFilters(item, item.statsByType, opts),
    };

    // Tablets also get a bare-base tab: search the unmodified tablet type with
    // only "uses remaining" kept + auto-selected, to find instant-sellers of
    // the base (no tradeTag, so this routes to the trade search, not exchange).
    if (item.category === ItemCategory.Tablet) {
      const baseItemPreset: FilterPreset = {
        id: "filters.preset_base_item",
        filters: createFilters(item, { ...opts, exact: true }),
        stats: createExactStatFilters(item, item.statsByType, opts).filter(
          (filter) => filter.statRef === "# uses remaining",
        ),
      };
      pinBaseTabToNormal(baseItemPreset);
      return {
        active: "filters.preset_exact",
        presets: [exactPreset, baseItemPreset],
      };
    }

    return { active: "filters.preset_exact", presets: [exactPreset] };
  }

  if (PRESET_UNIQUES.has(item.info.refName)) {
    return createUniquePresets(item, opts);
  }

  // TODO: pseudo change here
  const pseudoPreset: FilterPreset = {
    id: "filters.preset_pseudo",
    filters: createFilters(item, { ...opts, exact: false }),
    stats: initUiModFilters(item, opts),
  };

  // Apply augments if we should
  // if (
  //   (item.rarity === ItemRarity.Magic || item.rarity === ItemRarity.Rare) &&
  //   pseudoPreset.filters.itemEditorSelection &&
  //   !pseudoPreset.filters.itemEditorSelection.disabled &&
  //   opts.autoFillEmptyAugmentSockets
  // ) {
  //   handleApplyItemEdits(
  //     pseudoPreset.stats,
  //     item,
  //     pseudoPreset.filters.tempAugmentStorage ?? [],
  //     opts.autoFillEmptyAugmentSockets ?? "None",
  //   );
  // }

  // Uniques are the only items with no meaningful base to price-check; every
  // other non-unique item on this path gets a Base Item tab (even with crafted
  // mods, quality, corruption, or a low-value base — showing the bare-base
  // search is harmless and often useful, e.g. valuing a fracture).
  if (item.rarity === ItemRarity.Unique) {
    return { active: pseudoPreset.id, presets: [pseudoPreset] };
  }

  // The Base Item tab prices the bare base: keep fractured mods (locked to the
  // base) and base implicits, but strip removeable mods (explicit/crafted/
  // desecrated). Applies to rares, and to charms of any rarity — a charm's
  // value is its base + quality (which can't be crafted on), not its rolled
  // mods. Other magic items keep their mods: searching a magic base by its
  // rolled mods + tier is a deliberate, useful query.
  let baseItemStats = createExactStatFilters(item, item.statsByType, opts);
  if (item.rarity === ItemRarity.Rare || item.category === ItemCategory.Charm) {
    baseItemStats = baseItemStats.filter(
      (filter) =>
        filter.tag !== FilterTag.Explicit &&
        filter.tag !== FilterTag.Crafted &&
        filter.tag !== FilterTag.Desecrated,
    );
  }
  const baseItemPreset: FilterPreset = {
    id: "filters.preset_base_item",
    filters: createFilters(item, { ...opts, exact: true }),
    stats: baseItemStats,
  };
  if (item.category === ItemCategory.Map) {
    pinBaseTabToNormal(baseItemPreset);
  }

  return {
    active: pseudoPreset.id,
    presets: [pseudoPreset, baseItemPreset],
  };
}
