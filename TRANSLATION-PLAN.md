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
| 6 | **Asma ul Husna** — 99 meanings + the poster screensaver | 89 + 99 | |

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
