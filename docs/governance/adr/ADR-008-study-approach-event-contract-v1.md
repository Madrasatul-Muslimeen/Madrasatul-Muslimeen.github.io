# ADR-008 — Study-to-Approach Event Contract v1

- **Status:** ACCEPTED
- **Date:** 2026-09-11
- **Authority:** Owner approval of the Task 33 P4 decision package, amended by Master Architect review
- **Contract identifier:** `study-approach-contract:v1`
- **Context:** ADR-003 requires Activity and Mastery to remain separate. Reading, Listening, Journaling and WbW interactions already exist, but automatic effects were not centrally defined.
- **Decision:** Versioned Study events may append bounded Activity evidence. They never grant `achieved` or `mastered` status. Mastery/status changes occur only through the existing explicit claim and, where required, confirmation workflow.

## v1 event mapping

| Event | Activity effect | Status/mastery effect |
|---|---|---|
| `reading.completed` | Append one `practised` Activity entry for each explicitly completed unit, mapped to Reading with Tajweed (`approach_01`) or Reading with Meaning (`approach_03`) by the active Study mode, deduplicated by person + event + unit + UTC date | None |
| `listening.completed` | Append one `practised` Activity entry after a user-started playback completes at least 80% of the selected bounded unit, mapped to Arabic-only (`approach_07`) or with-meaning (`approach_08`) by the active Study mode, deduplicated by person + event + unit + UTC date | None |
| `journal.note-created` | Append one `practised` Journaling Activity entry for a newly committed Note | None |
| `journal.note-revised` | Append at most one Journaling Activity entry per Note per UTC date after a committed revision | None |
| `wbw.engaged` | Append bounded WbW Activity evidence for Reading — Word-by-Word Meaning (`approach_04`), deduplicated by occurrence + person + UTC date | None; dedicated WbW approval/toggle state remains separate |
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
