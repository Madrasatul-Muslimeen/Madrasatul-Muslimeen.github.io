// Issue #348 -- resolving an ARBITRARY unit key (not just "whatever the
// Study Unit picker currently holds", the way currentUnitInfo() in
// quranrevival.html works) into its own chunkKey, āyah span and display
// label, and building the ladder of containing units for a given āyah.
// Pure (I2): everything it needs -- the four packaged boundary tables and
// the surah index -- is handed in by the caller, which already holds them
// (the same tables approach-coverage.js's own spanForUnitKey() takes).

import { t, num } from "./i18n.js";
import { parseUnitKey, buildUnitKey, localRukuIndexFromTable } from "./unit-keys.js";

/** True when (surah, ayah) falls inside a boundary row's own
    [startSurah:startAyah, endSurah:endAyah] span -- correct whether the
    span sits inside one surah or crosses several. */
function ayahInSpan(row, surah, ayah) {
  if (surah < row.startSurah || surah > row.endSurah) return false;
  if (surah === row.startSurah && ayah < row.startAyah) return false;
  if (surah === row.endSurah && ayah > row.endAyah) return false;
  return true;
}

/**
 * `tables`: `{ juzRows, hizbRows, pageRows, rukuRows, surahIndex, pageEdition }`.
 * Returns `{ unitType, unitKey, chunkKey, fromSurah, fromAyah, toSurah,
 * toAyah, label }`, or `null` for a unit key naming something these tables
 * cannot resolve (a Quarter/Manzil/Hadith/Topic/Name key, or a malformed
 * one) -- callers must check for `null` rather than assume every unit key
 * this app can build is one the Unit Card can act on.
 */
export function resolveUnitInfo(unitKey, tables = {}) {
  const { juzRows = [], hizbRows = [], pageRows = [], rukuRows = [], surahIndex = [] } = tables;
  const { unitType, parts } = parseUnitKey(unitKey);

  if (unitType === "ayah") {
    const surah = Number(parts[0]), ayah = Number(parts[1]);
    return {
      unitType, unitKey, chunkKey: `surah_${surah}`,
      fromSurah: surah, fromAyah: ayah, toSurah: surah, toAyah: ayah,
      label: t("Surah {surah}, Ayah {ayah}", { surah: num(surah), ayah: num(ayah) }),
    };
  }
  if (unitType === "range") {
    const surah = Number(parts[0]);
    const [from, to] = (parts[1] ?? "").split("-").map(Number);
    if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
    return {
      unitType, unitKey, chunkKey: `surah_${surah}`,
      fromSurah: surah, fromAyah: from, toSurah: surah, toAyah: to,
      label: t("Ayahs {from}–{to} of Surah {surah}", { from: num(from), to: num(to), surah: num(surah) }),
    };
  }
  if (unitType === "surah") {
    const surah = Number(parts[0]);
    const meta = surahIndex.find((s) => s.surahNumber === surah);
    if (!meta) return null;
    return {
      unitType, unitKey, chunkKey: `surah_${surah}`,
      fromSurah: surah, fromAyah: 1, toSurah: surah, toAyah: meta.ayahCount,
      label: t("Whole Surah {surah}", { surah: num(surah) }),
    };
  }
  if (unitType === "ruku") {
    const surah = Number(parts[0]);
    const local = Number(parts[1]);
    const localMap = localRukuIndexFromTable(rukuRows);
    const row = rukuRows.find((r) => r.surah === surah && localMap.get(r.ruku) === local);
    if (!row) return null;
    return {
      unitType, unitKey, chunkKey: `surah_${surah}`,
      fromSurah: surah, fromAyah: row.fromAyah, toSurah: surah, toAyah: row.toAyah,
      label: t("Ruku' {ruku} of Surah {surah} (ayahs {from}–{to})", { ruku: num(local), surah: num(surah), from: num(row.fromAyah), to: num(row.toAyah) }),
    };
  }
  if (unitType === "juz") {
    const n = Number(parts[0]);
    const row = juzRows.find((r) => r.juz === n);
    if (!row) return null;
    return {
      unitType, unitKey, chunkKey: "subject_quran",
      fromSurah: row.startSurah, fromAyah: row.startAyah, toSurah: row.endSurah, toAyah: row.endAyah,
      label: t("Juz {juz}", { juz: num(n) }),
    };
  }
  if (unitType === "hizb") {
    const n = Number(parts[0]);
    const row = hizbRows.find((r) => r.hizb === n);
    if (!row) return null;
    return {
      unitType, unitKey, chunkKey: "subject_quran",
      fromSurah: row.startSurah, fromAyah: row.startAyah, toSurah: row.endSurah, toAyah: row.endAyah,
      label: t("Hizb {hizb}", { hizb: num(n) }),
    };
  }
  if (unitType === "page") {
    const n = Number(parts[1]);
    const row = pageRows.find((r) => r.page === n);
    if (!row) return null;
    return {
      unitType, unitKey, chunkKey: "subject_quran",
      fromSurah: row.startSurah, fromAyah: row.startAyah, toSurah: row.endSurah, toAyah: row.endAyah,
      label: t("Page {page}", { page: num(n) }),
    };
  }
  return null;
}

/**
 * The ladder for the āyah a card was opened from/at -- Āyah → Ruku' → Page →
 * Hizb → Juz → Surah, in that fixed order (spec's own order), each rung a
 * real unit key resolved from the SAME boundary tables resolveUnitInfo()
 * uses. `activeUnitType` marks whichever rung is the one currently shown
 * (`aria-current`).
 */
export function ladderRungsForAyah(surahNum, ayahNum, tables = {}, activeUnitType = "ayah") {
  const { juzRows = [], hizbRows = [], pageRows = [], rukuRows = [], surahIndex = [], pageEdition = "madani" } = tables;
  const rungs = [
    { unitType: "ayah", unitKey: buildUnitKey.ayah(surahNum, ayahNum), label: t("Ayah {n}", { n: num(ayahNum) }) },
  ];

  const rukuRow = rukuRows.find((r) => r.surah === surahNum && ayahNum >= r.fromAyah && ayahNum <= r.toAyah);
  if (rukuRow) {
    const local = localRukuIndexFromTable(rukuRows).get(rukuRow.ruku) ?? rukuRow.ruku;
    rungs.push({ unitType: "ruku", unitKey: buildUnitKey.ruku(surahNum, local), label: t("Ruku' {n}", { n: num(local) }) });
  }

  const pageRow = pageRows.find((r) => ayahInSpan(r, surahNum, ayahNum));
  if (pageRow) rungs.push({ unitType: "page", unitKey: buildUnitKey.page(pageEdition, pageRow.page), label: t("Page {n}", { n: num(pageRow.page) }) });

  const hizbRow = hizbRows.find((r) => ayahInSpan(r, surahNum, ayahNum));
  if (hizbRow) rungs.push({ unitType: "hizb", unitKey: buildUnitKey.hizb(hizbRow.hizb), label: t("Hizb {n}", { n: num(hizbRow.hizb) }) });

  const juzRow = juzRows.find((r) => ayahInSpan(r, surahNum, ayahNum));
  if (juzRow) rungs.push({ unitType: "juz", unitKey: buildUnitKey.juz(juzRow.juz), label: t("Juz {n}", { n: num(juzRow.juz) }) });

  const meta = surahIndex.find((s) => s.surahNumber === surahNum);
  rungs.push({ unitType: "surah", unitKey: buildUnitKey.surah(surahNum), label: meta?.nameEnglish ?? t("Surah {n}", { n: num(surahNum) }) });

  return rungs.map((r) => ({ ...r, active: r.unitType === activeUnitType }));
}
