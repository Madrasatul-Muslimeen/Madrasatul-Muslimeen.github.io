// F-047 — The Mastery Wheel: QuranRevival's landing page (never the
// platform's — Architecture s5). One ring, one segment per ayah in the
// currently-chosen surah, coloured by that ayah's status for the currently-
// chosen Approach. The approach dropdown sits beside it as a second door.
//
// I2: pure renderer — takes ayah numbers + statuses in, SVG out, plus a
// click callback. Never reads records.js itself.

// Six on the ramp, Not Applicable off it entirely (I7, Architecture s5 —
// "Achieved and Mastered must be visibly distinct: adjacent colours are
// indistinguishable on a small wheel segment"). Mastered is a different hue
// (emerald, not a darker blue) rather than one more step up the same ramp,
// so the two are never confusable on a thin wheel segment.
export const STATUS_COLORS = Object.freeze({
  not_applicable: "url(#naHatch)",
  not_started: "#e3e6ea",
  learning: "#d9b86a",
  practising: "#b8862f",
  achieved: "#1f3a6e",
  mastered: "#2e6b4f",
});

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function segmentPath(cx, cy, rInner, rOuter, startAngle, endAngle) {
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

/**
 * @param ayahStatuses  array of { ayah, statusId } in ayah order, one per ayah in the surah
 * @param size          pixel size of the (square) SVG viewport
 */
export function renderMasteryWheel(ayahStatuses, { size = 360 } = {}) {
  const cx = size / 2, cy = size / 2;
  const rOuter = size / 2 - 4;
  const rInner = rOuter * 0.42;
  const n = ayahStatuses.length || 1;
  const anglePer = 360 / n;

  const segments = ayahStatuses
    .map((entry, i) => {
      const start = i * anglePer;
      const end = start + anglePer - Math.min(1.2, anglePer * 0.08); // thin gap between segments
      const fill = STATUS_COLORS[entry.statusId] ?? STATUS_COLORS.not_started;
      return `<path class="wheel-seg" data-ayah="${entry.ayah}" d="${segmentPath(cx, cy, rInner, rOuter, start, end)}" fill="${fill}"><title>Ayah ${entry.ayah} — ${entry.statusId.replace(/_/g, " ")}</title></path>`;
    })
    .join("");

  return `<svg class="mastery-wheel" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <defs>
      <pattern id="naHatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
        <rect width="6" height="6" fill="#f2f2f2"/>
        <line x1="0" y1="0" x2="0" y2="6" stroke="#bbb" stroke-width="2"/>
      </pattern>
    </defs>
    ${segments}
    <circle cx="${cx}" cy="${cy}" r="${rInner - 2}" fill="#fff" stroke="#e5e5e5"/>
  </svg>`;
}

/** Wires up click handling on a wheel already inserted into the DOM. */
export function attachWheelClickHandler(containerEl, onAyahClick) {
  containerEl.querySelectorAll(".wheel-seg").forEach((seg) => {
    seg.addEventListener("click", () => onAyahClick(Number(seg.dataset.ayah)));
  });
}

/** Small legend, matching the six statuses + Not Applicable, for the wheel's page. */
export function renderWheelLegend(labelsById) {
  const order = ["not_applicable", "not_started", "learning", "practising", "achieved", "mastered"];
  return `<div class="wheel-legend">${order
    .map((id) => `<span class="legend-item"><span class="legend-swatch" style="background:${STATUS_COLORS[id]}"></span>${labelsById[id] ?? id}</span>`)
    .join("")}</div>`;
}
