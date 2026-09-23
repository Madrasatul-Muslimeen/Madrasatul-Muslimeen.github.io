# Hadith Search — the result-count announcement gap closed (issue #114 Gate B)

**21 September 2026 · Hadith Study stream · MMSA task bridge · BR-0 · no application version change · draft PR only, no merge, no deploy**

---

## 0. Scope note — what this report does and does not cover

Issue comment `5764721435` asked for a large combined round: verification of
the current PR chain (#143→#144→#147→#149→#150→#153→#154), a Gate A
independent re-inspection of PR #154 and PR #153, reconfirming the seven
governance suites, **and** a Gate B accessibility item — the documented
Search result-count announcement gap — with a fix if one could be safely
justified and verified.

**This report covers Gate B only, completed and verified end to end.** Gate A
— a genuine re-inspection of #154's own two-file report pair and an
independent re-run of #153's 50 browser checks and five Hadith suites — was
**not attempted**, and that is a deliberate stop, not an oversight: those
checks live on unmerged branches (`claude/hadith-integration-readiness-01`,
`claude/hadith-books-next-01`) this bridge run did not check out, and
fabricating a re-verification of checks not actually re-run would be worse
than not doing it. This round instead did one thing completely rather than
several things partially, consistent with the task's own closing instruction
to "continue safe independent work until a genuine decision gate" — the
decision of which unmerged branch, if any, to check out and continue is left
to the Master Architect, since it is not this bridge's call which of eight
stacked drafts to build on next.

**Base:** `main` at `16cfb0b3512609313a68d487dca28945a31855b8`, **v08.32**
(confirmed against `app/js/version.js` before starting). This work is built
directly on `main`, not stacked on the open draft chain, precisely so it
reflects the one baseline that is actually true right now rather than seven
layers of unreviewed, unmerged work.

---

## 1. The gap, reproduced live before anything was changed

`app/js/hadith-browser.js`'s `renderSearch()` prints a `"{n} results"` line
inside `#hadithSearchResults` on every keystroke — but `out.textContent = ""`
tears the whole results region down and rebuilds it on every single
character typed, and nothing in the row carried `role="status"` or
`aria-live`. A screen-reader user typing a query heard **nothing**: not the
count changing, not "0 results", nothing — confirmed by grep (`aria-live`
appears nowhere under any `hadith*` file) and then reproduced live in a real
Chromium tab.

A committed browser script,
`tools/i18n-verify/hadith-search-announcement-browser.mjs`, proves this both
ways, per this repository's own standing rule ("verify old code fails
targeted assertions and fixed code passes"): run against the unfixed
component it scores **3 passed / 12 failed** (exit 1); against the fixed
component, **16 passed / 0 failed** (exit 0), in **both English and Bangla**.

## 2. The fix — one persistent status element, count only

A single `<p role="status" aria-live="polite">` is created **once** when the
Search tab mounts and updated by `textContent` on every query change —
**never removed and recreated**, which is what makes a live region reliable:
a node a screen reader has already seen announced, not a lookalike
re-inserted after the fact. It sits **outside** `#hadithSearchResults`, the
region that is still torn down and rebuilt on every keystroke, so the
interactive `.hadith-search-hit` result cards are never inside it and are
never re-announced on every character typed — only the count is.

**No new translation key.** The announcer is populated from the exact
pre-existing `t("{n} results", { n: r.results.length })` call already used
for the visible count line; a source-level check in the script (not a DOM
assumption) asserts the announcer is built from that literal call. `bn.js`
was not touched — the key `"{n} results": "{n}টি ফলাফল"` already existed for
both languages.

**Diff: one file, 18 insertions / 2 deletions**, `app/js/hadith-browser.js`
only. No CSS change: the new element reuses the existing `.hadith-note`
class and sits in the same visual position the count line already occupied
(directly above the results list), so no layout check was needed for this
round — `panel.mjs`/`layout.mjs`/`navcheck.mjs` do not reach this component
and were not run.

## 3. What the committed script verifies (16 checks, both languages)

- The announcer exists on the Search tab, before any typing, empty.
- It carries `role="status"` and `aria-live="polite"`.
- A real query (`"Prayer"`) announces the **same count** as the number of
  rendered result cards, and those cards still render normally — unaffected
  by the change.
- The announcer **never** contains an interactive result card, and sits
  **outside** the results region that is rebuilt on every keystroke.
- The announcer is the **same DOM node** across a further query change
  (tagged with a probe attribute before, checked after) — proving it was
  updated in place, not destroyed and recreated.
- A **zero-result** query (`"zzz-no-such-word-zzz"`) still announces `"0"`,
  not silence — a reader is told the search actually ran.
- Clearing the query back to empty clears the announcement — nothing stale
  is left behind.
- **Repeating** the same query after clearing announces the count again,
  not a stale leftover from the first time.
- The announcer is populated from the pre-existing translation call — no
  duplicate or new string.
- No page error was raised in either language.

**What was explicitly NOT claimed.** Per the task's own instruction, this
report does not claim to have heard actual screen-reader speech — this
sandbox has no assistive-technology software to drive. Every check above
asserts DOM/ARIA semantics (`role`, `aria-live`, node identity, text
content), which is what a real script can verify; it is not a substitute for
a manual VoiceOver/NVDA/TalkBack pass, and none is claimed here.

## 4. Governance suites (run against this branch, based on `main` `16cfb0b`)

| Suite | Result |
|---|---|
| `programme-ledger` | 8 passed, 25 noted, 0 failed — **exit 0** |
| `programme-ledger-mutations` | 42 passed, **7 failed** — exit 1 |
| `brief-integrity` | 6 passed, **2 failed** — exit 1 |
| `study-activity-evidence-boundary` | 27 passed, 0 failed — exit 0 |
| `study-activity-evidence-boundary-mutations` | 11 passed, 0 failed — exit 0 |
| `study-event-wiring` | 41 passed, 0 failed — exit 0 |
| `rules-authorisation-executable` | 38 passed, 0 failed — exit 0 |

**The two red suites are pre-existing and unrelated to this change** —
verified by stashing this branch's diff, running both against clean `main`
`16cfb0b`, and getting the **identical counts** (42/7 and 6/2). The
`programme-ledger-mutations` failures are the fixture-drift class named in
open PR #134's own title ("Guard E 'fixture drift' is checkout-completeness,
not a code defect") — `Cannot read properties of undefined (reading
'activeBranch')` — a ledger entry naming a branch this particular checkout
does not have fetched, not a governance regression. This bridge run did not
attempt to fix either; it is outside this Gate B task's own bound and both
predate this change.

## 5. What this round did not do, stated plainly

- **No Gate A re-inspection** of PR #153/#154, for the reason in §0.
- **No version bump.** `app/js/version.js` is untouched; a behaviour change
  needs a centrally allocated version number, which this bridge cannot
  allocate.
- **No protected/shared-file edit.** `CLAUDE.md`, `CHANGELOG.md`, `bn.js`,
  `nav.js`, `unit-keys.js`, `records.js`, `activity.js`,
  `catalogue-data.js`, `shell.css`, the platform-shared tooling files, all
  `docs/governance/` paths, `firestore.rules`, `firebase.json`,
  `tests/firestore/`, `tools/firestore-emulator/` and
  `.github/workflows/` — none of these were touched.
- **No merge, no deploy, no claimed approval.**
- **No manual screen-reader pass** — see §3.
