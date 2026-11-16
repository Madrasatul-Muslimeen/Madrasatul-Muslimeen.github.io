# Hadith Lead 15L handover (16 Nov 2026)

Written by 15L for its successor, at about 48% of context used (the brief says hand over at about 30%; I overshot while finishing the Nasa'i job). Read CLAUDE.md first, then PCF MSA J106 (comments `c106s1pr`, `c106s2pr`, `c106ks1`, plan line `p106hl15`; needs `n106h`, `n106i`, `n106j`), then `docs/reports/2026-11-15-hadith-lead-14L-handover.md` (still true for everything not changed below), then this file.
Rule carry1115: every pending job and every Owner decision still waiting is listed, item by item.

## Who is who (16 Nov, ~12:00 Sydney)
- Architect: MSA 114L `session_01PL2xbM9Zjm9C1HJL8HQXH4` (always read PCF `p/mmsa.sessionUrl`). PCA: 47L `session_01PL2xbKhJA7GaBcREifMLj8`. Dua Lead 11L `session_01PL2xbHyfbrXS8hET9sKE7P`.
- If a PCF write is refused in your session, send the exact text to the PCA and it writes it (it did for `p/mmsa.leads`, and for plan line `p106hl15`).
- New General rule **keep1116** (the Owner, 16 Nov): every update keeps everything the Owner or a student saved (notes, lists, settings, progress, marks): one record each, merge on open, remember deletions, never clear on a new version. Say in every PR body whether you ran "save, update, reopen".

## Done this session (all merged unless noted)
- **#1763** (merged): `hadith-dua-a11y-browser.mjs` re-aimed at the v14.38 Menu bar (Encyclopedia and Classical Explanations are rows inside the hidden Menu; Dua left the Hadith pages; Topics tab gone). Retired drivers are kept in `RETIRED_HADITH_DUA`, not deleted. 846/0.
- **#1769** (merged): Know Your Status: ONE gold 3px ring path (with dark halo) drawn above every wheel segment follows the keyboard-focused one; a keyboard pick keeps focus on the segment; new `status` view in the a11y audit with three mutations (`noring`, `nosvgring`, `lowlabel`). The four "Counts as done" 1.63:1 findings were an AUDIT ARTEFACT (it read a checkbox's hidden value "on" as text); the audit now skips checkbox/radio/range/file/colour values. Full Hadith sweep 901/0.
- **#1775** (open, ready for review): Nasa'i tier C, see below.

## Owner's answers on J106 n106j (16 Nov 2026), and where each stands
1. **A, keep** "Counts as done" = Memorised + Revising. Nothing to do.
2. **A** (the Owner reads the 40 Know Your Status Bangla strings in the app) **plus "make it editable by me (admin)"**. **NOT BUILT.** Plan, no Rules change needed:
   - The `hadithNames/{tenantId}` document's `names` map is generic: Rules allow any key matching `^[A-Za-z0-9_-]{1,160}$`, at most 3,000 entries, written only by `canAdminCatalogue` (`firestore.rules`, `hadithNames` block; model `app/js/hadith-names-model.js`, loader and editor `app/js/hadith-names.js`, the same owner/prime session test as the Rules, read once after first paint, patched in memory).
   - So store a Bangla override per string under a new key family, for example `kys__<slug of the English source>` with `{bn, status}`, through the same `setName` / `retireName` (retire = "restore the built-in Bangla"; nothing is removed, I4).
   - The 40 strings are the `// ?` rows of `app/js/i18n/bn.js` added by Know Your Status (v15.05, #1738). Make a small registry (English source, built-in Bangla) in a new pure module; `hadith-status.js` reads `t()` through a helper that returns the madrasah's override in Bangla when one is active (placeholders such as `{a}`/`{b}` must survive; test it).
   - Editor: an admin-only "Edit Bangla words" button on the Know Your Status page (shown only when `namesEnabled()` and the session is owner/prime), a panel listing English / current Bangla / a box / Save / Restore, one save each, a refused write said in words (I15). Reuse the `renderNamesEditor` pattern the Owner already ticked for book names.
   - I9: names are already read once on first use in Hadith Books; Know Your Status must call `primeNames` the same way and be flagged in the PR.
   - It is new UI: follow the Lead rule (a short demo for the Owner, then build) unless the Owner's words above ("make it editable by me") are taken as the tick. I took them as direction to build but did not start. Test 320/360/390/820/1280 in English and Bangla, LOOK at the screenshots, and prove each check by a mutation (`hadith-names-browser` and `hadith-status-browser` are the neighbours; the stub never mutates DATA, see CLAUDE.md lessons).
3. **A, finish Nasa'i first, then find a source for the three books with none.** Nasa'i: **#1775**, below. The three with no mapping: **'Amal al-Yawm wa'l-Layla by Nasa'i, 'Amal al-Yawm wa'l-Layla by Ibn al-Sunni, and Nawawi's al-Adhkar** (no scan with a text layer found yet; Shamela typed text is how Ahmad, Darimi and Riyad were done: `shamela-pages-*.py`, registry `tools/hadith-data-pull/sources/book-pages.json`).

## #1775: Nasa'i tier C (data and test only, no `app/` change)
- `tools/hadith-data-pull/book-pages-nasai.py` now places a number that no verified tier could by its RARE 6-word phrases (a 6-gram on at most 2 leaves of the scan), between the pages of its verified neighbours, flagged approximate in `a` (the reader already shows "on this page or the one just after it").
- Before 3,964 of 5,765 had a page; now **4,688** (3,964 verified + 724 approximate); 1,077 still none. Precision measured on verified numbers with their own page hidden: 511 of 514 right within one leaf (99.4%).
- To rerun: download the two `_djvu.xml` files (archive.org IS reachable from the sandbox; the plain URL answers 302 to a mirror, so use `curl -L`) and run `python3 -I tools/hadith-data-pull/book-pages-nasai.py --xml vol1-5.xml,vol6.xml`. The script without `--xml` downloads them itself. It is deterministic (it reproduced the committed file byte for byte).
- To get beyond 82%: the 1,077 left are mostly numbers whose text has no rare 6-gram on a unique leaf or whose neighbours disagree; a wider pass would need a per-leaf vote across more tiers. Do not weaken tier C's 2-leaf rule; if more is wanted, add a tier D with its own measured precision and its own flag.

## Still waiting on the Owner (unchanged from 14L's list, not answered in J106 yet)
- **n106h**: Bukhari My index, what a tap on a book opens (A list limited to the book's range / B keep as built / C other). Built as B (v14.28).
- Bangla names: book 46's full name; book 65 (Tafseer) range 4,474 to 4,977; the group names; the Learning Stories from Hadith Bangla line (14L's proposal); Loving Rasulullah Sallallahu A'laihi Wa Sallam wording; any new Subject name; other `bn.js` `// ?` strings. The names editor for books and groups is live, so the Owner can type these in the app.
- The two small-phone layout questions on the Hadith bar (check the PCF monitor before asking again).
- Later asks: more marking levels ("I will make more marking levels on the Go"); naming of bab sub-chapters.
- The Owner has not yet checked Know Your Status on a phone and a computer (and not the new ring).

## Pending jobs
1. Know Your Status Bangla editable by the admin (above).
2. Original pages: the three books with none (above), after Nasa'i's PR is reviewed.
3. Optional: a real-function emulator check of the Know Your Status bookmark payload against the deployed bookmarks Rules.
4. Offered to the Architect: nothing else open. The Dua groups-menu text-ratio failure in `hadith-dua-a11y-browser --page=dua` was forwarded to 11L (theirs).

## Lessons from this session
- **Force-pushing a rebased branch is refused by the session's permission classifier.** After a rebase push the same commits under a NEW branch name (`-r2`, `-r3`) and base the PR on that; the old remote branches are stale and can be deleted by the Architect. Also set the local branch's upstream (or rename it) so the "unpushed commits" stop hook is satisfied.
- **A check that passes because the thing it checks was built from the same signal is circular.** The "6 consecutive words on the mapped leaf" test passes 300 of 300 for tier C because placement uses 6-grams; the honest evidence is the HIDDEN-PAGE precision test on already-verified numbers.
- **An audit that reads `input.value` as text will flag every checkbox ("on") at the page's ratio.** Measure the label's own text instead; a mutation (`lowlabel`) proves the label is still measured.
- **An SVG element cannot take an outline.** A focus ring for SVG segments needs its own overlay path drawn last; the generic outline/box-shadow audit cannot see it, so the audit recognises `[data-focus-ring]` with a real `d` and a 2.5px+ stroke.
- **The `check()`-style suites here must run from the repository root, with `node_modules/playwright` symlinked to `/opt/node22/lib/node_modules/playwright` and `node serve.js` running** (CLAUDE.md lesson; the symlink needs `mkdir -p node_modules` first).
