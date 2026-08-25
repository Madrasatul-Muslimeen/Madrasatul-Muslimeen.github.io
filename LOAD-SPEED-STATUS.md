# Load speed — rounds 1 and 2 (v07.38 / v07.39, 15 August 2026)

The owner's report: *"The app is live and I use it daily; it feels slow to
open."* Their instruction: measure first, deliverable in numbers, tell me the
trade-offs and let me choose.

---

## 1. How it was measured, and what the measurement can and cannot show

The verification harness (`tools/i18n-verify`) stubs Firebase **at the
network layer**, so a page's own script really runs. That is the right base
for this too — but **a stub answers instantly**. Left alone it would have
reported every page loading in a few milliseconds regardless of how many
Firestore reads it makes: a comforting number, and a false one. This was
said to the owner up front rather than discovered afterwards.

So the stub was instrumented (additive; default behaviour unchanged, and the
translation suites never pass the new options):

- **every Firestore call logs itself** — kind, collection, id, start, end;
- **every call waits a set number of milliseconds** before answering.

That yields two honest things. The **call log** is a fact about the *code* —
it does not change with connection speed, and it is the only thing a fix can
reduce. The **wall clock** then shows what that log costs a person at a given
latency.

The headline figure is **round trips in sequence**: reads fired together cost
one wait, reads fired one after another cost one wait each.

**The tenant was measured in the state the owner's real one is in** — seeded
weeks ago, nothing left to seed. The stub's default data is a *half*-seeded
tenant, which makes the seeding paths write on every load; measuring against
that would have flattered or damned the wrong thing. See
`tools/perf/README.md`.

---

## 2. The baseline

Phone viewport 390×844, tenant seeded weeks ago.

| Page | Firestore calls | Round trips **in sequence** | @60 ms | @150 ms | @300 ms |
|---|---|---|---|---|---|
| Quran Study (landing) | 11 | 10 | 0.81 s | 1.70 s | 3.23 s |
| Deen Study | 16 | 14 | 0.99 s | 2.09 s | 4.03 s |
| Health | 17 | 15 | 0.99 s | 2.24 s | 4.35 s |
| Asma ul Husna | 14 | 13 | 0.86 s | 1.94 s | 3.75 s |
| Records | 12 | 11 | 0.74 s | 1.62 s | 3.12 s |

The app frame itself ("Checking sign-in…" clearing) appeared at ~0.9 s
@150 ms and ~1.6 s @300 ms.

Against the load-speed contract (Architecture Part 8), which allows **three
reads after first paint**: the app was making 11–17, nearly all of them
strictly one after another.

### What the 14 trips on a module page actually were

```
 1. userIndex
 2. tenantMemberUids  ┐ initializeActiveContext
 3. tenants/t1        ┘
 4. tenantMemberUids  ┐ getMyMemberships -- THE SAME TWO READS AGAIN
 5. tenants/t1        ┘
 6. modules           ← seed check, nothing to do
 7. subjectTemplates  ← seed check, nothing to do
 8. subjects  ┐ seed check, nothing to do
 9. trackables┘ (fired together)
10. tenantPeople + tenants/t1 (third read of the same document)
11. subjects    ← THE SAME READ AS #8
12. trackables  ← THE SAME READ AS #9
13. records → 14. enrolments → 15. bookmarks   (none depends on another)
```

**The owner's own lead was confirmed** — the three seeding checks (#6–#9) do
run on every page load of every page for a tenant seeded weeks ago. Three
findings beyond it:

1. **Memberships were loaded twice on every page load of every page.**
   `initializeActiveContext()` fetched the list, used it, and threw it away;
   the page then fetched the identical list again for its tenant picker.
2. **Subjects and trackables were read twice** — the seed check read them,
   then `loadContextData()` read them again a moment later.
3. **The tail was needlessly serial** — records, then enrolments, then
   bookmarks, each waiting for the last, though none depends on another.

And one finding about the data model: **`subjectTemplates` is written and
never read.** No screen displays it, and even `ensureTenantCatalogueSeeded()`
builds from the bundled `SUBJECT_TEMPLATES` constant rather than from the
collection. A full-collection read on every load, feeding nothing.

---

## 3. What the owner chose

Two questions were put to them with the numbers attached, per I9 and their
own instruction to be given the trade-offs rather than the clever option.

- **Scope: "Option 2 — remove the waste."** Load memberships once; stop
  re-reading what was just read; seed only when the page's own data comes
  back empty; fire independent reads together. (They did **not** take Option 3,
  which would also have repainted the frame earlier at the cost of touching
  render order on 14 pages.)
- **Registry reads: "take both off the startup path."** Module names come
  from the copy already bundled in the app — which is what the contract asks
  for — with the Firestore check moved to the background; the
  `subjectTemplates` check left to the Catalogue page. Stated trade-off,
  accepted: **an admin's edit to a module or subject reaches a study page on
  the next load rather than the current one.**

---

## 4. What was built

| File | Change |
|---|---|
| `js/session-context.js` | New `bootstrapContext()` returns the context **and** the memberships it used to choose it. `initializeActiveContext()` kept, unchanged in behaviour, now sharing one `pickContext()` helper. |
| `js/catalogue-repair.js` | **New.** `catalogueNeedsSeeding()`, `seedCatalogueNow()`, `repairCatalogueInBackground()`. Full reasoning in its header. |
| `js/topic-study.js`, `js/routine-study.js`, `js/asma-study.js` | Three blocking seed calls removed from the bootstrap and from the tenant-switch handler; `loadContextData()` reads roster + tenant + subject tree + trackables in **one wave**, seeds only if what it needs is absent, then fires records/activity/enrolments/scoping/bookmarks **together**. |
| `quranrevival.html` | Roster, tenant, trackables and the surah index in one wave; `syncUnneditedTrackableNames()` (which caused the second trackables read) moved off the blocking path entirely; program map and surah load run together. |
| `records.html` | Roster, tenant, subject tree, trackables and domains in one wave; chunk and week fired together. |
| 10 pages | `bootstrapContext()` in place of the duplicated pair; the now-unused `getMyMemberships` import dropped. |
| `js/version.js` | 07.37 → 07.38. |

**Nothing was deleted or reshaped (I4).** Every seeding function is untouched
and still writes exactly what it wrote; only *when* they are called changed.
`subjectTemplates` and its contents stand.

**No `firestore.rules`, schema or data changes** — nothing to deploy but the
static files. (v07.37's `userIndex` rules change is still outstanding and is
unrelated to this round.)

---

## 5. The result, measured the same way

| Page | Round trips before usable | @60 ms | @150 ms | @300 ms |
|---|---|---|---|---|
| Quran Study | 10 → **6** | 0.81 → **0.49 s** | 1.70 → **0.93 s** | 3.23 → **1.69 s** |
| Deen Study | 14 → **6** | 0.99 → **0.44 s** | 2.09 → **0.89 s** | 4.03 → **1.65 s** |
| Health | 15 → **6** | 0.99 → **0.44 s** | 2.24 → **0.88 s** | 4.35 → **1.65 s** |
| Asma ul Husna | 13 → **6** | 0.86 → **0.45 s** | 1.94 → **0.88 s** | 3.75 → **1.66 s** |
| Records | 11 → **5** | 0.74 → **0.42 s** | 1.62 → **0.87 s** | 3.12 → **1.63 s** |

The app frame appears at 0.57–0.60 s instead of 0.88 s @150 ms.

The module page's sequence is now: userIndex → memberships → tenant name →
{roster, tenant, subjects, trackables} → {records, activity, enrolments,
bookmarks}. Six waits instead of fourteen, for the same data.

**Why the wheel page stops at 6 rather than 5:** its records chunk depends on
which person is selected, which depends on the roster. Getting below that
means guessing the person before the roster arrives — a different and riskier
change, not attempted.

---

## 6. Verification

- **435 / 435 behaviour checks pass** (`tools/i18n-verify/behaviour.mjs`).
- **`layout.mjs`: NO LAYOUT REGRESSIONS** — the landing page is byte-for-byte
  identical to the previous commit at all five viewports in both banner
  states; 65 `getElementById` targets, none missing.
- **`navcheck.mjs`: unchanged in both languages** — 4 buttons on one line at
  every width, same Approach-row counts (7/6/5/5/10). The single reported
  problem is the pre-existing 320 px **English** truncation of
  "Operation"/"Bookmark", which the harness README already records as
  expected and which Bangla does not have.
- **Translation coverage 1,099 / 1,099 (100%)**, every area at 100%.
- **`tools/perf/new-tenant.mjs` (new): 10 / 10.** Each study page run against
  a tenant with **no catalogue at all** seeds, then renders real content, with
  no page errors — and a tenant already set up is proved **not** written to on
  a normal load. This is the test that had to pass before the change could
  ship, since the whole risk of moving the seed checks is a new tenant finding
  an empty page.
- Every one of the 19 nav-bearing pages loads clean, app frame visible, no
  page errors and no "failed at …" step message.

---

## 7. Flagged, not changed

**Every load of Quran Study downloads ~460 KB from `raw.githubusercontent.com`.**
`audio-player.js` warms the Bangla reciter's ayah-timing map as soon as the
module loads, for a real reason documented in the code: an `await` between a
Play click and `audio.play()` can break the browser's user-gesture
association and get playback silently rejected. It is fire-and-forget, so it
does **not** delay time-to-usable — the measurements above already exclude it.
But it is 460 KB of mobile data on every landing-page visit whether or not
anyone ever plays Bangla audio, competing for bandwidth with what the page
does need. Fixing it properly means fetching on first *hover/focus* of the
reciter picker, or accepting a one-off delay on the first Bangla Play. **This
is a real trade-off with a user-visible downside either way, so it is the
owner's call, not one to make quietly.** Its true cost could not be measured
here — this sandbox cannot reach that host.

**The frame still waits for sign-in and memberships** (~0.6 s @150 ms). That
was Option 3, which the owner did not take this round. It remains available.

---

## 7b. Round 2 (v07.39, same day) — the 460 KB is off the load path

The owner answered the flagged decision above in three words: **"Giving
priority in loading speed."** So it is done.

**Measured, not estimated: the file is 460,531 bytes (450 KB).** It was
fetched by `audio-player.js` the moment the module loaded — on every visit to
the app's landing page, whether or not anyone ever played Bangla audio.

It could **not** simply be deleted, and the reason is the whole difficulty:
browsers only let `audio.play()` through when it runs inside (or very soon
after) a real user gesture, so an `await` on a genuine network fetch between
the Play tap and `play()` can get playback silently rejected. The fetch has to
happen *before* the tap.

So it moved to the gestures that **always precede** a Play tap:

- **opening the Listening settings card** — the only place Play lives, and
- **changing the reciter** — belt and braces, and the one gesture that names
  Bangla directly.

`warmSegmentedTimestamps()` is idempotent (the in-flight promise is cached),
so calling it twice costs nothing, and a real failure still surfaces to the
person at click time rather than being swallowed early.

**Effect: someone who never opens Listening settings never downloads it at
all.** Time-to-usable is unchanged (0.93 s @150 ms, 6 round trips) — as
expected, since the fetch was never blocking; the win is 450 KB of a phone's
bandwidth on every landing-page visit, which on mobile data was competing
with everything the page did need.

**Both halves are verified, because either one alone would be wrong**
(`behaviour.mjs` section 26, bringing the suite to **437**): nothing requests
the timing map during load, **and** opening Listening settings really does
request it. A test that only checked the first would have passed on a build
where Bangla playback had quietly stopped working.

---

## 8. Where the load-speed contract now stands

The contract's "3 reads after first paint" is still not literally met, and it
is worth being straight about why: a study screen that shows real progress
genuinely needs the roster, the subject tree, the trackables and the records
chunk — that is more than three documents by nature. What the contract is
really protecting against is *waiting* for them one at a time, and that is
what this round fixed: 5–12 reads, but **5–6 waits**.

Two contract lines are now genuinely met that were not before: the module
registry is no longer a blocking read (it comes from the bundled copy, with
the Firestore check in the background), and the landing page no longer reads
anything it does not draw.
