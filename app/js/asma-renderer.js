// Phase 13 round 1 — Asma ul Husna renderer.
//
// I2: pure renderer, HTML in/out, never touches Firebase -- same contract
// topic-renderer.js/ayah-renderer.js/way-modal.js already hold. A flat grid
// over asma-data.js's 99 fixed entries, not a browsable tree (there's
// nothing to browse into -- see catalogue-data.js's own note on why
// asma_ul_husna is a single anchor subject, not 99 subject nodes).

// Full app translation, phase 6 (14 Aug 2026). Three things this file used
// to read straight off `.en` -- the meaning on a card, the meaning on the
// detail panel, and the meaning in the screensaver's text-only slide -- now
// go through langText(), which is what makes the 99 Bangla meanings in
// bn.js actually reach the screen. The NAME itself goes through asmaName(),
// because a Latin transliteration is unreadable to a Bangla-only reader and
// was simply dead space on a card that only has three lines.

import { STATUS_COLORS } from "./mastery-wheel.js";
import { statusLabel } from "./unit-keys.js";
import { t, num, asmaName } from "./i18n.js";
import { langText } from "./lang.js";
import { getAppLang } from "./prefs.js";
import { confirmStateLabel } from "./labels.js";
import { parseAsmaRef } from "./asma-ref-parser.js";

function escapeHtml(s) {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** statusByNumber: Map(number -> statusId|null). */
export function renderAsmaGrid(names, statusByNumber = new Map()) {
  const cards = names.map((n) => {
    const statusId = statusByNumber.get(n.number) ?? null;
    const chip = statusId
      ? `<span class="asma-status-chip" style="background:${STATUS_COLORS[statusId] ?? STATUS_COLORS.not_started}">${statusLabel(statusId)}</span>`
      : `<span class="asma-status-chip asma-status-unclaimed">${statusLabel("not_started")}</span>`;
    // data-number stays the bare number -- openNameDetail() reads it back
    // with Number(). Only the DRAWN number goes through num().
    return `<button type="button" class="asma-card" data-number="${n.number}">
      <span class="asma-card-number">${num(n.number)}</span>
      <span class="asma-card-arabic">${escapeHtml(n.arabic)}</span>
      <span class="asma-card-translit">${escapeHtml(asmaName(n.number, n.transliteration))}</span>
      <span class="asma-card-meaning">${escapeHtml(langText(n.meaning, getAppLang()))}</span>
      ${chip}
    </button>`;
  });
  return `<div class="asma-grid">${cards.join("")}</div>`;
}

/** Asma Collections round -- a resolved entry (js/asma-collections.js's
    resolveAsmaEntry()) can be a canonical Name (1..99, unchanged shape) OR
    one of the ~33 extras beyond it, which carry their own arabic/bnName
    directly rather than routing through asmaName()/langText(). This is the
    one place both are told apart for DISPLAY -- everything else (claiming,
    bookmarking, the unit key) already treats every number the same way. */
export function asmaEntryDisplayName(entry) {
  if (!entry.isExtra) return asmaName(entry.number, entry.transliteration);
  return getAppLang() === "bn" ? entry.bnName || entry.transliteration : entry.transliteration;
}

/** The meaning shown for one entry -- a canonical Name's own Bangla
    OVERRIDE (js/asma-collections.js's nameOverrides, the owner's own
    correction to a canonical Name's wording) wins over asma-data.js's
    langText()-routed meaning when the app is in Bangla; English is never
    overridden, since the override is a Bangla correction only. An extra's
    own `meaning` already carries its real bn text directly (no bn.js
    lookup for content that has no English original to key one off). */
export function asmaEntryMeaningText(entry) {
  const lang = getAppLang();
  if (!entry.isExtra && lang === "bn" && entry.bnOverride) return entry.bnOverride;
  // Round -- 30 Aug 2026: the owner's own English correction to a
  // CANONICAL Name's meaning, additive, same shape as bnOverride above.
  if (!entry.isExtra && lang === "en" && entry.enOverride) return entry.enOverride;
  return langText(entry.meaning, lang);
}

export function renderAsmaDetail(entry, claimEntry, { isBookmarked = false } = {}) {
  // Was a raw claimedStatus with its underscores swapped for spaces, and a
  // raw confirmState id -- both meaningless in either language. They go
  // through the shared label helpers now, and the whole line is ONE
  // translatable sentence rather than an English word concatenated onto
  // two values, because the order reverses in Bangla.
  const statusLine = claimEntry
    ? t("Status: {status} · {confirm}", {
        status: `<strong>${escapeHtml(statusLabel(claimEntry.claimedStatus))}</strong>`,
        confirm: escapeHtml(confirmStateLabel(claimEntry.confirmState)),
      })
    : t("Not started yet.");
  // Canonical Names keep the exact "N of 99" counter byte-for-byte -- the
  // 99-grid's own promise is untouched. An extra Name (>= 100) has no
  // sensible "of 99" to show; its own beyond-99/phrase/weak badges say what
  // it is instead.
  const numberLine = entry.isExtra
    ? `#${num(entry.number)}`
    : t("{n} of {total}", { n: num(entry.number), total: num(99) });
  const badges = [
    entry.isExtra ? `<span class="asma-detail-badge beyond99">${escapeHtml(t("Beyond the 99"))}</span>` : "",
    entry.isPhrase ? `<span class="asma-detail-badge phrase">${escapeHtml(t("Honorific phrase"))}</span>` : "",
    entry.weak ? `<span class="asma-detail-badge weak">${escapeHtml(t("Weak / disputed hadith"))}</span>` : "",
  ].filter(Boolean).join("");
  return `<div class="asma-detail">
    <div class="asma-detail-number">${numberLine}</div>
    <div class="asma-detail-arabic">${escapeHtml(entry.arabic)}</div>
    <h2>${escapeHtml(asmaEntryDisplayName(entry))} <button type="button" id="bookmarkAsmaBtn" class="topic-bookmark-btn${isBookmarked ? " active" : ""}" title="${isBookmarked ? t("Remove bookmark") : t("Bookmark this")}">${isBookmarked ? "★" : "☆"}</button></h2>
    <p class="asma-detail-meaning">${escapeHtml(asmaEntryMeaningText(entry))}</p>
    ${badges ? `<p class="asma-detail-badges">${badges}</p>` : ""}
    ${renderAsmaXrefBlock(entry)}
    <p>${statusLine}</p>
    <button type="button" id="trackAsmaBtn">${t("Track my progress")}</button>
    <button type="button" id="posterAsmaBtn" class="secondary">🖼 ${t("Poster")}</button>
  </div>`;
}

/** Round 2 -- the Qur'an/Hadith reference chips. A Qur'an citation is a
    real link (quranrevival.html's own new "?goto=surah:ayah" deep link,
    js/asma-ref-parser.js's own parsed output) that jumps straight to that
    āyah's real reading screen, opened in the same tab (going from one
    module to another inside the same live app, not out to a different
    generation of it -- unlike the "Legacy App" link, which does open in a
    new tab for exactly that reason). A Hadith citation stays plain text:
    this app has no canonical hadith-text reader to jump to yet, a real,
    disclosed gap rather than a broken link. Hadith collection names are
    left exactly as the owner's own file wrote them, the same "a proper
    noun is never translated" rule reciters' own names already follow. If
    the reference text parses to nothing at all (a plain descriptive
    sentence, or an unnumbered placeholder), the raw text still shows so
    nothing the owner wrote simply vanishes. */
/** Exported (Asma-in-Explore round) so quranrevival.html can reuse the same
    real reference parsing/chip markup for its own Asma ul Husna Explore
    drill and Note-view References field, rather than a second copy of it.
    `inPage: true` swaps the Qur'an chip from a real `<a href>` (asma-study.html's
    own cross-PAGE navigation, unchanged default) to a `data-asma-xref-jump`
    button -- a plain link would reload quranrevival.html even though the
    reference is opening ON quranrevival.html, throwing away everything
    already loaded there; the caller wires the button to an in-page jump
    instead (see quranrevival.html's own goToAyahFromAsmaX()). */
export function renderAsmaXrefBlock(entry, { inPage = false } = {}) {
  if (!entry.ref) return "";
  const citations = parseAsmaRef(entry.ref);
  if (!citations.length) {
    return `<p class="asma-detail-ref">${escapeHtml(entry.ref)}</p>`;
  }
  const chips = citations
    .map((c) => {
      if (c.kind === "quran") {
        const label = t("Qur'an {ref}", { ref: `${num(c.surah)}:${num(c.ayah)}` });
        if (inPage) {
          return `<button type="button" class="asma-xref-chip quran" data-asma-xref-jump="${c.surah}:${c.ayah}">📖 ${escapeHtml(label)}</button>`;
        }
        const href = `quranrevival.html?goto=${c.surah}:${c.ayah}`;
        return `<a class="asma-xref-chip quran" href="${escapeHtml(href)}">📖 ${escapeHtml(label)}</a>`;
      }
      const gradeText = c.grade ? ` (${escapeHtml(c.grade)})` : "";
      return `<span class="asma-xref-chip hadith">📜 ${escapeHtml(c.collection)} ${escapeHtml(num(c.number))}${gradeText}</span>`;
    })
    .join("");
  return `<div class="asma-xref-block">
    <div class="asma-xref-label">${escapeHtml(t("Related Ayat & Hadith"))}</div>
    <div class="asma-xref-row">${chips}</div>
  </div>`;
}

/** Asma Collections round -- one row per Name/phrase in the currently open
    group, the same "way-row" shape QCR's own list already uses. entries:
    [{ key: "name:N", entry: resolveAsmaEntry() result, statusId }].
    otherActiveCollections is only needed when manageOn (the Move-to
    picker). Never touches Firebase (I2) -- the controller resolves
    everything and hands it in already-shaped. */
export function renderAsmaCollectionListHtml(entries, { manageOn = false, otherCollections = [] } = {}) {
  if (!entries.length) return `<p class="hint">${escapeHtml(t("No Names in this group yet."))}</p>`;
  return entries
    .map(({ key, entry, statusId }) => {
      const badges = [
        entry.isExtra ? `<span class="asma-item-badge beyond99">${escapeHtml(t("beyond 99"))}</span>` : "",
        entry.isPhrase ? `<span class="asma-item-badge phrase">${escapeHtml(t("phrase"))}</span>` : "",
        entry.weak ? `<span class="asma-item-badge weak">${escapeHtml(t("weak"))}</span>` : "",
      ].filter(Boolean).join("");
      const manageRow = manageOn
        ? `<div class="asma-way-manage">
            <select data-asma-move="${escapeHtml(key)}">
              <option value="">${escapeHtml(t("Move to…"))}</option>
              ${otherCollections.map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(langText(c.title, getAppLang()))}</option>`).join("")}
            </select>
            <button type="button" class="asma-icon-btn" data-asma-edit-bn="${escapeHtml(key)}" title="${escapeHtml(t("Edit Bangla wording"))}">✎</button>
            ${entry.isExtra ? `<button type="button" class="asma-icon-btn danger" data-asma-archive-extra="${escapeHtml(key)}" title="${escapeHtml(entry.status === "archived" ? t("Restore") : t("Archive"))}">${entry.status === "archived" ? "↺" : "🗄"}</button>` : ""}
            <button type="button" class="asma-icon-btn danger" data-asma-remove="${escapeHtml(key)}" title="${escapeHtml(t("Remove from this group"))}">×</button>
          </div>`
        : "";
      return `<div class="way-row asma-way-row">
        <button type="button" class="way-click" data-asma-jump="${escapeHtml(key)}">
          <span class="badge">#${num(entry.number)}</span>
          <span class="name">${escapeHtml(asmaEntryDisplayName(entry))}</span>
          <span class="asma-status-chip" style="background:${STATUS_COLORS[statusId] ?? STATUS_COLORS.not_started}">${escapeHtml(statusLabel(statusId))}</span>
        </button>
        ${badges ? `<span class="asma-way-badges">${badges}</span>` : ""}
        <span class="asma-way-meaning">${escapeHtml(asmaEntryMeaningText(entry))}</span>
        ${manageRow}
      </div>`;
    })
    .join("");
}

/** Screensaver slide -- a poster (asma-posters.js entry) if given, otherwise a text-only fallback built from asma-data.js. Either way, purely decorative -- no claim/confirm affordance here. */
export function renderAsmaScreensaverSlide(poster, fallbackName) {
  if (poster) {
    // The poster's own label is the catalogue key -- its transliteration
    // convention differs from asma-data.js's, so these are translated as
    // their own set of captions rather than matched to a Name by number.
    // The alt text is translated too: a screen reader in Bangla should not
    // read out a Latin transliteration.
    const caption = t(poster.label);
    return `<div class="asma-screensaver-slide">
      <img src="${escapeHtml(poster.url)}" alt="${escapeHtml(caption)}" class="asma-screensaver-img" />
      <div class="asma-screensaver-caption">${escapeHtml(caption)}</div>
    </div>`;
  }
  const fallbackLabel = fallbackName
    ? asmaName(fallbackName.number, fallbackName.transliteration)
    : "";
  return `<div class="asma-screensaver-slide asma-screensaver-textonly">
    <div class="asma-screensaver-arabic">${escapeHtml(fallbackName?.arabic ?? "")}</div>
    <div class="asma-screensaver-caption">${escapeHtml(fallbackLabel)} — ${escapeHtml(langText(fallbackName?.meaning, getAppLang()))}</div>
  </div>`;
}

/** Round 3 -- the A4 poster, live-rendered from the same data every other
    screen already reads (never a stored image file, per the owner's own
    choice: "whatever is easy" turned out to mean this needs no generation
    step, no storage and can never drift from a later correction). One
    function, two call sites: `openPosterView()` wraps this once, full
    size, with a Print button (window.print() against @media print rules
    that hide everything else -- see asma-study.html's own copy of that
    rule); the screensaver wraps it again, smaller, as one slide among the
    93 existing photo-posters (variant "screensaver" vs "standalone" only
    changes sizing, never the content). extraNames/overrides are already
    resolved into `entry` by the caller (resolveAsmaEntry) -- this stays a
    pure renderer either way (I2). */
export function renderAsmaPosterHtml(entry, variant = "standalone") {
  const refLine = entry.ref ? `<div class="poster-ref">${escapeHtml(entry.ref)}</div>` : "";
  return `<div class="asma-poster asma-poster-${variant}">
    <div class="poster-eyebrow">${escapeHtml(t("Asma ul Husna"))}</div>
    <div class="poster-main">
      <div class="poster-ar">${escapeHtml(entry.arabic)}</div>
      <div class="poster-translit">${escapeHtml(asmaEntryDisplayName(entry))}</div>
    </div>
    <div class="poster-bn">${escapeHtml(asmaEntryMeaningText(entry))}</div>
    ${refLine}
    <div class="poster-footer">${escapeHtml(t("QuranRevival · Asma ul Husna"))}</div>
  </div>`;
}
