# Programme ledger Guard E "fixture drift" audit — the failure does not reproduce

**Date:** 2026-09-21 (UTC)
**Session:** MMSA task bridge, issue #123, comment `5754449801`
**Scope:** read-only investigation + design proposal. No protected/shared path
edited. No version allocated. Nothing merged or deployed.

## What was asked

The triggering comment reported: *"The v08.32 post-release audit has one
remaining governance failure: `programme-ledger-mutations.mjs` Guard E fixture
drift, because no live branch simultaneously declares `version.js` touch and
still changes it,"* and asked for a minimal synthetic mutation fixture that
builds its own precondition, delivered as design/patch text only —
`programme-ledger-mutations.mjs` is protected "platform-shared tooling" and
this bridge must not edit it.

## What was actually found

**The premise does not hold.** Run from a *shallow* checkout (the state this
container started in — `main` and the assigned working branch only, no other
remote refs), `programme-ledger-mutations.mjs` fails **7** of 49 checks, not
1:

```
FAIL  MUTATION [A] the ledger and the branch disagree about what the branch is stamped
      Cannot set properties of undefined (setting 'declaredVersion')
FAIL  MUTATION [B] a branch is stamped a version reserved for nobody
      Cannot read properties of undefined (reading 'activeBranch')
FAIL  MUTATION [B] a branch stamps at or beyond the unallocated boundary
      Cannot read properties of undefined (reading 'activeBranch')
FAIL  MUTATION [C] the recorded historical stamp is not what the held branch carries
      guard C did NOT fail ... UNPROVEN
FAIL  MUTATION [E] a stream's shared-file touch loses its declaration
      fixture drift: no stream both declares app/js/version.js and still shows it changed on a branch
FAIL  MUTATION [E] a stream newly touches a shared file nobody declared
      Cannot read properties of undefined (reading 'activeBranch')
FAIL  MUTATION [E] a stream touches the deployed Rules
      Cannot read properties of undefined (reading 'activeBranch')
```

**After `git fetch --unshallow origin` and fetching every branch the ledger's
`streams[].activeBranch` names (concretely: `claude/phase4-wiring`, the
`quran-phase4-wiring` stream's held branch), `programme-ledger-mutations.mjs`
— completely unmodified — passes all 49 checks, 0 failed**, on current `main`
(`e3f6eca`, v08.32):

```
==== Programme ledger guard mutations: 49 passed, 0 failed ====
```

This is the same class of environmental artifact this repository's own
standing lessons already name for the seven governance suites generally
("READ A SUITE'S FAILURE TEXT AND ITS EXIT CODE... run from the repository
root") and that the prior audit session (comment `5754399917`'s bridge run)
independently reproduced and fixed the same way for the seven main suites. It
had not previously been reproduced specifically for the **mutation** suite's
Guard E case, because that case's precondition depends on a *held* stream
(`quran-phase4-wiring`) whose branch (`claude/phase4-wiring`) a normal
shallow clone of `main` never fetches.

### Why the real (unmodified) fixture is correct

The mutation at issue reads:

```js
const s = l.streams.find((x) =>
  (x.declaredSharedTouches || []).some((t) => t.path === "app/js/version.js") &&
  x.activeBranch && (f.branches?.[x.activeBranch]?.changedPaths || []).includes("app/js/version.js"));
assert.ok(s, "fixture drift: no stream both declares app/js/version.js and still shows it changed on a branch");
```

The ledger's `quran-phase4-wiring` stream genuinely satisfies both halves of
that condition, on real data, right now:

- `declaredSharedTouches` includes `{ "path": "app/js/version.js", "status": "DECLARED", "note": "+1/-1, the historical 08.26 stamp..." }`.
- Its held branch `claude/phase4-wiring` (tip `7e2931f`), diffed against
  `main`, genuinely still changes `app/js/version.js`:
  ```
  $ git diff --name-only $(git merge-base origin/claude/phase4-wiring origin/main) origin/claude/phase4-wiring | grep version.js
  app/js/version.js
  ```

So the comment's premise — *"no live branch simultaneously declares
`version.js` touch and still changes it"* — is false once the branch is
actually readable. **No synthetic fixture is needed; the real held branch
already is one.**

## A conflicting fix already exists on the Owner's own branch

`git fetch` during this session's preflight surfaced a branch not on `main`
and not referenced by this issue: **`mmsa/fix-guard-e-fixture-v0832`**, one
commit (`ed85a0e`, authored directly by `AAAsApps <smahk9@gmail.com>`, not by
a Claude session, off `af2c510`) titled *"Make Guard E mutation fixture
independent of historical branch touch."* It edits the same mutation to build
its own synthetic precondition (append a synthetic `app/js/version.js` touch
+ declaration onto whichever stream has *any* readable branch, then remove
the declaration) rather than relying on `quran-phase4-wiring`'s real one.

No pull request exists for this branch (searched via `list_pull_requests`
with `head=claude/laughing-goodall-0jq38w` and a fuller listing; nothing
targets or comes from `mmsa/fix-guard-e-fixture-v0832`) — it is sitting on
`origin` unreviewed.

**This bridge recommends the Master Architect NOT merge `ed85a0e` as-is**, for
two reasons stated plainly rather than acted on:

1. It fixes a problem that does not reproduce given a correctly fetched
   checkout (above) — merging it would rewrite a protected governance test
   file's semantics for no behavioural gain.
2. It weakens the mutation's realism: it now proves Guard E can catch an
   *invented* undeclared touch on *whichever* branch happens to be locally
   readable, rather than proving it against the one real, live, `HELD`
   scenario (`quran-phase4-wiring` / `claude/phase4-wiring`) the ledger
   actually carries. The original fixture is closer to the standing lesson
   "mutation-test a security/governance rule check by check... seed a
   structurally perfect write" — it already does that with real data; the
   proposed patch trades that for a fabricated one.

It is still a legitimate, reviewable difference of judgement, not a defect —
recorded here for the Master Architect's decision, not overridden.

## A related fragility, found but not fixed (also protected)

Four *other* mutations share the exact pattern that crashed with raw
`TypeError`s under the shallow checkout — `l.streams.find(x => x.activeBranch
&& f.branches[x.activeBranch])` used without an `assert.ok(s, …)` guard
before dereferencing `s`:

- `MUTATION [A] the ledger and the branch disagree about what the branch is stamped` (line ~117)
- `MUTATION [B] a branch is stamped a version reserved for nobody` (line ~123)
- `MUTATION [B] a branch stamps at or beyond the unallocated boundary` (line ~130)
- `MUTATION [E] a stream newly touches a shared file nobody declared` (line ~231)
- `MUTATION [E] a stream touches the deployed Rules` (line ~236)

All five passed cleanly once `claude/phase4-wiring` was fetched (they depend
on the same stream Guard E's case does), so nothing is broken today. But if
that branch is ever deleted, or the `quran-phase4-wiring` stream's
`activeBranch` is ever cleared the way `hadith`'s already was (the file's own
comment at line ~110 documents that exact precedent), these five would
regress to the same opaque `TypeError` crash Guard E's case gave this
session — "UNPROVEN, guard did not fail" is the fixture's own stated design
goal for a missing precondition, and a raw `TypeError` does not meet it.

**Proposed patch text** (design only — not applied; the file is protected),
following the same shape the file already uses for its own Guard E
first-case guard and for `heldStream()`:

```js
// Shared helper both A/B/E's "any readable stream branch" mutations can use.
const anyReadableBranch = (l, f) => {
  const s = l.streams.find((x) => x.activeBranch && f.branches?.[x.activeBranch]);
  assert.ok(s, "fixture drift: no stream has a locally readable activeBranch -- "
    + "fetch every streams[].activeBranch this ledger names before running this suite");
  return s;
};
```

...then replace each of the five inline `l.streams.find(...)` call sites
above with `anyReadableBranch(l, f)`. This is optional hardening, not a
required fix — none of the five actually fails today — and is left for the
Master Architect to authorise or decline alongside the `ed85a0e` decision,
since touching this file at all needs that authorisation regardless of how
small the diff is.

## Exact Master Architect decision needed

1. **Confirm no code change to `programme-ledger-mutations.mjs` is required**
   for the reported Guard E failure — it was a checkout-completeness
   artifact, reproduced and resolved by fetching `claude/phase4-wiring`
   (see evidence above), not a defect in the guard or its fixture.
2. **Decide the fate of `mmsa/fix-guard-e-fixture-v0832` (`ed85a0e`)** — close
   without merging (this bridge's recommendation, given (1)), or merge anyway
   as a deliberate hardening/simplification choice independent of the root
   cause. Either is a legitimate call; this bridge has not touched that
   branch.
3. **Optionally authorise** the five-site `anyReadableBranch()` hardening
   above as a follow-up shared-file touch, if the Master Architect wants the
   suite to fail with a named diagnostic instead of a raw `TypeError` in the
   branch-deleted future case. Not urgent — nothing regresses today.

## Governance suites — current `main` (`e3f6eca`, v08.32), full history + all ledger-declared refs fetched

| Suite | Result | Exit |
|---|---|---|
| `programme-ledger` | 8 passed, 23 noted, 0 failed | 0 |
| `programme-ledger-mutations` | **49 passed, 0 failed** | 0 |
| `brief-integrity` | 8 passed, 0 failed | 0 |
| `study-activity-evidence-boundary` | 27 passed, 0 failed | 0 |
| `study-activity-evidence-boundary-mutations` | 11 passed, 0 failed | 0 |
| `study-event-wiring` | 41 passed, 0 failed | 0 |
| `rules-authorisation-executable` | 38 passed, 0 failed | 0 |

All seven exit 0. No shared/protected file was edited to make this so — only
the local git checkout was completed (`git fetch --unshallow origin` +
`git fetch origin claude/phase4-wiring`), which touches no repository file at
all.

## Word Card relevant suites (PR #112's own coverage, re-run on current `main`)

| Suite | Result | Exit |
|---|---|---|
| `quran-word-card` | 36 passed, 0 failed | 0 |
| `quran-word-card-integration` | 10 passed, 0 failed | 0 |
| `quran-word-card-rendered` | 120 passed, 2 failed (environmental) | 1 |
| `quran-word-card-lemma-occurrences` | 35+ passed, no failures seen, run inconclusive (below) | — |

The 2 `quran-word-card-rendered` failures are both `net::ERR_CERT_AUTHORITY_INVALID`
on the "no page errors" check, in English and Bangla — this repository's own
documented, pre-existing sandbox TLS-interception artifact ("Standing
lessons... never happen for the owner, never `--ignore-certificate-errors`"),
not a regression.

`quran-word-card-lemma-occurrences` ran every functional assertion clean in
**both** languages — the toggle itself, expand/collapse, the occurrence list
matching the shown count, the cap, navigation on click, the "way back" bar
reuse, that expanding+navigating writes nothing (`__fsLog`), and that
expansion does not leak onto the next word — plus its viewport-geometry
sub-section at 320×640 and 390×844 (English). It then produced no further
output for over three minutes with the process's own CPU time frozen at a
few seconds, one of this project's own documented sandbox limits (network
calls to hosts this container cannot reach hang rather than fail fast) —
this bridge terminated it (`kill -9`) rather than wait indefinitely, since
it is not one of the seven required suites. **No failure was observed before
termination**; the remaining viewport/Bangla-geometry combinations were
simply never reached. Recommend re-running this one suite with a normal
network-capable checkout before relying on a full pass/fail count for it.

Both browser-driven Word Card suites needed two local, non-committed
environment fixes to run at all in this container (neither touches a tracked
file: `node_modules/` is gitignored, and `serve.js`/`CHROMIUM_PATH` are
process-level, not repository state):
`ln -s /opt/node22/lib/node_modules/playwright node_modules/playwright`
(the `playwright` package was not locally resolvable via ESM import
otherwise) and `CHROMIUM_PATH=/opt/pw-browsers/chromium` with `node serve.js`
running on `:8080` (per this project's own documented sandbox browser setup).

## Deliberately not done

- No edit to `tools/i18n-verify/programme-ledger-mutations.mjs` or any other
  protected/shared path.
- No touch to the `mmsa/fix-guard-e-fixture-v0832` branch — read only.
- No version allocated or bumped.
- Nothing merged, approved, or deployed.
- The five-site hardening above is design text only, not applied.

## Owner app test

**NO** — per the triggering comment ("no app behavior change") and confirmed
by this audit: nothing in `app/` was touched, and the governance/mutation
suites are development tooling, not user-facing behaviour.
