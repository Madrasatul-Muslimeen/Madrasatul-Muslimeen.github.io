# Dawah pages enabled — governed decision (24 Sep 2026)

**Authority:** MMSA Master Architect, on the Owner's own confirmation.

**What was proven before enabling**

1. **The Rules are deployed.** The Owner published
   `docs/governance/phase7-dawah-DEPLOYMENT-candidate-2026-09-24.rules` in the
   Firebase Console and said, in their own words: *"Dawah rules are live."*
   `firestore.rules` was synced byte-for-byte to that file the same day (PR #253,
   `[already-deployed-manually]`), and `dawah-boundary.mjs` asserts the
   identity.
2. **The Rules were tested against the file that was published**, not only the
   extract:
   - `dawah-pages`: 65/65
   - `note-foundation-real-function`: 5/5
   - `journey-map-real-function`: 26/26
3. **The screens behave correctly while closed** (P7-B, issue #250). A real
   browser opened `app/dawah.html` at 360px and 1100px in English and Bangla:
   - zero `dawahPages` Firestore calls;
   - the explanation was shown;
   - no page overflow;
   - no page errors.

**Decision.** `app/js/dawah-readiness.js` moves from `ready: false, decision:
null` to `ready: true` with
`{ by: "master-architect", on: "2026-09-24", reference: <this file> }`.

**To switch it off again:** restore `ready: false, decision: null`. Every
Dawah read and write then stops before reaching Firestore.

**Not changed by this decision:**
- The Rules themselves.
- Any other collection.
- ADR-011's product terms:
  - visible inside the Madrasah only;
  - the page is a printable page made from a Note;
  - a child's page needs a guardian's, teacher's, owner's or prime's approval;
  - an adult's page does not.
