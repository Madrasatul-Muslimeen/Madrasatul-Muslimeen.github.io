// Same-root, same-meaning word groups (lemma-meaning-groups.json, ~100 KB).
// Loaded on FIRST USE only -- when known-word marks / a Word card first need a
// group -- then cached in memory (I9: never at startup, never on the landing
// page). Read-only: no Firestore, and nothing is ever written for a group-mate.
// Keys are matched in Unicode NFC, as lemma-dictionary.js does.
const GROUPS_URL = "/tools/quran-data-pull/output/lemma-meaning-groups.json";
let promise = null;
let loaded = null; // { byLemma: Map(nfc lemma -> groupId), groups: Map(groupId -> [lemma]) }

const nfc = (s) => String(s).normalize("NFC");

function index(data) {
  const byLemma = new Map();
  for (const [lemma, id] of Object.entries(data?.byLemma ?? {})) byLemma.set(nfc(lemma), id);
  const groups = new Map(Object.entries(data?.groups ?? {}));
  return { byLemma, groups };
}

export function loadLemmaMeaningGroups() {
  if (!promise) {
    promise = fetch(GROUPS_URL).then((res) => {
      if (!res.ok) throw new Error(`Couldn't load the meaning groups (HTTP ${res.status}).`);
      return res.json();
    }).then((data) => { loaded = index(data); return loaded; }).catch((err) => { promise = null; throw err; });
  }
  return promise;
}

/** Synchronous: the group id for a lemma, or null (also null until loadLemmaMeaningGroups() has resolved). */
export function meaningGroupOf(lemma) {
  if (!loaded || !lemma) return null;
  return loaded.byLemma.get(nfc(lemma)) ?? null;
}

/** Every lemma sharing this lemma's meaning group, INCLUDING itself; just [lemma] when it has no group. */
export function sameMeaningLemmas(lemma) {
  if (!lemma) return [];
  const id = meaningGroupOf(lemma);
  const mates = id ? loaded.groups.get(id) : null;
  return mates?.length ? [...mates] : [lemma];
}

/** Test seam. */
export function _resetLemmaMeaningGroupsForTests() { promise = null; loaded = null; }
