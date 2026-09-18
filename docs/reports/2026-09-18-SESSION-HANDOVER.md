# QuranRevival — deterministic session handover

- **Date:** 2026-09-18
- **Purpose:** hand this session's state to the next Claude session without reconstruction
- **Authority:** Master Architect, session transition authorised. **SESSION CHANGE ≠ PROJECT STOP.**

> **Read `CLAUDE.md` first, as always.** This document does not replace the standing brief; it records exactly where this session stopped and what the next one may do without re-deriving anything.
>
> **Do NOT redesign or reconstruct QuranRevival.** Every item below is either done, gated, or has its next step stated.

---

## 1. Authoritative state

| | |
|---|---|
| **`main` SHA** | **`d8f049207d80fdd58f31931d82a080ef7d4f6fe7`** |
| `origin/main` | identical — `d8f0492` |
| `origin/claude/dreamy-tesla-0clj36` | identical — `d8f0492` (fast-forwarded; it held nothing unique) |
| **Working tree** | **clean** — `git status --porcelain` empty |
| **App version** | **`08.25`** — `app/js/version.js`, unchanged all session |
| `firestore.rules` | **byte-identical** — nothing deployed |
| `firebase.json` | **byte-identical** — still declares no indexes |
| All 3 Rules candidates + 4 index candidates | **byte-identical** |

**Nothing about how the app works changed this session.** Ten tranches, zero application behaviour changes, no version bump — deliberately.

## 2. The ten tranches

Range: **`7d35bc0..d8f0492`** (ten commits, oldest first).

| # | Commit | Purpose | Result |
|---|---|---|---|
| 1 | `9a4bcb8` | Fix the `behaviour.mjs` section-42 crash carried since v07.69 | **802 → 973 passing**, suite runs to completion; **zero application defects** in ten newly-reachable sections |
| 2 | `20972df` | **P6-D** — the `noteFolders` editing side the accepted Rules already authorise | 4 functions added; **two real defects in accepted P6-A/P6-B code** found and mutation-proven |
| 3 | `2895573` | **P5-F / P6-E** — `noteSources` retire, `notePlacements` reorder | 2 functions; two user-facing gaps closed |
| 4 | `6ea0c04` | `rules-authorisation-executable.mjs` — make the comparison mechanical | 17 checks, 7/7 mutations, 3 reproducing the historical gaps |
| 5 | `be28d6f` | **P4-E** — the Activity evidence read side | 7 tests; **no new index** |
| 6 | `65ca32b` | Extend that guard to `create` payloads | **17 → 38 checks**, 11/11 mutations |
| 7 | `805737d` | Sweep every `check()` runner for cannot-fail shapes | 14 runners hardened; **a check that had never run** found and fixed |
| 8 | `98cae2c` | Give the four non-`check()` suites meaningful exit codes | all four fixed; one real measurement defect in `panel.mjs` |
| 9 | `8351247` | `brief-integrity.mjs` | **v08.03 and v08.04 found missing from `CHANGELOG.md`**, recorded |
| 10 | `d8f0492` | Audit the **deployed** rules for the same class | **clean**; one flag (§10.2) |

Per-tranche evidence: `docs/reports/2026-09-17-*` and `2026-09-18-*`, each as `.md` and `.html`.

## 3. Exact final verification state

### 3a. PASS — genuine

| Suite | Result |
|---|---|
| `behaviour.mjs` | **978 pass / 1 fail** (979 checks, 56 sections, runs to the end) |
| `journey-map-contract` | 34 |
| `journey-map-service` | 18 |
| `note-foundation-data-layer` | **95** (47 + 30 P6-D + 18 P5-F/P6-E) |
| `study-note-service` | 32 |
| `study-activity-evidence-store` | 26 |
| `study-activity-evidence-boundary` | 17 |
| `rules-authorisation-executable` | **38 / 0** |
| `brief-integrity` | **8 / 0** |
| `journey-map-boundary` / `study-note-boundary` / `note-foundation-boundary` | 13 / 17 / 30 |
| `firestore-index-requirements` | 8 / 0 — **no new index all session** |
| `rules-deployment-candidate` | 10 / 0 |
| Phase 4 emulator | **53** |
| Phase 5 emulator | **60** |
| Phase 6 emulator | **58 → 60**, and **60/60 against the assembled deployment file** |
| `layout.mjs` | EXIT 0 — `NO LAYOUT REGRESSIONS`, `CHANGED: 0` at all 16 configurations |
| `navcheck.mjs` / `reading.mjs` / `panel.mjs` | EXIT 0 each |
| Translation coverage | **1,803 scanned / 47 missing** — unchanged |

### 3b. Intermittent (22g, archive.org)

**3 checks — `22g` screensaver caption / alt text / poster URL.** This sandbox's proxy blocks `archive.org`. **Proven intermittent inside this session alone:** passed in runs 1, 3, 5, 9, 10, 12, 14; failed in 2, 4, 6, 7, 8, 11, 13 — on identical code. **A green 22g is not evidence either.** Will not occur for the Owner.

### 3c. TLS / sandbox environment

**6 checks across 3 suites**, all one cause: `net::ERR_CERT_AUTHORITY_INVALID`, the sandbox's own TLS interception, tripping every "no page errors" assertion on a page that fetches over HTTPS.

- `behaviour.mjs` 31e — 1
- `quran-word-card-rendered` — 2
- `quran-word-progress-rendered` — 3

**Recorded, not worked around.** `--ignore-certificate-errors` was deliberately not used: it would also hide a real certificate problem. Will not occur for the Owner.

### 3d. Genuine unresolved failures

**NONE.** Every failing check in the final state is 3b or 3c.

## 4. MAP / pending-dependency ledger, item by item

| # | Item | State | Blocked by |
|---|---|---|---|
| 1 | Phase 4 Activity-evidence Rules | READY — VERIFIED | **execution access** (§6) |
| 2 | Phase 5 Note Foundation Rules | READY — VERIFIED | **execution access** |
| 3 | Phase 5 Note Foundation **indexes** | READY — VERIFIED | **execution access** |
| 4 | **P5-D**, the Note editor surface | NOT BUILT, deliberately | items 2+3, and §8 |
| 5 | Guardian approval window | NOT IMPLEMENTED, deliberately | **Owner decision** |
| 6 | Phase 6 folders/placements Rules | READY — VERIFIED | **execution access** |
| 7 | Server-side folder-cycle prevention | RECORDED, not adopted | **Owner decision** (§9) |

**Unchanged by this session.** Items 1, 2, 3 and 6 are the *same* external dependency.

**The write-only sweep is now complete** across all six MAP collections and the deployed rules, and `rules-authorisation-executable.mjs` holds it complete mechanically.

## 5. Phase 4–6 deployment package

- **Owner-facing instructions:** `docs/governance/phase4-6-production-deployment-package-2026-09-17.md`
- **The only file to paste:** `docs/governance/phase4-6-DEPLOYMENT-candidate-2026-09-17.rules` — production + all three phases, **625 added, 0 removed**
- **NEVER paste a `candidate-2026-09-15` file** — those two are self-contained test *extracts*; pasting one replaces the entire live ruleset with a file governing three collections
- **Indexes go BEFORE rules** — rules first would let the new screens ask questions the database then refuses
- **Four indexes**, in two candidate files (3 Phase 5, 1 Phase 6); `firebase.json` untouched and a check asserts it stays that way

**Status: READY — VERIFIED — PENDING EXECUTION ACCESS.**

**The exact remaining dependency:** authenticated Firebase access to the `study-monitoring` project. This sandbox has none — `firebase` reports "Failed to authenticate" and the Rules API returns 403. **Deployment is an Owner Control Gate and is performed through the Firebase Console**, not by a session. This is a bounded technical/access dependency, **not** a design question.

## 6. Phase 4 wiring candidate `7e2931f`

- **Branch:** `claude/phase4-wiring`, at **`7e2931f`** (v08.26)
- **Relationship to `main`:** refreshed against `main` on 17 Sep, **three conflicts already resolved**. It differs from `main` by **exactly the wiring**. Every Rules and index artefact on it is byte-identical to `main`.
- **Do NOT re-cut it from an older base.**
- **Why held:** it wires live Study surfaces to the evidence writer. Until the Phase 4 Rules are deployed, the subcollection has **no rule and is closed to every client**, so every write it makes would be denied — and **I15 requires that denial to reach the user.** Merging it before deployment ships a feature that cannot function and surfaces errors to real readers.
- **Activation condition:** ledger item 1 deployed. Then merge, then verify.

## 7. P5-D (Note editor surface)

**Deliberately NOT built, and that is unchanged.**

Three independent reasons: (a) every write it makes is denied until items 2 **and** 3 are deployed — Rules without indexes leaves the collections authorising queries they cannot execute; (b) it is a real behaviour change requiring a version bump and full layout measurement; (c) ADR-004 defers the exact Note schema/editor.

**The foundation beneath it is complete and verified** — data layer, contracts, services, read and write sides, 95 data-layer assertions, 60 emulator assertions. P5-D is a surface on a finished foundation, not unfinished plumbing.

## 8. Folder-cycle / server-side protection

**THE ONE THING FIRESTORE RULES CANNOT DO HERE:** they cannot prevent a cycle of length two or more. `A → B → A` satisfies every one-hop check, and Rules cannot walk an ancestor chain of unknown length.

- **Enforcement is client-side only.** A determined client can corrupt **its own owner's** tree — never anyone else's; every rule is owner-scoped.
- **Therefore ANY walk of the folder tree must be bounded regardless of what the rules guarantee.** `buildFolderTree()` is the one bounded walk; what makes it cycle-safe is the **direction** of the walk, not its `reached` guard.
- **P6-D strengthened this**: `folderTreeRefusal()` now counts the height of a moved subtree, and `tooDeep` is reported separately from `cyclic`.
- **The server-side fix** (`ancestorIds[]` + `depth`, the shape I12 uses) is **RECORDED, NOT ADOPTED**. Its cost: re-parenting becomes either forbidden or a multi-document rewrite Rules cannot verify.

**Status: Owner decision, unchanged.** The decision is whether to forbid folder moves in exchange for server-enforced acyclicity.

## 9. Newly discovered issues, with evidence

### 9.1 — Two real defects in accepted Phase 6 code *(FIXED, tranche 2)*

1. **`folderTreeRefusal()` allowed a depth-bound breach on re-parent.** It opened `let depth = 2` — correct for a create, which places a leaf; wrong for a move, which carries a subtree. **Evidence:** probe — a folder three levels tall moved under a parent six deep put its deepest descendant at **nine** and the function returned `null`. **Mutation:** reverting the fix kills check J32.
2. **A merely too-deep folder was reported to its author as CYCLIC.** `cyclic` was "not reached and not orphaned", and the walk stops at the cap, so everything below fell in. **Mutation:** dropping the `beyondCap` term kills J29.

These compound: (1) produced the over-deep tree, (2) mislabelled it. Neither was visible from the create path, the only path that existed.

### 9.2 — Deployed-rules audit: one gap *(RECORDED — see §11.B)*

`tenantPeople`'s third `allow update` permits a signed-in person to change **their own `timezone`** and nothing else. Full analysis in §11.B.

Two things from that audit worth not rediscovering:
- **`self-check.js` writing `{ platformAdmin: true }` to `userIndex` is the I10 NEGATIVE PROBE**, designed to be refused; the screen reports a success as *"URGENT"*. A field-set comparison that does not read the surrounding code will call it a defect.
- **`users`'s `hasOnly(['studentIds'])` omits `updatedAt`**, which `updateDocument()` always stamps (I17). Moot while nothing writes that collection — a lost day for whoever first does.

### 9.3 — Harness: a check that had never run *(FIXED, tranche 7)*

`quran-word-progress-model.mjs`'s *"the module exposes NO event-to-state projection"* had an `async` body in a synchronous runner: the assertion threw into an uncaught promise and the case printed PASS every time. It asserts one of **MAP Phase 3's locked distinctions**. Fixed, then mutation-proven before being believed.

### 9.4 — A broken check hiding a real behaviour *(RECONCILED, tranche 7)*

`behaviour.mjs`'s *"3a page did NOT reload"* read `marker === undefined || marker === "kept"`, and the marker is set **before** the switch — so a reload is exactly what makes it `undefined`. It passed precisely in the case it was written to catch. **Evidence:** probe — the marker is set, survives opening the Home menu, and is wiped by the switch with **one main-frame navigation to the same URL**. `prefs.js` documents the reload as deliberate. **Stale assertion, not a defect;** inverted rather than deleted.

### 9.5 — Four suites whose exit codes meant nothing *(FIXED, tranche 8)*

`layout.mjs` exited **1 on unmodified `main`** and **0 for a real geometry change**. `reading.mjs` counted problems and had no `process.exit`. `panel.mjs` had neither counter nor exit code. `navcheck.mjs` was permanently 1 on a pre-existing truncation. All fixed and proven in both directions.

**Plus a real measurement defect:** `panel.mjs`'s `cut: need > w - 22` is true for **any hidden select** (`w = 0`), so off-screen controls were reported as truncated. Fixed at the source.

### 9.6 — Two rounds missing from `CHANGELOG.md` *(RECORDED, tranche 9)*

**v08.03** (`f5c15a9`, Note Foundation transaction gateway) and **v08.04** (`4833b19`, the uninvoked Note Foundation data layer, `app/js/note-foundation.js`) both shipped and both bumped `version.js`. **Every Phase 5/6 round since has extended that file.** Nothing was lost; the log implied they did not happen. The rule written after v07.124–128 did not hold and nothing checked it. **It is checked now.**

### 9.7 — The baselines are honest but they are DEBT

Tolerated **by name**, each list reporting if an entry stops occurring so none can quietly grow: **22** missing `getElementById` targets; **2** nav truncations (English "Operation"/"Bookmark" at 320px); **3** select truncations (§11.A).

---

## 10. Preserved findings — must not regress

1. **`behaviour.mjs` executes through completion.** 978/1, 979 checks, 56 sections. The ten previously-unreachable sections and every stale-test reconciliation in them are load-bearing. **If it stops early again, the debt is everything downstream, not the one failing line — fix it that day.**
2. **`rules-authorisation-executable.mjs`** — 38 checks. No authorisation may sit unexecutable; no data-layer write may sit unauthorised. Both directions, `update` and `create`, derived from the Rules text so a newly authorised field fails the day it is authorised.
3. **`brief-integrity.mjs`** — 8 checks. The brief's three "check every session" instructions are mechanical now.
4. **Every `check()` runner refuses a promise.** All four non-`check()` suites have meaningful exit codes with named baselines.
5. **The crash hid the rot it created** — a region a suite cannot reach is **unverified**, not passing.
6. **Read the failure text and the exit code, never a grep of them.** Four near-misses in one session, each about to become a false finding.

---

## 11. Classification corrections

### A. Tenant-picker truncation — **genuine bounded Owner UI decision**

**Recorded as an Owner decision. No design choice implemented.**

**Evidence:** `panel.mjs`, every viewport — `tenantSelect "Madrasatul Muslimeen (Owner, Prime)" 145px needs 224px`. A real tenant's name is **cut in the picker**. Pre-existing: printed by this suite all along, never counted, and outside the recorded pass claim (which says "no truncated **label**"; labels are clean).

Two smaller ones ride with it: `surahSelect` ("1. Al-Faatiha", 74px in an 89px cell) and `unitTypeSelect`, both tight once the 22px dropdown arrow is allowed for.

**The decision is the Owner's and is bounded**: widen the cell, shorten the option text, or make the full value available without widening. Each has a different cost on the most tightly measured screen in the app. **Nothing was implemented.**

### B. Timezone — **NOT an Owner decision yet; here is what it actually is**

My earlier framing ("where does a timezone control live") was over-reach. The facts:

**Why it exists in the Rules/data contract.** `timezone` is **written automatically at person creation**, in three places, from `Intl.DateTimeFormat().resolvedOptions().timeZone`:

- `app/js/identity.js:102`
- `app/js/invites.js:174`
- `app/js/people.js:82`

So it is real, populated data on every person. The deployed rule's self-update clause exists so a person could **correct** an auto-detected value.

**What consumes it: NOTHING.** Zero reads anywhere in `app/js`. Written on create, read never.

**Does accepted architecture determine a required capability? NO.** `timezone` appears in **no** accepted document — not D1–D13, not any ADR, not the catalogue. Contrast `weekStartsOn`, which has **D7**, sits on the tenant document, and has a **real consumer**: `weekKeyFor()`.

**Does anything need it today? NO — and this is the decisive technical fact.** `weekKeyFor()` buckets by `date.getFullYear()/getMonth()/getDate()` — the **device's local calendar day** — then normalises into UTC for the arithmetic. Week boundaries therefore do **not** depend on the stored field. The Activity week a study event lands in is the calendar day the person is actually living in.

**The smallest unresolved decision — and it is smaller than a UI question:**

> **Is `timezone` intended to be authoritative for anything (week bucketing, or scheduling in Phases 7–8), or is it captured-only provenance?**

- If **captured-only**: nothing is required, the rule's self-update clause is simply unused, that is harmless, **and this flag closes with no work.**
- If **authoritative**: then a correction path is needed *and* `weekKeyFor()`'s device-local behaviour becomes a separate question in its own right.

**No UI invented. No capability proposed.** The next session should put exactly that one question, and not a design.

### C. Phase 4 evidence `request.query.limit` — **NOT an Owner decision; technically derivable, and the answer is: do not amend**

**Audited against Phase 4–6 Rules architecture and the Phase 5/6 bounds.**

**What Phase 5/6 do:** `listIsBounded()` is `request.query.limit <= 100`, applied to `notes`, `noteRevisions`, `noteSources`, `noteFolders`, `notePlacements`.

**Why they need it:** those are **top-level collections**. A `list` is scoped only by the `where` clauses the client supplies, and the rules authorise per document — so without a query bound a client could ask for **every document it is allowed to read**, i.e. a person's entire Note corpus in one request. The bound is what makes the read cost knowable.

**Why Phase 4 is structurally different:** evidence is a **subcollection** at `activity/{tenantId}__{personId}__{weekKey}/evidence`. **The path IS the scope** — one tenant, one person, one week. A client cannot widen it without naming a different parent document, and `allow read` already requires `canRecordFor(tenantId, personId)` per document.

**What accepted architecture actually specifies.** The load-speed contract (Architecture Part 8) says for Activity: **"One document per week" / never "A year at once."** **That bound is already enforced structurally by the subcollection path — it is the bound the architecture specifies.** No accepted document states a per-document cardinality bound *within* a week.

**The cost argument, which is decisive.** The Phase 4 candidate's own header records that a first draft was **refused by expression-budget exhaustion — 11 of 36 assertions** — the identical defect that rejected the earlier Activity candidate, and that three deliberate cost reductions removed it entirely. `allow read` is evaluated **per document** on a list. Adding `listIsBounded()` spends budget in a rule documented as having been engineered down to fit, to buy a constraint no accepted document requires.

**Recommendation for the next Master Architect session: DO NOT amend the deployment candidate.**

1. The scope bound the architecture specifies is already enforced by the path.
2. Symmetry with Phase 5/6 is **not** a reason — the two are structurally different, and copying a solution across a boundary where the problem differs is a mistake this project has recorded before.
3. The client reader already caps itself: `MAX_EVIDENCE_PER_READ = 200`, asking for cap+1 to detect truncation rather than guess.
4. **If** a future round demonstrates a real worst-case week size, the cheaper correct fix is **client-side** (lower the cap), not a Rules amendment to a candidate already in the Owner's package.

**No Owner decision is required. This flag is resolved technically and downgraded from the decision list.**

---

## 12. The three lists, kept separate

### 12a. Genuine Owner decisions

| # | Decision | Notes |
|---|---|---|
| **O1** | **Guardian approval window** (ledger 5) | 30-minute server-expiring, Note-specific approval. Matrix cases GUARD-05/06/07 describe it; no such mechanism exists. Every guardian content edit is denied outright instead — **safer than the accepted design, and recorded rather than faked.** An Owner storage decision. |
| **O2** | **Server-side folder-cycle prevention** (ledger 7) | `ancestorIds[]` + `depth`. Costs the ability to move a folder, or a multi-document rewrite Rules cannot verify. |
| **O3** | **Tenant-picker truncation** (§11.A) | Bounded UI decision. Widen / shorten / reveal. |
| **O4** | **Is `timezone` authoritative, or captured-only?** (§11.B) | One question, not a design. "Captured-only" closes it with no work. |
| **O5** | **A fourth folder `semanticRole`**, and what a Journey Map is *for* | ADR-010 decides the minimum and says so explicitly. |
| **O6** | **P5-D's editor shape** | ADR-004 defers the exact Note schema/editor. Behind O-gates *and* the deployment dependency. |

**Not decisions:** the Phase 4 `request.query.limit` (§11.C — resolved technically) and the restore path for retired links/placements (the Rules permit it; nothing asks for it; no work pending).

### 12b. Technical work — available with no new authority

The write-only/unexecutable sweep is **complete** and now mechanically held. Remaining known technical work:

| | Item |
|---|---|
| T1 | Translate the refusal reason strings (`folderTreeRefusal()` returns reasons, not sentences, precisely so a surface can) — **only when a Phase 6 surface exists**. `too-deep` is new. I11. |
| T2 | Pay down §9.7's baselines (22 ids, 2 nav, 3 select truncations) — each is a real small defect nobody has fixed. |
| T3 | Read `behaviour.mjs`'s newly-reachable sections for checks *wrong about their subject* (as opposed to unable to fail — that class is closed). Unbounded; do it opportunistically. |

### 12c. Environment / access dependencies

| | Item |
|---|---|
| E1 | **Authenticated Firebase access** to `study-monitoring` — gates ledger items 1, 2, 3, 6, and transitively 4 and the wiring merge. **The single biggest unblocker.** |
| E2 | `archive.org` unreachable (§3b) — intermittent, Owner-side fine. |
| E3 | Sandbox TLS interception (§3c) — Owner-side fine. |
| E4 | After any container restart: `npm i playwright@1.56.0` (matches Chromium build 1194 at `/opt/pw-browsers` — do **not** run `playwright install`) and restart `node serve.js` on :8080. |

### 12d. Held deployment / activation actions

| | Action | Released by |
|---|---|---|
| H1 | Deploy **4 indexes**, then the assembled Rules — in that order | E1 |
| H2 | Merge `claude/phase4-wiring` `7e2931f` | H1 (Phase 4 portion) |
| H3 | Build P5-D | H1 + O6 |
| H4 | Build the Journey Map surface | H1 + O5 |

---

## 13. EXACT first execution task for the next session

**If E1 (Firebase access) is supplied — do this, in this order, and nothing else first:**

1. Confirm `main` is at `d8f0492` and the tree is clean.
2. Re-run the three emulator suites against the **assembled deployment file**, not the extracts:
   `RULES_FILE=docs/governance/phase4-6-DEPLOYMENT-candidate-2026-09-17.rules` — expect **53 / 60 / 60**, zero failures.
3. **Deploy the four INDEXES first** (3 from the Phase 5 candidate, 1 from the Phase 6 candidate), per `docs/governance/phase4-6-production-deployment-package-2026-09-17.md`. **Indexes before rules — rules first would let the new screens ask questions the database then refuses.**
4. **Then paste `phase4-6-DEPLOYMENT-candidate-2026-09-17.rules`** — that file only. **Never a `candidate-2026-09-15` file.**
5. Copy the current live rules out **before** pasting.
6. Verify deployment, then **merge `claude/phase4-wiring` at `7e2931f`** — do not re-cut it from an older base.
7. Re-run the full suite set and record the result.

**If E1 is NOT supplied, the first task is instead O4** — put the single timezone question from §11.B to the Owner. It is the cheapest open item, it needs no access, and one of its two answers closes it with no work at all.

**Do not begin any surface (P5-D, Journey Map) before H1.** Every write would be denied, and I15 requires that denial to reach the user.

---

*Master Architect note: this session's ten tranches changed no application behaviour and left the version at 08.25 deliberately. The value delivered is that a suite which had silently stopped running for 70 rounds now runs to completion, four classes of unexecutable accepted decision are closed and mechanically held, and three of the brief's "remember to check this" instructions are now checked by programs. The project's blocking dependency is unchanged and is access, not design.*
