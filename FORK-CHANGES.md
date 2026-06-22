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
- **Base Item tab on every non-unique item** — price the bare base of gear, jewels, waystones, charms, and tablets (including corrupted, crafted, or quality items), not just a lucky few. On rares and charms it shows only the base itself — its fracture, quality, and item level — so you can value the shell or find instant-sellers of the base

### Fixes
- **Chat-linked items price-check correctly** — with a "Limited data" badge when the info is reduced
- **Fractured perfect rolls respect your fill %** in the Pseudo tab (they were pinned to the exact value)
- **No more tablet crash** — fixed a crash when price-checking certain tablets

---

*Kept in sync with the official Exiled Exchange 2 — currently based on v0.15.8.*
