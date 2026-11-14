// Keys to Understanding -- the teacher's view, the counting (PCF MSA J03, round K4, 4 Nov 2026).
//
// PURE: imports nothing but the mark vocabulary, reads and writes nothing, touches no DOM. Given each student's
// own marks documents' `entries` (ayah-keys-data.js's loadPersonSurahKeys / loadPersonHadithKeys), it says:
//   - per student, how many āyāt, Qur'an words, hadith and hadith words carry each mark (Difficult, Need
//     practice, Done) -- an item with two marks counts once under each;
//   - "marked by most students": every āyah, word, hadith and hadith word that at least one student marked
//     Difficult or Need practice, ordered by how many DISTINCT students did (ties by the unit key, so the order is
//     the same on every device). Done is "known / studied", the opposite of a difficulty, so it never ranks an
//     item; each ranked item still says how many students marked it Done.
//
// The Qur'an document is one sūrah's (ayahKeyMarks/{tenant}__{person}__{surah}); a key from another sūrah in it
// would be a corrupt row and is ignored, never counted. The hadith document is one collection's, the whole of it:
// its counts do not depend on the sūrah picked.

import { MARK_IDS, marksIn } from "./ayah-keys.js";

/** The four kinds of item a mark can sit on, in the order the view shows them. */
export const KEY_KINDS = Object.freeze(["ayah", "qword", "hadith", "hadithword"]);

/** The marks that make an item a difficulty (Done is not one). */
export const DIFFICULTY_MARKS = Object.freeze(MARK_IDS.filter((m) => m !== "done"));

const zero = () => Object.fromEntries(MARK_IDS.map((m) => [m, 0]));

/**
 * The kind and parts of one unit key, or null when it is not a key the view counts for `surah`.
 * ayah:<s>:<a> | qword:<s>:<a>:<pos> | hadith:<collection>:<n> | hadithword:<collection>:<n>:<pos>
 */
export function parseKeyUnit(unitKey, surah) {
  if (typeof unitKey !== "string") return null;
  const p = unitKey.split(":");
  const whole = (x) => /^[1-9][0-9]*$/.test(x);
  if (p[0] === "ayah" && p.length === 3 && whole(p[1]) && whole(p[2])) {
    return Number(p[1]) === surah ? { kind: "ayah", surah: Number(p[1]), ayah: Number(p[2]) } : null;
  }
  if (p[0] === "qword" && p.length === 4 && whole(p[1]) && whole(p[2]) && whole(p[3])) {
    return Number(p[1]) === surah ? { kind: "qword", surah: Number(p[1]), ayah: Number(p[2]), position: Number(p[3]) } : null;
  }
  if (p[0] === "hadith" && p.length === 3 && p[1] && p[2]) return { kind: "hadith", collection: p[1], number: p[2] };
  if (p[0] === "hadithword" && p.length === 4 && p[1] && p[2] && whole(p[3])) {
    return { kind: "hadithword", collection: p[1], number: p[2], position: Number(p[3]) };
  }
  return null;
}

/**
 * students: [{ personId, name, surahDoc, hadithDoc }] where surahDoc / hadithDoc are `entries` maps (unit key ->
 * key ids) or null/undefined when nothing is marked. A student whose read failed carries `error` and is listed
 * with no counts.
 * Returns { surah, students: [{ personId, name, error, counts: { ayah: {hard,practice,done}, qword, hadith,
 * hadithword }, total }], mostMarked: [{ unitKey, kind, ...parts, students, byMark: {hard,practice,done} }] }.
 */
export function teacherViewModel(students, surah) {
  const rows = [];
  const tally = new Map(); // unitKey -> { parsed, who: Set (difficulty), byMark: {mark: Set} }
  for (const s of Array.isArray(students) ? students : []) {
    const counts = Object.fromEntries(KEY_KINDS.map((k) => [k, zero()]));
    let total = 0;
    if (!s.error) {
      for (const doc of [s.surahDoc, s.hadithDoc]) {
        for (const [unitKey, ids] of Object.entries(doc || {})) {
          const parsed = parseKeyUnit(unitKey, surah);
          if (!parsed) continue;
          const marks = marksIn(ids);
          if (!marks.length) continue;
          total++;
          for (const m of marks) counts[parsed.kind][m]++;
          let row = tally.get(unitKey);
          if (!row) { row = { parsed, who: new Set(), byMark: Object.fromEntries(MARK_IDS.map((m) => [m, new Set()])) }; tally.set(unitKey, row); }
          for (const m of marks) row.byMark[m].add(s.personId);
          if (marks.some((m) => DIFFICULTY_MARKS.includes(m))) row.who.add(s.personId);
        }
      }
    }
    rows.push({ personId: s.personId, name: s.name, error: s.error || null, counts, total });
  }
  const mostMarked = [...tally.entries()]
    .filter(([, r]) => r.who.size > 0)
    .map(([unitKey, r]) => ({
      unitKey, ...r.parsed, students: r.who.size,
      byMark: Object.fromEntries(MARK_IDS.map((m) => [m, r.byMark[m].size])),
    }))
    .sort((a, b) => b.students - a.students || (a.unitKey < b.unitKey ? -1 : a.unitKey > b.unitKey ? 1 : 0));
  return { surah, students: rows, mostMarked };
}
