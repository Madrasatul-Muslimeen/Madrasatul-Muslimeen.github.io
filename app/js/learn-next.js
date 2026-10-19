// "Learn next" (PCF MSA J40): the Qur'an's dictionary words in order of how often they occur.
// learn-next.json (~780 KB) is fetched on FIRST USE only -- when the Word card's totals box first shows the line --
// never at startup (I9 / the load-speed contract), then cached. Read-only: no Firestore.
const URL_ = "/tools/quran-data-pull/output/learn-next.json";
let promise = null;

export const LEARN_NEXT_PAGE = 100;
export const LEARN_NEXT_MILESTONES = [10, 100, 300, 1000];

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

/** The rows to draw: known ones dropped when `hideKnown`, then the first `shown`. */
export function visibleRows(rows, isKnown, { hideKnown = false, shown = LEARN_NEXT_PAGE } = {}) {
  const list = hideKnown ? rows.filter((row) => !isKnown(row)) : rows;
  return { rows: list.slice(0, shown), total: list.length };
}

/** "surah:ayah:position" parts of a data row's first-occurrence id (surah*1000000+ayah*1000+position). */
export function placeOfRow(row) {
  const o = Number(row.o);
  return { surah: Math.floor(o / 1000000), ayah: Math.floor((o % 1000000) / 1000), position: o % 1000 };
}
