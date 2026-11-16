# Hadith Lead 16L handover (16 Nov 2026)

Written by 16L (opened 2:50 pm Sydney by PCA 47L, taking over from 15L) at about 34% of context, once both pending jobs of the 15L handover were built and in review. Read CLAUDE.md, the PCF General rules (carry1115, keep1116, one1116, pro1118) and MSA J106, then `docs/reports/2026-11-16-hadith-lead-15l-handover.md` (still true for everything not changed here), then this file.
Rule carry1115: every pending job and every Owner decision still waiting is listed, item by item.

## Who is who
- Architect: MSA 114L `session_01PL2xbM9Zjm9C1HJL8HQXH4` (always read PCF `p/mmsa.sessionUrl`). PCA: 47L `session_01PL2xbKhJA7GaBcREifMLj8`. Dua Lead 11L.
- New General rule **one1116**: write the PMS ONCE per finished job (Done line with W-T-P-E-O, monitor, act stamp, the Owner's chat answers with words and time); not at every step. Exceptions: a new tick-box question, a handover, a job stopped part-way. **16L wrote nothing to the PMS** (no job was finished until the Architect merges); the Done lines to write are below.
- Pro plan from 18 Nov (guide G02): Hadith jobs then go to the MSA Architect and the Lead parks.

## Done this session
- **#1777** (open, CI green, marked ready): Know Your Status Bangla words editable by the owner or a prime (the Owner's n106j 2.A). Pure module `app/js/hadith-kys-words.js` (the 40 sources = bn.js `(Know Your Status)` lines, key `kys__<slug>`, placeholder check); `kysT()` and `renderKysWordsEditor()` in `hadith-names.js`; stored in `hadithNames` (no Rules change); Restore retires (I4). Demo-first rule: I took the Owner's words as the tick, said so in the PR. New suite `hadith-kys-words-browser.mjs` 53/0, mutations 9 of 9 reachable caught (`noguard` is unreachable behind the hidden button, noted in the suite). I9: Know Your Status now calls `primeNames` when its view opens. Needs a version and a What's New line from the Architect.
- **#1778** (open, ready): printed pages (Shamela) for the three books that had none: 'Amal al-Yawm by an-Nasa'i (Shamela 6772, 1148 of 1148), by Ibn al-Sunni (13132, 766 of 770), Nawawi's al-Adhkar (1956, 1255 of 1263), keyed by our record order `n`. New tool `tools/hadith-data-pull/shamela-pages-anchors.py` (rare 6-word phrases vote; the opening-words tool was fooled by shared isnads: 49% and 43%). New suite `hadith-amal-adhkar-pages-browser.mjs` 114/0, 10 of 10 mutations caught, hand-read anchors on live Shamela. Needs a version and a What's New line from the Architect. After it merges, every library book has an original page.
- #1775 (Nasa'i tier C) was already merged when I started.

## Done lines for the PMS (write them when the Architect merges)
- MSA J106 / 16 Nov: "Know Your Status Bangla words: the owner or a prime can correct them in the app (Edit Bangla words on Know Your Status). PR #1777. W-T-P-E-O: Wise (n106j 2.A, no Rules change), Timely (built the day asked), Precise (53 checks, mutations proven, screenshots looked at), Elegant (reuses the Edit names pattern), Optimal (no new tools, one read already made)."
- MSA J106 / 16 Nov: "Original pages for the last three books with none ('Amal al-Yawm by an-Nasa'i and by Ibn al-Sunni, al-Adhkar): printed Shamela page on the hadith card. PR #1778. W-T-P-E-O: Wise (Owner's n106j 3.A), Timely, Precise (anchors read on live Shamela, 114 checks, mutations), Elegant (same pop-up as the other books), Optimal (free source, one tool for any isnad-heavy book)."

## Pending (rule carry1115)
1. Review and merge #1777 and #1778 (the Architect's). Nothing more for the Lead to build on them unless a review asks.
2. Optional: emulator check of the Know Your Status bookmark payload against the bookmarks Rules (unchanged, not started).
3. Optional (new): the Bangla UI strings in #1777 (11 `// ?` lines "J106 Know Your Status words") and the Bangla titles/editions of the three books in `hadith-book-pages.js` are mine; the Owner may correct them.
4. Nothing else open for the Hadith module.

## Still waiting on the Owner (unchanged from 15L's list, none answered since)
- **n106h**: Bukhari My index, what a tap on a book opens (ticked in the PMS, no answer written; keep as waiting; built as B, v14.28).
- Bangla names: book 46's full name; book 65 (Tafseer) range 4,474 to 4,977; the group names; the Learning Stories from Hadith Bangla line; the Loving Rasulullah Sallallahu A'laihi Wa Sallam wording; new Subject names; other `bn.js` `// ?` strings. The names editor for books and groups is live, and from #1777 the Know Your Status words have one too.
- The two small-phone layout questions on the Hadith bar; more marking levels ("I will make more marking levels on the Go"); naming of bab sub-chapters.
- The Owner has not yet checked Know Your Status on a phone and a computer (nor the gold ring, nor the new words editor).

## Lessons from this session
- **A first-words matcher fails silently on shared openings, and the failure travels forward.** One false match put the cursor past the truth and every later record failed. Match by rare phrases and take the longest non-going-back run; verify by two independent halves of each record's own anchors, then hand-read anchors on the live page.
- **Shamela changes its page template.** The old "text-center margin-top-20" end marker was gone, so the whole page (menus, scripts) joined the word stream (1.18M words for a 608-page book). A word count far above pages x ~400 is the tell. Search is JS-driven (no HTML results): find a book's Shamela id with a web search restricted to shamela.ws, and its last page index by binary search on /book/<id>/<n> (404 past the end; indexes are not printed pages).
- **A redundant guard cannot be mutation-proven; say so in the suite** rather than leaving a MISSED (`noguard` in the KYS suite). A mutation that is missed is a finding: here it was a second layer, and `dropvars` was missed for a real reason (no check read the filled text) until a check was added.
- **An English label inside the Know Your Status page is on the light page, not inside a night card**: `[data-card-look="night"]` rules paint it pale. Looking at the 390/1280 screenshots caught it; no measurement did.
- **A saved change redraws the page and the panel reopens by itself** (the `editorOpen` flag): a test that taps the "open" button again toggles it shut. Use "open only if not already open".
- Force-push is refused here (15L's lesson stands): new branch, new PR. The session starts on a detached HEAD at main.
- The `check()` suites run from the repository root with `node_modules/playwright` symlinked to `/opt/node22/lib/node_modules/playwright` and `node serve.js` running. `bn-duplicate-keys.mjs` fails its git-history step on this shallow clone with or without a change.
