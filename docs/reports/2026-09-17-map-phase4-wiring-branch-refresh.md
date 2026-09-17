# MAP — keeping the preserved Phase 4 wiring branch current

- **Date:** 2026-09-17
- **Task:** refresh `claude/phase4-wiring` against `main`, so the held work merges as a non-event when deployment access arrives
- **Blast radius:** **BR-0 on `main`** — two documentation corrections only. The branch itself is unmerged and unchanged in substance.
- **Branch:** `c4fca4a` → **`7e2931f`**
- **Result:** ACCEPT — 17 pure suites green on the branch, Phase 4 emulator 53/0, three conflicts resolved deliberately.

---

## 1. Why this, and why now

The Master Architect's instruction is to *preserve* the prepared Phase 4 wiring.
Preservation is not the same as leaving it alone: the branch was cut at
`65d3f99` and `main` has moved **eight commits** since — P5-C, P5-E, P6-A, P6-B,
the deployment package, P6-C.

Left untouched, the branch rots quietly and the integration happens **at exactly
the moment production Rules go live** — the worst possible time to discover a
defect. Refreshing it now costs nothing and needs neither deployment nor an Owner
decision.

It merged with **three conflicts**, so this was not a formality.

---

## 2. The substantive conflict — two true invariants, neither of which survives alone

`tools/i18n-verify/study-activity-evidence-boundary.mjs` had been rewritten on
**both** sides, for good reasons on both:

| Side | Says | Because |
|---|---|---|
| `main` (P5-C) | **No page may reach** the evidence writer, by any chain | Through P5/P6 nothing is wired, and that is the whole safety case |
| branch (P4-D) | The writer has **exactly one audited entry point** | This branch wires Study surfaces to it **on purpose** |

**On this branch "unreachable" is simply false**, and asserting it would have
been asserting that the wiring does not work. Picking either side would have
thrown away a real guarantee.

**Resolved by combining them:** `main`'s **reachability walker** is kept — the
stronger mechanism, because it catches a wiring wherever in the chain it happens
rather than only at the first hop — and applied to P4-D's invariant:

> every page-reachable path to the writer must pass **through**
> `study-event-wiring.js`

with the pinned importer set becoming `[study-event-wiring.js,
study-note-service.js]`, and `study-note-service.js` still asserted unreachable
because on this branch it genuinely is. The merged check also refuses to pass
vacuously: if **no** page reaches the writer it fails, because on this branch
that would mean the wiring is broken.

The other two conflicts were documents: `CHANGELOG.md` took `main`'s history
with the branch's own 88-line P4-D entry re-appended, and `CLAUDE.md` took
`main`'s brief with a **branch-only banner** saying where you are, what this
checkout carries that `main` does not, and that two checks read differently here
on purpose.

---

## 3. Verified after the merge

| Claim | Evidence |
|---|---|
| Nothing regressed | **17 pure suites green**, including `study-event-wiring` (39) which exists only here |
| The Rules still behave | Phase 4 emulator **53 assertions, 0 failures** |
| The deployment candidate is unaffected | Every rules and index artefact **byte-identical to `main`**, so `main`'s runs (Phase 4 **53**, Phase 5 **60**, Phase 6 **53**) hold here without re-running them |
| The branch is still only the wiring | `app/` differs from `main` by exactly `study-event-wiring.js`, the shell wiring, five Bangla strings, and `version.js` at **08.26** |
| Nothing activated | `firestore.rules` and `firebase.json` untouched on both sides |

---

## 4. A correction to my own earlier finding

Yesterday's report said `docs/governance/phase4-production-package-2026-09-14.md`
**"was never written"**.

**That is wrong.** It *was* written — it lives on this branch and was simply
never merged across. The dead pointer on `main` was real, and the fix is
unchanged (the consolidated package supersedes it), but the characterisation was
not. Corrected in the report, the changelog, and by the branch banner, which now
records that the older package is superseded rather than leaving two documents
competing to be the deployment instructions.

---

## 5. Pending-dependency ledger

| # | Item | State |
|---|---|---|
| 1–4 | Phase 4/5/6 Rules + four indexes | **READY — VERIFIED — PENDING EXECUTION ACCESS** |
| 5 | Merging `claude/phase4-wiring` | **De-risked: now `7e2931f`, current with `main`, 3 conflicts already resolved** |
| 6 | P5-D, the Note editor | ADR-004's deferral — Owner |
| 7 | Server-side folder-cycle prevention | Owner: costs the ability to move a folder |

Item 5 was the one that would have gone wrong silently. It is now a fast-forward
of a branch whose only difference from `main` is the wiring itself.
