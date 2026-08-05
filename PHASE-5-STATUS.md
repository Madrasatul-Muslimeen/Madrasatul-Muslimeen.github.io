# Phase 5 — Migration & Parity — Audit & Plan

Last updated: 5 August 2026 (audit only — nothing built yet)
Read alongside `CLAUDE.md`.

---

## Position

**Nothing in this phase has been built.** Per CLAUDE.md: "Phase 5 is the
gate. No cutover from the old app until the parity checklist is derived
from a live audit of `index.html` and signed by the owner — not by
Claude." This document **is** that audit. It ends with open questions and
a proposed build order, not code. Waiting on your review.

`index.html` was not touched anywhere in this process — read-only, as
always.

---

## Headline finding: three of Phase 5's five listed jobs are already done

Phase 5 was reserved (`app/js/feature-registry.js`) to deliver: additive
import, old collections untouched, **B1 traced**, **backfill of stranded
summaries (B2)**, and a parity checklist. Re-reading `PHASE-0-STATUS.md`
against the live `firestore.rules` and `index.html` shows **B1 and four of
the five Step-4 security items (C1–C3, C5) were already fixed on 30–31
July**, before Phase 5 was ever opened. The Parked Items Register
(dated 5 Aug, "43 items open") was never updated to reflect this — it's
stale on six items.

| # | Register says | What's actually true (verified this session) |
|---|---|---|
| **B1** | Ruku'/Juz write path — "Step 5, traced in code, medium severity" | **Already fixed, 30 Jul.** Traced in `PHASE-0-STATUS.md`: the admin's `users/` doc had the field spelled `PersonId` instead of `personId`. The app read `undefined`, `state.activePersonId` became `undefined`, and every save went to a random Firestore document name. **Not a code bug** — re-read `index.html` lines 3897–3909 myself and the trace holds: `mmCurrentRole.personId` (the value that ends up in `state.activePersonId`) comes straight from that Firestore field. Fixed by adding the correctly-spelled field to the one affected account. Code is sound. |
| **C1** (S4) | "Deferred to Step 4" | **Live since 30 Jul.** `firestore.rules` line ~168: teacher invite reads scoped to `invitedBy == myUid()`, no teacher delete at all. |
| **C2** (S5) | "Deferred to Step 4" | **Live since 30 Jul.** `firestore.rules` line ~195: a person's `teacherId` must be the caller's own uid or match their invite. |
| **C3** (S6) | "Deferred to Step 4" | **Live since 30 Jul.** `firestore.rules` `myEmailLower()` fixes the capital-letter email bug for both invites and registration. |
| **C4** | "New field, Step 4" | **Built in Phase 1**, for the new tenant schema: `tenants.maxInvites` + quota check in `app/js/invites.js` (throws `quota-exceeded`, surfaced via `errors.js`). Doesn't apply to the old app's `invites` collection, which has no quota concept and never will (superseded by the new tenant model, per D2). |
| **C5** | "Hard requirement, Step 4" | **Built in Phase 1** (I10): `firestore.rules` `userIndex` rule — `platformAdmin` can only ever be `false` on client create/update; only the Firebase console can flip it. |

This rules file is the **merged** one (F-003, "both generations") — the
S4/S5/S6 fixes are live against the actual collections `index.html` reads
and writes today, not just the new schema. **Recommendation:** update the
Parked Items Register to move B1 and C1–C5 into a "resolved" note, the
same way S1–S3 already are. I'll do this as part of closing out this
audit unless you'd rather review the register yourself first.

### B3, B4, B5 — the other two bugs and the untested item

- **B3** (guard clause) and **B4** (parallel loading) both target
  `index.html`'s boot sequence directly — and `index.html` is never
  edited. They're moot for the live file. They're also irrelevant to the
  new build: Phase 0 already parallelizes SDK load and the new app isn't
  built with four serial round-trips to begin with, so there's nothing to
  port. **Recommend closing both as "won't do"** unless you specifically
  want the live file patched (which would mean setting aside the
  never-edit rule) — flagging that choice, not making it.
- **B5** (student-invite flow untested since the S1/S2 rules change) is
  still genuinely open — nobody has clicked through it for real since
  those fixes. Low priority; only matters if a real student reports
  trouble accepting an invite. Not blocking this phase.

---

## The real remaining job: B2, and the live parity audit

### B2 — stranded summaries — needs your input, not guessable

The four-shape legacy roster (`p1`…`p4`) exists **only in browser
localStorage**, seeded from `DEFAULT_PEOPLE` — it has never been in
Firestore (confirmed in `PHASE-0-STATUS.md`). All Firestore data observed
so far is demo/test and you've confirmed it can be recreated, which
lightens this considerably. But that observation was made against the
Firebase console, not your own browser's `localStorage`.

**Question only you can answer:** does your own browser (or any other
device that's been used for real study tracking) hold `p1`–`p4` progress
that was never synced to Firestore — i.e. real data that only exists
locally and would be lost if that browser's storage were ever cleared? If
yes, B2 needs an actual export/import tool before cutover. If no (all real
use has gone through signed-in accounts, which do sync), B2 is a
non-issue and can be closed.

### Parity checklist — old app features vs. what Phases 0–4 built

Full inventory of `index.html` (10,146 lines) cross-checked against the
actual code in `app/` — not just the phase status docs' own summaries.

**✅ Covered, built and owner-verified:**

| Old app feature | New build equivalent |
|---|---|
| Sign-in, roles, invites, roster | Phase 1 — richer role model (owner/prime/teacher/guardian/self vs. old admin/teacher/student) |
| 30 Ways / 7 sections taxonomy | Phase 2 — Trackables, tenant copy-on-write |
| Guide & Resources tab per Way | Phase 2/4 — Way modal's Guide tab (`way-modal.js`) |
| Per-ayah progress, 5-state (old) → 6-state + Not Applicable (new, I7) | Phase 3 — `records.js`, chunked storage, confirm/claim |
| Ayah text, translation (Ar/En), audio, Tajweed, word-by-word + root/derivative | Phase 4 — and now **static, pre-pulled data** (all 114 surahs) instead of live quran.com API calls + a CORS-proxy fallback the old app needed. This is a real robustness improvement, not just parity. |
| Bangla translation | Phase 4 (F-060) — old app had this too (translation id 161) |
| Reciters | Phase 4 has **4** (Basfar, Ibraheem Walk, Kevan Brighting, Bayezid Mahmud) vs. old app's **3** (Basfar, Ibrahim Walk, Sharif Bayzid) — one new reciter added, none dropped |

**⚠️ Gaps — confirmed by reading the actual new-build code, not assumed:**

| Old app feature | Status in new build | Notes |
|---|---|---|
| **Monitor / "Weekly Study Monitor"** — the entire React `StudyTracker`: weekly subject×day grid for **any** subject (not just Quran), Week/Month reports, CSV export, print, Domains tags, roster/subject setup UI | **Not built at all yet.** Correctly scoped to Phase 8 ("Monitor & reports") per the roadmap — but this is the *only* place non-Quran subjects get tracked in the old app, and it's exactly the gap CLAUDE.md's open item A26 already flags ("Approaches only exist for Quran... every other subject has no defined progress system"). Worth naming explicitly here since Phase 5 is the parity gate. |
| **5 of 6 study-unit granularities** — old app lets you study/track by Single Ayah, Range, Whole Surah, Page, Ruku', or Juz. Checked `app/quranrevival.html` directly: only Surah-select + ayah prev/next exists. No unit-type picker. | **Data layer ready, UI not built.** `unit-keys.js` already defines all 12 unit-type namespaces (ayah/range/surah/page/ruku/juz/hizb/rub/manzil/hadith/topic/name) and `records.js`'s chunking (D12) was explicitly designed around surah- vs. subject-level chunks in anticipation of this. The UI to actually *use* Range/Page/Ruku'/Juz was never wired up. |
| **Explore drill-navigator** — Quran-wheel (30 Juz) → Juz-wheel → Surah-wheel → Ruku'-wheel, letting you see progress across the *whole Quran or a whole Juz*, not just the currently-open surah | **Not built.** The new Way modal's Coverage tab is hardcoded to "this surah" only (read `way-modal.js` directly — `renderCoverageTab` takes ayahStatuses for one surah, no scope selector). Breakdown tab has no scope picker either, unlike the old app's Surah/Juz/whole-Quran choice. This is a real behavioural narrowing, not just a missing screen. |
| **Hifz Mode** — real Madani Mushaf page rendering (QCF v2 glyph fonts, line-justified) | **Not built.** No mention anywhere in `app/`. |
| **Multi-reciter drill playback** — select several reciters, sequenced; Repeat count (1/2/3/5/10×) and Repeat mode (Each Ayah vs. Whole Unit) | **Not built.** New build has per-reciter Play + a simple Loop toggle only (checked `audio-player.js`). No queueing across multiple reciters, no repeat-count/mode controls. |
| **Print Report** (per-student mastery certificate) | Not built. |
| **Appearance/Theme modal** (per-user colour customization) | Not built. |
| **Global banner** (admin-editable eyebrow/H1/sub, shown to everyone) | Not built — small, low effort when it's time. |
| **Splash screens** (boot + Quran-tab entry) | Not built — cosmetic. |
| **"Edit Bar" inline text/colour/size editing** of ~20 static labels | Not built — likely superseded by the new build's catalogue-admin screens + language-keying (I11), which solve the same underlying need ("owner can correct wording") differently and arguably better. Flagging as an architecture decision already effectively made, not a gap to port literally. |
| **Export Snapshot** (bake all data into a downloadable standalone HTML file) | Not built. This was a browser-storage-era safety net; now that data lives in Firestore with offline persistence (D5), its original purpose is largely moot. Recommend treating as intentionally dropped rather than ported. |

**Nothing found that's silently missing without a home** — every gap
above either has a named future phase already, or is called out here as a
decision to make. That's the actual point of this audit.

---

## Migration data map (the "additive import" itself)

| Old collection | Maps to (new) | Notes |
|---|---|---|
| `users`, `people` | `userIndex`, `tenantPeople`, `memberships` | Needs a role-mapping decision (below) — admin/teacher/student don't line up 1:1 with owner/prime/teacher/guardian/self |
| `invites` | `tenantInvites` | Old `invites` has no quota/token layer; new one does. One-way: old invite docs get read, never written back to |
| `teachers/{id}` (`ways[]`, `ayahs{}`, `textStyles{}`) | `trackables`, `subjects` (tenant copies) | Only matters if a teacher's copy actually diverges from the default 30 Ways — needs a real-data check, not assumed identical |
| `studyProgress`, `rukuSummaries`, `juzSummaries`, `juzSummariesPage` | `records` (chunked) | Straightforward — this is exactly the per-unit-status shape `records.js` already models. Ruku'/Juz *summaries* don't need migrating separately; they're derived aggregates the new build can recompute from `records` the same way the old app pooled them from ayah-level saves |
| `monitorWeeks` | *(no target yet — Phase 8)* | Import waits for Phase 8 to exist |
| `appSettings/global` | *(no target yet)* | Small; can land whenever the global-banner feature is built |
| `userPrefs` (theme colours) | *(no target yet)* | Same — waits for Appearance modal, if you want it rebuilt |

Every arrow above is a **read from old, write to new** script — old
collections are never written to or deleted (I4, and the standing
instruction that `index.html`'s data stays untouched).

---

## Open design questions needing your actual input

These are the kind of decisions CLAUDE.md reserves for you — not
permission-asking, genuine "which approach" calls:

1. **Role mapping.** Old `admin` → new `owner` + `prime`, both? Old
   `teacher` → new `teacher`, straightforward. Old `student` → new
   `self` or `guardian`-managed child, depending on whether they had a
   real login. I can propose a default mapping, but the *admin → owner
   vs. owner+prime* split is your call (A2 already confirmed Prime as
   "held by you, alongside owner" — so at minimum your own admin account
   becomes both).
2. **B2** — see above: is there real data trapped in a browser's
   `localStorage` that needs recovering, or is all real use already
   Firestore-synced?
3. **The five study-unit granularities + Explore navigator** — build
   these now (there's room under Phase 4's still-unused feature IDs,
   F-048/F-052–F-059) so Quran tracking has full parity before cutover,
   or defer to a later phase and cut over Quran-ayah-tracking only at
   first? This is the single largest real gap on the list.
4. **Monitor (non-Quran tracking)** — confirmed already as Phase 8's job
   and tied to the still-open A26 question. Just flagging that Phase 5
   parity, strictly read, can't fully close until that exists — unless
   you're fine with "Quran parity now, everything-else parity at Phase
   8," which is what the phase roadmap already implies.
5. **Hifz Mode, multi-reciter drill/repeat, Print Report, Appearance
   theming, Global banner, splash screens** — keep, rebuild differently,
   or drop? None of these block a Quran-only cutover; I'd suggest
   deciding per-item rather than as a block.

---

## Proposed build order, once you've reviewed the above

1. Update the Parked Items Register to close out B1, C1–C5 (resolved).
2. Build the additive import script for the migration map above
   (users/people/invites/teachers/studyProgress/rukuSummaries/
   juzSummaries/juzSummariesPage → new schema), gated behind your answers
   to questions 1–2.
3. Decide + build (or explicitly defer) the study-unit-granularity /
   Explore-navigator gap (question 3) — this is the one piece that
   affects whether "cutover" means full parity or Quran-ayah-only parity.
4. Re-verify B5 (student invite) with a real click-through.
5. Present the finished parity checklist for sign-off — the actual gate
   CLAUDE.md describes.

## Blast radius

Nothing above touches `index.html` or writes to any old Firestore
collection. The import script (step 2) only ever reads old collections
and writes new ones. Firestore rules already merge both generations, so
nothing needs to change there for this phase. No cutover happens until
you sign off on the final checklist — the live app stays exactly as it
is, unaffected, throughout.
