/**
 * Know Your Status -- the pure half (no Firebase, no DOM). A person's study status of a hadith lives on a BOOKMARK they
 * own: one saved[] entry in their bookmarks document, { moduleId: "hadith", subjectId: "openiti", position:
 * "openiti:<versionUri>:<n>", settings: { status } }. No new collection, field or Rule: bookmarks' own Rules already
 * let the person write saved[] (canRecordFor), and `settings` is a free map. Clearing a status keeps the bookmark and
 * sets status to null (nothing is deleted, I4).
 *
 * The statuses are a list on purpose: the Owner will add levels, so every count, colour and legend here reads the list
 * and never names an id. A level added later gets its own colour and its own tick in "Counts as done".
 */
export const STATUS_MODULE_ID = "hadith";
export const STATUS_SUBJECT_ID = "openiti";

export const STATUSES = Object.freeze([
  Object.freeze({ id: "mem",   label: "Memorised",        short: "Memorised",   glyph: "✓", color: "#46c486" }),
  Object.freeze({ id: "rev",   label: "Revising",         short: "Revising",    glyph: "↻", color: "#6aa7ff" }),
  Object.freeze({ id: "need",  label: "Need to memorise", short: "To memorise", glyph: "○", color: "#f0a84a" }),
  Object.freeze({ id: "saved", label: "Bookmarked only",  short: "Saved",       glyph: "★", color: "#b4bdd0" }),
]);
/** Which statuses count towards "done" until the person chooses otherwise (the Owner, 14 Nov 2026: a percentage of Memorised and Revising). */
export const DEFAULT_DONE = Object.freeze(["mem", "rev"]);
export const NOT_MARKED_COLOR = "#34486f";

const IDS = (statuses = STATUSES) => statuses.map((s) => s.id);
export const isStatusId = (id, statuses = STATUSES) => IDS(statuses).includes(id);

export const statusPosition = (versionUri, n) => `openiti:${versionUri}:${n}`;
/** "openiti:<versionUri>:<n>" -> { versionUri, n }, or null for any other position. A version uri has no colon. */
export function parsePosition(position) {
  const m = /^openiti:([^:]+):(\d+)$/.exec(String(position ?? ""));
  return m ? { versionUri: m[1], n: Number(m[2]) } : null;
}

const isStatusBookmark = (b) => b && !b.removed && b.moduleId === STATUS_MODULE_ID && b.subjectId === STATUS_SUBJECT_ID && parsePosition(b.position);

/** The bookmark entry that holds this hadith's status (even one whose status was cleared), or null. */
export function findStatusBookmark(bookmarksDoc, position) {
  const all = (bookmarksDoc?.saved ?? []).filter((b) => isStatusBookmark(b) && b.position === position);
  return all.length ? all[all.length - 1] : null; // the last one wins, as in statusMapFrom()
}

/** Map(position -> status id) for every hadith that carries a status right now. */
export function statusMapFrom(bookmarksDoc, statuses = STATUSES) {
  const out = new Map();
  for (const b of bookmarksDoc?.saved ?? []) {
    if (!isStatusBookmark(b)) continue;
    const s = b.settings?.status;
    if (isStatusId(s, statuses)) out.set(b.position, s); else out.delete(b.position);
  }
  return out;
}

/** A zeroed counts object for the given statuses. */
export const emptyCounts = (statuses = STATUSES) => Object.fromEntries(IDS(statuses).map((id) => [id, 0]));
export const markedOf = (counts, statuses = STATUSES) => IDS(statuses).reduce((a, id) => a + (counts[id] || 0), 0);
export const doneOf = (counts, done, statuses = STATUSES) => IDS(statuses).reduce((a, id) => a + (done.has?.(id) ? (counts[id] || 0) : 0), 0);
/** Whole-number percentage, 0 when there is nothing to count. */
export const percent = (part, total) => (total > 0 ? Math.round((100 * part) / total) : 0);

/** Counts per book: Map(versionUri -> counts). */
export function countsByBook(map, statuses = STATUSES) {
  const out = new Map();
  for (const [pos, s] of map) {
    const p = parsePosition(pos); if (!p) continue;
    const c = out.get(p.versionUri) ?? emptyCounts(statuses);
    c[s] = (c[s] || 0) + 1; out.set(p.versionUri, c);
  }
  return out;
}

/** n -> chapter id for one book index (built from each chapter's hadithPositions). */
export function chapterLookup(bookIndex) {
  const m = new Map();
  for (const c of bookIndex?.chapters ?? []) for (const n of c.hadithPositions ?? []) m.set(n, c.id);
  return m;
}
/** Counts per chapter of one book: Map(chapterId -> counts). */
export function countsByChapter(map, versionUri, bookIndex, statuses = STATUSES) {
  const look = chapterLookup(bookIndex), out = new Map();
  for (const [pos, s] of map) {
    const p = parsePosition(pos); if (!p || p.versionUri !== versionUri) continue;
    const ch = look.get(p.n); if (!ch) continue;
    const c = out.get(ch) ?? emptyCounts(statuses);
    c[s] = (c[s] || 0) + 1; out.set(ch, c);
  }
  return out;
}

/** Counts of a list of hadith references ({ versionUri, n }) against the status map. */
export function countsOfRefs(refs, map, statuses = STATUSES) {
  const c = emptyCounts(statuses);
  for (const r of refs) { const s = map.get(statusPosition(r.versionUri, r.n)); if (s) c[s] = (c[s] || 0) + 1; }
  return c;
}

// ---------------------------------------------------------------------------
// The wheel. One segment per unit (a book, a chapter, a topic); each fills outward from the hub by status, the share of
// that unit's hadith in each status, and the rest is "not marked".
// ---------------------------------------------------------------------------
/** The thinnest band that is drawn for a status that has at least one hadith in it (wheel units). */
export const MIN_BAND = 2;
const pt = (r, a) => [150 + r * Math.cos(a), 150 + r * Math.sin(a)];
export function sectorPath(r1, r2, a0, a1) {
  const [x1, y1] = pt(r2, a0), [x2, y2] = pt(r2, a1), [x3, y3] = pt(r1, a1), [x4, y4] = pt(r1, a0), big = a1 - a0 > Math.PI ? 1 : 0;
  const f = (v) => v.toFixed(2);
  return `M${f(x1)} ${f(y1)}A${r2} ${r2} 0 ${big} 1 ${f(x2)} ${f(y2)}L${f(x3)} ${f(y3)}A${r1} ${r1} 0 ${big} 0 ${f(x4)} ${f(y4)}Z`;
}
/**
 * units: [{ total, counts }]. Returns [{ outline, bands: [{ id, d }] }] in the same order. A segment with one unit alone gets no gap.
 * The bands' total thickness is (marked / total) of the ring, in the order of `statuses`.
 */
export function wheelGeometry(units, statuses = STATUSES, { rin = 50, rout = 142 } = {}) {
  const N = units.length, gap = N > 1 ? 0.045 : 0;
  return units.map((u, i) => {
    const a0 = -Math.PI / 2 + (2 * Math.PI * i) / N + gap / 2, a1 = -Math.PI / 2 + (2 * Math.PI * (i + 1)) / N - gap / 2;
    let r = rin; const bands = [];
    for (const s of statuses) {
      const c = u.counts[s.id] || 0;
      if (!c) continue;
      // A status the person HAS used always shows at least a thin line (MIN_BAND), however large the book: 4 marked hadith of 7,129 is
      // 0.05% of the ring, which would otherwise be invisible and look like "nothing marked".
      const th = Math.min(Math.max((c / Math.max(u.total, 1)) * (rout - rin), MIN_BAND), rout - r);
      if (th > 0.05) { bands.push({ id: s.id, d: sectorPath(r, r + th, a0, a1) }); r += th; }
    }
    return { outline: sectorPath(rin, rout, a0, a1), bands, mid: (a0 + a1) / 2 };
  });
}
