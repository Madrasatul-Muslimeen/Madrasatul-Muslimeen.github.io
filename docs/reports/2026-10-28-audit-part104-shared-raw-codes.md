# Audit part 104 — refused-save wording in Backup, the import services and the note pane (PCF MSA J29, I15)

Follows part 103 (`2026-10-28-audit-part103-raw-error-codes.md`). Rule used: **a Firestore refusal (an error with a `code`) says
`plainMessageFor(err)`; an error the app's own code threw (no `code`) keeps its own sentence**, because that text is written for the
reader. Read failures and boot lines are left alone, as the issue says.

**Honesty note on evidence.** The Builder could not drive and photograph every state at 390/820/1440 in en and bn inside the run.
What was run is in the last section. The "before" column below is read from the source (what the line builds from `err`), not from a
screenshot; the Architect should look at the states marked *not looked at*.

| Site (file:line, as of main) | Reached by | Before | After | Changed? |
|---|---|---|---|---|
| `note-window.js:194` (fold save) | pane: folding a section | "Your folded sections could not be saved to your account: {err.message}" — raw Firestore text | same sentence, reason via `whyText(err)` → plain sentence when `err.code` | **changed** (not looked at) |
| `note-window.js:1822` (picture save) | pane editor: insert a picture | `say(err?.message …)` — raw text | plain sentence when `err.code`; service sentences (no code) kept | **changed** (not looked at) |
| `note-window.js:2336` (`saveSetting`, My Note tools) | pane ⋯ → My Note tools → Tabs/Templates/Phrases/Headings | "That could not be saved to your account: {err.message}" | reason via `whyText(err)` | **changed**; flow `pane-mytools` at 390 en run: 15 saves, 15 OK |
| `note-window.js:2505` (`notSavedText`) | every pane save (rename, link, tags, delete, versions, editor) | "Not saved: {err.message}" — raw code/English in the Bangla page | `plainMessageFor(err)` when `err.code`; "Not saved: {why}" kept when the error has only a service message | **changed** |
| `wordpress-import-service.js` ×4, `evernote-import-service.js` ×4 (folder / note / source / placement refusals) | Import notes page, per-item refusal list | `err.message` (Firestore text) shown per item | `refusalText(err)`: plain sentence for a coded error; own "Folder parent refused: …" kept (no code) | **changed** |
| `backup.js:116` | Backup → a collection that cannot be read | "your account is not allowed to read this" / raw `err.message` | — | **kept: a READ failure** |
| `backup.html:258` | Backup → file could not be built | "The backup could not be made: {message}" | — | **kept: a READ/build failure, no write** |
| `backup.html:311` | Backup → roster read fails on load | "Could not work out what to back up: {message}" | — | **kept: boot/read line** |
| `backup.html:163` | Sign-in popup refused | "Sign-in failed: {message}" | — | **kept: sign-in, not a save** |

## Why note-window keeps "Not saved: {why}" when there is no `code`
`Stale Note revision.` is handled before this (its own translated sentence). Other code-less errors are thrown by the note services
themselves (e.g. "Cross-owner or cross-tenant source link refused.") — useful, readable, and the only way to tell the reader why.

## Lines for QR (which carries a pinned copy of note-window.js)
`note-window.js`: new `import { plainMessageFor } from "./errors.js";` (line 24); `whyText()` added after `notSavedText()`;
changed: the fold-save line (~195), the picture-save `catch` (~1823), `saveSetting` (~2337), `notSavedText` (~2505). QR needs `errors.js`
beside its copy — a change notice to the PCA is needed.

## What was run
- `shared-pages-failed-write-audit-browser.mjs --flow=pane-mytools --vp=390`: 15 saves, 15 OK, 0 missing/misleading/stuck.
- `shared-pages-failed-write-audit-browser.mjs` (all pages, no flags) was started and stopped by the 10-minute limit after Classes,
  Course offers, Curriculum, Backup, Import notes, Dawah, Onboarding and Accept invite had finished clean (no failure lines).
- `wordpress-import-screen.mjs`: 21 passed, 0 failed.
- `behaviour.mjs` alone: **971 passed, 0 failed**.
- Not done: refusing writes and recording the exact en/bn wording at 390/820/1440 for each flow; no test asserted the old wording, so none were edited.
