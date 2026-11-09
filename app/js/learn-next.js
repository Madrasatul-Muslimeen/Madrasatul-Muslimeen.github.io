// "Learn next" (PCF MSA J40): the Qur'an's dictionary words in order of how often they occur.
// learn-next.json (~780 KB) is fetched on FIRST USE only -- when the Word card's totals box first shows the line --
// never at startup (I9 / the load-speed contract), then cached. Read-only: no Firestore.
const URL_ = "/tools/quran-data-pull/output/learn-next.json";
let promise = null;

export const LEARN_NEXT_PAGE = 100;
// PCF MSA J47 (the Owner, 20 Oct 2026): seven steps, each a tile that opens the words in it.
// PCF MSA J55 (the Owner, 20 Oct 2026: "how many words more makes 95%?"): 1,500 (92.6%) and 2,020, the first step
// at 95% of the Qur'an's words (2,000 is 94.9%).
export const LEARN_NEXT_MILESTONES = [10, 25, 50, 100, 300, 500, 1000, 1500, 2020];

export function loadLearnNext() {
  if (!promise) {
    promise = fetch(URL_).then((res) => {
      if (!res.ok) throw new Error(`Couldn't load the Learn next list (HTTP ${res.status}).`);
      return res.json();
    }).catch((err) => { promise = null; throw err; });
  }
  return promise;
}

/** The highest-ranked row for which isKnown(row) is false, or null. */
export function firstUnknownRow(rows, isKnown) {
  for (const row of rows ?? []) if (!isKnown(row)) return row;
  return null;
}

/** [{ n, percent }] for the milestone tiles, read off the data's cumulative column. */
export function milestoneFigures(rows) {
  return LEARN_NEXT_MILESTONES.filter((n) => rows?.[n - 1]).map((n) => ({ n, percent: rows[n - 1].p }));
}

/** J47 -- the ranks a step tile opens: 1..n, or only the step's new words (the previous milestone + 1 .. n). */
export function stepRange(n, onlyNew = false) {
  const i = LEARN_NEXT_MILESTONES.indexOf(n);
  if (i < 0) return null;
  return { from: onlyNew && i > 0 ? LEARN_NEXT_MILESTONES[i - 1] + 1 : 1, to: n };
}

/** J47 -- one word's own share of the Qur'an's words, in percent (what learning THIS word adds). */
export function wordShare(row, total) {
  return total > 0 ? (100 * Number(row.n)) / total : 0;
}

/** J55 ("each word should also show its own percentage"): a share written so a rare word never reads 0.0 --
 *  one decimal from 1%, two from 0.1%, three below (20 of 74,122 places = 0.027). Digits only; the page adds "+" and "%". */
export function formatShare(p) {
  const v = Number(p) || 0;
  return v.toFixed(v >= 1 ? 1 : v >= 0.1 ? 2 : 3);
}

/** The rows to draw: the step's ranks when `range` is given, known ones dropped when `hideKnown`, then the first `shown`. */
export function visibleRows(rows, isKnown, { hideKnown = false, shown = LEARN_NEXT_PAGE, range = null } = {}) {
  const ranged = range ? rows.filter((row) => row.r >= range.from && row.r <= range.to) : rows;
  const list = hideKnown ? ranged.filter((row) => !isKnown(row)) : ranged;
  return { rows: list.slice(0, shown), total: list.length };
}

/** "surah:ayah:position" parts of a data row's first-occurrence id (surah*1000000+ayah*1000+position). */
export function placeOfRow(row) {
  const o = Number(row.o);
  return { surah: Math.floor(o / 1000000), ayah: Math.floor((o % 1000000) / 1000), position: o % 1000 };
}

// ---- PCF MSA J48 round 3 (the Owner, 21 Oct 2026: "another Wheel display should show the progress of the 9 segments")
// The Vocabulary Wheel and the badge read the same figures. A step is PASSED when every word in it (1..n) is known --
// the Word card's own marks, so there is no new store and no Rules change.

/** One entry per step: its new words (previous step + 1 .. n) and all its words (1 .. n), known counts, passed. */
export function vocabStepFigures(rows, isKnown) {
  const list = rows ?? [];
  const known = list.map((row) => !!isKnown(row));
  let prev = 0;
  return LEARN_NEXT_MILESTONES.filter((n) => list[n - 1]).map((n) => {
    let all = 0, fresh = 0;
    for (let i = 0; i < n; i++) if (known[i]) { all++; if (i >= prev) fresh++; }
    const out = { n, from: prev + 1, to: n, newSize: n - prev, newKnown: fresh, allKnown: all, passed: all === n };
    prev = n;
    return out;
  });
}

/** How much of a step's segment is filled (0..1): by the step's own new words ("new"), or by all words up to it ("all"). */
export function vocabStepFill(step, mode = "new") {
  return mode === "all" ? step.allKnown / step.n : step.newKnown / step.newSize;
}

/** The badge's figures: words known, the share of the Qur'an's words they cover (percent), steps passed, next step. */
export function vocabBadgeFigures(rows, total, isKnown) {
  let words = 0, occurrences = 0;
  for (const row of rows ?? []) if (isKnown(row)) { words++; occurrences += Number(row.n) || 0; }
  const steps = vocabStepFigures(rows, isKnown);
  const next = steps.find((s) => !s.passed) ?? null;
  return { words, share: total > 0 ? (100 * occurrences) / total : 0, steps, passed: steps.filter((s) => s.passed).length, next: next ? next.n : null };
}

// MSA · QR J133 (the Owner, 9 Nov 2026): the Learn next sheet follows the Word Card's level. WbW is learn-next.json (a
// row per dictionary word); Family and Root rows are folded from it offline into learn-next-levels.json
// (tools/quran-data-pull/build-learn-next-levels.mjs), fetched only when the reader first leaves WbW. Root, Taṣrīf and
// Depth are all marks on a ROOT, so they share the root rows and differ only in which marks count as known.
export const LEARN_NEXT_LEVELS = Object.freeze(["wbw", "intermediate", "basic", "tasrif", "depth"]);
const LEVELS_URL = "/tools/quran-data-pull/output/learn-next-levels.json";
let levelsPromise = null;
export function loadLearnNextLevels() {
  if (!levelsPromise) {
    levelsPromise = fetch(LEVELS_URL).then((res) => {
      if (!res.ok) throw new Error(`Couldn't load the Learn next levels (HTTP ${res.status}).`);
      return res.json();
    }).catch((err) => { levelsPromise = null; throw err; });
  }
  return levelsPromise;
}
/** What one row of a level is: a word, a Family (meaning group) or a root. */
export function unitOfLevel(level) { return level === "wbw" ? "word" : level === "basic" ? "family" : "root"; }
/** The rows the sheet lists at `level`; `levels` is the learn-next-levels.json document (not needed for WbW). */
export function rowsForLevel(level, base, levels) {
  if (level === "wbw") return base?.rows ?? [];
  if (level === "basic") return levels?.family?.rows ?? [];
  return levels?.root?.rows ?? [];
}
