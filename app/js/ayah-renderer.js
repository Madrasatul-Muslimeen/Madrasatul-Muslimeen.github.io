// F-047, F-049, F-050, F-060 — the `ayah` renderer (Architecture s5: shared
// by every Approach that studies Quran text; Layout A panels are switched on
// per trackable.panels[], never hardcoded per Approach).
//
// I2: this is a renderer, not a module — it takes data and options in, HTML
// out. It never calls records.js/activity.js itself; the page wiring it up
// does that.

import { t, num } from "./i18n.js";
import { posLabel } from "./labels.js";

/** Escapes then re-expands only the exact tajweed tags quran.com emits — never trusts raw HTML beyond that whitelist. */
export function tajweedRawToSafeHtml(raw) {
  if (!raw) return "";
  const escaped = raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return escaped
    .replace(/&lt;tajweed class=([a-zA-Z_]+)&gt;/g, '<span class="tajweed-$1">')
    .replace(/&lt;\/tajweed&gt;/g, "</span>")
    .replace(/&lt;span class=end&gt;/g, '<span class="tajweed-end">')
    .replace(/&lt;\/span&gt;/g, "</span>");
}

function escapeHtml(s) {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
// Arabic-Indic (U+0660-0669) -- the digits a mushaf itself prints, and what
// the owner asked for: "enable Arabic Ayah text number to be shown Arabic."
const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

/** Fix round -- a translation's own leading ayah number is shown in that
    TRANSLATION's own script, not the app's current display language: the
    English block always reads plain "1", the Bangla block always reads
    "১", regardless of whether the app itself happens to be in English or
    Bangla right now. Deliberately NOT the same as i18n.js's num() (which
    follows the app language) -- a Bangla-only reader who has the
    ENGLISH translation showing alongside the Bangla one must still be able
    to read that block's own number. */
export function digitsForLang(value, lang) {
  const s = String(value);
  if (lang === "bn") return s.replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
  if (lang === "ar") return s.replace(/[0-9]/g, (d) => AR_DIGITS[Number(d)]);
  return s;
}

// Fix round -- the pulled data itself embeds "بِسْمِ اللَّهِ الرَّحْمَٰنِ
// الرَّحِيمِ" as a literal PREFIX of ayah 1's own uthmaniText for every surah
// except 9 (checked directly, not assumed: `tools/quran-data-pull/output`'s
// own surah-1.json/surah-2.json/... swept across a dozen surahs) -- so
// prepending our own decorative Bismillah heading (bismillahHtmlFor(), in
// quranrevival.html) before ayah 1's own plain-text body genuinely showed it
// TWICE, exactly as the owner reported. tajweedText and every translation
// were checked the same way and never carry the embedded prefix (Tajweed
// mode was never affected) -- only the plain uthmaniText path needed this.
// Surah 1 is the one real exception: its own ayah 1 IS the Bismillah verse,
// nothing after it, so stripping the prefix there would leave an empty
// ayah -- stripLeadingBismillah() falls back to the original text whenever
// nothing real is left after the prefix, which is exactly that case.
const BISMILLAH_PREFIX = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ".normalize("NFC");
export function stripLeadingBismillah(text) {
  if (!text) return text;
  const normalized = text.replace(/^\uFEFF/, "").normalize("NFC");
  if (!normalized.startsWith(BISMILLAH_PREFIX)) return text;
  const rest = normalized.slice(BISMILLAH_PREFIX.length).replace(/^[\s ]+/, "");
  return rest || text;
}

// Issue #189 -- word-tap in the NORMAL flowing Arabic (not just the separate
// Word by Word panel). Quranic small-high marks (the waqf/pause signs, the
// rub-el-hizb "۞" and the place-of-sajdah sign) print as their OWN
// space-delimited token in uthmaniText, but the word-by-word data source
// folds each one into the ADJACENT real word instead of giving it its own
// entry -- confirmed against the whole pulled corpus
// (tools/quran-data-pull/output/surahs, all 114 files, 6,236 ayahs): a
// naive split on spaces misaligns 44% of ayahs against `words[]` before this
// fold-back, 0.05% after it (see splitPlainArabicWords's own comment for
// what's left). A LEADING mark (rub-el-hizb, which opens some ayahs) has no
// preceding token to fold onto, so it folds forward onto the first word
// instead.
const QURANIC_MARK_ONLY = /^[ۖ-ۜ۞۩]+$/;

/**
 * Splits `rawText` (plain Uthmani text, already Bismillah-stripped where
 * that applies -- no HTML tags) into one segment per entry of `words`, in
 * the same left-to-right order as `words[].position`. Returns `null` --
 * never a best-effort guess -- when the count still doesn't land exactly on
 * `words.length` after folding back the marks above: measured across the
 * whole pulled corpus, 3 of 6,236 ayahs (surah 37:130's "إِلْ يَاسِينَ",
 * one compound name the word API keeps as a single word despite its own
 * internal space; and surah 95:1/97:1, where stripLeadingBismillah() itself
 * fails to match a variant form of the Bismillah prefix in the pulled data --
 * a bug that already exists in today's single-block rendering for those two
 * ayahs, pre-existing and unrelated to this round). Callers MUST fall back
 * to the untappable single-block rendering when this returns null, rather
 * than ever risk a word landing on the wrong occurrence id.
 */
export function splitPlainArabicWords(rawText, words) {
  if (!words?.length || !rawText) return null;
  const tokens = rawText.trim().split(/ +/).filter(Boolean);
  const merged = [];
  let leadingMarks = [];
  for (const tok of tokens) {
    const isMark = QURANIC_MARK_ONLY.test(tok);
    if (isMark && merged.length === 0) {
      leadingMarks.push(tok);
    } else if (isMark) {
      merged[merged.length - 1] += " " + tok;
    } else if (leadingMarks.length) {
      merged.push(leadingMarks.join(" ") + " " + tok);
      leadingMarks = [];
    } else {
      merged.push(tok);
    }
  }
  if (leadingMarks.length) merged.push(leadingMarks.join(" "));
  return merged.length === words.length ? merged : null;
}

/** One tappable word inside the normal flowing Arabic (Read and Note view
    alike) -- same occurrence-id shape and the same "arabic — gloss"
    aria-label pattern renderWordByWordPanel()'s own clickable chip uses
    (I11: the spoken name follows the reader's own chosen gloss language,
    never a hardcoded English fallback). The CSS reset for this button lives
    in the stylesheet (`button.ayah-word-clickable`), not here. */
export function arabicWordButtonHtml(segmentText, word, surahNumber, ayahNum, langs) {
  const occurrenceId = `quran-word-occurrence:v1:${surahNumber}:${ayahNum}:${word.position}`;
  const spokenGloss = langs?.map((l) => word.translation?.[l]).find(Boolean)
    || word.translation?.en || word.translation?.bn || t("Quran word");
  const accessibleName = escapeHtml(`${word.arabic} — ${spokenGloss}`);
  return `<button type="button" class="ayah-word-clickable" data-word-occurrence="${occurrenceId}" data-surah="${surahNumber}" data-ayah="${ayahNum}" data-position="${word.position}" aria-label="${accessibleName}">${escapeHtml(segmentText)}</button>`;
}

/** Panel: the Arabic script itself, plain or tajweed-colour-coded (F-049 toggle).
    Fix round: the ayah number used to show trailing and only in the
    non-tajweed path (tajweed's own embedded end-marker is a different,
    Arabic-digit glyph, easy to miss) -- now a plain, always-present badge
    BEFORE the text, in every setting, matching the owner's own reference
    screenshot and the equivalent fix in ayah-note-renderer.js's Note view.
    Issue #189 -- when `wordCardInteractive` and a `surahNumber` are given,
    the PLAIN branch (tajweed off) renders one <button> per word instead of
    one escaped block, each carrying the click target the shared
    readView/noteView listener already recognises (openWordCard() needs no
    new code at all). The TAJWEED branch is deliberately left as one block,
    investigated and NOT split: tajweed colouring in the pulled data
    routinely spans a word boundary (idgham/ikhfa/iqlab -- an assimilation
    rule colours the last letter of one word together with the first of the
    next, e.g. surah 2:2's own
    `<tajweed class=idgham_wo_ghunnah>دًى ل</tajweed>` -- measured across the
    whole corpus, on ~65% of all ayahs), so there is no space to safely split
    ON without either cutting a `<tajweed>` span in half (corrupting the
    markup and silently losing colour on whichever letter lands on the wrong
    side) or merging words together in a way this data cannot disambiguate.
    That needs a PER-WORD tajweed dataset that does not exist here. The
    separate Word-by-Word panel is unaffected by this toggle at all (it
    never used tajweed markup to begin with) and stays tappable either
    way. */
export function renderArabicPanel(ayah, { tajweedOn, wordCardInteractive, surahNumber, langs } = {}) {
  const clickable = wordCardInteractive && Number.isInteger(surahNumber) && !!ayah.words?.length;
  let body;
  if (tajweedOn && ayah.tajweedText) {
    body = tajweedRawToSafeHtml(ayah.tajweedText);
  } else {
    // Fix round -- ayah 1's own text is stripped of its embedded Bismillah
    // prefix here, since the decorative heading above (bismillahHtmlFor())
    // already shows it once. Tajweed's own text never carried the prefix in
    // the first place, so that branch is untouched.
    const plainSource = ayah.ayah === 1 ? stripLeadingBismillah(ayah.uthmaniText) : ayah.uthmaniText;
    const segments = clickable ? splitPlainArabicWords(plainSource, ayah.words) : null;
    body = segments
      ? segments.map((seg, i) => arabicWordButtonHtml(seg, ayah.words[i], surahNumber, ayah.ayah, langs)).join(" ")
      : escapeHtml(plainSource);
  }
  // Fix round -- the Arabic block's own number is in ARABIC-INDIC digits
  // (٠١٢٣٤٥٦٧٨٩), always, whatever the app's display language happens to be.
  // Exactly the rule digitsForLang() already encoded for the two translation
  // blocks: a block's number belongs to that block's own script, so an
  // English-mode reader still sees ١٠ beside the Arabic and a Bangla-mode
  // reader still sees ١٠ there and ১০ beside the Bangla.
  // Issue #295 -- the number badge is a real <button> now (the Ayah Card's
  // own third entry point, "tap the āyah number badge"), carrying the SAME
  // plain "surah:ayah" shape openAyahActionSheet() already accepts from the
  // Mushaf marker and the Word Card's own "This āyah ⋯" button -- one
  // normaliser, three doors in. Only reachable when wordCardInteractive AND
  // a surahNumber are given (the same precondition the word buttons above
  // already require): the badge's own click target must never appear on a
  // render this file cannot also identify by surah, or the sheet would open
  // on the wrong āyah. Sized and positioned in CSS exactly as the old
  // `<span>` was -- turning it into a button changes nothing about the
  // row's own measured layout.
  const numBadge = clickable
    ? `<button type="button" class="ayah-num-badge" data-ayah-num-badge="${surahNumber}:${ayah.ayah}" aria-label="${escapeHtml(t("This āyah"))}">${digitsForLang(ayah.ayah, "ar")}</button>`
    : `<span class="ayah-num-badge">${digitsForLang(ayah.ayah, "ar")}</span>`;
  return `<div class="ayah-num-row">${numBadge}</div><div class="ayah-arabic" dir="rtl" lang="ar">${body}</div>`;
}

/** Panel: translation text, in whichever language(s) are asked for (F-060 —
    Bangla, alongside English). Fix round -- every translation line now
    carries the SAME leading ayah-number badge the Arabic panel already
    has, in that translation's own digit script (digitsForLang()). */
export function renderTranslationPanel(ayah, langs = ["en"]) {
  return langs
    .map((lang) => {
      const text = ayah.translations?.[lang];
      if (!text) return "";
      const cls = lang === "bn" ? "ayah-translation ayah-translation-bn" : "ayah-translation";
      return `<div class="ayah-num-row"><span class="ayah-num-badge">${digitsForLang(ayah.ayah, lang)}</span></div><div class="${cls}" ${lang === "bn" ? 'lang="bn"' : ""}>${escapeHtml(text)}</div>`;
    })
    .join("");
}

/**
 * Panel: word-by-word (F-050) — per-word Arabic, transliteration and gloss.
 * "Two panels, not one" (Architecture, carried features): this renders ONLY
 * the word-by-word strip; renderRootPanel/renderDerivativesPanel below are
 * the other two, separate panels over the same word list.
 */
export function renderWordByWordPanel(ayah, { langs = ["en"], interactive = false, surahNumber = null } = {}) {
  if (!ayah.words?.length) return `<div class="wbw-empty">${t("No word-by-word data for this ayah.")}</div>`;
  const chips = ayah.words
    .map((w) => {
      const clickable = interactive && Number.isInteger(surahNumber);
      const contentTag = clickable ? "span" : "div";
      const glosses = langs
        .map((lang) => {
          const text = w.translation?.[lang];
          if (!text) return "";
          const cls = lang === "bn" ? "wbw-gloss wbw-gloss-bn" : "wbw-gloss";
          return `<${contentTag} class="${cls}" ${lang === "bn" ? 'lang="bn"' : ""}>${escapeHtml(text)}</${contentTag}>`;
        })
        .join("");
      // Shell round 24 -- the transliteration is a LATIN-script pronunciation
      // aid, so it belongs with the English side and follows the same choice.
      // The owner's report: every control said Bangla, yet the chips still
      // printed `tabaraka`. "বাংলা only" has to mean only Bangla, and a Latin
      // line is unreadable to exactly the person this app's Bangla is for.
      // (A Bangla-script transliteration would be a different thing entirely
      // -- the pulled data has no such field, only the Latin one.)
      const translit = langs.includes("en")
        ? `<${contentTag} class="wbw-translit">${escapeHtml(w.transliteration)}</${contentTag}>`
        : "";
      const occurrenceAttrs = clickable
        ? ` data-word-occurrence="quran-word-occurrence:v1:${surahNumber}:${ayah.ayah}:${w.position}" data-surah="${surahNumber}" data-ayah="${ayah.ayah}"`
        : "";
      const tag = occurrenceAttrs ? "button" : "div";
      const type = occurrenceAttrs ? ' type="button"' : "";
      // I11 -- a screen reader's ONLY name for this button is its aria-label,
      // so it follows the reader's language like any other visible text. It
      // used to hardcode an English "Quran word" fallback and to prefer the
      // English gloss outright, which read the wrong language aloud to
      // exactly the reader the Bangla is for. Prefers the gloss languages
      // already chosen for this panel, in their own order.
      const spokenGloss = langs.map((l) => w.translation?.[l]).find(Boolean)
        || w.translation?.en || w.translation?.bn || t("Quran word");
      const accessibleName = occurrenceAttrs ? ` aria-label="${escapeHtml(`${w.arabic} — ${spokenGloss}`)}"` : "";
      return `<${tag}${type} class="wbw-word${occurrenceAttrs ? " wbw-word-clickable" : ""}" data-position="${w.position}"${occurrenceAttrs}${accessibleName}>
        <${contentTag} class="wbw-arabic" dir="rtl" lang="ar">${escapeHtml(w.arabic)}</${contentTag}>
        ${translit}
        ${glosses}
      </${tag}>`;
    })
    .join("");
  return `<div class="wbw-strip">${chips}</div>`;
}

/**
 * Panel: Root — the third of the word-by-word panels (Word by Word,
 * Root, Derivatives, each its own choice now). Shows each word's ROOT
 * letters and how many times that root occurs across the whole Quran
 * (rootCount, pre-computed at data-pull time from the Quranic Arabic
 * Corpus so this never needs to load the corpus client-side). Per-word
 * occurrence lists across surahs aren't loaded here (would mean loading
 * more than the one open surah) — see roots-index.json (a bounded,
 * separate static file) for that lookup once built.
 */
export function renderRootPanel(ayah) {
  if (!ayah.words?.length) return `<div class="wbw-empty">${t("No morphology data for this ayah.")}</div>`;
  const rows = ayah.words
    .filter((w) => w.morphology?.root)
    .map(
      (w) => `<div class="root-row" data-position="${w.position}">
        <div class="root-word" dir="rtl" lang="ar">${escapeHtml(w.arabic)}</div>
        <div class="root-root" dir="rtl" lang="ar">${escapeHtml(w.morphology.root)}<span class="root-count">${num(w.morphology.rootCount)}×</span></div>
      </div>`
    )
    .join("");
  return `<div class="root-deriv-strip root-panel">${rows || `<div class="wbw-empty">${t("No morphology data for this ayah.")}</div>`}</div>`;
}

/**
 * Panel: Derivatives — the fourth panel, the word's own DERIVED form:
 * its part of speech and lemma (the dictionary/inflected form this
 * particular word takes, derived from the root Root shows separately).
 * Shell round -- split out of Root on the owner's own report that the
 * two "appeared together, merged" the same way Word by Word and Root
 * used to before round 27 split those; same shape, one round later.
 */
export function renderDerivativesPanel(ayah) {
  if (!ayah.words?.length) return `<div class="wbw-empty">${t("No morphology data for this ayah.")}</div>`;
  const rows = ayah.words
    .filter((w) => w.morphology)
    .map(
      (w) => `<div class="root-row" data-position="${w.position}">
        <div class="root-word" dir="rtl" lang="ar">${escapeHtml(w.arabic)}</div>
        <div class="root-pos">${escapeHtml(posLabel(w.morphology.pos))}</div>
        ${w.morphology.lemma ? `<div class="root-lemma" dir="rtl" lang="ar">${escapeHtml(w.morphology.lemma)}</div>` : ""}
      </div>`
    )
    .join("");
  return `<div class="root-deriv-strip derivatives-panel">${rows || `<div class="wbw-empty">${t("No morphology data for this ayah.")}</div>`}</div>`;
}

/**
 * Assembles whichever panels a trackable's panels[] (Layout A) actually
 * calls for, in a fixed, predictable order -- "adding approach 31 is a row
 * of data, not a build" only holds if this switch never grows per-Approach
 * special cases.
 */
// Shell round 27 split "rootDerivatives" out of "wordByWord". They used to be
// one panel, so asking for word-by-word always got the grammar table with it --
// the owner's "should show only WbW, not with the entire derivatives at the
// same time". A later round split "rootDerivatives" itself into "root" and
// "derivatives" for the same reason, on the same report: root and derivatives
// still appeared together, merged in one panel/one toggle. Three choices now,
// not two, and an Approach that declares "wordByWord" (catalogue-data.js)
// still means the words alone, which is what that name says.
const PANEL_ORDER = ["text", "tajweed", "wordByWord", "root", "derivatives", "notes", "reflection", "writing", "checklist"];
const PANEL_RENDERERS = {
  text: (ayah, opts) => renderArabicPanel(ayah, opts) + renderTranslationPanel(ayah, opts.langs),
  tajweed: () => "", // tajweed is a toggle on the text panel (opts.tajweedOn), not a separate panel
  // wbwLangs, if given, overrides langs for this panel only -- lets the
  // caller offer an explicit word-by-word language choice independent of
  // the ayah translation panel's language (owner request, 5 Aug 2026).
  wordByWord: (ayah, opts) => renderWordByWordPanel(ayah, { langs: opts.wbwLangs ?? opts.langs, interactive: opts.wordCardInteractive, surahNumber: opts.surahNumber }),
  root: (ayah) => renderRootPanel(ayah),
  derivatives: (ayah) => renderDerivativesPanel(ayah),
  notes: () => `<textarea class="panel-notes" placeholder="${t("Notes")}"></textarea>`,
  reflection: () => `<textarea class="panel-reflection" placeholder="${t("Reflection")}"></textarea>`,
  writing: () => `<div class="panel-writing"><textarea placeholder="${t("Write it out here")}"></textarea></div>`,
  checklist: () => `<label class="panel-checklist"><input type="checkbox" /> Done</label>`,
  // audio/loop/timer are transport controls wired up by audio-player.js, not
  // static HTML blocks -- the caller mounts them separately, keyed off the
  // same panels[] list.
};

export function renderLayoutA(ayah, panels, opts = {}) {
  return PANEL_ORDER.filter((p) => panels.includes(p))
    .map((p) => PANEL_RENDERERS[p]?.(ayah, opts) ?? "")
    .filter(Boolean)
    .join("\n");
}
