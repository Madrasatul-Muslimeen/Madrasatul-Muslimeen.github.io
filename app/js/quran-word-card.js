// MAP Phase 2 — persistent Quran Word Card, pure state + renderer slice.
// DOM event wiring and data fetching belong to the page/controller task.

import { quranWordOccurrenceId, wordIdentityLayers } from "./quran-word-identity.js";
import { QURAN_TOTAL_WORD_COUNT, percentRounded } from "./quran-word-total.js";

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
  wbw: "WbW",
  basic: "Basic Arabic",
  depth: "Arabic in Depth",
  meaningUnavailableEn: "Meaning unavailable",
  meaningUnavailableBn: "অর্থ পাওয়া যায়নি",
  lemma: "Lemma",
  root: "Root",
  partOfSpeech: "Part of speech",
  unknown: "Unknown",
  rootOccurrences: "{count} root-linked occurrences",
  lemmaOccurrences: "{count} lemma-linked occurrences",
  derivedForms: "Derived forms of this root",
  rootFormsSummary: "{total} occurrences in {forms} derived forms",
  formOccurrences: "{count} occurrences",
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
  lemmaUnavailable: "Lemma unavailable in the approved dataset",
  loadingOccurrences: "Loading occurrences…",
  occurrencesUnavailable: "Occurrence list unavailable: {error}",
  semanticRangeMissing: "Semantic range not yet supplied",
  openDictionary: "Open dictionary source",
  dictionaryUnavailable: "Dictionary source unavailable",
  // MAP Phase 3 -- the WbW progress block. Every one of these is a string a
  // reader sees, so every one is overridable (I11).
  progressHeading: "Word progress",
  stateNotStarted: "Not started",
  stateLearning: "Learning",
  stateAchieved: "Achieved",
  awaitingReview: "Waiting to be checked",
  reviewConfirmed: "Checked and confirmed",
  reviewReturned: "Sent back: {note}",
  reviewReturnedNoNote: "Sent back to look at again",
  confirm: "Confirm",
  sendBack: "Send back",
  progressLoading: "Loading progress…",
  progressUnknown: "Progress not loaded yet",
  progressNotAllowed: "You are not able to record Arabic progress for this person.",
  coverage: "{known} of {total} words known in this ayah",
  coverageIncomplete: "{unknown} not loaded yet",
  // Issue #206 -- no gate, no new collection: this reads the lemma
  // occurrence index the Basic tab already loads, and the one exported
  // whole-Qur'an total (quran-word-total.js), and works whether or not the
  // running-counter feature is ready.
  wordShareOfQuran: "Appears {count} times in the Qur'an — {percent}% of all words",
});

function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function safeDictionaryUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch { return null; }
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
function progressBlock(progress, authority, coverage, text, formatNumber) {
  if (!progress) return "";
  if (progress.loaded === false) {
    return `<div class="word-card-progress" data-word-progress><p class="word-progress-state">${escapeHtml(progress.loading ? text.progressLoading : text.progressUnknown)}</p></div>`;
  }
  const stateLabel = { not_started: text.stateNotStarted, learning: text.stateLearning, achieved: text.stateAchieved };
  const reviewLine = progress.awaitingReview
    ? text.awaitingReview
    : progress.review === "confirmed"
      ? text.reviewConfirmed
      : progress.review === "returned"
        ? (progress.returnNote ? String(text.reviewReturned).replace("{note}", progress.returnNote) : text.reviewReturnedNoNote)
        : null;
  const stateButton = (state) => `<button type="button" data-word-progress-state="${state}" aria-pressed="${progress.state === state}"${authority?.mayClaim ? "" : " disabled"}>${escapeHtml(stateLabel[state])}</button>`;
  const decisions = authority?.mayDecide && progress.state === "achieved"
    ? `<div class="word-progress-decide">
        <button type="button" data-word-progress-decide="confirmed">${escapeHtml(text.confirm)}</button>
        <button type="button" data-word-progress-decide="returned">${escapeHtml(text.sendBack)}</button>
      </div>`
    : "";
  const coverageLine = coverage
    ? `<p class="word-progress-coverage">${escapeHtml(String(text.coverage).replace("{known}", formatNumber(coverage.known)).replace("{total}", formatNumber(coverage.total)))}${
        coverage.complete ? "" : ` <span class="word-progress-incomplete">${escapeHtml(String(text.coverageIncomplete).replace("{unknown}", formatNumber(coverage.unknown)))}</span>`
      }</p>`
    : "";
  return `<div class="word-card-progress" data-word-progress>
    <h3 class="word-progress-heading">${escapeHtml(text.progressHeading)}</h3>
    <div class="word-progress-states" role="group" aria-label="${escapeHtml(text.progressHeading)}">${stateButton("not_started")}${stateButton("learning")}${stateButton("achieved")}</div>
    ${reviewLine ? `<p class="word-progress-state" data-word-progress-review>${escapeHtml(reviewLine)}</p>` : ""}
    ${authority && !authority.mayClaim ? `<p class="word-progress-state" data-word-progress-blocked>${escapeHtml(text.progressNotAllowed)}</p>` : ""}
    ${decisions}
    ${coverageLine}
  </div>`;
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
    return `<li><button type="button" class="word-card-occurrence-link" data-word-occurrence-goto="${escapeHtml(ref)}" aria-label="${escapeHtml(String(text.goToOccurrence).replace("{ref}", ref))}">` +
      `<span class="word-card-occurrence-arabic" dir="rtl" lang="ar">${escapeHtml(o.arabic || fallbackArabic)}</span>` +
      `<span class="word-card-occurrence-ref">${escapeHtml(ref)}</span></button></li>`;
  }).join("");
  return `<div class="word-card-form-occurrences"><ol class="word-card-occurrences">${rows}</ol>${truncated}</div>`;
}

/** One expanded form's own occurrences. */
function formOccurrenceList(form, context, text, formatNumber) {
  return occurrenceListMarkup(context.formOccurrences, context.formOccurrencesTotal, context.formOccurrencesError, form.lemma, text, formatNumber);
}

/**
 * The Basic tab's own "{count} lemma-linked occurrences" line, EXPANDABLE.
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

function levelPanel(level, word, layers, context, text, formatNumber) {
  if (level === "wbw") {
    // Deliberately bilingual: WbW shows the English and Bangla gloss together
    // whatever the reader's language, so each fallback stays in its own
    // language rather than following the interface setting.
    return `<div role="tabpanel" data-word-card-panel="wbw">
      <p class="word-card-meaning word-card-meaning-en" lang="en">${escapeHtml(word.translation?.en || text.meaningUnavailableEn)}</p>
      <p class="word-card-meaning word-card-meaning-bn" lang="bn">${escapeHtml(word.translation?.bn || text.meaningUnavailableBn)}</p>
      ${word.transliteration ? `<p class="word-card-transliteration">${escapeHtml(word.transliteration)}</p>` : ""}
      ${progressBlock(context.progress, context.authority, context.coverage, text, formatNumber)}
    </div>`;
  }
  if (level === "basic") {
    const count = (template, n) => escapeHtml(String(template).replace("{count}", formatNumber(n)));
    // v08.22 -- the raw `pos` chain, named in the reader's own language a
    // segment at a time, with the source's own English kept beside it.
    const chain = word.morphology?.pos ? posChain(word.morphology.pos, text) : { name: "", en: "" };
    const posCellHtml = chain.name
      ? `${escapeHtml(chain.name)}${chain.en ? `<span class="word-card-pos-en" lang="en">${escapeHtml(chain.en)}</span>` : ""}`
      : escapeHtml(text.unknown);
    return `<div role="tabpanel" data-word-card-panel="basic">
      <dl><dt>${escapeHtml(text.lemma)}</dt><dd>${escapeHtml(layers.lemma || text.unknown)}</dd><dt>${escapeHtml(text.root)}</dt><dd>${escapeHtml(layers.root || text.unknown)}</dd><dt>${escapeHtml(text.partOfSpeech)}</dt><dd>${posCellHtml}</dd></dl>
      <p>${layers.root ? count(text.rootOccurrences, Number(context.rootOccurrenceCount ?? word.morphology?.rootCount ?? 0)) : escapeHtml(text.rootUnavailable)}</p>
      ${layers.lemma ? lemmaOccurrenceBlock(word, layers, context, text, formatNumber) : `<p>${escapeHtml(text.lemmaUnavailable)}</p>`}
      ${layers.lemma ? wordShareOfQuranLine(context, text, formatNumber) : ""}
      ${formsSection(layers, context, text, formatNumber, { expandable: false })}
      ${context.occurrencesLoading ? `<p>${escapeHtml(text.loadingOccurrences)}</p>` : ""}
      ${context.occurrencesError ? `<p role="status">${escapeHtml(String(text.occurrencesUnavailable).replace("{error}", context.occurrencesError))}</p>` : ""}
    </div>`;
  }
  const dictionaryUrl = safeDictionaryUrl(context.dictionaryUrl);
  const dictionaryLink = dictionaryUrl
    ? `<a href="${escapeHtml(dictionaryUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text.openDictionary)}</a>`
    : `<span>${escapeHtml(text.dictionaryUnavailable)}</span>`;
  // v08.21 -- the occurrence section comes FIRST, then the dictionary and the
  // rest of Depth's existing detail, which is the owner's own ordering.
  return `<div role="tabpanel" data-word-card-panel="depth">
    ${formsSection(layers, context, text, formatNumber, { expandable: true })}
    <div class="word-card-depth-rest">
      <p>${escapeHtml(context.semanticRange || text.semanticRangeMissing)}</p>${dictionaryLink}
    </div>
  </div>`;
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

export function renderQuranWordCard({ state, chapter, ayah, word, context = {}, labels = {}, formatNumber = String } = {}) {
  if (!state?.open || !word) return "";
  const occurrenceId = quranWordOccurrenceId(chapter.surahNumber, ayah.ayah, word.position);
  if (occurrenceId !== state.occurrenceId) throw new Error("Word Card data does not match its persistent occurrence identity.");
  const layers = wordIdentityLayers({ surah: chapter.surahNumber, ayah: ayah.ayah, position: word.position, arabic: word.arabic, morphology: word.morphology });
  // I11: every user-visible string here is overridable, so the page can hand
  // the card its reader's own language. The English values are the fallback
  // for a caller that supplies nothing, never the only thing a reader can get.
  const text = { ...WORD_CARD_DEFAULT_LABELS, ...labels };
  return `<section class="quran-word-card" role="region" aria-label="${escapeHtml(text.cardRegion)}" data-occurrence-id="${escapeHtml(occurrenceId)}">
    <header><button type="button" data-word-card-move="previous" aria-label="${escapeHtml(text.previous)}"${context.hasPrevious ? "" : " disabled"}>‹</button>
      <div><div class="word-card-arabic" dir="rtl" lang="ar">${escapeHtml(layers.surfaceToken)}</div><div class="word-card-reference">${chapter.surahNumber}:${ayah.ayah}:${word.position}</div></div>
      <button type="button" data-word-card-move="next" aria-label="${escapeHtml(text.next)}"${context.hasNext ? "" : " disabled"}>›</button>
      <button type="button" data-word-card-close aria-label="${escapeHtml(text.close)}">×</button></header>
    ${originBar(context.origin, text)}
    <div role="tablist" aria-label="${escapeHtml(text.tablist)}">${tabButton("wbw", state.level === "wbw", text.wbw)}${tabButton("basic", state.level === "basic", text.basic)}${tabButton("depth", state.level === "depth", text.depth)}</div>
    ${levelPanel(state.level, word, layers, context, text, formatNumber)}
  </section>`;
}
