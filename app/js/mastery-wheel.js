// F-047 — The Mastery Wheel: QuranRevival's landing page (never the
// platform's — Architecture s5).
//
// I2: pure renderer — takes statuses in, SVG/HTML out, plus click
// callbacks. Never reads records.js itself.
//
// Phase 5 round 12 — restyled to match the old app's (index.html) dark
// navy/gold "progress-ring" wheel: thin ring (rInner = rOuter*0.5, same
// ratio index.html's renderProgressRingWheel used), a small number just
// outside each segment rotated to read radially (index.html's
// ringNumberRotation, re-derived here since it's plain trig, not copied),
// and a dark centre disc with a two-line label. index.html itself is
// reference-only — never imported from directly.
//
// Phase 5 round 13 — axis corrected to match the old app's real Mastery
// Wheel: quranrevival.html's Study-page wheel now uses renderScopedWheel
// with one segment per APPROACH for the current ayah (old app's actual
// axis — index.html:4932, `state.ways.map`), Arabic ayah text in the
// centre disc (index.html's centerArabic). renderMasteryWheel below (one
// segment per AYAH for one Approach) is kept as-is, still exercised by
// quranrevival-render-test.html — it's the shape the old app's own
// Explore/long-surah wheel uses (renderSurahWheelExplore's Progress-ring
// branch), earmarked for whenever that drill-down gets built, not dead
// code.

// Six on the ramp, Not Applicable off it entirely (I7, Architecture s5 —
// "Achieved and Mastered must be visibly distinct: adjacent colours are
// indistinguishable on a small wheel segment"). Mastered is a different hue
// (emerald, not a darker blue) rather than one more step up the same ramp,
// so the two are never confusable on a thin wheel segment.
//
// Retinted for the dark navy card this wheel now sits on (index.html's own
// wheel lived on the same dark background from day one, so this is the
// wheel catching up to that, not a new design language): the light-grey
// "not started" that read as "barely there" against a white page would read
// as a bright, lit-up segment against navy — inverted to a dim slate that
// recedes into the card instead.
export const STATUS_COLORS = Object.freeze({
  not_applicable: "url(#naHatch)",
  not_started: "#333f5c",
  learning: "#8a6a35",
  practising: "#C9A24B",
  achieved: "#5b84c4",
  mastered: "#3fae74",
});

export function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function segmentPath(cx, cy, rInner, rOuter, startAngle, endAngle) {
  const p1 = polarToCartesian(cx, cy, rOuter, startAngle);
  const p2 = polarToCartesian(cx, cy, rOuter, endAngle);
  const p3 = polarToCartesian(cx, cy, rInner, endAngle);
  const p4 = polarToCartesian(cx, cy, rInner, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${p1.x} ${p1.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${p4.x} ${p4.y}`,
    "Z",
  ].join(" ");
}

/** Keeps a segment's outside number reading right-side-up on the left half of the ring instead of upside-down. Same formula as index.html's ringNumberRotation, re-derived against polarToCartesian's own angle convention (0deg = 12 o'clock, clockwise). */
function ringNumberRotation(angleDeg) {
  let rot = angleDeg - 90;
  rot = ((rot % 360) + 360) % 360;
  if (rot >= 90 && rot <= 270) rot += 180;
  return rot;
}

function naHatchDefs() {
  return `<pattern id="naHatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
    <rect width="6" height="6" fill="#1b2338"/>
    <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(201,162,75,0.55)" stroke-width="2"/>
  </pattern>`;
}

/**
 * The dark centre disc, shared by both wheel styles below, in either of two
 * modes (index.html's own two centre treatments, re-derived):
 *  - centerArabic: the actual ayah text (Amiri, RTL) + a small centerRef
 *    line under it (e.g. "SURAH 1 · AYAH 1") -- what the old app's real
 *    Mastery Wheel shows, since its centre is always one fixed ayah.
 *  - centerLabel: a short plain-text label (Cormorant Garamond) + optional
 *    centerSub line -- for wheels with no single ayah to anchor on (the
 *    Explore/Juz-wheel's "Whole Quran" + Approach name).
 */
function centerLabelMarkup(cx, cy, rInner, { centerArabic, centerRef, centerLabel, centerSub } = {}) {
  if (centerArabic === undefined && centerLabel === undefined) return "";
  const circle = `<circle cx="${cx}" cy="${cy}" r="${rInner - 4}" fill="#13192a" stroke="#C9A24B" stroke-width="1.5"/>`;
  if (centerArabic !== undefined) {
    const ref = centerRef
      ? `<text x="${cx}" y="${cy + 22}" text-anchor="middle" font-family="Inter" font-size="10" fill="#8fa0c2">${centerRef}</text>`
      : "";
    return `${circle}
      <text x="${cx}" y="${cy - 4}" text-anchor="middle" style="font-family: var(--quran-font, serif)" font-size="22" direction="rtl" fill="#fbf3df">${centerArabic}</text>
      ${ref}`;
  }
  const sub = centerSub
    ? `<text x="${cx}" y="${cy + 20}" text-anchor="middle" font-family="Inter" font-size="10" fill="#8fa0c2">${centerSub}</text>`
    : "";
  return `${circle}
    <text x="${cx}" y="${centerSub ? cy - 2 : cy + 6}" text-anchor="middle" font-family="Cormorant Garamond, serif" font-weight="600" font-size="20" fill="#C9A24B">${centerLabel}</text>
    ${sub}`;
}

/**
 * @param ayahStatuses  array of { ayah, statusId } in ayah order, one per ayah in the surah
 * @param size          pixel size of the (square) SVG viewport
 * @param centerArabic  optional ayah text for the centre disc; centerRef is a small line under it
 * @param centerLabel   optional short plain-text label for the centre disc instead of centerArabic; centerSub is a small line under it
 */
export function renderMasteryWheel(ayahStatuses, { size = 360, centerArabic, centerRef, centerLabel, centerSub } = {}) {
  const cx = size / 2, cy = size / 2;
  const rOuter = size / 2 - 4;
  const rInner = rOuter * 0.5;
  const labelOffset = Math.max(10, rOuter * 0.065);
  const n = ayahStatuses.length || 1;
  const anglePer = 360 / n;

  const segments = ayahStatuses
    .map((entry, i) => {
      const start = i * anglePer;
      const end = start + anglePer - Math.min(1.2, anglePer * 0.08); // thin gap between segments
      const mid = (start + end) / 2;
      const fill = STATUS_COLORS[entry.statusId] ?? STATUS_COLORS.not_started;
      const lp = polarToCartesian(cx, cy, rOuter + labelOffset, mid);
      return `<path class="wheel-seg" data-ayah="${entry.ayah}" d="${segmentPath(cx, cy, rInner, rOuter, start, end)}" fill="${fill}"><title>Ayah ${entry.ayah} — ${entry.statusId.replace(/_/g, " ")}</title></path>
      <text class="wheel-seg-num" x="${lp.x}" y="${lp.y}" text-anchor="middle" transform="rotate(${ringNumberRotation(mid)} ${lp.x} ${lp.y})" style="pointer-events:none">${entry.ayah}</text>`;
    })
    .join("");

  return `<svg class="mastery-wheel" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <defs>${naHatchDefs()}</defs>
    ${segments}
    ${centerLabelMarkup(cx, cy, rInner, { centerArabic, centerRef, centerLabel, centerSub })}
  </svg>`;
}

/** Wires up click handling on a wheel already inserted into the DOM. */
export function attachWheelClickHandler(containerEl, onAyahClick) {
  containerEl.querySelectorAll(".wheel-seg").forEach((seg) => {
    seg.addEventListener("click", () => onAyahClick(Number(seg.dataset.ayah)));
  });
}

/**
 * Phase 5 — Explore navigator's generic wheel: same visual language as the
 * per-ayah Mastery Wheel above (reuses the same geometry helpers and
 * STATUS_COLORS), but for any labelled set of segments rather than
 * assuming "one segment per ayah" — e.g. the whole-Quran Quran-wheel (30
 * Juz segments). items: [{ key, statusId, title, number }] — number is what
 * prints outside the segment, defaulting to key. I2: still a pure
 * renderer — never reads records.js itself.
 */
export function renderScopedWheel(items, { size = 360, centerArabic, centerRef, centerLabel, centerSub } = {}) {
  const cx = size / 2, cy = size / 2;
  const rOuter = size / 2 - 4;
  const rInner = rOuter * 0.5;
  const labelOffset = Math.max(10, rOuter * 0.065);
  const n = items.length || 1;
  const anglePer = 360 / n;

  const segments = items
    .map((entry, i) => {
      const start = i * anglePer;
      const end = start + anglePer - Math.min(1.2, anglePer * 0.08);
      const mid = (start + end) / 2;
      const fill = STATUS_COLORS[entry.statusId] ?? STATUS_COLORS.not_started;
      const lp = polarToCartesian(cx, cy, rOuter + labelOffset, mid);
      return `<path class="wheel-seg" data-key="${entry.key}" d="${segmentPath(cx, cy, rInner, rOuter, start, end)}" fill="${fill}"><title>${entry.title}</title></path>
      <text class="wheel-seg-num" x="${lp.x}" y="${lp.y}" text-anchor="middle" transform="rotate(${ringNumberRotation(mid)} ${lp.x} ${lp.y})" style="pointer-events:none">${entry.number ?? entry.key}</text>`;
    })
    .join("");

  return `<svg class="mastery-wheel" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <defs>${naHatchDefs()}</defs>
    ${segments}
    ${centerLabelMarkup(cx, cy, rInner, { centerArabic, centerRef, centerLabel, centerSub })}
  </svg>`;
}

/** Like attachWheelClickHandler, but for renderScopedWheel's generic segments — returns the segment's raw string key rather than assuming it's an ayah number. */
export function attachScopedWheelClickHandler(containerEl, onSegmentClick) {
  containerEl.querySelectorAll(".wheel-seg").forEach((seg) => {
    seg.addEventListener("click", () => onSegmentClick(seg.dataset.key));
  });
}

/** Small legend, matching the six statuses + Not Applicable, for the wheel's page. Not Applicable's swatch is a CSS diagonal stripe rather than the SVG url(#naHatch) fill the wheel itself uses — this legend is a plain HTML container, not inside the wheel's own <svg>, so it can't resolve that pattern's id. */
export function renderWheelLegend(labelsById) {
  const order = ["not_applicable", "not_started", "learning", "practising", "achieved", "mastered"];
  return `<div class="wheel-legend">${order
    .map((id) => {
      const swatchStyle =
        id === "not_applicable"
          ? "background:repeating-linear-gradient(45deg,#1b2338 0 3px,rgba(201,162,75,0.55) 3px 4px)"
          : `background:${STATUS_COLORS[id]}`;
      return `<span class="legend-item"><span class="legend-swatch" style="${swatchStyle}"></span>${labelsById[id] ?? id}</span>`;
    })
    .join("")}</div>`;
}

/**
 * The companion list panel that sits beside the wheel (index.html's
 * .ways-list / .way-row / .status-chip pattern) — one row per segment,
 * badge + label + a coloured status chip, so the same data the wheel shows
 * as colour/position is also readable as text. items: [{ key, number,
 * label, statusId }]. Chip classes are named by status id (chip-mastered,
 * chip-not_started, ...) rather than index.html's chip-0..chip-4 — this
 * build's six statuses are id-keyed, not position-keyed (I5), so a
 * positional class name would silently break the moment status order ever
 * changes. Visually equivalent, just not literally the same class names.
 */
export function renderWheelSidebar(items, labelsById) {
  const rows = items
    .map(
      (item) => `<div class="way-row" data-key="${item.key}">
        <span class="badge">${item.number ?? item.key}</span>
        <span class="name">${item.label}</span>
        <span class="status-chip chip-${item.statusId}">${labelsById[item.statusId] ?? item.statusId}</span>
      </div>`
    )
    .join("");
  return `<div class="ways-list">${rows}</div>`;
}

/** Click handling for renderWheelSidebar's rows — same key contract as attachScopedWheelClickHandler (raw string key; caller converts to a number if it needs one, same as ayah rows do). */
export function attachWheelSidebarClickHandler(containerEl, onRowClick) {
  containerEl.querySelectorAll(".way-row").forEach((row) => {
    row.addEventListener("click", () => onRowClick(row.dataset.key));
  });
}
