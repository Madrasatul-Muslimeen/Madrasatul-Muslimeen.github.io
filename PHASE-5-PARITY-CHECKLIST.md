# QuranRevival — Phase 5 Parity Checklist (the cutover gate)

**Status: cutover executed 9 August 2026.**
`https://madrasatul-muslimeen.github.io/` now redirects into the new app
(`/app/index.html`). The old app is archived, not deleted, at
`https://madrasatul-muslimeen.github.io/legacy/index.html`. This happened
**before** items 1 and 2 in Part C were resolved — an explicit, informed
call by the owner (confirmed no one else uses the old app; the swap is a
one-file, trivially reversible redirect), not an oversight. See
`PHASE-5-STATUS.md`'s "Cutover executed" entry for the full mechanics and
verification. Items 1 and 2 below are now post-cutover follow-up, not
pre-conditions.

**This is still the document `CLAUDE.md` calls for**: "the parity checklist
... derived from a live audit of `index.html` and signed by the owner —
not by Claude." Everything below is drawn from an actual read of
`index.html`'s own code (round 1's audit) plus 14 rounds of building
against it, not from memory or assumption. `index.html` itself was never
edited — reference only, as always; it now lives on at `/legacy/`.

**How to use this**: three sections. Part A is what's done — nothing to
decide, just confirm it matches your expectation. Part B is what's
*different on purpose* — a decision was already made, by you or as a
disclosed judgement call; nothing to build, just confirm you're still fine
with it. Part C is what's still genuinely open — now follow-up, not a
gate. Sign-off is at the bottom.

---

## Part A — Built and matching the old app

| Old app feature | New build | Notes |
|---|---|---|
| Sign-in, roles, invites, roster | ✅ Built (Phase 1) | Richer role model (owner/prime/teacher/guardian/self vs. old admin/teacher/student) |
| 30 Approaches ("Ways"), 7 sections | ✅ Built (Phase 2) | Tenant-owned copies, editable per madrasah |
| Guide & Resources per Approach | ✅ Built (Phase 2/4, Way modal's Guide tab) | |
| Per-ayah progress tracking | ✅ Built (Phase 3) | 6-state + Not Applicable, up from the old app's 5 |
| Ayah text, translation, audio, Tajweed colours, word-by-word + root/derivative | ✅ Built (Phase 4) | Static pre-pulled data instead of live API calls the old app needed — a robustness improvement, not just parity |
| Bangla translation | ✅ Built (Phase 4) | |
| Reciters | ✅ Built — **4**, vs. old app's 3 | One added (Kevan Brighting), none dropped |
| Study Unit picker (Ayah/Range/Whole Surah/Ruku'/Juz/Page) | ✅ Built (round 1 gap, closed) | |
| Mastery Wheel | ✅ Built, axis-corrected (rounds 12–13) | One segment per Approach for the current ayah, matching `index.html`'s real wheel exactly — round 12 initially matched only the *look*, round 13 fixed the *axis* after a direct check against the live site |
| Explore navigator | ✅ Built, full depth (round 14) | Quran-wheel → Juz-wheel → Surah-wheel → Ruku'-wheel, same navigation depth as `index.html`, one consistent visual style throughout (your call, round 14) |
| Multi-reciter drill/repeat playback | ✅ Built (round 1 gap, closed) | Each Ayah / Whole Unit modes, 1×–10× repeat |
| Hifz Mode (true Mushaf page view) | ✅ Built (rounds 6–7) | Real 604-page QCF glyph rendering, reusing the same hosted data `index.html` itself uses |
| Global banner | ✅ Built, deliberately different scope | Tenant-scoped, not platform-wide — see Part B |
| Splash screens | ✅ Built (round 9) | Ported faithfully, including the daily/weekly preference |
| Sign-out | ✅ Built (round 10) | The old app never needed this (single shared login); this build's multi-tenant model does |

---

## Part B — Different on purpose (already decided, not open questions)

| Item | What's different | Why |
|---|---|---|
| Wheel status colours | Six named categories (Not started/Learning/Practising/Achieved/Mastered + Not Applicable), not the old app's single blended 0–100% score | Deliberate Phase 3 fix (I7) for a real legibility flaw in the old app — confirmed by you, round 13 |
| Wheel visual style | One consistent progress-ring look at every zoom level | Your call, round 14 — old app used a different look for short surahs |
| Chip/legend class names | Named by status id (`chip-mastered`) not position (`chip-0`) | This build's statuses are id-keyed (I5), not order-keyed — a positional name would silently break if order ever changed |
| Global banner | Tenant-scoped, not one platform-wide banner | Tenant isolation (D2) means there's no single shared banner to begin with |
| "Edit Bar" inline text/colour editing | Not ported | Superseded by catalogue-admin screens + language-keying (I11) — same underlying need, different (arguably better) mechanism |
| Explore's "direct jump" shortcut menu | Not built | Treated as a UX convenience layered on the core drill-down, not part of "the wheel and its functions" — flagged, not silently dropped |

**Dropped outright** (your decision, round 9): Print Report, Appearance/Theme modal.

**Deprioritized** (your decision, round 5): `migrate.html`'s old-data import — the old app's data is all demo data, confirmed not worth preserving. Left unmaintained, out of scope.

**Deferred to a later phase, on record, not to be re-raised until you reopen them**:
- Non-Quran subject progress tracking (Approaches only exist for Quran today) — Phase 8, your call to wait.
- Teacher-scoped access (limit a teacher to specific subjects/students) — needs its own design conversation first, raised 31 Jul.

---

## Part C — Still open (post-cutover follow-up, not a gate anymore)

| # | Item | What it needs |
|---|---|---|
| 1 | **B5 — student-invite retest** | Someone opens a *real* invite link (`accept-invite.html?token=...`, generated from the People page), not just the site's front door. Open since round 10, never confirmed closed. |
| 2 | **A real signed-in click-through of rounds 12–14** | The Mastery Wheel axis fix and Explore's full drill-down have only been verified by Claude (code review + a mock-data integration harness, 43/43 checks passing) — never by a real signed-in person. Now live at the real production URL, so this is just a matter of doing it next time you're signed in. |
| ~~3~~ | ~~The cutover mechanics themselves~~ | **Done, 9 Aug 2026** — see the status banner at the top of this document. |

**Where to test #1 and #2 now**: `https://madrasatul-muslimeen.github.io/` — the real production URL, not a beta link anymore.

---

## For the record — bugs found and fixed along the way (closed, not open)

B1 (ruku/juz write path — wrong Firestore field name) and C1–C5 (security-rules gaps) were already fixed on 30–31 Jul, before Phase 5 even opened. B2 (possible stranded local-only data) was confirmed by you as disregardable — all real data has gone through signed-in, synced accounts. B3/B4 targeted `index.html`'s own boot sequence directly; moot, since that file is never edited and the new build was never built with the same bottleneck. Beyond those: real bugs found through actual click-throughs in rounds 3, 4, 5, and 10 (surah-name dropdown, ayah-text sync during whole-surah playback, Explore's Juz scoping, reciter reset, a Bangla-reciter 404 for surahs 101–114, three drill-sequencer bugs, missing sign-out, and an invite-flow misdirect) were all fixed and are listed in full in `PHASE-5-STATUS.md`.

**One limitation that applies to every round of this entire project, not just this checklist**: Claude has never had real Google sign-in credentials, so nothing here has ever been verified end-to-end behind a real login by Claude — only by you, when you've clicked through. That's not a gap specific to Phase 5; it's the standing shape of how every phase of this project has had to be verified.

---

## Sign-off

- [x] **I'm ready for cutover** — confirmed, 9 Aug 2026; executed same day.
- [ ] Part A matches what I expect from the old app.
- [ ] Part B's differences are all still fine with me as-is.
- [ ] Part C's remaining two items (B5, a real click-through) are closed.

The last three are still open for you to confirm at your own pace, now that
they're follow-up rather than something blocking a decision already made.
If anything in Part A or B doesn't match what you actually see, or B5/the
click-through turns up a real problem, tell me and that becomes the next
round's work — not a reason to undo the cutover, which stays in place
regardless (it's the redirect that's easy to undo, not this document).
