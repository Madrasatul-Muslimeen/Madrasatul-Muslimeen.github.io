# Full app translation — the plan

Opened 13 August 2026. **Read `CLAUDE.md` first**, then this.

The owner's requirement, in their own words:

> "When we change the language, the entire app (except the Banner) should
> turn into that language. Meaning, the menu, the buttons, all choices in
> all modules. … A person only reads Bangla, nothing in English. He must
> find things in Bangla otherwise he won't use the app."

That is the test this work is measured against: **not "is it translated?"
but "could someone who reads no English at all actually use it?"**

v07.30 (shell round 13) gave the app a global Language preference, but it
only ever changed **tenant-authored names** — people, subjects, Approaches.
The app's own words stayed English. This plan finishes the job.

---

## How big it is — measured, not estimated

| What | Count |
|---|---|
| The app's own English strings (unique, deduplicated across 19 user-facing pages + shared modules) | **641** |
| …of which short labels (≤25 chars) | ~460 |
| …of which real sentences and paragraphs | ~180 |
| Platform data with no Bangla yet: 31 subject-tree names + 10 glosses, 8 module names, 90 Approach Guide paragraphs, 114 surah names, 99 Asma ul Husna meanings, 6 statuses | **~360 items** |
| **Total to translate** | **~1,000** |

**The code is not the hard part. The writing is.** Converting a screen is
mechanical; deciding the right Bangla word for "Approach", "Mastered" or a
Guide paragraph about tadabbur is not.

## The three decisions the owner made, 13 Aug 2026

1. **Claude drafts all the Bangla; the owner corrects it.** Lines Claude was
   least sure of are marked `// ?` in the catalogue — religious, technical
   or Madrasah-specific wording where a wrong Bangla word is worse than
   English. Those are the ones worth the owner's eye first.
2. **Bengali numerals (১২৩) when the app is in Bangla** — ayah numbers,
   dates and scores alike. `num()` in `js/i18n.js` does this. It is applied
   at each render point, never by rewriting the DOM, so an id, a version
   string or a URL can never be mangled.
3. **Admin screens are included.** A Bangla-only person should be able to
   run their own tenant end to end, not only study in one. That is phase 5.

---

## How it works (so a later phase does not reinvent it)

**The key is the English text itself.** `t("Sign out")` looks up `"Sign
out"` in `app/js/i18n/bn.js`. There are no invented key names.

- **A missing translation can never show as a broken key.** It shows the
  English. With ~1,000 strings across six phases the app will be
  half-translated for a while, so the half-translated state has to look
  acceptable — and it does.
- **Static markup needs no editing.** `translateStatic()` walks the page's
  own text nodes on load and swaps any it recognises. That is how ~500
  headings, labels and buttons across 19 pages get translated without
  touching their HTML. It remembers each node's original English, so
  switching *back* to English works too.
- **Dynamic output is translated at render time** by its own `t()` calls.
  A load-time DOM walk cannot see it, and re-walking after every render
  would be both slow and unsafe.

Progress is a number anyone can print:

```
node tools/i18n-coverage.mjs              # summary per phase
node tools/i18n-coverage.mjs --missing    # every untranslated string
node tools/i18n-coverage.mjs --area quran --missing
```

It reads the same catalogue the app reads, so the number cannot drift from
what a phone actually shows.

---

## The six phases

| # | Phase | Strings | State |
|---|---|---|---|
| 1 | **The shell** — nav, Home/Settings, sign-in, splashes, About, onboarding, accept-invite, the six shared statuses | 95 | **DONE, v07.31** |
| 2 | **The Quran module** — `quranrevival.html` end to end, the wheel, the way modal, the reading/listening cards, + 114 surah names | 107 + 114 | **DONE, v07.32** |
| 3 | **The nine other modules** — topic/routine/asma renderers and their pages, + 55 subject names & glosses, + the 30 Approach Guide sets | 242 | **DONE, v07.33** |
| 4 | **Tracking & feedback** — Records, Monitor, Homework, Course Offers, Continue strip | 205 | **DONE, v07.34** |
| 5 | **Admin** — People, Catalogue, Curriculum, Classes | 219 | **DONE, v07.35** |
| 6 | **Asma ul Husna** — 99 meanings, 99 Names in Bangla script, 92 poster captions | 191 + 99 | **DONE, v07.36** |

**All six phases are through. App-wide coverage is 1,099 / 1,099 — 100%.**
Read "Where this actually stands" at the foot of this file before assuming
that means everything in the app is Bangla; several things are deliberately
outside that number.

Each phase ends the same way: coverage at 100% for its area, a behaviour
suite in both languages, and the landing-page layout regression from
`LAYOUT-BACKLOG.md`.

---

## What phase 1 already settled, so later phases inherit it

- **A Bengali font stack, app-wide** (`css/shell.css`). Without it
  `system-ui` can resolve to a font with no Bengali glyphs and the reader
  gets empty boxes — for the person this is *for*, that is not "ugly", that
  is unusable. Also added to `accept-invite.html` and `onboarding.html`,
  which have no nav bar but may well be the first screen a new person sees.
- **Bangla line-height 1.3, measured not guessed.** 1.55 cost a visible
  Approach row at 390px and 412px; 1.3 gives exact parity with English at
  320/360/390/412/768px. Bangla now costs the layout nothing.
- **Common words are translated once** — Save, Cancel, Close, Add, Edit,
  Person, Subject, Approach, Status, Date, Notes, Previous, Next. Later
  phases must reuse these rather than inventing a second wording.
- **Things that are deliberately NOT translated** are listed in the
  catalogue mapped to themselves, so the report counts them as *decided*
  rather than forgotten, and nobody "fixes" them later: the app's name
  QuranRevival, the Ta'awwudh/Basmala transliteration (Arabic, not
  English), and the Akhlaq/Ilm/Tawheed/Dawah/Hukm motto.
- **The language pickers name Bangla in Bangla, in every language.** That is
  how a Bangla-only reader finds the setting at all, and it is why a naive
  "no Bangla on an English page" check reports a false alarm.

## What phase 2 added to the method

- **`surahName(n, englishName)` and 114 Bangla names** in
  `js/i18n/surah-names-bn.js`. Kept out of `bn.js` because it is *data*, not
  interface wording. Not added to the pulled Quran data either — that folder
  is generated, and re-pulling would overwrite it.
- **`num()` is applied at the point a number is drawn, never to a value.**
  `<option value="2">২. আল-বাকারা</option>` — the text is Bengali, the value
  stays `2` because it is read back with `Number()`. Getting this backwards
  would break every picker on the page.
- **`parseNum()` reads Bengali digits back.** The "Go to" box now accepts
  `২:২৫৫`. A Bangla-only reader on a Bangla keyboard types Bengali digits,
  and a box that refuses what the interface itself taught them to type is
  exactly where someone gives up. Later phases should use it on **any** field
  where a person types a number.
- **Failure messages count (I15).** An error a Bangla-only reader cannot read
  is nearly as useless as no error at all. Messages shown *on screen* are
  translated; `throw new Error(...)` diagnostics with HTTP codes are left in
  English on purpose — they are for whoever is helping, not for the reader.
- **People's names are not translated.** Reciters keep their own names; only
  the language note in brackets changes — "Abdullah Basfar (আরবি)". The one
  exception is the Bangla reciter, whose name is Bangla anyway.

## Two tool bugs phase 2 exposed, both fixed

Worth knowing, because both made the report **overstate** progress:

1. **The filter required a three-letter word.** "Go to" has none, so the
   label was skipped entirely — the report said the Quran module was 100%
   translated while "Go to" sat there in English. Caught by a behaviour test,
   not by the report. Now two letters.
2. **Escaped quotes inside a key truncated it.** `t("Couldn't read \"{text}\"…")`
   was reported as a phantom missing string called `"Couldn"`. The `t()`
   matcher now understands escapes, and fragments containing a stray
   backslash are dropped.

**The lesson for later phases: the coverage number is a guide, not proof.**
Only a behaviour test that reads the actual rendered page can tell you a
screen is really translated.

## What phase 3 added to the method — the most reusable finding yet

**Platform data is translated at READ time, not at seed time.** The 55
subject-tree names, their glosses and the 30 Approach Guide sets are written
in `js/catalogue-data.js`, but that file is a **seed**: its text was copied
into each tenant's own Firestore documents when the tenant was created, and
it is never re-read afterwards. Adding `bn` there would have translated the
app for a madrasah created tomorrow and done **nothing** for the owner's own
tenant, seeded weeks ago — the one tenant that actually matters today.

So `langText()` in `js/lang.js` now falls back through the same Bangla
catalogue, keyed by the English it finds stored:

```
value[lang]  →  t(value.en)  →  value.bn  →  value.en  →  fallback
```

That fixes every existing tenant at once, with **no data migration, no
Firestore write and no rules change**. A tenant that has authored its own
Bangla still wins, because `value[lang]` is checked first.

**Phase 4, 5 and 6 should assume the same shape** — anything already seeded
into Firestore in English becomes translatable by adding a catalogue entry,
not by editing the seed.

## What phase 4 added to the method

Phase 4's real finding is about the *tool*, not the writing: **three whole
shapes of user-visible string were invisible to `tools/i18n-coverage.mjs`**,
so the report could show an area at 100% while a table column, a picker and
every write-failure message on every screen sat there in English.

1. **Label maps.** A stored identifier becomes readable text through a small
   map whose values are the English keys:

   ```js
   const CONFIRM_STATE_LABELS = Object.freeze({ pending: "Awaiting confirmation", … });
   export function confirmStateLabel(id) { return t(CONFIRM_STATE_LABELS[id]); }
   ```

   `t()` gets a *variable*, so no extractor pattern could see the wording.
   **The `_LABELS` suffix is now a convention, not a coincidence** — the
   report reads any `*_LABELS` map's string values. Name one that way and its
   wording is counted; name it something else and it is silently uncounted.
   Phase 4 introduced eight: confirm state, activity action, unit type,
   submission state, offer/class status, role in class, app role, and the
   weekday row.

2. **Singular/plural pairs.** `t(n === 1 ? "…entry…" : "…entries…")` — the
   matcher only saw a quote sitting immediately after `t(`, so the plural
   half, the one shown almost every time, was never counted.

3. **A whole file belonging to no area.** `js/errors.js` holds the eight
   plain-language sentences a person sees when a save fails — the entire
   visible surface of I15 — and no area listed it, so it was neither
   translated nor reported as missing. It is in `shell` now, and its messages
   are written as `() => t("…")` thunks so they are both translated at call
   time and visible to the report.

**And two things translated for the first time that phases 1-3 had shipped
past**, both found by opening a page rather than reading a report: the "no
account found yet" dead end, which twelve pages each carried their own
English copy of (now one `noAccountMessageHtml()` in `nav.js`), and the role
names in every page's tenant picker — "Madrasatul Muslimeen (owner, prime)".

Method points a later phase must follow:

- **The first real use of the context suffix.** Homework's note form has a
  label meaning "about WHICH student", and it was picking up the nav's own
  translation of the About *page*. `t("About|person")` plus
  `data-i18n-ctx="person"` on the markup is the fix i18n.js reserved for
  exactly this. Expect more collisions as the admin screens land: check a
  short word's *other* meanings before reusing a phase-1 key.
- **A possessive cannot be assembled.** `<span>{name}</span>'s enrolments`
  and `Assignments for <span>{name}</span>` both put the name and the
  relation the other way round in Bangla, so the whole line has to become one
  `t("{name}'s enrolments", { name })` sentence rendered by JS. The same is
  true of any button whose caption embeds a name (`Enrol {name}`).
- **Identifiers stay identifiers, but they get a reader-facing twin.**
  `unitKeyLabel("ayah:1:1")` gives "Ayah 1:1" / "আয়াত ১:১" while the key
  itself, the CSV export and the chunk key are untouched. Same split
  `statusLabel()` established in phase 1.
- **A CSV is a data export, not a screen.** Its header row is translated;
  its dates, unit keys and action ids are not — they get filtered, sorted and
  read back, so they carry the canonical value.
- **Dates come in two shapes.** An ISO string that *is* the stored value gets
  `num()` only. A human-formatted one takes the reader's locale
  (`toLocaleDateString("bn-BD")`) so month names translate too. An `<input
  type="date">` value is never touched — the browser parses it back.

## A third tool bug, and the one that proves the rule

The report said the modules area was **100% translated while the intro
paragraph on every module page was still in English.**

The cause: the extractor read `Islamic History &amp; Story` from the HTML
source, but `translateStatic()` reads text nodes from the live DOM, where
that has already become `Islamic History & Story`. The catalogue key could
never match at runtime. Now the extractor decodes entities (`&amp;`,
`&mdash;`, `&hellip;`, `&rarr;` …) so its keys are what the app will actually
look up, and the affected catalogue keys were rewritten.

**It was found by opening a real rendered page and reading it — not by the
report, which was confidently wrong.** That is now **four** phases in which
the coverage number overstated progress. Treat it as a to-do list, never as
evidence. `tools/i18n-verify/probe.mjs` (added in phase 4) exists to make the
honest check cheap: it prints a page's whole rendered text, its pickers and
its placeholders, in either language.

## What phase 5 added to the method

Phase 5 was the first phase whose coverage report was **very nearly honest** —
one missing string, not a whole invisible category. The `_LABELS` convention
phase 4 introduced is why: every new identifier map this phase added was
counted the moment it was written. That is the convention paying for itself.

Reading the rendered pages still found things the report could not:

- **A status value nothing else uses.** `modules.js` seeds a module as
  `"planned"` and flips it to `"active"` when that module's UI ships. Every
  other status in the app is active/archived, so `planned` sat outside the
  map and printed raw in the Catalogue's Modules table. A label map is only
  as complete as the values that actually reach it — check the *writer*, not
  only the screens.
- **Two `t` shadows waiting to happen.** `trackableRowHtml(t)` took the
  trackable as a parameter named `t`, and a filter callback did the same, so
  any `t("…")` added inside either would have silently called the wrong
  thing. Phase 2 hit this exact shape with `surahName`. Renamed to `row`
  before translating those bodies.
- **A real pre-existing I11 bug**, not a translation gap: `classes.html` read
  a class's gloss straight off `.en`, so a tenant that HAD authored Bangla
  for it still saw English. Now through `langText()`, and a behaviour check
  proves it with a stub row whose two languages actually differ.

Method points phase 6 inherits:

- **`js/labels.js` is where an identifier's wording goes when no single
  domain module owns it.** It holds role names and the lifecycle status
  (active / archived / ended / pending / accepted / revoked / planned /
  draft) shared by subjects, trackables, modules, ladders, levels, curriculum
  units, classes, course offers, enrolments and invites. It imports only
  `i18n.js`, so even a pure renderer like `nav.js` can use it without gaining
  a Firebase dependency (I2). `roleInClassLabel` and `contextStatusLabel` in
  `course-offers.js` are now re-exports of it rather than second copies.
- **A confirm() dialog is a screen too.** `Archive "{name}"?` was built by
  concatenating an English verb onto a quoted name — which reverses in
  Bangla. Each branch is now its own whole sentence, the same rule phase 4
  set for possessives.
- **An identifier shown as a tag should be resolved to a name.** The subject
  tree printed raw moduleIds (`deen`, `quranrevival`) as tags. They are now
  looked up in the modules the page has already loaded, so they follow
  `langText()` and any admin rename — never a second hardcoded list.


## What phase 6 added to the method

The owner's decision came first, before any Bangla was written: **the 99
Names follow the standard Bangladeshi renderings** — the wording used in
the Islamic Foundation Bangladesh Bangla Qur'an and the 99-Names lists that
circulate from IFB and As-Sunnah Foundation — not fresh translations of this
app's own English glosses. The owner intends to supply their own prepared
list later; replacing these is a single edit per Name, in one file, with
nothing to deploy but the static files.

- **A transliteration is not a translation, and Latin script is unreadable.**
  A card showed the Arabic, a Latin transliteration ("Ar-Rahman") and the
  English meaning. Translating only the meaning would have left a
  Bangla-only reader with one usable line out of three. So the Name itself
  is language-keyed, through `asmaName(number, transliteration)` — an exact
  copy of phase 2's `surahName()`, for exactly the same reason. **Any later
  work that renders a name in Latin script should assume it needs this.**
- **Two files, because they are two different kinds of thing.** The Bangla
  *meanings* are interface wording this app wrote, so they live in `bn.js`
  keyed by their English, where `tools/i18n-coverage.mjs` counts them. The
  Bangla *Names* are data indexed by number, so they live in
  `js/i18n/asma-names-bn.js`, exactly as the 114 surah names do.
- **Do not fill a `bn:` slot in a data file that `langText()` already
  covers.** `asma-data.js` has 99 `meaning: { en, bn: null }` objects and
  filling them was tempting — unlike phase 3's `catalogue-data.js`, that
  file is never seeded into Firestore, so it would have worked. It was left
  empty on purpose, and its header now says why: a `bn` there **wins** over
  the catalogue (`value[lang]` is checked first), so it would silently
  override any correction later made in `bn.js`, and the coverage report —
  which reads `bn.js` and nothing else — would show 0% while the screen
  showed Bangla. One source, not two.
- **A stub with no row proves nothing** — phase 4's rule, hit again. The
  Asma detail panel prints "Not started yet." unless a claim exists, so its
  status line could not be checked at all until `firebase-stub.mjs` gained a
  `subject_asma_ul_husna` records chunk and a `studied_asma` trackable.
  Without the trackable, `asma-study.js` returns early from the way modal
  and the modal's title — the only place the Name is drawn outside the grid
  — never renders.
- **`firebase-stub.mjs` is one big template literal.** A backtick in a
  comment added to it ends the string and the whole suite dies with a
  syntax error pointing at the wrong thing. Noted in its own header now.

## The tool's fourth bug — and the first one that hid strings completely

The three earlier tool bugs all inflated the *numerator*: a string was
counted as present when the screen still showed English. Phase 6's hid the
**denominator**.

`label: 'Al-Mu\'mim'` was read by a matcher whose body was `[^"'`]`, which
stops dead at the backslash. The fragment then carries a stray backslash,
so `LOOKS_USER_FACING` dropped it — the string was never counted, and
therefore could never be *reported missing*. Five of the 93 poster captions
are apostrophised, so the area could have reached a confident "100%" with
five captions still in English and no line anywhere in the report saying
so. The `label:` matcher is escape-aware now, in both quote styles.

**That is five phases and five wrong numbers.** The rule stands unchanged,
and it is the single most reusable thing this project learned: *the coverage
number is a to-do list, never evidence.* Every one of the five was found by
opening a rendered page.

**Two `t` shadows were also caught before they could bite**, by grepping for
them before translating anything nearby rather than after: `trackables.find((t) => …)`
in `asma-study.js`, and — the more dangerous one — a local `const num =`
in the same file, on the exact line that then needed the imported `num()`.
Phases 2 and 5 each hit this shape too. **Check for a shadow of `t` and
`num` before adding a call to either.**

## What phase 6 fixed outside its own area

Both found by reading rendered output, neither visible to the report:

- **`"Claimed and confirmed."` was English on every study screen in the
  app** — the message shown after every successful claim, at five call
  sites (`quranrevival.html` twice, `topic-study.js`, `routine-study.js`,
  `asma-study.js`). None of them ever wrapped the ternary in `t()`, and the
  report's plural/ternary matcher only fires *inside* `t(...)`, so both the
  quran and modules areas showed 100% throughout. Its sibling string,
  `"Claimed — waiting for confirmation."`, had been sitting translated in
  `bn.js` since phase 1, unused.
- **The Asma detail panel printed raw identifiers**: a `claimedStatus` with
  its underscores swapped for spaces, and a bare `confirmState` id —
  meaningless in either language. Both go through the shared label helpers
  now. `confirmStateLabel` moved from `records.js` to `labels.js` and is
  re-exported, because `asma-renderer.js` had to print it and is a pure
  renderer (I2) that must never gain a Firebase dependency — the same move,
  for the same reason, that `labels.js` was created for in phase 4.
- **A poster caption read `Al-Aleem3`**, straight off a filename. The URL
  keeps the real filename; only the caption changed.

---

## Where this actually stands, now that all six phases are through

**Covered.** Every screen in the app: the shell and navigation, the Quran
module, all nine other study modules, records, monitor, homework, course
offers, and the four admin screens. Platform content too — 55 subject names
and glosses, 30 Approach Guide sets, 114 surah names, and the 99 Names with
their meanings. Failure messages (I15), identifier labels, dates and
numerals. A person who reads only Bangla can now sign in, study, record
progress, and run a tenant without meeting English.

**Not covered, and each of these is a deliberate decision, not an oversight:**

- **The language is per browser, not per person.** It is stored in
  `localStorage` (`mm_app_lang`), which was the owner's own call in v07.30,
  taken so the setting needed **no new startup read, no new collection and
  no `firestore.rules` change** — the load-speed contract and I9 stay
  untouched. The accepted cost: set Bangla on the phone and the tablet still
  opens in English until it is set there too, and a new device starts in
  English. `js/prefs.js` is deliberately shaped so a Firestore sync can slot
  in behind the same `getAppLang()` getter with no call site changing. **That
  sync is the single most likely next request** once more than one person
  uses the app on more than one device.
- **The tenant banner.** Excluded by the owner in the original requirement
  ("the entire app (except the Banner)"). It is tenant-authored content;
  `langText()` will render a Bangla banner if a tenant writes one.
- **Only two languages exist.** `CATALOGUES` in `i18n.js` holds `bn` alone.
  A third language is a new catalogue file and a new option in the picker —
  the machinery does not need changing.
- **People's own names are never translated**, including reciters'. Only the
  bracketed language note beside a reciter changes.
- **Arabic is never touched** — ayah text, the Names' Arabic, the
  Ta'awwudh/Basmala transliteration.
- **A few strings are mapped to themselves on purpose**, so the report
  counts them as *decided* rather than forgotten and nobody "fixes" them
  later: the app's name QuranRevival, and the Akhlaq/Ilm/Tawheed/Dawah/Hukm
  motto.
- **Bangla wording is a first draft throughout.** Lines marked `// ?` in the
  catalogue are the ones worth the owner's eye first — concentrated in
  religious and technical wording, and in phase 6 specifically on
  Al-Waliyy/Al-Wali (two distinct Names most Bangla lists render
  identically) and Ad-Darr (theologically the most sensitive line in the
  project).
- **Data exports stay canonical.** A CSV's header row is translated; its
  dates, unit keys and action ids are not, because they are read back.
- **`throw new Error(...)` diagnostics stay English** — they carry HTTP
  codes and are for whoever is helping, not for the reader.
- **Pre-existing, and not a translation problem:** at 320px the *English*
  nav truncates "Operation" and "Bookmark" (73px of text in a 65px box).
  Bangla fits there where English does not. Worth fixing on its own.

**How to check any of this yourself, in one command each:**

```
node tools/i18n-coverage.mjs                        # the number (a to-do list, not proof)
node tools/i18n-verify/behaviour.mjs                # 424 checks, both languages
node tools/i18n-verify/probe.mjs /app/<page> bn     # READ what a page really renders
```

## Known, and deliberately left

- ~~**Page headings still carry developer noise**~~ — **done.** Phase 4
  cleaned "Records (Phase 3)", "Monitor (Phase 8)", "Homework (Phase 9)" and
  "Course Offers (Phase 7 round 2)"; phase 5 cleaned "People (F-012)",
  "Catalogue (Phase 2)", "Curriculum (Phase 11)", "Classes (Phase 10)" and
  the "Study Mode handover lock — test only (F-016)" block. A behaviour check
  now fails if `(Phase n)`, `(F-nnn)`, `round n`, `Stage B2` or an invariant
  reference reappears in any page's title, heading or intro.
- **At 320px wide the English nav truncates** "Operation" and "Bookmark" to
  73px of text in a 65px box. **Pre-existing** — measured identically on the
  commit before this round — and *not* a Bangla problem: Bangla fits at
  320px where English does not. Worth fixing on its own, not inside a
  translation phase.
- **`.nav-cat > summary` truncates silently** (`white-space: nowrap` +
  `text-overflow: ellipsis`). Any phase that changes a category label, in
  either language, must re-measure. See `LAYOUT-BACKLOG.md`.
