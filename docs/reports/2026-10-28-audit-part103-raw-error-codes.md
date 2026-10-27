# Audit part 103: raw error codes in refused-save messages (I15, PCF MSA J29)

Method: searched `app/js/**` and `app/*.html` for messages built from `err.code`, `err?.message`, `String(err)`.
"Reached" below means the code path is reachable from a normal control; **only the Bookmark menu was measured in a browser this round**
(`bookmark-remove-browser.mjs` and `bookmark-folder-edit-browser.mjs`, refused write forced, en and bn, 390 and 1280). The
`--flow=` addition to `shared-pages-failed-write-audit-browser.mjs` at 820 was NOT reached this round.
Rows marked "not measured" are listed from reading the source only, not from seeing the page.

## Fixed (shared, Architect)

| File:line | Owner | Reached? | Before | After |
|---|---|---|---|---|
| `app/js/bookmark-nav.js` `showError` (was :631), 🗑 / drag / rename in the Bookmark menu | shared | yes, measured | "Couldn't save the change: permission-denied" / "Couldn't save the folder change: permission-denied" (code inside the sentence, English code in Bangla page) | `plainMessageFor(err)`: "That save was blocked by a permissions rule. Nothing was lost, but it did not save — please tell the admin." (Bangla: "অনুমতির নিয়মে সংরক্ষণটি আটকে গেছে…"); raw code absent |
| `app/js/bookmark-nav.js` `noteBookmarkOpened` (was :163), opening a bookmark | shared | by source only, not measured | "The time this bookmark was opened was not saved: permission-denied" | `plainMessageFor(refused)` |

## Listed, not changed

| File:line | Owner | Message built from |
|---|---|---|
| `app/js/note-window.js:194, 1822, 2336, 2505` | shared Notes (QR keeps a pinned copy: change needs a PCA notice) | `err.message` (service-written text, sometimes the raw Firestore message) |
| `app/js/backup.js:116`, `app/backup.html:258,311` | shared | `err.message` |
| `app/js/topic-study.js:668`, `routine-study.js:629`, `asma-study.js:949` and every `*.html` boot handler `failed at "<step>": code message` | shared / Asma frozen | boot failure diagnostic line, deliberately technical |
| `app/*.html` "Couldn't load …: code message" (monitor, curriculum, homework) | shared | read failures, not saves |
| `app/js/hadith-browser.js:614,626,774,820,1274,1321,1357,1762,1800,1821,1863,1965` | Hadith Lead | `String(err?.message ?? err)` |
| `app/js/dua-check.js:331` | Hadith Lead | `String(err?.message ?? err)` |
| `app/quranrevival.html:23367,23386,25629` | FROZEN, QR | `err.message` |
| `app/js/wordpress-import-service.js`, `evernote-import-service.js` | shared import services | `err.message` collected in a refusals list |

Not reached this round: the `--flow=` measurements for the rows above, and the 820px width.
Whether the `plainMessageFor` sentence suits note-window's "Not saved: {why}" (which adds meaning with service text) is a judgement left to the Architect.
