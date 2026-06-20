# Fork changes — Exiled Exchange 2 (braseidon fork)

Fixes and features this fork (`braseidon/Exiled-Exchange-2`) carries on top of upstream
`Kvan7/Exiled-Exchange-2`. Each entry is added **only after it's verified in-game** — work that's
written and unit-tested but not yet confirmed stays in `todo.md` until then.

Commit SHAs are the source of truth for the diffs; this file is the human-readable index so our
changes don't get lost when an upstream merge buries them in `git log`.

## Shipped & verified

### Price-check chat-linked (simple-format) items
Items linked in chat (the simplified copy format) now price-check correctly: mods resolve against
the stat DB, the fill % is preserved for them (the tier-floor clamp is skipped, since simple-format
items lack the tier data that clamp needs), and a **"Limited data"** badge shows in the overlay so
the reduced confidence is obvious.

- `6b10fdef` — parser: recognize and parse simple-format items
- `fbe08069` — filters: keep fill % for simple-copy items (skip tier-floor clamp)
- `67c7d039` — ui: show limited-data badge for simple-copy items
- Verified in-game: 2026-06-19

### Small-value rolls search their exact value; unscalable mods don't pre-fill
For tiny-value mods (e.g. an Abyss Tablet's "2 additional Rare Monsters"), the fill % no longer
floors the search minimum to a near-useless number — small rolls search their exact value (2, not
1), while larger rolls still fill ~N% lower. Separately, "Unscalable Value" mods (e.g. "Abyss
Pits… twice as likely…") now get an empty search box instead of a bogus pre-filled value.

- `6adaa8aa` — filters: exact-search small integer rolls; no pre-fill for unscalable mods
- Verified in-game: 2026-06-19

### Always show granted-skill implicits (sceptres)
"Grants Skill: Level N" implicits no longer get buried under "show hidden" — they always appear in
the main mod list (a below-19 granted skill shows unchecked; level 19+ shows and is checked).

- `93f01467` — filters: always show granted-skill implicits in main list
- Verified in-game: 2026-06-19

### Waystone (map) properties respect the fill %
Waystone "implicits" — Item Rarity, Pack Size, Monster Rarity, Drop Chance, … — are parsed as map
**properties** (not mods) and were pinned to their exact rolled value, because they have no parsed
roll range for the fill % to clamp against. They now honor the configured fill % like every other
rolled stat (e.g. Item Rarity +28% at 10% searches ≥ 25).

- `4df9bc9b` — filters: apply fill % to waystone/map properties (`propToFilter`, scoped to `ItemCategory.Map`)
- Verified in-game: 2026-06-19

### Max required-level filter (blank, opt-in)
Any item with a level requirement now gets a blank, opt-in **Max Req. Level:** filter (previously
Rare-only, level ≤75, and it pre-filled the item's own level). Type a max to cap required level
(`req_filters.filters.lvl.max`); left blank it does nothing. Single max only — no minimum.

- `06bbc1ea` — feat(filters): max required-level filter on any item (blank, opt-in)
- `8831d07a` — i18n: label it "Max Req. Level" so the max semantics are obvious
- Verified in-game: 2026-06-19

### Tablet price-checks no longer crash on object-schema mods missing tier data
After the 2026-06-18 schema port (`15c28ac7`), `getTierV2` read `mods.length` unguarded. GGG's
object-schema fetch results can include a mod with `description`/`hash` but no `mods[]` breakdown
(e.g. a tablet's pseudo/implicit "uses remaining" line); when such a listing landed in the results
— e.g. after broadening a Ritual Tablet search by unchecking mods — the whole price check threw
`Cannot read properties of undefined (reading 'length')`. Now guards `mods?.length` like its
sibling `getTier`.

- `9ee61ac5` — fix(trade): guard getTierV2 against mod objects with no tier array (+ regression test)
- Verified in-game: 2026-06-20

### Fractured perfect rolls respect the fill % in the Pseudo tab
A max-rolled (perfect) fractured mod was pinned to its exact value in the Pseudo tab — even though
that tab searches the mod as a normal explicit (the Base Item tab is what checks the fracture
itself). A non-fractured max roll right beside it respected the fill %, so the fracture skewed
rare-item price checks toward near-zero results. The perfect-roll gate keyed on the source
modifier's type, not the filter's display tag, so a mod shown as "explicit" still got pinned. The
Pseudo tab now honors the fill % for fractured mods like any other rolled stat (e.g. a fractured
Crit Damage Bonus at 36 pre-fills 32 at 10%). The Base Item tab still pins fractured perfect rolls
exact; Unique and Magic jewel/tablet are unchanged.

- `27c79da2` — fix(filters): respect fill % for fractured perfect rolls in the Pseudo tab (+ regression test)
- Verified in-game: 2026-06-20

### Waystones auto-select all their map properties
Price-checking a waystone now pre-selects every visible map property (Item Rarity, Pack Size,
Monster Rarity, Monster Effectiveness, Waystone Drop Chance, …) instead of leaving them unchecked,
so the whole roll is searched at once without ticking each by hand. Hidden properties (e.g. Revives
Available) stay unselected. With the fill-% fix above, each searches ~10% below its roll, so it
finds comparable waystones rather than exact matches.

- `e3d1104b` — feat(filters): auto-select waystone map properties in price-check (+ regression test)
- Verified in-game: 2026-06-20

## Ported from upstream (carried, not fork-original)

- `15c28ac7` — handle GGG's new mod-object fetch schema (mirrors upstream `d923d344`). This is the
  fix that keeps price checks loading after the 2026-06-18 PoE2 patch; listed here only so the
  record of "why the build works" is complete.
