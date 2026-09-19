# QuranRevival v08.31 — Study-evidence persistence-readiness gate

**MMSA — Madrasatul Muslimeen's Study App**
**Date:** 19 September 2026
**Stream:** `quran` (QuranRevival — the Quran Study module)
**Branch:** `claude/charming-rubin-xzxbk1`
**Baseline:** `origin/main` at `db6cb24b807d77630914e076d413bec6982cc3d7`, application **v08.30**
(`db6cb24` is the report-stamp commit one ahead of the accepted `8ea445fb376784fb8452cb2042e4eaa8e017f41b`;
`app/` is byte-identical between the two, so the accepted build is what was measured against.)
**Authorisation:** Master Architect ruling, 19 Sep 2026 — v08.30 integration ACCEPTED WITH A
GOVERNANCE CORRECTION; **v08.31 RESERVED AND AUTHORIZED** for a narrow release-gating repair.
**Blast radius:** BR-2 — reachable application behaviour changes on one control, on one screen,
in one module. No schema change, no Firestore Rules change, no deployment.

---

## 1. The problem, stated exactly

v08.30 wired D1 Reading, D2 Listening and D4 Word-by-Word to ADR-008's Activity
evidence subcollection, and it fails **closed**: `firestore.rules` contains the
word `evidence` **zero** times, so the subcollection has no rule, every write is
denied, the store rethrows and `safeWrite()` surfaces the error to the reader
(I15). That is correct, it was deliberate, and **none of it is weakened here.**

What was missing is the consequence of where that code lives. **GitHub Pages
serves `main`**, so the moment v08.30 reached `main` the ✓ became visible on the
Owner's own live app — a control whose only possible outcome is an error
message. Failing closed at the *database* is not the same as being honest at the
*surface*.

The Master Architect's ruling put it in one line: *while E1 is closed, the Phase
4 completion control must not invite an action that cannot succeed.*

### 1.1 The governance correction that produced this tranche

The v08.30 integration report stated `APP_DEPLOYED=NO`. That was **incomplete**,
and the incompleteness mattered: one boolean cannot carry four independent
facts, and collapsing them recorded a control the Owner can see and press as
"not deployed". The four are now recorded separately, and this report and the
programme ledger both carry them.

| State | Value | Basis |
|---|---|---|
| `APPLICATION_CODE_INTEGRATED` | **YES** | v08.30 is on `main` |
| `GITHUB_PAGES_SERVING` | **PRESUMED_FROM_MAIN** | **Presumed, not measured** (`verified: false`). This sandbox's proxy refuses `CONNECT` to `github.io`, so serving cannot be observed here. The presumption rests on this repository's own standing brief. |
| `FIREBASE_RULES_DEPLOYED` | **NO** | E1 closed; no Console access from a sandbox |
| `EVIDENCE_RECORDING_OPERATIONAL` | **NO** | Depends on the above; the subcollection has no rule |
| `E1` | **CLOSED** | Unchanged |

---

## 2. What was built

### 2.1 `app/js/study-evidence-readiness.js` — the declaration

A new Quran-owned module holding one frozen declaration and one predicate.

```js
export const EVIDENCE_PERSISTENCE_DECLARATION = Object.freeze({
  ready: false,
  decision: null,
  gate: "E1",
  note: "ADR-008 Activity evidence Rules are NOT deployed to study-monitoring. ...",
});
```

**Requirement 1 — defaults to false.** `ready: false` is a **literal**, not a
computed default. A check reads it as a literal and fails if it ever becomes an
expression, because a computed default is not a default: it is a guess with a
better disguise.

**Requirement 2 — readiness is never inferred from `firestore.rules`, and
CANNOT be.** The module **imports nothing at all**. This is enforcement by
*inability*, the same shape ADR-010 uses to forbid deriving a Note's Destination
from its Origin: a module with no imports cannot read the rules text, cannot
fetch, and cannot reach a module that does. A boundary check counts its imports
and asserts zero, and separately asserts the module still *names*
`firestore.rules` in its prose — because the prose has to say why it does not
read it, and without that second half the check would pass just as happily on a
module that never mentioned the subject.

The distinction is real rather than pedantic. The repository's rules file is a
**file**. Readiness is a fact about a **live Firebase project**. A repository
file mentioning `evidence` would prove only that somebody wrote it down;
deployment is E1, performed through the Firebase Console against
`study-monitoring`, and nothing in a checkout can observe it.

**Requirement 5 — enablement is a governed decision, not an edit.** Flipping
`ready` to `true` on its own returns **false**. `isStudyEvidencePersistenceReady()`
additionally requires a `decision` naming an authority from a closed set
(`master-architect`), a real ISO date, and a non-empty reference. Every other
shape — no declaration, no decision, an empty decision, an unknown authority, a
malformed date — returns false. There is no path through the function that says
"probably".

`studyEvidenceUnavailableReason()` returns a **stable key**, not a sentence,
because the caller is the only thing that knows the reader's language (I11). It
returns `null` when persistence *is* ready, so a caller cannot accidentally
print an unavailability reason for a working feature. It distinguishes
`evidence-rules-not-deployed` (the standing state) from
`evidence-readiness-decision-incomplete` (a half-made enablement), so the second
is never read as the first.

### 2.2 Gate one — the write chokepoint

```js
export async function recordStudyEvidence(db, args, { uid } = {}) {
  if (!args) return null;
  if (!isStudyEvidencePersistenceReady()) {
    return { written: false, blocked: true, reason: studyEvidenceUnavailableReason() };
  }
  return writeStudyActivityEvidence(db, { ...args, uid });
}
```

**Requirement 3 — no evidence write may be attempted.** That is a claim about
every D1/D2/D4 call site at once, and it is provable in one place because
`recordStudyEvidence()` is the single funnel all three go through. It returns
before the store is called: nothing is composed, nothing is sent, no
`permission-denied` is generated, and `errors.js` never fires.

`blocked: true` is a **distinct shape** from the store's own `written: false`,
which means "already recorded today" and is a *success*. Conflating them would
make a gated press report itself as done — the exact lie this tranche exists to
remove. The D1 handler branches on `blocked` before the success branch, even
though the surface gate means it cannot be reached, because defence in depth
means the unreachable branch has to be right too.

### 2.3 Gate two — the surface

The ✓ carries **`aria-disabled="true"`, not `disabled`**, and the difference is
the design.

A `disabled` button cannot be focused or pressed, so a reader gets no route to
learning *why* it is off — they meet a dimmed icon and nothing else. This
project's own standing lesson is explicit: *"A control that opens and explains
itself beats a control that is not there,"* and *"where a gate is correct, say
so in words where the control would have been."*

So the control:

- is **not actionable** — its handler returns before any argument is built;
- is **dimmed identically** to a disabled control (`opacity: 0.45`, the rule
  `#readBar button[disabled]` already used);
- keeps its **resting tooltip honest** — while gated, the title is the
  unavailability sentence rather than "Mark this reading complete", because a
  control that cannot act must not keep offering the action;
- **explains itself on a press**, in the reader's own language.

**Independent confirmation that it reads as non-actionable:** Playwright refuses
to click it, reporting *"element is not enabled"* — its actionability check
honours `aria-disabled`. A real finger still fires a click on an aria-disabled
button, which is what keeps the explanation reachable for a person.

### 2.4 The unavailability surface

Two sentences, both translated (I11):

| English | Bangla |
|---|---|
| Recording study activity is not available yet. | স্টাডি কার্যক্রম রেকর্ড করা এখনও চালু হয়নি। |
| Recording study activity is not available yet. Nothing was saved and nothing was lost — this will be switched on once the database is ready. | স্টাডি কার্যক্রম রেকর্ড করা এখনও চালু হয়নি। কিছুই সংরক্ষণ করা হয়নি এবং কিছুই হারায়নি — ডেটাবেস প্রস্তুত হলে এটি চালু করা হবে। |

The short one is the tooltip and the `aria-live` announcement; the long one is
the notice, which has room to say that nothing was lost. Real em dashes on both
sides — never an HTML entity in a translation value.

`#qrStudyNotice` is **`position: fixed` and lives OUTSIDE `#readBar`**, both
deliberately. `#readBar` is the app's densest row and v08.30 already pushed it
to wrap at 390px and 412px (accepted Owner UI debt `O4-READBAR-WRAP`); a message
inside it would take width and make that worse. A boundary check asserts the
notice is not inside the bar.

It is also **not** `errors.js`'s red write-failure banner. Nothing failed, and
saying *"that save did not go through"* about a write that was never attempted
would be untrue.

### 2.5 Requirement 4 — the writer still fails closed

`app/js/study-activity-evidence-store.js` is **untouched**. It still rethrows,
`safeWrite()` still surfaces the failure, I15 still holds. A boundary check
asserts the store contains a `throw` **and** that it does **not** import the
readiness module — because if the store consulted the gate, the two layers would
collapse into one and there would be no defence in depth left to speak of.

### 2.6 D2 and D4 — gated silently, deliberately

Both are gated (by the chokepoint, and again by an early return at each call
site so nothing is even composed), and neither says anything.

- **D2 Listening** completes without anyone pressing anything. There is no
  invitation to withdraw, and a notice fired by the audio reaching 80% would be
  an interruption the reader did not ask for.
- **D4 Word-by-Word**: the learning truth was **already saved** by
  `setWordState()` — only the Activity evidence is withheld. Telling the reader
  their word tap failed would be false; telling them Activity is off on every
  single word tap would be noise.

The ✓ is the one surface that says it, because it is the one that invites a press.

---

## 3. Measurement — requirements 8, 9, 10

Seven established widths × two languages, against the **accepted v08.30 build**
(`8ea445fb`) served through the documented `app/_prev-quranrevival.html` shim, so
both sides ran through one probe.

| Case | bar W×H | in-flow kids | need | avail | slack | ✓ tap target | changed? |
|---|---|---|---|---|---|---|---|
| en 320 | 288×75.0 | 10 | 380.6 | 288 | **−92.6** | 31.0×26.8 | **none** |
| en 340 | 308×75.0 | 10 | 380.6 | 308 | **−72.6** | 31.0×26.8 | **none** |
| en 360 | 328×75.0 | 10 | 380.6 | 328 | **−52.6** | 31.0×26.8 | **none** |
| en 390 | 358×75.0 | 10 | 380.6 | 358 | **−22.6** | 31.0×26.8 | **none** |
| en 412 | 380×75.0 | 10 | 380.6 | 380 | **−0.6** | 31.0×26.8 | **none** |
| en 768 | 736×41.8 | 10 | 380.6 | 736 | **+355.4** | 31.0×26.8 | **none** |
| en 1100 | 980×41.8 | 10 | 380.6 | 980 | **+599.4** | 31.0×26.8 | **none** |
| bn 320 | 288×75.0 | 10 | 389.9 | 288 | **−101.9** | 30.7×26.8 | **none** |
| bn 340 | 308×75.0 | 10 | 389.9 | 308 | **−81.9** | 30.7×26.8 | **none** |
| bn 360 | 328×75.0 | 10 | 389.9 | 328 | **−61.9** | 30.7×26.8 | **none** |
| bn 390 | 358×75.0 | 10 | 389.9 | 358 | **−31.9** | 30.7×26.8 | **none** |
| bn 412 | 380×75.0 | 10 | 389.9 | 380 | **−9.9** | 30.7×26.8 | **none** |
| bn 768 | 736×41.8 | 10 | 389.9 | 736 | **+346.1** | 30.7×26.8 | **none** |
| bn 1100 | 980×41.8 | 10 | 389.9 | 980 | **+590.1** | 30.7×26.8 | **none** |

**0 changed metrics across all 14 configurations.** Bar width, bar height,
in-flow child count, natural need, available width, slack, tap target and
`document.scrollWidth` are identical on both sides everywhere.

**Requirement 10 — no additional wrapping.** Bar height is the wrap signal:
75.0px (wrapped, the ⋮ on its own right-aligned line) at 320–412 in both
languages, 41.8px (one line) at 768 and 1100. Identical before and after. The
v08.30 wrap is preserved exactly as accepted Owner UI debt and not made worse.

**Requirement 8 — tap target not reduced.** 31.0 × 26.8px English, 30.7 × 26.8px
Bangla, identical on both sides. A boundary check pins `#readBar .qr-ico`'s own
sizing rule and refuses any `[aria-disabled]` rule that sets `font-size`,
`padding`, `width` or `height`.

**The comparison could have failed.** The two sides differ where they should:
`aria-disabled` absent → `"true"`, opacity `1` → `0.45`. Without a real
difference the run would have proved nothing — the same positive-control
discipline the `layout.mjs` shim needs.

### 3.1 Pressed for real, and looked at

At 390×844 in both languages, the gated ✓ dispatched a real click:

| | English | Bangla |
|---|---|---|
| `__fsLog` writes before → after | **11 → 11** | **11 → 11** |
| write-failure banner | **absent** | **absent** |
| `aria-pressed` after press | `false` | `false` |
| live region | the short sentence | the short sentence, in Bangla |
| notice | the long sentence | the long sentence, in Bangla |
| `#readBar` height | 74.97px | 74.97px |
| notice box | 370.8 × 76.2, bottom 770.4 of 844 | 370.8 × 57.9, bottom 770.4 of 844 |

**No write was attempted** — proven by the write log, not by reading the code.
**No error surface fired** — because nothing failed. **`aria-pressed` stayed
false** — it does not falsely report done.

Screenshots were taken and **looked at** in both languages: the ✓ is visibly
dimmed beside its full-opacity neighbours, the notice is legible and neutral,
fully on screen and clear of the dock, and the ⋮ sits on its own right-aligned
line exactly as v08.30 left it. The badge reads **v08.31**.

---

## 4. Verification

### 4.1 Suites

| Suite | Result |
|---|---|
| `study-activity-evidence-boundary.mjs` | 18 → **26 passed, 0 failed** |
| `programme-ledger.mjs` | **8 passed, 20 noted, 0 failed** (guard G is new) |
| `programme-ledger-mutations.mjs` | 37 → **49 passed, 0 failed** |
| `brief-integrity.mjs` | **8 passed, 0 failed** |
| `stub-parity.mjs` | 3 passed, 0 failed |
| `firestore-index-requirements.mjs` | 8 passed, 0 failed |
| `rules-authorisation-executable.mjs` | 38 passed, 0 failed |
| `quran-boundary.mjs` | 30 passed, 0 failed |
| `note-foundation-boundary.mjs` | 30 passed, 0 failed |
| `journey-map-boundary.mjs` | 13 passed, 0 failed |
| `d14-timezone-boundary.mjs` | 10 passed, 0 failed |
| `study-approach-contract-boundary.mjs` | 16 passed, 0 failed |
| `hadith-corpus / -source-rights / -commentary-binding` | exit 0, all three |
| `i18n-coverage` | 1,877 → **1,879** scanned, 1,816 → **1,818** Bangla; **missing UNCHANGED at 61**. The +2 is exactly this tranche's two strings, both translated |
| `navcheck.mjs` | exit 0 — NAV FITS IN BOTH LANGUAGES AT EVERY WIDTH |
| `panel.mjs` (en) | exit 0 — PANEL OK |
| `panel.mjs` (bn) | exit 1 — 6 × `#drillModeSelect` newly truncated. **PRE-EXISTING**: see §5.4 |
| `reading.mjs` | exit 0 — READING SCREEN OK (16 viewports also report the sandbox TLS artefact) |
| `behaviour.mjs` | **981 passed, 1 failed** — the one failure is 31e's `ERR_CERT_AUTHORITY_INVALID`, the sandbox TLS artefact. This is exactly the brief's recorded clean run, and the archive.org 22g trio passed |
| `layout.mjs` | exit 0 — **NO LAYOUT REGRESSIONS** at all 16 configurations. `getElementById` 252 → 253 (exactly `#qrStudyNotice`), **0 dangling**, 22 deferred unchanged |

Requirement 7 is what the middle block of that table is for: Hadith, D14, MMJ,
Notes, Tracking and the Quran boundaries all still hold.

### 4.2 Mutations — every new guard proven able to fail

**Guard G, 11 mutations + a positive control**, all caught:

| Mutation | Refused with |
|---|---|
| the four deployment states collapse back into one | `deployment.githubPagesServing is not recorded` |
| a state takes a word from outside its own vocabulary | `not one of YES \| NO` |
| a presumption is recorded without saying it is one | `must say it is one` |
| serving claimed verified with nothing verified | `claims SERVING_VERIFIED without verified:true` |
| the feature recorded operational while its Rules are not deployed | `the evidence subcollection has no rule` |
| the gate flipped in code and nowhere else | `the code and the governance record disagree` |
| flipped in code AND ledger, Rules still not deployed | `readiness may not run ahead of the deployment it depends on` |
| everything flipped, no governed decision | `enablement is a decision, not an edit` |
| a module authorises its own enablement | `not in the closed set` |
| the decision points at a record that does not exist | `which does not exist` |
| the declaration stops being a readable literal | `guard G cannot read it, so it cannot vouch for it` |
| **POSITIVE CONTROL:** a fully governed enablement | **ALLOWED** |

That last row is the one that matters: without it, a guard G that simply refused
every enablement would have passed all eleven mutations and proved nothing about
the case that will one day be real.

**The gate's structural checks, 17 mutations, all caught:** the declaration
defaults to true; the module acquires an import; the module stops explaining why
it ignores the rules file; the decision requirement is dropped; the gate moves
behind the store call; a refusal becomes indistinguishable from `written:false`;
the control stops reporting `aria-disabled`; the control stops being visually
distinguishable; the gated state shrinks the icon; the notice moves inside
`#readBar`; a Bangla key is dropped; a Bangla value is left in English; D2 builds
its args before asking; D4's write leaves the gate; the store consults the gate;
the store stops rethrowing; the unreachable store caller becomes page-reachable.

**17 proven, 0 unproven** — after the two findings in §5.

---

## 5. Findings — two of my own, recorded rather than smoothed over

### 5.1 A second direct caller of the evidence store

The chokepoint check's **own first run** found that `study-event-wiring.js` is
not the only module calling `writeStudyActivityEvidence()`. P5-C's
`app/js/study-note-service.js` calls it directly, for D3 Journaling.

It is **not a live bypass**: D3 has no reachable producer, P5-D (the Note editor)
is not built, and the reachability walker confirms the module is unreachable from
every page by any chain of any length. It **would** be a bypass the day P5-D
wires it.

Excluding it by name would have been the wrong fix — the tenth such exclusion is
a live wiring nobody noticed. It is **pinned as unreachable** instead: the check
asserts that the only non-wiring caller is that exact file *and* that it has zero
page-reachable chains. Wire it, and the check fails until it goes through the
gate. Mutation-proven by making it page-reachable.

### 5.2 A vacuous assertion of mine, found by an UNPROVEN mutation

The notice-placement check first read:

```js
const bar = page.slice(page.indexOf('<div id="readBar"'), page.indexOf('id="readPickers"'));
assert.ok(!bar.includes("qrStudyNotice"), ...);
```

**`#readPickers` comes EARLIER in the document than `#readBar`**, so the slice
was the empty string and `!"".includes(...)` was true whatever the markup did. A
check that could not fail.

It was found because the mutation that moves the notice into the bar came back
**UNPROVEN** — and an unproven mutation is a finding about the guard, to be
chased rather than deleted. It balances the element's own `<div>`s now, and
asserts the slice came back non-empty and contains `readCompleteBtn` before
reading it, so it cannot go vacuous again.

### 5.3 A process failure of mine, recorded because it cost real time

An earlier version of my mutation harness restored the tree with
`git checkout -- app tools`. That destroyed the **uncommitted** guard work it was
supposed to be testing — guard G and eight boundary checks, gone in one line. It
was rebuilt, and the harness was rewritten to back the touched files up **in
memory** and restore from that. **A mutation harness must never reach for git,**
and the work should have been committed before any mutation run. Both are now
true.

A second harness defect in the same hour: the first version judged a mutation
by grepping the output for `FAIL`. A mutation that made the suite **throw** at
import time produced no such line, and was reported as UNPROVEN — this
repository's own standing lesson (*"a grep cannot see an uncaught throw; check
the exit code"*), met again in a harness written after reading it.

---

## 6. Blast radius and what was deliberately NOT done

**Files changed**

| File | Change |
|---|---|
| `app/js/study-evidence-readiness.js` | **new** — the declaration and predicate. Imports nothing |
| `app/js/study-event-wiring.js` | the chokepoint gate; two re-exports |
| `app/quranrevival.html` | the surface gate, the notice element, its CSS, D2/D4 early returns |
| `app/js/i18n/bn.js` | two additive keys |
| `app/js/version.js` | `08.30` → `08.31` |
| `docs/governance/programme-integration-ledger.json` | four deployment states; readiness record; v08.31 RESERVED |
| `tools/i18n-verify/programme-ledger.mjs` | guard G |
| `tools/i18n-verify/programme-ledger-mutations.mjs` | 12 cases |
| `tools/i18n-verify/study-activity-evidence-boundary.mjs` | 8 checks + the vacuity fix |
| `CLAUDE.md`, `CHANGELOG.md` | the round entry and the four-state correction |

**NOT done, each for a stated reason**

- **Requirement 13 — no Firebase Rules deployed.** `firestore.rules` is
  byte-for-byte untouched and still contains `evidence` **zero** times. No
  `firestore.indexes.json` exists.
- **Requirement 14 — v08.32 is NOT allocated.** The ledger's `nextUnallocated`
  names `08.32` only as the *unallocated boundary*, which is what lets guard B
  refuse anyone who stamps it. It is not an allocation and not a prediction.
- **v08.31 is RESERVED, not LIVE.** It is stamped on this branch; `main` still
  carries v08.30. Integration is the Master Architect's instruction to give, and
  it has not been given. Guard A enforces that LIVE must equal `main.version`.
- **The store was not touched**, so the fail-closed rethrow is exactly as
  accepted.
- **The `#readBar` wrap was not changed** — accepted Owner UI debt
  `O4-READBAR-WRAP`, and the measurement above proves it is untouched.
- **The two provisional reader-behaviour defaults were not re-decided** — the
  Reading Approach inferred from translation visibility, and juz/hizb/ruku/page
  recording no evidence. Both remain in the ledger's `ownerReviewAfterBuild`.
- **D3 Journaling remains out of scope.**
- **GitHub Pages serving was not verified.** The sandbox proxy refuses
  `github.io`, so it is recorded as PRESUMED with `verified: false` rather than
  claimed.

---

## 7. What the Owner should check

Two things, both on the live app once this is integrated:

1. Open **QuranRevival → Study → Read**. The **✓** beside the bookmark should
   look **faded**. Press it: a pale blue message should appear near the bottom
   saying *"Recording study activity is not available yet. Nothing was saved and
   nothing was lost…"* — and **no red error bar** should appear.
2. Switch the app to **Bangla** and do the same. The same message should appear
   in Bangla.

If a red error bar appears instead, the gate is not working and it should be
reported.

---

### 5.4 A Bangla-only truncation that is NOT this tranche's, established rather than assumed

`panel.mjs bn` exits 1 with six findings — `#drillModeSelect` newly truncated at
six viewports — and `panel.mjs en` exits 0. That is not in the brief's recorded
baseline, which names `tenantSelect`, `surahSelect` and `unitTypeSelect` only.

It is **pre-existing**. Established by reverting `app/` to the accepted v08.30
build (`8ea445fb`) and re-running the same suite: **the identical six findings**.
v08.31 touches nothing in the Study-options drill bar, and the English run is
clean, so this is a Bangla label longer than its cell — the silent
`nowrap` + `ellipsis` failure this project has met before.

It is **reported, not fixed**: fixing it is a Study-options layout change on the
most tightly measured screen in the app, with the same materially-different
remedies (widen, shrink, reword in both languages) the three existing Owner UI
decisions carry. **It joins them as an Owner UI decision rather than being
absorbed into a release-gating tranche.**

It is also a gap in routine verification worth naming: `panel.mjs` takes a
language argument and the routine habit has been to run it in English. A suite
that only ever runs in one language is measuring one language.

---

## 8. State block

```
QURANREVIVAL_V0831_RELEASE_GATING
BASE_MAIN_SHA=db6cb24b807d77630914e076d413bec6982cc3d7
FINAL_APPLICATION_SHA=e63cb8d69e5813faf57251a7f15fef33a4bae191
# ^ the commit carrying the complete v08.31 application and governance change.
#   One stamp commit follows it, changing ONLY this line and the .html rendering.
FINAL_MAIN_SHA=db6cb24b807d77630914e076d413bec6982cc3d7
APP_VERSION_BEFORE=v08.30
APP_VERSION_AFTER=v08.31
CHANGED_FILES=11
READINESS_GATE=PRESENT — app/js/study-evidence-readiness.js (declaration + predicate, imports nothing) + chokepoint in recordStudyEvidence() + surface gate on #readCompleteBtn
DEFAULT_READINESS=FALSE
CONTROL_WHEN_UNAVAILABLE=NOT_ACTIONABLE — aria-disabled="true", dimmed to opacity 0.45, handler returns before any argument is built; explains itself on press; tap target UNCHANGED at 31.0x26.8px
WRITE_ATTEMPT_WHEN_UNAVAILABLE=NO
ENGLISH_UI_TEXT=Recording study activity is not available yet. | Recording study activity is not available yet. Nothing was saved and nothing was lost — this will be switched on once the database is ready.
BANGLA_UI_TEXT=স্টাডি কার্যক্রম রেকর্ড করা এখনও চালু হয়নি। | স্টাডি কার্যক্রম রেকর্ড করা এখনও চালু হয়নি। কিছুই সংরক্ষণ করা হয়নি এবং কিছুই হারায়নি — ডেটাবেস প্রস্তুত হলে এটি চালু করা হবে।
WRITER_FAIL_CLOSED=PRESERVED — study-activity-evidence-store.js byte-for-byte untouched; still rethrows; asserted NOT to consult the gate, so the two layers stay independent
READBAR_SEVEN_WIDTH_RESULTS=14/14 IDENTICAL to accepted v08.30 (8ea445fb), 0 changed metrics. 320/340/360/390/412/768/1100 x en/bn. Bar height 75.0px at 320-412 (wrapped, unchanged) and 41.8px at 768/1100 (one line). Slack en -92.6/-72.6/-52.6/-22.6/-0.6/+355.4/+599.4; bn -101.9/-81.9/-61.9/-31.9/-9.9/+346.1/+590.1. NO ADDITIONAL WRAPPING.
QURAN_REGRESSIONS=NONE — behaviour.mjs 981 passed / 1 failed (the single failure is the sandbox TLS artefact 31e, environmental); layout.mjs NO LAYOUT REGRESSIONS, 0 dangling; navcheck.mjs exit 0; panel.mjs en exit 0; reading.mjs exit 0; quran-boundary 30/0
HADITH_REGRESSIONS=NONE — hadith-corpus, hadith-source-rights, hadith-commentary-binding all exit 0
PROGRAMME_GUARDS=A-G, 8 passed / 22 noted / 0 failed. Guard G is new (four deployment states + readiness cross-check). Guard E: 19 touch records, 12 AUTHORIZED, 7 DECLARED, 0 undeclared
MUTATIONS=66 total, 0 unproven — 49 programme-ledger (37 + 11 guard-G + 1 positive control) and 17 v08.31 boundary. One came back UNPROVEN and was chased to a real vacuous assertion (§5.2)
BOUNDARY_VERIFICATION=study-activity-evidence-boundary 18 -> 26 passed / 0 failed; study-approach-contract-boundary 16/0; note-foundation-boundary 30/0; journey-map-boundary 13/0; d14-timezone-boundary 10/0; rules-authorisation-executable 38/0; firestore-index-requirements 8/0; stub-parity 3/0; brief-integrity 8/0
SHARED_FILES_CHANGED=7 — app/js/version.js, docs/governance/programme-integration-ledger.json, app/js/i18n/bn.js, tools/i18n-verify/programme-ledger.mjs, tools/i18n-verify/programme-ledger-mutations.mjs, CLAUDE.md, CHANGELOG.md
UNAUTHORIZED_SHARED_TOUCHES=NONE — all 7 declared and recorded AUTHORIZED in the ledger, guard E reports 0 undeclared. CLAUDE.md and CHANGELOG.md are not named in the v08.31 ruling and are recorded with an explicit derivation field (entailed by requirement 12; brief-integrity.mjs fails a version bump they have not followed)
D14_STATUS=UNCHANGED — d14-timezone-boundary 10/0; the two contract modules remain imported by nothing and cannot reach activity.js; no timezone field, mode or location was added, read or written
E1_STATUS=CLOSED
APPLICATION_CODE_INTEGRATED=YES (v08.30 on main; v08.31 is on claude/charming-rubin-xzxbk1 and NOT integrated — integration is the Master Architect's instruction to give)
GITHUB_PAGES_SERVING=PRESUMED_FROM_MAIN (verified:false — the sandbox proxy refuses github.io, so this is presumed from this repository's own record, not measured)
FIREBASE_RULES_DEPLOYED=NO
EVIDENCE_RECORDING_OPERATIONAL=NO
V0832_STATUS=UNALLOCATED
READY_FOR_MASTER_ARCHITECT_ACCEPTANCE=YES
READY_TO_SHIP=NO
```
