# QuranRevival — Application Understanding Package

**Version documented: v08.02** · compiled 7 September 2026
Repository: `Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io`

---

## 1. What this package is

A complete architectural description of QuranRevival, written so that **a senior
architect can understand the whole application without reading its ~42,000 lines
of source**.

It is **documentation only**. No application code, database schema, UI or data
was modified in producing it.

Every important statement is based on **actual code inspection** — file paths and
line numbers are given throughout, counts were computed by running over the real
data files, and where something could not be established from the code it says
so explicitly (**"Could not confirm from code"**).

> **Version note.** The task brief referred to a "v08.00 codebase"; `main` was
> already at **v08.02**, two feature rounds ahead (v08.01 made the 30 Approaches
> fully editable; v08.02 made the 7 sections editable). **This package documents
> v08.02**, and those rounds change one conclusion carried in the earlier
> external-review package — see `00-EXECUTIVE-SUMMARY.md`.

---

## 2. Recommended reading order

### If you have 15 minutes
1. **`00-EXECUTIVE-SUMMARY.md`**
2. **`FINAL-ARCHITECTURE-SUMMARY.md`**

### If you have an hour
1. `00-EXECUTIVE-SUMMARY.md` — what and why
2. `01-APP-VISION-AND-CONCEPTS.md` — the vocabulary (read before anything else technical)
3. `04-EDUCATIONAL-ARCHITECTURE.md` — the model the whole app exists to serve
4. `07-PROGRESS-AND-TRACKING-SYSTEM.md` — the heart of the system
5. `13-CODEBASE-MAP.md` — where everything lives
6. `FINAL-ARCHITECTURE-SUMMARY.md`

### Full sequence
`00` → `01` → `02` → `03` → `04` → `05` → `06` → `07` → `08` → `09` → `10` →
`11` → `12` → `13` → `14` → `15` → `16` → `17` → `18` → `FINAL`

**Read `01` early whichever path you take.** This codebase uses ordinary words
in specific ways — "Approach", "Trackable", "Study Unit", "Claim", "Derivatives"
— and several of them do not mean what they appear to.

---

## 3. The documents

| # | Document | Answers |
|---|---|---|
| 00 | `00-EXECUTIVE-SUMMARY.md` | What is this, who uses it, is it mature, what are the risks |
| 01 | `01-APP-VISION-AND-CONCEPTS.md` | What every concept means **in the code** |
| 02 | `02-USER-ROLES-AND-PERMISSIONS.md` | The 6 roles, auth/authorisation, **multiple roles per person** |
| 03 | `03-USER-JOURNEYS.md` | 15 journeys traced START → END, and which are confusing |
| 04 | `04-EDUCATIONAL-ARCHITECTURE.md` | Module → Subject → Trackable → Unit → Progress |
| 05 | `05-ALL-APPROACHES.md` | **All 30 Approaches**, individually, with Guide text and panels |
| 06 | `06-STUDY-UNITS.md` | All 7 Quran units; **which way progress rolls** |
| 07 | `07-PROGRESS-AND-TRACKING-SYSTEM.md` | Statuses, claims, approval, the full trace |
| 08 | `08-EXPLORE-AND-PROGRESS-WHEEL.md` | Explore, both wheels, colour logic, data flow |
| 09 | `09-QURAN-DATA-ARCHITECTURE.md` | The 31 MB dataset, all fields, measured totals |
| 10 | `10-WORD-BY-WORD-AND-ARABIC-DATA.md` | **What exists vs what is a name only** |
| 11 | `11-DATABASE-AND-DATA-MODELS.md` | Every collection, schemas, scaling limits |
| 12 | `12-TECHNICAL-ARCHITECTURE.md` | The stack, state, routing, deployment |
| 13 | `13-CODEBASE-MAP.md` | **Feature → file map.** The one to keep open |
| 14 | `14-SERVICES-AND-CORE-LOGIC.md` | Every important function, in/out/DB/depends-on |
| 15 | `15-CURRENT-FEATURE-INVENTORY.md` | Built / partial / placeholder / not connected |
| 16 | `16-ARCHITECTURAL-RISKS-AND-OPPORTUNITIES.md` | 49 risks, plus reusable infrastructure |
| 17 | `17-INTEGRATION-ENTRY-POINTS.md` | **"To add X, touch these files"** |
| 18 | `18-DEPENDENCY-AND-FEATURE-MAP.md` | The dependency graph and blast radius |
| — | `FINAL-ARCHITECTURE-SUMMARY.md` | The whole application, condensed |

---

## 4. Which documents matter for which purpose

| Purpose | Read |
|---|---|
| **Product understanding** | `00`, `01`, `03`, `15` |
| **Educational understanding** | `04`, `05`, `06`, `01` |
| **Technical understanding** | `12`, `13`, `14`, `18` |
| **Database understanding** | `11`, `07` §6, `09` |
| **Future development** | **`17`**, then `16`, `13`, `14` |
| **Explore / wheel work** | `08`, `06` §7, `18` |
| **Arabic / word-level work** | `09`, `10`, plus `docs/external-architecture-review/` |
| **Roles, safeguarding, access** | `02`, `11` §5, `07` §13 |

---

## 5. Related package

`docs/external-architecture-review/` (built 6 Sep 2026, at **v08.00**) is a
narrower, deeper study aimed at integrating a three-level Quranic Arabic
learning system. It covers Approaches, units, progress, approval, Explore, the
wheel and the word dataset in more forensic detail, with exported source and a
dataset inventory.

**Where the two disagree, this package is newer.** Specifically, that package
states there is no Approach-editing UI beyond a rename prompt — true at v08.00,
**no longer true at v08.02**.

---

## 6. Ten things to know before reading anything else

1. **"Approach" is not a type.** It is a row in the `trackables` collection with `subjectId: "quran"`. One filter line defines the concept.
2. **Nothing in the code assumes there are 30 Approaches.** The only "30" is a caption.
3. **There are two wheels with opposite axes**, drawn by the same function.
4. **Teacher approval changes no colour anywhere.** Every wheel reads `claimedStatus`.
5. **Only claims are stored.** Every roll-up is recomputed on every render.
6. **There are no Cloud Functions.** All computation is in the browser.
7. **There is no build step, no framework, and no `package.json`.**
8. **`app/quranrevival.html` is 12,051 lines** and contains all of Explore.
9. **Words are not clickable.** The word-by-word system is read-only display.
10. **Nothing is ever deleted** — there is no delete rule in the security rules at all.

---

## 7. How to verify anything here

Every claim carries a file path, and usually a line number. To check one:

```bash
sed -n '154,200p' app/js/records.js          # a function
grep -c 'id: "approach_' app/js/catalogue-data.js   # → 30
grep -rn "claimStatus(db, {" app/            # → the 9 call sites
```

**Counts over the Quran dataset** were computed by walking all 114 files in
`tools/quran-data-pull/output/surahs/`. The method is described in
`09-QURAN-DATA-ARCHITECTURE.md`.

**Not run in this session:** the Playwright harnesses (`tools/i18n-verify`,
`tools/perf`) — Playwright is not installed in this container and the brief
forbids installing packages. Statements about load speed and test results are
read from the code and the project's own records, not re-measured today.
