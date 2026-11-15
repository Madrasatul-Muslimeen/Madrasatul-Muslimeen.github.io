// "Words you already know" (the Owner, 15 Nov 2026, from 110L's Learn next demo and the Owner's corrections): the Learn next
// sheet's first step. Words a reader knows before learning anything -- Allah's Names (taken from the Asma GROUPS, not the 99
// list), the Prophets' names, well-known names, words of Ebadah (Rituals), words of daily life, and words in the reader's own
// language -- each ticked or unticked by the reader, so the step shows their REAL status.
// Pure: no Firebase, no DOM. learn-known-groups.json (4 KB) is fetched on first use with the Learn next list (I9), never at startup.
// A tick is the Word card's own WbW mark through the page (vocabWrite), so there is no second "known" store and no Rules change.
const URL_ = "/tools/quran-data-pull/output/learn-known-groups.json";
let promise = null;

export const KNOWN_LANGUAGE_GROUP = "language";

export function loadKnownGroups() {
  if (!promise) {
    promise = fetch(URL_).then((res) => {
      if (!res.ok) throw new Error(`Couldn't load the already-known groups (HTTP ${res.status}).`);
      return res.json();
    }).catch((err) => { promise = null; throw err; });
  }
  return promise;
}

/** The Asma GROUPS as lists of Names, each Name with its Qur'an dictionary word (or null: it appears in another form, or not at all).
 *  `collections` is the Asma groups ({ id, title, items: ["name:N", ...] }), `nameInfo(number)` the Name's own facts, `nameToLemma` the data file's map. */
export function asmaGroupsOfNames(collections, nameInfo, nameToLemma) {
  return (collections ?? []).filter((c) => c.status !== "archived" && Array.isArray(c.items)).map((c) => ({
    id: c.id,
    title: c.title,
    names: c.items.map((key) => /^name:(\d+)$/.exec(key)).filter(Boolean).map((m) => Number(m[1]))
      .map((number) => ({ number, ...(nameInfo(number) ?? {}), lemma: nameToLemma?.[number] ?? null }))
      .filter((n) => n.arabic),
  })).filter((g) => g.names.length);
}

/** The lemma ids of every Name that has a Qur'an word, in first-seen order (the Allah's Names group's words). */
export function lemmasOfAsmaGroups(asmaGroups) {
  const seen = new Set(), out = [];
  for (const g of asmaGroups) for (const n of g.names) if (n.lemma && !seen.has(n.lemma)) { seen.add(n.lemma); out.push(n.lemma); }
  return out;
}

/**
 * Figures for the step and every group. `groups` = [{ k, lemmas }] in order; a word is COUNTED ONCE, in the first group it appears in
 * (the later group lists it as "counted above"). `rowOf(lemma)` -> the Learn next row ({ n: occurrences }) or null; `isKnown(lemma)`.
 * -> { groups: [{ k, words: [{ lemma, row, known, dup }], total, knownCount, n, knownN }], knownWords, knownN, percent }
 */
export function knownGroupFigures(groups, { rowOf, isKnown, total }) {
  const counted = new Set();
  let knownWords = 0, knownN = 0;
  const out = groups.map((g) => {
    const words = [];
    let knownCount = 0, n = 0, kn = 0;
    for (const lemma of g.lemmas) {
      const row = rowOf(lemma);
      if (!row) continue;
      const dup = counted.has(lemma);
      const known = !!isKnown(lemma);
      words.push({ lemma, row, known, dup });
      if (dup) continue;
      counted.add(lemma);
      n += row.n;
      if (known) { knownCount++; kn += row.n; }
    }
    knownWords += knownCount; knownN += kn;
    return { k: g.k, words, total: words.filter((w) => !w.dup).length, knownCount, n, knownN: kn };
  });
  return { groups: out, knownWords, knownN, percent: total > 0 ? (100 * knownN) / total : 0 };
}
