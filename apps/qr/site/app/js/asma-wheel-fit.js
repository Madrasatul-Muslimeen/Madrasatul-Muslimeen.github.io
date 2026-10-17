// QR J01 R1 (QR-only): calm labels on the Asma wheels, without changing the shared mastery-wheel.js.
//
// mastery-wheel.js's renderScopedWheel() draws each slice's label as ONE <text>, centred in the slice and turned to
// run along the radius, and its wrapWheelLabel() splits a title into at most two lines. The owner's group titles are
// long ("The Only One to worship, The Carer, The Nourisher and Provider"), so on a 19-slice wheel two lines run past
// their slice and into the next one. This layer keeps every word (owner's Q3: keep the wording, let it wrap):
//   1. chooseSliceLines() wraps a title into 1 to 4 balanced lines, whichever lets it be drawn largest in its slice;
//   2. fitWheelLabels(svg) runs once the wheel is on screen: it measures each label as drawn (getBBox) and, only if
//      it still reaches outside its own slice, shrinks it about its own centre (an extra SVG transform) until it fits.
// Both read renderScopedWheel()'s geometry (size 360, no ring): if that changes in MMSA, change WHEEL here.

export const WHEEL = Object.freeze({ cx: 180, cy: 180, rOuter: 176, rInner: 88 });
const PAD = 2.5; // svg units kept clear inside each slice edge
const LINE_EM = 1.2; // renderScopedWheel's sliceLineHeightEm
const MIN_READABLE = 0.75; // the smallest share of the normal label size worth drawing a Name at

/** Each slice's angles (degrees, 0 = 12 o'clock, clockwise), as renderScopedWheel computes them. */
export function sliceGeometry(n) {
  const anglePer = 360 / Math.max(n, 1);
  const width = anglePer - Math.min(1.2, anglePer * 0.08);
  return { anglePer, half: width / 2, mid: (i) => i * anglePer + width / 2 };
}

function rotatePoint(dx, dy, deg) {
  const a = (deg * Math.PI) / 180;
  return [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a)];
}

/** Is the svg point (x, y) inside the slice centred on `midDeg` (half-width `halfDeg`), `pad` units clear of every edge? */
export function insideSlice(x, y, midDeg, halfDeg, pad = PAD) {
  const X = x - WHEEL.cx, Y = y - WHEEL.cy;
  const r = Math.hypot(X, Y);
  if (r < WHEEL.rInner + pad || r > WHEEL.rOuter - pad) return false;
  const theta = (Math.atan2(Y, X) * 180) / Math.PI + 90;
  const delta = Math.abs((((theta - midDeg) % 360) + 540) % 360 - 180);
  if (delta > halfDeg) return false;
  return r * Math.sin(((halfDeg - delta) * Math.PI) / 180) >= pad;
}

/** The largest scale (<= 1) at which a box (relative to its anchor at svg point p, turned by `rot`) fits its slice. */
function fitScale(box, p, rot, midDeg, halfDeg) {
  const corners = [[box.x, box.y], [box.x + box.w, box.y], [box.x, box.y + box.h], [box.x + box.w, box.y + box.h]];
  const fits = (s) => corners.every(([dx, dy]) => {
    const [rx, ry] = rotatePoint(dx * s, dy * s, rot);
    return insideSlice(p.x + rx, p.y + ry, midDeg, halfDeg);
  });
  if (fits(1)) return 1;
  let lo = 0.1, hi = 1;
  for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; if (fits(m)) lo = m; else hi = m; }
  return lo;
}

/** renderScopedWheel's label rotation (ringNumberRotation, not exported there). */
function labelRotation(midDeg) {
  let rot = (((midDeg - 90) % 360) + 360) % 360;
  if (rot >= 90 && rot <= 270) rot += 180;
  return rot;
}

/** Balanced wrap of `words` into at most `k` lines: the narrowest widest line, words never split. */
function wrapInto(words, k, width) {
  const total = width(words.join(" "));
  let lo = Math.max(...words.map(width)), hi = total;
  const pack = (limit) => {
    const lines = [];
    for (const w of words) {
      const last = lines[lines.length - 1];
      if (last && width(`${last} ${w}`) <= limit) lines[lines.length - 1] = `${last} ${w}`;
      else lines.push(w);
    }
    return lines;
  };
  for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (pack(m).length <= k) hi = m; else lo = m; }
  return pack(hi);
}

let canvasCtx = null;
function measurer(font) {
  canvasCtx ??= document.createElement("canvas").getContext("2d");
  return (s) => { canvasCtx.font = font; return canvasCtx.measureText(s).width; };
}

/**
 * The lines for slice `i` of `n`: `lead` (already-final lines, e.g. the Arabic Name, drawn `leadPx` high) then
 * `text` wrapped into 1..4 lines of `labelPx` type, whichever choice lets the whole label be drawn largest.
 * Returns plain strings (the caller escapes them).
 */
export function chooseSliceLines(text, i, n, { lead = [], leadPx = 13.65, leadFont = "Amiri, serif", labelPx = 9.1, labelFont = 'system-ui, "Noto Sans Bengali", sans-serif' } = {}) {
  const words = String(text ?? "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [...lead];
  const width = measurer(`600 ${labelPx}px ${labelFont}`);
  const leadWidth = measurer(`${leadPx}px ${leadFont}`);
  const g = sliceGeometry(n);
  const mid = g.mid(i);
  const rot = labelRotation(mid);
  const rMid = (WHEEL.rInner + WHEEL.rOuter) / 2;
  const [px, py] = [WHEEL.cx + rMid * Math.sin((mid * Math.PI) / 180), WHEEL.cy - rMid * Math.cos((mid * Math.PI) / 180)];
  let best = null;
  for (let k = 1; k <= Math.min(4, words.length); k++) {
    const lines = wrapInto(words, k, width);
    const w = Math.max(...lines.map(width), ...lead.map(leadWidth));
    const h = lead.length * leadPx * LINE_EM + lines.length * labelPx * LINE_EM;
    const s = fitScale({ x: -w / 2, y: -h / 2, w, h }, { x: px, y: py }, rot, mid, g.half);
    if (!best || s > best.s + 0.02) best = { s, lines };
  }
  // A crowded wheel of Names (group 19 has 31): if the Name beside its Arabic would have to be drawn too small to
  // read, the slice carries the Arabic alone, large (the list next to the wheel gives every Name in full).
  if (lead.length && best.s < MIN_READABLE) {
    const w = Math.max(...lead.map(leadWidth)), h = lead.length * leadPx * LINE_EM;
    const s = fitScale({ x: -w / 2, y: -h / 2, w, h }, { x: px, y: py }, rot, mid, g.half);
    if (s > best.s) return [...lead];
  }
  return [...lead, ...best.lines];
}

/** After the wheel is in the page (and again once the fonts have loaded): shrink any label still outside its slice. */
export function fitWheelLabels(svg) {
  if (!svg) return;
  const labels = [...svg.querySelectorAll("text.wheel-seg-label")];
  const n = svg.querySelectorAll(".wheel-seg").length;
  const g = sliceGeometry(n);
  for (const el of labels) {
    const px = Number(el.getAttribute("x")), py = Number(el.getAttribute("y"));
    const base = el.dataset.qaRotate ?? (el.getAttribute("transform") || "");
    el.dataset.qaRotate = base;
    el.setAttribute("transform", base);
    const m = base.match(/rotate\(([-\d.e]+)/);
    const rot = m ? Number(m[1]) : 0;
    let midDeg = (Math.atan2(py - WHEEL.cy, px - WHEEL.cx) * 180) / Math.PI + 90;
    midDeg = ((midDeg % 360) + 360) % 360;
    const b = el.getBBox();
    if (!b.width) continue;
    const s = fitScale({ x: b.x - px, y: b.y - py, w: b.width, h: b.height }, { x: px, y: py }, rot, midDeg, g.half);
    if (s < 0.999) el.setAttribute("transform", `${base} translate(${px} ${py}) scale(${s.toFixed(3)}) translate(${-px} ${-py})`);
  }
}
