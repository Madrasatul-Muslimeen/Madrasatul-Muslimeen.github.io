# ADR-008 — Study-to-Approach Event Contract v1

- **Status:** ACCEPTED — **AMENDED 2026-09-14, AMENDED 2026-09-28** (see "Master Architect amendments" below)
- **Date:** 2026-09-11; amended 2026-09-14; amended 2026-09-28
- **Authority:** Owner approval of the Task 33 P4 decision package, amended by Master Architect review
- **Contract identifier:** `study-approach-contract:v1`
- **Context:** ADR-003 requires Activity and Mastery to remain separate. Reading, Listening, Journaling and WbW interactions already exist, but automatic effects were not centrally defined.
- **Decision:** Versioned Study events may append bounded Activity evidence. They never grant `achieved` or `mastered` status. Mastery/status changes occur only through the existing explicit claim and, where required, confirmation workflow.

## v1 event mapping

| Event | Activity effect | Status/mastery effect |
|---|---|---|
| `reading.completed` | Append one `practised` Activity entry for each explicitly completed unit — Āyah, Range, Surah, or, since Amendment 3 (2026-09-28), Ruku' or Page — mapped to Reading with Tajweed (`approach_01`) or Reading with Meaning (`approach_03`) by the active Study mode, deduplicated by person + event + unit + UTC date | None |
| `listening.completed` | Append one `practised` Activity entry after a user-started playback completes at least 80% of the selected bounded unit, mapped to Arabic-only (`approach_07`) or with-meaning (`approach_08`) by the active Study mode, deduplicated by person + event + unit + UTC date | None |
| `journal.note-created` | Append one `practised` Journaling Activity entry for a newly committed Note | None |
| `journal.note-revised` | Append at most one Journaling Activity entry per Note per UTC date after a committed revision | None |
| `wbw.engaged` | Append bounded WbW Activity evidence for Reading — Word-by-Word Meaning (`approach_04`), deduplicated by **āyah + person + UTC date** (*amended 2026-09-14; was occurrence + person + UTC date*) | None; dedicated WbW approval/toggle state remains separate |
| `status.claimed` | Existing `claimed` Activity entry plus existing Records claim | Explicit claimed status only |
| `status.confirmed` | Existing confirmation workflow | Confirmed status only |

- **General/self users:** Approved mapped Study events count automatically as Activity. They do not automatically become Mastery. A self user's explicit status claim follows existing self-confirmation rules.
- **Managed students:** Mapped events count as Activity, but a status change requires a deliberate claim and the existing teacher/guardian confirmation rule.
- **Journaling rule:** Every committed new Note and qualifying committed revision counts as Journaling Activity under the deduplication rule. Draft typing, opening, cancelling and autosave attempts that do not commit a revision do not count.
- **Listening rule:** Seeking, looping, buffering, failed playback and background preload do not complete Listening. The 80% threshold is calculated over the selected bounded unit; a future threshold change requires a new contract version.
- **Reading rule:** Merely opening or scrolling a passage does not complete Reading. v1 requires an explicit completion action so intent is auditable.
- **Idempotency:** Callers must supply or derive a deterministic event key. Retries must not create duplicate Activity evidence.
- **Privacy/load:** Store the minimum event evidence needed for the existing weekly Activity model. Do not create an unbounded interaction stream.
- **Consequences:** A pure policy module and tests may be implemented before browser wiring. UI/event wiring is divided into separately audited bounded tasks.
- **Rollback:** Disable the v1 adapter to stop new mapped entries. Historical Activity remains append-only evidence and is never rewritten into Mastery.
- **Supersession:** Satisfies ADR-003's deferred versioned-rule prerequisite; ADR-003 remains fully active.


---

## Master Architect amendments — 2026-09-14

Recorded at the P4-B architecture audit. The v1 contract identifier
`study-approach-contract:v1` is **unchanged**: neither amendment alters which
interactions count or what they may affect, so neither is a new contract
version. Both change only how an event's evidence is identified and at what
grain it is recorded.

### Amendment 1 — the Note's identity participates in event identity

**What changed.** The deterministic identity of a Journaling event must contain
the Note's own permanent id:

```
journal.note-created__approach_10__<unitKey>__<noteId>__once
journal.note-revised__approach_10__<unitKey>__<noteId>__<dateIso>
```

**Why.** The v1 rules above already required *one* Activity event per committed
new Note, and *at most one* per Note per UTC day. An identity built only from
event type, Approach, unit and day cannot express that: two different Notes
written against the same āyah on the same day collapse to a single identity,
and the second is silently discarded as a duplicate. The Note's identity is
therefore part of the event's identity, not merely part of its payload.

**Encoding.** All five automatic events use one five-slot form, with the
literal `none` filling the Note slot for the three non-Note events, rather than
a four-slot form for some and a five-slot form for others. A single arity keeps
the Firestore Rules identity check a single string concatenation instead of a
branch, which is what the P4-B expression-budget finding requires. `none`
cannot be mistaken for a real `noteId`, which is always 32 hexadecimal
characters.

**Enforcement.** Firestore Rules re-derive the id from the document's own
fields and refuse any id that disagrees; a Journaling event must carry a
well-formed `noteId`, and a non-Journaling event must not carry one at all.

### Amendment 2 — `wbw.engaged` Activity evidence is recorded at āyah + day

**What changed.** The deduplication boundary for `wbw.engaged` moves from
**occurrence + person + UTC day** to **āyah + person + UTC day**.

**Why.** Occurrence-level learning state already belongs to the dedicated
`quranWordProgress` model (MAP Phase 3), which this ADR itself keeps separate
from Activity. Recording Activity evidence per occurrence duplicated that
stream into Activity and contradicted this ADR's own privacy/load rule — "store
the minimum event evidence needed for the existing weekly Activity model; do
not create an unbounded interaction stream". At occurrence grain a learner
tapping a hundred words a day generates roughly seven hundred evidence
documents a week. At āyah grain, Activity records that word-by-word study
happened for that āyah that day, which is Activity's own grain.

**`occurrenceId` is deliberately NOT stored.** It was reviewed against every
reader of Activity — Monitor counts per student, subject and unit; backup
prints entries; `bulkConfirmWeek()` cannot see this collection at all — and
none of them requires it. Storing one would also mislead: whichever word
happened to be tapped first that day would arbitrarily win the field while the
rest went unrepresented, giving the appearance of occurrence-level precision
the āyah/day grain does not have. **The authoritative occurrence-level state
remains `quranWordProgress`, unchanged.**

### Unchanged by both amendments

Activity ≠ Mastery. Every mapped event still appends `practised` Activity
evidence only and still grants no `achieved` or `mastered` status;
`status.claimed` and `status.confirmed` remain the only two events that move
Mastery state, and remain outside Study Activity evidence persistence
entirely. ADR-003 is unaffected.

## Master Architect amendment — 2026-09-28 (issue #349)

### Amendment 3 — `reading.completed` accepts Ruku' and Page as Study Units

**Authority.** Owner decision 20, 27 Sep 2026
(`docs/governance/2026-09-27-owner-decisions.md`, row 20): *"'Mark as read'
for Ruku', Page, Hizb and Juz? -- Ruku' and Page: yes. Hizb and Juz: later.
Recording Activity for Ruku' and Page amends ADR-008 and needs a Rules
change the Owner publishes; until then those buttons explain why they are
off."*

**What changed.** `reading.completed`'s accepted unit types widen from
Āyah/Range/Surah to also include Ruku' and Page — the two unit types the
Unit Card (issue #348) offers "Mark as read" for beyond a whole Surah.
Nothing else about the event changes: the same Approach mapping
(`approach_01`/`approach_03` by whether a translation is shown), the same
UTC-day deduplication, the same `practised`/`masteryEffect: none` shape. No
new event type is introduced — a Ruku'/Page completion is recorded as the
same `reading.completed` event a Surah completion already is.

**Why.** The Unit Card lets a reader act on a Ruku' or a Page the same way
they already act on a Surah or a Range. v1's identity shapes only
recognised three unit key patterns, so a Ruku'/Page completion had nowhere
to be identified — the control said "coming soon" and wrote nothing
(`unitCardMarkAsReadState()` in `app/quranrevival.html`). This amendment
gives it a real identity to write to.

**Encoding.** Two new unit key shapes are accepted, matching
`buildUnitKey.ruku`/`buildUnitKey.page` exactly:

```
ruku:<surah 1-3 digits>:<ruku 1-3 digits>
page:<edition, lowercase ASCII letters>:<page 1-3 digits>
```

No new event type, no new Approach mapping, no change to the five-slot id
form (`eventType__trackableId__unitKey__noteSlot__dedupeScope`).

**Enforcement.** Both the pure identity module
(`app/js/study-activity-evidence-id.js`'s `UNIT_KEY_SHAPES`) and the
deployed Firestore Rules' `unitIdentityOk()` gain the same two patterns —
kept in sync by hand, the same way the original three patterns already
were, and checked structurally by `tools/i18n-verify/study-activity-
evidence-boundary.mjs`/`study-event-wiring.mjs`.

**Gated separately from deployment, on purpose.** Recording stays off until
the Owner publishes
`docs/governance/2026-09-28-reading-ruku-page-DEPLOYMENT-candidate.rules` —
a second, narrower gate (`app/js/study-reading-units-readiness.js`,
`ready: false`) sits in front of Ruku'/Page specifically, on top of the
general evidence-persistence gate that has been open since 22 Sep 2026.
Āyah/Range/Surah completions are entirely unaffected by this new gate; only
Ruku'/Page need both open. This mirrors the exact two-gate shape
`study-word-levels-readiness.js` already uses for Basic Arabic/Arabic in
Depth alongside the already-live Word-by-Word level.

**Hizb and Juz remain out of scope**, per the Owner's own "later" — no unit
key shape is added for them, and the Unit Card continues to say "planned
for later" for those two.

### Unchanged by Amendment 3

Activity ≠ Mastery, as always. Amendments 1 and 2 (2026-09-14) are
untouched by this one — the Note-identity and WbW āyah+day rules apply
exactly as before to the events they govern.
