# Phase 3 — Tracking core — Status

Last updated: 2026-07-31
Read alongside `CLAUDE.md`.

---

## Position

**Phase 3 built — all 8 features (F-033..F-040) built and deployed. Awaiting
owner verification** (same "owner ran it for real, found real bugs" step
that closed Phases 1 and 2 — nothing below has been exercised against
production yet). Delivers records (chunked per surah/subject), activity
(one document per week), the 6 progress statuses with Not-Applicable
exclusion (I7), all 12 unit-key namespaces, domain tags, and confirmation
+ bulk confirm + return.

`app/` now has, beyond Phase 2's files: `records.html`, and
`js/unit-keys.js`, `js/domains.js`, `js/records.js`, `js/activity.js`.
`firestore.rules` gained a Phase 3 section covering `records`, `activity`,
`domains`. `self-check.js` was extended to verify all of it against the
caller's own real tenant and person record.

## What was built

- **Unit keys** (F-033) — all 12 namespaces from the Architecture doc:
  `ayah`, `range`, `surah`, `page`, `ruku`, `juz`, `hizb`, `rub`, `manzil`,
  `hadith`, `topic`, `name`. Builders, a parser, and `unitType` extraction
  so "show all page-based progress" stays a one-field filter, not a
  re-parse of every key. The 6 progress statuses (Not Applicable, Not
  started, Learning, Practising, Achieved, Mastered) plus a
  `summarizeStatuses` helper that excludes Not Applicable from every total
  (I7 — it's off the ramp, never counted as zero).
- **Domain tags** (F-034) — new `domains` collection (**D12**, recorded in
  CLAUDE.md): the Architecture doc names `records.entries.domainIds[]` but
  never defines a collection backing it, so one was added, tenant-authored
  and shaped exactly like `ladders`/`levels` (no platform seed — matches
  the legacy app's free-text, user-defined "Domains" tag on subjects,
  promoted to permanent IDs per I5 since it's now a plural array per
  record entry).
- **Records — chunked claim** (F-035) — `records/{tenantId}__{personId}__{chunkKey}`.
  Chunking (**D12**): unit types carrying their own surah number
  (`ayah`/`range`/`surah`/`ruku`) chunk per surah; everything else
  (`juz`/`hizb`/`rub`/`manzil`/`page`/`hadith`/`topic`/`name` — Quran-wide
  divisions or non-Quran subjects, with no single surah) chunks per
  subject. `claimStatus()` writes a dot-path update touching only the one
  `"<unitKey>::<trackableId>"` entry, never the rest of the map.
- **Confirmation rule** (F-036) — computed, never configured, exactly as
  Architecture s6 describes it: "does this person have a teacher, guardian
  or prime?" A person's own roles (owner/prime/teacher/guardian → always
  self-confirmed, matching "a teacher's own study is self-confirmed"), then
  whether anyone actually guards them (`memberships` where role=guardian
  and `guardianOf` contains them), then — for a declared student — whether
  the tenant has any teacher/prime at all yet. `subjects.confirmationRequired`
  (new additive field, **D12**) can force it on or off per subject,
  overriding the computed rule, exactly as the Architecture text calls for.
- **Confirm / return** (F-037) — `confirmEntry()` freezes `confirmedStatus`
  at whatever `claimedStatus` is at that instant and stamps
  `confirmedByPersonId`/`confirmedAt` (I6 — never recalculated afterwards;
  a later reclaim only resets `confirmState` back to `pending` for its own
  fresh review, the three frozen fields stay untouched until the next real
  confirm). `returnEntry()` sets `confirmState: "returned"` with a note,
  again never touching the frozen fields.
- **Bulk confirm** (F-038) — a surah/subject chunk (`bulkConfirmChunk`,
  every pending entry in one records doc) or a week (`bulkConfirmWeek`,
  every pending entry touched by that person's `activity` doc that week,
  across however many records chunks they actually land in). Class-scope
  bulk confirm is **not built** — classes/enrolments don't exist until
  Phase 10, and the Architecture doc's own phase table says nothing in a
  later phase is a prerequisite for an earlier one, so there is nothing to
  scope it against yet.
- **Activity** (F-039) — `activity/{tenantId}__{personId}__{weekKey}`, one
  document per week, `weekKey` = the ISO date of that week's start per the
  tenant's own `weekStartsOn` (D7). Append-only (`arrayUnion`).
  `viaProgramId`/`viaSessionId` (I3) are always written, always `null` for
  now — programs (Phase 7) and sessions (Phase 14) don't exist yet.
- **Records/activity/domains screen** (F-040) — `records.html`: sign in,
  pick tenant + person, type in a unit reference (no Quran/topic renderer
  exists yet — that's Phase 4 — so this is a manual-entry test harness, not
  the real study screen), pick a subject + Approach + status + domain tags,
  claim it, see the chunk's entries with Confirm/Return/bulk-confirm
  controls, see the week's activity log with its own bulk-confirm. Real
  Approaches only exist under Quran right now (Phase 2's trackables are all
  `subjectId: "quran"`), so picking any other subject correctly shows "no
  Approaches for this subject yet" rather than fabricating one.
- **Layer 2 security rules** — `records`/`activity`: read/write open to the
  person themself (an adult, `authUid` match via `tenantPeople`), whoever
  guards them, any teacher, and owner/prime/platformAdmin — the same set
  for both collections, matching D10's "log several people's progress from
  one dropdown" workflow. No per-field (e.g. "only a supervisor may
  confirm") restriction in the rules themselves — Firestore rules can't
  safely inspect one key of an arbitrarily-keyed map, same limitation as
  every other dynamic-map collection already in this file (subjects,
  trackables); role-appropriateness within an allowed write is enforced by
  the client functions in `records.js`, same shape used everywhere else in
  this codebase. `domains`: read open to any member, write to owner/prime/
  platformAdmin, matching `ladders`. No client delete anywhere (I4/D6).
- **Self-check extended for Layer 2** — `admin-self-check.html` now also
  confirms, against your real tenant and your own real person record: the
  `domains` collection is reachable, a real claim writes to a records chunk
  and reads back correctly (a clearly-marked `_selfCheckTest` subject/unit,
  status `not_applicable` so I7 keeps it out of every real total), a real
  activity entry appends and reads back correctly, and the confirmation
  rule runs without error and reports what it computed for your own
  account (informational, not pass/fail — the correct answer depends on
  which role you hold).

## Decisions made without stopping to ask, flagged for review (D12)

Two genuine gaps in the Architecture doc's own "Every collection" list,
both filled the same way Phase 1's D9 filled `tenantMemberUids`/
`inviteTokens` — a small supporting collection or field the doc's own named
fields required but never defined:

1. **`domains` collection** — the doc names `records.entries.domainIds[]`
   but never lists a `domains` collection. Built as a tenant-authored tag
   registry, no platform seed, same shape as `ladders`/`levels`.
2. **Records chunking algorithm** — the doc says "one doc per surah or
   subject" but doesn't say which unit types go which way. Built as: surah
   for unit types that carry their own surah number, subject for
   everything else (see "What was built" above for the full reasoning).
   Re-chunking later is a data migration, not an architecture change — I5
   only pins the unit key itself, never which chunk it lands in.
3. **`subjects.confirmationRequired`** — a new additive field needed so
   "confirmation can be switched on or off per subject" has somewhere to
   live. Editable from `catalogue.html`.

None of these block anything or need to be undone if the owner wants them
differently — they're each a small, contained correction, not a rebuild.

## Owner verification — pending

Not yet run against production by the owner. Suggested check, following
the same pattern as Phases 1 and 2:

1. Open `records.html`, sign in, pick a person.
2. Pick subject "Quran", an Approach, unit type "ayah", reference `2:255`,
   a status, claim it. Confirm it shows "Claimed and confirmed
   (self-confirmed)" if you're owner/prime/teacher, or "waiting for
   confirmation" if you're testing as a student/child.
3. If it's pending, confirm or return it from the entries table; check
   "Confirm anyway" appears after a return.
4. Try "Bulk confirm all pending here" and "Bulk confirm all pending this
   week" after claiming a couple of entries.
5. Open `admin-self-check.html` and re-run the check — everything from
   "domains" down through "Confirmation rule" should read green (or a
   plain-language explanation if not).

## Next

**Phase 3 is built, not yet closed** — closes once the owner has run the
check above. Phase 4 (QuranRevival module: ayah renderer, Mastery Wheel,
Way modal, panels per approach, tajweed/word-by-word/audio) is next once
Phase 3 is signed off.
