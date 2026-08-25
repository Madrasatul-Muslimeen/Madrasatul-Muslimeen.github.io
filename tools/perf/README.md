# How load speed is measured

Added 15 August 2026, for the load-speed round (v07.38). The owner's report
was "the app feels slow to open" — this is the machinery that turned that
into numbers, and it is what any future round touching the startup path
should re-run before and after.

## Running it

```bash
node serve.js &                                   # from the repo root, :8080
node tools/perf/measure.mjs --latency 150 --runs 3 --label before
node tools/perf/new-tenant.mjs                    # seeding still works?
```

`CHROMIUM_PATH` overrides the browser, same as the i18n-verify suites.
Results are written to `tools/perf/results/<label>-<latency>ms.json`.

## The one thing to understand before trusting any of it

**The Firebase stub answers instantly.** `tools/i18n-verify/harness.mjs`
serves a small module in place of the real Firebase SDK, so a page's own
script really runs — that is exactly what is wanted here too. But a stub
that returns in microseconds will report *every* page as loading in a few
milliseconds, no matter how many Firestore reads it makes. Run naively, it
proves nothing at all about speed, and it does so very reassuringly.

So the stub was instrumented (`firebase-stub.mjs`, `__trip()`):

- **Every call is logged** — kind, collection, document id, start and end
  time, on `window.__fsLog`.
- **Every call waits `latencyMs`** before answering, so a read that costs a
  round trip in production costs one here.

That gives two honest measurements. The **call log** is a fact about the
code: it does not change with connection speed, and reducing it is the only
thing a fix can actually do. The **wall clock** then shows what that costs a
person, at whatever latency you ask for.

Default latency is **0**, so the translation suites are unaffected — they
never pass `latencyMs` and behave exactly as they did before.

## The headline number: round trips *in sequence*

Not the number of reads — the number of reads that happen **one after
another**. Reads fired together cost one wait; reads fired in turn cost one
wait each. `busyMs()` unions the call intervals on the timeline and divides
by one round trip.

It is split at the moment the page becomes usable (`window.__usableAt`,
stamped by the readiness predicate). Work that lands *after* that — the
background catalogue check — is real, and is reported, but must never be
counted against the wait the person actually experiences.

## What "usable" means

Per page, and deliberately not "the shell appeared": the moment the thing a
person opened the page **for** is on screen — the wheel drawn on Quran
Study, rows in the browse list on a module page, entries in the table on
Records. `measure.mjs` also reports "app frame appears" separately, which is
when the page stops saying "Checking sign-in…".

## The tenant is measured in the owner's real state

The default stub carries only a handful of subjects and modules — enough to
prove translation. That is the shape of a **half**-seeded tenant, so the
seeding paths think they have work to do and write on every load. Measuring
against it would flatter or damn the wrong thing.

`newContext({ seedTemplates })` fills `DATA` out from the same
`catalogue-data.js` the app seeds from, so nothing is left to seed — which
is the owner's situation, a tenant set up weeks ago. **Always pass it when
measuring.** `newContext({ emptyTenant: true })` is the opposite extreme, a
tenant that has never been set up, used by `new-tenant.mjs`.

## new-tenant.mjs is not optional

The v07.38 round took three seeding checks off every page's startup path.
The entire risk of that change is a brand-new tenant landing on a study page
and finding nothing there. `new-tenant.mjs` runs each study page against a
tenant with no catalogue at all and checks that it seeds *and* then renders
real content — plus the other half of the guarantee, that a tenant already
set up is **not** written to on a normal page load.

## The baseline this round started from

Phone viewport (390×844), tenant seeded weeks ago, 150 ms per round trip:

| Page | Round trips in sequence | Time to usable |
|---|---|---|
| Quran Study | 10 | 1.70 s |
| Deen Study | 14 | 2.09 s |
| Health | 15 | 2.24 s |
| Asma ul Husna | 13 | 1.94 s |
| Records | 11 | 1.62 s |

After v07.38: 6, 6, 6, 6 and 5 trips; 0.93 s, 0.89 s, 0.88 s, 0.88 s, 0.87 s.
