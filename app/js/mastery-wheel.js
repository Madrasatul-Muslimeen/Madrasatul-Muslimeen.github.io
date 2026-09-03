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

/** Greedy word-wrap of `text` at the given canvas font, shrinking the font
 *  size one step at a time (from `startSize` down to `minSize`) until the
 *  wrapped block's own height fits `maxHeight` -- or, failing that even at
 *  the smallest size, returning the smallest-size wrap anyway rather than
 *  looping forever. `maxWidth` is deliberately a single flat number, not a
 *  true per-line circle-chord width -- a slightly conservative
 *  approximation (this project's own standing rule: when in doubt, err
 *  toward MORE wrapping/a smaller font, never toward overflow) that avoids
 *  the chicken-and-egg of "the exact width available depends on how many
 *  lines there end up being." A single word wider than `maxWidth` is kept
 *  on its own line rather than sliced mid-word. */
function wrapTextToFit(ctx, text, { maxWidth, maxHeight, startSize, minSize, family, weight }) {
  const words = String(text ?? "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return { lines: [], fontSize: startSize, lineHeight: startSize * 1.18 };
  let best = null;
  for (let size = startSize; size >= minSize; size -= 1) {
    ctx.font = `${weight} ${size}px ${family}`;
    const lines = [];
    let current = "";
    for (const word of words) {
      const trial = current ? `${current} ${word}` : word;
      if (!current || ctx.measureText(trial).width <= maxWidth) {
        current = trial;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    const lineHeight = size * 1.18;
    best = { lines, fontSize: size, lineHeight };
    if (lines.length * lineHeight <= maxHeight) return best;
  }
  return best;
}

/** The dark centre disc, shared by both wheel styles below, in either of two
 * modes (index.html's own two centre treatments, re-derived):
 *  - centerArabic: the actual ayah text (Amiri, RTL) + a small centerRef
 *    line under it (e.g. "SURAH 1 · AYAH 1") -- what the old app's real
 *    Mastery Wheel shows, since its centre is always one fixed ayah.
 *  - centerLabel: a plain-text label (Cormorant Garamond) + optional
 *    centerSub line -- for wheels with no single ayah to anchor on (the
 *    Explore/Juz-wheel's "Whole Quran" + Approach name, or an Asma ul
 *    Husna group's own, often much longer, title).
 *
 * Drag-reposition/centre-fit round (3 Sep 2026) -- `centerLabel` used to be
 * ONE fixed-size line that simply ran past the gold ring for a long title
 * (Asma ul Husna's own 19 group names are full sentences). It is now
 * measured with a real canvas 2D context (this project's own "measure,
 * don't guess" method, the same one the Quran-landing wheel's hub layout
 * already uses) and wrapped -- shrinking the font only as far as it has to
 * -- to fit inside the circle. A short label ("All Groups", a QCR
 * collection's own short name) still measures as one line at the original
 * 20px, so every existing caller renders byte-for-byte as before. Falls
 * back to the original single, unwrapped line if no canvas is available
 * (there always is one in a real browser -- purely a defensive guard).
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
  const baseY = centerSub ? cy - 2 : cy + 6;
  const family = "'Cormorant Garamond', serif";
  let fit = null;
  if (typeof document !== "undefined" && document.createElement) {
    try {
      const ctx = document.createElement("canvas").getContext("2d");
      const usableR = Math.max(20, rInner - 10);
      fit = wrapTextToFit(ctx, centerLabel, {
        maxWidth: usableR * 1.7,
        maxHeight: usableR * 1.5,
        startSize: 20,
        minSize: 11,
        family,
        weight: 600,
      });
    } catch {
      fit = null;
    }
  }
  const titleMarkup = fit
    ? (() => {
        const blockHeight = (fit.lines.length - 1) * fit.lineHeight;
        const startY = baseY - blockHeight / 2;
        const tspans = fit.lines.map((line, i) => `<tspan x="${cx}" y="${startY + i * fit.lineHeight}">${line}</tspan>`).join("");
        return `<text text-anchor="middle" font-family="${family}" font-weight="600" font-size="${fit.fontSize}" fill="#C9A24B">${tspans}</text>`;
      })()
    : `<text x="${cx}" y="${baseY}" text-anchor="middle" font-family="${family}" font-weight="600" font-size="20" fill="#C9A24B">${centerLabel}</text>`;
  return `${circle}
    ${titleMarkup}
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
/** Wraps `text` to at most two lines, splitting at whichever SPACE sits
 *  closest to the middle -- never truncates (a name showing in full is the
 *  whole point of renderScopedWheel's own `sliceLines` option below). A
 *  single word longer than `maxLen` is left as one line as-is, since there
 *  is no space to split it on. Exported so a caller (quranrevival.html's
 *  Explore -> Asma ul Husna panel, the only one that uses `sliceLines`
 *  today) doesn't need its own copy of this. */
export function wrapWheelLabel(text, maxLen = 14) {
  const s = String(text ?? "").trim();
  if (!s) return [];
  if (s.length <= maxLen) return [s];
  const mid = Math.floor(s.length / 2);
  let splitAt = -1;
  for (let d = 0; d < mid; d++) {
    if (s[mid - d] === " ") { splitAt = mid - d; break; }
    if (s[mid + d] === " ") { splitAt = mid + d; break; }
  }
  if (splitAt === -1) return [s];
  return [s.slice(0, splitAt).trim(), s.slice(splitAt + 1).trim()];
}

/**
 * items: [{ key, statusId, title, number, sliceLines? }] -- `sliceLines`
 * (2 Sep 2026, Asma-in-Explore drag-reposition round) is a strictly OPT-IN
 * extra: an array of already-wrapped, already-escaped lines (see
 * wrapWheelLabel above) drawn INSIDE the slice's own body, at the SAME
 * angle and rotation the plain outer number already uses ("in the
 * direction as it shows for the numbers now"). The outer `number` badge is
 * untouched either way (I5: still the real, permanent id). Every caller
 * that never sets `sliceLines` (QCR, the plain Explore Quran wheel, the
 * main Approach wheel, and every existing renderScopedWheel call before
 * this round) renders byte-for-byte as before.
 *
 * 3 Sep 2026 follow-up -- "place each language in a separate line": the
 * first version placed each line at a DIFFERENT RADIUS along the same
 * angle, each independently rotated -- which reads as separate rows for
 * roughly-horizontal/vertical slices, but for anything in between it
 * doesn't work, because `ringNumberRotation` orients each label to point
 * OUTWARD along the radius (the same convention a clock's numerals use),
 * not tangentially. A label rotated to point radially has its own printed
 * length running ALONG the radius, so two separately-placed radial labels
 * (say, an Arabic line and its transliteration) reach into each other's
 * space the moment either one is longer than the gap between their two
 * radii -- confirmed by measuring real rendered bounding boxes, not
 * assumed: two lines meant to sit ~30px apart came back with bounding
 * boxes 34-50px tall, comfortably overlapping. Fixed by drawing the whole
 * multi-line label as ONE rotated `<text>` with `<tspan dy="…em">` line
 * stacking instead: every line shares one rotation, and `dy` spacing is
 * resolved in the text's own local coordinate space BEFORE that rotation
 * is applied, so consecutive lines can never bleed into each other
 * regardless of which way the label ends up pointing.
 *
 * 3 Sep 2026 resize round — `entry.sliceArabicLines` (a count, default 0) is
 * a second strictly OPT-IN extra: however many of `sliceLines`' own leading
 * lines are the Arabic Name (today only the Asma ul Husna Names-level
 * wheel's own first line) get the separate `.wheel-seg-label-ar` class
 * instead of the plain `.wheel-seg-label` every other line already used —
 * two independently CSS-sized classes, so the owner can resize "the Arabic
 * Names" and "the wrapped title/name text" apart from each other (see
 * js/asma-wheel-text.js). A tspan's own `dy="…em"` is resolved against ITS
 * OWN font-size, not the line before it, so the Arabic line getting a
 * bigger font never throws off the spacing of the lines around it. Every
 * caller that never sets `sliceArabicLines` renders byte-for-byte as
 * before (every non-Arabic line, or a caller with no Arabic line at all).
 */
export function renderScopedWheel(items, { size = 360, centerArabic, centerRef, centerLabel, centerSub } = {}) {
  const cx = size / 2, cy = size / 2;
  const rOuter = size / 2 - 4;
  const rInner = rOuter * 0.5;
  const labelOffset = Math.max(10, rOuter * 0.065);
  const n = items.length || 1;
  const anglePer = 360 / n;
  const sliceLineHeightEm = 1.2;

  const segments = items
    .map((entry, i) => {
      const start = i * anglePer;
      const end = start + anglePer - Math.min(1.2, anglePer * 0.08);
      const mid = (start + end) / 2;
      const fill = STATUS_COLORS[entry.statusId] ?? STATUS_COLORS.not_started;
      const rot = ringNumberRotation(mid);
      const lp = polarToCartesian(cx, cy, rOuter + labelOffset, mid);
      const numText = `<text class="wheel-seg-num" x="${lp.x}" y="${lp.y}" text-anchor="middle" transform="rotate(${rot} ${lp.x} ${lp.y})" style="pointer-events:none">${entry.number ?? entry.key}</text>`;
      const lines = Array.isArray(entry.sliceLines) ? entry.sliceLines.filter(Boolean) : [];
      const arabicLineCount = Math.max(0, Number(entry.sliceArabicLines) || 0);
      let bodyText = "";
      if (lines.length) {
        const midR = (rInner + rOuter) / 2;
        const p = polarToCartesian(cx, cy, midR, mid);
        const firstDy = -((lines.length - 1) / 2) * sliceLineHeightEm;
        const tspans = lines
          .map((line, li) => {
            const cls = li < arabicLineCount ? ` class="wheel-seg-label-ar"` : "";
            return `<tspan${cls} x="${p.x}" dy="${li === 0 ? firstDy : sliceLineHeightEm}em">${line}</tspan>`;
          })
          .join("");
        bodyText = `<text class="wheel-seg-label" x="${p.x}" y="${p.y}" text-anchor="middle" transform="rotate(${rot} ${p.x} ${p.y})" style="pointer-events:none">${tspans}</text>`;
      }
      return `<path class="wheel-seg" data-key="${entry.key}" d="${segmentPath(cx, cy, rInner, rOuter, start, end)}" fill="${fill}"><title>${entry.title}</title></path>
      ${numText}${bodyText}`;
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
