# MSA-DUA Lead: session handover 7 (4 Nov 2026, 1:40 pm Sydney)

From the session titled "📌 (03C) MSA - DUA Lead - 04.11.26 - 1.15 PM" to the next MSA-DUA Lead. Handover 6 ("Read first", sandbox notes, who is who) still
holds; this one adds what changed. **Nothing is running.** Sonnet from the next session (use1102).

## Done this session
- **D25 (R9b), the Asma-frame poster: built and handed in.** Branch `claude/dua-r9b`, commits 83043ba7, 454c6c05, 3c3e0410, **PR #1458** (ready for review,
  base main, head `claude/dua-r9b`, J104; it also carries D26's aea922d beneath it). The MSA Architect (new session
  `session_01PL2xbKVsogtiX14zJWkXzE`, from 1:40 pm) is reviewing D26 + D25 together and will release both in one version. Subscribed to the PR: events wake the session.
  - The Dua poster page, Print and Save-as-picture use `asma-poster.js` read-only (`ensureAsmaPosterStyles`, `fitAsmaPosters`, `POSTER_FRAME_URL`). Slots: title (short, before the
    first comma), orange line `sheet.line` ("Dua N" / "Hisn al-Muslim N" / the Prophet), cartouche = first 2 Arabic words, body = chosen parts, Quran box
    (`sheet.quran`, a link with back=1), Hadith box = `sheet.ref`. Pop-up: `placeDialogAtHome(card)`, close button "← Back".
  - **The frame image carries the heading "Al-Asmaul Husna". The Architect caught it; demo v1.05 had only drawn a placeholder arch, so it was never approved.** Now covered by a
    polygon of the frame's own green (#00361d, measured on 1055×1491) and re-lettered الدُّعَاء / Dua (দুআ) on the page and on the canvas.
  - Suite `dua-poster-r3-browser.mjs` 126/0 (320, 390, 1280; en, bn); every mutation caught (`--mutate=all` crashes on a stale mutation text: run each name in its own call, ~100 s each).
- **D26 (R9a)** was handed in earlier (`claude/dua-r9`, aea922d); in PR #1458 as the base.
- Sent the PCA "PCA ▸ taken over (Dua Lead)". The PMS (p/mmsa) was read; **nothing was written to it** this session (no J104 line update): the next session should add one for D25/D26/PR #1458 with `date -u` times.

## Waiting on the Architect
- Release of D26 + D25 (PR #1458). If a finding comes back: fix on `claude/dua-r9b`, merge main in first, re-run `dua-poster-r3-browser`.
- Their note (not blocking): the card has both "Without vowels" (card display) and the poster's "Vowels" chip. **Fold into one control in D23.**
- Still NOT run for D25: `hadith-dua-a11y --page=dua`, `night-hadith-dua`, `large-text-dua-study` (the Architect was running them), and a real-printer print check.

## Next: D23 (R10), the Dua Card like the Āyah card. NOT STARTED. What exists and what is missing
Branch it from main AFTER PR #1458 merges (until then `claude/dua-r9b`, because it touches `dua-study.js`, `dua-poster.js`). Plan line: `docs/governance/dua-module-plan.md` D23.
Already on the card: ‹ › through the group, progress with 👥, 🔖 (Hadith-book duas), 🖼 Poster, Copy / share, the pop-up card menu.
Missing, in the order I would build them (one bounded round each, each demo-checked against demo v1.05 and mutation-proven):
1. **One vowel control** (the Architect's note) + **a Full-text view** (like the Āyah card's 📖 Full text: Arabic, English, Bangla, word-by-word layers; reads `duaSel`).
2. **📝 Note** as the J108 new-Note opener: copy `openHadithNewNote` (`app/js/hadith-browser.js` ~l.742): `import("./note-opener.js")` lazily, `openNewNote({ unitKey: "dua:<n>", unitLabel, title, backLabel, onClosed })`.
   `note-opener.js`'s `ref` supports only kinds "ayah" and "hadith": a Note with a Dua block inside needs a "dua" kind there. That file is SHARED: ask the MSA Architect, do not edit it.
   Hadith-book duas have the permanent key `dua:<n>` (decision 88). **Hisn and Qur'anic-dua cards have NO permanent key, no progress, no bookmark: do not invent one (Owner Control Gate).**
   Today the Hadith-dua card only has the old "📝 My Notes" link to notes.html (`duaNoteBookmarkRow` in `dua-browser.js`, also used by Hadith Study's Dua tab: coordinate with the Hadith Lead).
3. **File in folder(s)**: the shared Mapping My Journey folder picker: ask the Architect how the Āyah card does it (shared code).
4. **Related duas** (the same dua in other books is already `e.card`/"The same dua in the Hadith books"; a wider "related" needs a rule: ask the Owner or the Architect what counts as related).
5. **A movable window on a computer**: reuse `app/js/float-window.js` (`HANDLES`, `startDrag`, `handleCss`) and mirror `ayah-card-window.js` (rect in localStorage, 900px and up); both are shared: read-only, never edit.
Play waits on D16/D17. Also keep the way-back law (every link leaves ← Back).

## Then D24 (R11), the Dua Word Card: unchanged from handover 6 ("D24 facts"). Ask the Architect before any Firestore write path (J104 tick 9).

## Sandbox notes added
- Start the server and run suites in the SAME command: `(nohup node serve.js >/dev/null 2>&1 &); sleep 2; node tools/i18n-verify/<suite>.mjs`. Playwright: `mkdir -p node_modules && ln -s $(npm root -g)/playwright node_modules/playwright` (git-ignored).
- A suite run over ~110 s is moved to the background by the tool: use `timeout 115` per run, or `run_in_background`, and wait with Monitor.
- Reading the whole PMS (`ArtifactData get p/mmsa`) returns ~100 KB of manual text: read only `monitor`/`rules` with `out_dir` and Read the file, or skip it when the brief names the rules already.
- A cross-session reply must use the claude-code-remote `send_message` (session_id), not `SendMessage` (names).
