// MAP -- lemma-level word progress, part 1 (issue #301, re-issue of #296).
//
// The Owner's rule: "Knowing a word should mark all the same words, and all
// its forms as known as well." Owner decision (25 Sep 2026, recorded by the
// Architect): "all its forms" means the same LEMMA -- the same dictionary
// word in any inflection -- never the whole root family, and never merely
// identical spelling. Confirm once for all: the learner marks the lemma
// once and a supervisor confirms it once; every occurrence of that lemma
// then counts as known.
//
// Pure module: no Firebase, DOM, locale or mutable application state -- the
// same split app/js/quran-word-progress.js already makes between what a
// state IS and how it is persisted (quran-lemma-progress-data.js).
//
// MIRRORS quran-word-progress.js's two-lane design exactly, and REUSES its
// own transition functions rather than re-implementing them:
// claimLearnerState()/decideApproval()/resolveWordProgress() are already
// identity-agnostic -- each operates on a bare {state,at,byPersonId} /
// {review,at,byPersonId,note,forState,forClaimAt,history,historyTruncated}
// pair, never on "an ayah" or "a position". So the SAME functions apply
// unchanged to one lemma, which is what makes "the same state vocabulary
// and countsAsKnown as occurrence progress" true by construction, rather
// than by two lists staying in sync by hand.
//
// UNLIKE occurrence progress -- which bundles every word of one ayah into
// one lane document, keyed by position, because an ayah is a small, bounded
// group -- a lemma has no such natural bundle: its occurrences are
// scattered across the whole Qur'an. Measured against the real packaged
// tools/quran-data-pull/output/lemmas-index.json: 74,122 occurrences across
// 4,832 lemmas, and the most frequent lemma ("من") occurs 3,229 times
// across 2,183 distinct ayahs. Bundling by any single grouping would just
// move the sparsity problem elsewhere, so a lemma document IS one lemma:
// one document per (tenant, person, level, lemmaId), never a map that
// grows.
//
// This round builds ONLY the data layer and the Rules candidate. Nothing
// under app/ imports this file (see quran-lemma-progress-boundary.mjs,
// with a positive control) -- the UI wiring and the Word Card numbers come
// in the next round.

import {
  ARABIC_LEVELS,
  IMPLEMENTED_ARABIC_LEVELS,
  requireImplementedLevel,
  WBW_WORD_STATES,
  WBW_REVIEW_STATES,
  MAX_RETAINED_DECISIONS,
  emptyWordProgressEntry,
  claimLearnerState,
  decideApproval,
  resolveWordProgress,
  wordProgressAuthority,
} from "./quran-word-progress.js";

export {
  ARABIC_LEVELS,
  IMPLEMENTED_ARABIC_LEVELS,
  requireImplementedLevel,
  WBW_WORD_STATES,
  WBW_REVIEW_STATES,
  MAX_RETAINED_DECISIONS,
  // Re-exported under lemma-specific names: the underlying state-machine is
  // identity-agnostic, so these ARE the same functions, not a lemma-specific
  // reimplementation the vocabulary could quietly drift from.
  claimLearnerState as claimLemmaState,
  decideApproval as decideLemmaApproval,
  wordProgressAuthority as lemmaProgressAuthority,
};

export const LEMMA_PROGRESS_CONTRACT = "quran-lemma-progress:v1";
export const LEMMA_PROGRESS_LANES = Object.freeze(["learner", "supervisor"]);

/**
 * `resolveWordProgress()` stamps its own occurrence contract's version
 * literal onto the view it returns -- correct for an occurrence, wrong for a
 * lemma. Everything else about the projection (state, claimedAt, review,
 * countsAsKnown, awaitingReview...) is identical, so only the label is
 * corrected here rather than the whole function being duplicated.
 */
export function resolveLemmaProgress({ learner, supervisor, confirmationRequired = false } = {}) {
  const view = resolveWordProgress({ learner, supervisor, confirmationRequired });
  return Object.freeze({ ...view, contractVersion: LEMMA_PROGRESS_CONTRACT });
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Ids are path segments; a separator inside one would silently re-point a
 * document. Mirrors quran-word-progress.js's own safeIdSegment() for
 * tenantId/personId.
 */
function safeIdSegment(value, label) {
  if (!isNonEmptyString(value)) throw new TypeError(`${label} is required.`);
  if (value.includes("__") || value.includes("/")) {
    throw new TypeError(`${label} must not contain a path or key separator.`);
  }
  return value;
}

/**
 * Checked, not assumed, against the real packaged
 * tools/quran-data-pull/output/lemmas-index.json (4,832 lemma keys): none
 * contains "/" or "__", none is exactly "." or "..", and the longest is 15
 * characters -- so every real lemma id is already a safe Firestore
 * document-id SEGMENT, with no re-encoding needed. This function enforces
 * that rather than trusting it, so a future corpus rebuild that ever
 * produced an unsafe id fails loudly instead of silently mis-addressing a
 * document. quran-lemma-progress-model.mjs independently re-derives this
 * claim from the real packaged file.
 */
export function safeLemmaId(value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError("lemmaId is required and must be a non-empty string.");
  }
  if (value.length > 400) {
    throw new RangeError("lemmaId is implausibly long for a packaged lemma (over 400 characters).");
  }
  if (value.includes("/")) throw new TypeError("lemmaId must not contain a path separator.");
  if (value.includes("__")) throw new TypeError("lemmaId must not contain the id-segment separator.");
  if (value === "." || value === "..") throw new TypeError("lemmaId must not be a bare '.' or '..'.");
  return value;
}

// ---------------------------------------------------------------------------
// Lane identity. One document per (tenant, person, level, lemma) -- see the
// header above for why there is no ayah-style bundle here.
// ---------------------------------------------------------------------------

export function lemmaProgressDocId({ tenantId, personId, level = "wbw", lemmaId } = {}) {
  safeIdSegment(tenantId, "tenantId");
  safeIdSegment(personId, "personId");
  requireImplementedLevel(level);
  safeLemmaId(lemmaId);
  return `${tenantId}__${personId}__${level}__${lemmaId}`;
}

/**
 * The reverse of lemmaProgressDocId(). tenantId/personId never contain "__"
 * (safeIdSegment refuses it on the way in) and neither does a real lemma id
 * (safeLemmaId refuses it too), so splitting greedily on the first three
 * "__" separators and taking everything after the third as the lemma id is
 * unambiguous.
 */
export function parseLemmaProgressDocId(docId) {
  if (typeof docId !== "string") throw new TypeError("lemma progress doc id must be a string.");
  const match = /^([^_/]+(?:_[^_/]+)*)__([^_/]+(?:_[^_/]+)*)__([a-z]+)__([\s\S]+)$/.exec(docId);
  if (!match) throw new TypeError("lemma progress doc id has an invalid shape.");
  const level = requireImplementedLevel(match[3]);
  const lemmaId = safeLemmaId(match[4]);
  return { tenantId: match[1], personId: match[2], level, lemmaId };
}

// ---------------------------------------------------------------------------
// Document shape. Unlike occurrence progress (an entries map keyed by
// position), a lemma document holds exactly one entry: the document IS the
// word, so there is no per-entry cap to enforce and no compact wire codes
// are needed -- full field names are used throughout.
// ---------------------------------------------------------------------------

export function emptyLemmaLearnerEntry() {
  return emptyWordProgressEntry();
}

export function decodeLemmaLearnerEntry(raw) {
  if (!raw || typeof raw !== "object") return emptyLemmaLearnerEntry();
  const state = WBW_WORD_STATES.includes(raw.state) ? raw.state : "not_started";
  return Object.freeze({ state, at: raw.at ?? null, byPersonId: raw.byPersonId ?? null });
}

function encodeLemmaLearnerEntry(entry) {
  return { state: entry.state, at: entry.at, byPersonId: entry.byPersonId };
}

export function emptyLemmaSupervisorEntry() {
  return Object.freeze({
    review: "pending", at: null, byPersonId: null, note: null,
    forState: null, forClaimAt: null, history: Object.freeze([]), historyTruncated: 0,
  });
}

export function decodeLemmaSupervisorEntry(raw) {
  if (!raw || typeof raw !== "object") return emptyLemmaSupervisorEntry();
  const review = WBW_REVIEW_STATES.includes(raw.review) ? raw.review : "pending";
  const history = Array.isArray(raw.history)
    ? raw.history.map((h) => Object.freeze({
        review: WBW_REVIEW_STATES.includes(h?.review) ? h.review : "pending",
        at: h?.at ?? null,
        byPersonId: h?.byPersonId ?? null,
        note: h?.note ?? null,
        forState: WBW_WORD_STATES.includes(h?.forState) ? h.forState : null,
        forClaimAt: h?.forClaimAt ?? null,
      }))
    : [];
  return Object.freeze({
    review,
    at: raw.at ?? null,
    byPersonId: raw.byPersonId ?? null,
    note: raw.note ?? null,
    forState: WBW_WORD_STATES.includes(raw.forState) ? raw.forState : null,
    forClaimAt: raw.forClaimAt ?? null,
    history: Object.freeze(history),
    historyTruncated: Number.isInteger(raw.historyTruncated) ? raw.historyTruncated : 0,
  });
}

function encodeLemmaSupervisorEntry(entry) {
  return {
    review: entry.review,
    at: entry.at,
    byPersonId: entry.byPersonId,
    note: entry.note ?? null,
    forState: entry.forState ?? null,
    forClaimAt: entry.forClaimAt ?? null,
    history: entry.history.map((h) => ({
      review: h.review, at: h.at, byPersonId: h.byPersonId, note: h.note ?? null,
      forState: h.forState ?? null, forClaimAt: h.forClaimAt ?? null,
    })),
    historyTruncated: entry.historyTruncated,
  };
}

export function decodeLemmaLaneEntry(lane, raw) {
  if (!LEMMA_PROGRESS_LANES.includes(lane)) throw new TypeError(`Unknown lane: ${lane}.`);
  return lane === "learner" ? decodeLemmaLearnerEntry(raw) : decodeLemmaSupervisorEntry(raw);
}

/** The fields one lane's entry contributes to a Firestore write -- spread onto the document's identity fields by the data layer. */
export function lemmaEntryFields(lane, entry) {
  if (!LEMMA_PROGRESS_LANES.includes(lane)) throw new TypeError(`Unknown lane: ${lane}.`);
  return lane === "learner" ? encodeLemmaLearnerEntry(entry) : encodeLemmaSupervisorEntry(entry);
}

/** A full lemma lane document as stored, identity fields plus its one entry. */
export function buildLemmaLaneDocument({ docId, lane, entry }) {
  if (!LEMMA_PROGRESS_LANES.includes(lane)) throw new TypeError(`Unknown lane: ${lane}.`);
  const parsed = parseLemmaProgressDocId(docId);
  return {
    contractVersion: LEMMA_PROGRESS_CONTRACT,
    lane,
    tenantId: parsed.tenantId,
    personId: parsed.personId,
    level: parsed.level,
    lemmaId: parsed.lemmaId,
    ...lemmaEntryFields(lane, entry),
  };
}

export function decodeLemmaLaneDocument(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (raw.contractVersion && raw.contractVersion !== LEMMA_PROGRESS_CONTRACT) {
    // A future contract is not silently read as v1 -- the same refusal
    // ADR-007/quran-word-progress.js make for their own future versions.
    throw new RangeError(`Unsupported lemma progress contract: ${raw.contractVersion}.`);
  }
  return { ...raw, entry: decodeLemmaLaneEntry(raw.lane, raw) };
}

// ---------------------------------------------------------------------------
// The Owner's rule, made arithmetic.
// ---------------------------------------------------------------------------

/**
 * The one reader-facing view of a SINGLE OCCURRENCE, folding its own
 * resolved occurrence-level progress together with its lemma's. "An
 * occurrence counts as known when it is known itself OR its lemma is known"
 * -- the occurrence document itself is never rewritten (I4/I6): this is a
 * projection computed at read time from two already-resolved views
 * (quran-word-progress.js's own resolveWordProgress() for the occurrence,
 * resolveLemmaProgress() above for the lemma), never a write.
 *
 * Deliberately does not invent a merged `state`/`review` -- what a caller
 * should SHOW for a lemma-known-but-not-individually-claimed occurrence is a
 * presentation decision for the UI-wiring round, not this one. What this
 * round commits to is the boolean the Owner's rule is actually about, plus
 * which source produced it.
 */
export function effectiveOccurrenceState(occurrenceState, lemmaState) {
  const occ = occurrenceState ?? { countsAsKnown: false };
  const lem = lemmaState ?? { countsAsKnown: false };
  const occKnown = !!occ.countsAsKnown;
  const lemKnown = !!lem.countsAsKnown;
  return Object.freeze({
    occurrence: occ,
    lemma: lem,
    countsAsKnown: occKnown || lemKnown,
    // True only when the occurrence itself is NOT individually known and the
    // lemma is what makes it count -- so a caller can say WHY.
    knownViaLemma: !occKnown && lemKnown,
  });
}

/**
 * The whole-Qur'an running-known-count delta produced when a lemma moves
 * into or out of "known" (a claim/decision transition resolved through
 * resolveLemmaProgress() above). `occurrenceCount` is how many occurrences
 * this lemma has in the whole Qur'an; `alreadyKnownIndividually` is how many
 * of THOSE already count as known on their OWN account -- via
 * quran-word-progress.js's occurrence-level resolveWordProgress(),
 * regardless of the lemma -- and so are already inside the running total.
 * Moving the lemma must not double-count them: only the occurrences whose
 * "known" status the lemma actually DECIDES should move.
 *
 * See countIndividuallyKnownOccurrences() in quran-lemma-progress-data.js
 * for how the data layer computes `alreadyKnownIndividually`, and its
 * documented worst-case read cost.
 */
export function lemmaKnownDelta({ occurrenceCount, alreadyKnownIndividually, wasLemmaKnown, isLemmaKnown } = {}) {
  if (!Number.isInteger(occurrenceCount) || occurrenceCount < 0) {
    throw new TypeError("occurrenceCount must be a non-negative integer.");
  }
  if (!Number.isInteger(alreadyKnownIndividually) || alreadyKnownIndividually < 0 || alreadyKnownIndividually > occurrenceCount) {
    throw new RangeError("alreadyKnownIndividually must be an integer from 0 to occurrenceCount.");
  }
  if (typeof wasLemmaKnown !== "boolean" || typeof isLemmaKnown !== "boolean") {
    throw new TypeError("wasLemmaKnown and isLemmaKnown must be booleans.");
  }
  if (wasLemmaKnown === isLemmaKnown) return 0;
  const affected = occurrenceCount - alreadyKnownIndividually;
  return isLemmaKnown ? affected : -affected;
}
