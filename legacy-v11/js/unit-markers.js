// Issue #348, spec section 2 -- "Markers in the text": "Juz N begins",
// "Hizb N begins", "Ruku' N ends ع" and "Page N ends" inside the flowing
// Read view, at exactly the āyāt where a boundary really falls. Pure
// computation only (I2) -- no DOM, no HTML -- so it can be checked against
// the real packaged boundary data directly. quranrevival.html turns the
// returned list into real 40px buttons and wires each one to open the Unit
// Card for the unit it names.
//
// Built from the SAME small boundary tables the rest of this app already
// loads on first use (getJuzIndex()/getHizbIndex()/getPageIndex()/
// getRukuIndex(), app/js/quran-data.js) rather than by diffing one āyah
// against its neighbour: a neighbour diff cannot see across a surah break
// without fetching the ADJACENT surah's own text (an extra, avoidable
// read), and a boundary table already states exactly which surah+āyah a
// Juz/Hizb/Page/Ruku' starts or ends at. A Juz/Hizb/Page genuinely spans a
// surah break sometimes (e.g. Juz 3 starts at Surah 2:253); Ruku' never does
// (ruku-index.json is 556 rows, each confined to one surah) -- the table
// shape already encodes both facts correctly.

import { t, num } from "./i18n.js";
import { buildUnitKey, localRukuIndexFromTable } from "./unit-keys.js";

/**
 * `surahNum`/`fromAyah`/`toAyah` -- the window of āyāt actually being drawn.
 * `boundaries`: `{ juzRows, hizbRows, pageRows, rukuRows, pageEdition }` --
 * the four packaged boundary tables plus the page-numbering edition string
 * (quranrevival.html's own `PAGE_EDITION` constant, "madani").
 *
 * Returns `[{ ayahNum, position: "before" | "after", unitType, unitKey,
 * label }]`, sorted by `ayahNum` -- a "before" marker sits above that āyah's
 * own block in the flow, an "after" marker below it.
 */
export function unitBoundaryMarkersInWindow(surahNum, fromAyah, toAyah, boundaries = {}) {
  const { juzRows = [], hizbRows = [], pageRows = [], rukuRows = [], pageEdition = "madani" } = boundaries;
  const markers = [];

  for (const row of juzRows) {
    if (row.startSurah === surahNum && row.startAyah >= fromAyah && row.startAyah <= toAyah) {
      markers.push({
        ayahNum: row.startAyah, position: "before", unitType: "juz",
        unitKey: buildUnitKey.juz(row.juz), label: t("Juz {n} begins", { n: num(row.juz) }),
      });
    }
  }
  for (const row of hizbRows) {
    if (row.startSurah === surahNum && row.startAyah >= fromAyah && row.startAyah <= toAyah) {
      markers.push({
        ayahNum: row.startAyah, position: "before", unitType: "hizb",
        unitKey: buildUnitKey.hizb(row.hizb), label: t("Hizb {n} begins", { n: num(row.hizb) }),
      });
    }
  }
  for (const row of pageRows) {
    if (row.endSurah === surahNum && row.endAyah >= fromAyah && row.endAyah <= toAyah) {
      markers.push({
        ayahNum: row.endAyah, position: "after", unitType: "page",
        unitKey: buildUnitKey.page(pageEdition, row.page), label: t("Page {n} ends", { n: num(row.page) }),
      });
    }
  }
  const localRukuByGlobal = localRukuIndexFromTable(rukuRows);
  for (const row of rukuRows) {
    if (row.surah === surahNum && row.toAyah >= fromAyah && row.toAyah <= toAyah) {
      const local = localRukuByGlobal.get(row.ruku) ?? row.ruku;
      markers.push({
        ayahNum: row.toAyah, position: "after", unitType: "ruku",
        unitKey: buildUnitKey.ruku(surahNum, local), label: `${t("Ruku' {n} ends", { n: num(local) })} ع`,
      });
    }
  }

  markers.sort((a, b) => a.ayahNum - b.ayahNum);
  return markers;
}
