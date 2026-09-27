// Issue #328 -- the per-Approach "counts for each ayah inside" setting
// (Owner decision 6, 27 Sep 2026: "It can't be justified for all approaches.
// For example, Critical reasoning of a Surah can't be applied to all Ayat
// though for Hifz, yes." then "Enable Yes/No settings moveable between,
// possible?"), and the counting core Explore's own effectiveAyahStatus()/
// poolCoverageStatus() AND the whole-Qur'an "My Status" wheel BOTH read --
// so the two screens can never disagree about what a claim means (Owner
// decision 7: "Explore n status both should be in agreement").
//
// Pure module: no Firebase, DOM, or mutable application state -- the same
// pure/impure split every other *-data.js pair in this codebase already
// uses. quranrevival.html's own inline functions call into this rather than
// re-deriving the rule a second time.

import { STATUSES } from "./unit-keys.js";

export const QURAN_TOTAL_AYAH_COUNT = 6236;
export const WBW_TRACKABLE_ID = "approach_04";

/** onRamp statuses, worst to best -- the same order effectiveAyahStatus() and poolCoverageStatus() have always walked, now named once and shared rather than re-derived per caller. */
export const RAMP_ORDER = Object.freeze(STATUSES.filter((s) => s.onRamp).map((s) => s.id));

/**
 * Starting values, set by the Architect (Owner decision 6, 27 Sep 2026):
 * Yes for 01 Reading (Tajweed), 02 Hifz, 03 Reading (Meaning), 04
 * Word-by-Word, 05 Arabic Writing, 07/08 Listening, 11 Ruqyah Listening;
 * No for every other Approach, module-specific "Studied" trackables
 * included (they are not in this list, so they read No by default).
 */
export const DEFAULT_YES_TRACKABLE_IDS = Object.freeze([
  "approach_01", "approach_02", "approach_03", "approach_04",
  "approach_05", "approach_07", "approach_08", "approach_11",
]);

/**
 * Whether a claim on a bigger unit (Surah/Range/Juz/Ruku'/Hizb/page) counts
 * for each ayah inside it, for this Approach. The live `trackables` document
 * carries the field only once an owner/prime has actually moved it; absent
 * means "read the default list" -- never a silent false, and never a silent
 * true either. `trackable` may be null/undefined (an unresolved trackableId,
 * e.g. a Studied-elsewhere row this Approach setting was never meant to
 * cover) -- that reads as No, the same as any other unlisted id.
 */
export function countsForEachAyah(trackable) {
  const stored = trackable?.countsForEachAyah;
  if (typeof stored === "boolean") return stored;
  return DEFAULT_YES_TRACKABLE_IDS.includes(trackable?.id);
}

/**
 * The "weakest-link"-beating floor one ayah's own claim sits under, from
 * whichever wider-unit spans (Surah/Range/Juz/Ruku'/Hizb/page) cover it.
 * Not Applicable wins outright and is never floored (I7 -- it is an explicit
 * exclusion, not a point on the ramp). `spans`: [{surah, from, to,
 * statusId}], typically spanForUnitKey()'s own output.
 */
export function floorStatus(ownStatusId, spans, surah, ayah) {
  if (ownStatusId === "not_applicable") return ownStatusId;
  let bestIdx = RAMP_ORDER.indexOf(ownStatusId);
  for (const span of spans ?? []) {
    if (span.surah !== surah || ayah < span.from || ayah > span.to) continue;
    const idx = RAMP_ORDER.indexOf(span.statusId);
    if (idx > bestIdx) bestIdx = idx;
  }
  return bestIdx < 0 ? ownStatusId : RAMP_ORDER[bestIdx];
}

/**
 * An ayah's effective status for one trackable -- its own claim, floored by
 * wider-unit spans ONLY when this Approach counts for each ayah inside a
 * bigger unit (Owner decision 6). For a No Approach, an ayah shows only its
 * own claim: `spans` is never consulted at all, which is exactly what
 * "counts only as a claim on that whole unit, never for its ayat" means.
 * This is quranrevival.html's own effectiveAyahStatus(), extracted so
 * Explore and the whole-Qur'an "My Status" counter share one rule rather
 * than two copies that could quietly drift apart.
 */
export function effectiveStatus({ own, spans, surah, ayah, trackable }) {
  if (own === "not_applicable") return own;
  if (!countsForEachAyah(trackable)) return own;
  return floorStatus(own, spans, surah, ayah);
}

/** Which (surah, ayah-range) pairs a boundary spans, using only surah-index.json's ayah counts -- never loads full surah text just to find this out. Generic over Juz/Page/Ruku'/Hizb -- any {startSurah,startAyah,endSurah,endAyah} shape works. Same helper quranrevival.html's own ayahCoverage() computes; `surahIndex` is passed in explicitly here rather than read off a module-level global, so this module stays pure and independently testable. */
export function ayahCoverage(startSurah, startAyah, endSurah, endAyah, surahIndex) {
  if (startSurah === endSurah) return [{ surah: startSurah, from: startAyah, to: endAyah }];
  const ranges = [];
  const startCount = surahIndex?.find((s) => s.surahNumber === startSurah)?.ayahCount ?? startAyah;
  ranges.push({ surah: startSurah, from: startAyah, to: startCount });
  for (let s = startSurah + 1; s < endSurah; s++) {
    const count = surahIndex?.find((x) => x.surahNumber === s)?.ayahCount ?? 0;
    if (count) ranges.push({ surah: s, from: 1, to: count });
  }
  ranges.push({ surah: endSurah, from: 1, to: endAyah });
  return ranges;
}

/**
 * A wider-than-ayah unit key ("surah:2", "juz:3", "page:madani:12",
 * "ruku:2:1", "hizb:5", "range:2:1-7") resolved to the ayah ranges it
 * covers, from already-loaded bundled indexes only (I9 -- never a
 * Firestore read). Same shape and same rule buildExploreWiderSpans() in
 * quranrevival.html has always used -- extracted here so the whole-Qur'an
 * "My Status" counter resolves a claim's own extent identically to
 * Explore, which is what keeps the two screens' numbers from disagreeing
 * (Owner decision 7).
 *
 * `lookups`: { surahIndex, juzIndexData, pageIndexData, rukuRangesBySurah,
 * hizbIndex }. `rukuRangesBySurah` is a Map(surahNumber -> Map(rukuIndex ->
 * {from, to})); `hizbIndex` is the packaged hizb boundary table. Both may be
 * absent (null/undefined) when the caller has not needed to fetch them --
 * this returns [] for a unit type it cannot resolve rather than throwing,
 * the same "nothing to float from yet" shape the caller already treats as
 * "no floor applies".
 */
export function spanForUnitKey(unitKey, lookups = {}) {
  const { surahIndex, juzIndexData, pageIndexData, rukuRangesBySurah, hizbIndex } = lookups;
  const parts = String(unitKey ?? "").split(":");
  if (parts[0] === "surah") {
    const n = Number(parts[1]);
    const count = surahIndex?.find((x) => x.surahNumber === n)?.ayahCount;
    return count ? [{ surah: n, from: 1, to: count }] : [];
  }
  if (parts[0] === "range") {
    const n = Number(parts[1]);
    const [from, to] = String(parts[2] ?? "").split("-").map(Number);
    return from && to ? [{ surah: n, from, to }] : [];
  }
  if (parts[0] === "juz") {
    const j = juzIndexData?.find((x) => x.juz === Number(parts[1]));
    return j ? ayahCoverage(j.startSurah, j.startAyah, j.endSurah, j.endAyah, surahIndex) : [];
  }
  if (parts[0] === "page") {
    const pg = pageIndexData?.find((x) => x.page === Number(parts[2]));
    return pg ? ayahCoverage(pg.startSurah, pg.startAyah, pg.endSurah, pg.endAyah, surahIndex) : [];
  }
  if (parts[0] === "ruku") {
    const n = Number(parts[1]);
    const r = rukuRangesBySurah?.get(n)?.get(Number(parts[2]));
    return r ? [{ surah: n, from: r.from, to: r.to }] : [];
  }
  if (parts[0] === "hizb") {
    const h = hizbIndex?.find((x) => x.hizb === Number(parts[1]));
    return h ? ayahCoverage(h.startSurah, h.startAyah, h.endSurah, h.endAyah, surahIndex) : [];
  }
  return [];
}

/**
 * The "weakest link" pooled status across every ayah a coverage range
 * covers, for one trackable -- Explore's own poolCoverageStatus() AND the
 * whole-Qur'an "My Status" Juz strip BOTH call this rather than each
 * re-deriving the pool, which is what makes "the status Juz strip must
 * equal Explore's Juz colouring" (Owner decision 7) provable rather than
 * merely hoped for. Returns null when nothing at all is countable yet (every
 * ayah Not Applicable, or the Approach is No -- see below) -- the caller
 * falls back to a direct claim on the wider unit itself in that case,
 * exactly as every Explore wedge already does.
 *
 * Issue #328 (Owner decision 6) -- for a No Approach, pooling from
 * ayah-level claims never happens at all: this returns null immediately,
 * "counts only as a claim on that whole unit, never for its ayat".
 *
 * `ownStatus(surah, ayah)`: a function reading one ayah's own claimedStatus
 * ("not_started" default) -- abstracts over WHERE the claim actually lives
 * (Explore's per-surah chunks, or My Status's own whole-person map), so the
 * pooling rule itself never has to know or care.
 */
export function poolStatus(coverage, { ownStatus, spans, trackable } = {}) {
  if (!countsForEachAyah(trackable)) return null;
  let worstIdx = null;
  let anyCounted = false;
  for (const { surah, from, to } of coverage ?? []) {
    for (let ayah = from; ayah <= to; ayah++) {
      const own = ownStatus ? ownStatus(surah, ayah) : "not_started";
      const statusId = effectiveStatus({ own, spans, surah, ayah, trackable });
      if (statusId === "not_applicable") continue;
      anyCounted = true;
      const idx = RAMP_ORDER.indexOf(statusId);
      if (worstIdx === null || idx < worstIdx) worstIdx = idx;
    }
  }
  return anyCounted ? RAMP_ORDER[worstIdx] : null;
}

/**
 * How many distinct wider-than-ayah claims (any real onRamp status, Not
 * Applicable excluded -- I7) this trackable carries, grouped by unit type --
 * the No-Approach "studied as a whole" line (e.g. "3 Surahs, 1 Juz"). Only
 * meaningful for a No Approach: a Yes Approach's wider claims already moved
 * the ayah tally above via floorStatus(), so counting them again here would
 * double-report the same claim two different ways.
 *
 * `wideEntries`: [{ unitType, statusId }], everything from one trackable's
 * records that is NOT an ayah: key.
 */
export function tallyWideClaimsByUnitType(wideEntries) {
  const counts = {};
  for (const { unitType, statusId } of wideEntries ?? []) {
    // Same three-part exclusion buildExploreWiderSpans() uses for a floor:
    // no unit type, Not Applicable (I7), or "not_started" -- a claim nobody
    // has actually moved off its default is not something "studied as a
    // whole" should report -- and anything RAMP_ORDER does not recognise.
    if (!unitType || !statusId || statusId === "not_applicable" || statusId === "not_started" || RAMP_ORDER.indexOf(statusId) < 0) continue;
    counts[unitType] = (counts[unitType] ?? 0) + 1;
  }
  return counts;
}

/**
 * The whole-Qur'an, ayah-level tally for one Approach -- "My Status"'s own
 * headline arithmetic, and the exact same per-ayah rule Explore's wedges
 * apply (effectiveStatus() above), just walked over all 6,236 ayat instead
 * of one wedge's own coverage. Not Applicable is excluded from totals, not
 * counted as zero (I7).
 *
 * `surahAyahCounts`: [{surahNumber, ayahCount}], i.e. surah-index.json.
 * `ownAyahStatusesBySurahAyah`: Map("surah:ayah" -> claimedStatus), this
 *   trackable's own direct ayah claims only (never a wider unit's).
 * `wideSpans`: this trackable's resolved wider-unit floors (spanForUnitKey()
 *   output, flattened across every wide claim) -- consulted only when this
 *   Approach counts for each ayah (Owner decision 6); ignored outright
 *   otherwise, via effectiveStatus()'s own gate, so passing them regardless
 *   of the setting is always safe.
 * `wideClaimsByUnitType`: tallyWideClaimsByUnitType()'s own output, carried
 *   through untouched as `studiedAsWhole` for a No Approach.
 */
export function summarizeApproachAyahCoverage({
  trackable,
  surahAyahCounts,
  ownAyahStatusesBySurahAyah,
  wideSpans,
  wideClaimsByUnitType,
} = {}) {
  const yes = countsForEachAyah(trackable);
  const counts = { not_started: 0, learning: 0, practising: 0, achieved: 0, mastered: 0 };
  let excludedNotApplicable = 0;
  for (const { surahNumber, ayahCount } of surahAyahCounts ?? []) {
    for (let ayah = 1; ayah <= ayahCount; ayah++) {
      const own = ownAyahStatusesBySurahAyah?.get(`${surahNumber}:${ayah}`) ?? "not_started";
      const statusId = effectiveStatus({ own, spans: wideSpans, surah: surahNumber, ayah, trackable });
      if (statusId === "not_applicable") { excludedNotApplicable++; continue; }
      counts[statusId] = (counts[statusId] ?? 0) + 1;
    }
  }
  const countedTotal = Object.values(counts).reduce((a, b) => a + b, 0);
  const achievedOrMastered = counts.achieved + counts.mastered;
  return {
    trackableId: trackable?.id ?? null,
    countsForEachAyah: yes,
    counts,
    excludedNotApplicable,
    countedTotal,
    achievedOrMastered,
    // Only meaningful, and only ever shown, for a No Approach -- see
    // tallyWideClaimsByUnitType()'s own doc comment.
    studiedAsWhole: yes ? null : { ...(wideClaimsByUnitType ?? {}) },
  };
}

/** 0..1, never NaN/Infinity -- the wheel slice's own fill ratio for one Approach's summary: Achieved + Mastered out of everything counted (Owner decision 8: "count Achieved + Mastered"). WBW's own headline is words, not ayat -- callers must use quran-word-total.js's wordTotalRatio() for approach_04 instead of this, never this. */
export function achievedOrMasteredRatio(summary) {
  const total = summary?.countedTotal ?? 0;
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Math.max(0, Math.min(1, (summary?.achievedOrMastered ?? 0) / total));
}
