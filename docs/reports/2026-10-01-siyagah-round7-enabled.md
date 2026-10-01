# Siyagah round 7 switched on: sections, folder colour and bold, Tags

1 Oct 2026, MMSA Architect, session `session_01M4Sbc1h94F7SgErzAzxq9n`.

## What happened

- The Owner published `docs/governance/2026-10-01-siyagah-round7-DEPLOYMENT-candidate.rules` (PR #457) to the `study-monitoring` project through the Firebase Console. They confirmed it in their own words: **"Round 7 rules are live."**
- `firestore.rules` was synced to that exact file in the same change, so the repository copy matches what is published.
- `app/js/siyagah-sections-readiness.js` now declares `ready: true`, by `master-architect` on 2026-10-01, with this report as its reference. One gate serves all three features:
  - sections (v09.25);
  - folder colour and bold (v09.25);
  - Tags (v09.26).

## What the Rules authorise (ADR-010 Amendment 1)

- **`noteFolders`** gains three optional fields: `color`, `bold` and `sectionId`. A section is allowed on root `user` folders only.
- **New collections:** `noteSections`, `noteTags` and `noteTagLinks`.
  - Only the owner writes them; the owner's readers may read them.
  - Identity is write-once.
  - Nothing is ever deleted: removing something retires it.
- **No Note Types.** Note documents are untouched.

## Evidence

- **Emulator, against the published file:**
  - `siyagah-round7` 75/75, with 8 mutations each caught by its own case;
  - `siyagah-sections-real-function` 21/0;
  - `siyagah-tags-real-function` 25/0;
  - `journey-map-real-function` and `note-foundation-real-function` green.
- **`rules-authorisation-executable`** now derives the mutable fields from `firestore.rules` itself.
- **`journey-sections-browser` and `journey-tags-browser`:** their gate-off cases now route a closed copy of the readiness module, so the "shows, explains itself, writes nothing" contract stays tested.

## Not done

- No index was needed or created: every new query is equality-only.
- No existing document was changed.
