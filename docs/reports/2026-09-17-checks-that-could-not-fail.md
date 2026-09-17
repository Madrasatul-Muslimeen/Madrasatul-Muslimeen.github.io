# Sweeping the harness for checks that could not fail

- **Date:** 2026-09-17
- **Task:** find and close every check in `tools/i18n-verify` that passes regardless of what the code does
- **Blast radius:** **BR-0, tools only.** `git diff -- app/` is empty. No Rules, index or config file touched.
- **Application version:** **08.25, unchanged.**
- **Result:** ACCEPT. 14 runners hardened, **3 checks that had never once run** exposed and fixed, and **one real application behaviour discovered** that a broken check had been hiding since it was written. `behaviour.mjs` **978 / 1**.

---

## 1. Why sweep now

Three separate "this check cannot fail" defects turned up in a single day's work — my own `approachInMore || anyApproachSelect`, my own hardcoded `"folder,person"`, and a create-payload regex that matched nothing. The brief already carried the lesson from v08.25's `async`-body runner. **A lesson that keeps recurring is a missing sweep.**

## 2. What a "cannot fail" check looks like here

| Shape | Why it always passes |
|---|---|
| `check(name, async () => …)` in a **synchronous** runner | the assertion throws into an uncaught promise; the case prints PASS |
| a **promise** passed as a `condition` to a value-style runner | a promise is always truthy |
| `A \|\| B` where B is "the thing is absent" | absence satisfies the check the absence should fail |
| `(x \|\| "")` fed to a *negative* regex test | an empty string matches no forbidden pattern |

The first two are structural and can be closed once, for good. The last two have to be read case by case, because `(x || "")` is *correct* defensive style in a **positive** test — `BANGLA.test(r.h1 || "")` fails properly when `h1` is missing. It is only a hole when the test is negative, or when the alternative branch is the failure condition.

## 3. The runners: 14 hardened

Of 27 files with a `check()` runner: 8 already guarded (all written after the lesson), 4 `async` runners which are safe by construction, and **15 unguarded** — 12 synchronous function-style and 3 value-style. All 14 that needed it now refuse loudly:

- function-style: `const r = fn();` then throw a `TypeError` if `r` is thenable;
- value-style: throw if the condition itself is a promise, naming the check.

All three shapes are mutation-proven: an `async` body added to a one-liner runner exits 1, to a try/catch runner prints `FAIL … check() is synchronous`, and a promise condition throws by name.

## 4. The defect the sweep existed to find

`quran-word-progress-model.mjs`:

```js
check("the module exposes NO event-to-state projection", async () => { … });
```

**This check had never run.** Its body asserts that `quran-word-progress.js` exposes no way to derive a word state from a study event — one of MAP Phase 3's locked distinctions, *"It is not an Approach claim and must never become one."* The assertion threw into an uncaught promise and the case printed PASS every time.

Fixed by removing the `async`. It then passed on its merits, and — because a check that has never run has earned nothing — that was verified by mutation: adding `export function projectFromEventType(eventType)` to the module makes it fail with *"a state must never be derivable from a study event in this module."*

## 5. The application behaviour a broken check was hiding

`behaviour.mjs` had:

```js
check("3a page did NOT reload", bn.marker === undefined || bn.marker === "kept");
```

`window.__marker = "kept"` is set **before** the language switch, so a reload is exactly what makes it `undefined`. **The check passed precisely in the case it was written to catch.**

Tightened to `=== "kept"`, it failed: `marker=undefined`. That is a finding, not a conclusion, so a probe settled which kind it was. The marker really is set, really survives opening the Home menu, and is wiped by the switch with **exactly one main-frame navigation to the same URL**.

So the page reloads — and `prefs.js` says that is deliberate, in its own words:

> *The default reaction to the language changing: reload, so every name on the page comes back in the new language. **Blunt on purpose** … the only way to be certain a page with a dozen independent render functions is fully re-rendered. Pages that can re-render in place cheaply pass their own handler instead.*

`about.html` does not pass one. So this is a **stale assertion, not an application defect** — and the check's own name had been describing a design that was never the default for that page.

**The assertion is inverted rather than deleted, which is stronger than either.** A page that silently stopped reloading would show half-translated content, and that now fails here. What section 3 really proves — the language round-trips and no Bangla leaks back into English — was never affected and still passes.

**And the second half needed a positive control.** After the first switch reloads, the marker is gone; without re-seeding it, the matching check on the way back would have been about an already-absent value and would have passed whatever happened — the same hole, one line later. The marker is re-seeded and its presence asserted before the second switch.

## 6. Two more absences that satisfied their own checks

- **`!r.intro || BANGLA.test(r.intro)`** across nine module pages. Not every page has a long paragraph, so the tolerance is legitimate — but on its own, a page that *lost* its intro passed. Presence is now reported in the diagnostic and **counted**: a new check requires at least 7 of the 9 pages to carry one, so a wholesale loss fails while an individual absence stays allowed.
- **`!/owner|prime|teacher|guardian/i.test(r.tenantOpt || "")`.** An empty string matches no role name, so a page with **no tenant picker at all** passed "role names in the tenant picker are Bangla". The picker's presence is part of the assertion now, and the diagnostic says `NO PICKER` rather than nothing.

## 7. Verification

| | |
|---|---|
| `behaviour.mjs` | **978 / 1** — the 1 is the sandbox TLS artefact; 979 checks total |
| `quran-word-progress-model.mjs` | 56 / 1 → **57 / 0**, and mutation-proven |
| The other 13 hardened suites | unchanged counts, all green |
| Every MAP suite | unchanged (contract 34, data layer 95, services 32 / 18, boundaries 13 / 17 / 30 / 17 / 16, authorisation 38, index requirements 8, deployment candidate 10) |
| Translation coverage | **1,803 / 47** — unchanged |
| `git diff -- app/` | **empty** |

The two rendered suites still report 2 and 3 failures; all five are the same `ERR_CERT_AUTHORITY_INVALID` proxy artefact, unchanged and environmental.

## 8. What this sweep did NOT do

- **It did not read every assertion.** It closed the two *structural* shapes completely and the two *readable* ones where a grep could find them (`||` inside a check condition). A check that is wrong about its subject rather than unable to fail is still only found by reading it — which is how the section-42 excavation found twelve earlier today.
- **`layout.mjs`, `reading.mjs`, `panel.mjs` and `navcheck.mjs` were not swept.** They report through their own mechanisms rather than a `check()` runner; they deserve the same pass and did not get one.

---

*Master Architect audit: BR-0, tools only, no accepted decision changed, no Owner Control Gate crossed. One locked MAP Phase 3 distinction is now actually enforced rather than believed to be.*
