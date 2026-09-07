# QuranRevival — System Map

**v08.02** · one diagram of the whole application, derived from the code
`Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io` · 7 September 2026

---

```
                              Q U R A N R E V I V A L                v08.02
                    ┌──────────────────────────────────────────────┐
                    │  multi-tenant Madrasah platform              │
                    │  browser-only · Firebase Auth + Firestore    │
                    │  28 pages · 60 modules · ~42,300 lines       │
                    │  NO framework · NO build step · NO Cloud Fns │
                    └───────────────────────┬──────────────────────┘
                                            │
        ┌───────────────────────────────────┼───────────────────────────────────┐
        │                                   │                                   │
        ▼                                   ▼                                   ▼
  ┌───────────┐                      ┌─────────────┐                     ┌─────────────┐
  │   USERS   │                      │    QURAN    │                     │  EDUCATION  │
  │  Layer 0  │                      │   content   │                     │   Layer 1   │
  └─────┬─────┘                      └──────┬──────┘                     └──────┬──────┘
        │                                   │                                   │
        ▼                                   ▼                                   ▼

 Authentication                        Surah    114                    Modules      10
   Google only                         Ayah   6,236                    Subjects     55
   no email/password                   Word  77,429                      (a tree, but
                                                                          Quran is ONE leaf)
 Roles          6                    Arabic Data                       Approaches   30
   owner · prime                       root    64.5%                     = trackables where
   teacher · guardian                  lemma   95.7%                       subjectId "quran"
   student · self                      POS      100%                    Trackables   39
   (+ platformAdmin)                   gloss    100%                      30 Approaches
                                                                         + 9 "Studied"
 Guardians                           Study Units  7                    Study Units   7
   managedByPersonId                   ayah  range                       ayah:2:255
   → child needs approval              surah ruku'                       surah:1
                                       juz   hizb                        juz:30
 Students                              page                              page:qpc-hafs:604
   the only role that
   always needs approval             ┌──────────────────────┐          Sections      7
                                     │ 31 MB STATIC JSON    │            display-only —
 personId ≠ uid                      │ served over HTTP     │            NOTHING keys off
   a child may have                  │ ✗ NOT Firestore      │            them
   NO login at all                   │ ✗ NOT per-tenant     │
                                     └──────────────────────┘          editable since v08.01/02
 memberships/{t}__{p}__{role}          quran-data.js is the              (but no "add a 31st")
   existence IS the role               ONLY reader
        │                                   │                                   │
        └───────────────────────────────────┼───────────────────────────────────┘
                                            │
                                            ▼
                        ┌───────────────────────────────────────┐
                        │         S T U D Y   E N G I N E       │
                        │                                       │
                        │   4 renderer families:                │
                        │     "ayah"     quranrevival.html      │  ← 12,051 lines
                        │     "topic"    topic-study.js    × 6  │  ← 149-line shells
                        │     "routine"  routine-study.js  × 2  │
                        │     "asma"     asma-study.js     × 1  │
                        │                                       │
                        │   panels[] decides what a learner     │
                        │   sees: text · tajweed · wordByWord   │
                        │   root · derivatives · notes ·        │
                        │   reflection · writing · checklist    │
                        └───────────────────┬───────────────────┘
                                            │
                                            ▼
                        ┌───────────────────────────────────────┐
                        │            P R O G R E S S            │
                        │                                       │
                        │  records/{tenant}__{person}__{chunk}  │
                        │    entries {                          │
                        │      "unitKey :: trackableId" : {…}   │
                        │    }                                  │
                        │                                       │
                        │  ▲ TWO opaque strings, multiplied     │
                        │    at claim time. Neither is a        │
                        │    foreign key. Nothing parses either.│
                        │                                       │
                        │  6 statuses:                          │
                        │    not_applicable  ← OFF the ramp     │
                        │    not_started → learning →           │
                        │    practising → achieved → mastered   │
                        └───────────────────┬───────────────────┘
                                            │
              ┌─────────────────────────────┼─────────────────────────────┐
              │                             │                             │
              ▼                             ▼                             ▼
      ┌───────────────┐            ┌─────────────────┐           ┌────────────────┐
      │    CLAIMS     │            │    APPROVAL     │           │    TRACKING    │
      └───────┬───────┘            └────────┬────────┘           └────────┬───────┘
              │                             │                             │
   claimStatus()                 confirmEntry()                logActivity()
   records.js:154                returnEntry()                  activity.js
                                 records.js:201 / :219
   THE single write              + 4 bulk scopes                one doc per WEEK
   path in the whole               chunk · week                 append-only
   application                     person · class                (arrayUnion)
   9 call sites
   9 reads per claim             app/records.html               carries viaProgramId
                                 is the ONLY UI                 (I3 — never in a
   whether approval is                                           record key)
   needed is COMPUTED,           confirmState:
   never configured                pending / confirmed
   per person                      / returned
              │                             │                             │
              ▼                             ▼                             ▼
  ┌────────────────────┐     ┌────────────────────────┐    ┌──────────────────────┐
  │   claimedStatus    │     │    confirmedStatus     │    │  activity/{t}__{p}   │
  │                    │     │                        │    │        __{weekKey}   │
  │  what the student  │     │  what the teacher      │    │                      │
  │  says              │     │  froze                 │    │  the audit log       │
  │                    │     │                        │    │  read by ID ONLY —   │
  │  ✓ drives EVERY    │     │  ✗ drives NOTHING      │    │  no list query for   │
  │    visual in the   │     │    visual, anywhere    │    │  activity exists     │
  │    application     │     │                        │    │  anywhere            │
  └─────────┬──────────┘     └───────────┬────────────┘    └──────────┬───────────┘
            │                            │                            │
            │                            ▼                            ▼
            │              ╔══════════════════════════╗   ┌──────────────────────┐
            │              ║   ✗   D E A D   E N D    ║   │  used ONLY for:      │
            │              ║                          ║   │   · streak counts    │
            │              ║  Shown in ONE place —    ║   │   · week-scope       │
            │              ║  a column of the         ║   │     bulk confirm     │
            │              ║  Records table.          ║   │   · Monitor report   │
            │              ║                          ║   └──────────────────────┘
            │              ║  A *returned* claim      ║
            │              ║  still shows GREEN       ║
            │              ║  on the wheel.           ║
            │              ╚══════════════════════════╝
            │
            └───────────────────────────┐
                                        │
                                        ▼
                    ┌───────────────────────────────────────┐
                    │             E X P L O R E             │
                    │                                       │
                    │  a panel INSIDE quranrevival.html     │
                    │  — not a page, not a module           │
                    │                                       │
                    │  Quran → Juz → Surah → Ruku'          │
                    │  ≤115 Firestore reads per OPEN,       │
                    │  then everything from memory          │
                    │                                       │
                    │  aggregation:                         │
                    │    MAX ↓  a wide claim FLOORS every   │
                    │           ayah it covers              │
                    │    MIN ↑  a wide unit takes its       │
                    │           WEAKEST ayah                │
                    │    not_applicable excluded from both  │
                    │                                       │
                    │  3 content palettes already:          │
                    │    Quran · Ayah Collections · Asma    │
                    └───────────────────┬───────────────────┘
                                        │
                                        ▼
                    ┌───────────────────────────────────────┐
                    │                W H E E L              │
                    │                                       │
                    │      mastery-wheel.js — PURE (I2)     │
                    │      never imports Firebase           │
                    │                                       │
                    │      360 / items.length               │
                    │      ✗ no fixed segment count         │
                    │      ✗ nothing assumes 30 Approaches  │
                    │                                       │
                    │      6 fills, no seventh              │
                    └───────────────────┬───────────────────┘
                                        │
              ┌─────────────────────────┴─────────────────────────┐
              │          TWO WHEELS, OPPOSITE AXES                │
              │          drawn by the SAME function               │
              ▼                                                   ▼
  ┌────────────────────────────┐              ┌────────────────────────────┐
  │   LANDING MASTERY WHEEL    │              │       EXPLORE WHEEL        │
  ├────────────────────────────┤              ├────────────────────────────┤
  │ one segment per APPROACH   │              │ one segment per UNIT       │
  │                            │              │                            │
  │ fixed: the current UNIT    │              │ fixed: the chosen APPROACH │
  │                            │              │                            │
  │ ✗ NO aggregation —         │              │ ✓ pools, both directions   │
  │   the unit's OWN claim     │              │                            │
  │                            │              │ ≤115 reads per open        │
  │ 1 Firestore read           │              │                            │
  └─────────────┬──────────────┘              └──────────────┬─────────────┘
                │                                            │
                └──────────────────┬─────────────────────────┘
                                   ▼
                 ╔═══════════════════════════════════╗
                 ║   THEY DISAGREE, ON PURPOSE       ║
                 ║                                   ║
                 ║   A Juz whose every ayah is       ║
                 ║   Mastered reads not_started      ║
                 ║   on the landing wheel, and       ║
                 ║   GREEN in Explore.               ║
                 ║                                   ║
                 ║   Both are correct for their      ║
                 ║   own screen. The difference      ║
                 ║   is invisible on screen.         ║
                 ╚═══════════════════════════════════╝
```

---

## Legend

| Symbol | Meaning |
|---|---|
| `▼ ▲ ◀ ▶` | data or control flows this way |
| `✗` | **this does not exist**, or does not happen |
| `✓` | confirmed present in the code |
| `╔═╝` double box | **a counter-intuitive finding** — the things most likely to be misread |
| `file.js:NNN` | a real file and line, verified against the source |

---

## The five things this map is trying to tell you

**1. Three pillars, one join.** Users, Quran content and the education model are
independent of each other. They meet in exactly one place — a records entry
keyed `unitKey :: trackableId` — and that key is **two opaque strings that
nothing parses**. That single join is the whole system.

**2. The Quran content is not in the database.** 31 MB of static JSON over HTTP,
browser-cached, public, immutable, outside the tenant model. Only *progress*
lives in Firestore.

**3. Claims and Approval are not a pipeline.** Your sketch drew one line down
through Approval into Explore. The real shape is a **fork**: `claimedStatus`
feeds every visual, and `confirmedStatus` feeds a single table column and stops.
Teacher approval is real, stored and frozen — and changes no colour anywhere.

**4. Explore and the Wheel are not sequential either.** The Wheel is Explore's
renderer *and* the landing page's, with **opposite axes**. Landing = 30
Approaches for one unit. Explore = many units for one Approach.

**5. Almost nothing is stored twice.** Only claims persist. Every roll-up,
colour and percentage is recomputed on every render, in the browser, from
documents already in memory. There is no summary document and no Cloud Function
to maintain one.

---

## Where each box lives in the code

| Box | File |
|---|---|
| **USERS** | `js/identity.js` · `js/session-context.js` · `js/people.js` · `firestore.rules` |
| **QURAN** | `tools/quran-data-pull/output/` (31 MB) · `js/quran-data.js` · `js/ayah-renderer.js` |
| **EDUCATION** | `js/catalogue-data.js` (the seed) · `js/catalogue.js` · Firestore `trackables` |
| **STUDY ENGINE** | `quranrevival.html` · `js/topic-study.js` · `js/routine-study.js` · `js/asma-study.js` |
| **PROGRESS** | `js/records.js` · `js/unit-keys.js` · Firestore `records` |
| **CLAIMS** | `js/records.js:154` `claimStatus()` |
| **APPROVAL** | `js/records.js:201`/`:219` · `app/records.html` |
| **TRACKING** | `js/activity.js` · Firestore `activity` |
| **EXPLORE** | `quranrevival.html:6094`–`:7122` |
| **WHEEL** | `js/mastery-wheel.js` |

---

## What the map deliberately leaves out

So you know it is a simplification, not a full census:

- **Six other module areas** — Bookmarks, Notes, Monitor, Homework, Classes/Course Offers, Curriculum/Grades, Backup, Taglines, Search, Audio, Asma ul Husna, Ayah Collections.
- **The rules-support mirrors** — `tenantMemberUids` and `teacherStudentLinks` exist only because Firestore rules can `get()` a fixed path but **can never run a query**.
- **The cross-cutting layers** — `envelope.js` (every write), `errors.js` (`safeWrite`, every write), `i18n` (every visible string, English + Bangla).
- **The invariants** — 17 of them; the ones visible above are I2 (pure renderers), I3 (activity carries programId), I5 (permanent keys), I6 (frozen confirmation), I7 (Not Applicable excluded), I9 (startup path).

Full detail: `README.md` in this folder, then documents `00`–`18`.
