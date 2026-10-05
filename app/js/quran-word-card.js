// MAP Phase 2 — persistent Quran Word Card, pure state + renderer slice.
// DOM event wiring and data fetching belong to the page/controller task.

import { quranWordOccurrenceId, wordIdentityLayers } from "./quran-word-identity.js";
import { QURAN_TOTAL_WORD_COUNT, percentRounded } from "./quran-word-total.js";
import { arabicToBuckwalter } from "./buckwalter.js";
import { partName, partMeaning, PART_KINDS, FORM_NAMES, STEM_NAMES, DERIV_NAMES, DERIVED_GROUP_LABELS, orderDerivedForms } from "./word-grammar-tables.js";
import { depthSectionsHtml } from "./word-card-depth.js";
import { stageColourStyle } from "./ayah-action-sheet.js";

export const WORD_CARD_LEVELS = Object.freeze(["wbw", "basic", "depth"]);

/**
 * v08.22 -- every grammatical-category segment the packaged corpus actually
 * uses. Measured, not assumed: `morphology.pos` across all 77,429 words
 * resolves to 359 distinct strings built from exactly these 46 segments.
 *
 * The page turns this into `labels.posNames` by putting each through its own
 * catalogue, which is why the list lives here rather than being hard-coded in
 * a translation file: one place says what the data contains.
 *
 * ELEVEN of them are opaque corpus abbreviations the packaged data never
 * expands (RES, PRO, PREV, IMPV, EXL, INT, EXH, SUR, AVR, EQ, COM), and
 * `yaAsiyna` is a single-occurrence tagging glitch. Those are deliberately
 * left untranslated and printed exactly as recorded: naming them would mean
 * inventing a grammatical classification the source does not make.
 */
export const WORD_CARD_POS_SEGMENTS = Object.freeze([
  "Noun", "Pronoun", "Verb", "Preposition", "Conjunction", "Determiner",
  "Proper Noun", "Relative Pronoun", "Resumption Particle", "Negative Particle",
  "Accusative Particle", "Adjective", "Emphatic Particle", "Time Adverb",
  "Conditional", "Demonstrative Pronoun", "Interrogative Particle",
  "Subordinating Conj.", "Location Adverb", "RES", "Particle of Certainty",
  "Vocative Particle", "Result Particle", "PRO", "Purpose/Jussive Particle",
  "Circumstantial", "Supplemental", "PREV", "Future Particle",
  "Retraction Particle", "Exceptive Particle", "Inceptive Particle",
  "Causative Particle", "IMPV", "Amendment Particle", "EXL", "INT", "EXH",
  "Answer Particle", "SUR", "AVR", "Quranic Initials", "EQ", "COM",
  "Imperative Verb", "yaAsiyna",
]);

/**
 * Every user-visible string the card can print (I11). A caller passes its
 * reader's own language for each; these English values are only the fallback.
 * {count} and {error} are substituted, so a translation may place them
 * wherever that language needs them.
 */
export const WORD_CARD_DEFAULT_LABELS = Object.freeze({
  cardRegion: "Quran word card",
  tablist: "Arabic learning level",
  previous: "Previous word",
  next: "Next word",
  close: "Close word card",
  // Issue #286 -- the round ayah-end marker in Mushaf view is small and
  // easy to miss; this reaches the same "This āyah" action sheet from
  // whichever word's Word Card is already open.
  ayahActionsButton: "This āyah ⋯",
  wbw: "WbW",
  basic: "Basic Arabic",
  depth: "Arabic in Depth",
  meaningUnavailableEn: "Meaning unavailable",
  meaningUnavailableBn: "অর্থ পাওয়া যায়নি",
  lemma: "Dictionary Word",
  root: "Root",
  // Word card rebuild, round 2 (decision 59). "Dictionary word", never the
  // internal term; "ROOT" is the small label over the header's root letters.
  rootBoxLabel: "ROOT",
  factDictWord: "Dictionary word",
  factForm: "Form",
  formNumber: "Form {n}",
  partOfSpeech: "Part of speech",
  unknown: "Unknown",
  rootOccurrences: "{count} root-linked occurrences",
  lemmaOccurrences: "{count} occurrences of this Dictionary Word",
  derivedForms: "Derived forms of this root",
  rootFormsSummary: "{total} occurrences in {forms} derived forms",
  formOccurrences: "{count} occurrences",
  // Round 3 -- Basic's derived-form cards.
  derivedCardsSummary: "{n} forms · {total} times in all",
  derivedCardCount: "{n}×",
  // v08.22 -- "Form {n}" and the note explaining that number are GONE. The
  // number was a list position and read on screen as the traditional Arabic
  // verb form (I, II, III...), which it never was. Each row now names the
  // grammatical category the packaged data actually records for that written
  // form, so there is no number left to explain. The old note about no
  // category being available was verified against the corpus before being
  // replaced -- see rootFormsFor() for the measurement.
  formCategoryUnknown: "Category not recorded",
  formCategoryNote: "Each form's category is the one the packaged grammatical analysis records for that written form.",
  formCategoryMixed: "{count} of these forms are recorded with more than one category; the most frequent is shown.",
  formCategoryOther: "+{count}",
  formCategoryOtherTitle: "Also recorded as: {list}",
  formsUnclassified: "{count} occurrences of this root are not assigned to a form in the packaged data.",
  noDerivedForms: "No derived forms are listed for this root in the packaged data.",
  loadingForms: "Loading derived forms…",
  formsUnavailable: "Derived forms unavailable: {error}",
  showOccurrences: "Show occurrences",
  hideOccurrences: "Hide occurrences",
  noOccurrencesListed: "No occurrences are listed for this form.",
  showingFirst: "Showing the first {shown} of {total} occurrences.",
  goToOccurrence: "Go to {ref}",
  backToWord: "Back to {ref}",
  backToWordCard: "Back to Word Card",
  backToWordTitle: "Back to the word you came from",
  visitingFrom: "Visiting from {ref}",
  rootUnavailable: "Root unavailable in the approved dataset",
  lemmaUnavailable: "Dictionary Word unavailable in the approved dataset",
  notApplicable: "Not applicable: this word has no dictionary word, so Basic Arabic and Arabic in Depth leave it out of their totals.",
  clearEarlierMark: "Clear the earlier mark",
  loadingOccurrences: "Loading occurrences…",
  occurrencesUnavailable: "Occurrence list unavailable: {error}",
  // 2 Oct 2026 (#476) -- the Depth tab's Dictionary box. semanticRangeMissing /
  // openDictionary / dictionaryUnavailable and context.dictionaryUrl are GONE:
  // nothing else used them.
  dictionaryHeading: "Dictionary",
  dictionaryMeaning: "Dictionary meaning",
  inThisAyah: "In this āyah (word by word)",
  likelyMatch: "likely match",
  fixedByUs: "fixed by us",
  noDictionaryMeaning: "No dictionary meaning yet for this word.",
  banglaDictionaryPending: "Bangla dictionary meaning: will be added once permission is given",
  // Decision 62 (#539) -- the Bangla dictionary meaning, from the AQS Quraniyo Obhidhan.
  dictionaryMeaningBn: "Dictionary meaning",
  banglaMeaningNoMatch: "No Bangla meaning has been matched for this word yet",
  otherEntriesUnderSpelling: "Other entries under this spelling ({n})",
  creditBanglaBook: "Bangla meaning: Quraniyo Obhidhan (Quranic Dictionary), Muhammad Abu Hena, edited by Muhammad Yahya, Al Quran Academy London Bangladesh, 2nd edition 2015, p.",
  quranicCorpus: "Quranic Corpus ↗",
  laneHansWehr: "Lane · Hans Wehr ↗",
  creditMeaning: "Meaning:",
  creditWiktionary: "Wiktionary",
  creditWiktionaryLicence: "(CC BY-SA 4.0), adapted.",
  linksOpenOther: "Links open other websites.",
  // MAP Phase 3 -- the WbW progress block. Every one of these is a string a
  // reader sees, so every one is overridable (I11).
  progressHeading: "Word progress",
  recordHeading: "Record your Progress",
  statusHeading: "Know Your Status",
  wordNumberLabel: "word {n}",
  ringLabel: "{percent} of the words of the Qur'an known",
  ringUnknown: "Share of the words of the Qur'an known: not loaded yet",
  ringCaption: "of the Qur'an",
  stateNotStarted: "Not started",
  stateLearning: "Learning",
  statePractising: "Practising",
  stateAchieved: "Achieved",
  awaitingReview: "Waiting to be checked",
  reviewConfirmed: "Checked and confirmed",
  reviewReturned: "Sent back: {note}",
  reviewReturnedNoNote: "Sent back to look at again",
  confirm: "Confirm",
  sendBack: "Send back",
  progressLoading: "Loading progress…",
  saving: "Saving…",
  progressUnknown: "Progress not loaded yet",
  progressNotAllowed: "You are not able to record Arabic progress for this person.",
  coverage: "{known} of {total} words known in this ayah",
  coverageIncomplete: "{unknown} not loaded yet",
  // Issue #206 -- no gate, no new collection: this reads the lemma
  // occurrence index the Basic tab already loads, and the one exported
  // whole-Qur'an total (quran-word-total.js), and works whether or not the
  // running-counter feature is ready.
  wordShareOfQuran: "Appears {count} times in the Qur'an — {percent}% of all words",
  // Issue #263 -- word-part colouring. `wordSegments` (loaded on demand, see
  // quran-word-segments.js) is only ever present for a word the build
  // script could align exactly -- see that script's own "never guess" rule
  // -- so these strings never appear for a word without segments.
  colourWordPartsToggle: "Colour word parts",
  segmentLegendParticle: "particle",
  segmentLegendPerson: "person",
  segmentLegendDeterminer: "determiner",
  segmentLegendStem: "stem",
  // Issue #303 -- the whole-Qur'an running total (reuses quranWordTotals,
  // already gated and switched on since v08.53), and the lemma-level "mark
  // known everywhere" action (gated separately -- see
  // study-lemma-progress-readiness.js).
  wholeQuranKnown: "You know {known} of {total} words of the Qur'an",
  wholeQuranPercent: "You know {percent}% of the words of the Qur'an",
  learnWordDelta: "If you learn this word: +{words} words (+{percent}%)",
  // "This occurrence only" -- shown while the lemma feature's own gate is
  // closed, or while this word's lemma-wide state cannot be read: the card
  // must never claim a whole-lemma figure it has not actually computed.
  learnWordDeltaThisOccurrenceOnly: "If you learn this word here: +{words} word (+{percent}%) — this occurrence only",
  // Decision 56 -- known only through another word of the same root AND meaning.
  knownThroughSameMeaning: "Known through {word} (same meaning)",
  // Decision 58 (#490) -- one "You know" line per level, and the level that makes a word known.
  wholeQuranKnownLevel: "You know ({level}) {known} of {total} words of the Qur'an",
  wholeQuranPercentLevel: "You know ({level}) {percent}% of the words of the Qur'an",
  levelNameWbw: "WbW",
  levelNameBasic: "Basic",
  levelNameDepth: "Depth",
  knownThroughBasicGroup: "Known through its meaning group (Basic: same meaning)",
  knownThroughDepthRoot: "Known through the root {root} (Depth: same root)",
  // Round 6 -- the 🔍 Search row (spec "Search (in the header)").
  searchButton: "Search for a word",
  searchLabel: "Find a word: type it in Arabic (with or without vowel marks), its meaning, or a place like 2:42:8",
  searchGo: "Search",
  searchTry: "Try:",
  searchLoading: "Loading the word list…",
  searchUnavailable: "The word list could not be loaded: {error}",
  searchOpened: "Opened {ref}.",
  searchUnknownPlace: "There is no word at {ref}.",
  searchFound: "{k} forms found. Tap one to see where it is.",
  searchFoundMore: "{total} forms match; the {k} most frequent are shown. Tap one to see where it is.",
  searchNone: "No word found. Check the spelling, or try without vowel marks.",
  searchPlaces: "{form}: {n} places. Tap one to open it.",
  searchCount: "{n} ×",
  searchPlacesLabel: "Places of this form",
});

function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function safeHttpsUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch { return null; }
}

/**
 * Issue #263 -- the four segment roles the Word Card colours the Arabic
 * word (and the matching part of its gloss) by. Exported so a caller and
 * this module's own tests share one closed vocabulary rather than two.
 */
export const WORD_SEGMENT_ROLES = Object.freeze(["particle", "person", "determiner", "stem"]);

function validSegments(segments) {
  return Array.isArray(segments) && segments.length > 0 &&
    segments.every((s) => s && Number.isInteger(s.from) && Number.isInteger(s.to) && s.to > s.from && WORD_SEGMENT_ROLES.includes(s.role));
}

/**
 * Renders `token` as one plain text run broken into colour-coded `<span>`s,
 * one per segment. Deliberately NOTHING else sits between the spans (no
 * space, no other markup) -- a plain inline `<span>` with the default
 * `unicode-bidi: normal` does not isolate its own contextual shaping from
 * its neighbours, so Arabic letter joining survives the span boundaries;
 * this is proven in a real browser by word-card-segments-browser.mjs
 * (measured rendered width, coloured vs. plain, within 1px).
 */
export function segmentedArabicHtml(token, segments) {
  if (!validSegments(segments)) return escapeHtml(token);
  let out = "", cursor = 0;
  for (const seg of segments) {
    if (seg.from > cursor) out += escapeHtml(token.slice(cursor, seg.from));
    out += `<span class="word-card-segment word-card-segment-${seg.role}">${escapeHtml(token.slice(seg.from, seg.to))}</span>`;
    cursor = seg.to;
  }
  if (cursor < token.length) out += escapeHtml(token.slice(cursor));
  return out;
}

/**
 * Colours the English gloss to match: a segment's own `cue` (one word, or
 * `|`-separated alternatives -- see build-word-segments.mjs) is looked for
 * as a WHOLE word, case-insensitively, and that word takes the segment's
 * colour. Every other word in the gloss takes the stem colour (the part of
 * the meaning nothing more specific claimed). A cue that is not found in
 * this particular gloss colours nothing -- never a guess at which word it
 * might have meant.
 */
export function segmentedGlossHtml(gloss, segments) {
  if (typeof gloss !== "string" || !gloss) return escapeHtml(gloss ?? "");
  if (!validSegments(segments)) return escapeHtml(gloss);
  const cueRoleByWord = new Map();
  for (const seg of segments) {
    if (!seg.cue) continue;
    for (const alt of String(seg.cue).split("|")) {
      const key = alt.trim().toLowerCase();
      if (key) cueRoleByWord.set(key, seg.role);
    }
  }
  // Built piece by piece (never a bare `.replace` on the raw string) so
  // every non-word character -- punctuation, whitespace, anything else the
  // gloss carries -- is escaped exactly once, same as the rest of this file.
  let out = "", cursor = 0;
  const wordRe = /[A-Za-z]+/g;
  let m;
  while ((m = wordRe.exec(gloss))) {
    if (m.index > cursor) out += escapeHtml(gloss.slice(cursor, m.index));
    const word = m[0];
    const role = cueRoleByWord.get(word.toLowerCase()) || "stem";
    out += `<span class="word-card-gloss-segment word-card-segment-${role}">${escapeHtml(word)}</span>`;
    cursor = m.index + word.length;
  }
  if (cursor < gloss.length) out += escapeHtml(gloss.slice(cursor));
  return out;
}

/**
 * MAP Phase 3 -- the WbW progress block.
 *
 * Pure, like the rest of this module: it is handed a resolved progress view,
 * an authority projection and a coverage figure, and renders them. It never
 * decides who may do what and never derives a state.
 *
 * `authority.mayClaim === false` renders the reason IN WORDS rather than
 * rendering nothing -- v07.128's lesson, that "missing" is a dead end with
 * nothing on screen to say why, while "present and explained" is a small
 * ugliness. The decision row is different: where no confirmation is required
 * there is genuinely no decision to make, so nothing is withheld and nothing
 * needs explaining.
 */
/**
 * Issue #303 -- the whole-Qur'an running total, read straight off
 * quranWordTotals (getWordTotals(), already gated by
 * study-wbw-total-readiness.js and switched on since v08.53 -- no new gate).
 * `null` while that gate is closed or nothing has been counted yet for this
 * person; the caller shows nothing rather than a fabricated 0.
 */
function wholeQuranKnownLines(wholeQuranTotal, text, formatNumber, levelTotals) {
  // Decision 58 (#490): once Basic/Depth lemma-wide claims are live the page
  // hands over one total PER LEVEL and the box carries one pair of lines per
  // level. Without `levelTotals` (the gate is closed) nothing below changes.
  if (Array.isArray(levelTotals) && levelTotals.length) {
    const grouped = (n) => Number(n ?? 0).toLocaleString("en-US");
    const big = (v) => `<strong class="word-progress-whole-quran-num">${escapeHtml(v)}</strong>`;
    const names = { wbw: text.levelNameWbw, basic: text.levelNameBasic, depth: text.levelNameDepth };
    const rows = levelTotals.map(({ level, total }) => {
      const name = String(names[level] ?? level);
      const known = escapeHtml(String(text.wholeQuranKnownLevel)).replace("{level}", () => escapeHtml(name))
        .replace("{known}", big(formatNumber(grouped(total.known))))
        .replace("{total}", big(formatNumber(grouped(total.total))));
      const percent = escapeHtml(String(text.wholeQuranPercentLevel)).replace("{level}", () => escapeHtml(name))
        .replace("{percent}", big(formatNumber(percentRounded(total.known, total.total))));
      return `<p class="word-progress-whole-quran" data-whole-quran-level="${escapeHtml(level)}">${known}</p>` +
        `<p class="word-progress-whole-quran-percent" data-whole-quran-level-percent="${escapeHtml(level)}">${percent}</p>`;
    });
    return `<div class="word-progress-whole-quran-box">${rows.join("")}</div>`;
  }
  if (!wholeQuranTotal) return "";
  // Thousands grouped here only ("77,429"; Bangla keeps its own digits via
  // formatNumber) -- i18n's num() is shared with years and references,
  // which must never gain a separator.
  const grouped = (n) => Number(n ?? 0).toLocaleString("en-US");
  // Owner, 2 Oct 2026: "Make these eye-catching, bold ... 'You know ... of
  // .... words of the Quran'". The numbers are wrapped AFTER escaping the
  // sentence, so a translation can place them anywhere in its own order.
  const big = (v) => `<strong class="word-progress-whole-quran-num">${escapeHtml(v)}</strong>`;
  const known = escapeHtml(String(text.wholeQuranKnown))
    .replace("{known}", big(formatNumber(grouped(wholeQuranTotal.known))))
    .replace("{total}", big(formatNumber(grouped(wholeQuranTotal.total))));
  const percent = percentRounded(wholeQuranTotal.known, wholeQuranTotal.total);
  const percentLine = escapeHtml(String(text.wholeQuranPercent)).replace("{percent}", big(formatNumber(percent)));
  return `<div class="word-progress-whole-quran-box">` +
    `<p class="word-progress-whole-quran">${known}</p>` +
    `<p class="word-progress-whole-quran-percent">${percentLine}</p></div>`;
}

/**
 * Issue #303 -- "if you learn this word: +W words (+P%)". `learnDelta` is
 * `null` when the lemma is already known everywhere (nothing left to gain)
 * or this word carries no lemma at all; `thisOccurrenceOnly` distinguishes
 * the honest fallback (the lemma gate is closed, or this occurrence's lemma
 * figure could not be read) from the real whole-lemma figure.
 */
function knownThroughLine(lemma, text) {
  if (!lemma) return "";
  const arabic = `<span dir="rtl" lang="ar">${escapeHtml(lemma)}</span>`;
  const line = escapeHtml(String(text.knownThroughSameMeaning)).replace("{word}", () => arabic);
  return `<p class="word-progress-known-through" data-word-known-through>${line}</p>`;
}

/**
 * Decision 58 (#490) -- known only through a Basic claim on the word's meaning
 * group, or a Depth claim on its root. `via` is `{ level, key }`; the claim key
 * of a Depth claim IS the root, so it is named; a Basic claim is keyed by the
 * group id, which is not a word, so the line names the group in words.
 */
function knownThroughLevelLine(via, text) {
  if (!via) return "";
  if (via.level === "depth") {
    const root = `<span dir="rtl" lang="ar">${escapeHtml(via.key)}</span>`;
    const line = escapeHtml(String(text.knownThroughDepthRoot)).replace("{root}", () => root);
    return `<p class="word-progress-known-through" data-word-known-through data-known-through-level="depth">${line}</p>`;
  }
  return `<p class="word-progress-known-through" data-word-known-through data-known-through-level="basic">${escapeHtml(String(text.knownThroughBasicGroup))}</p>`;
}

function learnDeltaLine(learnDelta, text, formatNumber) {
  if (!learnDelta || !learnDelta.words) return "";
  const template = learnDelta.thisOccurrenceOnly ? text.learnWordDeltaThisOccurrenceOnly : text.learnWordDelta;
  const line = String(template)
    .replace("{words}", formatNumber(learnDelta.words))
    .replace("{percent}", formatNumber(learnDelta.percent));
  return `<p class="word-progress-learn-delta">${escapeHtml(line)}</p>`;
}

// Decision 68 (5 Oct 2026) -- at Basic and Depth a word with no dictionary
// word is Not applicable, automatically: a plain line in place of the four
// buttons. A mark made before the decision is not silently changed; the
// reader gets one button to clear it (it writes not_started, through the same
// handler as the Not started button).
function notApplicableHtml(progress, authority, text) {
  const marked = progress.state && progress.state !== "not_started";
  const clear = marked && authority?.mayClaim
    ? `<button type="button" class="word-progress-na-clear" data-word-progress-state="not_started"${progress.saving ? " disabled" : ""}>${escapeHtml(text.clearEarlierMark ?? "Clear the earlier mark")}</button>`
    : "";
  return `<p class="word-progress-state word-progress-na" data-word-progress-na>${escapeHtml(text.notApplicable ?? "Not applicable")}</p>${clear}`;
}

function progressBlock(progress, authority, coverage, text, formatNumber, wbw = {}) {
  if (!progress) return "";
  if (progress.loaded === false) {
    return `<div class="word-card-progress" data-word-progress><p class="word-progress-state">${escapeHtml(progress.loading ? text.progressLoading : text.progressUnknown)}</p></div>`;
  }
  const stateLabel = { not_started: text.stateNotStarted, learning: text.stateLearning, practising: text.statePractising, achieved: text.stateAchieved };
  const reviewLine = progress.awaitingReview
    ? text.awaitingReview
    : progress.review === "confirmed"
      ? text.reviewConfirmed
      : progress.review === "returned"
        ? (progress.returnNote ? String(text.reviewReturned).replace("{note}", progress.returnNote) : text.reviewReturnedNoNote)
        : null;
  // 5 Oct 2026 -- while a press is saving, every button is locked (one save
  // at a time) and the pressed state already shows.
  const locked = progress.saving ? " disabled" : "";
  const stateButton = (state) => `<button type="button" data-word-progress-state="${state}" aria-pressed="${progress.state === state}" style="${stageColourStyle(state)}"${authority?.mayClaim && !progress.saving ? "" : " disabled"}>${escapeHtml(stateLabel[state])}</button>`;
  const decisions = authority?.mayDecide && progress.state === "achieved"
    ? `<div class="word-progress-decide">
        <button type="button" data-word-progress-decide="confirmed"${locked}>${escapeHtml(text.confirm)}</button>
        <button type="button" data-word-progress-decide="returned"${locked}>${escapeHtml(text.sendBack)}</button>
      </div>`
    : "";
  const coverageLine = coverage
    ? `<p class="word-progress-coverage">${escapeHtml(String(text.coverage).replace("{known}", formatNumber(coverage.known)).replace("{total}", formatNumber(coverage.total)))}${
        coverage.complete ? "" : ` <span class="word-progress-incomplete">${escapeHtml(String(text.coverageIncomplete).replace("{unknown}", formatNumber(coverage.unknown)))}</span>`
      }</p>`
    : "";
  // Issue #322 -- the second row ("Mark this word known everywhere",
  // issue #303) is gone: the buttons above now drive the lemma-wide claim
  // too (mirrored by the page's own runWordProgressAction()), so there is no
  // longer a second control offering the same decision twice.
  // Round 7 (#525) -- two boxes. On a phone they stack exactly as the one block
  // did; on a wide card (a container query in quranrevival.html) they become
  // the right-hand column. The PC-only parts (second heading, where-line, ring)
  // are hidden by CSS below the breakpoint, so the phone card is unchanged.
  const ring = wholeQuranRingHtml(wbw, text, formatNumber);
  return `<div class="word-card-progress" data-word-progress>
    <div class="word-progress-rec" data-word-progress-rec>
    <h3 class="word-progress-heading word-progress-heading-phone">${escapeHtml(text.progressHeading)}</h3>
    <h3 class="word-progress-heading word-progress-heading-pc">${escapeHtml(text.recordHeading)}</h3>
    ${wbw.where ? `<p class="word-progress-where">${escapeHtml(wbw.where)}</p>` : ""}
    ${wbw.notApplicable ? notApplicableHtml(progress, authority, text) : `<div class="word-progress-states" role="group" aria-label="${escapeHtml(text.progressHeading)}">${stateButton("not_started")}${stateButton("learning")}${stateButton("practising")}${stateButton("achieved")}</div>`}
    ${progress.saving ? `<p class="word-progress-state" data-word-progress-saving role="status">${escapeHtml(text.saving ?? "Saving…")}</p>` : ""}
    ${reviewLine ? `<p class="word-progress-state" data-word-progress-review>${escapeHtml(reviewLine)}</p>` : ""}
    ${authority && !authority.mayClaim ? `<p class="word-progress-state" data-word-progress-blocked>${escapeHtml(text.progressNotAllowed)}</p>` : ""}
    ${decisions}
    </div>
    <div class="word-progress-status" data-word-progress-status>
    <h3 class="word-progress-heading word-progress-heading-pc">${escapeHtml(text.statusHeading)}</h3>
    <div class="word-progress-status-top">${ring}${coverageLine}</div>
    ${wholeQuranKnownLines(wbw.wholeQuranTotal, text, formatNumber, wbw.levelTotals)}
    ${wbw.thisWordShareHtml ?? ""}
    ${learnDeltaLine(wbw.learnDelta, text, formatNumber)}
    </div>
  </div>`;
}

/**
 * Round 7 (#525) -- the percentage ring: the % of the Qur'an's words known at
 * the OPEN tab's level. Never a new count: it is the same known/total pair
 * the "You know ..." line prints (levelTotals, or the WbW total on a page that
 * has none). Unknown or still loading -> "—" and no arc, never 0%.
 */
function wholeQuranRingHtml(wbw, text, formatNumber) {
  const level = wbw.level ?? "wbw";
  const total = Array.isArray(wbw.levelTotals) && wbw.levelTotals.length
    ? (wbw.levelTotals.find((row) => row.level === level)?.total ?? null)
    : (level === "wbw" ? (wbw.wholeQuranTotal ?? null) : null);
  const known = total && Number.isFinite(total.known) && Number.isFinite(total.total) && total.total > 0;
  const R = 50, C = 2 * Math.PI * R;
  const percent = known ? percentRounded(total.known, total.total) : null;
  const shown = known ? `${formatNumber(percent.toFixed(2))}%` : "—";
  const label = known ? String(text.ringLabel).replace("{percent}", shown) : String(text.ringUnknown);
  const arc = known && percent > 0
    ? `<circle class="word-progress-ring-arc" cx="60" cy="60" r="${R}" fill="none" stroke-width="12" stroke-linecap="round" stroke-dasharray="${((percent / 100) * C).toFixed(2)} ${C.toFixed(2)}" transform="rotate(-90 60 60)"/>`
    : "";
  return `<svg class="word-progress-ring" data-word-progress-ring viewBox="0 0 120 120" role="img" aria-label="${escapeHtml(label)}">
    <circle class="word-progress-ring-track" cx="60" cy="60" r="${R}" fill="none" stroke-width="12"/>${arc}
    <text class="word-progress-ring-num" x="60" y="58" text-anchor="middle" font-size="21" font-weight="800">${escapeHtml(shown)}</text>
    <text class="word-progress-ring-cap" x="60" y="78" text-anchor="middle" font-size="10">${escapeHtml(text.ringCaption)}</text>
  </svg>`;
}

function validLevel(level) {
  if (!WORD_CARD_LEVELS.includes(level)) throw new TypeError(`Unknown word-card level: ${level}.`);
  return level;
}

export function createWordCardState(level = "wbw") {
  return Object.freeze({ open: false, occurrenceId: null, level: validLevel(level) });
}

export function openWordCard(state, occurrenceId) {
  if (!occurrenceId) throw new TypeError("occurrenceId is required.");
  return Object.freeze({ ...state, open: true, occurrenceId });
}

export function closeWordCard(state) {
  return Object.freeze({ ...state, open: false });
}

export function selectWordCardLevel(state, level) {
  return Object.freeze({ ...state, level: validLevel(level) });
}

export function moveWordCard(state, orderedOccurrenceIds, direction) {
  if (!Array.isArray(orderedOccurrenceIds) || !orderedOccurrenceIds.length) return state;
  const at = orderedOccurrenceIds.indexOf(state.occurrenceId);
  if (at < 0) return state;
  const delta = direction === "previous" ? -1 : direction === "next" ? 1 : 0;
  if (!delta) throw new TypeError('direction must be "previous" or "next".');
  const target = orderedOccurrenceIds[at + delta];
  return target ? Object.freeze({ ...state, occurrenceId: target, open: true }) : state;
}

/**
 * v08.21 -- the derived forms of the selected word's root, rendered the SAME
 * way and in the SAME order for Basic Arabic and Arabic in Depth. Only the
 * expandability differs: Basic is the summary, Depth opens each form's own
 * occurrences.
 *
 * Three honesty rules are built into this, not bolted on:
 *
 *  1. NO grammatical category is printed for a form. The packaged `pos`
 *     describes a written token together with its attached particles and
 *     pronouns ("Determiner + Noun"), and measured across the corpus 2,067 of
 *     4,832 lemmas carry more than one value -- so it does not classify a
 *     dictionary form. The card says that in words instead of guessing.
 *  2. The "Form n" number is a LIST POSITION. It is not the traditional
 *     Arabic verb form (I, II, III...), and the card says so, because the two
 *     look identical on screen and mean entirely different things.
 *  3. A count this data cannot stand behind is reported, never printed as if
 *     it were whole: `unclassified` occurrences are named, and a truncated
 *     occurrence list says how many of how many it is showing.
 */
/**
 * v08.22 -- name one grammatical category in the reader's language.
 *
 * `text.posNames` is supplied by the page from its own catalogue, so nothing
 * is translated here. A category the catalogue does not carry is printed
 * EXACTLY as the source records it -- the packaged corpus uses a handful of
 * opaque tags (RES, PRO, PREV, EXL, INT, EXH, SUR, AVR, IMPV, EQ, COM) whose
 * expansion it never states, and inventing a grammatical name from those
 * letters would be fabricating a classification the data does not make.
 */
function posName(category, text) {
  const name = text.posNames?.[category];
  return name && name !== category ? { name, en: category } : { name: category, en: "" };
}

/** The packaged `pos` of one WRITTEN TOKEN, named segment by segment. It is a
 *  " + "-joined chain of attached particles, the head word and any attached
 *  pronoun, so every segment is looked up on its own and the chain is kept. */
function posChain(pos, text) {
  const segs = String(pos).split(" + ").map((x) => x.trim()).filter(Boolean);
  if (!segs.length) return { name: "", en: "" };
  const parts = segs.map((seg) => posName(seg, text));
  return {
    name: parts.map((p) => p.name).join(" + "),
    en: parts.some((p) => p.en) ? segs.join(" + ") : "",
  };
}

function posCell(category, form, text, formatNumber) {
  if (!category) return `<span class="word-card-form-pos"><span class="word-card-form-pos-name word-card-form-pos-unknown">${escapeHtml(text.formCategoryUnknown)}</span></span>`;
  const { name, en } = posName(category, text);
  const others = (form.posCounts ?? []).slice(1).map((c) => c?.[0]).filter(Boolean);
  const more = others.length
    ? `<span class="word-card-form-pos-more" title="${escapeHtml(String(text.formCategoryOtherTitle).replace("{list}", others.map((o) => posName(o, text).name).join(", ")))}">${escapeHtml(String(text.formCategoryOther).replace("{count}", formatNumber(others.length)))}</span>`
    : "";
  // v08.23 -- the "+n" marker is part of the LABEL, on the label's own line.
  // v08.22 emitted it as a third child of a column-direction box, which put it
  // on a line of its own underneath the category name.
  return `<span class="word-card-form-pos">` +
    `<span class="word-card-form-pos-label"><span class="word-card-form-pos-name">${escapeHtml(name)}</span>${more}</span>` +
    (en ? `<span class="word-card-form-pos-en" lang="en">${escapeHtml(en)}</span>` : "") +
    `</span>`;
}

/** The form's meaning in the reader's language; the other language, correctly
 *  tagged, when theirs is missing; nothing when neither exists. */
function formMeaning(form, text) {
  const own = text.formMeaningLang === "bn" ? "bn" : "en";
  const lang = form.meaning?.[own] ? own : form.meaning?.[own === "bn" ? "en" : "bn"] ? (own === "bn" ? "en" : "bn") : "";
  if (!lang) return "";
  return `<span class="word-card-form-meaning" lang="${lang}">${escapeHtml(form.meaning[lang])}</span>`;
}

function formsSection(layers, context, text, formatNumber, { expandable }) {
  if (!layers.root) return "";
  const data = context.rootForms;
  if (context.rootFormsError) {
    return `<section class="word-card-forms"><h4>${escapeHtml(text.derivedForms)}</h4>` +
      `<p role="status">${escapeHtml(String(text.formsUnavailable).replace("{error}", context.rootFormsError))}</p></section>`;
  }
  if (!data) {
    return `<section class="word-card-forms"><h4>${escapeHtml(text.derivedForms)}</h4>` +
      `<p>${escapeHtml(text.loadingForms)}</p></section>`;
  }
  if (!data.forms?.length) {
    return `<section class="word-card-forms"><h4>${escapeHtml(text.derivedForms)}</h4>` +
      `<p>${escapeHtml(text.noDerivedForms)}</p></section>`;
  }
  const summary = String(text.rootFormsSummary)
    .replace("{total}", formatNumber(data.totalOccurrences))
    .replace("{forms}", formatNumber(data.formCount));
  const unclassified = data.unclassified
    ? `<p class="word-card-forms-note">${escapeHtml(String(text.formsUnclassified).replace("{count}", formatNumber(data.unclassified)))}</p>`
    : "";
  // v08.23 -- [CATEGORY] [ARABIC] [N occurrences], all three in ONE cluster
  // with small, equal gaps. v08.22 pushed the count to the far edge with an
  // auto margin, which left 645-768px of empty card between the Arabic and the
  // count at desktop width -- the owner's own report. Nothing is distributed
  // across the card now; on a narrow screen the cluster wraps as a unit rather
  // than throwing the count to the opposite side. Rows stay keyed by LEMMA, so
  // two distinct written forms that share a category remain two rows.
  const rows = data.forms.map((form) => {
    const occurrences = escapeHtml(String(text.formOccurrences).replace("{count}", formatNumber(form.count)));
    const head = posCell(form.pos, form, text, formatNumber) +
      `<span class="word-card-form-arabic" dir="rtl" lang="ar">${escapeHtml(form.lemma)}</span>` +
      formMeaning(form, text) +
      `<span class="word-card-form-count">${occurrences}</span>`;
    if (!expandable) return `<li class="word-card-form">${head}</li>`;
    const open = context.expandedForm === form.lemma;
    const toggleLabel = open ? text.hideOccurrences : text.showOccurrences;
    return `<li class="word-card-form">` +
      `<button type="button" class="word-card-form-toggle" data-word-form-toggle="${escapeHtml(form.lemma)}" aria-expanded="${open ? "true" : "false"}" aria-label="${escapeHtml(`${toggleLabel} — ${form.lemma}`)}">${head}<span class="word-card-form-caret" aria-hidden="true">${open ? "▾" : "▸"}</span></button>` +
      (open ? formOccurrenceList(form, context, text, formatNumber) : "") +
      `</li>`;
  }).join("");
  const mixed = data.forms.filter((f) => f.posAmbiguous).length;
  return `<section class="word-card-forms">
    <h4>${escapeHtml(text.derivedForms)}</h4>
    <p class="word-card-forms-summary">${escapeHtml(summary)}</p>
    <ol class="word-card-form-list">${rows}</ol>
    ${unclassified}
    <p class="word-card-forms-note">${escapeHtml(text.formCategoryNote)}</p>
    ${mixed ? `<p class="word-card-forms-note">${escapeHtml(String(text.formCategoryMixed).replace("{count}", formatNumber(mixed)))}</p>` : ""}
  </section>`;
}

/**
 * Word card rebuild, round 3 -- Basic's derived forms as ordered cards.
 * `context.lemmaForms` is lemma-forms.json's `values` once it has loaded
 * (first use of Basic, never at startup) and absent until then, when the cards
 * print in the data's own order WITHOUT group tags rather than a blank space.
 * The order is orderDerivedForms()'s alone; this function never sorts.
 */
function derivedCardsSection(layers, context, text, formatNumber) {
  if (!layers.root) return "";
  const data = context.rootForms;
  if (context.rootFormsError || !data || !data.forms?.length) return formsSection(layers, context, text, formatNumber, { expandable: false });
  const bn = text.formMeaningLang === "bn";
  const lang = bn ? "bn" : "en";
  const table = context.lemmaForms ?? null;
  let forms = data.forms;
  if (table) {
    forms = orderDerivedForms(data.forms.map((f) => {
      const e = table[f.lemma];
      return { lemma: f.lemma, group: e ? e[0] : "other", form: e ? e[1] : 0, count: f.count, src: f };
    })).map((x) => ({ ...x.src, group: x.group, formNo: x.form }));
  }
  const summary = String(text.derivedCardsSummary).replace("{n}", formatNumber(data.formCount ?? data.forms.length)).replace("{total}", formatNumber(data.totalOccurrences));
  const cards = forms.map((f) => {
    const { name } = f.pos ? posName(f.pos, text) : { name: text.formCategoryUnknown };
    const formNo = f.group === "verb" && f.formNo > 0 && FORM_NAMES[f.formNo]
      ? ` · ${bn ? formatNumber(f.formNo) : FORM_NAMES[f.formNo].roman}` : "";
    const pos = `${name}${formNo}${f.posAmbiguous ? " +1" : ""}`;
    const current = f.lemma === layers.lemma;
    return `<div class="word-card-dcard${f.group ? ` word-card-dgroup-${f.group}` : ""}${current ? " word-card-dcard-current" : ""}"${current ? ' data-word-card-form-current aria-current="true"' : ""} data-word-card-dcard>` +
      (f.group ? `<span class="word-card-dcard-group">${escapeHtml(DERIVED_GROUP_LABELS[f.group]?.[lang] ?? "")}</span>` : "") +
      `<span class="word-card-dcard-pos">${escapeHtml(pos)}</span>` +
      `<span class="word-card-dcard-ar" dir="rtl" lang="ar">${escapeHtml(f.lemma)}</span>` +
      formMeaning(f, text) +
      `<span class="word-card-dcard-count">${escapeHtml(String(text.derivedCardCount).replace("{n}", formatNumber(f.count)))}</span>` +
      `</div>`;
  }).join("");
  return `<section class="word-card-forms" data-word-card-dcards>
    <h4>${escapeHtml(text.derivedForms)}</h4>
    <p class="word-card-forms-summary">${escapeHtml(summary)}</p>
    <div class="word-card-dcards">${cards}</div>
  </section>`;
}

/**
 * The shared list markup for a resolved set of occurrences: the exact
 * written word at each place, and its reference, each one a control that
 * opens that āyah. Used by BOTH a derived form's own occurrences (Depth) and
 * -- new in this round -- the current word's own lemma occurrences (Basic),
 * so a reader gets ONE occurrence-list shape and ONE way to reach an āyah
 * from it (`data-word-occurrence-goto`), not two things that look alike but
 * behave differently.
 */
function occurrenceListMarkup(items, total, error, fallbackArabic, text, formatNumber) {
  if (error) return `<p role="status">${escapeHtml(String(text.occurrencesUnavailable).replace("{error}", error))}</p>`;
  if (!items) return `<p>${escapeHtml(text.loadingOccurrences)}</p>`;
  if (!items.length) return `<p>${escapeHtml(text.noOccurrencesListed)}</p>`;
  const truncated = Number(total ?? items.length) > items.length
    ? `<p class="word-card-forms-note">${escapeHtml(String(text.showingFirst).replace("{shown}", formatNumber(items.length)).replace("{total}", formatNumber(Number(total))))}</p>`
    : "";
  const rows = items.map((o) => {
    const ref = `${o.surah}:${o.ayah}:${o.position}`;
    // Issue #482 -- what is SHOWN may be a display count (Al-Fātiḥah); the
    // goto attribute above stays the internal reference.
    const shown = typeof text.displayRef === "function" ? text.displayRef(o.surah, o.ayah, o.position) : ref;
    return `<li><button type="button" class="word-card-occurrence-link" data-word-occurrence-goto="${escapeHtml(ref)}" aria-label="${escapeHtml(String(text.goToOccurrence).replace("{ref}", shown))}">` +
      `<span class="word-card-occurrence-arabic" dir="rtl" lang="ar">${escapeHtml(o.arabic || fallbackArabic)}</span>` +
      `<span class="word-card-occurrence-ref">${escapeHtml(shown)}</span></button></li>`;
  }).join("");
  return `<div class="word-card-form-occurrences"><ol class="word-card-occurrences">${rows}</ol>${truncated}</div>`;
}

/** One expanded form's own occurrences. */
function formOccurrenceList(form, context, text, formatNumber) {
  return occurrenceListMarkup(context.formOccurrences, context.formOccurrencesTotal, context.formOccurrencesError, form.lemma, text, formatNumber);
}

/**
 * The Basic tab's own "{count} occurrences of this Dictionary Word" line, EXPANDABLE.
 *
 * Before this round the line was plain text: the exact same dictionary-form
 * occurrences the "Derived forms" list already counts (one of its rows is
 * always this very lemma), fetched into `context.lemmaOccurrences` since
 * v08.21 (occurrenceRefsFor("lemma", ...), read for `hydrateWordCardOccurrences`)
 * and used for nothing but a number -- a reader could reach this lemma's own
 * occurrences only by finding the matching row in Depth's derived-forms list
 * and expanding THAT, an indirect route for something the card already knows.
 *
 * This makes the line itself a toggle, reusing the exact affordance, strings
 * and event identity Depth's own form toggle already established
 * (`aria-expanded`, the same caret, `occurrenceListMarkup` above) -- one
 * pattern, two entry points, no new one invented. Nothing new is fetched
 * until the reader actually expands it: `context.lemmaOccurrences` is
 * already resolved by the time this renders; only the WRITTEN TEXT at each
 * position (never assumed from the lemma) is resolved on demand, the same
 * deferral `expandWordForm` already uses for forms.
 */
function lemmaOccurrenceBlock(word, layers, context, text, formatNumber) {
  const lemmaCount = Number(context.lemmaOccurrenceCount ?? context.lemmaOccurrences?.length ?? 0);
  const countText = String(text.lemmaOccurrences).replace("{count}", formatNumber(lemmaCount));
  if (!lemmaCount) return `<p>${escapeHtml(countText)}</p>`;
  const open = !!context.lemmaExpanded;
  const toggleLabel = open ? text.hideOccurrences : text.showOccurrences;
  return `<p><button type="button" class="word-card-lemma-toggle word-card-form-toggle" data-word-lemma-toggle aria-expanded="${open ? "true" : "false"}" aria-label="${escapeHtml(`${toggleLabel} — ${countText}`)}"><span>${escapeHtml(countText)}</span><span class="word-card-form-caret" aria-hidden="true">${open ? "▾" : "▸"}</span></button></p>` +
    (open ? occurrenceListMarkup(context.lemmaOccurrenceItems, context.lemmaOccurrenceItemsTotal, context.lemmaOccurrenceItemsError, word.arabic, text, formatNumber) : "");
}

/**
 * Issue #206 -- "Appears N times in the Qur'an — X% of all words", for the
 * currently-open word's own lemma. N is the SAME count the lemma occurrence
 * block above already reads (occurrenceRefsFor("lemma", value).length,
 * hydrated by the page, never fetched twice here); X is N against the one
 * exported whole-Qur'an total, rounded the same way computeArabicCoverage()
 * rounds every other percentage this app shows. Ships and works regardless
 * of the running-counter readiness gate -- it reads data already loaded and
 * writes nothing.
 */
function wordShareOfQuranLine(context, text, formatNumber) {
  const count = Number(context.lemmaOccurrenceCount ?? context.lemmaOccurrences?.length ?? 0);
  if (!count) return "";
  const percent = percentRounded(count, QURAN_TOTAL_WORD_COUNT);
  const line = String(text.wordShareOfQuran)
    .replace("{count}", formatNumber(count))
    .replace("{percent}", formatNumber(percent));
  return `<p class="word-card-share-of-quran">${escapeHtml(line)}</p>`;
}

function tabButton(level, selected, label) {
  return `<button type="button" role="tab" data-word-card-level="${level}" aria-selected="${selected}" tabindex="${selected ? "0" : "-1"}">${escapeHtml(label)}</button>`;
}

/**
 * 2 Oct 2026 (#476) -- the Depth tab's Dictionary box. `context.dictionary` is
 * `{ entry }` once the (first-use) dictionary file has loaded -- `entry` being
 * that lemma's `{ m, c, u? }` or null -- and absent until then, when the meaning
 * line is left out rather than guessed. Pure: the page fetches, this prints.
 * The meaning is English on both pages (lang="en"); links appear only for a
 * word that has a root.
 */
function dictionaryBox(word, context, text, formatNumber = String) {
  const dict = context.dictionary;
  const entry = dict?.entry ?? null;
  const bn = text.formMeaningLang === "bn";
  // Decision 62 (#539): in Bangla the Bangla meaning (AQS Quraniyo Obhidhan) leads.
  const bnDict = bn ? context.dictionaryBn : null;
  const bnEntry = bnDict?.entry ?? null;
  const hasBnMeaning = !!(bnEntry && Array.isArray(bnEntry.m) && bnEntry.m.length);
  const pdfLink = (p) => {
    const label = escapeHtml(formatNumber(p));
    return Number.isInteger(p) ? `<a href="https://archive.org/download/mujammufahras/qab.pdf#page=${p}" target="_blank" rel="noopener noreferrer" data-word-card-dict-bn-page>${label}</a>` : label;
  };
  let meaningHtml = "";
  if (dict) {
    meaningHtml = entry
      ? `<p class="word-card-dict-meaning${bnDict ? " word-card-dict-meaning-en" : ""}"><span lang="en" data-word-card-dict-meaning>${escapeHtml(entry.m)}</span>${entry.c === "medium" ? `<span class="word-card-dict-pill" data-word-card-dict-pill="likely">${escapeHtml(text.likelyMatch)}</span>` : ""}${entry.c === "fixed" ? `<span class="word-card-dict-pill" data-word-card-dict-pill="fixed">${escapeHtml(text.fixedByUs)}</span>` : ""}</p>`
      : `<p class="word-card-dict-none" data-word-card-dict-none>${escapeHtml(text.noDictionaryMeaning)}</p>`;
  }
  let bnHtml = "";
  if (bnDict) {
    if (hasBnMeaning) {
      const rest = bnEntry.m.slice(1);
      bnHtml = `<p class="word-card-dict-meaning word-card-dict-bn-lead" data-word-card-dict-bn><span lang="bn" data-word-card-dict-bn-meaning>${escapeHtml(bnEntry.m[0])}</span></p>`
        + (rest.length
          ? `<details class="word-card-dict-more" data-word-card-dict-bn-more><summary>${escapeHtml(String(text.otherEntriesUnderSpelling).replace("{n}", formatNumber(rest.length)))}</summary><ul>${rest.map((m, i) => `<li><span lang="bn">${escapeHtml(m)}</span> <span class="word-card-dict-pg">(${pdfLink(bnEntry.p?.[i + 1])})</span></li>`).join("")}</ul></details>`
          : "");
    } else {
      bnHtml = `<p class="word-card-dict-none" data-word-card-dict-bn-none>${escapeHtml(text.banglaMeaningNoMatch)}</p>`;
    }
  }
  const bnCredit = hasBnMeaning ? `${escapeHtml(text.creditBanglaBook)} ${pdfLink(bnEntry.p?.[0])}. ` : "";
  const wbw = (bn ? word.translation?.bn : word.translation?.en) || (bn ? text.meaningUnavailableBn : text.meaningUnavailableEn);
  const root = word.morphology?.root;
  const links = root
    ? `<div class="word-card-dict-links"><a class="word-card-dict-link" data-word-card-dict-link="corpus" href="https://corpus.quran.com/qurandictionary.jsp?q=${encodeURIComponent(arabicToBuckwalter(root))}" target="_blank" rel="noopener noreferrer">${escapeHtml(text.quranicCorpus)}</a><a class="word-card-dict-link" data-word-card-dict-link="ejtaal" href="https://ejtaal.net/aa/#q=${encodeURIComponent(root)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text.laneHansWehr)}</a></div>`
    : "";
  const wiktionaryUrl = entry && entry.c !== "fixed" ? safeHttpsUrl(entry.u) : null;
  const credit = entry && entry.c !== "fixed"
    ? `${escapeHtml(text.creditMeaning)} ${wiktionaryUrl ? `<a href="${escapeHtml(wiktionaryUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text.creditWiktionary)}</a>` : escapeHtml(text.creditWiktionary)} ${escapeHtml(text.creditWiktionaryLicence)} ${escapeHtml(text.linksOpenOther)}`
    : escapeHtml(text.linksOpenOther);
  return `<div class="word-card-dictionary" data-word-card-dictionary>
    <h4>📖 ${escapeHtml(text.dictionaryHeading)}</h4>
    <div class="word-card-dict-label">${escapeHtml(bn ? text.dictionaryMeaningBn : text.dictionaryMeaning)}</div>${bnHtml}${meaningHtml}
    <div class="word-card-dict-label">${escapeHtml(text.inThisAyah)}</div>
    <p class="word-card-dict-wbw" lang="${bn ? "bn" : "en"}">${escapeHtml(wbw)}</p>
    ${links}
    <p class="word-card-dict-credit">${bnCredit}${credit}</p>
  </div>`;
}

/** Root letters printed apart ("ع ل م"), however the data spells them. */
function spacedRoot(root) {
  return [...String(root)].filter((c) => !/\s/.test(c)).join(" ");
}

/**
 * Word card rebuild, round 2 -- the facts row (Root, Dictionary word, Form).
 * Exported so round 3 can print the same row on Basic. Right to left, Root
 * first; a box whose value is not known is LEFT OUT, never invented.
 * `features` is quran-word-features.js's record for this word, or null.
 */
export function wordFactsHtml(word, layers, features, text, formatNumber = String) {
  const bn = text.formMeaningLang === "bn";
  const lang = bn ? "bn" : "en";
  const formLabel = (n) => String(text.formNumber).replace("{n}", bn ? formatNumber(n) : (FORM_NAMES[n]?.roman ?? String(n)));
  const boxes = [];
  if (layers.root) boxes.push({ key: "root", label: text.root, value: spacedRoot(layers.root), ar: true });
  if (layers.lemma) boxes.push({ key: "dict", label: text.factDictWord, value: layers.lemma, ar: true });
  if (features) {
    const n = features.form > 0 && FORM_NAMES[features.form] ? features.form : 1;
    if (features.deriv && DERIV_NAMES[features.deriv]) {
      boxes.push({ key: "form", label: text.factForm, value: DERIV_NAMES[features.deriv][lang] + (features.form > 1 && FORM_NAMES[features.form] ? ` · ${formLabel(features.form)}` : "") });
    } else if (features.pos === "V") {
      boxes.push({ key: "form", label: text.factForm, value: formLabel(n), sub: FORM_NAMES[n].past });
    } else if (STEM_NAMES[features.pos]) {
      boxes.push({ key: "form", label: text.factForm, value: STEM_NAMES[features.pos][lang] });
    }
  }
  if (!boxes.length) return "";
  return `<div class="word-card-facts" style="--n:${boxes.length}" data-word-card-facts>${boxes.map((b) =>
    `<div class="word-card-fact" data-word-card-fact="${b.key}"><small>${escapeHtml(b.label)}</small><b${b.ar ? ' class="word-card-fact-ar" dir="rtl" lang="ar"' : ""}>${escapeHtml(b.value)}</b>${b.sub ? `<span class="word-card-fact-sub" dir="rtl" lang="ar">${escapeHtml(b.sub)}</span>` : ""}</div>`).join("")}</div>`;
}

/**
 * Word card rebuild, round 2 -- one box per word part, right to left as the
 * word is written. Parts and segments zip by index; if they do not line up
 * (about 0.4% of words have no features at all) NO boxes are shown.
 */
export function wordPartsHtml(word, layers, features, segments, context, text) {
  if (!features || !Array.isArray(features.parts) || !validSegments(segments) || features.parts.length !== segments.length) return "";
  const bn = text.formMeaningLang === "bn";
  const lang = bn ? "bn" : "en";
  const token = layers.surfaceToken;
  const colour = !!context.colourWordPartsEnabled;
  const boxes = segments.map((seg, i) => {
    const id = features.parts[i];
    const name = partName(id);
    if (!name) return "";
    const piece = escapeHtml(token.slice(seg.from, seg.to));
    let arName = name.ar;
    let meaning = null;
    if (name.kind === "stem") {
      if (id === "stem-V" && !features.deriv) {
        const n = FORM_NAMES[features.form] ? features.form : 1;
        arName = `${STEM_NAMES.V.ar} · ${FORM_NAMES[n].ordinalAr}`;
      }
      meaning = bn ? (word.translation?.bn || null) : (context.dictionary?.entry?.m || null);
    } else {
      meaning = partMeaning(id, features.pp?.[i] ?? null, lang);
    }
    const kind = PART_KINDS[name.kind]?.[lang] ?? "";
    // 5 Oct 2026, Owner: the stem (the word's main part) is marked "all over
    // the word card" -- its box carries word-card-part-stem while the parts
    // are coloured.
    const stemBox = colour && seg.role === "stem" ? " word-card-part-stem" : "";
    return `<div class="word-card-part${stemBox}" data-word-card-part="${escapeHtml(id)}"><small class="word-card-part-kind">${escapeHtml(kind)}</small><span class="word-card-part-piece${colour ? ` word-card-segment-${seg.role}` : ""}" dir="rtl" lang="ar">${piece}</span><span class="word-card-part-arname" dir="rtl" lang="ar">${escapeHtml(arName)}</span><b class="word-card-part-name">${escapeHtml(name[lang])}</b>${meaning ? `<span class="word-card-part-meaning" lang="${lang}">${escapeHtml(meaning)}</span>` : ""}</div>`;
  });
  if (boxes.some((b) => !b)) return "";
  return `<div class="word-card-parts" style="--n:${boxes.length}" data-word-card-parts>${boxes.join("")}</div>`;
}

function levelPanel(level, word, layers, context, text, formatNumber) {
  // Round 7 (#525) -- "WbW · 2:102 · word 35", the small line in Record your
  // Progress. The reference stays in plain digits (an identifier); the word
  // number is a count, in the reader's digits.
  const levelNames = { wbw: text.levelNameWbw, basic: text.levelNameBasic, depth: text.levelNameDepth };
  const where = `${levelNames[level] ?? level} · ${context.surahNumber}:${context.ayahNumber} · ${String(text.wordNumberLabel).replace("{n}", formatNumber(word.position))}`;
  if (level === "wbw") {
    // Deliberately bilingual: WbW shows the English and Bangla gloss together
    // whatever the reader's language, so each fallback stays in its own
    // language rather than following the interface setting.
    // Issue #263 -- the English gloss is coloured to match the Arabic
    // segments when both the segments and the device preference are
    // present; a Bangla cue table was deliberately not built this round
    // (see build-word-segments.mjs and the PR), so the Bangla gloss below
    // stays plain regardless.
    const showSegmentColour = context.colourWordPartsEnabled && validSegments(context.wordSegments);
    const enGloss = word.translation?.en || text.meaningUnavailableEn;
    const enGlossHtml = showSegmentColour ? segmentedGlossHtml(enGloss, context.wordSegments) : escapeHtml(enGloss);
    return `<div role="tabpanel" data-word-card-panel="wbw"><div class="word-card-main">
      ${wordFactsHtml(word, layers, context.wordFeatures ?? null, text, formatNumber)}
      <div class="word-card-meaning-bar" data-word-card-meaning-bar>
        <p class="word-card-meaning word-card-meaning-en" lang="en">${enGlossHtml}</p>
        <p class="word-card-meaning word-card-meaning-bn" lang="bn">${escapeHtml(word.translation?.bn || text.meaningUnavailableBn)}</p>
        ${word.transliteration ? `<p class="word-card-transliteration">${escapeHtml(word.transliteration)}</p>` : ""}
      </div>
      ${wordPartsHtml(word, layers, context.wordFeatures ?? null, context.wordSegments, context, text)}
      </div><div class="word-card-side">
      ${progressBlock(context.progress, context.authority, context.coverage, text, formatNumber, {
        wholeQuranTotal: context.wholeQuranTotal,
        thisWordShareHtml: layers.lemma ? wordShareOfQuranLine(context, text, formatNumber) : "",
        learnDelta: context.learnDelta,
        lemmaProgress: context.lemmaProgress,
        lemmaAuthority: context.lemmaAuthority,
        levelTotals: context.levelTotals,
        level, where,
      })}
      ${knownThroughLine(context.knownViaGroupLemma, text)}
      ${knownThroughLevelLine(context.knownViaLevel, text)}
    </div></div>`;
  }
  if (level === "basic") {
    const count = (template, n) => escapeHtml(String(template).replace("{count}", formatNumber(n)));
    // 30 Sep 2026, Owner: "Derivatives are for learning, occurrences are just
    // info" -- so the derived forms come straight after the word's facts, and
    // the occurrence counts sit below them. Round 3: the facts are the same
    // row WbW shows, and the forms are ordered cards.
    return `<div role="tabpanel" data-word-card-panel="basic"><div class="word-card-main">
      ${wordFactsHtml(word, layers, context.wordFeatures ?? null, text, formatNumber)}
      ${derivedCardsSection(layers, context, text, formatNumber)}
      <p>${layers.root ? count(text.rootOccurrences, Number(context.rootOccurrenceCount ?? word.morphology?.rootCount ?? 0)) : escapeHtml(text.rootUnavailable)}</p>
      ${layers.lemma ? lemmaOccurrenceBlock(word, layers, context, text, formatNumber) : `<p>${escapeHtml(text.lemmaUnavailable)}</p>`}
      ${layers.lemma ? wordShareOfQuranLine(context, text, formatNumber) : ""}
      ${context.occurrencesLoading ? `<p>${escapeHtml(text.loadingOccurrences)}</p>` : ""}
      ${context.occurrencesError ? `<p role="status">${escapeHtml(String(text.occurrencesUnavailable).replace("{error}", context.occurrencesError))}</p>` : ""}
      </div><div class="word-card-side">
      ${progressBlock(context.progress, context.authority, null, text, formatNumber, { levelTotals: context.levelTotals, level, where, notApplicable: !layers.lemma })}
    </div></div>`;
  }
  // v08.21 -- the occurrence section comes FIRST, then the dictionary and the
  // rest of Depth's existing detail, which is the owner's own ordering.
  // Issue #320 -- claim/confirm controls (progressBlock) are shared with the
  // WbW panel above, but WITHOUT coverage or any of the WbW-only extras
  // (whole-Qur'an total, lemma-wide claim): those stay scoped to WbW, per the
  // issue's own point 4.
  return `<div role="tabpanel" data-word-card-panel="depth"><div class="word-card-main">
    ${depthSectionsHtml({
      word, layers, features: context.wordFeatures ?? null, open: context.depthOpen ?? {},
      ctx: {
        lang: text.formMeaningLang === "bn" ? "bn" : "en", formatNumber, segments: context.wordSegments, rootForms: context.rootForms,
        lemmaForms: context.lemmaForms, verbForms: context.verbForms, verbFormsFailed: context.verbFormsFailed, dictionaryLookup: context.dictionaryLookup, ayahWords: context.ayahWords, ayahFeatures: context.ayahFeatures,
        ayahNumber: context.ayahNumber, surahNumber: context.surahNumber,
        nahw: context.needsSource?.nahw, furuq: context.needsSource?.furuq, mufradat: context.needsSource?.mufradat,
        laneUrl: layers.root ? `https://ejtaal.net/aa/#q=${encodeURIComponent(layers.root)}` : null,
        dictionaryHtml: dictionaryBox(word, context, text, formatNumber),
        formsHtml: formsSection(layers, context, text, formatNumber, { expandable: true }),
      },
    })}
    </div><div class="word-card-side">
    ${progressBlock(context.progress, context.authority, null, text, formatNumber, { levelTotals: context.levelTotals, level, where, notApplicable: !layers.lemma })}
  </div></div>`;
}

/**
 * Renders one card without fetching, writing, or inferring missing linguistic
 * data.
 *
 * `formatNumber` renders a COUNT in the reader's own digits -- Bengali digits
 * on a Bangla page, following this app's existing rule. It is deliberately not
 * applied to the surah:ayah:position references below, which are identifiers
 * and stay in plain digits, nor to anything else.
 */
/**
 * v08.20 -- the way back. `context.origin` is set only while the reader
 * followed an occurrence link OUT of a word; it names the word they came
 * from (MAP's own Note Origin / Note Destination distinction, applied to the
 * same shape here: the origin word is not the destination word, and the card
 * never conflates them). Absent, this renders nothing at all, so a word
 * opened directly is byte-for-byte the card it always was.
 */
/**
 * v08.22 -- the "visiting from" bar is no longer rendered INSIDE the card.
 *
 * v08.20 kept the card open at the destination and carried the way back in
 * its own header, which is exactly the defect the owner reported: the card
 * sat over the āyah they had asked to see. The card is now closed on the way
 * out and the way back is a control on the study screen itself, outside the
 * card, carrying the same `data-word-card-origin-back` identity. This is kept
 * because a caller may still pass `context.origin`; with none passed it
 * renders nothing, so the card never overlays a destination āyah again.
 */
function originBar(origin, text) {
  if (!origin?.occurrenceId) return "";
  const ref = String(origin.ref ?? origin.occurrenceId);
  return `<div class="word-card-origin"><span>${escapeHtml(String(text.visitingFrom).replace("{ref}", ref))}</span>` +
    `<button type="button" data-word-card-origin-back title="${escapeHtml(text.backToWordTitle)}" aria-label="${escapeHtml(String(text.backToWord).replace("{ref}", ref))}">↩ ${escapeHtml(ref)}</button></div>`;
}

/**
 * Issue #263 -- the toggle is offered whenever this word HAS segments,
 * whatever the current on/off state, so a reader can turn colouring back
 * on; the legend only prints while colouring is actually showing.
 */
function segmentControlsHtml(segments, colourOn, text) {
  if (!validSegments(segments)) return "";
  const toggle = `<label class="word-card-segment-toggle"><input type="checkbox" data-word-card-colour-toggle${colourOn ? " checked" : ""}> ${escapeHtml(text.colourWordPartsToggle)}</label>`;
  if (!colourOn) return `<div class="word-card-segment-controls">${toggle}</div>`;
  const label = { particle: text.segmentLegendParticle, person: text.segmentLegendPerson, determiner: text.segmentLegendDeterminer, stem: text.segmentLegendStem };
  const legend = WORD_SEGMENT_ROLES.filter((r) => segments.some((s) => s.role === r))
    .map((r) => `<span class="word-card-segment-legend-item"><span class="word-card-segment-legend-dot word-card-segment-${r}">●</span>${escapeHtml(label[r])}</span>`)
    .join("");
  return `<div class="word-card-segment-controls">${toggle}<span class="word-card-segment-legend">${legend}</span></div>`;
}

/**
 * Round 6 -- the Search row, under the header while 🔍 is pressed. Pure: the
 * page owns `context.search` ({ value, status, results, places, currentId }),
 * does the matching (word-card-search.js) and the one on-demand fetch.
 * References and counts are printed in the reader's own digits.
 */
function searchRowHtml(search, text, formatNumber, refText) {
  const lang = text.formMeaningLang === "bn" ? "bn" : "en";
  const results = (search.results ?? []).map((r, i) => {
    const mean = (lang === "bn" ? r.bn || r.en : r.en || r.bn) ?? "";
    return `<button type="button" class="word-card-search-res" data-word-card-search-form="${i}"><span class="word-card-search-res-ar" dir="rtl" lang="ar">${escapeHtml(r.ar)}</span><span class="word-card-search-res-t">${escapeHtml([r.tr, mean].filter(Boolean).join(" · "))}</span><span class="word-card-search-res-n">${escapeHtml(String(text.searchCount).replace("{n}", formatNumber(r.n)))}</span></button>`;
  }).join("");
  const places = (search.places ?? []).map((p) =>
    `<button type="button" class="word-card-search-place" data-word-card-search-place="${p.id}"${p.id === search.currentId ? ' aria-current="true"' : ""}>${escapeHtml(refText(p.surah, p.ayah, p.position))}</button>`).join("");
  // The value tried is always plain digits (it is parsed); what the reader sees is their own.
  const chip = (value, shown) => `<button type="button" data-word-card-search-try="${escapeHtml(value)}">${escapeHtml(shown)}</button>`;
  const tryMeaning = lang === "bn" ? "জান" : "know";
  return `<div class="word-card-search" role="search" data-word-card-search>
    <label for="wordCardSearchInput">${escapeHtml(text.searchLabel)}</label>
    <div class="word-card-search-row">
      <input id="wordCardSearchInput" type="text" data-word-card-search-input value="${escapeHtml(search.value ?? "")}" autocomplete="off" spellcheck="false" dir="auto">
      <button type="button" class="word-card-search-go" data-word-card-search-go>${escapeHtml(text.searchGo)}</button>
    </div>
    <div class="word-card-search-chips">${escapeHtml(text.searchTry)} ${chip("تعلمون", "تعلمون")}${chip(tryMeaning, tryMeaning)}${chip("2:30:28", refText(2, 30, 28))}</div>
    <p class="word-card-search-status" role="status" data-word-card-search-status>${escapeHtml(search.status ?? "")}</p>
    ${results ? `<div class="word-card-search-results" data-word-card-search-results>${results}</div>` : ""}
    ${places ? `<div class="word-card-search-places" role="group" aria-label="${escapeHtml(text.searchPlacesLabel)}" data-word-card-search-places>${places}</div>` : ""}
  </div>`;
}

export function renderQuranWordCard({ state, chapter, ayah, word, context = {}, labels = {}, formatNumber = String } = {}) {
  if (!state?.open || !word) return "";
  const occurrenceId = quranWordOccurrenceId(chapter.surahNumber, ayah.ayah, word.position);
  if (occurrenceId !== state.occurrenceId) throw new Error("Word Card data does not match its persistent occurrence identity.");
  const layers = wordIdentityLayers({ surah: chapter.surahNumber, ayah: ayah.ayah, position: word.position, arabic: word.arabic, morphology: word.morphology });
  // I11: every user-visible string here is overridable, so the page can hand
  // the card its reader's own language. The English values are the fallback
  // for a caller that supplies nothing, never the only thing a reader can get.
  const text = { ...WORD_CARD_DEFAULT_LABELS, ...labels, displayRef: context.displayRef };
  context = { ...context, ayahWords: ayah.words, ayahNumber: ayah.ayah, surahNumber: chapter.surahNumber };
  // Issue #263 -- on demand, per word: `context.wordSegments` is only ever
  // set once the caller has loaded that surah's segment file (quran-word-
  // segments.js); a word with no exact alignment, or before it has loaded,
  // simply has none, and the card renders exactly as it always did.
  const showSegmentColour = context.colourWordPartsEnabled && validSegments(context.wordSegments);
  const arabicHtml = showSegmentColour ? segmentedArabicHtml(layers.surfaceToken, context.wordSegments) : escapeHtml(layers.surfaceToken);
  const refText = (s, a, w) => (typeof context.displayRef === "function" ? String(context.displayRef(s, a, w)) : `${s}:${a}:${w}`);
  const searchOpen = !!context.search?.open;
  return `<section class="quran-word-card" role="region" aria-label="${escapeHtml(text.cardRegion)}" data-occurrence-id="${escapeHtml(occurrenceId)}"${showSegmentColour ? " data-stem-mark" : ""}>
    <header><button type="button" data-word-card-move="previous" aria-label="${escapeHtml(text.previous)}"${context.hasPrevious ? "" : " disabled"}>‹</button>
      <button type="button" class="word-card-search-btn" data-word-card-search-toggle aria-pressed="${searchOpen}" aria-label="${escapeHtml(text.searchButton)}">🔍</button>
      <div class="word-card-head-word"><div class="word-card-arabic" dir="rtl" lang="ar">${arabicHtml}</div><div class="word-card-reference">${escapeHtml(refText(chapter.surahNumber, ayah.ayah, word.position))}</div></div>
      ${layers.root ? `<div class="word-card-root-box" data-word-card-root-box><small>${escapeHtml(text.rootBoxLabel)}</small><span dir="rtl" lang="ar">${escapeHtml(spacedRoot(layers.root))}</span></div>` : ""}
      <button type="button" data-word-card-move="next" aria-label="${escapeHtml(text.next)}"${context.hasNext ? "" : " disabled"}>›</button>
      <button type="button" data-word-card-close aria-label="${escapeHtml(text.close)}">×</button></header>
    ${searchOpen ? searchRowHtml(context.search, text, formatNumber, refText) : ""}
    <div class="word-card-ayah-action-row">
      <button type="button" class="word-card-ayah-action-btn" data-word-card-ayah-action="${chapter.surahNumber}:${ayah.ayah}">${escapeHtml(text.ayahActionsButton)}</button>
    </div>
    ${segmentControlsHtml(context.wordSegments, context.colourWordPartsEnabled, text)}
    ${originBar(context.origin, text)}
    <div role="tablist" aria-label="${escapeHtml(text.tablist)}">${tabButton("wbw", state.level === "wbw", text.wbw)}${tabButton("basic", state.level === "basic", text.basic)}${tabButton("depth", state.level === "depth", text.depth)}</div>
    ${levelPanel(state.level, word, layers, context, text, formatNumber)}
  </section>`;
}
