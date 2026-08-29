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
  };
}

function normalizeExtraName(e) {
  return {
    number: Number(e?.number),
    arabic: String(e?.arabic ?? ""),
    transliteration: String(e?.transliteration ?? ""),
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

/** Resolves ONE Name/phrase by its permanent number, whether canonical
 *  (1..99, asma-data.js's own fixed ASMA_NAMES) or an extra (>= 100,
 *  extraNames) -- the one place both are treated uniformly, so the detail
 *  screen, the claim mechanism and every category-browser row can work off
 *  any number the same way. Returns null for a number nothing resolves to
 *  (a stale extraNames number archived away, or plain nonsense input). */
export function resolveAsmaEntry(number, { extraNames = [], overrides = {} } = {}) {
  if (number >= 1 && number <= 99) {
    const base = getAsmaName(number);
    if (!base) return null;
    return {
      number,
      arabic: base.arabic,
      transliteration: base.transliteration,
      meaning: base.meaning,
      bnOverride: overrides[String(number)] ?? null,
      bnName: null,
      // Round 2 -- the owner's file also gave 95 of the 99 canonical Names
      // a reference, not only the extras; see DEFAULT_CANONICAL_REFS's own
      // header. Four Names (36, 65, 69, 77) have none, same as in the
      // owner's own file.
      ref: DEFAULT_CANONICAL_REFS[number] ?? null,
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
    meaning: { en: extra.transliteration, bn: extra.bn },
    bnOverride: overrides[String(number)] ?? null,
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
export async function saveAsmaCollections(db, { tenantId, collections, extraNames, overrides, docExists, uid }) {
  const payload = { collections, extraNames, nameOverrides: overrides, tenantId };
  if (docExists) {
    await updateDocument(db, TENANT.ASMA_COLLECTIONS, tenantId, payload);
  } else {
    await createDocument(db, TENANT.ASMA_COLLECTIONS, tenantId, payload, uid);
  }
}
