# MSA-DUA Lead: session handover 10 (8 Nov 2026)

From session `session_01PL2xbLiGTw6WYdd8bRbkTs` ("📌 (03C) MSA - DUA Lead - 08.11.26 - 11.54 AM") to the next MSA-DUA Lead. Handovers 6 to 9 (who is who, sandbox notes) still hold; this one adds what changed. Sonnet (use1102).

## Done this session (all in PCF MSA J104; released by the MSA Architect)
- **v13.57, PR #1534 (r14a)**: tick 7 C, a Qur'anic dua's ▶ plays one āyah with `audio-player.js` (lazy import on first press, stops when the card changes, default reciter "ar"); Hadith duas keep ▶ dimmed. Tick 10 A, a Hadith dua's poster / A4 / Full text / share carry HadeethEnc's hadith translation, labelled "translation of the hadith" (`trNote`, `trText` in `dua-poster.js`; `loadHadithTranslations` in `dua-study.js`, read on the first Menu press).
- **v13.58, PR #1543 (merged as #1544, r14b)**: tick 10 B first batch, 16 Hisn al-Muslim duas with a DRAFT meaning (`tools/hadith-data-pull/output/dua/draft-meanings.json`, keyed by Hisn number "chapter:entry", read on the first Menu press, marked "draft, to be checked"; the Bangla needs a person's check); a failed recitation is said in words on the card (`.dua-play-msg`, also via `setPlaybackErrorHandler`); `whenReady(sheetOf, make)` rebuilds the poster / Full text / share pop-up when `sheet.ready` resolves.
- **Docs only**: `docs/reference/2026-11-08-dua-sahaba-salaf-ulama-proposals.md` (tick 6 A, first pass over al-Adhkār: 3 Sahaba, 2 Salaf, 3 Ulama; U3 and L2 are better dropped), `docs/reference/2026-11-08-dua-audio-permission-letters-DRAFT.md` (tick 7 B; NOTHING SENT; no contact addresses filled), `docs/reference/dua-demo/dua-wheel-demo-v1.08.html` (also a private artifact https://claude.ai/artifact/HUpiBVoYXvSAeFCzxsPGh4).
- New suites: `dua-quran-play-browser.mjs` (7), `dua-hadith-translation-browser.mjs` (4; `--slow`, mutations nonote / noready), `dua-draft-meaning-browser.mjs` (5; nodraft).

## The Owner's answers this session (J104)
- 6 A, 7 C (Qur'anic) + 7 B (others; letters drafted only), 8 A, 9 A, 10 A then B: all ticked, built or prepared as above.
- Item 19 (the wheel) answered in chat: A (word levels wheel in the Dua Word Card, the same as the Qur'an Word Card) AND B (a wheel for a whole dua, one segment per word); common Qur'an words go to the Qur'an wheel; plus a layered Dua wheel (rings: on-the-go category, Hadith book, my own category I place and they change, status of study; marked like a bookmark; status per dua / per book / per category). **Demo v1.08 APPROVED (item 21 A: "Approve the demo, build it after Rules").**

## Waiting on others
- **Owner**: publish the Dua saving Rules (J104 line 20, n104pub; guide `docs/governance/2026-11-08-dua-saving-rules-publish-guide.md`); ticks 17 (meanings for words not in the Qur'an) and 18 (Family across duas / Taṣrīf / Depth); keep/drop the 6 A proposals; send the 7 B letters; a person to check the Bangla drafts.
- **Architect (88L, `session_01PL2xbJE8FVMZrGa3fGkgrR`)**: PR #1542 (repository sync of the Rules) is HELD until the Owner ticks line 20.

## Next (build only after the Owner says "published")
1. **R6**: the saving writers against `docs/proposals/dua-saving.candidate.rules`: `duaPlans/{tenantId}__{personId}` (memorising marks, 8 A: own, or a teacher/guardian for a student), `duaEdits/{tenantId}__{duaKey}` (add / move / several groups / hide, saved titles; owner/prime write), `duaShares/{autoId}` (any member creates their own, owner/prime read). Replace `rules-authorisation-executable`'s "NO WRITER YET" with forward/backward writer checks (as for ayahKeyMarks). Branch from main after #1542.
2. **R7**: the wheel, built to demo v1.08: the layered Dua wheel, bookmark-style marking, the Dua Word Card levels wheel, the one-dua word wheel. Needs R6's saving for status and categories.
3. Owner-independent meanwhile: more 10 B drafts (about 286 Hisn duas still have no meaning; most used first), each batch with its test and the "draft, to be checked" label; 17 / 18 prep.

## Lessons / sandbox (new)
- Background jobs and `node serve.js` are KILLED when the container restarts (it happened twice, clock jumped hours): before trusting a long-suite log, check it is non-empty and that `curl localhost:8080/app/dua-study.html` returns 200; restart `node serve.js` and the suite if not.
- ES modules ignore `NODE_PATH`: `ln -s /opt/node22/lib/node_modules node_modules` at the repo root (git-ignored) lets the suites import playwright.
- Do not edit `app/` while a long suite is running against it; the suites serve files from disk.
- Never claim a long-suite result you did not see; say so in the PR (the Architect re-runs them).
- The Codex review bot says "usage limit reached"; ignore it. The unattended Architect says "not eligible" on a draft: mark the PR ready.
- PCF: the Architect writes to J104 too; always `if_version`, and on a mismatch re-read and re-apply (it happened three times today).

Next title: "📌 (03C) MSA - DUA Lead - 09.11.26 - h.mm AM/PM" (use1102 A).
