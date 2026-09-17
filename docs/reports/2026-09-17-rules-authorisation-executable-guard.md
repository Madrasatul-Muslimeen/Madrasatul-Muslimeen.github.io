# MAP — making "no authorisation may sit unexecutable" a check instead of a habit

- **Date:** 2026-09-17
- **Task:** turn the comparison that produced P6-C, P6-D, P5-F and P6-E into a mechanical guard
- **Blast radius:** **BR-0.** One new file under `tools/i18n-verify/`. **No `app/` file changed at all** — `git diff -- app/` is empty. Every Rules and index candidate byte-identical. Nothing deployed.
- **Application version:** **08.25, unchanged.**
- **Result:** ACCEPT. `tools/i18n-verify/rules-authorisation-executable.mjs`, **38 checks**, and **11 of 11 mutations caught** — including three that reproduce the historical gaps exactly.

---

## 1. Why a check and not another round of reading

Four rounds in a row found the same defect by hand, in four different collections:

| | Gap |
|---|---|
| P6-C | ADR-010 §5's retire-and-create had **no retire function at all** |
| P6-D | `noteFolders` was create-only, against the candidate's own comment *"a folder may be renamed, reordered, re-parented or retired"* |
| P5-F | a `noteSources` link could be created and never retired, though the candidate says *"a link may be retired"* and its emulator suite had **already proven the server allows it** |
| P6-E | a `notePlacements` `order` could never be changed — **with a composite index already specified to serve that exact ordering** |

Every one was invisible to every existing suite, and for a structural reason: **every suite tests what the code does.** Nothing compared what the Rules *permit* against what the data layer can *perform*. Four for four is not a run of bad luck; it is a missing guard.

## 2. Both directions, and the second one matters too

**FORWARD** — every field an accepted `allow update` may change must be written by some data-layer update. Otherwise an accepted decision is unexecutable.

**BACKWARD** — every field a data-layer update writes must be one that `allow update` may change. Otherwise **the write is denied in production and no pure suite would ever notice**, because the harness stub has no rules at all. This direction has found nothing yet; it is the cheaper half to get wrong in future.

The mutable set is **derived from the Rules text**, never listed in the check. Two forms appear in these candidates and both are handled:

- an explicit `d().diff(resource.data).affectedKeys().hasOnly([…])`, which says it outright (`noteSources`);
- a shape `keys().hasOnly([…])` minus whatever an `…IdentityUnchanged()` helper and `createdByFrozen()` freeze, minus the I17 envelope fields nobody sends (`notes`, `noteFolders`, `notePlacements`).

`allow update…: if false` means create-only, and then the check asserts the data layer has **no** update for that collection — which is how `noteRevisions` and the Phase 4 evidence subcollection are held frozen.

The derivation is checkable against prose: for `notes` it yields `bodyHtml, currentRevisionId, status, title`, and the rule's own comment says *"An update may change the title, the body, the status and the revision pointer — and nothing else."*

## 3. A third thing the parser made cheap

Since the check can already read a mutable set out of any of these files, it reads it out of the **assembled deployment candidate** too and asserts it matches the extract, per collection.

That guards a class this project has already been bitten by once: the extracts and the assembled file diverged in four helpers (defensive `.get(field, default)` reads where production reads the field directly). **If the file that would actually be pasted authorises a different set of mutable fields, then the data layer is correct against the extract every suite runs on, and wrong against the thing deployed.**

## 4. Mutation-proven, 7 for 7

| Mutation | Check killed |
|---|---|
| remove `reorderNotePlacement`'s update (**reproduces P6-E**) | FORWARD on `notePlacements`, naming `order` |
| remove `retireNoteSource`'s update (**reproduces P5-F**) | FORWARD on `noteSources`, naming `status` |
| remove all four folder updates (**reproduces P6-D**) | FORWARD on `noteFolders`, naming `name, order, parentFolderId, status` |
| make `renameNoteFolder` also write `semanticRole` | BACKWARD on `noteFolders` |
| break the shape regex | POSITIVE CONTROL |
| revert `matchBlock` to the greedy brace scan | POSITIVE CONTROL |
| add `sourceKey` to the assembled file's `affectedKeys` | the deployment cross-check on `noteSources` |

**Three of the seven reproduce the historical gaps exactly**, so the claim "this would have caught them" is demonstrated rather than asserted. Every mutation printed its own occurrence count first, and the Rules file was restored and re-diffed to byte-identical.

## 5. Two guards of its own, because a parser is the thing most likely to be silently wrong

**A positive control**, asserting the parser really reads a mutable set out of the Rules — without it, one broken regex makes every mutable set empty, every FORWARD assertion trivially true and every BACKWARD assertion true as well, and the whole file passes while checking nothing.

**Assertions inside the parser**: a block under 200 characters, a shape list of three fields or fewer, or a frozen list of two or fewer all throw rather than return. That is not decoration — **it is how this file's own first run was caught.** `matchBlock` scanned forward for the first `{` after `match`, which is the wildcard's own brace in `match /notes/{noteKey} {`; it closed on the matching `}` and returned a two-token block. Five collections were reported as create-only and the positive control failed. **The parser now takes the last brace on the match line.**

## 6. Also recorded: one of my own mutations did not apply

M5 was first attempted with a `sed` whose escaping did not match, so it replaced nothing and the suite passed — which would have read as "this check cannot fail." It was re-done with an explicit occurrence assertion that aborts when the count is not 1.

**This is the project's own standing lesson happening in real time**: a mutation that does not apply proves nothing, and it looks exactly like a mutation the suite survived. Every mutation in this round prints its count before it runs.

## 7. Verification

| | |
|---|---|
| `rules-authorisation-executable.mjs` | **17 / 0**, 7 of 7 mutations caught |
| `git diff -- app/` | **empty** — no application file touched |
| `firestore.rules`, `firebase.json`, 3 Rules candidates, 4 index candidates | **byte-identical** |
| Every other pure suite | unchanged (re-run: contract 34, data layer 95, services 32 / 18, boundaries 13 / 17 / 30 / 15 / 16, index requirements 8, deployment candidate 10, stub parity 3) |
| Translation coverage | **1,803 / 47** — unchanged, no user-visible string |

## 8. Extended the same day to `allow create`

The emulator suites prove the **Rules** are right, using their own fixtures. They do not prove the **data layer's payload** matches them. A create missing a `hasAll` field, or carrying one outside `hasOnly`, is **denied in production and no pure suite notices** — the harness stub has no rules at all. Same class as the BACKWARD direction, applied to create.

So the guard now also reads each collection's `hasOnly`/`hasAll` and compares it against every `createDocument(…, TENANT.X, …)` and `transaction.create(TENANT.X, …)` payload in the data layer, plus the Phase 4 evidence payload built in `study-activity-evidence-id.js`.

**Spreads are resolved, not skipped.** `...owner` and `...relationBase(owner, noteId)` expand into field sets read out of those helpers' own source, and the check asserts the helpers still look like themselves — `ownership()` returning two fields instead of three makes the parser throw by name rather than quietly compare a short list.

Four more mutations, all caught: dropping `parentFolderId` from the folder create fails REQUIRES; adding `colour` fails FORBIDS; making `ownership()` return two fields throws at the helper assertion; adding `occurrenceId` to the evidence payload fails the Phase 4 check — which is a real invariant, since ADR-008's amendment says `occurrenceId` is **deliberately not stored**.

## 9. What it does NOT cover, stated

- **Only the six MAP collections.** The legacy production collections in the full ruleset are not parsed; their data layers predate this pattern and were not written against a candidate. Extending it there is a separate task with its own reading.
- **Only `allow update` and `allow create` field sets.** Read scope and the value-level conditions (`status == 'active'` on create, `getAfter()` revision chaining, `canRecordFor()`) are the emulator suites' job, which is the right place — those are server decisions, not executability ones.
- **It cannot tell whether a field change is *reachable from a surface*.** That is what the boundary suites' reachability walkers do, and right now the answer is deliberately "no" for all of this code.

## 10. A third near-miss, and the positive control earning its keep again

The create parser's regex was built in a Python heredoc, and `\b` inside a normal Python string is a **backspace escape** — so the file was written containing a literal 0x08 byte, and the pattern required an actual backspace after `TENANT.NOTE_FOLDERS`. It matched nothing.

**Without the positive control this would have shipped as 12 green checks that examined zero create payloads.** With it, the run said `expected one noteFolders create, found 0` immediately. That is the third time in one day that reading a real failure rather than a count or a grep was the thing that mattered.

---

*Master Architect audit: BR-0, tools-only, no accepted decision changed, no Owner Control Gate crossed. The guard encodes an existing accepted comparison; it introduces no new rule and cannot authorise anything.*
