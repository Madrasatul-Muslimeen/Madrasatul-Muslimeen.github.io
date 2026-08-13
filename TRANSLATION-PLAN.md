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
| 4 | **Tracking & feedback** — Records, Monitor, Homework, Course Offers, Continue strip | 138 | |
| 5 | **Admin** — People, Catalogue, Curriculum, Classes | 179 | |
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
report, which was confidently wrong.** That is now three times the coverage
number has overstated progress. Treat it as a to-do list, never as evidence.

## Known, and deliberately left

- **Page headings still carry developer noise** — "People (F-012)",
  "Catalogue (Phase 2)", "Records (Phase 3)", "Monitor (Phase 8)". Those are
  meaningless to any user in *either* language. Each phase should clean its
  own pages' headings as it translates them, rather than translating the
  noise.
- **At 320px wide the English nav truncates** "Operation" and "Bookmark" to
  73px of text in a 65px box. **Pre-existing** — measured identically on the
  commit before this round — and *not* a Bangla problem: Bangla fits at
  320px where English does not. Worth fixing on its own, not inside a
  translation phase.
- **`.nav-cat > summary` truncates silently** (`white-space: nowrap` +
  `text-overflow: ellipsis`). Any phase that changes a category label, in
  either language, must re-measure. See `LAYOUT-BACKLOG.md`.
