<template>
  <div
    v-if="result"
    :class="[
      $style['wrapper'],
      $style[clickPosition],
      isWide && $style['wide'],
    ]"
  >
    <div v-if="'error' in result" class="p-2">
      {{ result.error }}
    </div>
    <div v-if="'related' in result" class="flex-1 p-2 w-1/2">
      <div
        v-for="item in result.related"
        :key="item.name"
        :class="{ 'bg-gray-700': item.highlight }"
        class="rounded px-1"
      >
        <item-quick-price
          currency-text
          fraction
          class="text-base"
          :price="item.price"
          :item-img="item.icon"
        />
        <div
          class="text-left text-gray-600 mb-1 whitespace-nowrap overflow-hidden"
        >
          {{ item.name }}
        </div>
      </div>
    </div>
    <div
      v-if="'items' in result && result.items.length"
      class="flex-1 p-2 w-1/2"
    >
      <div
        v-for="item in result.items"
        :key="item.name"
        :class="{ 'bg-gray-700': 'highlight' in item && item.highlight }"
        class="rounded px-1"
      >
        <item-quick-price
          currency-text
          fraction
          class="text-base"
          :price="item.price"
          :item-img="item.icon"
        />
        <div
          class="text-left text-gray-600 mb-1 whitespace-nowrap overflow-hidden"
        >
          {{ item.name }}
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType } from "vue";
import { BaseType, ITEM_BY_REF } from "@/assets/data";
import { usePoeninja, CurrencyValue } from "@/web/background/Prices";
import { getDetailsId } from "../trends/getDetailsId";
import { ParsedItem } from "@/parser";
import ItemQuickPrice from "@/web/ui/ItemQuickPrice.vue";
import { isUncutGem, uncutGemLadder } from "./uncut-gem-ladder";
import { currencyFamily } from "./currency-family";

const { findPriceByQuery, autoCurrency, ITEM_DROP } = usePoeninja();

function findItemByQueryId(queryId: string): BaseType | undefined {
  const [ns, encodedName] = queryId.split("::");
  const [name, variant] = encodedName.split(" // ");
  let found = ITEM_BY_REF(ns as unknown as BaseType["namespace"], name);
  if (found && ns === "UNIQUE") {
    const filtered = found.filter((unique) => unique.unique!.base === variant);
    if (filtered.length) found = filtered;
  }
  // return any first item
  if (found && found.length) return found[0];
}

function findPriceByQueryId(queryId: string) {
  const [ns, encodedName] = queryId.split("::");
  const [name, variant] = encodedName.split(" // ");
  const priceEntry = findPriceByQuery({ ns, name, variant });
  if (priceEntry) {
    return autoCurrency(priceEntry.primaryValue);
  }
}

function getItemPrices(queryId: string) {
  const dropEntry = ITEM_DROP.value.find((entry) =>
    entry.query.includes(queryId),
  );
  if (!dropEntry) return null;

  const out = {
    related: [] as Array<{
      name: string;
      icon: string;
      price?: CurrencyValue;
      highlight: boolean;
    }>,
    items: [] as Array<{ name: string; icon: string; price?: CurrencyValue }>,
  };
  for (const itemId of dropEntry.query) {
    const dbItem = findItemByQueryId(itemId);
    if (!dbItem) return { error: `Can't find "${itemId}".` };

    out.related.push({
      icon: dbItem.icon,
      name: dbItem.name,
      price: findPriceByQueryId(itemId),
      highlight: itemId === queryId,
    });
  }
  for (const itemId of dropEntry.items) {
    const dbItem = findItemByQueryId(itemId);
    if (!dbItem) return { error: `Can't find "${itemId}".` };

    out.items.push({
      icon: dbItem.icon,
      name: dbItem.name,
      price: findPriceByQueryId(itemId),
    });
  }

  return out;
}

// Uncut gems (Skill / Spirit / Support) show the whole level ladder of their own
// type instead of an item-drop group: a quick read of the going rate per level.
function getUncutGemPrices(item: ParsedItem) {
  const rows = uncutGemLadder(item);
  if (!rows.length) return null;
  return {
    related: rows.map((row) => ({
      icon: row.icon,
      name: row.name,
      price: findPriceByQueryId(`${row.ns}::${row.ref}`),
      highlight: row.ref === item.info.refName,
    })),
    items: [] as Array<{ name: string; icon: string; price?: CurrencyValue }>,
  };
}

type FamilyCell = {
  name: string;
  icon: string;
  price?: CurrencyValue;
  highlight: boolean;
};

// A family larger than this overflows a single column on a normal screen, so
// it's split across both columns in a wider panel (e.g. the ~28 Ritual omens).
// Smaller families (essences, runes, …) stay single-column.
const MAX_SINGLE_COLUMN_ROWS = 20;

// Currency-exchange families (e.g. essences, omens) show their whole group's
// prices side by side, like the uncut-gem ladder, instead of an item-drop group.
function getCurrencyFamilyPrices(item: ParsedItem) {
  const rows = currencyFamily(item);
  if (!rows) return null;
  const cells: FamilyCell[] = rows.map((row) => ({
    icon: row.icon,
    name: row.name,
    price: findPriceByQueryId(`${row.ns}::${row.ref}`),
    highlight: row.ref === item.info.refName,
  }));
  if (cells.length > MAX_SINGLE_COLUMN_ROWS) {
    const half = Math.ceil(cells.length / 2);
    return {
      related: cells.slice(0, half),
      items: cells.slice(half),
      wide: true,
    };
  }
  return { related: cells, items: [] as FamilyCell[] };
}

export default defineComponent({
  components: { ItemQuickPrice },
  props: {
    item: {
      type: Object as PropType<ParsedItem | null>,
      default: null,
    },
    clickPosition: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const result = computed(() => {
      if (!props.item) return;

      if (isUncutGem(props.item)) {
        return getUncutGemPrices(props.item) ?? undefined;
      }

      const family = getCurrencyFamilyPrices(props.item);
      if (family) return family;

      const queryId = getDetailsId(props.item);
      if (!queryId) return;

      return getItemPrices(
        `${queryId.ns}::${queryId.name}${queryId.variant ? ` // ${queryId.variant}` : ""}`,
      );
    });

    // Large families (e.g. the ~28 Ritual omens) render across both columns in
    // a wider panel so they all fit on-screen at once.
    const isWide = computed(() => {
      const r = result.value;
      return !!(r && "wide" in r && r.wide);
    });

    return { result, isWide };
  },
});
</script>

<style lang="postcss" module>
.wrapper {
  display: flex;
  @apply bg-gray-800 text-gray-400 mt-6;
  @apply border border-gray-900;
  border-width: 0.25rem;
  max-width: min(100%, 24rem);
}

/* Two-column families (e.g. the ~28 Ritual omens) need more width so the long
   names in each half-width column stay readable. */
.wide {
  max-width: min(100%, 36rem);
}

.inventory {
  @apply rounded-l-lg;
  box-shadow: inset -0.5rem 0 0.5rem -0.5rem rgb(0 0 0 / 70%);
  border-right: none;
}

.stash {
  @apply rounded-r-lg;
  box-shadow: inset 0.5rem 0 0.5rem -0.5rem rgb(0 0 0 / 70%);
  border-left: none;
}
</style>
