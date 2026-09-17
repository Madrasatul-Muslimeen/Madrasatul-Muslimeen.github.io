# MAP Phase 6 (P6-D) — the folder editing side, and two real defects it exposed

- **Date:** 2026-09-17
- **Task:** make the folder operations the accepted Phase 6 Rules already authorise actually performable, and correct what doing so exposed
- **Blast radius:** **BR-0.** Three `app/js` modules changed, all still unreachable from any page (proven by two boundary suites with positive controls). No `.html` changed. `firestore.rules`, `firebase.json`, all four index candidates and all three Rules candidates **byte-identical**. Nothing deployed.
- **Application version:** **08.25, unchanged.** No behaviour on any screen moved.
- **Result:** ACCEPT. Two real defects in accepted P6-A/P6-B code found, fixed and mutation-proven. Suites: contract 28 → **34**, data layer 47 → **77**, service 13 → **17**, Phase 6 emulator 53 → **58**. Phase 4 emulator 53, Phase 5 60, coverage 1,803 / 47 — all unchanged.

---

## 1. Why this task, and why it needed no new authority

Six of the seven pending-dependency items are behind the same external Firebase Console access; the seventh is an Owner decision. Looking for work that is behind neither turned up this:

**`noteFolders` was create-only in the data layer, while the accepted Phase 6 Rules candidate already says the opposite — in its own comment:**

> *Identity and ROLE are write-once. **A folder may be renamed, reordered, re-parented or retired**; it may never become a different folder, change owner, or change what KIND of folder it is (ADR-010 §3).*

So the accepted decision was **unexecutable**. That is exactly the shape of P6-C's own finding — ADR-010 §5's retire-and-create had no retire function — found one collection over. Nothing here decides anything new; it makes reachable what the accepted ruleset already permits.

## 2. The two defects, both in accepted code, both proven by probe

### D1 — `folderTreeRefusal()` let a re-parent breach the depth bound

The function opened with:

```js
let depth = 2; // the new folder, plus its proposed parent
```

**Right for a create, wrong for a move.** A create places a *leaf*. A re-parent carries the folder's whole subtree with it, so the real resulting depth is `parentDepth + 1 + subtreeHeight`. Probed before touching anything: a folder three levels tall moved under a parent already six deep put its deepest descendant at **nine**, and the function returned `null` — allowed.

`subtreeHeight()` now measures what is being carried. It walks **down**, which is what makes it cycle-safe for the same reason `buildFolderTree()` is — `parentFolderId` is single-valued, so a cycle can only be entered from inside itself — and it is capped as well, so it terminates on a tree that is *already* corrupt. For a create the height is 1 and the arithmetic is unchanged.

### D2 — a folder that was merely too deep was reported to its author as **cyclic**

`cyclic` was computed as *"not reached and not orphaned"*. The walk deliberately stops at the depth cap, so **everything below the cap fell into `cyclic`.** A person with a legitimately deep tree would have been told their folders were in a cycle.

The doc comment was honest about the mechanism (*"folders that could not be reached from any root"*) and the **name was the lie** — and `cyclic` is a word that reaches a screen. The two are different facts with different remedies: a cycle is corruption, too deep is a tree that needs flattening. `buildFolderTree()` now returns `{ roots, orphaned, cyclic, tooDeep }`, and `cyclic` means only what it says.

**These two compound.** D1 produced the over-deep tree; D2 then mislabelled it. Neither was visible from the create path, which is the only path that existed.

## 3. Both fixes are mutation-proven

| Mutation | Check killed |
|---|---|
| `let depth = 1 + height` → `let depth = 2` | **J32** — a re-parent counts the height of the subtree it carries |
| drop `&& !beyondCap.has(...)` from `cyclic` | **J29** — a folder below the cap is reported as TOO DEEP, never as cyclic |
| drop `&& d().semanticRole == resource.data.semanticRole` from the Rules candidate | **F-LIFE-04** — a folder may not change what KIND of folder it is |

Every mutation printed its own occurrence count first — *a mutation that does not apply proves nothing* — and the Rules file was restored and re-diffed to byte-identical afterwards.

## 4. What was added

**`journey-map-contract.js`** — `subtreeHeight()`, `collectSubtree()`, `tooDeep`.

**`note-foundation.js`**, four functions, all addition-only:

| Function | Shape | Why |
|---|---|---|
| `renameNoteFolder` | transaction | no tree needed; I11 — a blank name is refused, not stored |
| `reorderNoteFolder` | transaction | `order` is display only; nothing is keyed by it (I5) |
| `reparentNoteFolder` | read, then transaction | judging a tree needs a query, and a transaction cannot run one |
| `retireNoteFolder` | read, then transaction | I4 — retire, never destroy |

Each sends **only** its own field. `tenantId`, `ownerPersonId`, `ownerUid`, `folderId`, `semanticRole` and `createdBy` are never sent, and the candidate Rules refuse them as well, so neither side is the only guard.

**`journey-map-service.js`** — `renameFolder`, `reorderFolder`, `moveFolder`, `retireFolder`. Deliberately thin: a wrapper that validated anything of its own would be a second, divergent copy of ADR-010, which is the drift ADR-009 closed for `noteSources`.

## 5. Two things derived, not decided

**Retiring a folder is refused while it still has active children.** This is read out of the accepted Rules, not chosen: `parentOneHopOk()` requires a parent to be `status == 'active'`, so **the moment a parent is retired every update to a child is denied — including the re-parent that would rescue it.** Retiring first and tidying after would strand a whole subtree beyond reach of its own author. The refusal **names** the children, because a refusal a person cannot act on is a dead end.

**A retired folder's placements are deliberately untouched.** Same asymmetry as P5-E and P6-C, same reason: retiring never rewrites the relations pointing at the thing retired (I4 keeps them), and the read side already excludes a retired folder through `listNoteFoldersForOwner()`'s active-only default. Cascading would destroy the record of where a Note had been filed.

## 6. A guard caught me, and the code was changed rather than the guard

The insertion-only guard in two boundary suites went red: my edit **removed one line** from `note-foundation.js` — the import statement, rewritten to add `isSystemFolderRole`.

A legitimate change, and the guard was still right to object. The fix was to stop needing the import: `reparentNoteFolder()` now sends the whole proposed folder back through `journeyFolder()`, exactly as a create does, which is what refuses a system folder gaining a parent. **Better design as well as a green guard** — this file now holds no second copy of ADR-010 §3, and the diff is pure insertion again.

## 7. One near-miss worth recording

Four boundary suites reported `0 passed, 13 failed` and identical counts on a clean `git stash` — which read like four guards rotting on `main`. **Reading the failure text rather than the counts settled it in one line:** `ENOENT … scandir '…/tools/i18n-verify/app'`. They resolve paths from `process.cwd()` and I had run them from the wrong directory. From the repo root, all four are green.

**A suite that fails loudly when run from the wrong place is behaving correctly.** What was nearly wrong was the finding I almost recorded — the same discipline as *"a failing check is a wrong assertion surprisingly often"*, applied to the harness's own invocation.

## 8. `layout.mjs` exits non-zero on `main` itself

Worth recording because it will mislead the next round. `layout.mjs` counts the **22-entry pre-existing missing-ID list as a regression once per viewport** (line 87), so it reports "16 REGRESSION(S)" and exits 1 on unmodified `main`. **The signal is the `CHANGED:` lines, not the exit code.**

This round: `CHANGED: 0` at all 16 configurations, `getElementById` **250 → 250**, the same 22 missing, wheel widths, row counts, dock gap, dock visible and no overflow all byte-for-byte identical. And the comparison was set up so it **could** fail — the first run had no `app/_prev-quranrevival.html`, so the before side scored `null` everywhere and every metric read as CHANGED; the shim was built from `HEAD` and then deleted before coverage was re-read.

## 9. Verification

| | |
|---|---|
| `journey-map-contract.mjs` | 28 → **34** |
| `note-foundation-data-layer.mjs` | 47 → **77** |
| `journey-map-service.mjs` | 13 → **17** |
| `journey-map-boundary.mjs` | **13 / 0** — still unreachable, positive control fires |
| `study-note-boundary.mjs` | **17 / 0** — insertion-only restored |
| Phase 6 emulator | 53 → **58**, and **58 / 58 against the assembled deployment file** |
| Phase 5 emulator | **60**, unchanged |
| Phase 4 emulator | **53**, unchanged |
| `note-foundation-boundary`, `emulator-scaffold`, `firestore-index-requirements`, `rules-deployment-candidate` | 30 / 31 / 8 / 10, all unchanged |
| Translation coverage | **1,803 scanned / 47 missing** — unchanged, no new user-visible string |
| `layout.mjs` | **CHANGED: 0** at 16 configurations |
| `behaviour.mjs` | **976 / 1** — the whole file, the 1 being the TLS artefact below |

**No new index.** Every query added reads through `listNoteFoldersForOwner()`, which is equality-only and bounded — `firestore-index-requirements.mjs` confirms it at 8 / 0.

**Six failures remain across the whole harness and all six are ONE environmental cause**, established by reading the text rather than the counts: `net::ERR_CERT_AUTHORITY_INVALID`, the sandbox's own proxy CA, tripping every `no page errors` check on a page that fetches over HTTPS — 1 in `behaviour.mjs` (31e), 2 in `quran-word-card-rendered`, 3 in `quran-word-progress-rendered`. They will not occur on the Owner's machine. Recorded, not worked around: no retry, no skip, no `--ignore-certificate-errors`, because that flag would also hide a real certificate problem.

## 10. Flagged, not changed

- **The refusal reasons are not yet translated.** `folderTreeRefusal()` returns reason *strings* precisely so a surface can turn them into sentences; the data layer wraps them in `Error` messages that are developer-facing today. **When a Phase 6 surface is built, every one of those reasons needs a translated sentence** — I11 — and `too-deep` is a new one.
- **A re-parent is still two reads and a write, not atomic.** Same stated race as `createNoteFolder()`: two concurrent moves by the same person could close a cycle, and the Rules cannot catch it either. This is why every walk of this tree is bounded. The server-side fix (`ancestorIds[]` + `depth`) remains **recorded, not adopted** — item 7 in the pending ledger, an Owner decision costing the ability to move a folder at all.
- **Nothing was wired to a page.** P6-D is data layer and policy. A Journey Map surface is a product decision (ADR-010 says so explicitly) and sits behind the same Rules-and-indexes gate as P5-D.

---

*Master Architect audit: BR-0, additive, no accepted decision changed, no Owner Control Gate crossed. The task was chosen precisely because the accepted Rules candidate had already decided what it implements.*
