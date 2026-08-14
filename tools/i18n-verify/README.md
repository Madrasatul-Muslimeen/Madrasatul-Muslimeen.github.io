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

node tools/i18n-verify/behaviour.mjs   # ~282 checks, both languages
node tools/i18n-verify/navcheck.mjs    # nav fits at 320-768px, both languages
node tools/i18n-verify/layout.mjs      # landing page vs the previous commit
```

`layout.mjs` compares against the previous commit's copy of the page, so
write that first:

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

`tools/i18n-coverage.mjs` prints a percentage. **It has been wrong, in the
optimistic direction, in all three phases so far** — a filter that skipped
short labels, an escaped quote that invented a phantom string, and an HTML
entity that meant a key could never match at runtime. Every one of those was
caught by opening a real rendered page, never by the report.

**Treat the coverage number as a to-do list, never as evidence.** Only a
behaviour check that reads the rendered DOM shows a screen is truly
translated.
