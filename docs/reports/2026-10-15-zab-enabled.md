# Zab switched on: the bar, pockets, kinds, → Note and pockets inside pockets

15 Oct 2026, MMSA Master Architect, session `session_01EU951Kr2tQxWqNbKLvZjPn`.

## What happened

- **The Owner published the Rules.** The file was `docs/governance/2026-10-14-zab-candidate.rules`, published to the `study-monitoring` project. The Owner wrote "Published" on PCF J25 (15 Oct). In the MMSA chat they then confirmed, in their own words: **"Yes, switch Zab on"**.
- **The repository copy now matches.** `firestore.rules` was synced to that exact file in the same change. The sync adds 143 lines and removes none.
- **The gate is open.** `app/js/zab-readiness.js` now declares `ready: true`, by `master-architect`, on 2026-10-15, with this report as its reference. One gate serves the whole Zab plan, rounds Z1–Z6 (v10.45–v10.50).

## What the Rules authorise

There is one family Zab per tenant (Owner answer 3 B).

- **`zabPockets/{tenantId}__{pocketId}` and `zabItems/{tenantId}__{itemId}`:** any member of the tenant may read, create and update them. Nobody outside the tenant can read or write them.
- **Nothing is ever deleted** (I4, D6). A pocket or item is trashed with `status: 'trashed'`.

## Evidence

The Zab suites were run against the published file. The totals are recorded in the CHANGELOG entry for this release.

- **Emulator:** `npm run zab` in `tools/firestore-emulator`.
- **Pure checks:** `zab-data`, `rules-authorisation-executable` and `brief-integrity`.
- **Browser:** `zab-bar-browser`, `zab-kinds-browser`, `zab-to-note-browser` and `zab-tree-browser`.

Two checks were updated in place, each with its reason:
- `zab-data.mjs` now asserts the gate is open by a recorded decision whose reference file exists. Before, it asserted the gate "ships shut".
- `zab-bar-browser.mjs`'s gate-off half now serves the real module with its declaration shut. That keeps "no Zab while shut" tested.

## Not done

- **This session cannot see Firebase.** Whether the published Rules are live is proved by the Owner's first Try: add an item to a pocket, reload, and see it still there.
