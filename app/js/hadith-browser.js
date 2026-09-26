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
import { getAppLang } from "./prefs.js";
import { STATUSES, statusLabel } from "./unit-keys.js";
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

export function mountHadithBrowser(root, { mount = "standalone" } = {}) {
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

  function render() {
    root.textContent = "";
    root.appendChild(syntheticBanner());
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
  const landing = body.querySelector(".hadith-crumbs > :last-child") || body.querySelector("h2");
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
// STUDY WIRING (Notes/bookmark/"Studied") IS DELIBERATELY NOT BUILT. The
// issue asked for it through `buildUnitKey.hadith("hadeethenc", id)`, but
// that call is an OWNER CONTROL GATE this repository already enforces
// mechanically: tools/i18n-verify/hadith-gate-contracts.mjs's "C2" checks
// assert, by NAME, that `buildUnitKey.hadith(...)` is applied by exactly one
// pre-existing, non-Hadith-owned surface (app/records.html) and by nothing
// else anywhere in app/ or app/js/ -- because the key it builds today is
// NAME-keyed ("hadith:hadeethenc:<id>"), which the Hadith H1 register's own
// section 5 already records as contradicting I5 ("units are keyed by
// permanent ID, never by name"), and the Owner has not yet chosen between
// that live shape and the proposed permanent edition/ordinal form. Adding a
// second caller here would be this stream pre-empting that undecided
// Owner Control Gate, which is exactly what C2 exists to catch -- so rather
// than cross it (or dodge its filename-based half by naming this file
// something that does not start with "hadith-"), every card says plainly,
// in words, why Notes/bookmark/Studied are not offered yet.
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

  // Notes/bookmark/"Studied" -- see the section header comment above. A
  // control that explains itself beats one that is silently absent.
  const gate = el("p", "hadith-not-saved");
  gate.dataset.hadeethencStudyGate = "true";
  gate.textContent = t("Notes, bookmarking and marking this hadith as studied are not enabled yet — they need a decision about how a hadith is permanently identified, which the Owner has not made yet.");
  card.appendChild(gate);

  return card;
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

function renderCollections(body, state, render) {
  const uiLang = getAppLang();

  if (!state.editionId) {
    body.appendChild(renderHadeethEncSource(state));
    body.appendChild(el("h2", null, t("Synthetic pilot collections")));
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
