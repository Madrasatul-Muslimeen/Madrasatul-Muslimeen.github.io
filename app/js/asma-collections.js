// Asma Collections — 29 Aug 2026.
//
// The owner's own ask, from a real uploaded content-authoring file (see
// asma-collections-data.js's own header): named thematic groups of Names
// and honorific phrases about Allah, browsable as a wheel — built to the
// exact same template as Ayah Collections (QCR, js/qcr.js), since a demo
// was shown and confirmed before this was built (this project's own
// standing practice for a genuine design/scope decision).
//
// TWO KINDS OF EDIT, mirroring qcr.js's own I4 split but extended by one
// more piece the owner asked for that QCR never needed (āyāt are fixed
// platform content QCR never edits; some of these Names are the owner's
// own new content):
//
//  - A COLLECTION (one of the 19 groups) is a real, named, authored
//    resource -- archiving it never deletes it, only flips its own
//    `status` field (setCollectionStatus), same as qcr.js.
//  - MEMBERSHIP of one Name in one collection is a plain array splice, not
//    I4-soft-deleted -- removing/moving one is exactly qcr.js's own
//    addItem/removeItem/moveItem, unchanged in shape.
//  - An EXTRA NAME (number >= 100, beyond the fixed 99 in asma-data.js) is
//    itself real, owner-authored content -- archiving one (setExtraName
//    Status) never deletes it either. Its own arabic/transliteration/bn/
//    ref/weak/isPhrase fields ARE editable (updateExtraName) -- new
//    content the owner curated, unlike the canonical 99.
//  - A NAME OVERRIDE (nameOverrides[number] -> a Bangla string) is the
//    owner's own correction to a CANONICAL Name's (1..99) meaning, since
//    asma-data.js itself is fixed platform content this feature was never
//    going to make tenant-editable outright. Present, it wins over
//    asma-data.js's own bn.js-routed meaning when the app is in Bangla;
//    absent, nothing changes from today. English is never overridden here
//    -- the override is the owner's own Bangla correction, not a second
//    English original.
//
// I5: every collection item is a permanent unit key (buildUnitKey.name),
// never a stored name or position -- reorganising a group, or correcting
// an extra Name's own wording, never touches what a claim/bookmark/note is
// keyed against elsewhere in the app. A number, once assigned in
// asma-collections-data.js, never changes; "auto-numbering on movement"
// (the owner's own ask) falls out of that for free -- there is nothing to
// renumber, since a Name's number was never tied to its position in any
// list to begin with.
//
// One document per tenant (asmaCollections/{tenantId}), same reasoning as
// ayahCollections/{tenantId}: the whole thing is a few hundred short
// strings, and keeping collections/extraNames/nameOverrides together in
// one document is what makes "move a Name to another group" or "correct
// its wording" a single atomic write.

import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { createDocument, updateDocument } from "./envelope.js";
import { DEFAULT_ASMA_COLLECTIONS, DEFAULT_EXTRA_ASMA_NAMES, DEFAULT_WEAK_CANONICAL_NUMBERS, DEFAULT_CANONICAL_REFS } from "./asma-collections-data.js";
import { getAsmaName } from "./asma-data.js";

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
    kind: c?.kind === "dual" ? "dual" : "group",
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

/** number (string key) -> the owner's own Bangla correction for a
 *  CANONICAL Name (1..99). Empty object until the first edit. */
export function overridesFrom(docData) {
  const stored = docData?.nameOverrides;
  return stored && typeof stored === "object" ? stored : {};
}

/** number (string key) -> the owner's own ENGLISH correction for a
 *  CANONICAL Name's meaning. Additive, mirrors overridesFrom() exactly --
 *  30 Aug 2026 round, "Eng n Bangla only for now." */
export function overridesEnFrom(docData) {
  const stored = docData?.nameOverridesEn;
  return stored && typeof stored === "object" ? stored : {};
}

/** number (string key) -> the owner's own full replacement reference text
 *  for a CANONICAL Name (1..99). asma-collections-data.js's own
 *  DEFAULT_CANONICAL_REFS is fixed platform data (imported straight from
 *  the owner's uploaded file), so a canonical Name's reference needs the
 *  same override shape a Bangla correction already has -- present, it wins
 *  over the seeded reference; absent, nothing changes from today. */
export function refOverridesFrom(docData) {
  const stored = docData?.nameRefOverrides;
  return stored && typeof stored === "object" ? stored : {};
}

export function activeCollections(collections) {
  return collections.filter((c) => c.status === "active").sort((a, b) => a.order - b.order);
}

export function activeExtraNames(extraNames) {
  return extraNames.filter((e) => e.status === "active");
}

export function newCollectionId() {
  return `asmacat_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function nextCollectionOrder(collections) {
  return collections.reduce((max, c) => Math.max(max, c.order), 0) + 10;
}

export function nextExtraNameNumber(extraNames) {
  const highest = extraNames.reduce((max, e) => Math.max(max, e.number), 99);
  return highest + 1;
}

// ---------------------------------------------------------------------------
// Pure editing helpers — array in, array out. The page controller decides
// when to persist (saveAsmaCollections, below). Collection helpers are
// byte-for-byte the same shape as qcr.js's own.
// ---------------------------------------------------------------------------

export function addCollection(collections, partial) {
  return [
    ...collections,
    normalizeCollection({
      ...partial,
      id: partial.id || newCollectionId(),
      order: partial.order ?? nextCollectionOrder(collections),
      items: partial.items ?? [],
    }),
  ];
}

export function renameCollection(collections, id, title) {
  return collections.map((c) => (c.id === id ? normalizeCollection({ ...c, title }) : c));
}

/** I4: archive/restore only. */
export function setCollectionStatus(collections, id, status) {
  return collections.map((c) =>
    c.id === id ? normalizeCollection({ ...c, status: status === "archived" ? "archived" : "active" }) : c
  );
}

/** No-op (same array reference) if the Name is already listed. */
export function addItem(collections, collectionId, unitKey) {
  const col = collections.find((c) => c.id === collectionId);
  if (!col || col.items.includes(unitKey)) return collections;
  return collections.map((c) => (c.id === collectionId ? { ...c, items: [...c.items, unitKey] } : c));
}

export function removeItem(collections, collectionId, unitKey) {
  return collections.map((c) =>
    c.id === collectionId ? { ...c, items: c.items.filter((k) => k !== unitKey) } : c
  );
}

export function moveItem(collections, fromId, toId, unitKey) {
  if (fromId === toId) return collections;
  return addItem(removeItem(collections, fromId, unitKey), toId, unitKey);
}

// ---------------------------------------------------------------------------
// Drag-reposition round -- 2 Sep 2026. The owner's own ask: reposition a
// Group, or a Name within a Group, by dragging it in the list, with
// auto-numbering "falling out" of the new order rather than being a second
// thing to update by hand. I5 holds throughout -- these only ever change
// DISPLAY ORDER (`order` on a collection, position in `items[]`), never the
// permanent unit key/number a claim, bookmark or note is keyed against.
// ---------------------------------------------------------------------------

/** Applied after dragging a Group into a new position -- reassigns `order`
 *  (10-stepped, matching nextCollectionOrder()'s own spacing) for exactly
 *  the ids in orderedIds, in that order. A collection whose id isn't in the
 *  list (a different kind, or one not currently shown) keeps whatever order
 *  it already had -- reordering one kind's own list never touches the
 *  other's. */
export function reorderCollections(collections, orderedIds) {
  const orderById = new Map(orderedIds.map((id, i) => [id, (i + 1) * 10]));
  return collections.map((c) => (orderById.has(c.id) ? { ...c, order: orderById.get(c.id) } : c));
}

/** Applied after dragging a Name into a new position within one Group --
 *  replaces that Group's own `items` array wholesale with the new order.
 *  Every key is still the exact same permanent unit key; only its position
 *  in this one group's own list changes. */
export function reorderItems(collections, collectionId, orderedKeys) {
  return collections.map((c) => (c.id === collectionId ? { ...c, items: [...orderedKeys] } : c));
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
  let running = 0;
  orderedGroups.forEach((c, gi) => {
    const groupNum = gi + 1;
    groupNumbers.set(c.id, groupNum);
    (c.items ?? []).forEach((key, li) => {
      running += 1;
      labelByKey.set(key, `${pad2(groupNum)}.${pad2(running)}.${pad2(li + 1)}`);
    });
  });
  return { groupNumbers, labelByKey };
}

// ---------------------------------------------------------------------------
// Pure editing helpers for the extra (>= 100) Names/phrases themselves --
// real content the owner curated, so unlike a canonical Name these fields
// are genuinely editable.
// ---------------------------------------------------------------------------

export function addExtraName(extraNames, partial) {
  return [
    ...extraNames,
    normalizeExtraName({ ...partial, number: partial.number ?? nextExtraNameNumber(extraNames), status: "active" }),
  ];
}

export function updateExtraName(extraNames, number, patch) {
  return extraNames.map((e) => (e.number === number ? normalizeExtraName({ ...e, ...patch }) : e));
}

export function setExtraNameStatus(extraNames, number, status) {
  return extraNames.map((e) =>
    e.number === number ? normalizeExtraName({ ...e, status: status === "archived" ? "archived" : "active" }) : e
  );
}

/** The owner's own Bangla correction for a CANONICAL Name (1..99) --
 *  cleared by passing an empty/whitespace-only text. Never touches
 *  asma-data.js itself (I4/I5: fixed platform content, unedited). */
export function setNameOverrideBn(overrides, number, text) {
  const next = { ...overrides };
  const trimmed = (text ?? "").trim();
  if (trimmed) next[String(number)] = trimmed;
  else delete next[String(number)];
  return next;
}

/** The owner's own ENGLISH correction for a CANONICAL Name's meaning --
 *  same shape as setNameOverrideBn() above. */
export function setNameOverrideEn(overrides, number, text) {
  const next = { ...overrides };
  const trimmed = (text ?? "").trim();
  if (trimmed) next[String(number)] = trimmed;
  else delete next[String(number)];
  return next;
}

/** The owner's own full replacement reference text for a CANONICAL Name --
 *  same shape as setNameOverrideBn() above. */
export function setNameRefOverride(overrides, number, text) {
  const next = { ...overrides };
  const trimmed = (text ?? "").trim();
  if (trimmed) next[String(number)] = trimmed;
  else delete next[String(number)];
  return next;
}

/** Appends one reference fragment onto a Name's own existing reference --
 *  canonical (1..99) or extra (>=100) alike, via whichever mechanism that
 *  range actually uses (a refOverride for canonical; the real, editable
 *  `ref` field for an extra). Used both by Manage mode's own "attach one
 *  reference to several Names at once" action, and by the new Read/Note
 *  view "attach this ayah" button -- one shared mechanism, two entry
 *  points. `currentRef(number)` reads whatever the Name's own reference
 *  shows RIGHT NOW (already-resolved, override-aware), so appending never
 *  clobbers a reference this exact function already added earlier. */
export function appendRefToName({ extraNames, refOverrides }, number, currentRef, fragment) {
  const clean = String(fragment ?? "").trim();
  if (!clean) return { extraNames, refOverrides };
  if (number >= 1 && number <= 99) {
    const existing = String(currentRef ?? "").trim();
    const combined = existing ? `${existing}; ${clean}` : clean;
    return { extraNames, refOverrides: setNameRefOverride(refOverrides, number, combined) };
  }
  const existing = String(currentRef ?? "").trim();
  const combined = existing ? `${existing}; ${clean}` : clean;
  return { extraNames: updateExtraName(extraNames, number, { ref: combined }), refOverrides };
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

// ---------------------------------------------------------------------------
// Firestore — one document per tenant, read-patch-write.
// ---------------------------------------------------------------------------

export async function getAsmaCollectionsDoc(db, tenantId) {
  const snap = await getDoc(doc(db, TENANT.ASMA_COLLECTIONS, tenantId));
  return snap.exists() ? snap.data() : null;
}

/** Writes the WHOLE document back — every manage action in this feature
 *  calls this once, immediately, the same "no batched Save button" shape
 *  qcr.js's own saveQcrCollections() uses. I15: a failure reaches the user
 *  through safeWrite(); the caller rolls the optimistic in-memory change
 *  back on failure. */
export async function saveAsmaCollections(db, { tenantId, collections, extraNames, overrides, overridesEn, refOverrides, docExists, uid }) {
  const payload = {
    collections,
    extraNames,
    nameOverrides: overrides,
    nameOverridesEn: overridesEn ?? {},
    nameRefOverrides: refOverrides ?? {},
    tenantId,
  };
  if (docExists) {
    await updateDocument(db, TENANT.ASMA_COLLECTIONS, tenantId, payload);
  } else {
    await createDocument(db, TENANT.ASMA_COLLECTIONS, tenantId, payload, uid);
  }
}
