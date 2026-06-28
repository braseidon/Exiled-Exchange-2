# Exiled Exchange 2 — braseidon fork

A fork of [Exiled Exchange 2](https://github.com/Kvan7/Exiled-Exchange-2) with extra fixes and
quality-of-life tweaks, kept in sync with the official app. It installs as its own app and won't
touch your existing Exiled Exchange 2.

**[Download the latest release →](https://github.com/braseidon/Exiled-Exchange-2/releases)**

## What this fork changes vs the official app

### Filters & search
- **"Max Req. Level" filter** on any item (opt-in) — cap the required level of your search; click the box to auto-fill the item's own required level
- **Smarter waystone price-checks** — every map property (Item Rarity, Pack Size, Monster Rarity, …) auto-selects and respects your fill %, so the whole roll is searched at once
- **Small-value rolls search their exact value** instead of flooring to a near-useless minimum
- **Granted-skill implicits always show** (e.g. on sceptres) instead of being hidden
- **Search any resistance individually** — items with several elemental resistances now keep every one available under "show hidden" (only the highest-rolled was kept before), so you can search a specific resistance (Cold, Fire, or Lightning) without adding it on the trade site
- **Base Item tab on every non-unique item** — price the bare base of gear, jewels, waystones, charms, and tablets (including corrupted, crafted, or quality items), not just a lucky few. On jewels, charms, and waystones it shows only the base itself — its fracture, quality, and item level — so you can value the shell or find instant-sellers of the base
- **Weapons, armour & jewellery show their exact mod rolls on the Base Item tab** — the real rolled value of every mod (like the actual added physical damage), including the numbers the Pseudo tab hides behind its totals, for any number of mods — so you can read or search a specific roll instead of working it out by hand
- **Un-lock the rarity on Normal/Magic items** — the auto-selected Magic/Normal badge can now be clicked off to widen the search to any non-unique item, instead of being stuck on
- **Corrupted filter on the waystone Base Item tab** — checking a waystone's base now offers a Corrupted: No / Any toggle (defaults to No), so you can find non-corrupted waystones on trade. It's hidden on tablets (which can't be corrupted), and the toggle's labels now read "Corrupted: No / Any" everywhere — clearer than the old "Corrupted / Not Corrupted"
- **The Base Item tab prices the normal base of waystones & tablets** — switching a waystone or tablet to its Base Item tab now defaults to a "Normal" rarity toggle (click it off to widen to any non-unique), so you get the normal-rarity price directly instead of a mix of rarities. Makes the base tab a quick way to value or bulk-buy normal waystones and tablets
- **Faster, cleaner currency-exchange checks** — everything on the currency exchange (currency, gems, fragments, runes, soul cores, idols, and the rest) shows its poe.ninja price instantly and no longer auto-runs a live trade search on every check (which could hit the rate limit when you rapid-check currency) — press Search for the live order book. These items also drop the irrelevant Base Item tab, mod filters, and empty stat list, so you get one clean view
- **Uncut gem price ladder** — checking any uncut gem (Skill, Spirit, or Support) fills the side panel with that type's price at every level, with the checked level highlighted — a quick read of what each level is going for
- **Currency family price panel** — checking an essence, soul core, catalyst, rune, or omen fills the side panel with its whole group's prices (e.g. all Greater essences, all tier-3 soul cores, all Ritual omens), the checked one highlighted — a quick read of the group's going rates. Big groups like the Ritual omens spread across two columns so they all fit at once
- **Smarter belt charm-slot pricing** — price-checking a belt by its mods now searches for 2+ charm slots by default, so 2- and 3-slot belts price as equivalents; checking a belt as a base is unaffected
- **Cleaner Mageblood checks** — a Mageblood with no duplicate flasks unchecks the "increased effect per duplicate" mod by default, so it doesn't constrain the search

### Fixes
- **Chat-linked items price-check correctly** — with a "Limited data" badge when the info is reduced
- **Chat-linked uniques show their mods up front** — instead of hiding every mod behind the "Hidden" toggle, a chat-linked unique now lists its mods with values pre-filled (about your fill % below the roll); the "Limited data" banner still notes exact ranges aren't available
- **The "show hidden" mods toggle stays visible when every mod is hidden** — you can still reveal them, instead of being left with no toggle to click
- **Fractured perfect rolls respect your fill %** in the Pseudo tab (they were pinned to the exact value)
- **No more tablet crash** — fixed a crash when price-checking certain tablets
- **Items with a hidden desecrated affix don't force item level into the Pseudo search** — only the Base Item tab uses it, so the Pseudo tab searches on the visible mods like any other item
- **Hidden desecrated affixes are labeled "Desecrated"** — the price-check toggle no longer shows the old "Veiled" term
- **"Has empty modifier" no longer shows a phantom open affix** on items past their modifier cap (e.g. after a "+1 to maximum modifiers" craft was removed)
- **Magic tablets price against magic on the main tab** — they were searching any non-unique rarity (lumping them in with rares), which could misprice them; the main tab now constrains to magic, like other magic items
- **The poe.ninja price shows instantly** — removed an artificial ~1-second delay that hid the price behind a spinner on every check
- **"No price data" notice for untracked items** — a handful of items GGG's trade and poe.ninja don't list yet (e.g. the Hawk, Panther, and Stoat idols) now show a clear notice instead of deceptive face-to-face listings
- **Abyssal Gazes price on the currency exchange** — they were stuck on face-to-face trade
- **Bulk Item Exchange bait warning** — opening a currency item's bulk listings (press Search) now flags that those listings are often price-fixing bait and points you to the in-game Currency Exchange

---

*Kept in sync with the official Exiled Exchange 2 — currently based on v0.15.8.*
