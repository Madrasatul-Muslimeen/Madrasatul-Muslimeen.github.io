# Audit part 86 — screen audit with real-length names, plus the last shared pages (PCF MSA J29, issue #1156)

Suite: `tools/i18n-verify/unchecked-pages-screen-audit-browser.mjs` (`--short` runs the old short names).
Totals: before 675/0 (16 pages, short names). After 956 passed / 13 failed (23 pages, real-length names); the 13 are the two reported items below.

## Step 1 — real-length data on the 16 existing pages
Seed: tenant "Madrasatul Muslimeen (Owner, Prime)"; person "Muhammad Abdur-Rahman ibn Abdullah Al-Hashimi" (Bangla spelling on the second person); Approach "Reading (with Tajweed)"; class and course offer "Weekend Qur'an Memorisation and Tajweed Circle (Year 7–9)"; bookmark "Ayat al-Kursi and the last two āyāt of Al-Baqarah".
Result: all 16 pages × 3 widths × 2 languages stay clean. Nothing cut, nothing sideways.

## Step 2 — the 7 added pages
| Page | First run | Cause | Done |
|---|---|---|---|
| Notes, Journey map | clean | — | — |
| Deen study, Arabic study | 390 en: 3px sideways scroll | `#personSelect` as wide as the longest real name, no `min-width:0` down the label/select chain | FIXED in both pages (CSS); `--mutate=longselect` fails on 6 measurements without it |
| Arabic study | bn: "arabic" shown | stub has no `arabic_language` root subject, so `topic-study.js` prints the module id | CHECK corrected narrowly (`/^arabic$/`): fixture gap, a real tenant has the subject |
| Taglines | 390 bn: row selects 25–27px wide | table squeezed the selects | FIXED (`.cell-narrow select{min-width:7rem}`; the table sits in an overflow-x:auto wrapper); `--mutate=narrowselect` fails on 6 measurements without it |
| Self-check | Sign out / Run self-check 99x39, 146x39 | no min height | FIXED (`min-height:40px`) |
| Self-check | no Back | owner diagnostic, reached by address; no in-app link | CHECK updated like accept-invite (asserts no app page links to it) |
| Self-check | bn: heading, description, Run button English | strings missing from `app/js/i18n/bn.js` (shared) | **REPORTED, left red.** Fix proposed: add the three `bn.js` entries for `Admin self-check (F-008)`, the "One tap…" paragraph and `Run self-check` |
| Landing | bn: "Reading (wit…" | truncated Approach name is tenant data | CHECK corrected narrowly |
| Landing | no Back | the landing is the root every Back returns to | CHECK updated |
| Landing | `wheelCtaBtn` 141x31 / 119x28 / 165x37, `wheelListCollapseBtn` 24x24 | `index.html` shared shell | **REPORTED, left red.** Fix proposed: `min-height:40px` on `#wheelCtaBtn`, 40x40 hit area on `#wheelListCollapseBtn` |
| Landing | 820/1440: footer/menu links "inside body" reported cut | body clips; links sit past the fold inside the shell | **REPORTED, left red** (shell is the Architect's; needs a look at whether it is a real cut or the shell's own scroller) |

The known landing `tenantSelect` cut was not reproduced as a finding by these five measurements; it stays an Owner UI decision.

## Checks
- unchecked-pages-screen-audit: 956 passed, 13 failed (all Landing / Self-check Bangla above).
- Mutations on the new fixes: `--mutate=longselect` on deen-study FAILS (7); `--mutate=narrowselect` on taglines FAILS (6). Existing mutations unchanged.
- `stub-parity.mjs`: 4/0. `bangla-sweep-other-pages-browser`: 224/0 (before: same files untouched except the three pages' CSS).
