# Layout backlog — what's still to organise

Opened 13 August 2026, after shell round 11 (v07.28). This is the pick-up
list for the layout work still outstanding, written so a **new session can
start from this file** without reading the whole shell-round history in
`CLAUDE.md`.

**Read `CLAUDE.md` first, always.** This file is a backlog, not a
replacement for the standing brief. In particular: the owner is a non-coder,
verification has to be mechanical, and layout rounds on `quranrevival.html`
are measured in headless Chromium before and after (see "How these rounds are
verified" at the bottom).

Items are in the order the owner wants them picked up. Item 1 is agreed and
ready to build; item 2 is agreed in principle with the shape worked out;
items 3–5 are parked with the owner's own reasons recorded.

---

## 1. One global Language preference — AGREED, READY TO BUILD

**Owner's ask, 13 Aug 2026:** *"about taking the Language button to the app's
home button under settings … because that doesn't belong here."* They are
right, and this was already half-answered in v07.28 — Language is not a
Quran-module choice, it just has nowhere else to live yet.

Do this one **in its own session**, not as part of a `quranrevival.html`
layout round: it touches shared `js/nav.js` and potentially every page, which
is a different blast radius from "move things inside one panel."

### The real state of the code (checked, not assumed)

- `currentLang` exists in **`app/quranrevival.html` and nowhere else.**
  `grep -rn "currentLang" app/` returns 21 hits, all in that one file.
- Every other page and module passes the **literal `"en"`** into
  `langText()` — see `js/topic-study.js`, `js/routine-study.js`,
  `js/asma-study.js`, `catalogue.html`, `records.html`, `homework.html`,
  `curriculum.html`, `classes.html`, `course-offers.html`, `people.html`,
  `monitor.html`, `js/monitor.js`, `js/way-modal.js`, `js/topic-renderer.js`.
- So **Bangla currently works in the Quran module alone.** Everywhere else it
  is unreachable no matter what the tenant has stored, even though the data
  is language-keyed (I11) and often has `bn` filled in.
- **No user-preference store exists in the new build.** `TENANT` in
  `js/collections.js` has no prefs collection; `LEGACY.USER_PREFS`
  (`"userPrefs"`) is the *old* app's, referenced only by `js/self-check.js`
  as a legacy probe. The only client-side preferences in the new build are
  `js/splash.js` (localStorage, `mm_splash_pref` / `mm_qs_splash_pref`) and
  `js/session-context.js`.
- `js/nav.js` renders the Settings placeholders from
  `SETTINGS_PLACEHOLDERS = ["Language", "Appearance"]`, emitted by
  `renderHomeExtras(roles)` into the Home `<details>` once roles resolve.

### Two decisions the owner has to make first — ASK, DO NOT GUESS

**(a) Where does the preference live?**

| | Follows the account across devices | Startup cost | Rules change |
|---|---|---|---|
| **localStorage** (recommended first step) | No — per browser | None | None |
| **Firestore doc keyed by uid** | Yes | A new startup read | Yes, a new collection |

localStorage matches the precedent already in the codebase (`splash.js` keeps
its own preferences exactly this way) and costs nothing at startup. The
Firestore version is a real improvement but **adds a read to the startup
path, which the load-speed contract says must be flagged to the owner before
it happens (I9)** — so it cannot be slipped in quietly. Recommend shipping
localStorage first and offering the sync as its own later round.

**(b) Does "language" mean one thing or two?** This is the sharper question,
and it is easy to miss. In `quranrevival.html`, `currentLang` does **two
different jobs**:

1. **Which language user-visible names appear in** — person names, Approach
   names, section names, tenant banner. This is the I11 concern, and it is
   genuinely global: it should apply to every module identically.
2. **Whether the Bangla ayah translation is shown next to the English one** —
   `translationLangs()` returns `["en", "bn"]` when `currentLang === "bn"`,
   and `wbwLangs()` follows it unless overridden.

Job 2 is arguably a *Quran reading* choice, not an app-language choice — it
belongs in the Reading view card next to the Translation picker, not in
Settings. Splitting them is the cleaner design, but it means the owner will
have two controls where they have one today, so **ask them** rather than
deciding on their behalf. There is also a wired behaviour that depends on the
current merged meaning: picking the Bangla reciter auto-switches the text to
Bangla (owner request, 8 Aug 2026 — see `renderAudioControls()`); whatever is
decided must keep that working or be raised explicitly.

### Scope boundary worth stating up front

`renderNavBar()`'s own link labels ("Quran Study", "Operation", "Homework" …)
are hardcoded English strings. A global language setting that does not
translate the nav bar is a partial feature, and translating it is a separate
I11 job across `js/nav.js`. Say so to the owner when the round is scoped —
do not let it be discovered afterwards.

### What "done" looks like

- A real, stored language preference with a shared reader (a small
  `js/prefs.js` or an addition to an existing shared module).
- The control lives under **Home → Settings**, replacing the disabled
  "Language" placeholder in `js/nav.js`. Note `nav.js` is deliberately a
  **pure renderer** with no click handlers (I2, shell round 3 — the
  categories are native `<details>`); adding a live `<select>` means either
  the renderer emits it and the caller wires it, or that purity is given up
  on purpose. Decide deliberately.
- Every page that currently hardcodes `"en"` reads the preference instead.
- `quranrevival.html`'s own Language cell leaves bar 1, and bar 1 becomes
  three cells — or gains a fourth from item 2 below. **Check the bars still
  hold one line each afterwards.**

---

## 2. The rest of the Study options organising — OWNER CONTINUING

The owner's words, 13 Aug 2026: *"There's more layout organising needed …
Then I can do the rest of the layout organising."* Not yet specified — this
is a conversation to have with them, the same way shell rounds 4–11 were.
What is already known to be odd, so it does not have to be rediscovered:

- **The banner-admin block is the one genuinely unrelated thing in the
  panel.** "Edit banner" plus its form sits between the summary strip and
  `<h2>Study</h2>`, purely because shell round 5 moved it off the landing
  page to save height. Owner/prime only. It has no relationship to studying.
  If a real Settings surface lands in item 1, that is where it belongs.
- **The Study screen underneath the bars has not been organised at all.**
  Only the *controls* were grouped in round 11. Below them sit
  `#singleAyahNavRow` (Previous / position / Next), `#ayahPanels` and
  `#pageViewContainer`, in the shape they have had since Phase 5.
- **The summary strip stays as it is** — Person / Unit / Approach / Reading /
  Listening. The owner asked whether it duplicated the buttons; the answer
  was "half," they were offered trim / remove / keep and **chose keep**.
  *Do not re-open this unprompted.* If Language leaves bar 1 (item 1), the
  strip's Person and Approach chips become slightly more valuable, not less,
  since those are the two truncating selects.

---

## 3. Make the Mastery Wheel reflect the selected Study Unit — PARKED

Fully described in `CLAUDE.md` (search "Parked, owner-approved 13 Aug 2026").
Summary so it is findable from here: `renderWheel()` is hardcoded to the
**current ayah** on both axes, so for Range / Whole Surah / Ruku' / Juz /
Page the wheel shows one ayah while "Track this unit" claims something else.
v07.26's fix — keeping the dock's "Tracking:" line alive for exactly those
five units — is a correct stopgap, not the fix.

Two things make this bigger than a rendering change:

- **Juz and Page chunk to `subject_quran`**, a different records document
  from the `surah_${n}` chunk already loaded, so those two need a second
  read **on the landing page's startup path** — an I9 / load-speed-contract
  conversation, not just CSS.
- **The owner's steer:** what the wheel's centre shows for a multi-ayah unit
  is **six separate decisions, one per unit type** (`ayah` / `range` /
  `surah` / `ruku` / `juz` / `page`), not one global rule. Ask them for all
  six when the round is picked up. **Do not infer them.**

---

## 4. Choosing a translation by the translator's name — PARKED

Owner asked for it and parked it in the same message (13 Aug 2026): *"that
build we can do later … we now concentrate on organising the layout only."*

The Reading view card already carries a **disabled** `#translationChoiceSelect`
and a plain note, so the place it will live is visible and honest.

**The data question comes first, and it is the whole job.**
`tools/quran-data-pull` packages one English and one Bangla translation per
ayah into the per-surah JSON files. More translators means re-pulling and
re-packaging every surah file (and re-uploading them wherever they are
served from), not adding a dropdown. Scope that before promising a picker.

---

## 5. The owner's own tenant banner — ONE-LINE, NOT A BUILD

Their tenant's banner text still repeats the app's own title and tagline
("QuranRevival" / "Reviving the Quran, abandoned."), so the landing page
prints it twice and it costs a visible Approach row. **Authorized by the
owner to be cleared since v07.23**, but it is tenant content in Firestore
and every session since has run without Firebase credentials, so it has
never actually been done.

**A session with real Firebase access should offer again.** Otherwise it is
three taps for the owner: Study options → Edit banner → empty both fields →
Save. `renderBanner()` already hides the whole strip once it is empty.

---

## How these rounds are verified

Every `quranrevival.html` layout round since v07.22 has been measured, not
eyeballed, and the next one should be too. The method that works:

- Headless Chromium (Playwright) against the local server (`node serve.js`,
  port 8080).
- **Stub Firebase at the network layer** — intercept
  `https://www.gstatic.com/firebasejs/**` and `**/js/firebase-init.js` and
  serve a stub module. This matters: an earlier attempt that merely *blocked*
  the imports silently tested nothing, because the page's module script never
  ran at all. The point is to have the page's own handlers really execute.
- Real Quran data is already on disk at `tools/quran-data-pull/output`, so
  surah loading, Prev/Next and the typing field all work for real.
- Measure **before and after** by serving the previous commit's copy of the
  page alongside the new one (`git show HEAD:app/quranrevival.html`).
- Five viewports, both banner states: 390×844, 412×915, 390×700, 360×640,
  768×1024, with the tenant banner set and cleared.
- What to assert every time: wheel-heading top, wheel width, visible
  Approach-row count, the 9px gap above the dock, dock fully visible, no
  horizontal overflow, every `getElementById` target still resolving, and no
  page errors.
