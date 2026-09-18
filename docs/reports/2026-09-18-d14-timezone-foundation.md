# D14 timezone foundation, and measured layout options for three selects

- **Date:** 2026-09-18
- **Branch / base:** `main` at **`6758490cf957c646df4945ad52b0cf403cc3cf61`** (v08.27), clean tree
- **Blast radius:** **BR-0.** Two NEW `app/js` modules, unreachable from any page; one NEW Rules candidate in its own file; four new tools files. **No existing application file was modified** — `git status -- app/` shows two untracked additions and nothing else.
- **Application version:** **08.27, unchanged.** Nothing a person can reach changed.
- **Result:** ACCEPT. D14 represented, tested and audited against the Rules it needs; three layout remedies measured and **none chosen**.

> **Held, as instructed:** Phase 4 wiring `7e2931f` untouched. Nothing deployed. `firestore.rules`, `firebase.json` and the assembled Phase 4–6 deployment candidate all byte-identical — each asserted by a check, not by assertion in prose.

---

## 1. What D14 asks for, and why it needs new fields

> **D14:** automatic capture is the DEFAULT, and a person may choose a LOCATION which determines their timezone until they change it or return to automatic detection.

D14 recorded three findings and all three are load-bearing:

1. **The decision cannot be represented by the field that exists.** `timezone` is one string, so auto-detected `Asia/Dhaka` and hand-chosen `Asia/Dhaka` are indistinguishable. Re-detecting at each login silently overwrites a deliberate choice; never re-detecting silently freezes an auto value when the person travels. **A mode is the missing fact, not a second value.**
2. **The deployed Rules authorise `timezone` and `updatedAt` and nothing else.**
3. **A location is not a timezone** — it *determines* one.

## 2. The representation

Three fields on `tenantPeople`:

| field | automatic | a chosen location |
|---|---|---|
| `timezone` | the detected IANA zone | the **resolved** IANA zone of the chosen location |
| `timezoneMode` | `"auto"` (or **absent** — every pre-D14 record) | `"manual"` |
| `timezoneLocation` | **`null`, written explicitly** | the chosen location label |

**`timezone` keeps its existing name and meaning, and that is the point of the shape.** It is the authoritative resolved zone in *both* modes, so anything that reads a person's timezone reads one field and never needs to know the mode. **The mode governs who may change it, not what it means.**

**An absent mode reads as `auto`, and that is derived rather than chosen.** Every record written before D14 carries a zone captured automatically at creation and no mode, and D14 says automatic capture is the default — so the existing corpus already *is* auto and **nothing needs backfilling.**

**`timezoneLocation` is written `null`, never omitted.** Omitting it would leave a previous choice's label beside a mode that says auto — the stale-label state that makes "return to automatic" a lie. Writing null is what erases it.

### The two behaviours the Owner named

Both are one function, `reconcileOnSignIn()`, seen from two sides:

- **A manual choice survives every sign-in.** Manual mode returns `keep` whatever the device reports — tested against five different device zones including nonsense and `null`.
- **Automatic follows the device.** Auto mode returns a write when the detected zone differs, so a person who travels is not frozen at the zone they signed up in.

Three further states fall out and are tested: a pre-D14 record gains its mode **without its zone moving**; a `migrate.html` record (`timezone: null`) adopts the detected zone; and an **unreadable device zone writes nothing rather than guessing** — a browser that will not report its zone is not evidence that the person moved.

## 3. The Rules audit, done with the data layer rather than after it

`docs/governance/d14-timezone-tenantpeople-rules-candidate-2026-09-18.rules` — **its own file, so nothing this tranche does can change what a Phase 4–6 deployment would apply.** Every read clause, both create clauses and the two non-self update clauses are reproduced **byte-for-byte** from the deployed ruleset; a check diffs them.

Two decisions worth stating:

**The mode and the location must agree, and the server is where that is true.** A client that sets `auto` while leaving a location behind produces a document whose own fields contradict each other. Enforced in the Rules *and* in the contract — neither side is the only guard.

**The validator is applied to all three update clauses, but conditionally.** The admin and guardian clauses have never validated any field of this document, and giving `tenantPeople` a full shape contract would risk denying existing legitimate writes this tranche cannot enumerate. So `timezoneWellFormed()` returns true when the write does not touch the timezone fields: those two clauses behave exactly as deployed, and a write that *does* touch them must be well-formed whoever makes it. **Mutation-proven:** removing it from the admin clause alone fails `TZ-16` and nothing else.

### Tested against the ruleset activation would produce, not against the extract

The candidate calls `canAdminIdentity`, `isGuardianOf`, `myUid` and five other helpers that live in the deployed file. **An extract tested alone proves only that a file parses.** So the suite substitutes the candidate's block into `firestore.rules` in memory and runs *that* — asserting the substitution happened, and asserting the assembled ruleset differs from the deployed one **nowhere except that block**.

**22 assertions, 0 failures.** Three mutations, each printing its occurrence count first:

| Mutation | Killed |
|---|---|
| drop the `auto ⇒ no location` clause | TZ-04, TZ-16 |
| drop the `manual ⇒ location + zone` clause | TZ-05, TZ-06, TZ-20 |
| drop `timezoneWellFormed()` from the **admin** clause only | TZ-16 |

### Two of my own test errors, found and corrected

- **TZ-12** wrote `roles: ["owner"]` — the value the fixture already had. `diff().affectedKeys()` lists only keys whose value **changed**, so `hasOnly` never saw it and the case proved nothing. **A smuggled field has to actually differ to be smuggled.**
- **TZ-20** asserted "manual with no zone is refused" against a record **TZ-19 had just given a zone**. A case whose premise an earlier case destroyed tests nothing. It has its own record now.

I also suspected a live defect in `isGuardianOf` — that `myPersonIdIn` returning `null` would match any person whose `managedByPersonId` is null. **Reading it disproved that**: it requires `isGuardianIn()`, which needs a membership document the fixture lacked. Recorded because the next person to see that shape will suspect the same thing.

## 4. Held unreachable, and proven so

`app/js/timezone-contract.js` (pure, **imports nothing at all**) and `app/js/timezone-service.js` (the data layer). **10 boundary checks, 0 failures**, including a positive control so the walker cannot pass vacuously.

**Week bucketing is untouched by construction, not by intention.** D14 records that `weekKeyFor()` buckets by the *device's* local calendar day and that honouring a stored zone there would change which week live records land in. The boundary walks the import graph **forward** from both modules and asserts `activity.js` is not in it at any depth, and that neither names `weekKeyFor`, `chunkKey`, `claimStatus` or `bulkConfirmWeek` outside a comment.

Mutation-proven both ways: importing the service into `records.js` fails the unreachability check **naming the chain** (`app/admin-self-check.html -> self-check.js -> records.js -> timezone-service.js`); importing `activity.js` into the service fails the week-bucketing check.

Also asserted: the three live `timezone` write sites still write exactly what they wrote before, no page names either module or any of the new fields, and **no reachable setting was added**.

---

## 5. Measured layout options — for the Owner to choose

v08.27 named three remedies for `surahSelect`, `unitTypeSelect` and `tenantSelect` and **costed none of them**. `tools/i18n-verify/select-layout-options.mjs` applies each to a live copy of the page, measures, and reverts. **It changes no file and picks no winner.**

Method is v08.27's corrected one: the dropdown arrow measured from a probe carrying the control's own computed font, padding and border, and the requirement taken as the **longest option**.

### As-is, English — what each control needs and gets (px)

| width | `surahSelect` | `unitTypeSelect` | `tenantSelect` |
|---|---|---|---|
| 320 | **46 short** | **26 short** | **129 short** |
| 360 | **26 short** | **6 short** | **109 short** |
| 390 | **11 short** | fits (−9) | **94 short** |
| 412 | exactly 0 | fits (−20) | **83 short** |

Longest options: `"63. Al-Munaafiqoon"` 113px, `"Range of Ayahs"` 93px, `"Madrasatul Muslimeen (Owner, Prime)"` 224px. Bangla is shorter throughout, so **English at 320px is the governing case**.

### The candidates, shortfall after each (negative = fits)

**English, 320px** — the hardest case:

| candidate | surah | unitType | tenant | panel content | vertical cost |
|---|---|---|---|---|---|
| as-is | 46 | 26 | 129 | 974px | — |
| **B** type −1px | 38 | 19 | 112 | 974px | none |
| **B** type −2px | 29 | 12 | 95 | 974px | none |
| **A** wrap the units row | 18 | **−2** | 129 | 1026px | **+52px** |
| **D** tenant its own row | 46 | 26 | **−3** | 1026px | **+52px** |
| **A+D** | 18 | **−2** | **−3** | 1077px | **+103px** |
| **C** shorten the text | 25 | 9 | 37 | 974px | none (wording) |
| **A+D+C** | **−3** | **−19** | **−95** | 1077px | **+103px** + wording |

**English, 360px:** A+D fits unitType and tenant and leaves surah 2px short; A+D+C fits all three with room.
**Bangla, 320px:** as-is is 28 / −2 / 61; A+D reaches 0 / −30 / −70; A+D+C reaches −23 / −43 / −139.

### What the numbers say, without choosing

- **Shrinking the type cannot fix `tenantSelect`.** Two pixels of type buys 34px against a 129px shortfall.
- **`tenantSelect` is a container problem, not a content one.** Giving it its own row fixes it outright at every width and in both languages — and it already fits on `people.html`, where it gets 272px.
- **`surahSelect` is the stubborn one.** Only the content remedy moves it enough at 320px; every layout remedy leaves it short there.
- **No single remedy fits all three at 320px. Only A+D+C does**, at +103px of panel height and a user-visible wording change in **both** languages (I11).
- The panel **does not scroll** in any candidate, so the vertical cost is headroom spent, not content hidden.

**Three questions, and they are the Owner's:**

1. Is +103px of Study-options height acceptable to make the panel fit at 320px?
2. May the tenant picker drop its role suffix — showing `Madrasatul Muslimeen` rather than `Madrasatul Muslimeen (Owner, Prime)`?
3. May `Range of Ayahs` become `Range`, and surah names lose their leading number, in **both** languages?

**Nothing was implemented. `app/` is untouched.**

### Three defects in my own measurement script, found before any number was presented

Worth recording, because each would have produced a confident wrong table:

- **`font-size: calc(1em - 1px)` made the type BIGGER.** `1em` resolves against the *parent*; these selects render at 13.1px inside a 16px parent, so every shortfall grew. The tell was a remedy making things worse. Now applied as absolute px derived from the measured computed size.
- **`D-tenant-own-row` did nothing** — it used `flex-wrap`, and `.opt-bar` is a **grid** (`grid-template-columns: repeat(4, minmax(0,1fr))`). It reported 129px short at every width, identical to as-is, which is what gave it away. Now `grid-column: 1 / -1`.
- **`C` was measured on top of `A+D`** — the stylesheet was never removed before the content loop, so C appeared to fix all three partly on A+D's credit. **A candidate measured on top of another candidate is not a measurement of either.**

---

## 6. Verification

| | |
|---|---|
| `d14-timezone-contract.mjs` | **21 / 0** |
| `d14-timezone-boundary.mjs` | **10 / 0**, 2 / 2 mutations caught |
| `d14-timezone.rules.test.mjs` (emulator) | **22 / 0**, 3 / 3 mutations caught |
| Every other pure suite | unchanged and green |
| Translation coverage | **1,803 / 47** — unchanged, no new user-visible string |
| `firestore.rules`, `firebase.json`, assembled Phase 4–6 candidate | **byte-identical**, each asserted |
| `git status -- app/` | two untracked additions, **no modifications** |

The only non-zero exits in the whole sweep are `quran-word-card-rendered` (2) and `quran-word-progress-rendered` (3) — all five the sandbox's `ERR_CERT_AUTHORITY_INVALID` TLS artefact, unchanged and environmental.

## 7. Remaining gates

| Gate | What it blocks |
|---|---|
| **Firebase execution access** | deploying the D14 tenantPeople candidate, and Phases 4–6 |
| **Owner: the three layout questions** (§5) | any change to the three selects |
| **Owner: where a person chooses a location** | a reachable timezone setting — deliberately not designed here |
| **Owner: does anything HONOUR the stored zone?** | D14 stores an authoritative zone; `weekKeyFor()` still buckets by the device's calendar day. Changing that alters which week live records land in — **its own gate, untouched** |
| Phase 4 wiring `7e2931f` | unchanged, still held |

**A location → IANA zone resolver is deliberately absent.** The contract accepts a resolved zone from its caller: resolving a place name needs a geographic database, which is exactly the dependency a pure contract must not acquire. Which resolver, and whether the location list is curated, is an Owner product question.

---

*Master Architect audit: BR-0, additive, no accepted decision changed, no Owner Control Gate crossed. D14 is represented and provable without being reachable, and the layout work presents numbers instead of a choice.*
