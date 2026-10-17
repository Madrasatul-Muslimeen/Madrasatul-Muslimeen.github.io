# One source, many apps (PCA J110)

MSA is built once. Each app (MSA, QuranRevival, later Deen Study and single-subject apps) is one settings file,
`app/apps/<id>.json`, and `build-app.mjs` makes that app's site from this repository.

```
node tools/apps/build-app.mjs <id> [--out=build/<id>] [--only=app,index.html]
node tools/apps/apps-build-check.mjs        # the proof; also runs in the verify workflow
```

`build/` is git-ignored. `app/apps/` is never copied into an app.

## The rule that keeps MSA safe

`app/apps/msa.json` is **today's MSA**, and the source is not changed to serve the other apps. Every build rule
reads "the MSA value" from msa.json and writes the app's value in its place, so building `msa` writes nothing and
gives back the source byte for byte (`apps-build-check.mjs` part 1). Each rule counts what it finds: if the source
stops saying what msa.json says (a title renamed, a cache added in `sw.js`), every build stops with the reason.
**When an MSA change moves one of these values, change msa.json (or the rule's count) in the same commit.**

## The fields

| Field | What it changes in the built app |
|---|---|
| `name.full.en` / `.bn` | the front page's tab title and heading, `app/index.html`'s title, and the Bangla line for the name |
| `name.short` | the heading's short name below 700px |
| `titlePrefix` | every `<title>Prefix — …</title>`, its Bangla lines, and the prefix the bookmark names drop |
| `siteRootName` | the site root page (`/index.html`) and the no-script link |
| `frontPage` | where `/index.html` and `/app/index.html` send the reader (must exist in `app/`) |
| `colours.theme` / `.background` | a `theme-color` on every page head (when MSA has none); the manifest's colours |
| `icon` | a `<link rel="icon">` on every app page (path inside `app/`) |
| `manifest` | `{ file, pages, data }`: writes `app/<file>` and links it from the pages named; icons must exist |
| `cachePrefix` | the offline cache names in `sw.js` (`mm-app-…` → `qr-app-…`) and which old caches its clean-up deletes |
| `hiddenModules` | the modules hidden from every entry point (`hidden-modules.js`); only ids `nav.js` tags can be hidden |
| `site` | the folders and files the app's site is made of |
| `later` | what the next steps still owe (notes, not used by the build) |

Page colours (the palettes inside the CSS) are not settings yet: MSA's pages hold them as literal values, not
tokens. QR uses MSA's palette until a step makes them settings.
