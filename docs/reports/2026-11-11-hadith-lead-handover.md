# MSA · Hadith Lead — handover, 11 Nov 2026 (about 1:15 pm Sydney)

Written by the Hadith Lead (03B) at the PCA's context rule (hand over at about 30% used). Keep this short; read `docs/reference/2026-11-11-hadith-book-pages-plan.md` for the full job.

## Contacts (ids change often: the live PCA is in PCF `meta/global.sessionUrl`)
PCA 35L `session_01PL2xbJG7YpMtgc2Z4so2y7` · MSA Architect 98L `session_01PL2xbKJpJBPFyWmKuCNia6` · BwN 11L `session_01PL2xbM5RCUtvaXJTiozBPd` · Dua Lead (ask the PCA).

## State
- **Shipped earlier:** card colours + terms fold (v13.51), Text-pane terms fold (v13.52). Nothing of those is open.
- **The Owner's job (10–11 Nov): "Original book page"** on a Hadith card: the real scanned printed page in a pop-up pane (archive.org Darussalam scans), credit line, "Download this book", Dua cards included; Shamela for books with no scan; start Bukhari then Muslim, Tirmidhi, Abu Dawud, Nasa'i, Ibn Majah, then the rest.
- **With the Architect 98L for release (expected v14.24):** branch `claude/hadith-book-pages-bukhari`, head `953906a9` (my work to `811a0290` + its review commit `c9be8cc7` + main merged). Five books live: Bukhari, Muslim, Tirmidhi, Abu Dawud, Ibn Majah. **Do not move that branch's head.** The Architect kept my two Dua lines (`dua-browser.js`).
- **My working branch for more:** `claude/hadith-book-pages-more` (main-line merged; nothing new on it yet except the plan note on BwN hold and this handover).
- **BwN hosting is ON HOLD (copyright):** BwN asked the Owner A) archive.org link only, B) host only free texts, C) get Darussalam's permission. Keep `mirrorUrl` empty; "Download this book" stays archive.org.

## Findings that decide the next steps (all measured 11 Nov)
- archive.org's **embed** shows the right scan page in an iframe (works at phone width); a **direct PDF fetch is blocked by CORS**, so no PDF.js on archive.org files.
- **Nasa'i is BLOCKED:** Darussalam numbering differs from our English text's (our #288 = Anas, scan [288] = Maimunah); a number map would show wrong pages. Needs a content-aligned bridge. Registry row is `status: blocked`; builder already supports two-file books.
- **Muwatta's scans in that archive item are NOT a printed edition** (a "Hadith Collection www.hadithcollection.com" web printout, no hadith numbers). **Musnad Ahmad's scan is image-only** (no text layer). Neither is usable for page links: use the Shamela route.
- **Shamela (shamela.ws) works as a printed-page source:** `https://shamela.ws/book/<id>/<index>` opens one page; the title says `ج<vol> - ص<page>` and the chapter. For Sahih Muslim (id 1727) index 10 = vol 1 p. 9 (index = page + 1 in volume 1). Our OpenITI Arabic files carry `PageVnnPnnnn` marks (volume/page) and some file names carry Shamela ids: Muslim 1727, Muwatta 28107, Ahmad 25794, Riyad al-Salihin 12014, 40 Nawawi 12836. The JK-numbered books (Bukhari, Abu Dawud, Tirmidhi, Ibn Majah, Nasa'i, Darimi, Adab al-Mufrad, Adhkar) need their Shamela ids matched and the edition checked.
- Tirmidhi hadith 1 maps to a chapter heading (known, small).

## Next steps (in this order)
1. **Shamela spike (about 1 day):** (a) does shamela.ws load inside our pop-up iframe (no frame-blocking header seen on a HEAD; test a real GET in Chromium); (b) volume/page → index: probe a book's titles (`ج<vol> - ص<page>`) by binary search to find where each volume starts, then `index = start[vol] + page - firstPage[vol]`, verified at spot checks. Build `shamela-pages-build.py` beside `book-pages-build.py`; registry row gets `shamelaId`, `volStarts`.
2. **Button for books without a scan:** the card's `pageRefs` (OpenITI marks) → Shamela index → same pop-up pane, label "Printed text (Shamela, ed. …, vol N p. M)"; scan stays first when a book has one.
3. **Nasa'i bridge** (content-aligned) only if the Owner wants it.
4. **Download to the device:** blocked by CORS and the BwN hold; plan section 8/10/12.
5. Ask the Architect for the live head before pushing anything new; branch from main; Hadith files only; no merge; no version.

## Rules to keep
lead120 (Hadith files only, own branch, no merge, no version) · the Owner's word overrides the PCA · saw128 and the terms rule (`terms1108`) · J109 ON/OFF switch · review rule: 360 to 1440, en/bn, 100/150/200%, screenshots looked at, every check proven by a mutation (an uncaught throw is not a caught mutation) · hand over at about 30% context used.

## Sandbox lessons added
- `node serve.js` dies quietly: `curl localhost:8080`, restart in the background.
- Playwright: `ln -s /opt/node-tools/node_modules node_modules` at the repo root (git-ignored) so the suites import it.
- A suite plus `--prove` takes minutes: run with `run_in_background`, and do not edit source files the run reads while it is going.
- archive.org is reachable from the sandbox now (the old note is out of date); fetch an item's `_djvu.xml` for its text layer. Sunnah.com and Dorar.net answer 403 (Cloudflare) from here.
- A names-only cross-check is weak: always print a control (the same texts against a wrong page); Nasa'i's 67% was the warning.
