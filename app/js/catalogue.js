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
  getDocs,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { createDocument, commitEnvelopeBatch, updateDocument } from "./envelope.js";
import { SUBJECT_TEMPLATES, APPROACH_TEMPLATES, TOPIC_TRACKABLE_TEMPLATES } from "./catalogue-data.js";
import { createResource } from "./resources.js";

/**
 * Orders a flat {id, parentId, order} list for DISPLAY as a tree: top-level
 * nodes first (by their own order), each immediately followed by its
 * children (by their order), recursively. `order` is only ever a sibling
 * rank -- every group of children restarts at 1 -- so sorting the flat list
 * by `order` alone (as getSubjectTree used to) interleaves unrelated
 * branches that happen to share a rank, e.g. Agro-Farming (order 2, a
 * child of Nature-Life) floating up next to Quran (order 1, top-level).
 */
export function orderForDisplay(nodes) {
  const byParent = new Map();
  for (const n of nodes) {
    const key = n.parentId ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(n);
  }
  for (const list of byParent.values()) list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const out = [];
  function visit(parentId) {
    for (const n of byParent.get(parentId) ?? []) {
      out.push(n);
      visit(n.id);
    }
  }
  visit(null);
  return out;
}

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

// Firestore caps the total get()/exists() calls a single transaction or
// batched write may make evaluating security rules at 20 (vs. 10 for a
// single-document request) -- NOT the same thing as the 500-write batch
// size limit. canAdminCatalogue()/anyMemberOf() each call exists()+get()
// on tenantMemberUids, and that rule runs once per document in the batch,
// so one batch of all 71 rows blew straight through the 20-call ceiling
// and Firestore denied the whole commit with a bare "permission-denied" --
// nothing to do with roles or the rules' logic being wrong. Chunking to a
// handful of documents per commit keeps each commit's total well under 20.
const SEED_CHUNK_SIZE = 5;

async function commitInChunks(db, creates, uid) {
  for (let i = 0; i < creates.length; i += SEED_CHUNK_SIZE) {
    await commitEnvelopeBatch(db, { creates: creates.slice(i, i + SEED_CHUNK_SIZE) }, uid);
  }
}

async function commitUpdatesInChunks(db, updates, uid) {
  for (let i = 0; i < updates.length; i += SEED_CHUNK_SIZE) {
    await commitEnvelopeBatch(db, { updates: updates.slice(i, i + SEED_CHUNK_SIZE) }, uid);
  }
}

/**
 * Copies the full platform subject tree and the 30 Approaches into this
 * tenant's own subjects/trackables rows, if not already done. Explicit
 * admin action (catalogue.html), not part of app startup (load-speed
 * contract: nothing beyond userIndex/enrolments/bookmarks after first paint).
 *
 * Diffs against what's already there (not just a single "quran exists?"
 * flag) so a run that only got partway -- whether from the chunk-size bug
 * above or a dropped connection -- repairs itself next time, the same
 * "create only what's missing" shape as ensureModulesSeeded.
 */
export async function ensureTenantCatalogueSeeded(db, tenantId, uid) {
  const [existingSubjects, existingTrackables] = await Promise.all([
    getSubjectTree(db, tenantId),
    getTrackables(db, tenantId),
  ]);
  const existingSubjectIds = new Set(existingSubjects.map((n) => n.id));
  const existingTrackableIds = new Set(existingTrackables.map((t) => t.id));

  const missingSubjects = SUBJECT_TEMPLATES.filter((n) => !existingSubjectIds.has(n.id));
  const missingTrackables = APPROACH_TEMPLATES.filter((t) => !existingTrackableIds.has(t.id));
  const missingTopicTrackables = TOPIC_TRACKABLE_TEMPLATES.filter((t) => !existingTrackableIds.has(t.id));
  if (missingSubjects.length === 0 && missingTrackables.length === 0 && missingTopicTrackables.length === 0) {
    return { seeded: false };
  }

  const childCount = new Map();
  for (const n of SUBJECT_TEMPLATES) {
    if (n.parentId) childCount.set(n.parentId, (childCount.get(n.parentId) ?? 0) + 1);
  }
  const ancestorMap = computeAncestorIds(SUBJECT_TEMPLATES);

  const subjectCreates = missingSubjects.map((n) => ({
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

  const trackableCreates = missingTrackables.map((t) => ({
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

  // Kept as a separate list from trackableCreates above rather than merged
  // in: APPROACH_TEMPLATES' moduleId/subjectId are hardcoded to Quran
  // above, so folding a module-wide (subjectId: null) template into that
  // same map would either wrongly inherit "quran" or need every one of
  // that map's fields re-derived per-template for no real benefit -- this
  // stays a one-line append to the same seeding pass instead.
  const topicTrackableCreates = missingTopicTrackables.map((t) => ({
    collectionName: TENANT.TRACKABLES,
    docId: `${tenantId}__${t.id}`,
    data: {
      tenantId,
      moduleId: t.moduleId,
      subjectId: t.subjectId,
      group: t.group,
      groupName: t.groupName,
      name: t.name,
      guide: t.guide,
      panels: t.panels,
      order: t.order,
      status: "active",
      sourceTemplateId: t.id,
      edited: false,
    },
  }));

  await commitInChunks(db, subjectCreates, uid);
  await commitInChunks(db, [...trackableCreates, ...topicTrackableCreates], uid);
  return {
    seeded: true,
    subjectCount: subjectCreates.length,
    trackableCount: trackableCreates.length + topicTrackableCreates.length,
  };
}

/**
 * Adds a tenant-authored child subject ("topic") under an existing parent,
 * optionally attaching a resource -- this is "set the unit, subject by
 * subject, as resources are ready" (owner, Phase 6 planning): a Deen Study
 * subject like Fiqh starts as a plain leaf with nothing to claim, and stays
 * that way until a real topic with real content is added underneath it.
 *
 * Flips the parent's isTrackable off if it was on -- a parent that just
 * gained its first child is no longer a leaf, the same flip
 * reparentSubject() already does when a move changes leaf status. Without
 * this, a subject would end up claimable both as itself AND as its own new
 * child topic -- two trackable nodes for what is now one branch.
 *
 * parentNode is the full node object the caller already has loaded (from
 * getSubjectTree) -- not re-fetched here, so this stays one write for the
 * new subject plus, at most, one for the parent's flip.
 */
export async function createTopicSubject(db, tenantId, parentNode, { name, gloss, resource, addedByPersonId }, uid) {
  const newId = doc(collection(db, TENANT.SUBJECTS)).id;
  const ancestorIds = parentNode ? [...(parentNode.ancestorIds ?? []), parentNode.id] : [];
  const moduleIds = parentNode ? parentNode.moduleIds : [];

  let resourceIds = [];
  if (resource && (resource.url || resource.body)) {
    const resourceId = await createResource(db, tenantId, resource, addedByPersonId, uid);
    resourceIds = [resourceId];
  }

  await createDocument(db, TENANT.SUBJECTS, `${tenantId}__${newId}`, {
    tenantId,
    name: { en: name },
    gloss: gloss ? { en: gloss } : null,
    parentId: parentNode?.id ?? null,
    ancestorIds,
    moduleIds,
    isTrackable: true,
    resourceIds,
    order: 999,
    status: "active",
    sourceTemplateId: null,
    edited: false,
  }, uid);

  if (parentNode && parentNode.isTrackable) {
    await editCatalogueNode(db, TENANT.SUBJECTS, tenantId, parentNode.id, { isTrackable: false }, uid);
  }

  return newId;
}

export async function getSubjectTree(db, tenantId) {
  const q = query(collection(db, TENANT.SUBJECTS), where("tenantId", "==", tenantId));
  const snap = await getDocs(q);
  const nodes = snap.docs.map((d) => ({ id: d.id.replace(`${tenantId}__`, ""), ...d.data() }));
  return orderForDisplay(nodes);
}

export async function getTrackables(db, tenantId) {
  const q = query(collection(db, TENANT.TRACKABLES), where("tenantId", "==", tenantId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id.replace(`${tenantId}__`, ""), ...d.data() }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/**
 * Refreshes name/groupName on a tenant's own trackables copies from the
 * current APPROACH_TEMPLATES/section names, for any copy the tenant hasn't
 * edited (edited !== true) -- the same "update-without-overwrite" shape
 * this file's own header describes for subjects (Architecture Layer 1): an
 * edited copy is frozen away from platform changes, an untouched one stays
 * in sync. Backfills newly-added language keys (e.g. Bangla, added 5 Aug
 * 2026) into tenants that seeded before those keys existed, without
 * re-running the whole seed or touching anything else on the doc.
 */
export async function syncUnneditedTrackableNames(db, tenantId, uid) {
  const existing = await getTrackables(db, tenantId);
  const byTemplateId = new Map(APPROACH_TEMPLATES.map((t) => [t.id, t]));
  const updates = [];
  for (const t of existing) {
    if (t.edited) continue; // I6-style: tenant made this their own, never silently overwritten
    const template = byTemplateId.get(t.sourceTemplateId);
    if (!template) continue;
    const nameChanged = JSON.stringify(t.name) !== JSON.stringify(template.name);
    const groupNameChanged = JSON.stringify(t.groupName) !== JSON.stringify(template.sectionName);
    if (!nameChanged && !groupNameChanged) continue;
    updates.push({
      collectionName: TENANT.TRACKABLES,
      docId: `${tenantId}__${t.id}`,
      data: { name: template.name, groupName: template.sectionName },
    });
  }
  if (updates.length) await commitUpdatesInChunks(db, updates, uid);
  return { updatedCount: updates.length };
}

/**
 * One-time repair for tenants that seeded health_study back when it lived
 * under general_enhancement (before Health had its own module root, this
 * round). Moves it under "health" via the existing reparentSubject() --
 * same ancestorIds recompute and isTrackable flip that already handles any
 * other move correctly. A no-op once already repaired (or for a tenant
 * that never had the old placement to begin with), so it's safe to call on
 * every catalogue.html load, same self-repairing shape as the rest of this
 * file. Requires the new "health" root to already exist -- call this AFTER
 * ensureTenantCatalogueSeeded(), never before.
 */
export async function ensureHealthStudyReparented(db, tenantId, uid) {
  const tree = await getSubjectTree(db, tenantId);
  const node = tree.find((n) => n.id === "health_study");
  if (!node || node.parentId !== "general_enhancement") return false;
  if (!tree.some((n) => n.id === "health")) return false; // not seeded yet -- try again next load
  await reparentSubject(db, tenantId, "health_study", "health", uid);
  return true;
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

/**
 * Moves a subject to a different place in the tree ("level"). Re-parenting
 * isn't a single-field edit: ancestorIds has to be recomputed for the moved
 * node AND every one of its descendants (I12 -- roll-ups walk that chain,
 * so a stale one silently double-counts or drops a branch), and the old/
 * new parent's isTrackable flips if the move changes whether either one
 * still has children. Refuses a move that would make a node its own
 * ancestor.
 */
export async function reparentSubject(db, tenantId, nodeId, newParentId, uid) {
  const tree = await getSubjectTree(db, tenantId);
  const node = tree.find((n) => n.id === nodeId);
  if (!node) throw new Error(`Subject "${nodeId}" not found.`);
  if (newParentId === nodeId) throw new Error("A subject can't be its own parent.");

  const byId = new Map(tree.map((n) => [n.id, n]));
  function isDescendantOf(candidateId, ancestorId) {
    let cur = byId.get(candidateId);
    while (cur?.parentId) {
      if (cur.parentId === ancestorId) return true;
      cur = byId.get(cur.parentId);
    }
    return false;
  }
  if (newParentId && isDescendantOf(newParentId, nodeId)) {
    throw new Error("Can't move a subject under one of its own children.");
  }

  const oldParentId = node.parentId;
  const working = tree.map((n) => (n.id === nodeId ? { ...n, parentId: newParentId } : n));
  const ancestorMap = computeAncestorIds(working);

  const childCountWorking = new Map();
  for (const n of working) {
    if (n.parentId) childCountWorking.set(n.parentId, (childCountWorking.get(n.parentId) ?? 0) + 1);
  }

  // Patches keyed by id so the moved node, its descendants, and its old/new
  // parent each get exactly one merged update even if they overlap.
  const patches = new Map();
  function mergePatch(id, patch) {
    patches.set(id, { ...(patches.get(id) ?? {}), ...patch });
  }

  mergePatch(nodeId, { parentId: newParentId, ancestorIds: ancestorMap.get(nodeId) ?? [], edited: true });
  for (const n of tree) {
    if (n.id !== nodeId && (n.ancestorIds ?? []).includes(nodeId)) {
      mergePatch(n.id, { ancestorIds: ancestorMap.get(n.id) ?? [], edited: true });
    }
  }
  if (oldParentId && oldParentId !== newParentId) {
    mergePatch(oldParentId, { isTrackable: !childCountWorking.has(oldParentId), edited: true });
  }
  if (newParentId && newParentId !== oldParentId) {
    mergePatch(newParentId, { isTrackable: false, edited: true }); // just gained a child, can no longer be a leaf
  }

  const updates = [...patches.entries()].map(([id, data]) => ({
    collectionName: TENANT.SUBJECTS,
    docId: `${tenantId}__${id}`,
    data,
  }));
  await commitUpdatesInChunks(db, updates, uid);
  return { movedId: nodeId, affectedCount: updates.length };
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
    status: "active",
  }, uid);
  return levelId;
}

// ---------------------------------------------------------------------------
// Archive -- the sanctioned stand-in for delete (I4/D6: nothing is ever
// deleted from the app; a status flip is reversible and never orphans
// anything that already references this node).
// ---------------------------------------------------------------------------

export async function setSubjectStatus(db, tenantId, nodeId, status, uid) {
  return editCatalogueNode(db, TENANT.SUBJECTS, tenantId, nodeId, { status }, uid);
}

export async function setTrackableStatus(db, tenantId, trackableId, status, uid) {
  return editCatalogueNode(db, TENANT.TRACKABLES, tenantId, trackableId, { status }, uid);
}

export async function setLadderStatus(db, tenantId, ladderId, status, uid) {
  return updateDocument(db, TENANT.LADDERS, `${tenantId}__${ladderId}`, { status });
}

export async function setLevelStatus(db, tenantId, levelId, status, uid) {
  return updateDocument(db, TENANT.LEVELS, `${tenantId}__${levelId}`, { status });
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
