# Simple-Format (Chat-Linked) Item Price-Check — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let EE2 price-check PoE2 items copied in "simple" format (no advanced `{ }` mod blocks) — e.g. items linked in chat, which GGG only lets you copy simple — instead of producing a bare, mod-less item.

**Architecture:** A guarded fallback in `parseModifiers`. Today, a mod section with no `{ }` block, `(enchant)`, `(rune)`, or grant-skill line returns `SECTION_SKIPPED` and the mods are dropped. The fallback instead routes those plain stat lines through the existing line-by-line resolver (the same logic `parseModifiersPoe2` uses), sets `item.isSimpleCopy = true`, and lets the rest of the pipeline run unchanged. Two small downstream touch-ups: the stat-filter fill skips its tier-floor clamp for simple copies (so the configured `searchStatRange` % survives), and the price-check widget shows a "limited data" badge.

**Tech Stack:** TypeScript, Vue 3, Vitest. All changes are renderer-side. Work directly on `master` (casual side-project; no branch).

**Safety invariant (why this can't regress the normal path):** an extended copy renders *every* mod inside a `{ … }` block; a simple copy *never* does (confirmed against thousands of fixtures). The fallback is gated on "no mod-info line anywhere in the item text," so extended items never reach it.

**Verified facts (captured by running the real clipboards through the existing resolver during planning):**
- Simple copies resolve to **byte-identical trade IDs and rolled values** vs the extended copy.
- Per-line type tags work: `(crafted)`→`crafted.*`, `(desecrated)`→`desecrated.*`, `(implicit)`→`implicit.*`, `(rune)`→`rune.*`, untagged→`explicit.*`.
- Value-less "flag" mods (e.g. `Energy Shield Recharge starts on use`) resolve fine (roll `undefined`).
- GGG pre-coalesces same-stat mods in the simple copy (`+160 Life` = 42+118); these resolve to the same single/multi trade-ID set EE2 would compute from the extended copy.
- Total defense (e.g. `armourEV: 692`) comes from the property line, identical in both copies.

**Non-goals (v1):** multi-line simple stats (they fall into `item.unknownModifiers`, visible, not silent — documented limitation; no verified sample to test against yet); faking tier/range data; any config toggle.

---

## Execution

- **Mode:** subagent-driven, in-session, **after a `/compact`**. Dispatch one implementer subagent per task; respect `blockedBy` (Task 1 → Tasks 2 & 3 → Task 4).
- **Commits:** per-task commits as written are fine (casual project; revert individual commits if something misbehaves). No squash required.
- **Branch:** work on `master`, no feature branch.
- **Review:** skip the mandatory per-doc `doc-reviewer` (small change, agreed). Run **one** review at the end — `/code-review` on the full diff after Task 4 — and address findings before wrapping up.
- **Resume after compact:** read this plan + `2026-06-17-simple-copy-price-check.md.tasks.json`; the native task list (Tasks 1–4) also persists across compaction. The scratch `chat-simple-copy.experiment.test.ts` may still be present — Task 1 Step 6 removes it.

---

### Task 1: Parser fallback + `isSimpleCopy` flag (+ regression suite)

**Goal:** `parseModifiers` resolves simple-format mod sections via a guarded, rollback-safe fallback, sets `item.isSimpleCopy`, and a test suite proves simple ≡ extended trade IDs with no regression to extended items.

**Files:**
- Modify: `renderer/src/parser/ParsedItem.ts` (add `isSimpleCopy?: boolean`)
- Modify: `renderer/src/parser/Parser.ts` (add `isSimpleCopyFormat` + `parseSimpleModLines` helpers; fallback at the `parseModifiers` bail)
- Create: `renderer/specs/web/simple-copy.test.ts`
- Delete: `renderer/specs/web/chat-simple-copy.experiment.test.ts` (scratch; promoted into the file above)

**Acceptance Criteria:**
- [ ] Simple ring resolves 7 stats with the same trade IDs + values as the extended ring; `item.isSimpleCopy === true`.
- [ ] Extended ring still parses those 7 stats; `item.isSimpleCopy` is falsy.
- [ ] Simple charm: value-less flag mods resolve; `(implicit)` line → `implicit.*`; flavor text is NOT in `unknownModifiers`.
- [ ] Simple helmet: `(crafted)`/`(desecrated)` lines bucket to `crafted.*`/`desecrated.*`; coalesced `+160 Life` resolves; `armourEV === 692`.
- [ ] Extended charm (has flavor + help text sections): `item.isSimpleCopy` falsy and flavor text NOT in `unknownModifiers` (gate + no speculative parsing).

**Verify:** `cd renderer && npx vitest run specs/web/simple-copy.test.ts` → all pass; `npm run check-types` → clean.

**Steps:**

- [ ] **Step 1: Add the flag to the `ParsedItem` interface**

In `renderer/src/parser/ParsedItem.ts`, inside `interface ParsedItem`, add near the other boolean flags (e.g. after `isFoil?: boolean;`):

```ts
  /** Item was copied in "simple" format (no advanced { } mod blocks),
   *  e.g. linked in chat. Mods parsed via the lenient fallback; tier/range
   *  data is unavailable. */
  isSimpleCopy?: boolean;
```

No change to `createVirtualItem` (optional field defaults to `undefined`).

- [ ] **Step 2: Write the failing test suite**

Create `renderer/specs/web/simple-copy.test.ts`:

```ts
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
```

- [ ] **Step 3: Run the suite — confirm it fails**

Run: `cd renderer && npx vitest run specs/web/simple-copy.test.ts`
Expected: FAIL — the simple cases resolve 0 stats (`isSimpleCopy` undefined, `find(...)` returns undefined) because the fallback doesn't exist yet. (The extended cases should already pass.)

- [ ] **Step 4: Add the helpers + fallback in `Parser.ts`**

`isModInfoLine`, `parseModType`, `parseStatsFromMod`, `ModifierType`, `ItemCategory`, and the `ParsedModifier` type are already imported/in-scope in `Parser.ts`. Add these two functions (place them just above `function parseModifiers(` near line 1235):

```ts
// Extended copies render every mod inside a { ... } block; simple copies
// (e.g. items linked in chat) never do. If the item text has no mod-info line
// at all, it's a simple-format copy.
function isSimpleCopyFormat(item: ParsedItem): boolean {
  return !item.rawText
    .split(/\r?\n/)
    .some((line) => isModInfoLine(line.trim()));
}

// Resolve plain stat lines from a simple copy. One line per stat (GGG
// coalesces same-stat mods); per-line type comes from the trailing tag
// (e.g. "(crafted)"/"(desecrated)"/"(implicit)"/"(rune)"), untagged → Explicit.
// Returns true if >= 1 stat resolved.
// LIMITATION (v1): multi-line stats are parsed line-by-line and will not match;
// their lines fall into item.unknownModifiers (visible, not silent).
function parseSimpleModLines(section: string[], item: ParsedItem): boolean {
  let resolvedAny = false;
  for (const statLine of section) {
    let { modType, lines } = parseModType([statLine]);
    if (
      modType === ModifierType.Explicit &&
      item.category === ItemCategory.Relic
    ) {
      modType = ModifierType.Sanctum;
    }
    const modifier: ParsedModifier = {
      info: { type: modType, tags: [] },
      stats: [],
    };
    parseStatsFromMod(lines, item, modifier);
    if (modifier.stats.length > 0) resolvedAny = true;
    if (modType === ModifierType.Veiled) {
      item.isVeiled = true;
    }
  }
  return resolvedAny;
}
```

Then change the bail in `parseModifiers` (currently `Parser.ts:1254-1256`):

```ts
  if (!recognizedLine) {
    return "SECTION_SKIPPED";
  }
```

to:

```ts
  if (!recognizedLine) {
    // Simple-copy fallback: items copied without advanced descriptions render
    // mods as plain lines. Extended copies ALWAYS use { } blocks, so the gate
    // keeps them out of this branch entirely (zero regression).
    if (isSimpleCopyFormat(item)) {
      const newModsBefore = item.newMods.length;
      const unknownBefore = item.unknownModifiers.length;
      if (parseSimpleModLines(section, item)) {
        item.isSimpleCopy = true;
        return "SECTION_PARSED";
      }
      // Non-mod section (flavor/help text) on a simple item: undo the
      // speculative pushes so it doesn't pollute newMods/unknownModifiers.
      item.newMods.length = newModsBefore;
      item.unknownModifiers.length = unknownBefore;
    }
    return "SECTION_SKIPPED";
  }
```

- [ ] **Step 5: Run the suite — confirm it passes**

Run: `cd renderer && npx vitest run specs/web/simple-copy.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Delete the scratch experiment file**

```bash
rm renderer/specs/web/chat-simple-copy.experiment.test.ts
```

- [ ] **Step 7: Type-check + commit**

```bash
cd renderer && npm run check-types
# the experiment file is untracked scratch; the `rm` in Step 6 is enough
git add renderer/src/parser/ParsedItem.ts renderer/src/parser/Parser.ts renderer/specs/web/simple-copy.test.ts
git commit -m "feat(parser): price-check simple-format (chat-linked) items"
```

---

### Task 2: Filter seeding — keep the fill % for simple copies

**Goal:** For `item.isSimpleCopy`, the stat-filter fill applies the configured `searchStatRange` % to the rolled value instead of collapsing to the exact value.

**Why:** For a simple copy `roll.min === roll.max === value` (no range in the text), so `filterBounds` becomes `[value, value]` and the existing clamp `Math.max(filterDefault.min, filterBounds.min)` cancels the fill — you'd search at exact value. Skipping the clamp for simple copies restores the intended "% below the roll" behavior. No tier floor is possible (no tier data).

**Files:**
- Modify: `renderer/src/web/price-check/filters/create-stat-filters.ts` (two clamp sites: `~331-332` in `shortRollToFilter`, `~534-535` in `calculatedStatToFilter`)
- Modify: `renderer/specs/web/simple-copy.test.ts` (add a seeding test)

**Acceptance Criteria:**
- [ ] For a simple ring's `# to maximum Life` (value 90) at fill 20%, the filter's `default.min` is `72` (fill applied).
- [ ] With `isSimpleCopy` false, the same input clamps `default.min` to `90` (unchanged behavior).

**Verify:** `cd renderer && npx vitest run specs/web/simple-copy.test.ts` → all pass.

**Steps:**

- [ ] **Step 1: Add the failing seeding test**

Append to `renderer/specs/web/simple-copy.test.ts` (it can reuse `RING_SIMPLE`, `parseClipboard`, `find`). Add this import at the top:

```ts
import { calculatedStatToFilter } from "@/web/price-check/filters/create-stat-filters";
```

Add inside the `describe`:

```ts
  it("applies fill % (no tier-floor clamp) for simple copies", () => {
    const res = parseClipboard(RING_SIMPLE);
    if (!res.isOk()) throw new Error(res.error);
    const item = res.value;
    const lifeCalc = item.statsByType.find(
      (c) => c.stat.ref === "# to maximum Life",
    )!;
    expect(lifeCalc).toBeDefined();

    // simple copy → fill applies: 90 - 20% = 72
    const simple = calculatedStatToFilter(lifeCalc, 20, item);
    expect(simple.roll!.default.min).toBe(72);

    // not a simple copy → clamped to the (degenerate) bounds = value
    const clamped = calculatedStatToFilter(lifeCalc, 20, {
      ...item,
      isSimpleCopy: false,
    });
    expect(clamped.roll!.default.min).toBe(90);
  });
```

Run: `cd renderer && npx vitest run specs/web/simple-copy.test.ts -t "fill"`
Expected: FAIL — `simple.roll.default.min` is `90` (clamp still active).

- [ ] **Step 2: Guard both clamp sites**

In `calculatedStatToFilter` (`create-stat-filters.ts:534-535`), replace:

```ts
    filterDefault.min = Math.max(filterDefault.min, filterBounds.min);
    filterDefault.max = Math.min(filterDefault.max, filterBounds.max);
```

with:

```ts
    if (!item.isSimpleCopy) {
      filterDefault.min = Math.max(filterDefault.min, filterBounds.min);
      filterDefault.max = Math.min(filterDefault.max, filterBounds.max);
    }
```

In `shortRollToFilter` (`create-stat-filters.ts:331-332`), apply the identical guard:

```ts
  if (!item.isSimpleCopy) {
    filterDefault.min = Math.max(filterDefault.min, filterBounds.min);
    filterDefault.max = Math.min(filterDefault.max, filterBounds.max);
  }
```

(`item` is in scope in both functions.)

- [ ] **Step 3: Run the test — confirm pass**

Run: `cd renderer && npx vitest run specs/web/simple-copy.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 4: Type-check + commit**

```bash
cd renderer && npm run check-types
git add renderer/src/web/price-check/filters/create-stat-filters.ts renderer/specs/web/simple-copy.test.ts
git commit -m "feat(filters): keep fill % for simple-copy items (skip tier-floor clamp)"
```

---

### Task 3: "Limited data" badge on the price-check widget

**Goal:** When `item.isSimpleCopy`, show a small notice so users (especially newer ones) understand why tier/range data is missing and what to do.

**Files:**
- Modify: `renderer/src/web/price-check/CheckedItem.vue` (template only)

**Acceptance Criteria:**
- [ ] When the parsed item has `isSimpleCopy === true`, a notice renders above the filters with text: "Limited data — copied without advanced descriptions. Tier/range filters unavailable; hover the real item for full data."
- [ ] No notice for normal (extended) items.

**Verify:** `cd renderer && npm run check-types && npm run lint`; then manual: in the running dev overlay, copy a chat-linked item and confirm the banner appears (and does NOT appear for a normally-hovered item).

**Steps:**

- [ ] **Step 1: Add the banner to the template**

In `renderer/src/web/price-check/CheckedItem.vue`, inside `<div v-if="noUniqueSelection" ...>`, immediately after `<filter-name :filters="itemFilters" :item="item" />` (line 3), add:

```html
    <div
      v-if="item.isSimpleCopy"
      class="mb-2 px-2 py-1 rounded bg-orange-700 text-xs"
    >
      {{
        t(
          "Limited data — copied without advanced descriptions. Tier/range filters unavailable; hover the real item for full data.",
        )
      }}
    </div>
```

`item` and `t` are already exposed by `setup()`. The string renders via vue-i18n `fallbackFormat: true` (same pattern as the existing `t("Search")`); no `app_i18n.json` change needed. (For future translations, the key can be added to `renderer/public/data/<lang>/app_i18n.json`.)

- [ ] **Step 2: Type-check + lint + commit**

```bash
cd renderer && npm run check-types && npm run lint
git add renderer/src/web/price-check/CheckedItem.vue
git commit -m "feat(ui): show limited-data badge for simple-copy items"
```

---

### Task 4: Full quality gates

**Goal:** Confirm the whole renderer suite + gates are green with all changes in place.

**Files:** none (verification only)

**Acceptance Criteria:**
- [ ] `npm run check-types`, `npm run lint`, `npm test` all pass.
- [ ] `npm run format` leaves the changed files clean (or its formatting is committed).

**Verify:** commands below all exit 0.

**Steps:**

- [ ] **Step 1: Run all gates**

```bash
cd renderer
npm run check-types
npm run lint
npm run format
npm test
```

Expected: all pass; `simple-copy.test.ts` green; no unexpected failures elsewhere.

- [ ] **Step 2: Commit any formatting**

```bash
cd renderer
git add -A
git commit -m "chore: formatting for simple-copy feature" || echo "nothing to format"
```

---

## Self-Review notes

- **Spec coverage:** trigger (auto format-based) → Task 1 gate `isSimpleCopyFormat`; parse fallback → Task 1; flag → Task 1; seeding (fill % minus tier-floor) → Task 2; badge → Task 3; tests incl. unscalable/coalesced/no-pollution → Tasks 1-2. Multi-line is an explicit non-goal (documented in the `parseSimpleModLines` comment).
- **Identifiers verified:** every trade-ID, stat ref, rolled value, and `armourEV` in the tests was captured by running the real clipboards through the existing resolver during planning (not guessed). `percentRoll(90,-20,floor)=72` verified against `util.ts`.
- **Type consistency:** helper names `isSimpleCopyFormat` / `parseSimpleModLines` used consistently; `item.isSimpleCopy` is the single flag across parser, filters, and UI.
- **Multi-line test:** intentionally omitted — no verified multi-line PoE2 sample on hand; writing one would be a fabricated identifier. The limitation is documented in code. Revisit if a real sample is captured.
