// F-022/F-023/F-024/F-025 — Subject tree, trackables, ladders & levels
// (Phase 2, Catalogue)
//
// Two different template shapes deliberately, matching what's actually
// shared vs. what's platform-fixed:
//
//   subjects: has a real Firestore subjectTemplates collection (Architecture
//   names it explicitly) because a tenant may genuinely need a subject the
//   platform list doesn't have -- copy-on-write, editable per tenant.
//
//   trackables: the 30 Approaches are fixed platform content with no
//   separate Firestore template collection (collections.js does not reserve
//   one) -- APPROACH_TEMPLATES in catalogue-data.js IS the template, baked
//   into the app bundle like MODULE_TEMPLATES / FEATURES already are.
//   sourceTemplateId on a tenant's trackables doc stores that constant's
//   fixed id string, not a document reference. A tenant can still edit its
//   own copy (name, guide text, panels, order) same as a subject.
//
// subjectTemplates seeding uses the same "create only if the doc doesn't
// already exist yet" genesis pattern as every other bootstrap path in this
// codebase (Phase 1's first-owner-membership bug and its fix are the
// precedent -- see PHASE-1-STATUS.md item 1). No platformAdmin step, no
// out-of-band script, is needed to get real content into Firestore.

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { createDocument, commitEnvelopeBatch, updateDocument } from "./envelope.js";
import { SUBJECT_TEMPLATES, APPROACH_TEMPLATES } from "./catalogue-data.js";

/** Given a flat {id, parentId} list, returns Map(id -> ancestorIds[] from top to nearest parent). */
export function computeAncestorIds(nodes) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const cache = new Map();

  function ancestorsOf(id) {
    if (cache.has(id)) return cache.get(id);
    const node = byId.get(id);
    const parentId = node?.parentId ?? null;
    const result = parentId ? [...ancestorsOf(parentId), parentId] : [];
    cache.set(id, result);
    return result;
  }

  const out = new Map();
  for (const n of nodes) out.set(n.id, ancestorsOf(n.id));
  return out;
}

// ---------------------------------------------------------------------------
// subjectTemplates -- platform master list, read-only after genesis.
// ---------------------------------------------------------------------------

/** Seeds any SUBJECT_TEMPLATES rows not yet present in subjectTemplates. Safe to call repeatedly. */
export async function ensureSubjectTemplatesSeeded(db, uid) {
  const snap = await getDocs(collection(db, TENANT.SUBJECT_TEMPLATES));
  const existingIds = new Set(snap.docs.map((d) => d.id));
  const missing = SUBJECT_TEMPLATES.filter((n) => !existingIds.has(n.id));
  if (missing.length === 0) return [];

  const ancestorMap = computeAncestorIds(SUBJECT_TEMPLATES);
  const creates = missing.map((n) => ({
    collectionName: TENANT.SUBJECT_TEMPLATES,
    docId: n.id,
    data: {
      name: n.name,
      gloss: n.gloss ?? null,
      parentId: n.parentId,
      ancestorIds: ancestorMap.get(n.id) ?? [],
      moduleIds: n.moduleIds,
      order: n.order,
    },
  }));
  await commitEnvelopeBatch(db, { creates }, uid);
  return missing.map((n) => n.id);
}

// ---------------------------------------------------------------------------
// Per-tenant subjects + trackables -- copy-on-write from the platform lists.
// ---------------------------------------------------------------------------

/** True once this tenant has its own catalogue copy (checked via the one always-present node, "quran"). */
export async function tenantCatalogueSeeded(db, tenantId) {
  const snap = await getDoc(doc(db, TENANT.SUBJECTS, `${tenantId}__quran`));
  return snap.exists();
}

/**
 * Copies the full platform subject tree and the 30 Approaches into this
 * tenant's own subjects/trackables rows, if not already done. Explicit
 * admin action (catalogue.html), not part of app startup (load-speed
 * contract: nothing beyond userIndex/enrolments/bookmarks after first paint).
 */
export async function ensureTenantCatalogueSeeded(db, tenantId, uid) {
  if (await tenantCatalogueSeeded(db, tenantId)) return { seeded: false };

  const childCount = new Map();
  for (const n of SUBJECT_TEMPLATES) {
    if (n.parentId) childCount.set(n.parentId, (childCount.get(n.parentId) ?? 0) + 1);
  }
  const ancestorMap = computeAncestorIds(SUBJECT_TEMPLATES);

  const subjectCreates = SUBJECT_TEMPLATES.map((n) => ({
    collectionName: TENANT.SUBJECTS,
    docId: `${tenantId}__${n.id}`,
    data: {
      tenantId,
      name: n.name,
      gloss: n.gloss ?? null,
      parentId: n.parentId,
      ancestorIds: ancestorMap.get(n.id) ?? [],
      moduleIds: n.moduleIds,
      isTrackable: !childCount.has(n.id),
      order: n.order,
      status: "active",
      sourceTemplateId: n.id,
      edited: false,
    },
  }));

  const trackableCreates = APPROACH_TEMPLATES.map((t) => ({
    collectionName: TENANT.TRACKABLES,
    docId: `${tenantId}__${t.id}`,
    data: {
      tenantId,
      moduleId: "quranrevival",
      subjectId: "quran",
      group: t.section,
      groupName: t.sectionName,
      name: t.name,
      guide: t.guide,
      panels: t.panels,
      order: t.order,
      status: "active",
      sourceTemplateId: t.id,
      edited: false,
    },
  }));

  // 41 subjects + 30 trackables = 71 creates, well under the 500-op batch
  // limit -- one atomic commit, so a tenant's catalogue is never left
  // half-seeded by a dropped connection partway through.
  await commitEnvelopeBatch(db, { creates: [...subjectCreates, ...trackableCreates] }, uid);
  return { seeded: true, subjectCount: subjectCreates.length, trackableCount: trackableCreates.length };
}

export async function getSubjectTree(db, tenantId) {
  const q = query(collection(db, TENANT.SUBJECTS), where("tenantId", "==", tenantId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id.replace(`${tenantId}__`, ""), ...d.data() }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function getTrackables(db, tenantId) {
  const q = query(collection(db, TENANT.TRACKABLES), where("tenantId", "==", tenantId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id.replace(`${tenantId}__`, ""), ...d.data() }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/**
 * Tenant-level edit to a subject or trackable copy. Always sets edited:true
 * (I6-style: once a tenant has made this node their own, it's frozen away
 * from silently following future platform-template changes -- "drives
 * update-without-overwrite," Architecture Layer 1). collectionName must be
 * TENANT.SUBJECTS or TENANT.TRACKABLES.
 */
export async function editCatalogueNode(db, collectionName, tenantId, nodeId, patch, uid) {
  return updateDocument(db, collectionName, `${tenantId}__${nodeId}`, { ...patch, edited: true });
}

// ---------------------------------------------------------------------------
// Ladders & levels -- tenant-authored, no platform-seeded content (the
// Architecture doc only gives examples, "e.g. General Grades, Hifz Years").
// ---------------------------------------------------------------------------

export async function createLadder(db, tenantId, name, uid) {
  const ladderId = doc(collection(db, TENANT.LADDERS)).id;
  await createDocument(db, TENANT.LADDERS, `${tenantId}__${ladderId}`, {
    tenantId,
    name: { en: name },
    status: "active",
  }, uid);
  return ladderId;
}

export async function createLevel(db, tenantId, ladderId, name, order, uid) {
  const levelId = doc(collection(db, TENANT.LEVELS)).id;
  await createDocument(db, TENANT.LEVELS, `${tenantId}__${levelId}`, {
    tenantId,
    ladderId,
    name: { en: name },
    order,
  }, uid);
  return levelId;
}

export async function listLadders(db, tenantId) {
  const q = query(collection(db, TENANT.LADDERS), where("tenantId", "==", tenantId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id.replace(`${tenantId}__`, ""), ...d.data() }));
}

export async function listLevels(db, tenantId, ladderId) {
  const q = query(
    collection(db, TENANT.LEVELS),
    where("tenantId", "==", tenantId),
    where("ladderId", "==", ladderId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id.replace(`${tenantId}__`, ""), ...d.data() }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
