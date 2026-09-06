// Shell round 20 (17 Aug 2026) — the moving tagline strip, and the lines
// behind it. LAYOUT-BACKLOG.md item 12.
//
// The owner's ask: a single line under the app banner on quranrevival.html
// that cycles through short taglines, some of which carry a link — some
// opening a page inside the app, some an outside site in a new tab. They
// alone add, edit and retire the lines.
//
// FIVE DECISIONS THE OWNER TOOK BEFORE THIS WAS BUILT, all of which this
// file's shape depends on (asked 17 Aug 2026, a demo artifact shown first,
// the same way shell rounds 4-14 were agreed):
//
//   1. The strip stands EXACTLY where the static tagline stood — it is not
//      an extra line. Measured: 17-18px against the .app-tagline
//      paragraph's 20-22px, so it is 2-4px CHEAPER than what it replaces
//      and gains an Approach row at 390x844. An extra line would have cost
//      one row on three of the four phones measured. See
//      tools/i18n-verify/tagline-cost.mjs.
//   2. Quran Study page only, for now. Nothing here is Quran-specific
//      except the ayah targeting below, so adding the strip to the other
//      module pages later is a placement job, not a rewrite.
//   3. Flip, Fade and Slide up all ship, and the owner picks which is used
//      ("so i can choose often, gives a variation"). Ticker was dropped.
//   4. IT CHANGES ONCE PER VISIT, not every few seconds — "No change will
//      be frequent. A few might stay for days, a few once a day. maximum 1
//      change per session could be." That is what holdDays and
//      pickTagline() below implement, and it is why the strip is mostly a
//      still line with one noticeable movement rather than a carousel.
//   5. The lines live on the TENANT DOCUMENT, edited from taglines.html.
//      That document is already fetched by the landing page's own
//      loadContextData(), so this costs NO extra read, NO new collection
//      and NO firestore.rules change (tenants/{tenantId} is already
//      writable by canAdminIdentity() — owner/prime). Same lesson as the
//      v07.37 language sync: before adding a read, check what the startup
//      path already reads.
//
// I2: this module is PURE — no DOM, no Firebase. It takes the tenant
// document's data in and hands arrays and decisions back; the page
// controllers do the reading and writing (quranrevival.html renders the
// strip, taglines.html edits the list through safeWrite()). That is what
// lets tools test the rotation rule without a browser or a network.
//
// I4: there is no delete. Retiring a line sets status: "archived", exactly
// as subjects, trackables, classes and course offers do.
//
// I5: every line carries a permanent id. Order is a separate number, so
// re-ordering never rewrites an id and the rotation state (which remembers
// an id) survives any amount of re-ordering.
//
// I11: every line's text is language-keyed. The six lines shipped below
// carry English only and are read through langText(), which falls back
// through the Bangla catalogue keyed by the English — the same read-time
// mechanism translation phase 3 built for the seeded subject names, so
// these are in Bangla on day one without a data migration. A line the
// owner types in themselves is stored in whichever language they were
// reading at the time and can gain the other later.

import { langText } from "./lang.js";

/** The three ways a line can arrive on screen. All three ship; the owner
 *  chooses one — see decision 3 above. The ids are also the CSS animation
 *  suffixes in quranrevival.html (in-flip / out-flip, etc.), so renaming one
 *  means renaming its keyframes too. */
export const TAGLINE_MOTIONS = [
  { id: "flip", label: "Flip" },
  { id: "fade", label: "Fade" },
  { id: "slide", label: "Slide up" },
];

const MOTION_IDS = TAGLINE_MOTIONS.map((m) => m.id);

export const TAGLINE_SETTING_DEFAULTS = Object.freeze({
  motion: "flip",
  changeAfterSeconds: 6,
  pauseOnHold: true,
});

/** How long a line holds the strip before the next one gets a turn. Days,
 *  because that is how the owner described it: "A few might stay for days,
 *  a few once a day." 0 means "give the next line a turn on the next
 *  visit", which is the fastest this strip ever moves by design. */
export const TAGLINE_HOLDS = [
  { id: 0, label: "Every visit" },
  { id: 1, label: "One day" },
  { id: 3, label: "Three days" },
  { id: 7, label: "One week" },
  { id: 30, label: "One month" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

// The six lines this ships with, from the demo the owner approved plus the
// one they added by name ("Quran (calls) for Critical Reasoning"). Most
// carry NO link on purpose — their own words: "I will set the links later,
// add/edit/delete later." Two DO carry one, so that both kinds of link are
// really working on the day this ships rather than being promised: an
// internal one (the app's own Asma ul Husna page) and an external one (the
// poster archive the owner supplied themselves back in v07.15). Both are
// editable and retirable like any other line.
export const DEFAULT_TAGLINES = Object.freeze([
  { id: "tl_seed_tagline", text: { en: "Reviving the Quran, abandoned." }, link: null, order: 10, status: "active", holdDays: 7, ayahRef: null },
  { id: "tl_seed_approaches", text: { en: "30 Approaches — one Ayah, thirty ways" }, link: null, order: 20, status: "active", holdDays: 1, ayahRef: null },
  { id: "tl_seed_asma", text: { en: "The 99 Names of Allah" }, link: { url: "asma-study.html", target: "internal" }, order: 30, status: "active", holdDays: 1, ayahRef: null },
  { id: "tl_seed_posters", text: { en: "Names & Attributes posters on archive.org" }, link: { url: "https://archive.org/details/NamesAndAttributesOfAllah", target: "external" }, order: 40, status: "active", holdDays: 1, ayahRef: null },
  { id: "tl_seed_hadith", text: { en: "Today's Hadith" }, link: null, order: 50, status: "active", holdDays: 1, ayahRef: null },
  { id: "tl_seed_reasoning", text: { en: "Quran (calls) for Critical Reasoning" }, link: null, order: 60, status: "active", holdDays: 1, ayahRef: null },
]);

/** The lines to work with. The tenant's own list wins the moment it exists;
 *  until then the six defaults above show, so the strip is never empty on a
 *  tenant that has never opened the editor. taglines.html seeds the tenant's
 *  list FROM the defaults on its first save, which is what makes a shipped
 *  line archivable — you cannot archive something that is not in your list. */
export function taglinesFrom(tenantDoc) {
  const stored = tenantDoc?.taglines;
  if (Array.isArray(stored) && stored.length) return stored.map(normalizeTagline);
  return DEFAULT_TAGLINES.map(normalizeTagline);
}

/** True when the tenant has never saved its own list, i.e. what is on screen
 *  is still the shipped six. The editor says so, so the owner knows why lines
 *  they never typed are there. */
export function isUsingDefaultTaglines(tenantDoc) {
  return !(Array.isArray(tenantDoc?.taglines) && tenantDoc.taglines.length);
}

export function taglineSettingsFrom(tenantDoc) {
  const s = tenantDoc?.taglineSettings ?? {};
  const seconds = Number(s.changeAfterSeconds);
  return {
    motion: MOTION_IDS.includes(s.motion) ? s.motion : TAGLINE_SETTING_DEFAULTS.motion,
    // Clamped rather than trusted: a hand-edited 0 would flip the line the
    // instant the page painted, which is not a "change" anyone would see.
    changeAfterSeconds: Number.isFinite(seconds) && seconds >= 2 && seconds <= 60 ? Math.round(seconds) : TAGLINE_SETTING_DEFAULTS.changeAfterSeconds,
    pauseOnHold: s.pauseOnHold !== false,
  };
}

function normalizeTagline(line) {
  const holdDays = Number(line?.holdDays);
  return {
    id: String(line?.id ?? ""),
    text: line?.text ?? { en: "" },
    link: normalizeLink(line?.link),
    order: Number.isFinite(Number(line?.order)) ? Number(line.order) : 999,
    status: line?.status === "archived" ? "archived" : "active",
    holdDays: Number.isFinite(holdDays) && holdDays >= 0 ? holdDays : 0,
    ayahRef: normalizeAyahRef(line?.ayahRef),
  };
}

function normalizeLink(link) {
  if (!link || typeof link !== "object") return null;
  const url = String(link.url ?? "").trim();
  if (!url) return null;
  // A line the owner typed an outside address into is external whether or
  // not they remembered to say so -- the target picker is a convenience,
  // the address itself is the fact. Getting this backwards would open
  // another site inside the app's own tab.
  const looksAbsolute = /^https?:\/\//i.test(url);
  const target = link.target === "external" || looksAbsolute ? "external" : "internal";
  return { url, target };
}

/** "2:255" — a surah and an ayah. Anything else is treated as no target at
 *  all rather than a broken one, so a typo can never hide a line for ever. */
export function normalizeAyahRef(ref) {
  if (ref == null || ref === "") return null;
  const m = String(ref).trim().match(/^(\d{1,3})\s*:\s*(\d{1,3})$/);
  if (!m) return null;
  const surah = Number(m[1]);
  const ayah = Number(m[2]);
  if (surah < 1 || surah > 114 || ayah < 1) return null;
  return `${surah}:${ayah}`;
}

export function taglineText(line, lang = "en") {
  return langText(line?.text, lang);
}

/** Active lines, in the owner's own order. */
export function activeTaglines(lines) {
  return lines.filter((l) => l.status === "active").sort((a, b) => a.order - b.order);
}

/**
 * Which line the strip should show, and whether it is a change worth
 * animating. This is the whole rotation rule, and it is deliberately the
 * only place that decides anything — the page just renders what it is told.
 *
 *   ayahRef   the ayah currently open, as "2:255", or null.
 *   state     { id, since } from the last visit (localStorage).
 *   nowMs     Date.now(), passed in so this is testable.
 *   lockedId  the general line already decided for THIS visit, if any.
 *
 * Returns { current, previous, changed, state }:
 *   current   the line to end up showing
 *   previous  the line to show FIRST and animate away from, or null
 *   changed   true when the strip should move once, this visit
 *   state     what to store back
 *
 * Rule 1, and it takes priority over everything: a line attached to the
 * ayah now open shows immediately, with no hold and no animation queue.
 * That is the owner's "I might attach this to a particular Ayah, an article
 * about the Ayah" — such a line is about what is on screen right now, so
 * waiting several seconds to reveal it would defeat it. It also does not
 * disturb the general rotation's stored state: leave the ayah and the
 * ordinary line comes back exactly where it was.
 *
 * Rule 2: otherwise the line whose turn it is holds for holdDays. Within
 * that window every visit shows it still — no movement at all. Once the
 * window is up, the next active line takes over and THAT is the one change
 * per visit the owner asked for.
 */
export function pickTagline({ lines, state = null, nowMs = Date.now(), ayahRef = null, lockedId = null } = {}) {
  const active = activeTaglines(lines ?? []);
  if (!active.length) return { current: null, previous: null, changed: false, state };

  const targeted = ayahRef ? active.find((l) => l.ayahRef === ayahRef) : null;
  if (targeted) return { current: targeted, previous: null, changed: false, state, forAyah: true };

  const general = active.filter((l) => !l.ayahRef);
  if (!general.length) return { current: null, previous: null, changed: false, state };

  // ONE CHANGE PER VISIT, and this is what enforces it. The page asks again
  // on every ayah change (an ayah-attached line has to be able to appear), so
  // without a lock a line whose hold is "every visit" advanced on every ask:
  // paging through five ayahs walked five lines, turning the strip into
  // exactly the carousel the owner did not want. Found by measuring, not by
  // reading -- the rotation looked right in a single-load test.
  if (lockedId) {
    const locked = general.find((l) => l.id === lockedId);
    if (locked) return { current: locked, previous: null, changed: false, state };
  }

  const held = state?.id ? general.find((l) => l.id === state.id) : null;
  const since = Number(state?.since);
  if (held && held.holdDays > 0 && Number.isFinite(since) && nowMs - since < held.holdDays * DAY_MS) {
    return { current: held, previous: null, changed: false, state };
  }

  // Advance. If the remembered line is gone (archived, or the list was
  // rewritten), start from the beginning rather than guessing a position.
  const at = held ? general.indexOf(held) : -1;
  const next = general[(at + 1) % general.length];
  if (general.length === 1 || !held) {
    return { current: next, previous: null, changed: false, state: { id: next.id, since: nowMs } };
  }
  return { current: next, previous: held, changed: true, state: { id: next.id, since: nowMs } };
}

// ---------------------------------------------------------------------------
// Rotation state. localStorage, per browser, exactly like splash.js and the
// language preference's own device half: which line someone last saw is not
// worth a Firestore write on every visit, and getting it wrong costs nothing
// worse than one extra flip.
// ---------------------------------------------------------------------------

const STATE_KEY = "mm_tagline_state";

export function readTaglineState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed.id === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export function writeTaglineState(state) {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// List editing. Pure array in, pure array out — taglines.html holds one of
// these arrays in memory while the owner works, and writes the whole thing
// once when they save. Nothing here talks to Firestore.
// ---------------------------------------------------------------------------

export function newTaglineId() {
  return `tl_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function nextTaglineOrder(lines) {
  return lines.reduce((max, l) => Math.max(max, l.order), 0) + 10;
}

export function addTagline(lines, line) {
  return [...lines, normalizeTagline({ ...line, id: line.id || newTaglineId(), order: line.order ?? nextTaglineOrder(lines) })];
}

export function updateTagline(lines, id, changes) {
  return lines.map((l) => (l.id === id ? normalizeTagline({ ...l, ...changes }) : l));
}

/** I4: retire, never remove. An archived line keeps its id, its text and its
 *  link, so turning it back on is one tap and nothing was lost. */
export function setTaglineStatus(lines, id, status) {
  return updateTagline(lines, id, { status: status === "archived" ? "archived" : "active" });
}

/** Move one line up or down among its siblings, renumbering the whole list
 *  in tens afterwards — the same move-up/move-down idiom (and the same
 *  renumber-on-move) the Catalogue page's Modules and Subjects tables have
 *  used since v07.08, reused rather than a second one invented. */
export function moveTagline(lines, id, direction) {
  const sorted = [...lines].sort((a, b) => a.order - b.order);
  const at = sorted.findIndex((l) => l.id === id);
  const to = direction === "up" ? at - 1 : at + 1;
  if (at < 0 || to < 0 || to >= sorted.length) return lines;
  [sorted[at], sorted[to]] = [sorted[to], sorted[at]];
  return sorted.map((l, i) => ({ ...l, order: (i + 1) * 10 }));
}
