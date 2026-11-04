# QR Lead (Quran Study) — session handover J, 2 Nov 2026

Written by the QR Lead session `session_01PL2xbNa6eWiBadbJM7SCCV` (hand119), which took over from
`session_01PL2xbMyR5g8rRKQnA2JdLW` (handover I) at about 1:35 pm 2 Nov Sydney. `main` was **v13.21** when written; read it off
`app/js/version.js`. Handed over early under the Owner's usage plan (PMS General rule use1102: hand over at about 15% context).

## Who to talk to (changed 1:44 pm 2 Nov)

| Role | Session |
|---|---|
| MSA Master Architect | `session_01PL2xbKUoZqQEubMNHUR64W` |
| PCA | `session_01PL2xbLbJ2UoaKA3tTXpEkq` |

use1102 also says: no broadcasts (message only when there is work); the Architect runs QR's build-from-msa itself at each
release and sends change notices to the QR Lead directly.

## Handed in, waiting for release

| Branch | Head | What | Suite |
|---|---|---|---|
| `claude/qr-lead-way-back-pill-over-notes` | 51fefbc | (handover I) the way-back pill above the Notes pane | 72/0 |
| `claude/qr-lead-tajweed-tap-unit-card-close` | 9072775 | (handover I) Tajweed tap / Unit card × | 144/0 |
| `claude/qr-lead-page-way-back-survives-card` | 69272ef | (handover I) a page's way back outlives the Āyah card | 48/0 |
| `claude/qr-lead-j110-reading-view` | 6470e98 | **J110 A, B, C** (the Owner ticked them, 2 Nov 12:35 pm; PCF MSA J110 n110a) | qr-j110-reading-view 74/0 |

**J110, what was built** (Reading View = the code's "meaning" view; the ONE Ayah View, "plain", is NOT changed):
- **A** below 600px the English / Bangla / WbW switches sit behind ONE "Show ▾" (with a count) in the existing
  `#readMeaningLayersSlot`; stays open while ticking (focus kept), closes on Esc / a tap elsewhere. From 600px unchanged.
- **B** `paintReadMeaningBtn()` names "Reading View" and "ONE Ayah View" (bn "পড়ার দৃশ্য", "এক আয়াত দৃশ্য"). Measured: the
  bar's button row had 0px slack at 700 and 1024px on main, so from 600–1279px a two-word name sits on two lines
  (`.rmw-line` spans) in the same 40px button. Bar height then equals main at 600/700/768/900/1024/1280, both views, en+bn.
- **C** `markPlayingAyah()` handles `.meaning-ayah` (gold band, follows; not found → re-render once at that āyah), so the
  jump back to the unit's start is gone; ⋮ on every Reading View āyah (`meaningQuickMenuHtml`; an added page wires only its
  own box, `display: contents`; Copy reads another surah's āyah via `getSurah`); `noteMeaningLastRead()` on scroll.
- Suites updated in place (reasons recorded): read-meaning 39/0, read-meaning-one-row 56/0, read-bar-bookmark-layers 48/0,
  read-mushaf-button 312/0. Mutations of the new suite all fail it: nofollow 8, nomenu 11, double 1, open 1, names 10, lastread 2.
- apps-build-check 48/0; `build-app.mjs qr` builds clean.

## NOT yet confirmed when handed over (do these first)

1. **audit-part11-reading-browser fails 8 on the J110 branch**: "quickbuttons: Notes opens the notes pane" at every width,
   en and bn. Its run on unchanged main (worktree, port 8081) had not finished. Run it on main: if main fails the same 8, it
   is not J110's (tell the Architect); if main passes, J110 broke it — fix on the J110 branch before release.
2. `behaviour.mjs` and `bash tools/apps/qr-verify/run-all.sh` (QR build, port 8082) were still running on the J110 branch.
3. Check the four hand-ins on quranrevival.github.io once released (QR opens Al-Fātiḥa at 1:2).

## Open with the Owner

- **J29 j29qrl23q** (the four-change Read-view demo: Aʿūdhu line, ⋮ before the āyah, ⋮ then number, one word block): the PCA
  relayed that J110 "settles" it, but J110's ticks were A/B/C only. The demo's own four changes are not ticked; build none of
  them until the Owner ticks, and check with the Architect.
- **j29p127q** still waits on the Owner.

## Sandbox lessons (add to handover H/I's)

- A suite's "tap elsewhere" on the Read view can land on a word and open the Word Card, which then covers everything: tap a
  plain spot (`.meaning-page-rule`, an āyah's reference) instead.
- Last places are saved at most every 10 s; flush with `window.dispatchEvent(new Event("pagehide"))` and read
  `window.__stubWriteData` (`col === "bookmarks"`); the key is `lastPlaces.read`.
- Make a mutation run's `SHOT_DIR` exist BEFORE starting it, or the screenshot throws.

## Opening message for the next QR Lead

> You are 📌 (03A) MSA · QR Lead, the Module Lead for Quran Study inside the MSA repo, taking over from
> session_01PL2xbNa6eWiBadbJM7SCCV. Read CLAUDE.md (MODULE LEADS block and the two-reading-views block), then
> docs/reports/2026-11-02-QR-LEAD-HANDOVER-J.md on branch claude/qr-lead-handover-1102j (start there; handovers H and I for
> sandbox lessons). Read main's version off app/js/version.js. Work only on Quran Study files, on your own branches from main;
> hand finished work to the MSA Master Architect (session_01PL2xbKUoZqQEubMNHUR64W; if it changes, the PCA tells you) as
> 'QR LEAD ▸ ready for release: …'. Never merge, never bump app/js/version.js; force-push is refused. FIRST: the three
> unconfirmed checks in handover J (audit-part11 on main vs the J110 branch, behaviour.mjs, qr-verify run-all). Then: four
> hand-ins waiting for release (51fefbc, 9072775, 69272ef, J110 6470e98) — check each on quranrevival.github.io when released.
> J29 j29qrl23q and j29p127q wait on the Owner: build nothing of them. PMS: https://claude.ai/artifact/PhW1KKX28qrqj9dE7Ha8dZ.
> After 'Rasulullah' always write 'Sallallahu A'laihi Wa Sallam' (saw128). Usage rule use1102: hand over at about 15% context,
> message only when there is work. Keep reads small; no self wake-ups; stay open while idle. When ready, send
> 'PCA ▸ taken over' to the PCA (session_01PL2xbLbJ2UoaKA3tTXpEkq; if archived, the PCA named in p/pl.sessionUrl).
