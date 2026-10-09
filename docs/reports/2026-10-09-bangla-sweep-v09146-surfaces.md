# Bangla sweep of the v09.143–v09.146 surfaces (issue #697)

Suite: `tools/i18n-verify/bangla-sweep-v09146-surfaces-browser.mjs` (already on `main`; it uses `bangla-sweep-lib.mjs`).
It opens each surface in Bangla at 390px and 1280px and reads every visible text node and aria-label/title/placeholder.

**Result: no English interface text on any surface, so `bn.js` needed no change.** 82 passed, 0 failed.
Surfaces: Asma Name 52 (āyāt, hadith, Word card with the Back pill, Āyah card with one 📝 Note and "পূর্ণ পাঠ"), Names 104 and 120,
a listening bookmark with sound refused, the Read view ⋮ menu and its QCR ticks with the Back pill, the writing sheet
(🔖, pressed state, naming popover), and the pop-out (full screen, ⛶ toggle). I looked at the 390px Āyah card screenshot.

Mutations, each failing and naming its phrase: `Open in Hadith →`, `Continue listening`, `QCR collection(s)…`,
`Bookmark this`, `Full screen`, `Back to {name}`, `Back`, `Full text`.
(`Bookmark this unit`, `Open in window`, `Back to {ref}`, `Back to Word Card` do not appear on these surfaces and pass.)

Other suites: bangla-sweep-core-screens 122/0, newer-screens 23/0, other-pages 224/0, phone-width-overflow 217/0,
stub-parity 4/0, asma-cited-ayat 45/0, listen-bookmark-qcr-card 48/0, behaviour 1004/3.
bn-duplicate-keys: "bn.js has 0 duplicate keys" passes; its separate check "parser finds 65 duplicates in the base file"
fails because the base is now `main` itself, which no longer has them (the check compares to the merge-base).
