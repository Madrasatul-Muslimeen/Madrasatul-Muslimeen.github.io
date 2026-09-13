// MAP Phase 3 -- Arabic word progress state model, contract v1.
//
// Pure module: no Firebase, DOM, locale, or mutable application state. The
// data layer (quran-word-progress-data.js) owns persistence; this file owns
// what a state IS, who may set it, and how one transition folds into the
// next. Keeping the two apart is what lets the transitions be tested without
// a database and the Rules be reasoned about without the UI.
//
// THREE MAP LOCKS SHAPE EVERY DECISION BELOW.
//
// 1. "Activity != Mastery". Nothing in this module turns an event into a
//    state. There is deliberately no projectWordState(event) function --
//    opening a word, hearing it, or reading its ayah produces no claim here.
//    Only an explicit, named act by a person does: claimLearnerState() and
//    decideApproval(). Phase 4's Activity evidence stays in its own module
//    and can never reach this one.
//
// 2. "A WbW word toggle/Approved state != a generic Approach claim record".
//    So this never writes to `records`. A word lives in its own collections
//    with its own vocabulary and its own permanent identity (ADR-007). The
//    Approach wheel keeps reading `records`, untouched.
//
// 3. "Arabic progress remains independent across WbW, Basic Arabic and
//    Arabic in Depth". Every stored entry therefore names its LEVEL. Only
//    `wbw` is implemented -- the Basic/Depth claim unit is a DEFERRED
//    decision (MAP v4 s6 DEF, DDR), so this module REFUSES to write one
//    rather than inventing its semantics. The field exists so that adding a
//    level later is additive and can never reinterpret a v1 record.
//
// I6 is the fourth lock and the subtle one: a confirmation is frozen when
// marked and never recalculated. A fresh learner claim after an approval
// resets only the REVIEW state to pending, so the new claim gets its own
// look; the approval that was actually given stays exactly as it was until a
// supervisor decides again. This mirrors records.js's rule deliberately --
// two different confirmation semantics in one app would be a defect.

import { parseQuranWordOccurrenceId, quranWordOccurrenceId } from "./quran-word-identity.js";

export const WORD_PROGRESS_CONTRACT = "quran-word-progress:v1";

/**
 * The Arabic learning levels the Word Card shows. `wbw` is the only one this
 * contract may store: see lock 3 above. `basic` and `depth` are listed so a
 * caller can ask about them and be told "deferred" rather than silently get
 * a wbw answer.
 */
export const ARABIC_LEVELS = Object.freeze(["wbw", "basic", "depth"]);
export const IMPLEMENTED_ARABIC_LEVELS = Object.freeze(["wbw"]);

/**
 * A word's own ramp, deliberately three rungs and not the six of STATUSES.
 * A Study Unit is a passage a person works at over weeks; a word is known or
 * it is not. The ids are borrowed from unit-keys.js STATUSES where they mean
 * the same thing, so the app has ONE vocabulary and one set of translations
 * -- but the collection, the identity and the semantics stay separate, which
 * is what lock 2 actually requires.
 *
 * `not_applicable` is deliberately absent. I7 exists because a Study Unit
 * can genuinely not apply to a learner; a word of the Qur'an always applies.
 * Admitting it would create an I7 denominator question with no real case
 * behind it.
 */
export const WBW_WORD_STATES = Object.freeze(["not_started", "learning", "achieved"]);

/** Mirrors records.js confirmState exactly, for the same reason as above. */
export const WBW_REVIEW_STATES = Object.freeze(["pending", "confirmed", "returned"]);

/** Compact stored codes. The wire format is not the vocabulary: a stored
 *  document must stay small (see the size guard below), and a one-character
 *  code is not a second vocabulary because this is the only place that maps
 *  it. A reader never sees these. */
const STATE_TO_CODE = Object.freeze({ not_started: "n", learning: "l", achieved: "a" });
const CODE_TO_STATE = Object.freeze({ n: "not_started", l: "learning", a: "achieved" });
const REVIEW_TO_CODE = Object.freeze({ pending: "p", confirmed: "c", returned: "r" });
const CODE_TO_REVIEW = Object.freeze({ p: "pending", c: "confirmed", r: "returned" });

/**
 * The measured ceiling for one lane document. 2:282 is the longest ayah in
 * the packaged dataset at 128 words, so a lane can never hold more entries
 * than this. The guard is not decoration: it is what makes a per-ayah
 * document a BOUNDED shape rather than a map that grows without limit, which
 * is the objection that rejected the per-surah option.
 */
export const MAX_WORDS_PER_AYAH = 128;

/**
 * How many superseded supervisor decisions one word keeps. I4 says nothing
 * is destroyed, but an unbounded history inside a mutable map is exactly the
 * growth shape that made the Phase 4 Activity Rules candidate unprovable. So
 * history is bounded HERE and the count of what fell off is kept, so a
 * reader is never told a truncated history is complete.
 */
export const MAX_RETAINED_DECISIONS = 6;

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/** Ids are path segments; a separator inside one would silently re-point a document. */
function safeIdSegment(value, label) {
  if (!isNonEmptyString(value)) throw new TypeError(`${label} is required.`);
  if (value.includes("__") || value.includes("/")) {
    throw new TypeError(`${label} must not contain a path or key separator.`);
  }
  return value;
}

function requireIsoInstant(value, label) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value)) {
    throw new TypeError(`${label} must be a UTC ISO instant.`);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new TypeError(`${label} must be a real UTC ISO instant.`);
  return value;
}

export function requireImplementedLevel(level) {
  if (!ARABIC_LEVELS.includes(level)) throw new TypeError(`Unknown Arabic level: ${level}.`);
  if (!IMPLEMENTED_ARABIC_LEVELS.includes(level)) {
    // DEFERRED means stop, never guess. Basic/Depth have no agreed claim unit.
    throw new RangeError(`Arabic level "${level}" has no approved claim unit; its progress model is deferred.`);
  }
  return level;
}

// ---------------------------------------------------------------------------
// Lane identity.
//
// Progress is stored one document per (person, level, ayah), and the learner's
// own claims and a supervisor's decisions live in SEPARATE collections.
//
// The split is not tidiness. A Firestore rule cannot cheaply prove that every
// changed key of an arbitrarily-keyed map was written by someone entitled to
// write THAT key -- the limitation this codebase already documents for
// records/subjects/trackables, and the one the storage paper said must be
// answered before a writer is enabled: "If Rules cannot distinguish self-state
// from teacher-state writes, separate them into role-specific documents."
// Splitting by lane answers it exactly: the whole document belongs to one
// (person, role) pair, so DOCUMENT-level authority is sufficient and precise,
// and no rule ever has to walk a map. That also keeps the candidate rule far
// away from the expression budget that made the Phase 4 Activity candidate
// unprovable.
//
// It has a second, practical benefit: the learner and their teacher write
// different documents, so the one pair of actors most likely to be editing the
// same ayah at the same time cannot contend at all.
// ---------------------------------------------------------------------------

export const WORD_PROGRESS_LANES = Object.freeze(["learner", "supervisor"]);

export function wordProgressLaneId({ tenantId, personId, level = "wbw", surah, ayah } = {}) {
  safeIdSegment(tenantId, "tenantId");
  safeIdSegment(personId, "personId");
  requireImplementedLevel(level);
  // Borrow the identity module's own bounds check rather than re-deriving it,
  // so a coordinate this contract accepts is always one ADR-007 accepts too.
  quranWordOccurrenceId(surah, ayah, 1);
  return `${tenantId}__${personId}__${level}__${surah}_${ayah}`;
}

export function parseWordProgressLaneId(laneId) {
  if (typeof laneId !== "string") throw new TypeError("lane id must be a string.");
  const match = /^([^_/]+(?:_[^_/]+)*)__([^_/]+(?:_[^_/]+)*)__([a-z]+)__(\d+)_(\d+)$/.exec(laneId);
  if (!match) throw new TypeError("lane id has an invalid shape.");
  const level = requireImplementedLevel(match[3]);
  const surah = Number(match[4]);
  const ayah = Number(match[5]);
  quranWordOccurrenceId(surah, ayah, 1);
  return { tenantId: match[1], personId: match[2], level, surah, ayah };
}

/** The map key for one word inside a lane. Plain position: the lane already fixes surah and ayah. */
export function wordProgressEntryKey(position) {
  if (!Number.isInteger(position) || position < 1 || position > MAX_WORDS_PER_AYAH) {
    throw new TypeError(`position must be an integer from 1 to ${MAX_WORDS_PER_AYAH}.`);
  }
  return String(position);
}

/**
 * The permanent ADR-007 identity a lane entry refers to. Stored progress is
 * addressed by lane + position, but everything OUTSIDE this module -- coverage,
 * Explore, the Word Card -- speaks occurrence ids, so this is the one bridge
 * and it is a real derivation, never a second identity.
 */
export function occurrenceIdForLaneEntry(lane, position) {
  const { surah, ayah } = typeof lane === "string" ? parseWordProgressLaneId(lane) : lane;
  return quranWordOccurrenceId(surah, ayah, Number(wordProgressEntryKey(position)));
}

/** Which lane an occurrence id belongs to, for a caller that has one in hand. */
export function laneIdForOccurrence({ tenantId, personId, level = "wbw", occurrenceId } = {}) {
  const ref = parseQuranWordOccurrenceId(occurrenceId);
  return { laneId: wordProgressLaneId({ tenantId, personId, level, surah: ref.surah, ayah: ref.ayah }), position: ref.position };
}

// ---------------------------------------------------------------------------
// Authority.
//
// Deliberately a PURE projection of facts the caller already holds. It does
// not read Firestore and it is not the security boundary -- the candidate
// Rules are. It exists so the UI can offer exactly the controls a person may
// actually use, instead of showing a button that will be refused, and so the
// data layer can refuse early with a reason a person can read (I15).
// ---------------------------------------------------------------------------

/**
 * `confirmationRequired` is computed elsewhere by the existing
 * records.js rule ("does this person have a teacher, guardian or prime?"),
 * and is passed in rather than recomputed, so the two can never disagree.
 */
export function wordProgressAuthority({ actorPersonId, subjectPersonId, isSupervisor = false, confirmationRequired = false } = {}) {
  if (!isNonEmptyString(actorPersonId) || !isNonEmptyString(subjectPersonId)) {
    throw new TypeError("actorPersonId and subjectPersonId are required.");
  }
  const isSelf = actorPersonId === subjectPersonId;
  return Object.freeze({
    isSelf,
    isSupervisor: !!isSupervisor && !isSelf,
    // A supervisor records FOR a managed student; a learner records for
    // themself. Anyone else may do neither.
    mayClaim: isSelf || (!!isSupervisor && !isSelf),
    // Nobody signs off their own claim. Where confirmation is not required
    // for this person at all, there is no decision to make and the control
    // is not offered -- which is not the same as it being refused.
    mayDecide: !!isSupervisor && !isSelf && !!confirmationRequired,
    confirmationRequired: !!confirmationRequired,
  });
}

// ---------------------------------------------------------------------------
// Entries and transitions.
//
// An entry is the stored value for ONE word. Both lanes use the same encode/
// decode pair so a reader never has to remember which lane it came from.
// ---------------------------------------------------------------------------

export function emptyWordProgressEntry() {
  return Object.freeze({ state: "not_started", at: null, byPersonId: null });
}

export function decodeLearnerEntry(raw) {
  if (!raw || typeof raw !== "object") return emptyWordProgressEntry();
  const state = CODE_TO_STATE[raw.s];
  if (!state) return emptyWordProgressEntry();
  return Object.freeze({ state, at: raw.at ?? null, byPersonId: raw.by ?? null });
}

function encodeLearnerEntry(entry) {
  return { s: STATE_TO_CODE[entry.state], at: entry.at, by: entry.byPersonId };
}

export function decodeSupervisorEntry(raw) {
  if (!raw || typeof raw !== "object") {
    return Object.freeze({ review: "pending", at: null, byPersonId: null, note: null, forState: null, history: Object.freeze([]), historyTruncated: 0 });
  }
  const review = CODE_TO_REVIEW[raw.r] ?? "pending";
  const history = Array.isArray(raw.h)
    ? raw.h.map((h) => Object.freeze({ review: CODE_TO_REVIEW[h.r] ?? "pending", at: h.at ?? null, byPersonId: h.by ?? null, note: h.n ?? null, forState: CODE_TO_STATE[h.s] ?? null }))
    : [];
  return Object.freeze({
    review,
    at: raw.at ?? null,
    byPersonId: raw.by ?? null,
    note: raw.n ?? null,
    forState: CODE_TO_STATE[raw.s] ?? null,
    history: Object.freeze(history),
    historyTruncated: Number.isInteger(raw.ht) ? raw.ht : 0,
  });
}

function encodeSupervisorEntry(entry) {
  return {
    r: REVIEW_TO_CODE[entry.review],
    at: entry.at,
    by: entry.byPersonId,
    n: entry.note,
    s: entry.forState ? STATE_TO_CODE[entry.forState] : null,
    h: entry.history.map((h) => ({ r: REVIEW_TO_CODE[h.review], at: h.at, by: h.byPersonId, n: h.note, s: h.forState ? STATE_TO_CODE[h.forState] : null })),
    ht: entry.historyTruncated,
  };
}

/**
 * A learner (or a supervisor acting for a managed student) sets one word's
 * state. Returns BOTH lanes' new values, because a fresh claim is exactly the
 * moment I6 applies: the review goes back to pending so the NEW claim is
 * looked at, and the decision already given is left untouched.
 *
 * A no-op claim (the same state again) returns `changed: false` and writes
 * nothing, so re-tapping a toggle cannot churn a document or reset a review
 * that was already given for that same state.
 */
export function claimLearnerState({ currentLearner, currentSupervisor, state, actorPersonId, atIso, confirmationRequired = false } = {}) {
  if (!WBW_WORD_STATES.includes(state)) throw new TypeError(`Unknown WbW word state: ${state}.`);
  safeIdSegment(actorPersonId, "actorPersonId");
  requireIsoInstant(atIso, "atIso");
  const learner = currentLearner ?? emptyWordProgressEntry();
  const supervisor = currentSupervisor ?? decodeSupervisorEntry(null);
  if (learner.state === state) {
    return Object.freeze({ changed: false, learner, supervisor });
  }
  const nextLearner = Object.freeze({ state, at: atIso, byPersonId: actorPersonId });
  // The review only re-opens where a review is actually required and the
  // claim is one that asks for sign-off. Stepping BACK to learning or
  // not_started is the learner withdrawing a claim, not making a new one.
  const reopens = confirmationRequired && state === "achieved";
  const nextSupervisor = reopens && supervisor.review !== "pending"
    ? Object.freeze({ ...supervisor, review: "pending" })
    : supervisor;
  return Object.freeze({ changed: true, learner: nextLearner, supervisor: nextSupervisor });
}

/**
 * A supervisor confirms or returns the claim that is actually on the table.
 * `forState` records WHICH claim was decided, so a later reader can see that
 * an approval belongs to the claim it was given for and not to whatever the
 * word says now.
 */
export function decideApproval({ currentLearner, currentSupervisor, review, byPersonId, atIso, note = null } = {}) {
  if (review !== "confirmed" && review !== "returned") {
    throw new TypeError('A supervisor decision must be "confirmed" or "returned".');
  }
  safeIdSegment(byPersonId, "byPersonId");
  requireIsoInstant(atIso, "atIso");
  if (note != null && typeof note !== "string") throw new TypeError("note must be a string when supplied.");
  const learner = currentLearner ?? emptyWordProgressEntry();
  if (learner.state !== "achieved") {
    throw new RangeError("There is no claim to decide: the word has not been claimed as achieved.");
  }
  const supervisor = currentSupervisor ?? decodeSupervisorEntry(null);
  // I4/I6: the decision being replaced is kept, not overwritten in silence.
  const carried = supervisor.review === "pending" && !supervisor.at
    ? supervisor.history
    : [Object.freeze({ review: supervisor.review, at: supervisor.at, byPersonId: supervisor.byPersonId, note: supervisor.note, forState: supervisor.forState }), ...supervisor.history];
  const kept = carried.slice(0, MAX_RETAINED_DECISIONS);
  return Object.freeze({
    changed: true,
    learner,
    supervisor: Object.freeze({
      review,
      at: atIso,
      byPersonId,
      note: note ?? null,
      forState: learner.state,
      history: Object.freeze(kept),
      historyTruncated: supervisor.historyTruncated + (carried.length - kept.length),
    }),
  });
}

/**
 * The one reader-facing view of a word, folding both lanes together.
 *
 * `countsAsKnown` is the only thing coverage is ever allowed to count, and it
 * is deliberately strict: where confirmation is required, a claim alone is not
 * knowledge. That is "Activity != Mastery" expressed as arithmetic rather than
 * as a comment.
 */
export function resolveWordProgress({ learner, supervisor, confirmationRequired = false } = {}) {
  const l = learner ?? emptyWordProgressEntry();
  const s = supervisor ?? decodeSupervisorEntry(null);
  const claimed = l.state === "achieved";
  const decisionAppliesToThisClaim = claimed && s.forState === "achieved" && s.review !== "pending";
  const review = !confirmationRequired ? "not_required" : claimed ? (decisionAppliesToThisClaim ? s.review : "pending") : "none";
  return Object.freeze({
    contractVersion: WORD_PROGRESS_CONTRACT,
    state: l.state,
    claimedAt: l.at,
    claimedByPersonId: l.byPersonId,
    review,
    reviewedAt: decisionAppliesToThisClaim ? s.at : null,
    reviewedByPersonId: decisionAppliesToThisClaim ? s.byPersonId : null,
    returnNote: decisionAppliesToThisClaim && s.review === "returned" ? s.note : null,
    countsAsKnown: claimed && (!confirmationRequired || review === "confirmed"),
    awaitingReview: claimed && confirmationRequired && review === "pending",
  });
}

// ---------------------------------------------------------------------------
// Document shape and its bound.
// ---------------------------------------------------------------------------

/** A lane document as stored. `entries` is keyed by position; absent means not started. */
export function buildLaneDocument({ laneId, lane, entries }) {
  if (!WORD_PROGRESS_LANES.includes(lane)) throw new TypeError(`Unknown lane: ${lane}.`);
  const parsed = parseWordProgressLaneId(laneId);
  const keys = Object.keys(entries ?? {});
  if (keys.length > MAX_WORDS_PER_AYAH) {
    throw new RangeError(`A lane document may hold at most ${MAX_WORDS_PER_AYAH} words.`);
  }
  const encoded = {};
  for (const key of keys) {
    wordProgressEntryKey(Number(key));
    encoded[key] = lane === "learner" ? encodeLearnerEntry(entries[key]) : encodeSupervisorEntry(entries[key]);
  }
  return {
    contractVersion: WORD_PROGRESS_CONTRACT,
    identityContract: "quran-word-occurrence:v1",
    lane,
    tenantId: parsed.tenantId,
    personId: parsed.personId,
    level: parsed.level,
    surah: parsed.surah,
    ayah: parsed.ayah,
    entries: encoded,
  };
}

/** The single-field update one changed word produces, so a write never resends the document. */
export function laneFieldUpdate({ lane, position, entry }) {
  if (!WORD_PROGRESS_LANES.includes(lane)) throw new TypeError(`Unknown lane: ${lane}.`);
  const key = wordProgressEntryKey(position);
  return { [`entries.${key}`]: lane === "learner" ? encodeLearnerEntry(entry) : encodeSupervisorEntry(entry) };
}

export function decodeLaneDocument(raw) {
  if (!raw || typeof raw !== "object") return { entries: {} };
  if (raw.contractVersion && raw.contractVersion !== WORD_PROGRESS_CONTRACT) {
    // A future contract is not silently read as v1 -- the same refusal
    // ADR-007 makes for a future identity version.
    throw new RangeError(`Unsupported word progress contract: ${raw.contractVersion}.`);
  }
  const decode = raw.lane === "supervisor" ? decodeSupervisorEntry : decodeLearnerEntry;
  const entries = {};
  for (const [key, value] of Object.entries(raw.entries ?? {})) {
    if (!/^\d+$/.test(key)) continue;
    entries[key] = decode(value);
  }
  return { ...raw, entries };
}
