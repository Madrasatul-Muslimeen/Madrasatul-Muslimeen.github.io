# Audit part 122: Mapping My Journey is usable sooner on a slow phone

Source: PCF MSA J29, audit part 122, issue #1283 (follow-up of part 121). What is read and what any count shows are unchanged.

## 1. The 4.7 s, split (before; heavy account, phone line, Bangla)

Measured with `node tools/i18n-verify/heavy-account-speed-browser.mjs --page=journey-map.html --no-qr --profile=phone --lang=bn --dump`
(stub latency 150 ms per read; phone line 150 ms RTT, 1.6 Mbit/s).

| Span (ms from navigation) | What was happening |
|---|---|
| 0 – 560 | First paint (FCP 552–572). |
| 726 – 2,600 | The page's 60-odd JS modules arrive **five import levels deep**: a module is only discovered once its importer has arrived. |
| 2,604 – 3,366 | In Bangla, `i18n/bn.js` (460 KB) is fetched **last**: `i18n.js` awaits it at evaluation, and evaluation starts only after the whole static graph is fetched. |
| 3,373 – 3,830 | Sign-in/identity reads (4) then the 34-read burst; **folders arrive at ~3,830**, the tree is drawn. |
| 3,830 – 4,732 | Notes and placements page one cursor after another (the stub's ids fall in one shard, so 6 sequential pages of 150 ms) and fill the counts. |

- **Time waiting on reads:** 34 reads, ~1.35 s of the 4.7 s (identity 300 ms, the folder burst 150 ms, the paging tail ~900 ms).
- **Time in script:** none to speak of. **Long tasks over 50 ms: 0** (max 0) in all four profiles.
- **Time drawing:** below the long-task threshold (888 nodes; scroll max 34 ms).
- **Download of modules and the Bangla catalogue: ~3.4 s, the biggest part.** This is the cost the app controls.
- **What the suite's "ready" waits for:** the later of first paint and the last Firestore read (the end of the paging tail).
  **The folder tree is drawn and tappable as soon as the folders arrive (`refreshAll()` already draws before notes and placements land)**,
  so the tree was usable ~900 ms before "ready"; counts show "loading" in words until the tail ends. Nothing to change there.

## 2. The change

`app/journey-map.html` only: one small head script adds `<link rel="modulepreload">` for the 23 deep modules (every file the page imports anyway) and,
when the stored language is Bangla, the three catalogue files, so they download in parallel with the shallow modules instead of after them.
No read, count, string or order changed. (The paging tail is the stub's shard layout and the covered Owner choice from part 121; left alone.)

## 3. After (same suite)

| Profile | Metric | Before | After |
|---|---|---|---|
| phone / bn | folders in hand ("tree") | ~3,830 | ~3,500 (3,498 on the checking run) |
| phone / bn | ready | 4,710–4,734 | 4,398–4,402 |
| phone / en | folders in hand | ~3,180 (3,181 mutated) | 2,966 |
| phone / en | ready | 3,958 | 3,867 |
| desktop / en | ready | 1,480 | 1,467 |
| desktop / bn | ready | 1,506 | 1,509 |

Honest reading: a gain of ~0.2–0.35 s on the phone line (more in Bangla; run-to-run noise is ~0.5 s, one mutated Bangla run measured 4,567 ms for the tree).
The remainder is download bandwidth (the same bytes over 1.6 Mbit/s), which the page cannot reduce without removing code, a larger change left out here.
Desktop is unchanged within noise. Long tasks: still 0.

## 4. Suite

`heavy-account-speed-browser.mjs` gains, for `journey-map.html`: "the page hints its deep modules (and, in Bangla, the catalogue)" (≥ 20 `modulepreload` links, `i18n/bn.js`
among them in Bangla) and, on the phone line, "folders in hand by N ms" (3,700 bn / 3,400 en, margin ≥ 200 ms over the measured values).
`--mutate=no-preload` turns the hints into `prefetch`: **3 checks fail** (hints en, hints bn, tree bn 4,567 ms > 3,700). `--dump` prints every read and module timing.
Phone run: 18 passed, 0 failed; mutated: 15 passed, 3 failed.

## 5. Other suites

| Suite | Result |
|---|---|
| `journey-map-screen.mjs` | 47 passed, 0 failed |
| `notes-way-back-browser.mjs` | 33 passed, 0 failed |
| `shared-pages-way-back-audit-browser.mjs --page=journey-map.html --max=30` | 0 passed, 0 failed (0 checked; as on `main`) |
| `journey-map-counts.mjs` / `journey-map-path.mjs` | 9 / 32 passed, 0 failed |
| `journey-tray-browser.mjs` / `note-opens-in-journey-browser.mjs` | 227 / 60 passed, 0 failed |
| `journey-map-back.mjs` | 37 passed, **1 failed** ("opened directly: the Back button points at Quran Study", href `quranrevival.html?navBack=1`); **identical with my change stashed**, so pre-existing |
| `behaviour.mjs` | 971 passed, 0 failed |
