# QR Lead (Quran Study) — session handover K, 4 Nov 2026

Written by the QR Lead session `session_01PL2xbLbJ2UoaKA3tTXpEkq` (taken over from `session_01PL2xbNa6eWiBadbJM7SCCV`, handover J, on 2 Nov).
`main` was **v13.29** (1987b62) when written; read it off `app/js/version.js`. Handed over under the Owner's usage plan
(PMS General rule use1102: hand over at about 15% context) **before** starting K2, so the next Lead starts it clean.

## Who to talk to

| Role | Session (4 Nov) |
|---|---|
| MSA Master Architect | `session_01PL2xbKZ3ZRNWgHZAfbrJSx` (changes: the PCA says) |
| PCA | inactive when last tried; the PCA named in PMS `p/pl.sessionUrl` |

Message only when there is work. Cards for the Owner go to the Library Inbox (mydb128); **the Architect sent the demo's card
themselves** (the Owner's "Library Card: you send"). Running `send_card.py` (a script downloaded from
basheerawanazeera.github.io) was REFUSED by this session's permission system: do not retry it, ask the Architect.

## The job waiting: K2 of PCF MSA J03 (Keys to Understanding) — BUILD APPROVED by the Owner's ticks of 4 Nov 12:04 pm

Message from the Architect (4 Nov 01:23 UTC), kept in full because it is the whole brief:

> Your round, Quran Study (QR's home; you build, the Architect reviews and releases):
> (1) the three marks **Difficult / Need practice / Done** on the Āyah card (one āyah) and on QR's Word card (one word);
> (2) the **Status wheel's three views**: āyāt of a sūrah; words of one āyah; words of every āyah (three bands per piece, outer
> Difficult, middle Need practice, inner Done; tap a piece opens its card, with a way back).
> Build target: demo v2 https://claude.ai/artifact/RDDqWeai42MvNaXJcMVx5f , source `docs/reference/2026-11-04-keys-demo/template.html`.
>
> **API** (`app/js/ayah-keys-data.js`, `ayah-keys.js`): `loadSurahKeys(db, ctx, surah)` → `{madrasah, mine}`, ONE call per sūrah gives
> both āyah marks (`ayah:<s>:<a>`) and word marks (`qword:<s>:<a>:<pos>`, pos = the Quranic Arabic Corpus word place the Word card
> opens at, from 1); `setAyahKey(db, ctx, {scope, surah, ayah, keyId, on})`; `setWordKey(db, ctx, {scope, surah, ayah, position, keyId, on})`;
> `MARK_IDS ["hard","practice","done"]`, `keyName(id, lang)` (en/bn), `marksIn(list)`. `ctx = {tenantId, personId, uid}`; `scope` = the
> reader's personId. Each set returns `{ok, keys}` | `{ok:false, refused}` | `{ok:false, entry}` (I15: a failed save is already reported;
> never swallow it). Read when the card or wheel first shows, never at start-up (I9).
>
> The Rules are an unpublished candidate (K4, the Owner publishes), so saves are refused in production until then: **the Architect
> releases your round with K4**. **Do not edit `ayah-keys*.js`, `unit-keys.js`, `collections.js` or the candidate: ask the Architect.**
> Respect the two reading views rule (2 Nov) and J109's on/off switches. Review rule: 360–1440, en/bn, 100/150/200%, screenshots
> LOOKED at, real-length data, new checks mutation-proven. Hand it over as a ready PR; never merge, never bump version.js.

**Base it on branch `claude/j03-k0-marks` (PR #1450); its head moved to f9f1aa6 on 4 Nov (main 1987b62 merged in, the Rules candidate rebuilt; the API is unchanged), so branch K2 from f9f1aa6 or whatever its head is now**, which holds the K0 API. It is NOT merged until the Owner ticks
the word-key shape (J03 `k0key1104`), so build there, not on `main`, and hand the PR back to be re-based when K0 lands.

First steps for the next Lead: read PCF MSA J03 (the Owner's ticks, the demo v2 notes); read `docs/reference/2026-11-04-keys-demo/template.html`;
read the two API files above; check `quranrevival.html` for the Āyah card (`openAyahActionSheet`, `ayah-action-sheet.js`) and the Word
card (`word-card*.js` / the card's level code); find the existing Status wheel (`renderWheel()`, `wheelSection`) and decide the three
views with the demo as the target. Ask the Architect before touching anything shared.

## What this session handed in, and where it stands (all RELEASED unless noted)

| Hand-in | Branch / head | Released in |
|---|---|---|
| Way-back pill above Notes; Tajweed tap / Unit card ×; page way-back survives card; J110 A, B, C | handover I/J branches | v13.22 |
| audit-part11 quick-Notes check updated (stale since J108) | claude/qr-lead-part11-notes 682286f | v13.23 |
| A new Dual Name is not asked to be filed under "Dual" | claude/qr-lead-dual-no-fileunder 8d7ebaf | v13.23 |
| File-under selects show "Not filed" whole at Bangla 200% on a phone | claude/qr-lead-notfiled-200 63dd1b8 | v13.25 |
| ⋮ menu: "Take Note" when the āyah has no Note (a new Note opens at once); "Note & more…" when it has | claude/qr-lead-quickmenu-note 5c1245a | v13.26 |
| ⋮ item turns to "Note & more…" with the has-note mark right after a Note is made from it | claude/qr-lead-quickmenu-recount fb52b01 | v13.27 |

Nothing of mine is in flight. Not yet checked on quranrevival.github.io: the live behaviour of the released hand-ins (the Owner's phone
checks are theirs; QR served v13.22 at 3:53 pm 2 Nov).

## Waiting on the Owner (build nothing)

- **J05 need j05n5** — the intention-reminder demo (https://claude.ai/artifact/G7k9K3vfpFdWWPU5z5L3tZ): five tick questions (wording; every time /
  once a day / off default; Qur'an only or all of MMSA; the Note's faint prompt under 14–26; the guides' text and question card). **Job J111**
  in the PMS records it (marked Quran Study). When the Owner ticks, build it (reminder, Note prompt, guides' text, question card) on a QR
  Lead branch, measure, hand over.
- **J29 `j29qrl23q`** (the four-change Read-view demo) and **`j29p127q`**: still unticked. Build none of them.
- **Open question I raised:** "By Act" and "By Essence" stay English in Bangla because they are the Owner's own classification names (data).
  Translate only if the Owner asks.

## Sandbox lessons (add to handovers H, I and J)

- **A worktree has no `node_modules`.** Symlink Playwright: `mkdir node_modules; ln -s /opt/node22/lib/node_modules/playwright node_modules/playwright`
  (the repo root has this already). The harness takes the port from `QR_BASE` (default 8080); start `PORT=8090 node serve.js` and run suites
  with `QR_BASE=http://localhost:8090`. **The server dies between turns sometimes**: `curl` it before a long run (ERR_CONNECTION_REFUSED
  on the first page means it died, not the app).
- **Do not `pkill -f` a name that is in your own command line**: it kills your own shell (exit 144).
- **A background launcher "completing" is not the suite finishing**: the notification is about the shell that started it. Wait on the
  suite's own `done` file with Monitor.
- **`behaviour.mjs` takes ~20 minutes** (975/0 at v13.27). Start it in the background and wait on a done-file; give it a 2700 s timeout.
- **The harness stub cannot see an iframe's writes** (the Note window's own page has its own stub data), so a parent-page lookup finds 0
  notes after a Note is made inside the window. Use the window's own messages (`mmsa-new-note-ready`) rather than a recount in a test.
- **A control inside a menu measures 0×0** until the menu opens: the Read bar's 📝 Notes is behind ⋯ (`#readToolsBtn`) on a phone, not in
  the Study menu. Open the container, then click.
- **To prove a new check fails on the old code**, copy the new suite into a second worktree at `origin/main` (`git checkout -f --detach`)
  and run it against that copy on another port; the new checks must fail there.
- **Stop hook**: it wants uncommitted work committed and pushed; commit a clearly marked WIP, never temporary debug code.
- **Never edit shared note scripts** (`note-opener.js`, `note-window.js`, `read-note-pane.js`, `zab-bar.js`, `modal-focus.js`,
  `journey-map.html`): attach to their messages from the page instead, and send the Architect a change request if a hook is needed.

## Opening message for the next QR Lead

> You are the Module Lead for Quran Study inside the MSA repo, taking over from `session_01PL2xbLbJ2UoaKA3tTXpEkq`. Read CLAUDE.md
> (MODULE LEADS block and the two-reading-views block), then `docs/reports/2026-11-04-QR-LEAD-HANDOVER-K.md` on branch
> `claude/qr-lead-handover-1104k`. FIRST: K2 of PCF MSA J03 (the three marks on the Āyah card and the Word card, and the Status wheel's
> three views), BUILD APPROVED; base on `claude/j03-k0-marks` (PR #1450); read the Architect's brief in section "The job waiting".
> Work only on Quran Study files, on your own branches; hand finished work to the MSA Master Architect (`session_01PL2xbKZ3ZRNWgHZAfbrJSx`;
> the PCA tells you if it changes) as "QR LEAD ▸ ready for release: …". Never merge, never bump `app/js/version.js`. J05 j05n5 and J29
> `j29qrl23q` / `j29p127q` wait on the Owner: build nothing of them. After 'Rasulullah' always write 'Sallallahu A'laihi Wa Sallam'
> (saw128). Usage rule use1102: hand over at about 15% context, message only when there is work. No self wake-ups; stay open while idle.
