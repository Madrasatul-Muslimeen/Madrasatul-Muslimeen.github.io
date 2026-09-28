// Issue #352 (Owner decisions 21–24) -- "Every unit on the wheel". Pure
// helpers (I2) for the ring views on the landing Approach wheel and in
// Explore: which units hold an āyah, the text weight a ring is sized by, and
// where each unit's arc falls. Nothing here reads Firestore or the DOM; every
// table is handed in by the caller, which already holds it (the same four
// packaged boundary tables unit-resolve.js and approach-coverage.js take).

/** Global āyah indexing over surah-index.json's own ayah counts, so a unit
    that crosses a surah boundary (a Juz, a Hizb, a Page) is one contiguous
    [from, to] range of numbers rather than several per-surah pieces. */
export function ayahIndexer(surahIndex) {
  const starts = [0];
  for (const s of surahIndex ?? []) starts.push(starts[starts.length - 1] + (s.ayahCount ?? 0));
  const total = starts[starts.length - 1];
  const gi = (surah, ayah) => starts[surah - 1] + ayah - 1;
  const at = (i) => {
    let s = 1;
    while (s < starts.length - 1 && starts[s] <= i) s += 1;
    return { surah: s, ayah: i - starts[s - 1] + 1 };
  };
  return { gi, at, total };
}

/** A boundary row ({startSurah,startAyah,endSurah,endAyah}) as a global
    [a, b] pair. */
export function rowSpan(row, idx) {
  return [idx.gi(row.startSurah, row.startAyah), idx.gi(row.endSurah, row.endAyah)];
}

/** Global [a, b] back to per-surah coverage ranges -- the shape
    poolStatus() and ayahCoverage() already use. */
export function spanToCoverage(a, b, idx) {
  const out = [];
  let i = a;
  while (i <= b) {
    const { surah, ayah } = idx.at(i);
    const lastInSurah = idx.gi(surah + 1, 1) - 1;
    const end = Math.min(b, Number.isFinite(lastInSurah) ? lastInSurah : b);
    out.push({ surah, from: ayah, to: ayah + (end - i) });
    i = end + 1;
  }
  return out;
}

/**
 * Text weight (decision 23): every printed page weighs the same and is
 * shared evenly by the āyāt on it, so a long āyah on a page of few āyāt
 * weighs more than a short one on a crowded page. `weight(a, b)` is the
 * total weight of global āyāt a..b inclusive.
 */
export function textWeigher(pageRows, idx) {
  const w = new Float64Array(idx.total);
  for (const p of pageRows ?? []) {
    const [a, b] = rowSpan(p, idx);
    const share = 1 / (b - a + 1);
    for (let i = a; i <= b; i++) w[i] += share;
  }
  const cum = new Float64Array(idx.total + 1);
  for (let i = 0; i < idx.total; i++) cum[i + 1] = cum[i] + w[i];
  return { weight: (a, b) => cum[b + 1] - cum[a], total: cum[idx.total] };
}

/**
 * Lays out one ring: each unit ({ a, b, ... }) gets `a0`/`a1` in degrees
 * (0 = 12 o'clock, clockwise) proportional to its text weight, with a thin
 * gap. The ring always closes the full circle, whatever the units' total.
 */
export function layoutRing(units, weigher, { gapDeg = 0.35 } = {}) {
  const weights = units.map((u) => Math.max(0, weigher.weight(u.a, u.b)));
  const total = weights.reduce((x, y) => x + y, 0) || 1;
  let acc = 0;
  return units.map((u, i) => {
    const a0 = (acc / total) * 360;
    acc += weights[i];
    const a1 = (acc / total) * 360;
    const gap = Math.min(gapDeg, (a1 - a0) * 0.15);
    return { ...u, a0: a0 + gap, a1: a1 - gap };
  });
}

/** Clips a unit's global [a, b] to a parent's [A, B]; `part` says the unit
    crosses the parent's edge. Null when it lies wholly outside. */
export function clipSpan(a, b, A, B) {
  const x = Math.max(a, A), y = Math.min(b, B);
  if (x > y) return null;
  return { a: x, b: y, part: a < A || b > B };
}

/** Ring order on the landing wheel, from the middle out (decision 22). */
export const LANDING_RING_ORDER = Object.freeze(["juz", "surah", "hizb", "ruku", "page", "ayah"]);

/** The Show toggle's values (decision 21): all six rings, or one on its own. */
export const WHEEL_SHOW_IDS = Object.freeze(["all", ...LANDING_RING_ORDER]);
