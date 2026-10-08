// Hadith H2 -- the browsing component, shared by BOTH entry points.
//
// One component, two routes: `hadith-collections.html` mounts it standalone,
// and `?mount=quranrevival` mounts the same component inside the QuranRevival
// shell. Nothing about the component knows which it is in, which is the point
// -- a second copy for the mounted case is how the two silently diverge.
//
// THIS COMPONENT PERSISTS NOTHING. Track state lives in a plain Map for the
// life of the page. Every Hadith collection is unruled in `firestore.rules`,
// so a write would be denied by default -- and a screen that offered a Save
// which silently failed would be worse than one that says it cannot.
// `renderTrack()` therefore says so on screen, in the reader's own language,
// every time.

import { t, num } from "./i18n.js";
import { getAppLang, quranFontStack } from "./prefs.js";
import { duaWords, duaNarration, duaWordTokens, duaWordsFingerprint, duaGrammarPosLabel } from "./dua-words.js";
import { loadHadithTranslation, TRANSLATED_BOOKS } from "./hadith-translations.js";
import { STATUSES, statusLabel } from "./unit-keys.js";
import { renderAssignDropdown } from "./assign-picker.js";
import {
  listCollections, booksOf, chaptersOf, occurrencesIn, editionHasChapterLevel,
  occurrenceById, chapterById, collectionOf, sourcePathOf, externalReferencesFor, resolveText,
  availableLanguages, searchCorpus, listTopics, topicIndex, exploreAggregate,
  translationCoverage, topicCoverage,
  CONTENT_LANGUAGES, SOURCE_LANGUAGE,
} from "./hadith-corpus.js";
import { SYNTHETIC_NOTICE, TAXONOMY_REVISION } from "./hadith-fixture-data.js";
import { PANEL_TITLE, verifiedRegisterEntries, commentaryForOccurrence, renderPermission, NEVER_DO } from "./hadith-commentary.js";
import {
  HADEETHENC_LANGS, HADEETHENC_STRUCTURE_LANG,
  loadHadeethEncCategories, childCategories, directHadithIds, resolveCategoryTitle,
  loadHadithRecords, hadithArabicText, hadeethEncSourceUrl,
} from "./hadeethenc-corpus.js";
import {
  OPENITI_CREDIT_URL,
  loadOpenitiBookSummaries, loadOpenitiBookIndex, loadOpenitiChapter, chapterForHadithNumber,
  loadOpenitiConcordance, loadOpenitiHadeethEncLinks, loadDuaIndex, loadDuaCardsSummary, loadDuaCardsPage, loadDuaWordLinks, loadDuaVowels, loadDuaWordGrammar,
} from "./openiti-corpus.js";

const CONTENT_LANG_LABELS = { ar: "العربية", en: "English", bn: "বাংলা" };

/** Demo-only Track state. Never written anywhere. Cleared by a reload, deliberately. */
const demoTrack = new Map();

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

function langText(map, lang) {
  if (!map) return "";
  return map[lang] ?? map.en ?? map.ar ?? "";
}

export function mountHadithBrowser(root, { mount = "standalone", initialHadeethEncId = null, initialOpenitiPassage = null, initialDua = null } = {}) {
  const state = {
    view: "collections",
    contentLang: getAppLang() === "bn" ? "bn" : "en",
    editionId: null, bookId: null, chapterId: null, query: "", topicId: null,
    // Set by jumpToSource() (Topic/Search "View in source", and a repeat
    // badge's "view the original") and consumed exactly once by render():
    // it names the occurrence the Collections view should scroll to and
    // highlight on the render this navigation causes, then it is cleared.
    focusOccurrenceId: null,
    mount,
  };
  // Issue #311 -- a bookmark's own resume value ("hadith:hadeethenc:<id>")
  // reopens directly on that hadith, bypassing the category browse path.
  // renderHadeethEncSource() only ever seeds state.hc when it is still
  // unset, so this survives that lazy init untouched.
  if (initialHadeethEncId) {
    state.hc = { path: [], hadithId: String(initialHadeethEncId), catsByLang: {} };
  }
  // Decision 85 (7 Oct 2026): an Asmaul Husna poster's Hadith reference opens that narration here --
  // { versionUri, n } = the OpenITI book and the passage's permanent position (asma-poster.js's POSTER_HADITH).
  if (initialOpenitiPassage?.versionUri && Number.isFinite(Number(initialOpenitiPassage.n))) {
    state.oi = { bookUri: initialOpenitiPassage.versionUri, chapterId: null, books: null, showAllChapters: false, focusPassage: Number(initialOpenitiPassage.n) };
  }

  // Decision 90, round 1: coming back from a dua word's Word card (?view=dua&duaPage=<p>&dua=<n>) reopens that page of
  // Duas on that card (the way-back law, decision 86).
  if (initialDua && Number.isInteger(initialDua.page) && initialDua.page > 0) {
    state.view = "dua";
    state.dua = { bookUri: null, mode: "duas", page: initialDua.page, focusDua: Number.isInteger(initialDua.dua) ? initialDua.dua : null };
  }

  function render() {
    root.textContent = "";
    // The Collections landing now leads with REAL HadeethEnc text (#309), so
    // the "not real narrations" notice there sits directly above the
    // synthetic pilot list it describes (renderCollections), not above the
    // real source. Every other view still shows only synthetic data, so it
    // keeps the notice at the top.
    if (!(state.view === "collections" && !state.editionId)) root.appendChild(syntheticBanner());
    root.appendChild(controls(state, render));
    const body = el("div", "hadith-body");
    body.id = "hadithBody";
    root.appendChild(body);
    ({
      collections: () => renderCollections(body, state, render),
      topic: () => renderTopic(body, state, render),
      search: () => renderSearch(body, state, render),
      explore: () => renderExplore(body),
      commentary: () => renderCommentary(body, state),
      dua: () => renderDua(body, state, render),
    })[state.view]();
    focusPendingOccurrence(body, state);
  }

  render();
  return { render, state };
}

/**
 * "View in source" / "view the original" -- the Books <-> Topics bridge.
 *
 * Sets the Collections view's own edition/book/chapter to the occurrence's
 * REAL source location (via `sourcePathOf()`, the same fact `renderCollections`
 * already navigates by) and switches to it. This does not change the Topics
 * index and does not give the Books view any notion of "topic" -- it only
 * lets a reader who found a narration through an index (or through a repeat
 * badge) go SEE it in the book it actually belongs to, preserving the
 * documented split ("[the topic view] is an index across collections. It
 * does not change any book.").
 */
function jumpToSource(state, render, occurrenceId) {
  const path = sourcePathOf(occurrenceId);
  if (!path) return; // Data defect, not a navigation failure to throw over.
  state.view = "collections";
  state.editionId = path.edition.editionId;
  state.bookId = path.book.bookChapterId;
  state.chapterId = path.chapter ? path.chapter.bookChapterId : null;
  state.focusOccurrenceId = occurrenceId;
  render();
}

/** Scrolls to and highlights the occurrence `jumpToSource()` navigated to, once. */
function focusPendingOccurrence(body, state) {
  if (state.view !== "collections" || !state.focusOccurrenceId) return;
  const target = [...body.querySelectorAll("[data-hadith-occurrence]")]
    .find((n) => n.dataset.hadithOccurrence === state.focusOccurrenceId);
  if (target) {
    target.classList.add("hadith-card-focused");
    target.dataset.hadithFocused = "true";
    target.scrollIntoView({ block: "center" });
  }
  state.focusOccurrenceId = null;
}

/**
 * Moves KEYBOARD focus to the new landing spot after a Collections-tab step
 * (edition, book or chapter picked; or a breadcrumb step back). Every such
 * step calls `render()`, which does `root.textContent = ""` and rebuilds the
 * whole subtree -- so the button a keyboard user just pressed no longer
 * exists, and without this the browser drops focus to `<body>`, silently
 * sending a Tab-only reader back to the very top of the page on every single
 * step through collection -> book -> chapter. `focusPendingOccurrence()`
 * (above) solves a different problem -- the one-shot highlight after a
 * Topics/Search "View in source" jump -- and never calls `.focus()` at all,
 * so it does not cover ordinary in-tab navigation.
 *
 * Lands on the breadcrumb's own current-location crumb where one exists
 * (every state with an edition chosen), or the "Collections" heading at the
 * top level -- the one landing element every Collections render already has,
 * so a keyboard user is told where they arrived rather than losing their
 * place, and the very next Tab continues from there instead of from the
 * page's top.
 */
function focusCollectionsLanding() {
  const body = document.getElementById("hadithBody");
  if (!body) return;
  // The breadcrumb's own last crumb names exactly where this render landed --
  // the (non-clickable) current location where one exists (book or chapter
  // chosen), or otherwise the still-clickable "Collections" crumb itself (an
  // edition was just chosen, so there is no deeper "current" yet). Only the
  // very top level -- no edition chosen at all -- has no breadcrumb; there
  // the "Collections" heading is the one landing element every render has.
  // Architect review (#316): the HadeethEnc and OpenITI sources render their
  // own breadcrumb bars on the same page, so "the last crumb" must be the
  // synthetic collection's own bar -- otherwise returning to the top level
  // landed focus inside the OpenITI section.
  const SYNTHETIC_CRUMBS = ".hadith-crumbs:not([data-hadeethenc-crumbs]):not([data-openiti-crumbs])";
  const landing = body.querySelector(`${SYNTHETIC_CRUMBS} > :last-child`) || body.querySelector("h2");
  if (!landing) return;
  if (!landing.hasAttribute("tabindex")) landing.setAttribute("tabindex", "-1");
  landing.focus({ preventScroll: true });
}

/**
 * Moves KEYBOARD focus to the newly-active tab button after switching
 * Collections/Topics/Search/Explore/Commentary (issue #114, found by
 * reproduction: `render()` tears down and rebuilds the whole subtree on
 * every tab click, same as every in-tab Collections step -- but unlike
 * those steps, nothing restored focus afterward, so a keyboard user lost
 * their place to `<body>` on every single tab switch, not just Search's).
 * `focusCollectionsLanding()` covers steps WITHIN the Collections tab and
 * `focusPendingOccurrence()` covers the one-shot Topics/Search "View in
 * source" jump; neither runs on a plain tab switch. The tab button itself
 * is already a real, always-focusable control, so this needs no tabindex
 * hack -- the standard ARIA-tabs pattern of leaving focus on the tab list.
 */
function focusActiveTab() {
  const btn = document.querySelector(".hadith-tab.active");
  if (btn) btn.focus({ preventScroll: true });
}

// ---------------------------------------------------------------------------
// The notice that is never conditional
// ---------------------------------------------------------------------------

function syntheticBanner() {
  const box = el("div", "hadith-synthetic-banner");
  box.id = "hadithSyntheticBanner";
  box.setAttribute("role", "note");
  // All three languages, always -- a reader in any one of them must be able to
  // tell this is not real, without changing their language setting first.
  box.appendChild(el("p", "hadith-synth-ar", SYNTHETIC_NOTICE.ar));
  box.appendChild(el("p", "hadith-synth-en", SYNTHETIC_NOTICE.en));
  box.appendChild(el("p", "hadith-synth-bn", SYNTHETIC_NOTICE.bn));
  return box;
}

// ---------------------------------------------------------------------------
// Controls: which view, and which CONTENT language (distinct from UI language)
// ---------------------------------------------------------------------------

function controls(state, render) {
  const bar = el("div", "hadith-controls");

  const tabs = el("div", "hadith-tabs");
  for (const [view, label] of [
    ["collections", t("Collections")],
    ["topic", t("Topics")],
    ["search", t("Search")],
    ["explore", t("Explore")],
    ["commentary", PANEL_TITLE[getAppLang()] ?? PANEL_TITLE.en],
    ["dua", t("Dua")],
  ]) {
    const b = el("button", `hadith-tab${state.view === view ? " active" : ""}`, label);
    b.dataset.hadithTab = view;
    b.addEventListener("click", () => { state.view = view; render(); focusActiveTab(); });
    tabs.appendChild(b);
  }
  bar.appendChild(tabs);

  const langWrap = el("label", "hadith-lang-wrap");
  langWrap.appendChild(el("span", "hadith-lang-label", t("Text language")));
  const sel = el("select", "hadith-lang-select");
  // It already carries this id. Named here because a language-leak check
  // excludes it BY NAME: like every other language picker in the app, it
  // names each language in that language's own script, in every UI language,
  // on purpose -- that is how a reader of one of them finds the setting.
  sel.id = "hadithContentLang";
  for (const l of CONTENT_LANGUAGES) {
    const o = el("option", null, CONTENT_LANG_LABELS[l]);
    o.value = l;
    if (l === state.contentLang) o.selected = true;
    sel.appendChild(o);
  }
  sel.addEventListener("change", () => { state.contentLang = sel.value; render(); });
  langWrap.appendChild(sel);
  bar.appendChild(langWrap);
  return bar;
}

/**
 * A book/chapter row's own native-script heading (e.g. "كتاب البداية"),
 * always the SOURCE edition's own text -- never translated, by design (the
 * translated title sits beside it in its own span). Every OTHER source-script
 * surface in this file stamps `lang`/`dir` (the occurrence card's Arabic
 * paragraph, the commentary panel's Arabic title) so a screen reader uses the
 * right pronunciation rules and a reader's browser applies the right
 * direction; this one, reproduced live in the real rendered Books/chapters
 * list, did not (issue #114 Gate B). `getComputedStyle().direction` still
 * came out "rtl" because the Unicode Bidi Algorithm auto-detects a run of
 * pure Arabic characters -- so it LOOKS right and a sighted mouse-only check
 * would never catch this -- but `lang` has no such fallback: a screen reader
 * with no language cue reads it in the page's UI language (English/Bangla)
 * voice and pronunciation rules, mispronouncing every book and chapter
 * heading in the list. Current-location semantics, breadcrumb ancestry and
 * focus handling are all untouched by this fix.
 */
function rawHeadingSpan(rawHeading) {
  const span = el("span", "hadith-row-heading", rawHeading);
  span.lang = SOURCE_LANGUAGE;
  span.dir = "rtl";
  return span;
}

// ---------------------------------------------------------------------------
// Source view -- collection -> book -> chapter -> occurrence, in source order
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// HadeethEnc -- the REAL corpus (issue #309, part 2 of #306). Browse root
// categories -> sub-categories -> hadith list -> one hadith, over the
// packaged files tools/hadith-data-pull/output/hadeethenc/ (I9: nothing
// loads until this section actually mounts; a shard loads only when its
// category is opened, via hadeethenc-corpus.js's own per-file cache).
//
// STUDY WIRING (Notes/bookmark/"Studied") IS NOW BUILT, FOR HADEETHENC ONLY
// (issue #311). Gate C2 asked whether a HadeethEnc hadith's permanent unit
// key should be name-keyed (`hadith:hadeethenc:<id>`) or a proposed
// permanent edition/ordinal form; the Owner decided it (owner-decisions row
// 7, "Use HadeethEnc number"): `hadith:hadeethenc:<id>`, built with
// `buildUnitKey.hadith("hadeethenc", id)`. That decision covers HadeethEnc
// ONLY -- the legacy name-keyed form app/records.html builds for the
// synthetic pilot editions is untouched, and
// tools/i18n-verify/hadith-gate-contracts.mjs's C2 check now admits exactly
// one new caller (hadith-study-actions.js) and only when its first argument
// is the literal "hadeethenc"; a hadith-owned file naming any OTHER edition
// still fails it. The three actions are built in hadith-study-actions.js,
// loaded lazily (`import()`) so this file stays Firebase-free at its own
// core -- a Firebase/CDN failure disables the study actions, never the
// Collections/Topics/Search/Explore browsing around them.
// ---------------------------------------------------------------------------

const HADEETHENC_LANG_LABELS = { ar: "العربية", en: "English", bn: "বাংলা" };

/** Loads ar (structure) + en + the reader's own content language's categories.json -- cheap (a few hundred KB total), and it is what lets a category's title/count fall back contentLang -> en -> ar without a second round trip mid-browse. */
async function loadHadeethEncStructure(contentLang, opts) {
  const langs = [...new Set([HADEETHENC_STRUCTURE_LANG, "en", contentLang])].filter((l) => HADEETHENC_LANGS.includes(l));
  const entries = await Promise.all(langs.map(async (l) => [l, await loadHadeethEncCategories(l, opts).catch(() => null)]));
  return Object.fromEntries(entries);
}

function hadeethEncCrumbs(state, localRefresh) {
  // A DELIBERATELY DIFFERENT class from the synthetic Collections
  // breadcrumb's own `.hadith-crumb`/`.hadith-crumb-current` (styled
  // identically in hadith.css) -- the two breadcrumbs are mutually exclusive
  // in the DOM today (this one only renders while `!state.editionId`, the
  // other only while it is set), but hadith-source-navigation-browser.mjs
  // clicks the BARE `.hadith-crumb` class by name; sharing it would make
  // that click ambiguous the moment the two ever coexist.
  const bar = el("nav", "hadith-crumbs");
  bar.dataset.hadeethencCrumbs = "true";
  const add = (label, onClick) => {
    if (onClick) {
      const b = el("button", "hadeethenc-crumb", label);
      b.addEventListener("click", onClick);
      bar.appendChild(b);
    } else {
      const cur = el("span", "hadeethenc-crumb-current", label);
      cur.setAttribute("aria-current", "page");
      bar.appendChild(cur);
    }
  };
  add(t("HadeethEnc"), () => { state.hc.path = []; state.hc.hadithId = null; localRefresh(); });
  const path = state.hc.path;
  path.forEach((catId, i) => {
    const title = resolveCategoryTitle(state.hc.catsByLang, catId, state.contentLang)?.title ?? catId;
    const isLast = i === path.length - 1 && !state.hc.hadithId;
    add(title, isLast ? null : () => { state.hc.path = path.slice(0, i + 1); state.hc.hadithId = null; localRefresh(); });
  });
  return bar;
}

function hadeethEncCategoryRow(catId, catsByLang, contentLang, onOpen) {
  const resolved = resolveCategoryTitle(catsByLang, catId, contentLang);
  const row = el("button", "hadith-row");
  row.dataset.hadeethencCategory = catId;
  row.appendChild(el("span", "hadith-row-name", resolved?.title ?? catId));
  const meta = resolved?.count != null ? num(resolved.count) : "";
  row.appendChild(el("span", "hadith-row-meta", meta));
  if (resolved?.isFallback) {
    const fb = el("span", "hadith-fallback");
    fb.dataset.hadeethencCategoryFallback = resolved.lang;
    fb.textContent = t("Not available in your language here — showing {lang}.", { lang: HADEETHENC_LANG_LABELS[resolved.lang] ?? resolved.lang });
    row.appendChild(fb);
  }
  row.addEventListener("click", onOpen);
  return row;
}

function hadeethEncHadithRow(id, resolvedRecord, onOpen) {
  const { record, lang, isFallback, requestedLang } = resolvedRecord;
  const row = el("button", "hadith-row");
  row.dataset.hadeethencHadith = id;
  row.appendChild(el("span", "hadith-row-name", record.title ?? id));
  if (isFallback) {
    const fb = el("span", "hadith-fallback");
    fb.dataset.hadeethencHadithFallback = lang;
    fb.textContent = t("Not available in {reqLang} — showing {lang}.", {
      reqLang: HADEETHENC_LANG_LABELS[requestedLang] ?? requestedLang, lang: HADEETHENC_LANG_LABELS[lang] ?? lang,
    });
    row.appendChild(fb);
  }
  row.addEventListener("click", onOpen);
  return row;
}

/** Renders every closed-set/array/string shape `words_meanings` might carry, without ever fabricating or reordering it. */
function hadeethEncWordsMeanings(wordsMeanings) {
  const box = el("div", "hadeethenc-words-meanings");
  if (!wordsMeanings) return box;
  if (Array.isArray(wordsMeanings)) {
    for (const item of wordsMeanings) box.appendChild(el("p", null, typeof item === "string" ? item : JSON.stringify(item)));
  } else if (typeof wordsMeanings === "object") {
    for (const [word, meaning] of Object.entries(wordsMeanings)) box.appendChild(el("p", null, `${word} — ${meaning}`));
  } else {
    box.appendChild(el("p", null, String(wordsMeanings)));
  }
  return box;
}

function hadeethEncCard(id, resolvedRecord, state, localRefresh) {
  const { record, lang, isFallback, requestedLang } = resolvedRecord;
  const card = el("article", "hadith-card");
  card.dataset.hadeethencCard = id;

  const back = el("button", "hadeethenc-crumb", t("← Back to the list"));
  back.dataset.hadeethencBack = "true";
  back.addEventListener("click", () => { state.hc.hadithId = null; localRefresh(); });
  card.appendChild(back);

  if (record.title) card.appendChild(el("h3", "hadith-row-name", record.title));

  const ar = el("p", "hadith-arabic", hadithArabicText(record, lang) ?? "");
  ar.lang = "ar"; ar.dir = "rtl";
  card.appendChild(ar);

  if (lang !== "ar") {
    // A genuine fallback (contentLang -> en), not just "this is the source
    // language" -- shown alongside the translation it actually landed on.
    const block = el("div", "hadith-translation");
    if (isFallback) {
      const warn = el("p", "hadith-fallback");
      warn.dataset.hadeethencFallback = requestedLang;
      warn.textContent = t("No {lang} translation for this hadith. Showing {shown}.",
        { lang: HADEETHENC_LANG_LABELS[requestedLang] ?? requestedLang, shown: HADEETHENC_LANG_LABELS[lang] ?? lang });
      block.appendChild(warn);
    }
    block.appendChild(el("p", "hadith-translation-text", record.hadeeth ?? ""));
    card.appendChild(block);
  } else if (isFallback) {
    // Fell all the way back to Arabic -- requestedLang has no translation at
    // all (not even English's), so there is no translation block to show
    // beside the notice, unlike the case above.
    const warn = el("p", "hadith-fallback");
    warn.dataset.hadeethencFallback = requestedLang;
    warn.textContent = t("No {lang} translation for this hadith. Showing the Arabic source only.",
      { lang: HADEETHENC_LANG_LABELS[requestedLang] ?? requestedLang });
    card.appendChild(warn);
  }

  if (record.grade) card.appendChild(el("p", "hadith-attribution", t("Grade: {grade}", { grade: record.grade })));
  if (record.attribution) card.appendChild(el("p", "hadith-attribution", record.attribution));

  const hasMore = record.explanation || (record.hints && record.hints.length) || record.words_meanings;
  if (hasMore) {
    const details = document.createElement("details");
    details.className = "hadeethenc-explanation";
    const summary = document.createElement("summary");
    summary.textContent = t("Show explanation");
    summary.dataset.hadeethencExplanationToggle = "true";
    details.appendChild(summary);
    if (record.explanation) details.appendChild(el("p", null, record.explanation));
    if (record.hints && record.hints.length) {
      const ul = document.createElement("ul");
      ul.dataset.hadeethencHints = String(record.hints.length);
      for (const hint of record.hints) ul.appendChild(el("li", null, hint));
      details.appendChild(ul);
    }
    if (record.words_meanings) details.appendChild(hadeethEncWordsMeanings(record.words_meanings));
    card.appendChild(details);
  }

  const src = document.createElement("a");
  src.className = "hadith-view-source";
  src.dataset.hadeethencSourceLink = id;
  src.href = hadeethEncSourceUrl(lang, id);
  src.target = "_blank";
  src.rel = "noopener noreferrer";
  src.textContent = t("Source: HadeethEnc.com");
  card.appendChild(src);

  // Notes/bookmark/"Studied" -- see the section header comment above.
  const studyBox = el("div", "hadeethenc-study-actions");
  studyBox.dataset.hadeethencStudyActions = String(id);
  card.appendChild(studyBox);
  renderHadeethEncStudyActions(studyBox, id, record.title ?? "");

  return card;
}

// ---------------------------------------------------------------------------
// HadeethEnc study actions (issue #311) -- Notes/bookmark/"Studied", built on
// hadith-study-actions.js, loaded lazily so a Firebase/CDN failure disables
// only these three actions rather than the whole corpus (see the section
// header comment above). A control that explains itself beats one that is
// silently absent: every disabled state below says why, in words, rather
// than hiding the control (this project's own standing rule).
// ---------------------------------------------------------------------------

let hadithStudyActionsPromise = null;
function loadHadithStudyActions() {
  if (!hadithStudyActionsPromise) hadithStudyActionsPromise = import("./hadith-study-actions.js");
  return hadithStudyActionsPromise;
}

async function renderHadeethEncStudyActions(container, id, title) {
  container.textContent = "";
  container.appendChild(el("p", "hadith-note", t("Loading…")));

  let actions;
  try {
    actions = await loadHadithStudyActions();
  } catch {
    container.textContent = "";
    container.appendChild(el("p", "hadeethenc-study-reason", t("Notes, bookmarking and Studied could not be loaded right now.")));
    return;
  }

  let session = null;
  try {
    session = await actions.getHadeethEncSession();
  } catch {
    session = null;
  }

  container.textContent = "";
  if (!session) {
    container.appendChild(el("p", "hadeethenc-study-reason", t("Sign in and choose who you're studying as to use Notes, bookmarking and Studied.")));
    return;
  }

  const row = el("div", "hadeethenc-study-row");
  container.appendChild(row);

  // --- Note: a link into notes.html, which already does the real work. ----
  const noteItem = el("div", "hadeethenc-study-item");
  const noteLink = document.createElement("a");
  noteLink.className = "hadeethenc-study-btn";
  noteLink.href = actions.noteHrefFor(id, title);
  noteLink.dataset.hadeethencNoteLink = String(id);
  noteLink.textContent = `📝 ${t("My Notes")}`;
  noteLink.setAttribute("aria-disabled", session.isSelf ? "false" : "true");
  if (!session.isSelf) {
    noteLink.addEventListener("click", (e) => e.preventDefault());
  }
  noteItem.appendChild(noteLink);
  if (!session.isSelf) {
    noteItem.appendChild(el("p", "hadeethenc-study-reason", t("Only your own record can create or file a Note.")));
  } else {
    try {
      const count = await actions.noteCountFor(session, id);
      if (count > 0) noteItem.appendChild(el("p", "hadith-note", t("{count} Note(s) on this hadith", { count })));
    } catch {
      // A read-side hiccup here is not worth surfacing (I15's rethrow is for
      // WRITES) -- the link itself still opens notes.html either way.
    }
  }
  row.appendChild(noteItem);

  // --- Bookmark and Studied, both gated on the broader canRecordFor(). -----
  const bookmarkItem = el("div", "hadeethenc-study-item");
  const bookmarkBtn = el("button", "hadeethenc-study-btn");
  bookmarkBtn.type = "button";
  bookmarkBtn.dataset.hadeethencBookmark = String(id);
  bookmarkItem.appendChild(bookmarkBtn);
  row.appendChild(bookmarkItem);

  const studiedItem = el("div", "hadeethenc-study-item");
  studiedItem.appendChild(el("span", "hadeethenc-study-label", t("Studied")));
  const studiedSelect = el("select", "hadeethenc-study-select");
  studiedSelect.dataset.hadeethencStudied = String(id);
  studiedSelect.setAttribute("aria-label", t("Studied"));
  const placeholder = el("option", null, t("Not tracked"));
  placeholder.value = "";
  studiedSelect.appendChild(placeholder);
  for (const s of STATUSES) {
    const o = el("option", null, statusLabel(s.id));
    o.value = s.id;
    studiedSelect.appendChild(o);
  }
  studiedItem.appendChild(studiedSelect);
  row.appendChild(studiedItem);

  if (!session.canRecordFor) {
    bookmarkBtn.textContent = `🔖 ${t("Bookmark this")}`;
    bookmarkBtn.setAttribute("aria-disabled", "true");
    studiedSelect.disabled = true;
    row.appendChild(el("p", "hadeethenc-study-reason", t("You can view this, but only the person's own record can bookmark or mark it as studied.")));
    return;
  }

  let bookmarked = false;
  let studiedStatusId = null;
  try {
    [bookmarked, studiedStatusId] = await Promise.all([
      actions.isHadeethEncBookmarked(session, id),
      actions.hadeethEncStudiedStatus(session, id),
    ]);
  } catch (err) {
    row.appendChild(el("p", "hadeethenc-study-reason", String(err?.message ?? err)));
  }

  function refreshBookmarkBtn() {
    bookmarkBtn.textContent = bookmarked ? `★ ${t("Remove bookmark")}` : `🔖 ${t("Bookmark this")}`;
    bookmarkBtn.setAttribute("aria-disabled", "false");
  }
  refreshBookmarkBtn();
  bookmarkBtn.addEventListener("click", async () => {
    if (bookmarkBtn.getAttribute("aria-disabled") === "true") return;
    bookmarkBtn.setAttribute("aria-disabled", "true");
    try {
      bookmarked = await actions.toggleHadeethEncBookmark(session, id, title || String(id));
    } catch (err) {
      row.appendChild(el("p", "hadeethenc-study-reason", String(err?.message ?? err)));
    }
    refreshBookmarkBtn();
  });

  // 👥 Record for family members too (decision 71): the same picker as the
  // Qur'an page's Record cards. Read on first use only (I9); nothing for a lone person.
  let pickerRoster = [];
  try { pickerRoster = await actions.getHadeethEncRoster(session); } catch { pickerRoster = []; }
  const pickerHtml = renderAssignDropdown(pickerRoster, session.personId);
  let pickerList = null;
  if (pickerHtml) {
    const pickerRow = el("div", "claim-for-row");
    pickerRow.dataset.claimFor = "";
    pickerRow.innerHTML = pickerHtml;
    studiedItem.appendChild(pickerRow);
    pickerList = pickerRow.querySelector("[data-assign-list]");
    const label = pickerRow.querySelector("[data-assign-trigger-label]");
    const trigger = pickerRow.querySelector("[data-assign-trigger]");
    const popover = pickerRow.querySelector("[data-assign-popover]");
    const paint = () => {
      const checked = [...pickerList.querySelectorAll("input:checked")];
      label.textContent = checked.length === 1 ? (checked[0].dataset.name ?? "1") : num(checked.length);
      trigger.setAttribute("aria-label", t("Record for: {names}", { names: checked.map((c) => c.dataset.name).join(", ") || "—" }));
    };
    trigger.addEventListener("click", () => {
      const open = !popover.classList.contains("open");
      popover.classList.toggle("open", open);
      trigger.setAttribute("aria-expanded", String(open));
    });
    pickerList.addEventListener("change", () => {
      if (!pickerList.querySelector("input:checked")) pickerList.querySelector(`input[value="${CSS.escape(session.personId)}"]`)?.click(); // never nobody: back to the page's person
      paint();
    });
    paint();
  }
  const ticked = () => (pickerList ? [...pickerList.querySelectorAll("input:checked")].map((c) => c.value) : [session.personId]);

  studiedSelect.value = studiedStatusId ?? "";
  studiedSelect.addEventListener("change", async () => {
    if (!studiedSelect.value) return;
    studiedSelect.disabled = true;
    try {
      const ids = ticked();
      // Others first, the page's person last (the Qur'an cards' order).
      const ordered = [...ids.filter((x) => x !== session.personId), ...ids.filter((x) => x === session.personId)];
      await actions.claimHadeethEncStudied(session, id, studiedSelect.value, ordered);
      if (!ids.includes(session.personId)) {
        const names = pickerRoster.filter((p) => ids.includes(p.id)).map((p) => p.name).join(", ");
        studiedItem.querySelector("[data-hadeethenc-recorded]")?.remove();
        const note = el("p", "hadeethenc-study-reason", t("Recorded for {names}.", { names }));
        note.dataset.hadeethencRecorded = "";
        note.setAttribute("role", "status");
        studiedItem.appendChild(note);
        studiedSelect.value = studiedStatusId ?? ""; // the shown status stays the page person's own
      } else {
        studiedStatusId = studiedSelect.value;
        studiedItem.querySelector("[data-hadeethenc-recorded]")?.remove();
      }
    } catch (err) {
      row.appendChild(el("p", "hadeethenc-study-reason", String(err?.message ?? err)));
    }
    studiedSelect.disabled = false;
  });
}

async function renderHadeethEncBody(body, state, localRefresh, opts) {
  const contentLang = state.contentLang;
  const catsByLang = await loadHadeethEncStructure(contentLang, opts);
  state.hc.catsByLang = catsByLang;
  const arCats = catsByLang[HADEETHENC_STRUCTURE_LANG];
  if (!arCats) throw new Error("HadeethEnc structure (Arabic) could not be loaded.");

  body.textContent = "";
  body.appendChild(hadeethEncCrumbs(state, localRefresh));

  if (state.hc.hadithId) {
    const map = await loadHadithRecords([state.hc.hadithId], contentLang, opts);
    const resolved = map.get(String(state.hc.hadithId));
    body.appendChild(hadeethEncCard(state.hc.hadithId, resolved, state, localRefresh));
    return;
  }

  const currentId = state.hc.path.at(-1) ?? null;
  const children = currentId == null ? arCats.roots : childCategories(arCats, currentId);
  const list = el("div", "hadith-list");
  for (const child of children) {
    list.appendChild(hadeethEncCategoryRow(String(child.id), catsByLang, contentLang, () => {
      state.hc.path = [...state.hc.path, String(child.id)];
      localRefresh();
    }));
  }
  body.appendChild(list);

  if (currentId != null) {
    const direct = directHadithIds(arCats, currentId);
    if (direct.length) {
      const recordMap = await loadHadithRecords(direct, contentLang, opts);
      const hadithList = el("div", "hadith-occurrences");
      hadithList.dataset.hadeethencHadithList = String(direct.length);
      for (const id of direct) {
        const resolved = recordMap.get(String(id));
        if (!resolved) continue;
        hadithList.appendChild(hadeethEncHadithRow(id, resolved, () => { state.hc.hadithId = String(id); localRefresh(); }));
      }
      body.appendChild(hadithList);
    } else if (!children.length) {
      body.appendChild(el("p", "hadith-note", t("Nothing here yet.")));
    }
  }
}

function renderHadeethEncSource(state) {
  const section = el("section", "hadeethenc-section");
  section.id = "hadeethencSection";
  section.appendChild(el("h2", null, t("HadeethEnc — Encyclopedia of Translated Hadiths")));
  const body = el("div", "hadeethenc-body");
  section.appendChild(body);

  if (!state.hc) state.hc = { path: [], hadithId: null, catsByLang: {} };

  function localRefresh() {
    body.textContent = "";
    body.appendChild(el("p", "hadith-note", t("Loading…")));
    renderHadeethEncBody(body, state, localRefresh).catch((err) => {
      body.textContent = "";
      const p = el("p", "hadith-note", String(err?.message ?? err));
      p.dataset.hadeethencError = "true";
      body.appendChild(p);
    });
  }
  localRefresh();
  return section;
}

// ---------------------------------------------------------------------------
// OpenITI -- 11 real, untranslated Arabic hadith collections (issue #316,
// part 2 of #314). Book -> chapter -> passage, over the packaged files
// tools/hadith-data-pull/output/openiti-release/ (I9: nothing loads until
// this section mounts; see openiti-corpus.js's own header comment for
// exactly what loads at each step). This corpus carries no translation of
// its own -- every book/chapter/passage is Arabic-only, so unlike HadeethEnc
// there is no content-language fallback here; state.contentLang is not
// consulted.
//
// NOT BUILT THIS ROUND, DELIBERATELY (issue #316 point 6): Notes, bookmark
// and "Studied". Owner decision 7 (see hadith-browser.js's own HadeethEnc
// section comment above) covers `hadith:hadeethenc:<id>` only -- a permanent
// key for an OpenITI passage is proposed in this round's own PR description
// (`hadith:openiti:<versionUri>:<n>`, mirroring buildUnitKey.hadith's
// `hadith:${collectionName}:${number}` shape with the versionUri:n pair
// standing in for `number`), not decided or built here.
// ---------------------------------------------------------------------------

const OPENITI_CHAPTER_PAGE = 100;

function renderOpenitiSource(state) {
  const section = el("section", "openiti-section");
  section.id = "openitiSection";
  section.appendChild(el("h2", null, t("OpenITI — Arabic Hadith collections")));
  section.appendChild(el("p", "openiti-study-soon",
    t("Notes, bookmarking and marking a hadith or passage as studied are not enabled here yet — the Owner has only decided this for HadeethEnc so far.")));
  const body = el("div", "openiti-body");
  section.appendChild(body);

  if (!state.oi) state.oi = { bookUri: null, chapterId: null, books: null, showAllChapters: false };

  function localRefresh() {
    body.textContent = "";
    body.appendChild(el("p", "hadith-note", t("Loading…")));
    renderOpenitiBody(body, state.oi, localRefresh).catch((err) => {
      body.textContent = "";
      const p = el("p", "hadith-note", String(err?.message ?? err));
      p.dataset.openitiError = "true";
      body.appendChild(p);
    });
  }
  localRefresh();
  return section;
}

async function renderOpenitiBody(body, oi, localRefresh) {
  // The list draws from the small summary; a book's own index loads only when that book is opened.
  if (!oi.books) oi.books = await loadOpenitiBookSummaries();
  const found = oi.bookUri ? oi.books.find(([uri]) => uri === oi.bookUri) : null;
  const index = found ? await loadOpenitiBookIndex(oi.bookUri) : null;
  // Round H-DB2: the book's standard numbers, if it has them (null otherwise; a failed load only hides them).
  const conc = found ? await loadOpenitiConcordance(oi.bookUri).catch(() => null) : null;
  // Round H-DB3: which HadeethEnc hadith translate a passage of this book (ids only; null if none).
  const heLinks = found ? await loadOpenitiHadeethEncLinks(oi.bookUri).catch(() => null) : null;
  // Round H-DB4: for a book with Dua chapters, the other places the same dua is narrated.
  const duaIdx = found ? await loadDuaIndex().catch(() => null) : null;
  const dua = duaIdx?.books.some((b) => b.versionUri === oi.bookUri) ? duaIdx : null;

  body.textContent = "";
  // A link to one passage (decision 85) or a jump by standard number (H-DB2): find the chapter that holds it
  // BEFORE the breadcrumbs are drawn, so they carry the way back to the book's chapter list (decision 86).
  let missingPassage = false;
  if (index && oi.focusPassage != null && !oi.chapterId) {
    const holder = index.chapters.find((c) => (c.hadithPositions ?? []).includes(oi.focusPassage));
    if (holder) oi.chapterId = holder.id;
    else { missingPassage = true; oi.focusPassage = null; }
  }
  body.appendChild(openitiCrumbs(oi, index, localRefresh));

  // The way back (decision 86): to the Dua tab it came from, and back along "Also narrated in" jumps.
  if (oi.trail?.length) {
    const prev = oi.trail[oi.trail.length - 1];
    const b = el("button", "hadeethenc-crumb openiti-trail-back", prev.label);
    b.type = "button";
    b.dataset.openitiTrailBack = "true";
    b.addEventListener("click", () => {
      oi.trail.pop();
      if (prev.toDua) { oi.trail = []; prev.toDua(); return; }
      oi.bookUri = prev.bookUri; oi.chapterId = prev.chapterId; oi.focusPassage = prev.focusPassage ?? null;
      localRefresh();
    });
    body.appendChild(b);
  }

  if (!oi.bookUri) {
    renderOpenitiBookList(body, oi, localRefresh);
    return;
  }

  if (!found) { body.appendChild(el("p", "hadith-note", t("Nothing here yet."))); return; }
  const versionUri = oi.bookUri;
  if (missingPassage) body.appendChild(el("p", "hadith-note", t("That passage is not in this book.")));

  if (!oi.chapterId) {
    renderOpenitiChapterList(body, oi, index, localRefresh, conc);
    return;
  }

  const chapter = index.chapters.find((c) => c.id === oi.chapterId);
  if (!chapter) { body.appendChild(el("p", "hadith-note", t("Nothing here yet."))); return; }
  body.appendChild(el("p", "hadith-note", t("Loading…")));
  const { hadiths } = await loadOpenitiChapter(versionUri, chapter);
  body.lastChild.remove();
  renderOpenitiPassages(body, hadiths, conc, heLinks, dua ? { dua, oi, localRefresh, chapterId: chapter.id, versionUri } : null);
  // Opened from the Dua tab: the library's book shelf sits below HadeethEnc on this page, so bring it into view.
  if (oi.scrollTo && oi.focusPassage == null) { oi.scrollTo = false; body.scrollIntoView({ block: "start" }); }
  if (oi.focusPassage != null) {
    const target = body.querySelector(`[data-openiti-passage="${oi.focusPassage}"]`);
    oi.focusPassage = null;
    if (target) {
      target.classList.add("hadith-card-focused");
      target.dataset.openitiFocused = "true";
      target.scrollIntoView({ block: "center" });
    }
  }
}

/**
 * Architect review (#316): a chapter title is shown TIDIED, never stored
 * tidied -- the split data keeps the source's heading as written. Twenty of
 * 5,191 source headings carry an unbalanced bracket ("( 5 كتاب الغسل") or an
 * inline "\\ 390 \\" cross-reference; those marks are dropped for display
 * only, and an empty title reads "(untitled)" rather than a file id.
 */
function openitiDisplayTitle(title) {
  let s = String(title ?? "").replace(/\\\s*\d+\s*\\/g, " ").replace(/\s+/g, " ").trim();
  const opens = (s.match(/\(/g) || []).length, closes = (s.match(/\)/g) || []).length;
  if (opens > closes) s = s.replace(/^\(\s*/, "");
  if (closes > opens) s = s.replace(/\s*\)$/, "");
  return s || t("(untitled)");
}

/** "PageV01P013" -> "Vol. 1, p. 13" (the source's own page marker, made readable). */
function openitiPageRef(ref) {
  const m = /^PageV(\d+)P(\d+)$/.exec(ref);
  return m ? t("Vol. {v}, p. {p}", { v: num(Number(m[1])), p: num(Number(m[2])) }) : ref;
}

function openitiCrumbs(oi, index, localRefresh) {
  const bar = el("nav", "hadith-crumbs");
  bar.dataset.openitiCrumbs = "true";
  const add = (label, onClick) => {
    if (onClick) {
      const b = el("button", "openiti-crumb", label);
      b.addEventListener("click", onClick);
      bar.appendChild(b);
    } else {
      const cur = el("span", "openiti-crumb-current", label);
      cur.setAttribute("aria-current", "page");
      bar.appendChild(cur);
    }
  };
  add(t("OpenITI"), () => { oi.bookUri = null; oi.chapterId = null; oi.showAllChapters = false; localRefresh(); });
  if (index) {
    add(index.titleEn, oi.chapterId ? () => { oi.chapterId = null; localRefresh(); } : null);
    if (oi.chapterId) {
      const chapter = index.chapters.find((c) => c.id === oi.chapterId);
      add(openitiDisplayTitle(chapter?.title), null);
    }
  }
  return bar;
}

function renderOpenitiBookList(body, oi, localRefresh) {
  const list = el("div", "hadith-list");
  for (const [versionUri, index] of oi.books) {
    const row = el("button", "hadith-row");
    row.dataset.openitiBook = versionUri;
    const nameWrap = el("span", "hadith-row-name");
    const ar = el("span", "openiti-title-ar", index.titleAr);
    ar.lang = "ar"; ar.dir = "rtl";
    nameWrap.appendChild(ar);
    nameWrap.appendChild(document.createTextNode(` — ${index.titleEn}`));
    row.appendChild(nameWrap);
    const count = index.numbering === "sequential-by-paragraph"
      ? t("{n} passages (this edition has no hadith numbers)", { n: num(index.passageCount) })
      : t("{n} hadith", { n: num(index.hadithCount) });
    row.appendChild(el("span", "hadith-row-meta", count));
    row.addEventListener("click", () => { oi.bookUri = versionUri; oi.chapterId = null; oi.showAllChapters = false; localRefresh(); });
    list.appendChild(row);
  }
  body.appendChild(list);
}

function renderOpenitiChapterList(body, oi, index, localRefresh, conc = null) {
  const goBox = el("div", "openiti-goto");
  const editionNumbers = index.numbering !== "sequential-by-paragraph";
  if (!editionNumbers && !conc) {
    // A control that can never work is worse than none -- say so instead
    // (this repository's own standing rule: a control that opens and
    // explains itself beats a control that is silently absent or broken).
    goBox.appendChild(el("p", "hadith-note", t("This edition has no hadith numbers to jump to.")));
  } else {
    const inputLabel = el("label", "openiti-goto-label");
    inputLabel.appendChild(el("span", null, t("Go to hadith number")));
    const input = el("input", "openiti-goto-input");
    input.type = "number";
    input.min = "1";
    input.inputMode = "numeric";
    input.dataset.openitiGotoInput = "true";
    input.setAttribute("aria-label", t("Go to hadith number"));
    inputLabel.appendChild(input);
    goBox.appendChild(inputLabel);
    // Round H-DB2: with a concordance the number typed is the STANDARD one by default (the number people cite);
    // where the edition has numbers of its own, a choice offers those too.
    let mode = conc ? "standard" : "edition";
    if (conc && editionNumbers) {
      const pick = el("select", "openiti-goto-mode");
      pick.dataset.openitiGotoMode = "true";
      pick.setAttribute("aria-label", t("Which numbering"));
      for (const [value, text] of [["standard", t("Standard number")], ["edition", t("This edition's number")]]) {
        const o = el("option", null, text); o.value = value; pick.appendChild(o);
      }
      pick.addEventListener("change", () => { mode = pick.value; });
      goBox.appendChild(pick);
    } else if (conc) {
      goBox.appendChild(el("span", "openiti-goto-hint", t("Standard number")));
    }
    const goBtn = el("button", "openiti-goto-btn", t("Go"));
    goBtn.type = "button";
    goBtn.dataset.openitiGotoBtn = "true";
    goBox.appendChild(goBtn);
    const goMsg = el("p", "hadith-note openiti-goto-msg");
    goMsg.dataset.openitiGotoMsg = "true";
    goMsg.setAttribute("role", "status");
    const doGo = () => {
      if (mode === "standard") {
        const n = conc.firstNByCite.get(Math.trunc(Number(input.value)));
        if (n == null) {
          goMsg.textContent = t("No hadith found with standard number {n}.", { n: num(input.value) });
          return;
        }
        oi.chapterId = null;
        oi.focusPassage = n;
        localRefresh();
        return;
      }
      const chapter = chapterForHadithNumber(index, input.value);
      if (!chapter) {
        goMsg.textContent = t("No chapter found for hadith number {n}.", { n: num(input.value) });
        return;
      }
      oi.chapterId = chapter.id;
      localRefresh();
    };
    goBtn.addEventListener("click", doGo);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); doGo(); } });
    goBox.appendChild(goMsg);
  }
  body.appendChild(goBox);

  const shown = oi.showAllChapters ? index.chapters.length : Math.min(OPENITI_CHAPTER_PAGE, index.chapters.length);
  const list = el("div", "hadith-list");
  list.dataset.openitiChapterList = String(shown);
  for (const c of index.chapters.slice(0, shown)) {
    const row = el("button", "hadith-row");
    row.dataset.openitiChapter = c.id;
    row.appendChild(openitiArabicRowName(openitiDisplayTitle(c.title)));
    if (c.firstNumber != null) {
      row.appendChild(el("span", "hadith-row-meta", `${num(c.firstNumber)}–${num(c.lastNumber)}`));
    }
    row.addEventListener("click", () => { oi.chapterId = c.id; localRefresh(); });
    list.appendChild(row);
  }
  body.appendChild(list);

  if (!oi.showAllChapters && index.chapters.length > OPENITI_CHAPTER_PAGE) {
    const more = el("button", "openiti-show-more", t("Show more ({remaining} more)", { remaining: num(index.chapters.length - OPENITI_CHAPTER_PAGE) }));
    more.type = "button";
    more.dataset.openitiShowMore = "true";
    more.addEventListener("click", () => { oi.showAllChapters = true; localRefresh(); });
    body.appendChild(more);
  }
}

function openitiArabicRowName(text) {
  const span = el("span", "hadith-row-name openiti-row-name-ar", text);
  span.lang = "ar"; span.dir = "rtl";
  return span;
}

function renderOpenitiPassages(body, hadiths, conc = null, heLinks = null, duaCtx = null) {
  if (!hadiths.length) { body.appendChild(el("p", "hadith-note", t("Nothing here yet."))); return; }
  const list = el("div", "hadith-occurrences");
  for (const h of hadiths) list.appendChild(openitiPassageCard(h, conc, heLinks, duaCtx));
  body.appendChild(list);
}

function openitiPassageCard(h, conc = null, heLinks = null, duaCtx = null) {
  const card = el("article", "hadith-card openiti-passage");
  card.dataset.openitiPassage = String(h.n);
  card.dataset.openitiKind = h.kind;

  if (h.kind === "hadith") {
    card.appendChild(el("p", "hadith-card-head", t("Hadith {n}", { n: num(h.number) })));
  } else if (h.kind === "passage") {
    card.appendChild(el("p", "hadith-card-head", t("Passage {n} (position in this edition, not the book's own number)", { n: num(h.number) })));
  } else if (h.kind === "editorial") {
    card.appendChild(el("p", "hadith-card-head openiti-editorial-label", t("Editor's note")));
  } else if (h.kind === "chapter-text") {
    card.classList.add("openiti-chapter-text");
  }

  // Round H-DB2: the number this narration has in the standard numbering, matched by its words.
  const cite = conc?.byN.get(h.n);
  if (cite) {
    const book = getAppLang() === "bn" ? (conc.label.bn ?? conc.label.en) : conc.label.en;
    const line = el("p", "openiti-standard-number", t("Standard number: {ref}", { ref: `${book} ${num(cite)}` }));
    line.dataset.openitiStandard = cite;
    card.appendChild(line);
  }

  const text = el("p", "hadith-arabic", h.text);
  text.lang = "ar"; text.dir = "rtl";
  card.appendChild(text);

  if (h.pageRefs && h.pageRefs.length) {
    card.appendChild(el("p", "hadith-availability openiti-page-refs", h.pageRefs.map(openitiPageRef).join(" · ")));
  }

  const heIds = heLinks?.get(h.n);
  if (heIds?.length) card.appendChild(openitiTranslationFold(heIds));
  const std = conc?.stdByN?.get(h.n);
  if (std) card.appendChild(standardTranslationFolds(conc.versionUri, async () => std));
  const group = duaCtx?.dua.groupOf.get(`${duaCtx.versionUri}:${h.n}`);
  if (group) card.appendChild(duaAlsoNarrated(h, group, duaCtx, conc));

  const credit = document.createElement("a");
  credit.className = "hadith-view-source openiti-credit";
  credit.dataset.openitiCredit = String(h.n);
  credit.href = OPENITI_CREDIT_URL;
  credit.target = "_blank";
  credit.rel = "noopener noreferrer";
  credit.textContent = t("Source: OpenITI (CC BY-NC-SA 4.0)");
  card.appendChild(credit);

  return card;
}

/** The cited name of a Dua-index book in the reader's language, with its standard number when it has one. */
function duaRefLabel(dua, versionUri, std, n, number = null) {
  const book = dua.books.find((b) => b.versionUri === versionUri);
  const name = (getAppLang() === "bn" ? book?.short?.bn : book?.short?.en) ?? book?.titleEn ?? versionUri;
  if (std != null && std !== "") return `${name} ${num(String(std))}`;
  if (number != null) return `${name} ${num(number)}`;
  return t("{book}, passage {n}", { book: name, n: num(n) });
}

/**
 * Round H-DB4 (decision 87): the other places this dua is narrated, found by shared words, each a button that opens
 * that narration in its book, highlighted, with a way back to here (decision 86). Said to be a proposal.
 */
function duaAlsoNarrated(h, group, { dua, oi, localRefresh, chapterId, versionUri }, conc) {
  const box = el("div", "dua-also");
  box.dataset.duaAlso = String(group.length - 1);
  const head = el("p", "dua-also-head", t("Also narrated in ({n} more)", { n: num(group.length - 1) }));
  head.appendChild(el("span", "dua-proposed", t("found by matching words, to be checked")));
  box.appendChild(head);
  const row = el("div", "dua-also-refs");
  const self = group.find((m) => m.versionUri === versionUri && m.n === h.n);
  const here = duaRefLabel(dua, versionUri, conc?.byN.get(h.n) ?? self?.std, h.n, self?.number ?? (h.kind === "hadith" ? h.number : null));
  // The books cited by a standard number first; the rest (the Day-and-Night books, al-Adhkar, Riyad) behind one
  // "+N more" fold, so a much-narrated dua does not bury the card under twenty buttons.
  const others = group.filter((m) => m !== self);
  const main = others.filter((m) => m.std != null && m.std !== "");
  const rest = others.filter((m) => !(m.std != null && m.std !== ""));
  const restBox = el("div", "dua-also-refs");
  const makeBtn = (m) => {
    const b = el("button", "dua-ref", duaRefLabel(dua, m.versionUri, m.std, m.n, m.number));
    b.type = "button";
    b.dataset.duaRef = `${m.versionUri}:${m.n}`;
    b.addEventListener("click", () => {
      oi.trail = [...(oi.trail ?? []), { bookUri: versionUri, chapterId, focusPassage: h.n, label: t("← Back to {ref}", { ref: here }) }];
      oi.bookUri = m.versionUri; oi.chapterId = null; oi.focusPassage = m.n; oi.showAllChapters = false;
      localRefresh();
    });
    return b;
  };
  for (const m of main) row.appendChild(makeBtn(m));
  if (main.length) box.appendChild(row);
  if (rest.length) {
    if (!main.length) { for (const m of rest) row.appendChild(makeBtn(m)); box.appendChild(row); return box; }
    const more = document.createElement("details");
    more.className = "dua-also-more";
    const sum = document.createElement("summary");
    sum.textContent = t("+{n} more in other books", { n: num(rest.length) });
    sum.dataset.duaMore = String(rest.length);
    more.appendChild(sum);
    for (const m of rest) restBox.appendChild(makeBtn(m));
    more.appendChild(restBox);
    box.appendChild(more);
  }
  return box;
}

/**
 * Round H-DB4 (decision 87), the Dua tab, first cut: the Dua chapters of eleven books (research report §2), each
 * opening in the library with "← Back to Dua". The narrations of one dua are linked across books on each card.
 */
function renderDua(body, state, render) {
  if (!state.dua) state.dua = { bookUri: null, mode: "duas", page: 1 };
  // Round H-DB5 (decision 88): two views of the same data -- one card per dua (the demo the Owner approved), and the
  // books' own Dua chapters (v09.119).
  const modes = el("div", "dua-modes");
  modes.setAttribute("role", "group");
  modes.setAttribute("aria-label", t("Dua"));
  for (const [mode, label] of [["duas", t("Duas")], ["chapters", t("Dua chapters")]]) {
    const b = el("button", "dua-mode", label);
    b.type = "button";
    b.dataset.duaMode = mode;
    b.setAttribute("aria-pressed", String(state.dua.mode === mode));
    b.addEventListener("click", () => { state.dua.mode = mode; render(); });
    modes.appendChild(b);
  }
  body.appendChild(modes);
  if (state.dua.mode !== "chapters") { renderDuaCards(body, state, render); return; }
  const section = el("section", "dua-section");
  section.id = "duaSection";
  section.appendChild(el("h2", null, t("Dua — the Dua chapters of the Hadith books")));
  section.appendChild(el("p", "hadith-note", t("Each narration shows its standard number, a Bangla or English translation where HadeethEnc has one, and the other books that narrate the same dua.")));
  const list = el("div", "hadith-list");
  section.appendChild(list);
  body.appendChild(section);
  list.appendChild(el("p", "hadith-note", t("Loading…")));
  loadDuaIndex().then(async (dua) => {
    list.textContent = "";
    if (!state.dua.bookUri) {
      for (const b of dua.books) {
        const row = el("button", "hadith-row");
        row.dataset.duaBook = b.versionUri;
        const name = el("span", "hadith-row-name");
        const ar = el("span", "openiti-title-ar", b.titleAr); ar.lang = "ar"; ar.dir = "rtl";
        name.appendChild(ar);
        name.appendChild(document.createTextNode(` — ${b.titleEn}`));
        row.appendChild(name);
        row.appendChild(el("span", "hadith-row-meta", t("{n} narrations", { n: num(b.narrations) })));
        row.addEventListener("click", () => { state.dua.bookUri = b.versionUri; render(); });
        list.appendChild(row);
      }
      return;
    }
    const book = dua.books.find((b) => b.versionUri === state.dua.bookUri);
    const back = el("button", "hadeethenc-crumb", t("← All Dua books"));
    back.type = "button";
    back.dataset.duaBack = "true";
    back.addEventListener("click", () => { state.dua.bookUri = null; render(); });
    list.appendChild(back);
    list.appendChild(el("h3", "hadith-row-name", book.titleEn));
    const index = await loadOpenitiBookIndex(book.versionUri);
    for (const id of book.chapterIds) {
      const c = index.chapters.find((x) => x.id === id);
      if (!c) continue;
      const row = el("button", "hadith-row");
      row.dataset.duaChapter = id;
      row.appendChild(openitiArabicRowName(openitiDisplayTitle(c.title)));
      row.appendChild(el("span", "hadith-row-meta", t("{n} narrations", { n: num(c.hadithCount || c.passageCount) })));
      row.addEventListener("click", () => {
        state.view = "collections";
        state.editionId = null;
        state.oi = { bookUri: book.versionUri, chapterId: id, books: null, showAllChapters: false,
          scrollTo: true, trail: [{ label: t("← Back to Dua"), toDua: () => { state.view = "dua"; render(); } }] };
        render();
      });
      list.appendChild(row);
    }
  }).catch((err) => { list.textContent = ""; list.appendChild(el("p", "hadith-note", String(err?.message ?? err))); });
}

/**
 * Round H-DB5 (decision 88), the Duas view: one card per dua, most-narrated first, 40 to a page. Each card: its
 * number and the bab heading of its first standard-numbered narration, that narration's Arabic, HadeethEnc's
 * translation where it has the hadith, every place it is narrated (each opening in the library with a way back to
 * this page), and the reader's progress, saved ONCE per dua (dua:<n>).
 */
function renderDuaCards(body, state, render) {
  const section = el("section", "dua-section dua-cards");
  section.id = "duaCards";
  body.appendChild(section);
  section.appendChild(el("p", "hadith-note", t("Loading…")));
  Promise.all([loadDuaCardsSummary(), loadDuaCardsPage(state.dua.page || 1), loadDuaWordLinks(state.dua.page || 1).catch(() => null),
    loadDuaVowels(state.dua.page || 1).catch(() => null), loadDuaWordGrammar(state.dua.page || 1).catch(() => null)]).then(([summary, cards, wordLinks, vowels, wordGrammar]) => {
    section.textContent = "";
    const page = state.dua.page || 1;
    const first = (page - 1) * summary.cardsPerFile + 1;
    section.appendChild(el("p", "hadith-note dua-cards-count", t("Duas {from}–{to} of {total}, most narrated first. Each dua's narrations were found by matching words and are still to be checked.",
      { from: num(first), to: num(first + cards.length - 1), total: num(summary.cards) })));
    const pager = () => {
      const nav = el("div", "dua-pager");
      const prev = el("button", "dua-ref", `‹ ${t("Previous")}`);
      prev.type = "button"; prev.disabled = page <= 1; prev.dataset.duaPrev = "true";
      prev.addEventListener("click", () => { state.dua.page = page - 1; render(); document.getElementById("duaCards")?.scrollIntoView({ block: "start" }); });
      const next = el("button", "dua-ref", `${t("Next")} ›`);
      next.type = "button"; next.disabled = page >= summary.files; next.dataset.duaNext = "true";
      next.addEventListener("click", () => { state.dua.page = page + 1; render(); document.getElementById("duaCards")?.scrollIntoView({ block: "start" }); });
      nav.append(prev, el("span", "hadith-note", t("Page {n} of {total}", { n: num(page), total: num(summary.files) })), next);
      return nav;
    };
    section.appendChild(pager());
    const list = el("div", "hadith-occurrences");
    section.appendChild(list);
    const progressRows = [];
    for (const c of cards) list.appendChild(duaCard(c, summary, state, render, progressRows, wordLinks, page, vowels, wordGrammar));
    section.appendChild(pager());
    fillDuaProgress(progressRows);
    if (state.dua.focusDua != null) {
      const target = list.querySelector(`[data-dua-card="${state.dua.focusDua}"]`);
      state.dua.focusDua = null;
      if (target) { target.classList.add("hadith-card-focused"); target.scrollIntoView({ block: "center" }); }
    }
  }).catch((err) => { section.textContent = ""; section.appendChild(el("p", "hadith-note", String(err?.message ?? err))); });
}

function duaCard(c, summary, state, render, progressRows, wordLinks = null, page = 1, vowels = null, wordGrammar = null) {
  const card = el("article", "hadith-card dua-card");
  card.dataset.duaCard = String(c.dua);
  const head = el("p", "hadith-card-head", t("Dua {n}", { n: num(c.dua) }));
  card.appendChild(head);
  if (c.heading) {
    const h = el("h3", "dua-card-heading", c.heading);
    h.lang = "ar"; h.dir = "rtl";
    card.appendChild(h);
  }
  const dua = { books: summary.books };
  const [ab, an, astd, anum] = c.anchor;
  card.appendChild(el("p", "openiti-standard-number", duaRefLabel(dua, summary.books[ab].versionUri, astd, an, anum)));
  // The Owner, 8 Oct 2026: "clean dua words on each card" and "For Dua, I want same Quranic font". The words are
  // picked out of the narration by dua-words.js (a suggestion until checked); the narration stays one tap away with
  // the words marked in it. Where none are picked out, the narration shows as before.
  const picked = duaWords(c.text);
  if (picked) {
    const words = el("p", "dua-words");
    words.lang = "ar"; words.dir = "rtl";
    words.dataset.duaWords = String(c.dua);
    words.style.fontFamily = quranFontStack();
    card.appendChild(words);
    card.appendChild(el("p", "dua-words-note", t("Words picked out by the computer · a person checks them")));
    // Decision 90, round 1: each word opens what the Qur'an's own data knows about the same spelling. The links file
    // is only used when it was built from these very words (its fingerprint), so a changed picker never mislinks.
    const links = wordLinks?.duas?.[c.dua];
    const linked = !!links && links.f === duaWordsFingerprint(picked.words);
    const gram = wordGrammar?.duas?.[c.dua];
    // Round 5a (decision 90): the same words with vowels, where a vowelled text holds this whole dua word for word.
    const vow = vowels?.duas?.[c.dua];
    const vowelled = !!vow && vow.f === duaWordsFingerprint(picked.words) && vow.v.length === duaWordTokens(picked.words).length ? vow : null;
    const panel = el("div", "dua-word-panel");
    panel.hidden = true;
    panel.dataset.duaWordPanel = String(c.dua);
    duaWordTokens(picked.words).forEach((tok, i) => {
      if (i) words.appendChild(document.createTextNode(" "));
      const span = el("span", "dua-word", vowelled ? vowelled.v[i] : tok);
      span.dataset.duaWord = String(i);
      span.dataset.plain = tok;
      if (vowelled) span.dataset.vowelled = vowelled.v[i];
      if (linked) {
        const idx = links.w[i] ?? -1;
        span.setAttribute("role", "button");
        span.tabIndex = 0;
        span.setAttribute("aria-pressed", "false");
        if (idx >= 0) span.classList.add("dua-word-linked");
        const open = () => showDuaWord(panel, words, span, span.textContent, idx >= 0 ? wordLinks.entries[idx] : null, c.dua, page, links.x?.[i] ?? "", idx < 0 && gram?.f === links.f ? gram.g?.[i] ?? null : null);
        span.addEventListener("click", open);
        span.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
      }
      words.appendChild(span);
    });
    if (vowelled) {
      // Where the vowels come from, and a switch to see the words without them (one tap, both ways).
      const src = vowelled.s.startsWith("hisn:") ? t("Hisn al-Muslim") : t("HadeethEnc");
      const row = el("p", "dua-words-note dua-vowels-note");
      row.dataset.duaVowels = vowelled.s;
      row.appendChild(document.createTextNode(t("Vowels from {source}, matched word for word by the computer · a person checks them", { source: src })));
      const sw = el("button", "dua-ref dua-vowels-toggle", t("Without vowels"));
      sw.type = "button";
      sw.dataset.duaVowelsToggle = "";
      sw.setAttribute("aria-pressed", "false");
      sw.addEventListener("click", () => {
        const plain = sw.getAttribute("aria-pressed") !== "true";
        sw.setAttribute("aria-pressed", String(plain));
        sw.textContent = plain ? t("With vowels") : t("Without vowels");
        words.querySelectorAll("[data-dua-word]").forEach((w) => { w.textContent = plain ? w.dataset.plain : w.dataset.vowelled; });
      });
      row.appendChild(sw);
      card.appendChild(row);
    }
    if (linked) card.appendChild(el("p", "dua-words-note dua-words-tap", t("Tap a word to see it in the Qur'an's words.")));
    card.appendChild(panel);
    const fold = document.createElement("details");
    fold.className = "dua-narration";
    fold.dataset.duaNarration = String(c.dua);
    const sum = document.createElement("summary");
    sum.textContent = t("The whole narration");
    fold.appendChild(sum);
    const full = duaNarration(c.text);
    const text = el("p", "hadith-arabic");
    text.lang = "ar"; text.dir = "rtl";
    const mark = document.createElement("mark");
    mark.className = "dua-words-mark";
    mark.textContent = full.slice(picked.start, picked.end);
    text.append(full.slice(0, picked.start), mark, full.slice(picked.end));
    fold.appendChild(text);
    card.appendChild(fold);
  } else {
    const text = el("p", "hadith-arabic", c.text);
    text.lang = "ar"; text.dir = "rtl";
    card.appendChild(text);
    card.appendChild(el("p", "dua-words-note", t("The dua's own words are not picked out of this narration yet.")));
  }
  if (c.hadeethenc?.length) card.appendChild(openitiTranslationFold(c.hadeethenc.map(String)));
  const anchorUri = summary.books[ab].versionUri;
  if (TRANSLATED_BOOKS.has(anchorUri)) card.appendChild(standardTranslationFolds(anchorUri, () => loadOpenitiConcordance(anchorUri).then((cc) => cc?.stdByN?.get(an) ?? null).catch(() => null)));

  const box = el("div", "dua-also");
  const headP = el("p", "dua-also-head", t("Narrated in {n} places", { n: num(c.members.length) }));
  headP.appendChild(el("span", "dua-proposed", t("found by matching words, to be checked")));
  box.appendChild(headP);
  const mainRow = el("div", "dua-also-refs");
  const restRow = el("div", "dua-also-refs");
  const btn = ([b, n, std, number]) => {
    const versionUri = summary.books[b].versionUri;
    const r = el("button", "dua-ref", duaRefLabel(dua, versionUri, std, n, number));
    r.type = "button";
    r.dataset.duaRef = `${versionUri}:${n}`;
    r.addEventListener("click", () => {
      state.view = "collections";
      state.editionId = null;
      const page = state.dua.page;
      state.oi = { bookUri: versionUri, chapterId: null, books: null, showAllChapters: false, focusPassage: n,
        trail: [{ label: t("← Back to Dua {n}", { n: num(c.dua) }), toDua: () => { state.view = "dua"; state.dua.mode = "duas"; state.dua.page = page; state.dua.focusDua = c.dua; render(); } }] };
      render();
    });
    return r;
  };
  const withStd = c.members.filter((m) => m[2] != null && m[2] !== "");
  const rest = c.members.filter((m) => !(m[2] != null && m[2] !== ""));
  for (const m of withStd) mainRow.appendChild(btn(m));
  if (withStd.length) box.appendChild(mainRow);
  if (rest.length && !withStd.length) { for (const m of rest) mainRow.appendChild(btn(m)); box.appendChild(mainRow); }
  else if (rest.length) {
    const more = document.createElement("details");
    more.className = "dua-also-more";
    const sum = document.createElement("summary");
    sum.textContent = t("+{n} more in other books", { n: num(rest.length) });
    more.appendChild(sum);
    for (const m of rest) restRow.appendChild(btn(m));
    more.appendChild(restRow);
    box.appendChild(more);
  }
  card.appendChild(box);

  const prog = el("div", "dua-progress");
  prog.dataset.duaProgress = String(c.dua);
  prog.appendChild(el("p", "dua-also-head", t("My progress on this dua")));
  prog.appendChild(el("p", "hadith-note", t("Loading…")));
  card.appendChild(prog);
  progressRows.push({ dua: c.dua, el: prog });
  return card;
}

/** Decision 90, rounds 3-4: "S:A:W" from a packed place (surah*1000000 + ayah*1000 + word). */
function placeOf(n) { return `${Math.floor(n / 1000000)}:${Math.floor(n / 1000) % 1000}:${n % 1000}`; }

/**
 * The way to a Qur'an word's Word card from a Dua card (decision 86): this page's address is first set to reopen this
 * page of Duas on this card, so the Word card's "Back to Dua n" (history.back) lands here. `progress` (round 4) asks
 * the Word card to record that Word-by-Word state for the word on arrival -- with a one-use token in this tab's
 * sessionStorage, so the address alone can never record anything.
 */
function wordCardHref(place, dua) { return `./quranrevival.html?word=${place}&back=1&from=dua-${dua}`; }
function rememberDuaPlace(page, dua) {
  try {
    const u = new URL(location.href);
    u.searchParams.set("view", "dua"); u.searchParams.set("duaPage", String(page)); u.searchParams.set("dua", String(dua));
    history.replaceState(history.state, "", u);
  } catch { /* the link still opens the Word card */ }
}
export const DUA_WORD_PROGRESS_TOKEN = "mmsa-dua-word-progress";
const WBW_STATES = ["not_started", "learning", "practising", "achieved"];

/**
 * Round 5b (decision 91): the computer's grammar suggestion for a word no Qur'an word is spelled like -- dictionary
 * word, root, part of speech, and the two dictionaries opened at the root. g = [lemma, root, pos, vowelled].
 */
function duaGrammarBlock([lemma, root, pos]) {
  const box = el("div", "dua-word-grammar");
  box.dataset.duaWordGrammar = "";
  box.appendChild(el("p", "dua-also-head", t("Grammar suggestion (computer, to be checked)")));
  const line = (label, value, cls, ar) => {
    const p = el("p", `dua-word-line ${cls}`);
    p.appendChild(el("span", "dua-word-label", label));
    const v = el("span", "dua-word-value", value);
    if (ar) { v.lang = "ar"; v.dir = "rtl"; v.style.fontFamily = quranFontStack(); }
    p.appendChild(v);
    return p;
  };
  if (lemma) box.appendChild(line(t("Dictionary word"), lemma, "dua-word-lemma", true));
  if (root) box.appendChild(line(t("Root"), root, "dua-word-root", true));
  if (pos) box.appendChild(line(t("Part of speech"), t(duaGrammarPosLabel(pos)), "dua-word-pos", false));
  if (root) {
    const dict = el("div", "dua-word-dicts");
    dict.dataset.duaWordDicts = "";
    box.appendChild(dict);
    Promise.all([import("./quran-word-card.js"), import("./buckwalter.js")]).then(([wc, bw]) => {
      const links = [[t("Quranic Arabic Corpus"), `https://corpus.quran.com/qurandictionary.jsp?q=${encodeURIComponent(bw.arabicToBuckwalter(root))}`, "corpus"],
        [t("Lane · Hans Wehr"), wc.ejtaalUrl(root), "ejtaal"]];
      for (const [label, href, kind] of links) {
        if (!href) continue;
        const a = el("a", "dua-ref dua-word-dict", `${label} ↗`);
        a.href = href; a.target = "_blank"; a.rel = "noopener noreferrer"; a.dataset.duaWordDict = kind;
        dict.appendChild(a);
      }
    }).catch(() => dict.remove());
  }
  return box;
}

/**
 * Decision 90, rounds 1-4: the Dua word card under a dua's words, for the word tapped. `entry` is the links file's
 * row [place, count, arabic, translit, en, bn, root, lemma, lemmaCount, wbwKey, places], or null when no Qur'an word
 * is spelled this way; `how` says a leading «و»/«ف» was set aside and/or the Qur'an's own spelling was used (round
 * 2). Round 3: the card on this page -- meanings, root, dictionary word, dictionary links, its places in the Qur'an.
 * Round 4 (Q1 answered yes): "Achieved" here counts for the same Qur'an word. Tapping the same word again closes it.
 */
function showDuaWord(panel, words, span, tok, entry, dua, page, how = "", grammar = null) {
  const wasOpen = span.getAttribute("aria-pressed") === "true";
  words.querySelectorAll(".dua-word[aria-pressed]").forEach((s) => s.setAttribute("aria-pressed", "false"));
  panel.textContent = "";
  if (wasOpen) { panel.hidden = true; return; }
  span.setAttribute("aria-pressed", "true");
  panel.hidden = false;
  const head = el("div", "dua-word-panel-head");
  const ar = el("span", "dua-word-panel-ar", tok);
  ar.lang = "ar"; ar.dir = "rtl"; ar.style.fontFamily = quranFontStack();
  const close = el("button", "dua-word-panel-close", "×");
  close.type = "button";
  close.setAttribute("aria-label", t("Close"));
  close.addEventListener("click", () => { span.setAttribute("aria-pressed", "false"); panel.hidden = true; span.focus({ preventScroll: true }); });
  head.append(ar, close);
  panel.appendChild(head);
  if (!entry) {
    panel.appendChild(el("p", "hadith-note", t("No word of the Qur'an is spelled this way, so it is not linked yet.")));
    if (grammar) panel.appendChild(duaGrammarBlock(grammar));
    return;
  }
  const [place, count, qar, tr, en, bn, root, lemma, lemmaCount, wbwKey, places = []] = entry;
  const line = (label, value, cls = "", lang = "") => {
    const p = el("p", `dua-word-line ${cls}`.trim());
    p.appendChild(el("span", "dua-word-label", label));
    const v = el("span", "dua-word-value", value);
    if (lang) { v.lang = lang; if (lang === "ar") { v.dir = "rtl"; v.style.fontFamily = quranFontStack(); } }
    p.appendChild(v);
    return p;
  };
  panel.appendChild(line(t("In the Qur'an"), qar, "dua-word-quran", "ar"));
  // Round 2: how the dua's word met the Qur'an's.
  const prefix = how.replace("~", "");
  if (prefix) panel.appendChild(el("p", "dua-word-how", prefix === "\u0648" ? t("Read as «و» (and) + this word") : t("Read as «ف» (so) + this word")));
  if (how.includes("~")) panel.appendChild(el("p", "dua-word-how", t("The Qur'an spells this word its own way")));
  if (tr) panel.appendChild(line(t("Sounds like"), tr, "dua-word-translit"));
  const means = getAppLang() === "bn" ? [[bn, "bn"], [en, "en"]] : [[en, "en"], [bn, "bn"]];
  for (const [m, l] of means) if (m) panel.appendChild(line(l === "bn" ? t("Meaning (Bangla)") : t("Meaning (English)"), m, `dua-word-meaning-${l}`, l));
  if (root) panel.appendChild(line(t("Root"), root, "dua-word-root", "ar"));
  if (lemma) {
    const p = line(t("Dictionary word"), lemma, "dua-word-lemma", "ar");
    if (lemmaCount > 1) p.appendChild(el("span", "dua-proposed", t("one of {n} possible, to be checked", { n: num(lemmaCount) })));
    panel.appendChild(p);
  }
  // Round 3: the dictionaries, opened at the root (the Word card's own links, loaded on first use).
  if (root) {
    const dict = el("div", "dua-word-dicts");
    dict.dataset.duaWordDicts = "";
    panel.appendChild(dict);
    Promise.all([import("./quran-word-card.js"), import("./buckwalter.js")]).then(([wc, bw]) => {
      const links = [[t("Quranic Arabic Corpus"), `https://corpus.quran.com/qurandictionary.jsp?q=${encodeURIComponent(bw.arabicToBuckwalter(root))}`, "corpus"],
        [t("Lane · Hans Wehr"), wc.ejtaalUrl(root), "ejtaal"]];
      for (const [label, href, kind] of links) {
        if (!href) continue;
        const a = el("a", "dua-ref dua-word-dict", `${label} ↗`);
        a.href = href; a.target = "_blank"; a.rel = "noopener noreferrer"; a.dataset.duaWordDict = kind;
        dict.appendChild(a);
      }
    }).catch(() => dict.remove());
  }
  // Round 3: where the word is in the Qur'an -- each place opens its Word card, with the way back.
  panel.appendChild(el("p", "dua-word-count", t("{n} times in the Qur'an, spelled this way", { n: num(count) })));
  if (places.length) {
    const row = el("div", "dua-word-places");
    for (const n of places) {
      const ref = placeOf(n);
      const a = el("a", "dua-ref dua-word-place", num(ref));
      a.href = wordCardHref(ref, dua);
      a.dataset.duaWordPlace = ref;
      a.addEventListener("click", () => rememberDuaPlace(page, dua));
      row.appendChild(a);
    }
    if (count > places.length) row.appendChild(el("span", "hadith-note", t("+{n} more in the Word card", { n: num(count - places.length) })));
    panel.appendChild(row);
  }
  const go = el("a", "dua-ref dua-word-open", `${t("Open in the Word card")} ›`);
  go.dataset.duaWordOpen = place;
  go.href = wordCardHref(place, dua);
  go.addEventListener("click", () => rememberDuaPlace(page, dua));
  panel.appendChild(go);
  // Round 4 (decision 90, Q1 = yes): the word's Word-by-Word progress, the same record as the Qur'an word's. A press
  // opens the Word card at this word and records it there, through the Word card's own saving (the place, the
  // dictionary word everywhere, and the "You know" totals), then "Back to Dua n" returns here.
  if (wbwKey) {
    const prog = el("div", "dua-word-progress");
    prog.dataset.duaWordProgress = wbwKey;
    prog.appendChild(el("p", "dua-also-head", t("My progress on this word (Word-by-Word)")));
    const status = el("p", "hadith-note dua-word-progress-now", t("Loading…"));
    prog.appendChild(status);
    const row = el("div", "dua-progress-row");
    for (const id of WBW_STATES) {
      const b = el("a", "dua-status", statusLabel(id));
      b.dataset.duaWordState = id;
      b.href = `${wordCardHref(place, dua)}&progress=${id}`;
      b.addEventListener("click", () => {
        rememberDuaPlace(page, dua);
        try { sessionStorage.setItem(DUA_WORD_PROGRESS_TOKEN, `${place}|${id}`); } catch { /* the Word card opens without recording */ }
      });
      row.appendChild(b);
    }
    prog.appendChild(row);
    prog.appendChild(el("p", "dua-words-note", t("Counts for this word everywhere in the Qur'an too. The Word card opens to record it.")));
    panel.appendChild(prog);
    loadHadithStudyActions().then(async (actions) => {
      const session = await actions.getHadeethEncSession();
      if (!session) { status.textContent = t("Sign in and choose who you're studying as to record progress."); return; }
      const state = await actions.duaWordProgress(session, wbwKey);
      status.textContent = t("Now: {state}", { state: statusLabel(state) });
      status.dataset.duaWordStateNow = state;
      row.querySelectorAll("[data-dua-word-state]").forEach((b) => b.setAttribute("aria-current", String(b.dataset.duaWordState === state)));
    }).catch(() => { status.textContent = t("Progress could not be loaded right now."); });
  }
  panel.appendChild(el("p", "dua-words-note", t("Linked by the computer by spelling · to be checked")));
}

/** The progress rows of one page: one session, one read of the person's statuses, then a row of status buttons each. */
async function fillDuaProgress(rows) {
  const say = (msg) => rows.forEach(({ el: p }) => { p.lastChild.remove(); p.appendChild(el("p", "hadeethenc-study-reason", msg)); });
  let actions, session = null;
  try { actions = await loadHadithStudyActions(); session = await actions.getHadeethEncSession(); }
  catch { say(t("Progress could not be loaded right now.")); return; }
  if (!session) { say(t("Sign in and choose who you're studying as to record progress.")); return; }
  if (!session.canRecordFor) { say(t("You can view this, but only the person's own record can record progress.")); return; }
  let statuses = new Map();
  try { statuses = await actions.duaStatuses(session); } catch (err) { say(String(err?.message ?? err)); return; }
  const onRamp = STATUSES.filter((s) => s.onRamp);
  for (const { dua, el: p } of rows) {
    p.lastChild.remove();
    const row = el("div", "dua-progress-row");
    row.setAttribute("role", "group");
    row.setAttribute("aria-label", t("My progress on this dua"));
    const msg = el("p", "hadeethenc-study-reason");
    msg.setAttribute("role", "status");
    let current = statuses.get(dua) ?? null;
    const paint = () => row.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.duaStatus === (current ?? "not_started"))));
    for (const s of onRamp) {
      const b = el("button", "dua-status", statusLabel(s.id));
      b.type = "button";
      b.dataset.duaStatus = s.id;
      b.addEventListener("click", async () => {
        const before = current;
        current = s.id; paint(); msg.textContent = "";
        try { await actions.claimDua(session, dua, s.id); }
        catch (err) { current = before; paint(); msg.textContent = t("Not saved: {why}", { why: String(err?.message ?? err) }); }
      });
      row.appendChild(b);
    }
    paint();
    p.append(row, msg);
  }
}

/**
 * Decision 89 (the Owner, 8 Oct 2026: "include the Hadith Eng n Bangla languages"): the English and Bangla
 * translations from hadith-api, found by the narration's standard number. Two folds, the reader's language first,
 * each closed and loaded only when opened. `resolveStd` gives the standard number (or null) when first needed.
 */
const STANDARD_TRANSLATION_LABELS = { en: "English", bn: "বাংলা" };
function standardTranslationFolds(versionUri, resolveStd) {
  const frag = document.createDocumentFragment();
  const langs = getAppLang() === "bn" ? ["bn", "en"] : ["en", "bn"];
  for (const lang of langs) {
    const details = document.createElement("details");
    details.className = "hadeethenc-explanation standard-translation";
    details.dataset.standardTranslation = lang;
    const summary = document.createElement("summary");
    summary.textContent = t("{lang} translation", { lang: STANDARD_TRANSLATION_LABELS[lang] });
    details.appendChild(summary);
    let loaded = false;
    details.addEventListener("toggle", () => {
      if (!details.open || loaded) return;
      loaded = true;
      const wait = el("p", "hadith-note", t("Loading…"));
      details.appendChild(wait);
      Promise.resolve(resolveStd()).then((std) => (std ? loadHadithTranslation(versionUri, std, lang) : null)).then((tr) => {
        wait.remove();
        if (!tr) { details.appendChild(el("p", "hadith-note", t("No {lang} translation was found for this narration.", { lang: STANDARD_TRANSLATION_LABELS[lang] }))); return; }
        const text = el("p", "hadith-translation-text standard-translation-text", tr.text);
        text.lang = lang;
        text.dataset.standardTranslationText = lang;
        details.appendChild(text);
        const credit = document.createElement("a");
        credit.className = "hadith-view-source standard-translation-credit";
        credit.href = tr.sourceUrl;
        credit.target = "_blank";
        credit.rel = "noopener noreferrer";
        credit.textContent = tr.translator
          ? t("Translation: {who} · from hadith-api (fawazahmed0), matched by the standard number", { who: tr.translator })
          : t("Translation from hadith-api (fawazahmed0), matched by the standard number");
        details.appendChild(credit);
      }).catch(() => { wait.remove(); details.appendChild(el("p", "hadith-note", t("The translation could not be loaded right now."))); loaded = false; });
    });
    frag.appendChild(details);
  }
  return frag;
}

/**
 * Round H-DB3 (decision 87): HadeethEnc's translation of this narration, in the reader's language (Bangla or
 * English), closed until opened and loaded only then. HadeethEnc's conditions (decision 7): its words unchanged,
 * named, linked. Its wording can follow another narration of the same hadith, and the fold says so.
 */
function openitiTranslationFold(ids) {
  const want = getAppLang() === "bn" ? "bn" : "en";
  const details = document.createElement("details");
  details.className = "hadeethenc-explanation openiti-translation";
  details.dataset.openitiTranslation = ids.join(",");
  const summary = document.createElement("summary");
  summary.textContent = t("{lang} translation (HadeethEnc)", { lang: HADEETHENC_LANG_LABELS[want] ?? want });
  details.appendChild(summary);
  let loaded = false;
  details.addEventListener("toggle", () => {
    if (!details.open || loaded) return;
    loaded = true;
    const wait = el("p", "hadith-note", t("Loading…"));
    details.appendChild(wait);
    loadHadithRecords(ids, want).then((records) => {
      wait.remove();
      details.appendChild(el("p", "hadith-note openiti-translation-note", t("HadeethEnc's wording may follow another narration of this hadith.")));
      for (const id of ids) {
        const r = records.get(String(id));
        if (!r) continue;
        const box = el("div", "hadith-translation");
        if (r.lang === "ar") {
          box.appendChild(el("p", "hadith-fallback", t("No {lang} translation for this hadith. Showing the Arabic source only.", { lang: HADEETHENC_LANG_LABELS[want] ?? want })));
        } else {
          if (r.isFallback) box.appendChild(el("p", "hadith-fallback", t("No {lang} translation for this hadith. Showing {shown}.", { lang: HADEETHENC_LANG_LABELS[want] ?? want, shown: HADEETHENC_LANG_LABELS[r.lang] ?? r.lang })));
          const text = el("p", "hadith-translation-text", r.record.hadeeth ?? "");
          text.lang = r.lang;
          text.dataset.openitiTranslationText = id;
          box.appendChild(text);
        }
        if (r.record.grade) box.appendChild(el("p", "hadith-attribution", t("Grade: {grade}", { grade: r.record.grade })));
        if (r.record.attribution) box.appendChild(el("p", "hadith-attribution", r.record.attribution));
        const src = document.createElement("a");
        src.className = "hadith-view-source";
        src.href = hadeethEncSourceUrl(r.lang, id);
        src.target = "_blank";
        src.rel = "noopener noreferrer";
        src.textContent = t("Source: HadeethEnc.com");
        box.appendChild(src);
        details.appendChild(box);
      }
    }).catch((err) => { wait.textContent = String(err?.message ?? err); loaded = false; });
  });
  return details;
}

function renderCollections(body, state, render) {
  const uiLang = getAppLang();

  if (!state.editionId) {
    body.appendChild(renderHadeethEncSource(state));
    body.appendChild(renderOpenitiSource(state));
    body.appendChild(el("h2", null, t("Synthetic pilot collections")));
    body.appendChild(syntheticBanner());
    const list = el("div", "hadith-list");
    for (const c of listCollections()) {
      for (const e of c.editions) {
        const row = el("button", "hadith-row");
        row.dataset.hadithEdition = e.editionId;
        row.appendChild(el("span", "hadith-row-name", langText(c.name, uiLang)));
        row.appendChild(el("span", "hadith-row-meta", `${e.editionId} · ${t("Synthetic")}`));
        row.addEventListener("click", () => { state.editionId = e.editionId; state.bookId = null; state.chapterId = null; render(); focusCollectionsLanding(); });
        list.appendChild(row);
      }
    }
    body.appendChild(list);
    return;
  }

  body.appendChild(breadcrumb(state, render, uiLang));

  if (!state.bookId) {
    const list = el("div", "hadith-list");
    for (const b of booksOf(state.editionId)) {
      const row = el("button", "hadith-row");
      row.dataset.hadithBook = b.bookChapterId;
      row.appendChild(el("span", "hadith-row-name", langText(b.title, uiLang)));
      row.appendChild(rawHeadingSpan(b.rawHeading));
      row.addEventListener("click", () => { state.bookId = b.bookChapterId; state.chapterId = null; render(); focusCollectionsLanding(); });
      list.appendChild(row);
    }
    body.appendChild(list);
    return;
  }

  // An edition with no chapter level steps book -> occurrence directly. That
  // is a legitimate source shape, not a missing level, and the UI says so
  // rather than rendering an empty chapter list.
  if (!editionHasChapterLevel(state.editionId)) {
    body.appendChild(el("p", "hadith-note", t("This edition has no chapter level.")));
    renderOccurrenceList(body, state, occurrencesIn(state.bookId), render);
    return;
  }

  if (!state.chapterId) {
    const list = el("div", "hadith-list");
    for (const c of chaptersOf(state.bookId)) {
      const row = el("button", "hadith-row");
      row.dataset.hadithChapter = c.bookChapterId;
      row.appendChild(el("span", "hadith-row-name", langText(c.title, uiLang)));
      row.appendChild(rawHeadingSpan(c.rawHeading));
      row.addEventListener("click", () => { state.chapterId = c.bookChapterId; render(); focusCollectionsLanding(); });
      list.appendChild(row);
    }
    body.appendChild(list);
    const direct = occurrencesIn(state.bookId);
    if (direct.length) renderOccurrenceList(body, state, direct, render);
    return;
  }

  renderOccurrenceList(body, state, occurrencesIn(state.chapterId), render);
}

function breadcrumb(state, render, uiLang) {
  const bar = el("nav", "hadith-crumbs");
  const add = (label, onClick) => {
    if (onClick) {
      const b = el("button", "hadith-crumb", label);
      b.addEventListener("click", onClick);
      bar.appendChild(b);
    } else {
      // aria-current marks the trail's own current location for assistive
      // tech (issue #114 Gate A/B, found by reproduction: neither this crumb
      // nor its containing <nav> carried any accessible signal for which
      // level is "here", and that grew more load-bearing the moment the
      // edition crumb above made the trail two levels deeper). No new
      // translatable string: aria-current's value is a fixed ARIA token, not
      // user-facing text.
      const cur = el("span", "hadith-crumb-current", label);
      cur.setAttribute("aria-current", "page");
      bar.appendChild(cur);
    }
  };
  add(t("Collections"), () => { state.editionId = null; state.bookId = null; state.chapterId = null; render(); focusCollectionsLanding(); });
  // The edition itself was never named in this breadcrumb at all (issue #114,
  // Gate A, found by reproduction against PR #144's own focus fix): right
  // after picking an edition, `focusCollectionsLanding()`'s landing element
  // was this bar's OWN LAST CHILD, which at that point was the "Collections"
  // crumb above -- so a keyboard/screen-reader user who had just chosen an
  // edition heard "Collections" again, learning nothing about which one they
  // landed in. Read via `collectionOf()`, never through an occurrence -- the
  // same fragile detour the book/chapter-title fix below already retired.
  // This also fixes a second, related defect for free: with the edition now
  // its own crumb, the "Collections" button above is no longer ever this
  // bar's last child while sitting at edition level, so it never has
  // `focusCollectionsLanding()`'s `tabindex="-1"` stamped onto it -- an
  // already-interactive control was losing its normal Tab/Shift+Tab
  // reachability purely because it happened to land last in the bar.
  const collection = collectionOf(state.editionId);
  add(collection ? langText(collection.name, uiLang) : state.editionId,
    state.bookId ? () => { state.bookId = null; state.chapterId = null; render(); focusCollectionsLanding(); } : null);
  // Read the book/chapter's own record directly (`chapterById()`), never
  // through an occurrence's `sourcePathOf()` -- a book that HAS a chapter
  // level never holds an occurrence attached to the book id itself (every
  // occurrence sits under one of its chapters), so deriving the book's title
  // from `occurrencesIn(state.bookId)[0]` was silently empty at the
  // chapter-list level and fell through to the raw internal id. Reproduced on
  // both books of the `synthetic-alpha` edition; a book with no chapter level
  // (`synthetic-beta`) was unaffected, because there `occurrencesIn(bookId)`
  // is never empty.
  if (state.bookId) add(langText(chapterById(state.bookId)?.title, uiLang) || state.bookId, state.chapterId ? () => { state.chapterId = null; render(); focusCollectionsLanding(); } : null);
  if (state.chapterId) add(langText(chapterById(state.chapterId)?.title, uiLang) || state.chapterId, null);
  return bar;
}

function renderOccurrenceList(body, state, occurrences, render) {
  if (!occurrences.length) { body.appendChild(el("p", "hadith-note", t("Nothing here yet."))); return; }
  const list = el("div", "hadith-occurrences");
  for (const o of occurrences) list.appendChild(occurrenceCard(o, state, render));
  body.appendChild(list);
}

// ---------------------------------------------------------------------------
// The occurrence card
// ---------------------------------------------------------------------------

export function occurrenceCard(occurrence, state, render, { showSourceLink = false } = {}) {
  const uiLang = getAppLang();
  const card = el("article", "hadith-card");
  card.dataset.hadithOccurrence = occurrence.occurrenceId;

  const head = el("header", "hadith-card-head");
  const refs = externalReferencesFor(occurrence.occurrenceId);
  head.appendChild(el("span", "hadith-card-ref",
    refs.map((r) => `${r.scheme} ${r.displayedNumber}`).join(" · ") || occurrence.occurrenceId));
  // The opaque internal id is shown, deliberately: it is the identity, and the
  // displayed number above it is only a reference (schema §2).
  head.appendChild(el("code", "hadith-card-id", occurrence.occurrenceId));
  if (occurrence.repeatOfOccurrenceId) {
    // Clickable: a repeat's whole point is that the original is a DIFFERENT
    // occurrence with its own place in the source, and a reader told that
    // should be able to go see it rather than just read its bare id.
    const rep = el("button", "hadith-card-repeat hadith-view-source",
      t("Repeat occurrence of {id}", { id: occurrence.repeatOfOccurrenceId }));
    rep.dataset.hadithRepeat = occurrence.repeatOfOccurrenceId;
    rep.addEventListener("click", () => jumpToSource(state, render, occurrence.repeatOfOccurrenceId));
    head.appendChild(rep);
  }
  // Only where the occurrence is reached OUTSIDE its own book/chapter context
  // (a Topic index entry, a Search hit) -- inside the Collections tab the
  // reader is already looking at its source location, and the control would
  // be pure self-referential chrome.
  if (showSourceLink) {
    const src = el("button", "hadith-view-source", t("View in source"));
    src.dataset.hadithViewSource = occurrence.occurrenceId;
    src.addEventListener("click", () => jumpToSource(state, render, occurrence.occurrenceId));
    head.appendChild(src);
  }
  card.appendChild(head);

  // Arabic source text, at roughly twice the English size (see the stylesheet).
  const src = resolveText(occurrence, SOURCE_LANGUAGE);
  const ar = el("p", "hadith-arabic", src?.text ?? "");
  ar.lang = "ar"; ar.dir = "rtl";
  card.appendChild(ar);

  const isnad = el("p", "hadith-isnad", langText(occurrence.isnad, state.contentLang));
  if (state.contentLang === "ar") { isnad.lang = "ar"; isnad.dir = "rtl"; }
  card.appendChild(isnad);

  // The reader's chosen content language, with an honest fallback.
  if (state.contentLang !== SOURCE_LANGUAGE) {
    const r = resolveText(occurrence, state.contentLang);
    const block = el("div", "hadith-translation");
    if (r.isFallback) {
      const warn = el("p", "hadith-fallback");
      warn.dataset.hadithFallback = r.requestedLang;
      warn.textContent = t("No {lang} translation for this narration. Showing the Arabic source.",
        { lang: CONTENT_LANG_LABELS[r.requestedLang] });
      block.appendChild(warn);
    } else {
      block.appendChild(el("p", "hadith-translation-text", r.text));
      const a = r.attribution;
      block.appendChild(el("p", "hadith-attribution",
        t("Translation: {who}", { who: a?.translator ?? t("unattributed") })));
    }
    card.appendChild(block);
  }

  const avail = el("p", "hadith-availability",
    t("Available languages: {langs}", { langs: availableLanguages(occurrence).map((l) => CONTENT_LANG_LABELS[l]).join(", ") }));
  card.appendChild(avail);

  card.appendChild(renderTrack(occurrence, render));
  card.appendChild(renderCardCommentary(occurrence));
  return card;
}

/** Track, demo-only, and it says so every single time. */
function renderTrack(occurrence, render) {
  const box = el("div", "hadith-track");
  box.dataset.hadithTrack = occurrence.occurrenceId;
  box.appendChild(el("span", "hadith-track-label", t("Track")));

  const sel = el("select", "hadith-track-select");
  sel.setAttribute("aria-label", t("Track"));
  const current = demoTrack.get(occurrence.occurrenceId) ?? "";
  // A placeholder first, NOT the first status. STATUSES begins with
  // "not_applicable", which under I7 means "excluded from totals" -- a real
  // claim about the unit. An untracked narration must not appear to be making
  // it just because a <select> shows its first option.
  const placeholder = el("option", null, t("Not tracked"));
  placeholder.value = "";
  if (!current) placeholder.selected = true;
  sel.appendChild(placeholder);
  for (const s of STATUSES) {
    const o = el("option", null, statusLabel(s.id));
    o.value = s.id;
    if (current === s.id) o.selected = true;
    sel.appendChild(o);
  }
  sel.addEventListener("change", () => {
    if (sel.value) demoTrack.set(occurrence.occurrenceId, sel.value);
    else demoTrack.delete(occurrence.occurrenceId);
    render();
  });
  box.appendChild(sel);

  const warn = el("p", "hadith-not-saved");
  warn.dataset.hadithNotSaved = "true";
  warn.textContent = t("Preview only — nothing is saved. Hadith storage is not enabled yet.");
  box.appendChild(warn);
  return box;
}

/** Always the honest empty state, by construction -- see hadith-commentary.js. */
function renderCardCommentary(occurrence) {
  const { entries, reason } = commentaryForOccurrence(occurrence.occurrenceId);
  const box = el("div", "hadith-card-commentary");
  box.dataset.hadithCardCommentary = String(entries.length);
  box.appendChild(el("p", "hadith-note",
    entries.length === 0
      ? t("No classical explanation is linked to this narration, because it is synthetic.")
      : ""));
  box.dataset.hadithCommentaryReason = reason ?? "";
  return box;
}

// ---------------------------------------------------------------------------
// Topic view -- an additional index across collections
// ---------------------------------------------------------------------------

function renderTopic(body, state, render) {
  const uiLang = getAppLang();

  // No topic chosen yet -- list every topic, the same shape as the
  // Collections tab's own edition list, rather than opening straight into a
  // single hardcoded one. `listTopics()` already drives Explore's own
  // per-topic cards; this is the first place it also drives NAVIGATION.
  if (!state.topicId) {
    body.appendChild(el("h2", null, t("Topics")));
    const list = el("div", "hadith-list");
    for (const tp of listTopics()) {
      const row = el("button", "hadith-row");
      row.dataset.hadithTopicRow = tp.topicId;
      row.appendChild(el("span", "hadith-row-name", langText(tp.label, uiLang)));
      row.appendChild(el("span", "hadith-row-meta", `${tp.topicId} · ${t("Synthetic")}`));
      row.addEventListener("click", () => { state.topicId = tp.topicId; render(); });
      list.appendChild(row);
    }
    body.appendChild(list);
    return;
  }

  const idx = topicIndex(state.topicId);
  if (!idx) { body.appendChild(el("p", "hadith-note", t("Nothing here yet."))); return; }

  const crumbs = el("nav", "hadith-crumbs");
  const back = el("button", "hadith-crumb", t("Topics"));
  back.dataset.hadithTopicBack = "true";
  back.addEventListener("click", () => { state.topicId = null; render(); });
  crumbs.appendChild(back);
  const topicCur = el("span", "hadith-crumb-current", langText(idx.topic.label, uiLang));
  topicCur.setAttribute("aria-current", "page");
  crumbs.appendChild(topicCur);
  body.appendChild(crumbs);

  body.appendChild(el("h2", null, langText(idx.topic.label, uiLang)));

  const meta = el("div", "hadith-topic-meta");
  meta.id = "hadithTopicMeta";
  meta.appendChild(el("p", null, t("This is an index across collections. It does not change any book.")));
  // Distinct occurrences and mapping count are reported SEPARATELY and named,
  // because one occurrence reachable by two mappings must never be counted twice.
  meta.appendChild(el("p", "hadith-topic-counts",
    t("{n} distinct narrations, from {m} mappings.", { n: idx.distinctOccurrences, m: idx.mappingCount })));
  meta.appendChild(el("p", "hadith-taxonomy-revision",
    t("Taxonomy revision: {rev}", { rev: idx.taxonomyRevision })));
  if (!idx.allMappingsReviewed) {
    const w = el("p", "hadith-unreviewed");
    w.dataset.hadithUnreviewed = "true";
    w.textContent = t("These mappings have not been reviewed by a scholar.");
    meta.appendChild(w);
  }
  body.appendChild(meta);

  for (const group of idx.collections) {
    const sec = el("section", "hadith-topic-group");
    sec.dataset.hadithTopicCollection = group.collection.collectionId;
    sec.appendChild(el("h3", null, langText(group.collection.name, uiLang)));
    for (const entry of group.entries) {
      const row = el("div", "hadith-topic-entry");
      // The SOURCE heading stays visible beside the mapped topic (plan §3.1).
      row.appendChild(el("p", "hadith-topic-heading", langText(entry.sourceHeading, uiLang)));
      row.appendChild(occurrenceCard(entry.occurrence, state, render, { showSourceLink: true }));
      sec.appendChild(row);
    }
    body.appendChild(sec);
  }
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

function renderSearch(body, state, render) {
  const form = el("div", "hadith-search");
  const input = el("input", "hadith-search-input");
  input.id = "hadithSearchInput";
  input.type = "search";
  input.value = state.query;
  input.setAttribute("aria-label", t("Search"));
  input.placeholder = t("Search in Arabic, English or Bangla");
  input.addEventListener("input", () => { state.query = input.value; renderResults(); });
  form.appendChild(input);
  body.appendChild(form);

  // The result-count announcer (issue #114 Gate B). A screen reader only
  // reliably announces a change to a live region that was ALREADY in the DOM
  // before the mutation, so this element is created ONCE and updated by
  // `textContent` below -- never removed and recreated the way `out` is on
  // every keystroke. It carries ONLY the count, never a result card: putting
  // `aria-live` on `out` itself would make a screen reader announce every
  // interactive card on every keystroke too, which nobody asked for and
  // nobody wants. No new translation key -- it reuses the same "{n} results"
  // string the visible line already carried.
  const status = el("p", "hadith-note hadith-search-status");
  status.id = "hadithSearchStatus";
  status.dataset.hadithSearchStatus = "true";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  body.appendChild(status);

  const out = el("div", "hadith-search-results");
  out.id = "hadithSearchResults";
  body.appendChild(out);

  function renderResults() {
    out.textContent = "";
    const r = searchCorpus(state.query);
    if (!state.query.trim()) { status.textContent = ""; return; }
    out.dataset.hadithResultCount = String(r.results.length);
    status.textContent = t("{n} results", { n: r.results.length });
    if (r.truncated) out.appendChild(el("p", "hadith-note", t("Showing the first results only.")));
    for (const hit of r.results) {
      const wrap = el("div", "hadith-search-hit");
      // WHERE it matched, not just that it did.
      const where = [];
      if (hit.matchedLangs.length) where.push(t("in the text ({langs})", { langs: hit.matchedLangs.map((l) => CONTENT_LANG_LABELS[l]).join(", ") }));
      if (hit.matchedHeadingLangs.length) where.push(t("in the source heading ({langs})", { langs: hit.matchedHeadingLangs.map((l) => CONTENT_LANG_LABELS[l]).join(", ") }));
      const w = el("p", "hadith-match-where", where.join(" · "));
      w.dataset.hadithMatchWhere = [...hit.matchedLangs.map((l) => `text:${l}`), ...hit.matchedHeadingLangs.map((l) => `heading:${l}`)].join(",");
      wrap.appendChild(w);
      wrap.appendChild(occurrenceCard(hit.occurrence, state, render, { showSourceLink: true }));
      out.appendChild(wrap);
    }
  }
  renderResults();
}

// ---------------------------------------------------------------------------
// Explore -- demo aggregation over the synthetic corpus. It counts the SOURCE
// and the TAXONOMY, and deliberately counts no progress at all.
// ---------------------------------------------------------------------------

function renderExplore(body) {
  const agg = exploreAggregate();

  const meta = el("div", "hadith-topic-meta");
  meta.appendChild(el("p", "", t("Counts across the synthetic corpus. These describe the source and the topic index only.")));
  meta.appendChild(el("p", "", `${t("Collections")}: ${agg.totals.collections} \u00b7 ${t("Editions")}: ${agg.totals.editions} \u00b7 ${t("Narrations")}: ${agg.totals.occurrences}`));
  meta.appendChild(el("p", "", `${t("Of those, repeat occurrences")}: ${agg.totals.repeats} \u2014 ${t("a repeat is counted as its own narration, never merged by text.")}`));
  meta.appendChild(el("p", "", `${t("Taxonomy revision")}: ${agg.taxonomyRevision}`));
  body.appendChild(meta);

  // The untracked state, stated in words rather than shown as a zero. A zero
  // would read as "nothing studied yet"; the truth is that nothing durable
  // exists to count.
  const untracked = el("p", "hadith-unreviewed",
    t("No progress is counted here. Track is a preview that a reload clears, so there is nothing durable to aggregate."));
  untracked.dataset.hadithProgressAvailable = String(agg.progress.available);
  body.appendChild(untracked);

  body.appendChild(el("h3", "", t("Source hierarchy")));
  for (const c of agg.collections) {
    const row = el("div", "hadith-card");
    row.appendChild(el("p", "hadith-row-name", c.collectionId));
    for (const ed of c.editions) {
      const detail = ed.hasChapterLevel
        ? `${t("Books")}: ${ed.books} \u00b7 ${t("Chapters")}: ${ed.chapters} \u00b7 ${t("Narrations")}: ${ed.occurrences}`
        : `${t("Books")}: ${ed.books} \u00b7 ${t("no chapter level")} \u00b7 ${t("Narrations")}: ${ed.occurrences}`;
      row.appendChild(el("p", "hadith-card-head", `${ed.editionId} \u2014 ${detail}`));
    }
    body.appendChild(row);
  }

  body.appendChild(el("h3", "", t("Topics")));
  for (const tp of agg.topics) {
    const card = el("div", "hadith-card");
    card.dataset.hadithExploreTopic = tp.topicId;
    card.appendChild(el("p", "hadith-row-name", tp.topicId));
    // The two figures side by side, each labelled, with the reason they differ
    // in words -- a reader seeing 5 and 3 must not have to guess which is which.
    card.appendChild(el("p", "", `${t("Distinct narrations")}: ${tp.distinctOccurrences}`));
    card.appendChild(el("p", "", `${t("Topic mappings")}: ${tp.mappingCount}`));
    // Why the two figures differ, in words. A mapping may target a whole book
    // or chapter, so a few curatorial decisions reach many narrations --
    // mappings are normally FEWER than narrations, not more.
    card.appendChild(el("p", "hadith-topic-heading",
      t("A mapping may cover a whole book or chapter, so a few mappings can reach many narrations. The two figures are kept apart because one counts curatorial decisions and the other counts narrations.")));
    // And whether any narration was reached twice -- stated either way, so a
    // clean index is visibly clean rather than merely silent.
    card.appendChild(el("p", "hadith-topic-heading",
      tp.duplicateReaches > 0
        ? `${t("Narrations reached by more than one mapping")}: ${tp.duplicateReaches} \u2014 ${t("counted once, never twice.")}`
        : t("No narration here is reached by more than one mapping.")));
    card.appendChild(el("p", "", `${t("Spans collections")}: ${tp.spansCollections}`));
    if (!tp.allMappingsReviewed) {
      card.appendChild(el("p", "hadith-unreviewed", t("These mappings have not been reviewed by a scholar.")));
    }
    body.appendChild(card);
  }

  renderTranslationCoverage(body);
  renderTopicCoverage(body);
}

/**
 * TRANSLATION COVERAGE -- per edition and overall, how many synthetic
 * narrations carry an English or a Bangla version alongside the Arabic
 * source. Additive only -- every existing Explore row above this is
 * untouched. Extracted into its own function (integration merge of PR #103
 * and PR #118, 20 Sep 2026) to match `renderTopicCoverage()`'s own shape --
 * the two were built independently and originally differed in structure
 * only, not in what either shows.
 */
function renderTranslationCoverage(body) {
  body.appendChild(el("h3", "", t("Translation coverage")));
  const cov = translationCoverage();
  const covMeta = el("div", "hadith-topic-meta");
  covMeta.dataset.hadithCoverageTotal = String(cov.totals.occurrences);
  covMeta.appendChild(el("p", "",
    t("How many synthetic narrations carry an English or a Bangla version, alongside the Arabic source. This describes the fixture only -- it is not a measure of a real corpus.")));
  covMeta.appendChild(el("p", "hadith-topic-counts", t("Overall: {en} of {n} have English, {bn} of {n} have Bangla.",
    { en: cov.totals.withEnglish, bn: cov.totals.withBangla, n: cov.totals.occurrences })));
  body.appendChild(covMeta);
  for (const ed of cov.perEdition) {
    const row = el("div", "hadith-card");
    // Renamed from `hadithCoverageEdition` at integration (was ambiguous
    // with `renderTopicCoverage()`'s own per-edition rows, which independently
    // picked the identical attribute name for a different fact about the
    // same edition id -- see the integration report's conflict-resolution
    // section). A selector on the old bare name would now match two
    // differently-shaped elements per edition.
    row.dataset.hadithTranslationCoverageEdition = ed.editionId;
    row.appendChild(el("p", "hadith-row-name", ed.editionId));
    row.appendChild(el("p", "", t("{en} of {n} have English, {bn} of {n} have Bangla.",
      { en: ed.withEnglish, bn: ed.withBangla, n: ed.occurrences })));
    body.appendChild(row);
  }
}

/**
 * TOPIC COVERAGE -- a different question from the per-topic cards above: of
 * every narration in the corpus, how many are reached by ANY topic mapping
 * at all, and how many are not mapped to a topic yet. Additive only -- every
 * existing Explore row above this is untouched.
 */
function renderTopicCoverage(body) {
  const cov = topicCoverage();

  body.appendChild(el("h3", "", t("Topic coverage")));
  const wrap = el("div", "hadith-topic-coverage");
  wrap.dataset.hadithTopicCoverage = "true";
  wrap.appendChild(el("p", "",
    t("Of the {total} narrations in the corpus, {covered} are reachable through at least one topic mapping and {uncovered} are not mapped to any topic yet. This is distinct from the per-topic counts above, which count within one topic only.",
      { total: cov.totals.occurrences, covered: cov.totals.covered, uncovered: cov.totals.uncovered })));

  for (const ed of cov.editions) {
    const row = el("p", "hadith-topic-coverage-edition");
    // Renamed from `hadithCoverageEdition` at integration -- see
    // `renderTranslationCoverage()`'s own note above.
    row.dataset.hadithTopicCoverageEdition = ed.editionId;
    row.appendChild(document.createTextNode(`${ed.editionId} — `));
    row.appendChild(document.createTextNode(
      t("{covered} of {total} narrations in this edition are mapped to at least one topic; {uncovered} are not.",
        { covered: ed.covered, total: ed.occurrences, uncovered: ed.uncovered })));
    wrap.appendChild(row);
  }

  body.appendChild(wrap);
}

// ---------------------------------------------------------------------------
// Classical Explanations -- its OWN surface, beside the synthetic corpus
// ---------------------------------------------------------------------------

function renderCommentary(body, state) {
  const uiLang = getAppLang();
  const title = el("h2", null, PANEL_TITLE[uiLang] ?? PANEL_TITLE.en);
  body.appendChild(title);
  const ar = el("p", "hadith-panel-title-ar", PANEL_TITLE.ar);
  ar.lang = "ar"; ar.dir = "rtl";
  body.appendChild(ar);

  const why = el("p", "hadith-note");
  why.id = "hadithCommentaryScope";
  why.textContent = t("These are verified links to real narrations. They are NOT linked to the synthetic narrations above, which are not real.");
  body.appendChild(why);

  for (const entry of verifiedRegisterEntries()) {
    const perm = renderPermission(entry);
    const card = el("article", "hadith-commentary-card");
    card.dataset.hadithCommentaryMatch = entry.commentary_match_id;

    card.appendChild(el("p", "hadith-commentary-source", entry.source_reference_display));
    card.appendChild(el("p", "hadith-commentary-author", entry.author_display));
    const work = el("p", "hadith-commentary-work");
    work.appendChild(el("span", "hadith-work-en", entry.commentary_work_title_en));
    const workAr = el("span", "hadith-work-ar", entry.commentary_work_title_ar);
    workAr.lang = "ar"; workAr.dir = "rtl";
    work.appendChild(workAr);
    card.appendChild(work);
    card.appendChild(el("p", "hadith-commentary-location", entry.commentary_location));
    card.appendChild(el("p", "hadith-commentary-review", entry.review_status));

    const a = document.createElement("a");
    a.className = "hadith-commentary-link";
    a.href = entry.source_url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    // A non-breaking space before the arrow: without it the glyph wraps onto a
    // line of its own at phone width, in both languages.
    a.textContent = t("Open the commentary at the source ↗").replace(/\s+↗$/, "\u00A0↗");
    a.dataset.hadithCommentaryLink = entry.commentary_match_id;
    card.appendChild(a);

    const rights = el("p", "hadith-commentary-rights");
    rights.dataset.hadithMayShowText = String(perm.mayShowText);
    rights.textContent = t("Link only — the commentary text is not reproduced here.");
    card.appendChild(rights);

    // occurrence binding, stated rather than left to be assumed
    const bind = el("p", "hadith-commentary-binding");
    bind.dataset.hadithOccurrenceId = String(entry.narration_occurrence_id);
    bind.textContent = t("Matched by reference ({scheme} {ref}). No occurrence ID until an edition is approved.",
      { scheme: entry.source_reference_scheme, ref: entry.source_reference });
    card.appendChild(bind);

    body.appendChild(card);
  }

  const never = el("ul", "hadith-never-do");
  never.id = "hadithNeverDo";
  for (const line of NEVER_DO) never.appendChild(el("li", null, line));
  body.appendChild(never);
}

export { TAXONOMY_REVISION };
