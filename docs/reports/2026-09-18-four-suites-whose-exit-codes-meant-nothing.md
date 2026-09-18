# The four suites whose exit codes meant nothing

- **Date:** 2026-09-18
- **Task:** finish the "checks that could not fail" sweep on the four suites that report through their own mechanisms rather than a `check()` runner
- **Blast radius:** **BR-0, tools only.** `git diff -- app/` is empty. No Rules, index or config file touched.
- **Application version:** **08.25, unchanged.**
- **Result:** ACCEPT. All four now exit meaningfully, each proven in **both** directions. One real measurement defect fixed. One pre-existing, user-visible truncation recorded for the Owner.

---

## 1. Why these four were left out, and why that was wrong

The previous sweep closed the `check()` runners and said plainly that `layout.mjs`, `reading.mjs`, `panel.mjs` and `navcheck.mjs` "report through their own mechanisms … and deserve the same pass". They did, and it was worse than expected: **not one of the four had an exit code that carried information.**

| Suite | Before |
|---|---|
| `layout.mjs` | **Exited 1 on unmodified `main`** — it counted the 22 pre-existing missing `getElementById` targets once per viewport. And it **exited 0 for a real geometry change**: a changed `headingTop`, `wheelWidth` or `gapAboveDock` was *printed* as `CHANGED:` and never counted. |
| `reading.mjs` | Counted `problems` and then **had no `process.exit` at all** — always 0, whatever it found. |
| `panel.mjs` | **No counter and no exit code**, while printing its own `!!` warnings and a summary line containing the word `REGRESSION` in capitals. |
| `navcheck.mjs` | Exited correctly, but counted the **pre-existing** 320px English truncation of "Operation"/"Bookmark", so it was permanently 1. |

**Two of them could not report a failure; two could not report a success.** Either way no caller could act on the result, and the one measurement this project relies on most — "measure before and after" — was being read by eye every round because the number could not be trusted.

## 2. `layout.mjs`, the worst of the four

Three changes, each proven:

- **The shim trap is loud now.** Without `app/_prev-quranrevival.html` the whole "before" side measures `null`, every metric reads as CHANGED and the run looks catastrophic while proving nothing. It **exits 2** with the fix spelled out, instead of producing 16 meaningless regressions. This file's own standing lesson finally enforced rather than remembered.
- **A CHANGED metric counts.** That is what the suite is *for*.
- **The 22 missing ids are a baseline, by name.** A *new* missing id fails; a baselined one that comes back is reported, so a fix is not discovered by accident.

| State | Exit |
|---|---|
| no shim | **2**, with instructions |
| shim identical to the page | **0** — `NO LAYOUT REGRESSIONS` |
| a 23px shift injected into the page | **1** — `10 × !! CHANGED` |

All three measured, not argued. Before this round the middle row exited 1 and the bottom row exited 0 — **exactly backwards.**

## 3. A real measurement defect in `panel.mjs`

Its select-truncation flag was `cut: need > w - 22` (the 22px allows for the dropdown arrow). A **hidden** select measures `w = 0`, and `need > -22` is always true — so every off-screen select was reported as truncated:

```
selects truncated: unitNumSelect "1" 0px needs 8px; ayahSelect "1" 0px needs 8px
```

Harmless while it was only printed. **A false failure the moment I counted it** — my new clause reported 48 problems, all of them this. Fixed at the source, so the printed line is honest too: a hidden control is reported as `not on screen`, and `cut` requires `w > 0`. This is the "a measurement probe must carry the real element's computed style" family — a probe that measures something other than what it claims.

## 4. One pre-existing truncation worth the Owner's attention

With the hidden-select artefact gone, three **real** select truncations remain, printed by this suite all along and never counted:

- **`tenantSelect` — "Madrasatul Muslimeen (Owner, Prime)", 224px of text in a 145px cell.** The most user-visible of the three: **a real tenant's name is cut in the picker.**
- `surahSelect` — "1. Al-Faatiha", 74px in an 89px cell, tight once the arrow is allowed for.
- `unitTypeSelect` — the Study Unit names, same shape.

**Baselined by id, not silently tolerated**, and recorded here because the first one is a genuine (if small) thing a person sees. Fixing it is a layout decision on the most tightly measured screen in the app, so it is flagged rather than attempted.

## 5. The environmental failures are separated, not suppressed

`reading.mjs` reported **16 problems, every one of them** `ERR_CERT_AUTHORITY_INVALID` — the sandbox's own TLS proxy, which will not occur on the Owner's machine. Giving it a bare `process.exit(problems ? 1 : 0)` would have made it permanently red for a reason that is not this project's.

So page errors are classified: an error set that is *entirely* TLS artefacts is counted as environmental, printed, and does **not** fail the run; anything else is a real problem and does. `panel.mjs` got the same treatment. **Nothing is hidden — the counts are printed either way.**

## 6. Every fix proven by mutation

| Suite | Mutation | Result |
|---|---|---|
| `layout.mjs` | 23px of body padding | `1`, 10 × `!! CHANGED` |
| `layout.mjs` | delete the shim | `2`, with instructions |
| `navcheck.mjs` | rename a nav category to a long label | `1`, names the new truncation, keeps tolerating the baseline |
| `panel.mjs` | lengthen a study-options label | `1`, `!! NEWLY TRUNCATED: label "…"` |

Each mutation asserted its own occurrence count first — and **one did not apply** (`>Tajweed<` is not in the markup), which the assertion caught before anything false was concluded.

## 7. Verification

| | |
|---|---|
| `layout.mjs` | **EXIT 0** — `NO LAYOUT REGRESSIONS`, 22 of 22 baselined ids seen |
| `navcheck.mjs` | **EXIT 0** — nav fits, 2 baselined truncations tolerated |
| `reading.mjs` | **EXIT 0** — `READING SCREEN OK`, 16 environmental errors noted |
| `panel.mjs` | **EXIT 0** — `PANEL OK`, 34 baselined select truncations tolerated |
| `git status app/` | **clean** — every mutation restored byte-identical |
| Translation coverage | **1,803 / 47** — unchanged |

## 8. Flagged, not changed

- **The `tenantSelect` truncation is real and user-visible** (§4). An Owner decision about the most tightly measured screen in the app.
- **The baselines are honest but they are debt.** 22 missing ids, 2 nav truncations and 3 select truncations are now tolerated *by name*. Each list says what it holds and reports when an entry stops occurring, so none of them can quietly grow — but they are a record of things nobody has fixed.
- **`layout.mjs` measures English only**, as it always has. The Bangla numbers still have to be measured separately, which the brief already records.

---

*Master Architect audit: BR-0, tools only, no accepted decision changed, no Owner Control Gate crossed. Four suites that could not report their own result now can, and one of them had been reporting the opposite of the truth.*
