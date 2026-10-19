// "Learn next" (PCF MSA J40): the Qur'an's dictionary words in order of how often they occur.
// learn-next.json (~780 KB) is fetched on FIRST USE only -- when the Word card's totals box first shows the line --
// never at startup (I9 / the load-speed contract), then cached. Read-only: no Firestore.
const URL_ = "/tools/quran-data-pull/output/learn-next.json";
let promise = null;

export const LEARN_NEXT_PAGE = 100;
// PCF MSA J47 (the Owner, 20 Oct 2026): seven steps, each a tile that opens the words in it.
export const LEARN_NEXT_MILESTONES = [10, 25, 50, 100, 300, 500, 1000];

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
