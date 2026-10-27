# Audit part 101: refused saves on Hadith Study and its Dua tab (I15, PCF MSA J29)

Issue #1214. Parts 96–100 measured invariant I15 (a failed write must reach the user) on the 23 shared pages and the note pane.
`hadith-study.html` and its Dua tab were not on that list (`hadith-collections.html` was). This part measures them.
**No file under `app/` was changed**: Hadith and Dua files belong to the Hadith Lead, who takes the fixes below.
There is **no Seerah page yet** (no `seerah*.html` under `app/`); nothing was invented for it.

## Method

`tools/i18n-verify/shared-pages-failed-write-audit-browser.mjs` (part 96/99 mechanism, detector unchanged) has four new flows that open
`hadith-study.html` at the state where each write is pressed, arm the three refusal flags, press each control and require a visible,
in-language "not saved" message for at least 2 s:

| flow | state | controls pressed |
|---|---|---|
| `hadith-card` | Collections > category 3 > HadeethEnc hadith 4563 | 🔖 Bookmark, Studied (a `<select>` that saves on change; the suite now "presses" it) |
| `dua-card` | Dua tab (40 cards) | status buttons, 🔖 Bookmark, ✓ Check this dua (first 7 controls; every card is the same code) |
| `dua-word` | Dua tab > first tappable word | the word card's "My progress on this word" buttons |
| `dua-check` | Dua tab > ✓ Check this dua > "3 · Save" | Save |

Helper changes needed to reach those states without the harness itself changing them: `fill()` leaves Hadith Study's Tenant / Person /
Dua page / text-language pickers alone (changing Person re-renders the whole corpus, which closed the very panel under test); a flow can
list only the controls that save (`only:`); a flow waits for the page text to hold still before reading "before" (otherwise lazily loaded
hadith text read as a "success" message); `--vp=820` adds the tablet width.

## Every write on Hadith Study

| # | control | file:line | result | what the reader sees when refused |
|---|---|---|---|---|
| 1 | 🔖 Bookmark this (HadeethEnc card) | `app/js/hadith-browser.js:628-637` (catch 633-635) | **MISSING** | the raw error alone ("denied by the test" in the stub; Firebase's English text in production), no "Not saved", English in the Bangla page |
| 2 | Studied select (and 👥 others) | `app/js/hadith-browser.js:676-700` (catch 696-698) | **MISSING** | same raw error alone. Also read from code: the select keeps the chosen status after a refusal (only the success path assigns `studiedSelect.value`) |
| 3 | Dua card status buttons | `hadith-browser.js:1810-1815` | OK | "Not saved: …" |
| 4 | Dua card 🔖 Bookmark | `hadith-browser.js:1851-1859` | OK | "Not saved: …" |
| 5 | Dua word card progress buttons | `hadith-browser.js:1747-1762` | OK | "Not saved: …", state reverted, nothing opens |
| 6 | ✓ Check this dua > Save | `app/js/dua-check.js:327-332` via `hadith-browser.js:1558-1563` | OK | "Not saved: …" |
| 7 | Track my progress (way modal) | `app/js/topic-study.js:559-602` | not reached | shared renderer; audited as part 96 on `deen-study.html`. Hadith Study shows no topic with a resource in the test data, so the state cannot be opened here |
| 8 | ☆ topic bookmark, topic-open "where was I" write | `topic-study.js:414-424, 453` | not reached | same; the resume refusal already says "Couldn't save the change" (part 96) |
| 9 | 📝 My Notes links (hadith, dua) | `hadith-browser.js:551-565, 1833-1840` | not a write | plain links to notes.html |

"MISSING" for rows 1–2 was confirmed by looking at the page, not only the detector: with the flags armed, the HadeethEnc card's study
row shows a single extra line, `denied by the test`, in English and in Bangla (screen text read in both languages at 1440). It says
neither that the change was not saved nor, in Bangla, anything in Bangla.

A first run showed these two as MISLEADING ("shows 'Umar ibn al-Khattāb … informs"). That was the probe, not the page: the explanation
text of the hadith loaded late and matched the success pattern. Waiting for the text to settle (above) removed it, and the page was then
read by eye.

## Results (refusal flags armed)

| flow | 1440 en | 1440 bn | 390 en | 390 bn | 820 en |
|---|---|---|---|---|---|
| `hadith-card` | 2 MISSING | 2 MISSING | 2 MISSING | 2 MISSING | 2 MISSING |
| `dua-card` (7 controls: 6 saves) | 6 OK | 6 OK | 6 OK | 6 OK | 6 OK |
| `dua-word` (4) | 4 OK | 4 OK | 4 OK | 4 OK | 4 OK |
| `dua-check` (1) | 1 OK | 1 OK | 1 OK | 1 OK | 1 OK |

Totals: 55 OK, 10 MISSING, 0 MISLEADING, 0 STUCK over 65 pressed saves (`dua-card` presses the first 7 controls of 280 per run; the
rest are the same functions on later cards).

`--mutate=silent --mutate-page=hadith-study.html` on `dua-word`: both pressed saves became MISSING, "caught (the sweep CAN fail)", exit 1.
The suite's own exit status is 1 whenever a hadith-card save is MISSING, as it should be until the fix lands.

## Smallest fixes (for the Hadith Lead)

1. `app/js/hadith-browser.js:634` — `row.appendChild(el("p", "hadeethenc-study-reason", String(err?.message ?? err)))` becomes
   `…, t("Not saved: {why}", { why: String(err?.message ?? err) })` (the string already exists in `bn.js` for rows 3–6).
2. `app/js/hadith-browser.js:697` — the same wording; and in that catch set `studiedSelect.value = studiedStatusId ?? "";` so the select
   goes back to what is really stored.
3. Optional, both: give the line `role="status"` (rows 3–6 do) so a screen reader announces it.

## Not done / limits

* Rows 7–8 (the shared topic renderer) were not exercised on Hadith Study: no topic with a resource exists in the harness data.
* The 👥 "record for family members" path of Studied shares row 2's catch; it was not pressed separately.
* `dua-card` presses the first 7 of 280 controls per width (the cards repeat one code path).
* The two positive controls the suite prints (bookmarks.html Rename; shared-menu 🗑) are page-sweep checks and print "not run" in a
  `--flow` run, as in parts 99–100.
