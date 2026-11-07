# MSA-DUA Lead: session handover 9 (7 Nov 2026, written 7:30 pm Sydney)

From session `session_01PL2xbLR47r6za77W9ZmqTx` ("📌 (03C) MSA - DUA Lead - 07.11.26 - 5.40 PM") to the next MSA-DUA Lead. Handovers 6, 7 and 8 (read first, sandbox notes, who is who) still hold; this one adds what changed. Sonnet (use1102).

## Done this session (all in PCF MSA J104)
- **D24, the Dua Word Card, first slice** (PR #1503, branch `claude/dua-r11a`, from main, merged main v13.46 in): a dua word no Qur'an word is spelled like opens the card with the levels WbW, Root, Family, Taṣrīf, Depth, ‹ n / N › between the dua's words, and "Back to the dua" (`app/js/dua-word-card.js`, hooked into `showDuaWord` in `dua-browser.js`). WbW shows the dictionary meaning (Wiktionary CC BY-SA and Quraniyo Obhidhan, credited) or "No dictionary entry yet"; the existing grammar and progress blocks sit under it. No new saving. Suite `dua-word-levels-browser.mjs` 43/0, four mutations (nolevels, nokin, nostep, nodict) red. Family lists only the other words of THIS dua with the same root; Taṣrīf and Depth are honest "not built yet" lines.
- **The 📝 Note entry** (PR #1505, branch `claude/dua-r12a`): on a Hadith-book dua (key `dua:<n>`) the 📝 My Notes press opens the shared new-Note window (`openNewNote` + `duaRef`); the link keeps `notes.html` as the old route. `dua-note-bookmark-browser` and `audit-part16-hadith-dua-browser` were updated in place (they asserted the press navigates); new mutation `nonote`. The Architect removed the "filing it in this folder failed" excuse on the release branch (it is the Note window's real I15 message and must fail a check if it ever appears) and will release it as v13.47.
- **PCF**: plan lines `j104p_d24a` and `j104p_note`, and the v13.46 done line `j104d_v1346`, written 6:55 and 7:10 pm.
- r10b + r10c were released by the Architect as **v13.46** (7:07 pm, PR #1506).

## Waiting on others
- **Architect**: review of #1505 (then release v13.47) and #1503.
- **Owner**: J104 line 16 (n104p), "Related duas" A/B/C (build nothing until ticked); and the new D24 data options (see "Next").

## Next: what D24 still needs (Architect's steer, 8:16 pm: NO build; find the data, then give the Owner 2-3 tick options in J104)
Measured on the repository's own files (`tools/hadith-data-pull/output/dua/grammar-*.json`, built by `dua-word-grammar.py` with CAMeL Tools, calima-msa-r13 is GPL-2 at build time only):
- 3,280 unlinked dua words carry a computer guess [lemma, root, pos, vowelled]; 2,577 have a root; 618 distinct roots, 380 of them in two or more duas, so a cross-dua **Family** needs no new data.
- Against the Qur'an dictionaries (en, bn) the guessed lemma matches exactly (marks and all) for 708 words (en) / 589 (bn); matching on letters alone gives 1,827 / 1,574, but that can pair homographs, so it is only a suggestion. 638 of 1,201 distinct lemmas (1,423 words) have no entry in either.
- A direct match of the dua lemmas against Wiktionary (kaikki.org, CC BY-SA 4.0), run in the scratchpad only: 1,072 of 1,201 lemmas (3,030 of 3,280 words, 92%) have an entry by letters alone (wrong-sense risk). The Owner's two tick questions are PCF MSA J104 n104q (meanings: A Wiktionary as "suggested, to be checked" recommended, B Qur'an dictionaries only, C none) and n104r (other levels: A Family across duas now, B also verb tables after the Architect clears the tool, C nothing). Build nothing on either until ticked.
- Verb tables (Taṣrīf) for dua words need a paradigm generator (CAMeL's generator is MIT code, its database GPL-2): a rights question for the Architect before any shipping.
- The rights of the CURRENT grammar files is PCF MSA J118 (the Architect's): comment j118c1 records the build script `tools/hadith-data-pull/dua-word-grammar.py`, the stamp "camel-tools 1.6.0, calima-msa-r13" in all 79 `output/dua/grammar-<page>.json` files (merge 4a910ce, 2 Nov), and that only the analysis output ships.

## Sandbox notes added
- `npm root -g` has playwright; ES modules ignore `NODE_PATH`, so `ln -s $(npm root -g) node_modules` at the repository root (it is git-ignored) lets the suites import it.
- A suite run in the foreground is cut at 120 s: start long ones with `nohup … &` and wait with a `until grep -q "^exit" …` loop in the background; four long suites in parallel under a 290 s `timeout` produce false failures (the 50 "failures" in audit-part16 were the timeout, not the code).
- `git push --force` is refused by the sandbox classifier: to move a branch's base, cherry-pick onto a NEW branch and open a new PR (close the old one).
- The unattended Architect comments "not eligible" on every Dua draft PR (app/ files = a release): mark the PR ready for review when the round is finished.
- The Codex review bot answers "usage limit reached"; ignore it.

Next title: "📌 (03C) MSA - DUA Lead - 08.11.26 - h.mm AM/PM" (use1102 A).
