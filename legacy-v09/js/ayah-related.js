// Ayah Card, section C part 1 -- "Related āyāt" (the Owner's decision, 25 Sep
// 2026, recorded on issue #295): āyāt that share this āyah's RARER words,
// worked out from the packaged Qur'an data and the same for every reader,
// together with the āyāt the reader's own madrasah has put in the same QCR
// collection or tied to the same Asma ul Husna Name.
//
// Section C part 2 -- "Connected āyāt" (issue #318, the Owner's decision
// recorded on issue #295 and docs/governance/2026-09-26-owner-decisions.md):
// āyāt the reader's OWN Notes and Mapping folders connect to this one, each
// marked studied or not. Unlike part 1, this is reader-specific rather than
// the same for everyone -- see connectedThroughNotes() below.
//
// Pure: no Firebase, no DOM, no fetch. The caller hands in the lemma index
// it already loads for the Word Card (quran-word-index.js), the QCR
// collections and the resolved Asma entries for part 1; for part 2 the
// caller resolves the reader's own Note/folder data first (which notes are
// filed where, which anchor which āyah) and hands in the already-labelled
// result -- this file only aggregates, sorts and caps what it is given, so
// every rule here can be tested without a page or Firebase.

const QURAN_TOTAL_WORDS = 77429; // same measured total quran-word-total.js exports

/** Very common words (Allah, min, fi, the particles) relate every āyah to
    thousands of others and so relate nothing; a lemma more frequent than
    this is left out of the score. */
export const RELATED_MAX_LEMMA_FREQUENCY = 250;
export const RELATED_SHARED_WORDS_LIMIT = 8;
export const RELATED_LISTS_LIMIT = 12;

const ayahCode = (surah, ayah) => surah * 1000 + ayah;
const byAyah = (a, b) => a.surah - b.surah || a.ayah - b.ayah;

// lemma index values object -> Map(ayahCode -> Set(lemma)), built once per index.
const ayahLemmaCache = new WeakMap();
function lemmasByAyah(values) {
  let map = ayahLemmaCache.get(values);
  if (!map) {
    map = new Map();
    for (const [lemma, refs] of Object.entries(values)) {
      for (const ref of refs) {
        const code = Math.floor(ref / 1000);
        if (!map.has(code)) map.set(code, new Set());
        map.get(code).add(lemma);
      }
    }
    ayahLemmaCache.set(values, map);
  }
  return map;
}

/**
 * Āyāt sharing this āyah's rarer words, strongest first.
 * `values` is the lemma index's own `values` object: lemma -> packed refs
 * (surah*1000000 + ayah*1000 + position). Each shared lemma adds
 * log(total words / its frequency), counted once per āyah however many times
 * it occurs there -- so two rare shared words outweigh five common ones.
 * Returns [{ surah, ayah, score, sharedCount }].
 */
export function relatedBySharedWords(values, surah, ayah, {
  limit = RELATED_SHARED_WORDS_LIMIT, maxFrequency = RELATED_MAX_LEMMA_FREQUENCY,
} = {}) {
  if (!values || typeof values !== "object") return [];
  const own = lemmasByAyah(values).get(ayahCode(surah, ayah));
  if (!own) return [];
  const self = ayahCode(surah, ayah);
  const scores = new Map();
  for (const lemma of own) {
    const refs = values[lemma] ?? [];
    if (refs.length > maxFrequency) continue;
    const weight = Math.log(QURAN_TOTAL_WORDS / refs.length);
    const seen = new Set();
    for (const ref of refs) {
      const code = Math.floor(ref / 1000);
      if (code === self || seen.has(code)) continue;
      seen.add(code);
      const entry = scores.get(code) ?? { surah: Math.floor(code / 1000), ayah: code % 1000, score: 0, sharedCount: 0 };
      entry.score += weight;
      entry.sharedCount += 1;
      scores.set(code, entry);
    }
  }
  return [...scores.values()]
    .sort((a, b) => b.score - a.score || byAyah(a, b))
    .slice(0, limit)
    .map((e) => ({ ...e, score: Math.round(e.score * 100) / 100 }));
}

const AYAH_KEY = /^ayah:(\d+):(\d+)$/;

/**
 * Āyāt the madrasah itself has placed alongside this one: in the same
 * (active) QCR collection, or cited by the same Asma ul Husna Name.
 * `qcrCollections`: [{ id, name(string), status, items: ["ayah:s:a", ...] }].
 * `asmaEntries`: [{ number, name(string), citations: [{ kind, surah, ayah }] }]
 * -- the caller resolves display names in the reader's language.
 * Returns [{ surah, ayah, via: [{ kind: "qcr"|"asma", label }] }], the āyāt
 * with the most shared lists first.
 */
export function relatedThroughLists({ surah, ayah, qcrCollections = [], asmaEntries = [], limit = RELATED_LISTS_LIMIT } = {}) {
  const selfKey = `ayah:${surah}:${ayah}`;
  const found = new Map();
  const add = (s, a, via) => {
    if (s === surah && a === ayah) return;
    const code = ayahCode(s, a);
    const entry = found.get(code) ?? { surah: s, ayah: a, via: [] };
    if (!entry.via.some((v) => v.kind === via.kind && v.label === via.label)) entry.via.push(via);
    found.set(code, entry);
  };
  for (const c of qcrCollections) {
    if (c?.status === "archived" || !Array.isArray(c?.items) || !c.items.includes(selfKey)) continue;
    for (const item of c.items) {
      const m = AYAH_KEY.exec(item);
      if (m) add(Number(m[1]), Number(m[2]), { kind: "qcr", label: c.name });
    }
  }
  for (const e of asmaEntries) {
    const quran = (e?.citations ?? []).filter((c) => c.kind === "quran");
    if (!quran.some((c) => c.surah === surah && c.ayah === ayah)) continue;
    for (const c of quran) add(c.surah, c.ayah, { kind: "asma", label: e.name });
  }
  return [...found.values()]
    .sort((a, b) => b.via.length - a.via.length || byAyah(a, b))
    .slice(0, limit);
}

export const RELATED_CONNECTED_LIMIT = 12;

/**
 * Section C part 2, "Connected āyāt" (issue #318) -- āyāt the reader's OWN
 * Notes and Mapping folders connect to `{ surah, ayah }`, strongest first.
 *
 * This function does none of the resolving itself (no Firebase, no DOM): the
 * caller has already worked out, from the reader's own data, exactly which
 * OTHER permanent Study Unit keys are reachable and why, and hands them in as
 * two flat, already-labelled lists --
 *
 *   `noteLinks`:     [{ sourceKey, label }, ...] -- one row per OTHER anchor
 *                     of a Note that is ALSO anchored to `{ surah, ayah }`
 *                     ("through a Note"). `label` is that Note's own title.
 *   `folderFilings`: [{ sourceKey, label }, ...] -- one row per OTHER anchor
 *                     reachable through a Mapping folder that ALSO files a
 *                     Note on `{ surah, ayah }` ("through a folder"). `label`
 *                     is the folder's own name.
 *
 * `sourceKey` is a permanent unit key (`unit-keys.js`'s own shape); only the
 * `ayah:S:A` form produces a result here -- a Note or folder also touching a
 * juz, surah, topic etc. names nothing this function can show as an āyah.
 *
 * TWO ROUTES TO THE SAME ĀYAH COLLAPSE INTO ONE ROW WITH TWO REASONS, the
 * identical shape relatedThroughLists() already uses for "same QCR AND same
 * Asma Name" -- `via` is deduplicated by (kind, label) and never grows a
 * second entry for the identical reason offered twice.
 *
 * `studiedKeys` is a plain object keyed `"surah:ayah"`. A key's VALUE is
 * `true`/`false` when the reader's own records for that surah are already in
 * memory (a claimed-or-confirmed Approach exists, or does not); the key is
 * ABSENT when that surah's records were never loaded, which is read as "not
 * checked" -- distinct from "checked and not studied", and never guessed by
 * reading 114 chunks to find out (see quranrevival.html's own
 * studiedStatusForAyah()). Each result's `studied` is `true`, `false`, or
 * `null` for "not checked" -- a stricter answer than a plain boolean, because
 * the render spec needs all three told apart in words.
 */
export function connectedThroughNotes({ surah, ayah, noteLinks = [], folderFilings = [], studiedKeys = {} } = {}) {
  const found = new Map();
  const add = (sourceKey, via) => {
    const m = AYAH_KEY.exec(sourceKey ?? "");
    if (!m) return;
    const s = Number(m[1]);
    const a = Number(m[2]);
    if (s === surah && a === ayah) return;
    const code = ayahCode(s, a);
    const entry = found.get(code) ?? { surah: s, ayah: a, via: [] };
    if (!entry.via.some((v) => v.kind === via.kind && v.label === via.label)) entry.via.push(via);
    found.set(code, entry);
  };
  for (const link of noteLinks) add(link?.sourceKey, { kind: "note", label: link?.label ?? "" });
  for (const filing of folderFilings) add(filing?.sourceKey, { kind: "folder", label: filing?.label ?? "" });
  return [...found.values()]
    .map((entry) => {
      const key = `${entry.surah}:${entry.ayah}`;
      const studied = Object.prototype.hasOwnProperty.call(studiedKeys, key) ? !!studiedKeys[key] : null;
      return { ...entry, studied };
    })
    .sort((a, b) => b.via.length - a.via.length || byAyah(a, b))
    .slice(0, RELATED_CONNECTED_LIMIT);
}
