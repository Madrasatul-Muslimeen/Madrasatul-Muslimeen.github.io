// Explore -> Quran -> Surah, "All Approaches" (Owner decision 82, 7 Oct 2026).
//
// Pure drawing and counting for the two new views: the Surah wheel in which
// every Ayah slice is a small stacked bar of ALL Approaches' statuses, and the
// counts the rows and tooltips quote. Nothing here reads or writes data: the
// statuses are handed in by the page from the records chunks Explore already
// holds (no new read, no new collection), and a claim goes through the page's
// own existing write path.

import { polarToCartesian, segmentPath, STATUS_COLORS } from "./mastery-wheel.js";

/** Inside of the ring -> outside. Mastered sits at the hub and Not started at the rim. */
export const BAND_ORDER = Object.freeze(["mastered", "achieved", "practising", "learning", "not_started", "not_applicable"]);

/** { mastered: n, ... } over a list of status ids; an unknown id counts as not started. */
export function countStatuses(statusIds) {
  const counts = Object.fromEntries(BAND_ORDER.map((s) => [s, 0]));
  for (const id of statusIds) counts[BAND_ORDER.includes(id) ? id : "not_started"] += 1;
  return counts;
}

/** The counts in words, most advanced first: "3 Achieved, 5 Practising, 22 Not started". `fmt` formats a number (num() in the page). */
export function describeCounts(counts, labelsById, fmt = String) {
  return BAND_ORDER.filter((s) => counts[s] > 0).map((s) => `${fmt(counts[s])} ${labelsById[s] ?? s}`).join(", ");
}

/** The bands of one slice between rIn and rOut, each proportional to its count, in BAND_ORDER (hub first). Empty bands are omitted. */
export function bandRadii(counts, rIn, rOut) {
  const total = BAND_ORDER.reduce((sum, s) => sum + (counts[s] || 0), 0);
  if (!total) return [];
  const out = [];
  let r = rIn;
  for (const status of BAND_ORDER) {
    const n = counts[status] || 0;
    if (!n) continue;
    const r1 = r + ((rOut - rIn) * n) / total;
    out.push({ status, n, r0: r, r1 });
    r = r1;
  }
  return out;
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * The Surah wheel. `slices`: [{ key, number, counts, title }] -- one per Ayah.
 * Every slice carries a transparent `.wheel-seg` hit path (data-key) on top of
 * its bands, so attachScopedWheelClickHandler() works unchanged, plus tabindex
 * and an aria-label that says the counts in words.
 */
export function renderAllApproachesWheel(slices, { size = 360, centerLabel = "", centerSub = "" } = {}) {
  const c = size / 2, rOut = size / 2 - 6, rIn = rOut * 0.5;
  const n = slices.length || 1;
  const per = 360 / n;
  const gap = Math.min(1.2, per * 0.08);
  const every = n <= 40 ? 1 : Math.ceil(n / 20);
  const pad = 16;
  let body = "";
  slices.forEach((s, i) => {
    const a0 = i * per, a1 = a0 + per - gap;
    const bands = bandRadii(s.counts, rIn, rOut)
      .map((b) => `<path class="aa-band" data-band="${b.status}" data-radius-in="${b.r0.toFixed(2)}" data-radius-out="${b.r1.toFixed(2)}" d="${segmentPath(c, c, b.r0, b.r1, a0, a1)}" fill="${b.status === "not_applicable" ? "url(#aaNaHatch)" : STATUS_COLORS[b.status]}" style="pointer-events:none"></path>`)
      .join("");
    body += `<g class="aa-slice" data-slice="${i}">${bands}<path class="wheel-seg aa-hit" data-key="${esc(s.key)}" tabindex="0" role="button" aria-label="${esc(s.title)}" d="${segmentPath(c, c, rIn, rOut, a0, a1)}" fill="transparent" stroke="#0c1320" stroke-width="0.6"><title>${esc(s.title)}</title></path></g>`;
    if (i % every === 0) {
      const p = polarToCartesian(c, c, rOut + 9, (a0 + a1) / 2);
      body += `<text class="wheel-seg-num" x="${p.x}" y="${p.y + 3}" text-anchor="middle" style="pointer-events:none">${esc(s.number)}</text>`;
    }
  });
  const hatch = `<pattern id="aaNaHatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)"><rect width="6" height="6" fill="#1b2338"/><line x1="0" y1="0" x2="0" y2="6" stroke="rgba(201,162,75,0.55)" stroke-width="2"/></pattern>`;
  const hub = `<circle cx="${c}" cy="${c}" r="${rIn - 4}" fill="#13192a" stroke="#C9A24B" stroke-width="1.5"/>
    <text x="${c}" y="${c - 2}" text-anchor="middle" font-family="'Cormorant Garamond', serif" font-weight="600" font-size="${String(centerLabel).length > 12 ? 16 : 20}" fill="#C9A24B">${esc(centerLabel)}</text>
    <text x="${c}" y="${c + 18}" text-anchor="middle" font-family="Inter" font-size="10" fill="#8fa0c2">${esc(centerSub)}</text>`;
  return `<svg class="mastery-wheel aa-wheel" viewBox="${-pad} ${-pad} ${size + 2 * pad} ${size + 2 * pad}" width="${size}" height="${size}" data-slices="${slices.length}"><defs>${hatch}</defs>${body}${hub}</svg>`;
}
