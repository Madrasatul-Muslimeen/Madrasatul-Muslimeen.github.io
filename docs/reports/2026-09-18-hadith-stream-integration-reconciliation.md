# Hadith Stream — Integration Reconciliation

**Date:** 2026-09-18 · **Type:** Coordination / reconciliation only.
**No implementation tranche was begun. No application version was consumed. Nothing was merged, deployed or refactored.**

This answers the six reconciliation tasks. Where the Master Architect's stated baseline
no longer matches the repository, the repository is reported and the difference named.

---

## 1. Actual repository state

Commands: `git fetch origin --prune` · `git rev-parse` · `git status --porcelain` ·
`git rev-list --left-right --count` · `git merge-tree` (non-mutating).

| Fact | Value |
|---|---|
| **`origin/main` SHA** | **`7111e3c975d3cf3fd0bf0c0d7814691edcd5299e`** |
| `origin/main` app version | **`08.27`** |
| Branch | `feature/hadith-study` |
| **HEAD** | **`cd344f44b729d11ca2634ac0b3d40b39d7ccb1a5`** |
| `origin/feature/hadith-study` | **same SHA — local and remote in sync** |
| Branch app version | **`08.29`** |
| Working tree | **CLEAN** (`git status --porcelain` empty) |
| Relationship to `origin/main` | **2 behind, 11 ahead** |
| Merge base | `6758490cf957c646df4945ad52b0cf403cc3cf61` |

### 1.1 `main` HAS MOVED since the stated baseline

The instruction's baseline records `main` at `6758490` / `08.27`. **`main` is now
`7111e3c`, still `08.27`.** Two commits landed, and they are the D14 timezone line:

| SHA | Subject |
|---|---|
| `ff1ae1b546437df3a365cc37b62aaa4bda6eac8b` | D14: the timezone foundation as an unreachable candidate, and measured layout options |
| `7111e3c975d3cf3fd0bf0c0d7814691edcd5299e` | D14: write the contract's own payloads through the candidate Rules |

**Verified against the stated Quran baseline, and it holds:** D14 **did not bump the
version** (`git diff 6758490 origin/main -- app/js/version.js` is empty, so `main`
remains 08.27); it **did not touch** `firestore.rules` or `firebase.json`; and it is
**unreachable** — no page or module imports `timezone-contract.js` or
`timezone-service.js`. Phase 4 wiring `7e2931f` remains unmerged and untouched.

### 1.2 Commit graph — all 11 branch commits, each identified

Listed oldest first. `%p` shows parents, so the two merges are visible as such.

| # | SHA | Parent(s) | Role |
|---|---|---|---|
| 1 | `c6368ce` | `d8f0492` (main) | H0 — read-only contract and file-ownership audit |
| 2 | `ec0da4c` | `c6368ce` | H0 — stale-ref correction, Owner decisions recorded |
| 3 | `ad31759` | `ec0da4c` | H1 — source manifests, fail-closed rights gate, reference schema |
| 4 | `aef6cf3` | `ad31759`, `1cac2b8` | **Merge** of `origin/main` (first base refresh) |
| 5 | **`c7ee03e`** | `aef6cf3` | **H2-A — the application.** The synthetic corpus pilot, fixtures only |
| 6 | **`8051c85`** | `c7ee03e` | **H2-A — the report only.** Two `docs/reports/` files, no app code |
| 7 | `70edba3` | `8051c85` | H2-A reconciliation report (documentation only) |
| 8 | `85c35cf` | `70edba3`, `6758490` | **Merge** of `origin/main` before Stage A |
| 9 | **`7f61328`** | `85c35cf` | **Stage A** — synthetic-namespace correction |
| 10 | **`22526b2`** | `7f61328` | **Stage B** — corpus integration, registry proposal, Explore |
| 11 | **`cd344f4`** | `22526b2` | Stage B report SHA fill-in (report `.md`/`.html` only) |

**No unidentified commit remains.** The two merges are base refreshes onto `main`,
never merges *to* `main`.

**The `c7ee03e` / `8051c85` relationship, as previously reconciled and re-verified:**
parent and child, two minutes apart; `git diff c7ee03e 8051c85 -- app/ tools/
firestore.rules` is **empty**. The tested application is `c7ee03e`; `8051c85` is that
same code plus its report.

### 1.3 Which commits carry which version — read from each tree

| Version | Carried by | Note |
|---|---|---|
| `08.25` | `c6368ce`, `ec0da4c`, `ad31759`, `aef6cf3` | pre-H2-A |
| **`08.27`** | `c7ee03e`, `8051c85`, `70edba3`, `85c35cf` | **the collision period** — `main` later took 08.27 as well |
| **`08.28`** | **`7f61328` only** | **Stage A** |
| **`08.29`** | **`22526b2` and `cd344f4`** (current HEAD) | **Stage B** |

**The 08.27 collision is a matter of record, not a claim.** The H2-A commits reserved
08.27 while `main` was on 08.25; `main` then merged 08.26 and shipped its own 08.27.
Stage A moved the branch to 08.28 and Stage B to 08.29, each checked free across all
remote branches at the time of the bump. **`08.30` onward is untouched by this stream.**

---

## 2. Hadith stream integration inventory

Fourteen files changed across Stage A and Stage B (`git diff --name-status 85c35cf
cd344f4`). Classification is evidenced by who consumes each file, not asserted.

### A — Hadith-domain-owned (9)

| File | Stage | Evidence of sole ownership |
|---|---|---|
| `app/js/hadith-fixture-data.js` | A | Imported only by Hadith modules |
| `app/js/hadith-corpus.js` | B | Imported only by Hadith modules |
| `app/js/hadith-browser.js` | A, B | Imported only by `hadith-collections.html` and `hadith-study.html` |
| `app/js/hadith-commentary.js` | *(unchanged this round)* | Listed for completeness; Hadith-only |
| `app/css/hadith.css` | B (**new**) | Linked by exactly two pages, both Hadith |
| `app/hadith-collections.html` | B | The standalone Hadith route |
| `app/hadith-study.html` | B | The Hadith module page |
| `docs/governance/hadith-approach-registry-PROPOSAL-2026-09-18.md` | B (new) | Hadith governance |
| `docs/reports/2026-09-18-hadith-stageA-…-implementation.{md,html}` | B (new) | Hadith reports (counted as one row) |

**`app/hadith-study.html` is Hadith-domain-owned but platform-adjacent**, and this is
the one worth stating plainly: it *consumes* the shared renderer
(`import { initTopicStudyPage } from "./js/topic-study.js"`) and now also mounts the
Hadith corpus. **`topic-study.js` itself is byte-identical to `origin/main`** and was
not modified.

### B — QuranRevival platform / shared (3)

| File | Stage | Change | Shared with |
|---|---|---|---|
| `app/js/version.js` | A, B | 08.27 → 08.28 → 08.29 | **The whole platform.** Single source of truth; four surfaces import it |
| `app/js/i18n/bn.js` | B | **21 insertions, 0 deletions** — purely additive | The platform Bangla catalogue |
| `CLAUDE.md` | A | The **Hadith-owned block** updated; the Quran-owned milestone line untouched | The standing brief |

### C — Deployment / security shared (0)

**Nothing in this class was touched.** `firestore.rules`, `firebase.json`, every Rules
and index candidate, `catalogue.js` and `catalogue-data.js` are **byte-identical to
`origin/main`**, verified by `git diff --quiet`.

### D — Test / verification shared (2)

| File | Stage | Change | Shared with |
|---|---|---|---|
| `tools/i18n-verify/hadith-corpus.mjs` | A, B | +7 checks (26 → 33) | **Hadith-only suite**; shared *location*, not shared *subject* |
| **`tools/i18n-verify/behaviour.mjs`** | B | **+27 / −5** | **ALL modules** — 20 pages in `NAV_PAGES`. Re-audited in §4 |

### 2.1 The coupling direction, measured

**Zero platform files import any Hadith module.** A grep for
`(import|from) … hadith-(browser|corpus|fixture-data|commentary)` outside `app/hadith-*`
returns nothing. Six platform files mention the string `hadith-`, and none is an import:
`nav.js`, `topic-study.js` and `continue-strip.js` reference the **URL**
`hadith-study.html`; `study-note-binding.js` carries the ADR-009 `hadith-unit`
`sourceKind`; `asma-renderer.js` and `asma-ref-parser.js` use an unrelated `hadith-text`
token.

**The Hadith stream's runtime dependency on the platform is one-way** — Hadith imports
platform (`topic-study.js`, `i18n.js`), and the platform does not import Hadith. That is
what makes the stream independently removable today.

---

## 3. Reconciliation against current Quran work

**Method:** the merge base is `6758490`. Files changed on each side since then were
compared, and the merge was tested **without performing it** (`git merge-tree
--write-tree`, which writes no ref and leaves HEAD and the working tree untouched —
re-verified clean afterwards).

**Files changed on `main` since the merge base:** `CHANGELOG.md`, `CLAUDE.md`,
`app/js/timezone-contract.js`, `app/js/timezone-service.js`,
`docs/governance/d14-timezone-tenantpeople-rules-candidate-2026-09-18.rules`, three
`docs/reports/` files, `tools/firestore-emulator/d14-timezone.{firebase.json,rules.test.mjs}`,
`tools/i18n-verify/d14-timezone-{boundary,contract}.mjs`,
`tools/i18n-verify/select-layout-options.mjs`.

**Intersection with the Hadith stream's 14 files: exactly one — `CLAUDE.md`.**

| FILE | HADITH CHANGE | QURAN USE / CHANGE | COLLISION TYPE | STAGE B SAFELY ISOLATED? | REQUIRED INTEGRATION ACTION |
|---|---|---|---|---|---|
| `CLAUDE.md` | Hadith-owned block rewritten (versions, namespace rule, gate status). Milestone line **untouched** | D14 entry added, milestone/brief text edited by the Quran side | **Same file, disjoint regions** | **YES** — `git merge-tree` reports **no conflict** | At merge: take both. Re-run `brief-integrity` on the merged result |
| `app/js/version.js` | 08.28 → 08.29 | `main` stays 08.27; D14 did **not** bump | **Sequence, not conflict** — resolved before it landed | **YES** | At merge: branch version wins (08.29). `08.30+` stays unallocated |
| `app/js/i18n/bn.js` | +21 keys, 0 deletions | **Not changed by D14** | **None today.** Latent append-point collision if both sides add keys | **YES** | At merge: additive union. Assert 0 deletions and no duplicate keys |
| `tools/i18n-verify/behaviour.mjs` | +27 / −5, two exclusion lists | **Not changed by D14** | **None today.** Shared infrastructure, so a latent collision class | **YES** | §4 decision; re-run the suite on the merged result |
| `firestore.rules`, `firebase.json` | **Untouched** | **Untouched by D14** (candidate is a separate file) | **None** | YES | None |
| `app/js/topic-study.js` | **Untouched** | Not changed by D14 | **None** | YES | None |
| `app/js/catalogue.js`, `catalogue-data.js` | **Untouched** (no Approach ID minted) | Not changed by D14 | **None** | YES | None |
| `app/js/timezone-{contract,service}.js` | **Not referenced by Hadith** | New, **unreachable** on `main` | **None** | YES | None while D14 stays unreachable |
| `CHANGELOG.md` | **Not edited from Hadith**, deliberately | D14 entry added | **None today** | YES | **Merge-time obligation:** the Hadith rounds owe changelog entries, written by their owner |
| `app/js/study-note-binding.js` — the `hadith:` unit-key regex | **Untouched** | Platform-owned contract naming `hadith` | **None** | YES | None until a permanent Hadith key is adopted — a closed gate |

**Overall:** **Stage B can remain isolated safely.** One shared file overlaps, in
disjoint regions, and a non-mutating merge test reports no conflict. Nothing was merged.

**UNAVAILABLE:** the *deployed* Firebase state for either stream (§6), and any Quran
work that exists outside this repository or on unfetched refs.

---

## 4. Re-audit — the Stage B shared edit to `tools/i18n-verify/behaviour.mjs`

### 4.1 Exact diff

**+27 / −5 lines**, in two places, both inside the `anyBangla` helper of a
language-leak check. The functional change is **one token added to each of two
`querySelectorAll` arguments**; everything else is comment.

Before (both sites):
`clone.querySelectorAll("#navAppLangSelect, #trBnControl, #wbwLangSelect, script, style")`

After (both sites):
`clone.querySelectorAll("#navAppLangSelect, #trBnControl, #wbwLangSelect, #hadithContentLang, #hadithSyntheticBanner, script, style")`

The two sites are the check at section 1 (`no Bangla leaked into an English page`,
run over every page in `NAV_PAGES`) and at section 3 (`3b no Bangla left anywhere`,
the language round-trip).

### 4.2 Why the exclusion is necessary

`app/hadith-study.html` **is** in `NAV_PAGES`; the standalone `hadith-collections.html`
is not. Mounting the corpus therefore brought it under a check it had never faced.

The failure is a genuine clash between two correct requirements, not a stale assertion:
the synthetic notice **must** print "these are not real narrations" in Arabic, English
**and** Bangla, on every page, in every UI language, always — a reader of any one of the
three must be able to tell the corpus is invented without first changing their language
setting. That is a **non-negotiable safety gate**, so the Bangla text is required, and a
check reading it as a translation leak is reading it wrongly.

`#hadithContentLang` is the corpus's **content-language picker**; it names each language
in that language's own script, exactly as the three already-excluded pickers do.

### 4.3 Hadith-specific, or a reusable cross-module rule?

**Neither cleanly, and that is the honest answer.** The *rule* is general — "an element
that deliberately carries more than one script is not a translation leak" — and it is
already general in practice: `#navAppLangSelect` is platform, `#trBnControl` and
`#wbwLangSelect` are Quran, and now two are Hadith. **The mechanism, however, is
module-specific accumulation**: a hand-maintained id list that has grown 3 → 5 and will
grow again with the next module.

So this edit **does not establish** a reusable rule; it **extends an existing
module-specific list**, following the precedent already set in that file, with the
reason recorded in place.

### 4.4 Can the same result be achieved without module-specific accumulation?

**Yes in principle, and the shape is clear — but not with the convention that exists.**

The codebase already has a declarative i18n opt-out, `[data-i18n-skip]`, honoured by
`translateStatic()` in `app/js/i18n.js`. **It is the wrong contract for this**, and
reusing it would conflate two different meanings: `data-i18n-skip` means *"do not
translate this"* (its own comment says it is for tenant-authored text or scripture),
whereas what this check needs is *"this deliberately carries several scripts"*. An
element can need one without the other. **None of the five excluded elements carries
`data-i18n-skip` today**, so the alternative is not already available.

The clean form would be a **new declarative attribute** — say `data-i18n-multilingual`
— set by each module on its own element, with the shared check excluding
`[data-i18n-multilingual]` and holding **no module ids at all**. That is strictly better
and removes the accumulation permanently.

**It is also itself a shared-infrastructure change**, touching `behaviour.mjs` plus five
elements across three modules (platform, Quran, Hadith) — so it is **not** something the
Hadith stream may take unilaterally. **Raised, not done**, and a SHARED CHANGE REQUEST is
filed in §7.

### 4.5 A cosmetic defect in the edit, reported and NOT fixed

At the **first** of the two sites, three comment lines sit at 6-space indentation among
8-space neighbours, and one sentence is split awkwardly ("joins for the / same reason and
a / stronger one:"). It is **comment-only, with zero behavioural effect** — the second
site is correctly indented — and it came from a scripted edit. **Left in place**, because
the instruction is not to refactor this file without separate authorisation. Listed so it
is not discovered later as an unexplained oddity.

### 4.6 Regression evidence

**Fresh at HEAD, this session:** 13 pure suites, **243 passed / 0 failed, every one exit
0** — `hadith-source-rights` 14, `hadith-corpus` 33, `hadith-commentary-binding` 14,
`quran-boundary` 30, `study-approach-contract-boundary` 16,
`study-activity-evidence-boundary` 17, `note-foundation-boundary` 30,
`study-note-boundary` 17, `journey-map-boundary` 13, `firestore-index-requirements` 8,
`rules-authorisation-executable` 38, `rules-deployment-candidate` 10, `stub-parity` 3.

**`behaviour.mjs`: 978 passed / 4 failed / 56 sections = 982 checks**, the same total
`main` itself records, all four failures environmental (archive.org ×3, which the brief
records as *intermittent*; and one sandbox TLS artefact). Measured on the tree of
`22526b2`; **`git diff --stat 22526b2 cd344f4 -- app/ tools/` is empty**, so that
evidence applies exactly to current HEAD. It has **not** been re-run in this container —
the restart removed the browser tooling, and the tree is unchanged, so a re-run would
re-measure an identical tree.

**The exclusion was proven not to blind the check**, both ways: a deliberate Bangla
paragraph seeded into `app/hadith-study.html` **is still detected**, and the clean page
passes. A first, narrower attempt (banner only) was **insufficient** — the clean page
still reported a leak — and rather than widening the exclusion the second source was
located and named. Excluded **by element, never by page**.

---

## 5. Gate status — every Hadith gate CLOSED

| Gate | Status | Evidence |
|---|---|---|
| Real corpus / translation / commentary embedding | **CLOSED** | `hadith-source-rights` 14/0; zero editions rights-cleared; nothing fetched, cached or embedded |
| Permanent Hadith semantic key adoption | **CLOSED** | `study-note-binding.js` byte-identical to `origin/main`; proposal only; live inventory still unobtainable |
| Approach ID allocation | **CLOSED** | `catalogue.js` and `catalogue-data.js` byte-identical to `origin/main`; registry is a proposal with no id minted |
| Durable Track | **CLOSED** | No `setDoc`/`updateDoc`/`addDoc`/`runTransaction`/`writeBatch` anywhere in `app/js/hadith-*.js` |
| Notes / MMJ persistence | **CLOSED** | Not built; collections unruled |
| Rules / index deployment | **CLOSED** | `firestore.rules`, `firebase.json` untouched; no `firestore.indexes.json` |
| Migration | **CLOSED** | None attempted |
| Merge | **CLOSED** | Branch 2 behind / 11 ahead; nothing merged to `main` |
| Deployment | **CLOSED** | Nothing deployed |
| Application version consumption | **CLOSED** | No version consumed by this reconciliation; `08.30+` unallocated |

---

## 6. Firestore Rules — repository evidence and deployment evidence, stated separately

### 6.1 REPOSITORY evidence — what inspecting the file proves

`firestore.rules` in this branch is **byte-identical to `origin/main`**
(`git diff --quiet` passes); sha256 begins `8fd7f52b2a7c9097`; it contains **0**
occurrences of any `hadith` collection; `firebase.json` is likewise identical and
carries no `indexes` key; **no `firestore.indexes.json` exists.**

**This proves repository Rules content, and nothing more.**

### 6.2 DEPLOYMENT evidence — separately, and it is absent

| Probe | Result |
|---|---|
| `firebase` CLI | **not installed** |
| `gcloud` | **not installed** |
| Credential environment variables | **none set** |
| Firebase Rules API, unauthenticated | **HTTP 403 — PERMISSION_DENIED**, *"Method doesn't allow unregistered callers (callers without established identity)"* |

### **DEPLOYMENT STATUS UNVERIFIED.**

The currently deployed ruleset for `study-monitoring` **has not been inspected and
cannot be inspected from this environment.** No statement in any Hadith report should be
read as evidence about deployed Rules. **No inference — of success or of failure — may
be drawn about a production write from repository content.** This tightens the
persistence gates rather than relaxing them: because deployment is unverified, no
Hadith, Note, MMJ or Track production write is attempted, and none exists.

---

## 7. SHARED CHANGE REQUEST — raised, not taken

Filed under the new Shared Change Rule. **Nothing has been done to these files.**

**SHARED CHANGE REQUEST 01 — retire the module-id accumulation in the language-leak check**

- **File:** `tools/i18n-verify/behaviour.mjs`, plus one attribute on five elements across
  `app/js/nav.js` / the app-language control, the Quran translation and word-by-word
  pickers, and the two Hadith elements.
- **Current owner / use:** shared verification infrastructure; the check runs over 20
  pages spanning every module.
- **Required change:** replace the hand-maintained id list with a declarative
  `data-i18n-multilingual` attribute (name for the Master Architect to settle), each
  module marking its own element; the shared check then holds no module ids.
- **Reason:** the list has grown 3 → 5 and will grow with every module that ships a
  language picker or a multi-script notice. `[data-i18n-skip]` already exists but means
  *"do not translate"*, a different contract, so it cannot be reused without conflating
  the two.
- **Expected blast radius:** BR-1/BR-2 — one shared test file, five markup/DOM sites, no
  application behaviour. Needs the full `behaviour.mjs` suite plus a positive control
  proving a real leak is still caught.
- **Other module potentially affected:** **platform** (app-language control), **Quran**
  (translation and word-by-word pickers), **Hadith** (banner and content-language
  picker). Requires the Quran stream's agreement.

**SHARED CHANGE REQUEST 02 — `CHANGELOG.md` entries for the Hadith rounds**

- **File:** `CHANGELOG.md`.
- **Current owner / use:** Quran / `main` side; the project rule is that a round reaching
  the brief is appended here first.
- **Required change:** entries for v08.28 and v08.29.
- **Reason:** the rule exists so a round cannot live only in the brief; these two do.
- **Expected blast radius:** BR-0, documentation only.
- **Other module potentially affected:** none. Deliberately **not** written from Hadith.

**Also standing, for the Quran / shared-file owner:** `brief-integrity` is **7 passed /
1 failed** on this branch and **8 / 0 on `main`**. The failure is the milestone line's
version against the working tree's. `main`'s upgraded guard accepts a milestone line that
names the branch *and* states main's own version — **that line is the Quran side's to
write**, and it has deliberately not been rewritten from here.

---

## 8. Next safe Hadith work

**None is begun, and none should be until the Master Architect rules.** What is
*available* without crossing a gate or a shared file, for the Master Architect to select
from rather than for this stream to choose:

1. **Nothing at all** — hold pending audit of Stage A/B. This is the default.
2. **Documentation / governance only** (BR-0, no version bump): expanding the Approach
   registry proposal's decision set, or a Hadith-only rights-register review.
3. **Hadith-domain-only code** touching no shared file and consuming no version beyond a
   Master-Architect-allocated one.

**Blockers, unchanged:** rights clearance for any real edition; a live read-only inventory
of existing `hadith:` records before any permanent key; an Approach-registry decision
before any id; authenticated Firebase access before any Rules or index deployment; and
Master Architect acceptance of Stage A/B before the next tranche.

---

## HADITH_STREAM_STATE

The block below is one `KEY=value` per line, blank-separated so that each key
survives as its own line in the HTML rendering as well as the Markdown.

MAIN_SHA=7111e3c975d3cf3fd0bf0c0d7814691edcd5299e

MAIN_VERSION=08.27

BRANCH=feature/hadith-study

HEAD=cd344f44b729d11ca2634ac0b3d40b39d7ccb1a5

AHEAD_BEHIND=ahead 11, behind 2 (merge base 6758490cf957c646df4945ad52b0cf403cc3cf61; git merge-tree reports NO CONFLICT)

H2A_SHA_CHAIN=c7ee03ef957a191ae195977623972e32f6a366a5 (app code, tested) -> 8051c85c8db5d00a0fd8d54ae2ff4215b9d66e4e (report only; app/ tools/ firestore.rules diff EMPTY) -> 70edba3 (reconciliation report) -> 85c35cf (merge origin/main) -> 7f61328 -> 22526b2 -> cd344f4

STAGE_A_SHA=7f6132888bc02728e07e2214b5a8d6323708e00a

STAGE_A_VERSION=08.28

STAGE_B_SHA=22526b20da1e1fe950992957aa2862e65b3cf925

STAGE_B_VERSION=08.29

SHARED_FILES=app/js/version.js (B: platform); app/js/i18n/bn.js (B: platform, +21/-0 additive); CLAUDE.md (B: brief, Hadith-owned block only); tools/i18n-verify/behaviour.mjs (D: shared verification, +27/-5, two element ids added to an existing exclusion list). NONE in class C (deployment/security) — firestore.rules, firebase.json, catalogue.js, catalogue-data.js, topic-study.js, study-note-binding.js all byte-identical to origin/main

QURAN_OVERLAPS=CLAUDE.md ONLY (disjoint regions, merge-tree clean). D14 (ff1ae1b, 7111e3c) is all-new files, unreachable, no version bump, no Rules change. Zero platform files import any Hadith module; coupling is one-way

RULES_REPOSITORY_STATUS=UNCHANGED — firestore.rules byte-identical to origin/main (sha256 8fd7f52b2a7c9097...), 0 hadith collections, firebase.json has no indexes key, no firestore.indexes.json

RULES_DEPLOYMENT_STATUS=UNVERIFIED — no firebase CLI, no gcloud, no credentials, Rules API returns HTTP 403 PERMISSION_DENIED (unregistered caller). Deployed ruleset not inspected and not inspectable from this environment

NEXT_SAFE_HADITH_WORK=NONE BEGUN. Awaiting Master Architect ruling on Stage A/B. Available without crossing a gate: hold (default); documentation/governance only (BR-0, no version bump); or Hadith-domain-only code on a Master-Architect-allocated version. 08.30+ remains UNALLOCATED and unconsumed

BLOCKERS=Master Architect acceptance of Stage A/B; rights clearance for any real edition; live read-only inventory of existing hadith: records before any permanent key; Approach-registry decision before any ID; authenticated Firebase access before any Rules/index deployment; SHARED CHANGE REQUEST 01 (behaviour.mjs id accumulation) and 02 (CHANGELOG.md entries) both require owner agreement
