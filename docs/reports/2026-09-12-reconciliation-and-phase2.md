# QuranRevival — Reconciliation and MAP Phase 2 closure

- **Date:** 2026-09-12
- **Branch:** `claude/pensive-knuth-2pu3jj`
- **Repository:** `Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io`
- **App version:** 08.04 (main) → **08.13**
- **Status:** evidence at a checkpoint, not a request for permission. `OWNER ACTION: NONE` except the one gate named in §7.

---

## 1. Remote baseline verified

All four tips confirmed directly from `origin`. No bundle recovery was needed
or attempted.

| Branch | Expected | Found | |
|---|---|---|---|
| `main` | `4833b19c…` | `4833b19ce8899f269977980ebf783d95ce2688e2` | ✅ |
| `stage5-autonomous-isolated` | `d30d4e92…` | `d30d4e9290c6e519af5de8ffeff3999d77b8408f` | ✅ |
| `stage5-rules-isolated` | `b27d0ebf…` | `b27d0ebf9397ddbdb196f262d65d2f3c6c2e6927` | ✅ |
| `map-pure-foundation-review` | `3811377d…` | `3811377d2b7b097be37fd143752fba48d8408581` | ✅ |

**Documents not found.** MAP v4, the execution ledger and the recovery report
are **not present in any branch** of this repository and were not attached to
this session. Rather than stop, position was reconstructed from the phase
requirements stated in the session instruction itself, `docs/governance/`
(ACTIVE-ARCHITECTURE, ADR-001…008, DDR) and the actual code. **If those three
documents contain requirements not in the instruction text, this reconciliation
has not seen them.** That is the one place this report may be incomplete
through no measurement.

## 2. Reconciliation — what the three isolated branches actually contain

Read as code, not inferred from commit messages.

**Both isolated branches are direct descendants of `main`'s exact tip.** Their
merge-base with `main` *is* `4833b19`, and no commit on `main` is absent from
either. They are also **disjoint from each other** — not one file is touched by
both. So reconciliation needed no rebase, no conflict resolution and no
judgement call about precedence.

| Branch | Verdict |
|---|---|
| `stage5-autonomous-isolated` | **PRESERVED IN FULL.** 28 commits, 38 files: word identity + indexes, Word Card, WbW coverage, keyed Activity writer/week/evidence, backup rendering. Merged whole. Defects corrected rather than discarded (§4). |
| `stage5-rules-isolated` | **PRESERVED IN FULL.** 13 commits, 12 files: Activity Rules proposal, security matrix, emulator suite. Confined to `tests/` and `tools/`. |
| `map-pure-foundation-review` | **SUPERSEDED — not independently merge-worthy.** Its three substantive commits are reproduced verbatim inside `stage5-autonomous-isolated`. Proven by content diff across all 11 shared files: the only difference was a stray trailing blank line on four of them, which that branch's fourth commit normalized away. That normalization is its sole unique contribution and has been carried across; the branch itself adds nothing further. |

**`firestore.rules` is byte-for-byte unchanged** from `main` on the reconciled
branch — proven by `git diff origin/main HEAD -- firestore.rules` returning
empty. No Owner Control Gate was crossed.

## 3. The harness was broken on `main`, and that hid everything

The single largest finding, and it predates this session.

`behaviour.mjs` — the project's main regression suite, whose documented
baseline is roughly 800 pass / 3 fail — scored **20 pass / 180 fail on a clean
`main` worktree**, dying before it reached any Phase 2 surface.

Cause: `app/js/envelope.js` (the Note Foundation transaction gateway, merged to
`main` as #86) imports `runTransaction`, and the test stub did not export it.
Because the stub replaces the whole Firebase module, a name it lacks is not a
missing feature — it is a **module-level SyntaxError that stops every page
booting**. Two more of the same followed from `note-foundation.js`: `limit` and
`orderBy`.

**Production was never affected.** The real Firebase 10.12.2 module exports all
three; this failed only in the harness, which is exactly why it survived.

Recovery, each step measured on a clean `main` worktree:

| State | behaviour.mjs |
|---|---|
| `main` as found | 20 pass / 180 fail |
| + `runTransaction` on the stub | 231 pass / 0 fail |
| + STUDY-pillar helpers | 493 pass / 2 fail |
| reconciled branch, all fixes | **802 pass / 1 fail** |

The remaining 1 is the documented environmental block (this sandbox cannot
reach archive.org), and the suite stops at the documented pre-existing
section-42 crash — the project's own historical stopping point.

The second cause was the **STUDY pillar menu**: Options, Read and Note stopped
being dock tabs and became items inside `#studyPillarMenu`, which starts
hidden. Their buttons still resolve but measure 0×0, so every direct click
timed out. 15 Options sites and 31 Read sites now open the pillar first,
checking the **rendered box**, never `.hidden`. `reading.mjs` and `panel.mjs`
had the identical breakage and are now green.

`tools/i18n-verify/stub-parity.mjs` was added so this class cannot recur: it
checks every named Firebase import across `app/` against the stub's exports and
names the offending file. Proven able to fail.

## 4. Defects corrected in the preserved work

Valid work was kept; these were fixed, not discarded.

1. **I11 — the Word Card was English-only.** It printed a dozen hardcoded
   English strings and `quranrevival.html` passed it **no labels at all**, so a
   Bangla reader met an English panel on a Phase 2 acceptance surface. Every
   string is overridable now, the page supplies each through `t()`, and Bangla
   was added for all of them. The module stays pure.
2. **I11 — the clickable word's accessible name.** Its `aria-label` — a screen
   reader's only name for that button — hardcoded an English `"Quran word"`
   fallback and preferred the English gloss outright. It now follows the panel's
   own gloss languages, in their order.
3. **Bengali digits on counts.** Found by *looking* at a screenshot, not by a
   failing check: the Basic Arabic panel read `ধাতু-সম্পর্কিত 381টি ব্যবহার` —
   Bangla words, Western digits. Counts now use `i18n.js`'s `num()`. Applied to
   the count only; `surah:ayah:position` references are identifiers and keep
   plain digits.
4. **The tab row wrapped.** At 320px and 360px in English, and 320px in Bangla,
   the three level tabs broke into a two-line ragged stack — the failure this
   project has shipped once before and had to be sent a photo of. Measured:
   English needs 302px, a 320px phone offers 249px. The tabs share the row and
   step type and padding down at 380px and 340px. One line everywhere now.
5. **Every button was 29px**, against the ~40px this project settled on. Tabs
   are 40px tall; previous/next/close are fixed 40px squares that never shrink.
6. **A brittle check** pinned the exact version string `08.09`, contradicting
   the rule that every tranche increments it — guaranteed to fail on the next
   tranche, and did. Restated as what it means.

Defects 4 and 5 existed because Phase 2's responsive criterion had only ever
been checked at one viewport.

## 5. Phase 2 — evidence per acceptance criterion

The existing `quran-word-card-integration.mjs` is **static source inspection**
(`readFileSync` + regex). It proves the code was written, never that a reader
can click a word and see a card. Phase 2 had **no rendered proof at all**.
`tools/i18n-verify/quran-word-card-rendered.mjs` now supplies it: **92 checks,
both languages, six viewports**, reading measured rects, real text and
`document.activeElement`.

| Criterion | Evidence | Status |
|---|---|---|
| Word occurrence identity | 6 contract + 9 index checks | ✅ |
| Clickable Quran words | rendered: real `<button>`, click opens the card | ✅ |
| Persistent Word Card | 22 unit + rendered on screen, inside viewport | ✅ |
| WbW tab | rendered, both languages | ✅ |
| Basic Arabic tab | rendered; Bangla carries no leftover English | ✅ |
| Arabic in Depth tab | rendered; Bangla carries no leftover English | ✅ |
| Occurrence lookup | 8 loader checks; on-demand proven off the load path | ✅ |
| Keyboard accessibility | Home/ArrowRight move focus **and** selection; Escape closes; focus returns to the word that opened it | ✅ |
| Responsive behaviour | 6 viewports × 2 languages: on screen, no sideways scroll, one tab line, every button ≥36px | ✅ |
| Malformed index/reference handling | rejected version, bounds, packing, contract | ✅ |

**I9 / load-speed contract respected:** neither occurrence index is fetched on
the landing path, nor merely by opening Read — read off
`performance.getEntriesByType("resource")`, not off the source.
**No write path added:** `__fsLog` carries zero writes from opening and
browsing the card.

## 6. Full verification state

| Suite | Result |
|---|---|
| `behaviour.mjs` | 802 pass / 1 fail (documented archive.org block); stops at documented section-42 crash |
| `layout.mjs` | every landing-page metric **byte-for-byte identical** to `main`, 8 viewports × 2 banner states |
| `navcheck.mjs` | **unchanged** — its 1 problem is the documented 320px English truncation of "Operation"/"Bookmark" |
| `reading.mjs` | READING SCREEN OK, 8 viewports × 2 banner states |
| `panel.mjs` | 47 configurations, no truncated label, no wrapped bar |
| `quran-word-card-rendered.mjs` | 92 pass / 0 fail |
| 19 node suites | all green |
| Firestore emulator Rules | 27 allow/deny assertions pass — **see §7** |
| Translation coverage | `main` 1733/46 → 1778/47. +45 scanned, **+1 missing**, and that one is `"Meaning unavailable"`, the deliberate English fallback on the `lang="en"` line of a bilingual panel, confirmed correct on the rendered page |

## 7. OWNER CONTROL GATE — the Activity Rules candidate

The acceptance locks recorded emulator execution as PENDING. It has now been
run: `firebase-tools` and Java are both available here.

**The suite passes. It is still not acceptance, and that is the finding.**
Reading the emulator log rather than the exit code: **9 of the 13 logged
denials were refused by hitting Firestore's 1000-expression evaluation limit**
at the `update` branch, not by the security logic. They sit inside
`assertFails`, so they count as correct denials while proving nothing about the
rule they were written to exercise — and denial by budget exhaustion is not
stable: the same exhaustion will refuse *legitimate* appends as a week grows.

This is runtime evidence for exactly the weekly-size concern Task 48 raised on
static grounds. The draft's status is **unchanged: REJECTED for acceptance.**

**No rule was rewritten.** The remedy is an architecture choice — a provably
bounded shape, Option C's create-only receipts, or deferring Activity Rules
integration — and choosing between materially different product behaviours, as
well as any Rules change, are Owner Control Gates. Full detail is appended to
`docs/governance/activity-rules-proposal-2026-09-12.md`.

This gate blocks **Phase 4's Rules integration only**. It does not block Phase 3.

## 8. Position and next action

**Phase 2: closed** on the executable criteria above.
**Next: Phase 3** — WbW self-progress, managed/student states, teacher
approval, Arabic coverage, Explore and wheel integration, storage safeguards.
The pure coverage projection (`quran-word-coverage.js`, 10 checks) and the
storage options paper are already in place from the preserved branch; what is
missing is the application wiring and the state model.

`Surface Token ≠ Lemma ≠ Root ≠ Grammatical Family` and `Activity ≠ Mastery`
are preserved: the card renders each layer separately, reports absence honestly
rather than deriving one from another, and writes nothing.

**OWNER ACTION: NONE for §1–§6 and §8 — CONTINUING AUTHORISED EXECUTION.**
**OWNER ACTION REQUIRED for §7** before Activity Rules integration in Phase 4.
