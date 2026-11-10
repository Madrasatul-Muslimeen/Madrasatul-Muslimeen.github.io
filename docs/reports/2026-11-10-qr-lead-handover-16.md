# MSA-QR Lead handover 16 — 45L to 46L (10 Nov 2026, about 9:00 pm Sydney)

Written by 45L (session `session_01PL2xbNQXvPVEr281Nr5aMU`, title "📌 (04) MSA-QR Lead (45L) - 10.11.26 - 4.12 PM"). `main` is **v14.19**. Nothing of mine is in flight.

## Delivered this session (all merged and released by the Architect)
- v14.09 one Read bar (#1601); v14.10 J136 "Mark the Word", five marks, with the Rules as a CANDIDATE only; v14.11 Practising words tinted violet (#1607); v14.13 the ⋮ sheet is always reachable and the "Bismillah" picker fix (#1610).
- MSA J120 O5, in two PRs as 97L asked: #1618 (v14.17) a failed recitation Play says "Recitation needs the internet."; #1620 (v14.18) an Asma poster says "Posters need the internet" only when offline AND its web fonts are not loaded.
- MSA J120 O6 (#1622, v14.19; 97L changed the worker's role in review, PR #1623): recitation saved for offline one sūrah at a time, Study options → Listening → "Recitation for offline"; own cache `mm-audio-v1` (QR `qr-audio-v1`), the worker serves saved archive.org recitation with Range (206).
- PMS: J137 rounds 1–7 written to the Manual (round 7 = the Āyah card's "What it is for").

## Open list for 46L
1. **MSA · QR J137 Manual rounds**: next Notes, Bookmarks, Study options, and the Read-bar wording "Study is the labelled group at the top of the ⋮ menu". About needs a design decision first (no purpose field in `feature-registry.js`). Manual text only: read `p/mmsa` `manual` with ArtifactData, insert, write with `if_version` (the whole `manual` array is replaced: re-read on a conflict).
2. **Bangla Words (MSA J119)**: Demo v04 is published and waits on the Owner's four ticks (need n119f: how the list fills A/B/C, multi-kind yes/no, names/order, word-list picker). Build nothing until ticked. The three categories (Names in Bangla, known by Rituals, used in Bangla) will need a Rules candidate extension (the Owner publishes).
3. **J136 Rules**: the five effort marks cannot all save until the Owner publishes the candidate (`docs/proposals/word-effort.DEPLOYMENT-candidate.rules`); then `WORD_EFFORT_RULES_PUBLISHED` flips in a release (PMS need n136d).
4. **MSA J05 T11 = A and T15 = A** (Ten Steps master file / question cards): demo first.
5. **Slow vocabulary mutations** (nowrite, writewrong, noask, lowtest, bnleak, vocaret, lowpurple): fail fast and `browser.close()` as `learn-next-levels` does.
6. Waiting on the Owner, do not re-ask: n127a, n129a, the Verb Form YouTube link (J122), the verdict on the opening demo v4.
7. **After v14.19, one real check on a phone** is still owed: save a short sūrah (e.g. Sūrah 1) and play it with the network off. Whether archive.org answers CORS and Range could not be measured from the sandbox; if it does not, the app says "Could not save this recitation: …" in words.
8. Unanswered by 97L: whether QR's frozen worker honours the "warm" message that loads `offline-line.js`; I said QR needs nothing for O5/O6 but did not test it.
9. `student-tools-browser` had 1 failure on my O6 branch ("bn light 1280x720 failednote: the Note window stays open"); the clean-main re-run did not finish, so it is UNBASELINED, not proven mine. `student-browser` has 4 failures that are identical on clean main.

## Who is who (changed today)
- **MSA Architect: 97L** `session_01PL2xbMP1cjoPSSKucQC1FD` (from 7:35 pm 10 Nov; 96L is retired). Send J137 and hand-offs there.
- **PCA: 33L** `session_01PL2xbJwqVTMZPjUinGStBV` (took over from 32L).
- **Do not change a PR's head after telling 97L it is ready**: open a new PR, or tell 97L to re-review. #1618 merged at a head 97L had not reviewed.

## Lessons from this session (new ones)
- **Cache names are counted**: a new cache in `app/sw.js` needs `app/apps/msa.json` "caches", `tools/apps/build-app.mjs` `CACHES` (count of `"mm-<name>-` quoted occurrences), a rule for any page module naming it, QR's own worker (`apps/qr/site/app/sw.js`), `qr-verify/naming.mjs`, and a mutation in `apps-build-check.mjs`. A comment that writes the quoted name adds a count.
- **Playwright `route.fulfill` adds the CORS header itself**, and **`context.setOffline(true)` does not stop routed requests**: a suite that fakes a host must gate its own route (`net = false` then `route.abort()`).
- A Playwright check that a saved audio file plays offline: an `<audio muted>` element, `currentTime > 0`, then a seek (proves Range); plus an unsaved-file control.
- qr-verify's browser checks import `playwright` from `tools/apps/qr-verify/`: they need `ln -s ../../i18n-verify/node_modules tools/apps/qr-verify/node_modules` (git-ignored), and must not run two at once (ports 8107/8108 collide).
- Listening layout baselines (`qr-listening-large-text-browser`): the 2nd number of each `PLAIN` row moves with anything added below Listening; update in place with the reason.

## The full opening message for 46L
> Bismillah. You are the MSA-QR Lead 46L, taking over from 45L. Title this session "📌 (04) MSA-QR Lead (46L) - DD.MM.YY - h.mm AM/PM". Read CLAUDE.md, this file (`docs/reports/2026-11-10-qr-lead-handover-16.md`), the PCF (https://claude.ai/artifact/PhW1KKX28qrqj9dE7Ha8dZ, section `mmsa`, jobs J110, J119, J120, J122, J136, J137) and PMS guide G02. Rules: a Lead never merges and never allocates a version or bumps `app/js/version.js`; MSA Architect is 97L, PCA is 33L; pin every PMS write with `if_version`; write "Siyagah" in full; after "Rasulullah" always write "Sallallahu A'laihi Wa Sallam"; every Owner ask starts with 🟨 ⚠️ and gives the whole ask in that line (bold in chat); every round needs its own mutation (an unfailing mutation is UNPROVEN); hand over at about 30% context with this kind of message. Work the open list above in order, asking the Owner only for a real choice or answer, and keep working without waiting.
