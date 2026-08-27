// Ayah Collections (QCR) — 26 Aug 2026.
//
// The owner's own ask, from a QCR-authoring file they uploaded: a named
// collection of āyāt pulled from across the whole Qur'an (not one surah),
// browsable as a wheel — for QCR's own 18 collections first, and built so
// any future named collection reuses the same mechanism (their own words:
// "there will be many of such topic n groups of Ayat").
//
// A demo was shown and confirmed before this was built (the standard
// practice this project uses for a genuine design/scope decision) — the
// owner then added three things the demo hadn't covered: add/remove/move
// an āyah between collections and across several at once; edit/add/archive
// the collections themselves; and a tapped āyah must land on the real,
// working Ayah Note screen, not a preview.
//
// STORAGE, decided per the owner's own "whatever is easier to do, do it":
// a real, small, tenant-scoped Firestore document —
// ayahCollections/{tenantId} — authored the same way Subjects/Approaches
// already are in Catalogue. NOT bundled platform data (the shape this
// project's own earlier proposal suggested): the owner needs to add,
// rename, archive and move things themselves, which a static JS file can't
// do without a code redeploy each time. One document per tenant, not one
// per collection — the whole thing is a few hundred short unit-key strings
// (tens of KB, nowhere near Firestore's document limit), and keeping every
// collection in one document is what makes "move an āyah from one
// collection to another" a single atomic write instead of two separate
// ones that could partially fail.
//
// I2-ISH, NOT PURE: unlike taglines.js (fully pure — its own page does the
// Firestore calls), this file also carries the read/write pair itself
// (getQcrDoc/saveQcrCollections), because every manage action here writes
// immediately rather than being batched behind a manual Save button —
// centralising the read-patch-write shape here is what keeps
// quranrevival.html from repeating it seven times over (once per action),
// the same reasoning bookmarks.js already applies to its own folder/
// bookmark helpers. Every editing helper below this point (add/rename/
// archive a collection; add/remove/move an āyah) is still pure — array in,
// array out — so the actual page controller decides when to persist.
//
// I4: a COLLECTION is a real, named, authored resource — like a Subject, a
// tagline, a bookmark — so archiving it never deletes it (setCollection
// Status, never removed-from-the-array). Membership of one āyah in one
// collection is treated differently, deliberately: it is a many-to-many tag,
// not a resource of its own, so removing/moving one is a plain array splice
// with no soft-delete flag — the same "remove-from-level" shape the owner's
// own QCR file already used, and nothing is lost by it (the āyah, and every
// OTHER collection that also lists it, are untouched).
//
// I5: every item is a permanent unit key (buildUnitKey.ayah/range), never a
// stored name — renaming a collection or re-titling anything never touches
// what a claim/bookmark/note is keyed against elsewhere in the app.
// I11: title is language-keyed, same langText() shape as every other
// tenant-authored name in this app.

import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { createDocument, updateDocument } from "./envelope.js";
import { DEFAULT_QCR_COLLECTIONS } from "./qcr-data.js";

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

/** The collections to work with. The tenant's own saved list wins the moment
 *  it exists; until then the 18 seeded collections show, so a brand-new
 *  tenant is never staring at an empty QCR palette. Same fallback shape as
 *  taglines.js's taglinesFrom(). */
export function collectionsFrom(docData) {
  const stored = docData?.collections;
  if (Array.isArray(stored) && stored.length) return stored.map(normalizeCollection);
  return DEFAULT_QCR_COLLECTIONS.map(normalizeCollection);
}

/** True when the tenant has never saved its own list — what's on screen is
 *  still the 18 seeded collections. */
export function isUsingDefaultCollections(docData) {
  return !(Array.isArray(docData?.collections) && docData.collections.length);
}

export function activeCollections(collections) {
  return collections.filter((c) => c.status === "active").sort((a, b) => a.order - b.order);
}

export function newCollectionId() {
  return `qcrc_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function nextCollectionOrder(collections) {
  return collections.reduce((max, c) => Math.max(max, c.order), 0) + 10;
}

// ---------------------------------------------------------------------------
// Pure editing helpers — array in, array out. The page controller decides
// when to persist (saveQcrCollections, below).
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

/** I4: archive/restore only — a collection's id, title and items are never
 *  destroyed, just hidden from the ordinary (non-"show archived") list. */
export function setCollectionStatus(collections, id, status) {
  return collections.map((c) =>
    c.id === id ? normalizeCollection({ ...c, status: status === "archived" ? "archived" : "active" }) : c
  );
}

/** Adds a unit key to one collection's own item list. A no-op (returns the
 *  same array reference, not a copy) if it's already there — silently
 *  re-adding the same āyah would just be clutter, not a real edit. */
export function addItem(collections, collectionId, unitKey) {
  const col = collections.find((c) => c.id === collectionId);
  if (!col || col.items.includes(unitKey)) return collections;
  return collections.map((c) => (c.id === collectionId ? { ...c, items: [...c.items, unitKey] } : c));
}

/** Removes a unit key from one collection's own item list — a plain splice
 *  (this file's own header explains why membership itself isn't I4-soft-
 *  deleted). Every other collection that also lists the same āyah is
 *  untouched. */
export function removeItem(collections, collectionId, unitKey) {
  return collections.map((c) =>
    c.id === collectionId ? { ...c, items: c.items.filter((k) => k !== unitKey) } : c
  );
}

/** Removes a unit key from fromId and adds it to toId, in one pass — the
 *  owner's own "moving one Ayah to another... level" ask. A no-op move
 *  (fromId === toId) is left alone rather than dropping and re-appending it. */
export function moveItem(collections, fromId, toId, unitKey) {
  if (fromId === toId) return collections;
  return addItem(removeItem(collections, fromId, unitKey), toId, unitKey);
}

// ---------------------------------------------------------------------------
// Firestore — one document per tenant, read-patch-write. See this file's
// own header for why the read/write pair lives here rather than in every
// caller.
// ---------------------------------------------------------------------------

export async function getQcrDoc(db, tenantId) {
  const snap = await getDoc(doc(db, TENANT.AYAH_COLLECTIONS, tenantId));
  return snap.exists() ? snap.data() : null;
}

/** Writes the WHOLE collections array back — every manage action in this
 *  feature calls this once, immediately, rather than batching edits behind
 *  a manual Save (unlike taglines.html): Explore's own QCR palette has no
 *  room for a persistent save bar, and an owner navigating away mid-edit
 *  should never lose a rename/archive/add that already looked like it took
 *  effect on screen. */
export async function saveQcrCollections(db, { tenantId, collections, docExists, uid }) {
  if (docExists) {
    await updateDocument(db, TENANT.AYAH_COLLECTIONS, tenantId, { collections, tenantId });
  } else {
    await createDocument(db, TENANT.AYAH_COLLECTIONS, tenantId, { tenantId, collections }, uid);
  }
}
