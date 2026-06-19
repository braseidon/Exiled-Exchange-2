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

## Ported from upstream (carried, not fork-original)

- `15c28ac7` — handle GGG's new mod-object fetch schema (mirrors upstream `d923d344`). This is the
  fix that keeps price checks loading after the 2026-06-18 PoE2 patch; listed here only so the
  record of "why the build works" is complete.
