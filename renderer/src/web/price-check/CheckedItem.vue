<template>
  <div v-if="noUniqueSelection" class="p-4 layout-column min-h-0">
    <filter-name :filters="itemFilters" :item="item" />
    <div
      v-if="item.isSimpleCopy"
      class="mb-2 flex items-baseline gap-x-2 rounded bg-orange-700 px-2 py-1 text-sm"
    >
      <i class="shrink-0 fas fa-exclamation-triangle"></i>
      <span>{{
        t(
          "Copied from chat — mod ranges are missing, so filters may be off. Hover the real item for full data.",
        )
      }}</span>
    </div>
    <div
      v-if="noPriceData"
      class="mb-2 flex items-baseline gap-x-2 rounded bg-orange-700 px-2 py-1 text-sm"
    >
      <i class="shrink-0 fas fa-exclamation-triangle"></i>
      <span>{{ t("No price data — this item isn't on poe.ninja yet.") }}</span>
    </div>
    <!-- <price-prediction v-if="showPredictedPrice" class="mb-4" :item="item" /> -->
    <!-- <price-trend v-else :item="item" :filters="itemFilters" /> -->
    <price-trend :item="item" :filters="itemFilters" />
    <filters-block
      ref="filtersComponent"
      :filters="itemFilters"
      :stats="itemStats"
      :item="item"
      :presets="presets"
      @preset="selectPreset"
      @submit="doSearch = true"
      :rebuild-key="rebuildKey"
    />
    <trade-listing
      v-if="tradeAPI === 'trade' && doSearch && !noPriceData"
      ref="tradeService"
      :filters="itemFilters"
      :stats="itemStats"
      :item="item"
    />
    <trade-bulk
      v-if="tradeAPI === 'bulk' && doSearch"
      ref="tradeService"
      :filters="itemFilters"
      :item="item"
    />
    <div
      v-if="!doSearch && !noPriceData"
      class="flex justify-between items-center"
    >
      <div class="flex w-40" @mouseenter="handleSearchMouseenter">
        <button class="btn" @click="doSearch = true" style="min-width: 5rem">
          {{ t("Search") }}
        </button>
      </div>
      <div class="flex flex-row gap-1">
        <trade-links v-if="tradeAPI === 'trade'" :get-link="makeTradeLink" />
      </div>
    </div>
    <stack-value :filters="itemFilters" :item="item" />
    <div v-if="showSupportLinks" class="mt-auto border border-dashed p-2">
      <!-- <div class="mb-1">
        {{ t("Support development on") }}
        <a
          href="https://patreon.com/awakened_poe_trade"
          class="inline-flex align-middle animate__animated animate__fadeInRight"
          target="_blank"
          ><img class="inline h-5" src="/images/Patreon.svg"
        /></a>
      </div> -->
      <i18n-t keypath="app.thanks_3rd_party" tag="div">
        <a
          href="https://poe.ninja/support"
          target="_blank"
          class="bg-gray-900 px-1 rounded"
          >poe.ninja</a
        >
      </i18n-t>
    </div>
    <tip v-else-if="showTip" :selected="showTip" />
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  PropType,
  watch,
  ref,
  nextTick,
  computed,
  ComponentPublicInstance,
} from "vue";
import { useI18n } from "vue-i18n";
import { ItemRarity, ItemCategory, ParsedItem } from "@/parser";
import TradeListing from "./trade/TradeListing.vue";
import TradeBulk from "./trade/TradeBulk.vue";
import TradeLinks from "./trade/TradeLinks.vue";
import { apiToSatisfySearch, getTradeEndpoint } from "./trade/common";
import PriceTrend from "./trends/PriceTrend.vue";
import { getDetailsId } from "./trends/getDetailsId";
import { usePoeninja } from "@/web/background/Prices";
import FiltersBlock from "./filters/FiltersBlock.vue";
import { createPresets } from "./filters/create-presets";
import PricePrediction from "./price-prediction/PricePrediction.vue";
import StackValue from "./stack-value/StackValue.vue";
import FilterName from "./filters/FilterName.vue";
import Tip from "../help/Tip.vue";
import {
  CATEGORY_TO_TRADE_ID,
  createTradeRequest,
} from "./trade/pathofexile-trade";
import { AppConfig, TipsFrequency } from "@/web/Config";
import { FilterPreset } from "./filters/interfaces";
import { PriceCheckWidget } from "../overlay/interfaces";
import { useLeagues } from "@/web/background/Leagues";
import { randomTip, TIP_FREQUENCY_MAP } from "../help/tips";

let _showSupportLinksCounter = 0;
let _showTipCounter = 15;

export default defineComponent({
  name: "CheckedItem",
  emits: ["item-editor-selection"],
  components: {
    PricePrediction,
    TradeListing,
    TradeBulk,
    TradeLinks,
    PriceTrend,
    FiltersBlock,
    FilterName,
    StackValue,
    Tip,
  },
  props: {
    item: {
      type: Object as PropType<ParsedItem>,
      required: true,
    },
    advancedCheck: {
      type: Boolean,
      required: true,
    },
    rebuildKey: {
      type: Number,
      required: true,
    },
  },
  setup(props, ctx) {
    const widget = computed(() => AppConfig<PriceCheckWidget>("price-check")!);
    const leagues = useLeagues();
    const { findPriceByQuery } = usePoeninja();

    const presets = ref<{ active: string; presets: FilterPreset[] }>(null!);
    const itemFilters = computed(
      () =>
        presets.value.presets.find(
          (preset) => preset.id === presets.value.active,
        )!.filters,
    );
    const itemStats = computed(
      () =>
        presets.value.presets.find(
          (preset) => preset.id === presets.value.active,
        )!.stats,
    );
    const doSearch = ref(false);
    const tradeAPI = ref<"trade" | "bulk">("bulk");

    // TradeListing.vue OR TradeBulk.vue
    const tradeService = ref<{ execSearch(): void } | null>(null);
    // FiltersBlock.vue
    const filtersComponent = ref<ComponentPublicInstance>(null!);

    watch(
      () => props.item,
      (item, prevItem) => {
        performance.mark("checked-item-item-changed");
        const prevCurrency =
          presets.value != null ? itemFilters.value.trade.currency : undefined;
        const prevListingType =
          presets.value != null
            ? itemFilters.value.trade.listingType
            : undefined;

        presets.value = createPresets(item, {
          league: leagues.selectedId.value!,
          collapseListings: widget.value.collapseListings,
          activateStockFilter: widget.value.activateStockFilter,
          searchStatRange: widget.value.searchStatRange,
          useEn:
            (AppConfig().language === "cmn-Hant" &&
              AppConfig().realm === "pc-ggg") ||
            AppConfig().preferredTradeSite === "www",
          currency:
            widget.value.rememberCurrency ||
            (prevItem &&
              item.info.namespace === prevItem.info.namespace &&
              item.info.refName === prevItem.info.refName)
              ? prevCurrency
              : undefined,
          listingType: widget.value.rememberListingType
            ? prevListingType
            : undefined,
          defaultAllSelected: widget.value.defaultAllSelected,
          autoFillEmptyAugmentSockets: widget.value.autoFillEmptyRuneSockets,
        });

        if (
          (!props.advancedCheck && !widget.value.smartInitialSearch) ||
          (props.advancedCheck && !widget.value.lockedInitialSearch)
        ) {
          doSearch.value = false;
        } else {
          doSearch.value = Boolean(
            item.rarity === ItemRarity.Unique ||
              item.category === ItemCategory.HeistBlueprint ||
              item.category === ItemCategory.SanctumRelic ||
              item.category === ItemCategory.Charm ||
              !CATEGORY_TO_TRADE_ID.has(item.category!) ||
              item.isUnidentified ||
              item.isVeiled,
          );
        }

        tradeAPI.value = apiToSatisfySearch(
          props.item,
          itemStats.value,
          itemFilters.value,
        );

        if (tradeAPI.value === "bulk") {
          itemFilters.value.trade.listingType = "online";
          // Currency-exchange items: PriceTrend already shows the poe.ninja
          // exchange price with no per-check API call, so don't auto-fire the live
          // GGG exchange search — rapid currency checks otherwise drain the
          // separate exchange rate limit. Wait for the user to press Search to pull
          // the live order book on demand.
          doSearch.value = false;
        }
        performance.mark("checked-item-switch-item-end");
      },
      { immediate: true, deep: true },
    );

    watch(
      () => [props.item, doSearch.value],
      () => {
        if (doSearch.value === false) return;

        tradeAPI.value = apiToSatisfySearch(
          props.item,
          itemStats.value,
          itemFilters.value,
        );

        // NOTE: child `trade-xxx` component renders/receives props on nextTick
        nextTick(() => {
          if (tradeService.value) {
            tradeService.value.execSearch();
          }
        });
      },
      { deep: false, immediate: true },
    );

    watch(
      () => [props.item, doSearch.value, itemStats.value, itemFilters.value],
      (curr, prev) => {
        const cItem = curr[0];
        const pItem = prev[0];
        const cIntaracted = curr[1];
        const pIntaracted = prev[1];

        if (cItem === pItem && cIntaracted === true && pIntaracted === true) {
          // force user to press Search button on change
          doSearch.value = false;
        }
      },
      { deep: true },
    );

    watch(
      () => [props.item, JSON.stringify(itemFilters.value.trade)],
      (curr, prev) => {
        const cItem = curr[0];
        const pItem = prev[0];
        const cTrade = curr[1];
        const pTrade = prev[1];

        if (cItem === pItem && cTrade !== pTrade) {
          nextTick(() => {
            doSearch.value = true;
          });
        }
      },
      { deep: false },
    );

    const noUniqueSelection = computed(() => {
      return !(
        props.item.rarity === ItemRarity.Unique &&
        props.item.isUnidentified &&
        props.item.info.unique == null
      );
    });

    // Currency-exchange socketables (idols / soul cores) with no GGG trade
    // tradeTag fall back to face-to-face trade listings, and a few (the
    // Hawk/Panther/Stoat idols) aren't on poe.ninja either — so no reliable
    // price shows at all. Warn instead of leaving the price area blank.
    // (Rarity "Currency" sets item.category to Currency, so key on the base's
    // craftable.category, not item.category — see Parser.ts.)
    const noPriceData = computed(() => {
      const item = props.item;
      if (
        item.info.craftable?.category !== ItemCategory.SoulCore ||
        item.info.tradeTag
      ) {
        return false;
      }
      const detailsId = getDetailsId(item);
      return !(detailsId && findPriceByQuery(detailsId));
    });

    function handleSearchMouseenter(e: MouseEvent) {
      if (
        (filtersComponent.value.$el as HTMLElement).contains(
          e.relatedTarget as HTMLElement,
        )
      ) {
        doSearch.value = true;

        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
    }

    const showSupportLinks = ref(false);
    const showTip = ref(0);
    watch(
      () => [props.item, doSearch.value],
      ([cItem, cInteracted], [pItem]) => {
        if (
          _showSupportLinksCounter >= 13 &&
          (!cInteracted || tradeAPI.value === "bulk")
        ) {
          showSupportLinks.value = true;
          _showSupportLinksCounter = 0;
        } else {
          showSupportLinks.value = false;
          if (
            AppConfig().tipsFrequency !== TipsFrequency.Never &&
            (AppConfig().tipsFrequency === TipsFrequency.Always ||
              _showTipCounter >=
                TIP_FREQUENCY_MAP[AppConfig().tipsFrequency]) &&
            !cInteracted
          ) {
            _showTipCounter = 0;
            showTip.value = randomTip();
          } else {
            showTip.value = 0;
            if (cItem !== pItem) {
              _showTipCounter += 1;
            }
          }

          if (cItem !== pItem) {
            _showSupportLinksCounter += 1;
          }
        }
      },
    );

    watch(
      () => itemFilters.value.itemEditorSelection,
      (val) => {
        ctx.emit("item-editor-selection", val);
      },
      { deep: true },
    );

    const { t } = useI18n();

    return {
      t,
      itemFilters,
      itemStats,
      doSearch,
      tradeAPI,
      tradeService,
      filtersComponent,
      showTip,
      noUniqueSelection,
      noPriceData,
      handleSearchMouseenter,
      showSupportLinks,
      presets: computed(() =>
        presets.value.presets.map((preset) => ({
          id: preset.id,
          active: preset.id === presets.value.active,
        })),
      ),
      selectPreset(id: string) {
        presets.value.active = id;
      },
      makeTradeLink() {
        return `https://${getTradeEndpoint()}/trade2/search/poe2/${itemFilters.value.trade.league}?q=${JSON.stringify(createTradeRequest(itemFilters.value, itemStats.value, props.item))}`;
      },
    };
  },
});
</script>
