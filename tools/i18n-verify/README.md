# How the translation work is verified

Checked in 13 August 2026, after phase 3. **Before this it lived only in a
session's temporary folder and died with the session** — so each new session
had to rebuild the Firebase stub from scratch, which is both slow and risky:
an earlier attempt at this harness silently tested *nothing*, because the
page's module script never ran at all (see the note in `harness.mjs`).

Read `../../TRANSLATION-PLAN.md` first for what is being verified and why.

## Running it

```bash
npm install playwright          # once, anywhere outside the repo is fine
node serve.js &                 # from the repo root, serves on :8080

node tools/i18n-verify/behaviour.mjs   # ~424 checks, both languages
node tools/i18n-verify/navcheck.mjs    # nav fits at 320-768px, both languages
node tools/i18n-verify/layout.mjs      # landing page vs the previous commit

node tools/i18n-verify/probe.mjs /app/records.html bn   # READ a rendered page
node tools/i18n-verify/panel.mjs en                     # inside the Study options panel
node tools/i18n-verify/reading.mjs en                   # the reading screen itself
```

`panel.mjs` (added by shell round 14) measures what is INSIDE the dock panel,
which nothing did before it: the panel's own box and whether its content
overflows, each bar's height and whether its cells really sit on one line,
every label and `<select>` that is being silently ellipsised, and how far down
the panel the Study screen starts. It presses `#tabStudyOptionsBtn` itself,
because the panel is hidden until then. Since shell round 17 the Study screen
is no longer in that panel, so `Study screen in panel: no` is the correct
answer there — a number reappearing means the reading has fallen back into
the drawer.

`reading.mjs` (added by shell round 17) measures the reading screen, which
nothing did before it either — the reason the defect it fixed survived ten
layout rounds. It presses `#tabReadBtn`, then reports the height the reading
area really gets, how much of the ayah content that shows, and the same again
with Full screen on, at all eight viewports in both banner states. It also
fails on the two things that are easy to get wrong here and invisible in a
screenshot: a `hidden` view that is still displayed (`#wheelSection` carries
`display:flex` from `.wheel-box`, which beats the UA's own `[hidden]` rule —
this caught it before it shipped) and a full-bleed card overflowing its own
scroller sideways.

**Do not measure a bar's "lines" by comparing top edges.** A labelled
`<select>` and a bare button beside it are bottom-aligned on purpose, so they
start at different heights while sharing one line; panel.mjs groups cells by
overlapping vertical range instead. The first version of it reported two
false wraps.

**`layout.mjs` and `panel.mjs` both run at 1280×800, 1440×900 and 1920×1080
as well as the phones.** Before shell round 14 nothing had ever measured this
page above 768px, and `quranrevival.html` has exactly one media query
(`max-width: 720px`) — so every PC size takes a single path that no test
covered. Keep the desktop rows.

`probe.mjs` (added in phase 4) is not a test -- it dumps what a page really
renders: its title, its whole innerText, every `<select>`'s options and every
placeholder, in either language. It exists because the standing rule below is
easy to agree with and easy to skip, and skipping it has cost every phase so
far. Phase 4's own finds came out of it: a status picker still in English, an
"About" label that had picked up the About PAGE's translation, and a tenant
picker reading "(owner, prime)" on all thirteen signed-in pages.

`layout.mjs` compares against the previous commit's copy of the page, so
write that first. **If this round renamed or moved a module the page
imports, the OLD copy will 404 on it and its script will never run** — every
measurement comes back 0 and the diff looks like a catastrophic regression.
Drop a shim at the old path for the length of the comparison (phase 5 hit
this renaming `js/roles.js` to `js/labels.js`).

```bash
git show HEAD:app/quranrevival.html > app/_prev-quranrevival.html
node tools/i18n-verify/layout.mjs
rm app/_prev-quranrevival.html
```

Set `CHROMIUM_PATH` if Playwright cannot find a browser on its own.

## Why it is shaped this way

**Firebase is stubbed at the NETWORK layer** — `harness.mjs` intercepts
`https://www.gstatic.com/firebasejs/**` and `**/js/firebase-init.js` and
serves a small module in their place. The point is that **the page's own
script really runs**: its handlers, its renderers, its language switching.
Blocking the imports instead would leave the module script never executing,
and every assertion would pass against a blank page.

**The stub's subject tree is deliberately English-only** (`firebase-stub.mjs`).
That is the shape real seeded tenant data has, and it is what proves the
read-time translation fallback in `js/lang.js` actually works — the whole
reason phase 3 was built that way.

**Trackables carry `panels: [...]`**, or the Listening button correctly
disables itself and any audio test times out against a disabled button.

**Every collection carries at least one real ROW** (added in phase 4). A
status pill, an activity action, a submission state or an enrolment role can
only be proved translated if something actually renders it, and empty
collections render an empty-state message instead. Two details there are
load-bearing: a `tenantPeople` doc id is the BARE personId (people.js writes
it that way, and every screen builds records/activity/submission ids from the
snapshot id), and the seeded `activity` doc id carries whichever week the
suite is being run in -- a fixed date silently falls out of range tomorrow.

## Three things that will look like failures but are not

1. **Every language picker names Bangla in Bangla, in every language.** That
   is how a Bangla-only reader finds the setting at all. A naive "no Bangla
   on an English page" check will flag `#navAppLangSelect`,
   `#translationLangSelect` and `#wbwLangSelect` — exclude them.
2. **Controls inside the nav's Home menu and the dock panels are not
   clickable until opened.** Both are `<details>` / hidden panels that start
   closed. Playwright times out on "element is not visible" — open them
   first, which is the real user flow anyway.
3. **At 320px the ENGLISH nav truncates** "Operation" and "Bookmark". That is
   pre-existing, measured identically on earlier commits, and not a Bangla
   problem — Bangla fits there where English does not.

## The standing rule

`tools/i18n-coverage.mjs` prints a percentage. **It was wrong, in the
optimistic direction, in each of the first four phases** — a filter that skipped
short labels, an escaped quote that invented a phantom string, an HTML entity
that meant a key could never match at runtime, and (phase 4) three whole
shapes of string it could not see at all: label maps handed to `t()` through a
variable, singular/plural pairs picked at run time, and `js/errors.js`, which
belonged to no area and so was never even counted as missing. Every one of
those was caught by opening a real rendered page, never by the report.

Phase 5 was the first phase it got very nearly right — one missing string,
no invisible category — because the `_LABELS` convention means a new
identifier map is counted the moment it is written. It still missed a status
value (`planned`) that only `modules.js` ever writes, which is the standing
lesson in its narrower form: **a label map is only as complete as the values
that actually reach it, so check the writer, not only the screens.**

Phase 6 made it **five for five**, and in a new direction: its bug hid five
strings from the *denominator* entirely (an apostrophe inside a `label:`
value tore the match at the backslash), so the area could have reported a
confident 100% with five poster captions still in English and nothing
anywhere listing them. Phase 6 also found `"Claimed and confirmed."` — the
message shown after every successful claim, on every study screen in the app
— sitting in English at five call sites that never wrapped it in `t()`, in
two areas both reporting 100% since phases 2 and 3.

Two harness notes from that round:

- **`firebase-stub.mjs` is one big template literal.** A backtick inside a
  comment you add to it ends the string, and the suite dies with a syntax
  error pointing at an innocent-looking line. No backticks in that file.
- **A collection needs a row that the screen under test actually reads.**
  The Asma detail panel prints "Not started yet." until a claim exists, and
  `asma-study.js` returns early from the way modal when its one trackable is
  missing — so both had to be seeded before either could be checked at all.

**Treat the coverage number as a to-do list, never as evidence.** Only a
behaviour check that reads the rendered DOM shows a screen is truly
translated.
