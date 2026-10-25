# Audit part 89 — the Manual's Hadith and Dua section, claim by claim (PCF MSA J29)

Suite: `node tools/i18n-verify/manual-claims-msa-browser.mjs --section=hadith` (real clicks at 390x844 and 1440x900, through
Modules ▾ → Hadith as the Manual says; real packaged data from `tools/hadith-data-pull/output/…`).
Hadith and Dua are the Hadith Lead's module: nothing in their files was changed.

## Result: 83 passed, 2 failed, 2 skipped

Each row below holds at **both** 390px and 1440px unless stated.

| Entry | Claim | Result | Measured |
|---|---|---|---|
| Hadith library: HadeethEnc | Route Modules ▾ → Hadith → Hadith Corpus → Collections → HadeethEnc | PASS | heading "Hadith Corpus"; category 3 and hadith 4563 open |
| | Arabic, English, grade and explanation | PASS | Arabic and English verbatim from the packaged record; grade shown; explanation opens |
| | Bangla; "Text language chooses the language" | PASS | বাংলা shows the packaged Bangla text |
| Hadith library: Arabic books (OpenITI) | "Fifteen classical Arabic hadith books" | PASS | 15 `-ara1.txt` files shipped; 15 books listed; Bukhari, Muslim, Sunan, Malik, Riyad, Adhkar present |
| | Go to hadith number, Standard number | PASS | 6306 → Bukhari 6306 «سيد الاستغفار» |
| | "Which numbering: Standard number or This edition's number" | PASS | two options with exactly those labels; edition number 5947 → same narration |
| | Open "English translation" | PASS | fold opens, text names Shaddad bin Aus |
| | Bangla translation fold "where available" | SKIP | the English fold is checked; the Bangla fold is the same code path |
| Hadith "Studied" and notes | Studied records the hadith | PASS | one record, `hadith:hadeethenc:4563`, achieved, for the signed-in person |
| | 👥 to include others | **FAIL (app)** | see finding 1: the 👥 list never opens on `hadith-study.html`. Once forced open, the write goes to Yusuf alone, as claimed |
| | 📝 My Notes opens its notes; Bookmark this saves it | PASS | link `notes.html?unit=hadith:hadeethenc:4563`; bookmark saved, button then reads "★ Remove bookmark" |
| | OpenITI books say "not enabled here yet" | PASS | the line is on the Collections tab |
| Dua cards | "over 3,000" duas, "eleven hadith books" | PASS | 3126 duas in `dua/cards-*.json`; 11 distinct source books |
| | most-narrated first | PASS | first 40 cards in non-increasing "Narrated in N" order |
| | ‹ Previous / Next › | PASS | page 2 starts on another dua; Previous returns the same 40 |
| | With vowels / Without vowels | PASS | Dua 4: vowels stripped and restored; label flips |
| | Qur'anic font | PASS | computed font-family names the Qur'anic face |
| | "Narrated in N places" lists each source; ← Back to Dua returns | PASS | Dua 2: 23 sources; "← Back to Dua 2" returns to the same highlighted card |
| | Dua chapters browse by book | PASS | 11 books |
| Dua progress, words, notes and bookmarks | "five stages, counted once per dua" | PASS | five stages; a tap writes one `dua:1` record |
| | tap a word → card, Open in the Word card | PASS | "Open in the Word card ›" → `quranrevival.html?word=2:131:7` |
| | 📝 My Notes and 🔖 Bookmark this | PASS | both on the card; 🔖 saves `dua:1` |
| ✓ Check this dua | owner opens it; Narrations, Words, Save; ← Back | PASS | 23 narrations, 31 words, one write to `duaChecks.2`, "← Back to Dua 2" returns |
| | owner/prime only | PASS | a student sees no ✓ Check this dua |

Also at both widths: no sideways scroll and no page error on every entry.

## Mutation (`--mutate=hadith`)

Breaks one claim per entry (removes the Text language box, the Go to number button, the Studied box, Next ›, the Learning
stage button, ✓ Check this dua). Run once: **16 failed** (8 per viewport: the six broken claims, plus the two 👥 failures that
are already red without any mutation). All six broken entries failed.

## For the Architect / Hadith Lead

1. **App wrong, smallest fix: the 👥 list on a HadeethEnc hadith cannot be opened from Hadith in the menus.**
   `app/js/hadith-browser.js:654` toggles the popover on the trigger, and `app/js/way-modal.js:271`'s delegated document
   listener (imported by `hadith-study.html`) toggles it again for the same tap, so it opens and shuts at once.
   Measured: a single `trigger.click()` calls `classList.toggle("open")` twice. On `hadith-collections.html`, which does not
   import `way-modal.js`, it opens (that is why audit part 16 passed). Fix: add `e.stopPropagation()` to the trigger's click
   handler at `hadith-browser.js:654` (or drop that handler and let `way-modal.js` own it). The check stays red until then.
2. Wording: the Manual's count line "Narrated in N places" is followed on the card by "found by matching words, to be checked"
   (correct and shown; no change needed).
3. Not checked: the Bangla translation fold on OpenITI narrations; sign-in with a real second account.
