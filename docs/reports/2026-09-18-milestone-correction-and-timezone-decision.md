# Milestone correction, and the Owner's timezone decision recorded

- **Date:** 2026-09-18
- **Repository:** `Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io`
- **Branch:** `claude/charming-rubin-xzxbk1`
- **Blast radius:** **BR-0 — documentation and one harness guard.** `git diff -- app/` is empty. No `firestore.rules`, no `firebase.json`, no Rules or index candidate, no schema, no data. **Nothing merged; no branch merged or activated.**
- **Application version:** unchanged at **08.26 on this branch**; **`main` remains 08.25.**

---

## 1. The correction: a version bump on a branch is not a version on `main`

### 1.1 What was wrong

The previous tranche committed the v08.26 nav fix **to this branch** and then wrote, in three places, that v08.26 was on `main`:

| File | Wording |
|---|---|
| `CLAUDE.md` | `**Current milestone: v08.26 on `main`**` |
| `CLAUDE.md` | "`main` has now taken that number for the nav correction" |
| `CHANGELOG.md` | "Its own `version.js` stamp of 08.26 is now stale — `main` has taken that number" |
| the nav report, §5 | "`main` has now taken that number." |

**None of it was true.** Nothing was merged, and nothing had been asked to be.

### 1.2 The actual state, verified

```
origin/main                        1cac2b8   app/js/version.js = 08.25
origin/claude/charming-rubin-xzxbk1 82078b1  app/js/version.js = 08.26
origin/claude/phase4-wiring        7e2931f   app/js/version.js = 08.26  (held)
```

`main` at **08.25** is what GitHub Pages serves, so **the live app does not have the nav fix.** Saying otherwise would have told the next session that a shipped fix was live when it was not.

### 1.3 Why this was worse than the drift it repeated

`CLAUDE.md`'s own milestone paragraph already records this drift twice — `v08.02` while main was on 08.04, and `v08.19` while main was on 08.21. Both were a **stale number**: the brief lagged reality. This third one **asserted a merge that had not happened** — a claim about repository state, not a number left behind. It is the more expensive kind, because a stale number is corrected by looking at one file while a false merge claim changes what a session believes is deployed.

### 1.4 The corrected wording

`CLAUDE.md`'s milestone line now names the branch **and** states main's own version:

> **Current milestone: v08.26 on `claude/charming-rubin-xzxbk1` — `main` is still v08.25.**

Each of the four sites above carries a dated correction note rather than a silent rewrite. The round entry is marked **"ON `claude/charming-rubin-xzxbk1`, NOT YET MERGED"**, and the nav-truncation baseline now reads "fixed in v08.26, **not yet merged — still live on `main`**" rather than "paid off".

### 1.5 The version-collision note is kept, and is now accurate

**Two unmerged branches each stamp `version.js` 08.26** while `main` is 08.25: this one and the held wiring at `7e2931f`. **Whichever merges first takes 08.26; the second's `version.js` conflicts and resolves to 08.27.** Neither branch is re-cut or re-stamped — that would be churn for a one-line merge resolution, and the standing instruction is to hold `7e2931f` exactly as it is. **A merge-ordering fact, not a defect.**

---

## 2. The guard was blind to this, and now is not

### 2.1 Why it could not have caught it

`brief-integrity.mjs`'s version check hard-coded the phrase ``on `main` `` **in its own regex**:

```js
const claimed = brief.match(/\*\*Current milestone:\s*v([\d.]+)\s+on\s+`main`\*\*/);
assert.equal(claimed[1], actual[1]);   // `actual` = the WORKING TREE
```

So it compared the claimed version against the **working tree**, which on this branch really did read 08.26. **It had no way to ask whether the working tree was `main`.** The check passed while the sentence it was guarding was false.

This is the project's own recorded shape: a guard that cannot fail on the thing it names is worse than no guard, because it is believed.

### 2.2 What it does now

1. Parses **whichever ref the milestone line actually names**, instead of assuming `main`.
2. Compares the claimed version against the working tree, as before.
3. **Resolves `main`'s real version from `origin/main:app/js/version.js` every run.**
4. If the line claims **`main`**, that claim is checked **against `main`** — with one deliberate exception: a session whose `HEAD` really is `main` is allowed to be ahead of `origin/main`, because there the working tree *is* the future main and step 2 already covers it.
5. If the line names a **branch**, the line **must also state `main`'s version**, and that statement is verified.

### 2.3 Mutation-proven — including against the first attempt at the fix

| # | Milestone line | Original guard | First fix attempt | Final guard |
|---|---|---|---|---|
| A | `v08.26 on \`main\`` — **the error actually made** | passes | **still passes** | **FAILS** |
| B | branch named, `main` claimed as v08.26 (false) | n/a | FAILS | **FAILS** |
| C | branch named, `main`'s version omitted | n/a | FAILS | **FAILS** |
| D | branch named, `main is still v08.25` (true) | n/a | passes | **passes** |

**Case A is the finding.** The first strengthening still returned early whenever the line said `main` and compared only the working tree — reproducing the exact blind spot. It was caught by *running* the mutation, not by re-reading the new code. The message now names the cause:

> the brief says v08.26 is on `main`, but origin/main:app/js/version.js says 08.25 and this tree is on `claude/charming-rubin-xzxbk1`, not main — a version bump on a BRANCH is not a version on main

**A second false positive on the guard's own first run:** `v([\d.]+)` greedily swallowed the sentence's full stop, so `v08.25.` compared as `"08.25."` against `"08.25"`. Pinned to `v(\d+\.\d+)`. A guard's first run is where its own false-positive rate is measured — that is twice now, in two consecutive sessions, that the first run earned its keep.

---

## 3. The Owner's timezone decision — recorded as D14, implemented not at all

### 3.1 The decision

> **Automatic capture is the default. A person may choose a location, which determines their timezone until they change it or return to automatic detection.**

This closes handover item **O4**. `timezone` is **authoritative, not captured-only** — a value the person can deliberately override is a value something is meant to honour.

### 3.2 What the data and Rules contract actually say, inspected before anything was written

| Question | Finding |
|---|---|
| Where is `timezone` written? | Three creation sites, from `Intl.DateTimeFormat().resolvedOptions().timeZone`: `identity.js:102`, `invites.js:174`, `people.js:82` (via parameter). `migrate.html:326` writes `null`. |
| What reads it? | **Nothing.** Zero consumers in `app/`. |
| What do the **deployed** Rules allow? | `tenantPeople`'s third `allow update`: `signedIn() && resource.data.authUid == myUid() && …affectedKeys().hasOnly(['timezone', 'updatedAt'])`. |
| Is there a mode / auto flag? | **No.** No `timezoneMode`, `tzMode`, `autoDetect` or `timezoneAuto` anywhere in `app/`, `firestore.rules` or `docs/governance/`. |
| Is there a location field? | **No.** The only `location` matches in `app/js` are `window.location` and a doc comment. |
| Does week bucketing use it? | **No.** `weekKeyFor()` (`activity.js:27`) buckets by `getFullYear()/getMonth()/getDate()` — the **device's** local calendar day — then normalises into UTC. |

### 3.3 Three findings, and why nothing was built

**(1) The accepted decision cannot be represented by the field that exists.** `timezone` is a single string. *"Return to automatic detection"* is a **mode**, and with only the value stored, an auto-detected `Asia/Dhaka` and a hand-chosen `Asia/Dhaka` are **indistinguishable**. That is not cosmetic — it decides behaviour in both directions:

- re-detect at each login → **silently overwrites a deliberate choice**;
- never re-detect → **silently freezes an auto value** when the person travels, which is the case auto-capture exists for.

There is no third option without a stored mode, and no mode field exists.

**(2) The deployed Rules authorise `timezone` and `updatedAt` and nothing else.** `hasOnly(['timezone', 'updatedAt'])` means a mode field — or a stored location — is **denied in production the moment it is written**. This is precisely the class `rules-authorisation-executable.mjs` exists to catch, in its "the data layer writes a field the Rules may not change" direction. Implementing D14 therefore **requires a Rules change**, which is an **Owner Control Gate** and rides the same **E1** deployment dependency as Phases 4–6.

**(3) A location is not a timezone.** The Owner's wording is exact — a location *determines* a timezone. The authoritative stored value is the resolved IANA zone; whether the chosen location **label** is also stored is a separate product question with its own cost (a location→zone mapping needs a data source, and multiple locations collapse to one zone). **No location field was added**, per the instruction not to add one silently.

### 3.4 One consequence worth stating before it is built

Because `weekKeyFor()` buckets by the **device's** calendar day, honouring an authoritative timezone would change **which Activity week a study event lands in**. That is a behaviour change affecting **live records**, and a gate of its own — separate from the Rules change in (2).

### 3.5 What was done

**D14 recorded in `CLAUDE.md`'s decisions table**, carrying the decision and all three findings, and the standing lesson that framed this as an open product question updated to say the question is answered while the build remains gated. **No field added, no Rules touched, no UI invented.**

---

## 4. Verification

| Suite | Result |
|---|---|
| `brief-integrity` | **8 / 0**, EXIT 0 — and 4 mutations (§2.3) |
| `rules-authorisation-executable` | 38 / 0 |
| `firestore-index-requirements` | 8 / 0 |
| `rules-deployment-candidate` | 10 / 0 |
| `stub-parity` | 3 / 0 |
| `navcheck` | EXIT 0 |
| Translation coverage | **1,803 / 47**, unchanged |
| `git diff -- app/` | **empty** |

`behaviour.mjs` and `layout.mjs` were **not re-run**, and deliberately: this tranche changes no file either suite reads. `app/` is byte-identical to the previous commit, and the only non-documentation change is `tools/i18n-verify/brief-integrity.mjs`, which neither suite loads.

## 5. What this tranche did NOT do

- **No merge, of either branch.** `7e2931f` remains held, unmerged, not re-cut, not re-stamped.
- **No Rules, index, schema or data change.** `firestore.rules` and `firebase.json` byte-identical.
- **No timezone or location field, and no timezone UI.**
- **No change to the Phase 4 evidence `request.query.limit`** — the verified deployment candidate is unamended.
- All seven pending-dependency ledger items unchanged. The blocker is still **E1 — authenticated Firebase access** — and it is access, not design.
