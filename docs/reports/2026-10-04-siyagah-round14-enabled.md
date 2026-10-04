# Siyagah round 14 switched on: Pin, Favourite, Archive, Finalise and links between Notes

4 Oct 2026, MMSA Architect, session `session_012katd3VGiJEprbqxSEUTbf`.

## What happened

- The Owner published `docs/governance/2026-10-04-siyagah-round14-DEPLOYMENT-candidate.rules` (PR #567) to the `study-monitoring` project through the Firebase Console. They confirmed it in their own words: **"Round 14 rules are live Al Hamdulillah"**.
- `firestore.rules` was synced to that exact file in the same change, so the repository copy matches what is published. The sync adds 111 lines and removes none.
- `app/js/siyagah-flags-readiness.js` now declares `ready: true`, by `master-architect` on 2026-10-04, with this report as its reference. One gate serves every S14 control (built in v09.72, PR #568).

## What the Rules authorise (ADR-010 Amendment 2)

- **`notes`** may carry four optional booleans: `pinned`, `favourite`, `archived`, `finalised`.
  - A flag-only update path: the owner, on an active Note, changes only the flags and `updatedAt`, with no revision.
  - The content/revision path never moves a flag, and is closed while a Note is finalised.
- **New collection `noteLinks`:** one Note linking to another of the same owner.
  - Only the owner writes; the owner's readers may read.
  - No self-links. Both ends are frozen. Removing a link retires it; nothing is deleted.

## Evidence

- **Emulator, against the published file** (`firestore.rules`):
  - `siyagah-round14` 60/0, with 16 mutations each caught by its own case (run against the candidate before publication);
  - `siyagah-flags-links-real-function` 30/0.
- **Earlier real-function suites, against the published file:** `journey-map-real-function`, `siyagah-sections-real-function` and `siyagah-tags-real-function` green. `wordpress-import-real-function` fails on the previous `firestore.rules` too, so it is not new.
- **One probe worth recording.** `note-foundation-real-function` is built for the Phase 5 extract (its default run is green). Pointed at the published file as an extra probe, every allowed write in it succeeded and its cross-tenant create was refused with a clean `false`, but its wording check then failed. The emulator's first diagnostic pass now names the 1,000-expression budget for the second `notes` update clause. That is the same first-pass artefact ADR-010 Amendment 2 records, not a budget denial: the deciding entry is a clean `false`. No allowed write anywhere hit the budget.
- **`rules-authorisation-executable`** green.
- **`journey-flags-links-browser`:** its gate-off cases now route a closed copy of the readiness module, so the "shows, explains itself, writes nothing" contract stays tested.

## Not done

- No index was needed or created: every new query is equality-only.
- No existing document was changed.
