// QR J01 R1 (QR-only): the PURE half of MMSA's app/js/asma-collections.js, for the Asma app with no sign-in.
//
// asma-collections.js statically imports the Firestore SDK from www.gstatic.com (it also reads and writes the
// tenant's asmaCollections document), so app/asma.html must not import it. Each function below is copied from it
// BYTE-IDENTICAL, with its comment, and nothing else is added: with no tenant document, collectionsFrom(null),
// extraNamesFrom(null) and classificationsFrom(null) give the owner's seeded groups (asma-collections-data.js's
// DEFAULT_*), exactly what MMSA shows a madrasah that has not edited them.
// Built and checked by tools/qr-verify/asma-local-sync.mjs (run it against each new MMSA commit copied).

import { DEFAULT_ASMA_COLLECTIONS, DEFAULT_EXTRA_ASMA_NAMES, DEFAULT_WEAK_CANONICAL_NUMBERS, DEFAULT_CANONICAL_REFS, DEFAULT_ASMA_CLASSIFICATIONS } from "./asma-collections-data.js";
import { getAsmaName } from "./asma-data.js";
import { buildUnitKey } from "./unit-keys.js";

function normalizeCollection(c) {
  return {
    id: String(c?.id ?? ""),
    title: c?.title ?? { en: "" },
    badge: String(c?.badge ?? ""),
    order: Number.isFinite(Number(c?.order)) ? Number(c.order) : 999,
    status: c?.status === "archived" ? "archived" : "active",
    items: Array.isArray(c?.items) ? c.items.map(String) : [],
    // Round -- 30 Aug 2026: additive. "group" (default, every pre-existing
    // collection) is the owner's own everyday thematic grouping; "dual" is
    // a SEPARATE list the owner asked for, of the traditional paired/
    // complementary Names of Allah (e.g. Al-Qabid/Al-Basit) -- same exact
    // collection mechanism (add/rename/archive a collection, add/remove/
    // move a Name), just browsed from its own dropdown rather than mixed
    // in with everyday groups. Seeded with none by default (see
    // DEFAULT_ASMA_COLLECTIONS's own header) -- the owner populates this
    // list themselves, since guessing which Names count as a traditional
    // pair is a real content decision, not a coding one.
    //
    // Classifications round -- 23 Sep 2026: `kind` was a closed 2-value
    // set ("dual" or else "group"), which is exactly what made "Group" and
    // "Dual Names" the only two classifications the app could ever browse.
    // It is any non-empty string now -- one of the classifications registry's
    // own `key`s (classificationsFrom(), below) -- with "group" as the
    // fallback for a missing/blank value, so every collection ever saved
    // before this round (every one of them either genuinely "group" or
    // "dual", or simply absent and meaning "group") reads exactly as it did
    // before. I5 holds: a collection's `kind` is never the permanent key
    // anything is claimed against -- only which list it is.
    kind: (typeof c?.kind === "string" && c.kind.trim()) ? c.kind.trim() : "group",
  };
}

function normalizeClassification(c) {
  return {
    key: String(c?.key ?? "").trim(),
    title: c?.title ?? { en: "" },
    order: Number.isFinite(Number(c?.order)) ? Number(c.order) : 999,
    status: c?.status === "archived" ? "archived" : "active",
  };
}

function normalizeExtraName(e) {
  return {
    number: Number(e?.number),
    arabic: String(e?.arabic ?? ""),
    transliteration: String(e?.transliteration ?? ""),
    // Round -- 30 Aug 2026: additive. The English MEANING, distinct from
    // the transliteration (a name's own Latin-script pronunciation, not
    // its meaning) -- every extra Name added before this round has none,
    // and resolveAsmaEntry() falls back to the transliteration exactly as
    // it always did, so nothing already saved changes on screen.
    meaningEn: String(e?.meaningEn ?? ""),
    bnName: String(e?.bnName ?? ""),
    bn: String(e?.bn ?? ""),
    ref: String(e?.ref ?? ""),
    weak: !!e?.weak,
    isPhrase: !!e?.isPhrase,
    status: e?.status === "archived" ? "archived" : "active",
  };
}

/** The collections to work with. The tenant's own saved list wins the
 *  moment it exists; until then the 19 seeded groups show, so a brand-new
 *  tenant is never staring at an empty palette. Same fallback shape as
 *  qcr.js's collectionsFrom()/taglines.js's taglinesFrom(). */
export function collectionsFrom(docData) {
  const stored = docData?.collections;
  if (Array.isArray(stored) && stored.length) return stored.map(normalizeCollection);
  return DEFAULT_ASMA_COLLECTIONS.map(normalizeCollection);
}

/** The ~33 Names/phrases beyond the fixed 99 -- same "tenant's own copy
 *  wins, else the seed" fallback as collectionsFrom() above. */
export function extraNamesFrom(docData) {
  const stored = docData?.extraNames;
  if (Array.isArray(stored) && stored.length) return stored.map(normalizeExtraName);
  return DEFAULT_EXTRA_ASMA_NAMES.map(normalizeExtraName);
}

/** Classifications round -- 23 Sep 2026: the open, owner-extensible set of
 *  classifications (the classification a collection's own `kind` names).
 *  Same "tenant's own saved list wins the moment it exists, else the
 *  seed" fallback as collectionsFrom()/extraNamesFrom() above -- a
 *  brand-new tenant sees the two classifications every existing
 *  collection already implicitly belongs to, not an empty switcher. */
export function classificationsFrom(docData) {
  const stored = docData?.classifications;
  if (Array.isArray(stored) && stored.length) return stored.map(normalizeClassification);
  return DEFAULT_ASMA_CLASSIFICATIONS.map(normalizeClassification);
}

export function activeCollections(collections) {
  return collections.filter((c) => c.status === "active").sort((a, b) => a.order - b.order);
}

export function activeExtraNames(extraNames) {
  return extraNames.filter((e) => e.status === "active");
}

export function activeClassifications(classifications) {
  return classifications.filter((c) => c.status === "active").sort((a, b) => a.order - b.order);
}

/** Every list (of ANY classification) this Name currently belongs to --
 *  the reverse index the "Belongs to"/"also in…" chips and the existing
 *  cross-classification "which lists is this Name in" picker
 *  (quranrevival.html's own openAsmaXGroupsPopover) read from. Pure and
 *  O(collections x items); no new Firestore call (I9). Includes an
 *  archived collection's own membership -- I4 never drops a membership
 *  record just because the list holding it was archived, it only stops
 *  that list being offered as somewhere NEW to file something. */
export function membershipsOfName(collections, number) {
  const unitKey = buildUnitKey.name(number);
  return collections
    .filter((c) => (c.items ?? []).includes(unitKey))
    .map((c) => ({ collectionId: c.id, kind: c.kind }));
}

/** The owner's own display-position numbering -- NOT the permanent Name
 *  number used for claims/bookmarks/notes, which never changes (I5). A
 *  Group's own number is simply its 1-based position in `orderedGroups`; a
 *  Name's own label is "{group}.{runningTotal}.{localIndex}", where
 *  runningTotal keeps counting across every group in `orderedGroups`
 *  (never resets) and localIndex restarts at 1 inside each group --
 *  confirmed with the owner directly against their own worked example
 *  (Group 1, 3 names -> 01.01.01, 01.02.02, 01.03.03; Group 2, 5 names ->
 *  02.04.01 .. 02.08.05; Group 3 -> 03.09.01..).
 *
 *  `orderedGroups`: the exact array of collections the caller is currently
 *  showing, already filtered/sorted (e.g. one kind's own
 *  asmaXCollectionsOfKind() result) -- this function doesn't decide what
 *  counts as "shown", it only numbers what it's handed. Recomputed fresh on
 *  every render, so there is nothing to hand-renumber after a drag -- that
 *  is the whole point of it being derived rather than stored. */
export function asmaPositionLabels(orderedGroups) {
  const pad2 = (n) => String(n).padStart(2, "0");
  const groupNumbers = new Map();
  const labelByKey = new Map();
  // 3 Sep 2026 follow-up -- the owner's own ask: the MIDDLE number of the
  // "GG.RR.LL" label (the running total, unique across every Name in this
  // kind's own list) is now what shows wherever a number is shown "with #"
  // for a Name on this screen -- the wheel's own outer ring digit and the
  // list row's own badge -- in place of the permanent canonical id. Kept
  // as its own map (not just parsed back out of `labelByKey`'s string)
  // since a caller wanting the plain number for display shouldn't have to
  // re-parse a formatted label to get it.
  const runningByKey = new Map();
  let running = 0;
  orderedGroups.forEach((c, gi) => {
    const groupNum = gi + 1;
    groupNumbers.set(c.id, groupNum);
    (c.items ?? []).forEach((key, li) => {
      running += 1;
      labelByKey.set(key, `${pad2(groupNum)}.${pad2(running)}.${pad2(li + 1)}`);
      runningByKey.set(key, running);
    });
  });
  return { groupNumbers, labelByKey, runningByKey };
}

/** Resolves ONE Name/phrase by its permanent number, whether canonical
 *  (1..99, asma-data.js's own fixed ASMA_NAMES) or an extra (>= 100,
 *  extraNames) -- the one place both are treated uniformly, so the detail
 *  screen, the claim mechanism and every category-browser row can work off
 *  any number the same way. Returns null for a number nothing resolves to
 *  (a stale extraNames number archived away, or plain nonsense input). */
export function resolveAsmaEntry(number, { extraNames = [], overrides = {}, overridesEn = {}, refOverrides = {} } = {}) {
  if (number >= 1 && number <= 99) {
    const base = getAsmaName(number);
    if (!base) return null;
    return {
      number,
      arabic: base.arabic,
      transliteration: base.transliteration,
      meaning: base.meaning,
      bnOverride: overrides[String(number)] ?? null,
      // Round -- 30 Aug 2026: the owner's own English correction, additive,
      // same shape as bnOverride above.
      enOverride: overridesEn[String(number)] ?? null,
      bnName: null,
      // Round 2 -- the owner's file also gave 95 of the 99 canonical Names
      // a reference, not only the extras; see DEFAULT_CANONICAL_REFS's own
      // header. Four Names (36, 65, 69, 77) have none, same as in the
      // owner's own file. A refOverride (round -- 30 Aug 2026, additive)
      // wins over the seeded reference when the owner has attached one.
      ref: refOverrides[String(number)] ?? DEFAULT_CANONICAL_REFS[number] ?? null,
      // The owner's own file flagged 14 of the 99 this way too, not only
      // the extras -- see asma-collections-data.js's own header on
      // DEFAULT_WEAK_CANONICAL_NUMBERS for exactly which and why this
      // isn't just hardcoded false.
      weak: DEFAULT_WEAK_CANONICAL_NUMBERS.includes(number),
      isPhrase: false,
      isExtra: false,
      status: "active",
    };
  }
  const extra = extraNames.find((e) => e.number === number);
  if (!extra) return null;
  return {
    number,
    arabic: extra.arabic,
    transliteration: extra.transliteration,
    meaning: { en: extra.meaningEn || extra.transliteration, bn: extra.bn },
    bnOverride: overrides[String(number)] ?? null,
    enOverride: null,
    bnName: extra.bnName,
    ref: extra.ref,
    weak: extra.weak,
    isPhrase: extra.isPhrase,
    isExtra: true,
    status: extra.status,
  };
}
