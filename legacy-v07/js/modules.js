// F-021 — Module registry (Phase 2, Catalogue)
//
// modules/{moduleId} is platform-wide, not tenant-scoped (Architecture,
// Layer 1). Seeded once from MODULE_TEMPLATES; genesis-only writes (same
// "create only if the doc doesn't already exist" shape as every other
// bootstrap path in this codebase -- see catalogue.js for the identical
// pattern on subjectTemplates, and identity.js's tenant bootstrap).
//
// Load-speed contract: "Module registry -- bundled in the app, refreshed in
// background, never a blocking read." This module still reads Firestore
// (so an admin edit to a module's name/icon/order eventually shows up
// everywhere), but callers must never await it on the startup path -- only
// from an already-loaded screen like catalogue.html.

import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { createDocument, updateDocument } from "./envelope.js";
import { MODULE_TEMPLATES } from "./catalogue-data.js";

/** Seeds any MODULE_TEMPLATES rows not yet present. Safe to call repeatedly -- existing docs are left untouched (I4/D6, and admin edits to a module's name/order must never be clobbered by a later seed run). */
export async function ensureModulesSeeded(db, uid) {
  const snap = await getDocs(collection(db, TENANT.MODULES));
  const existingIds = new Set(snap.docs.map((d) => d.id));

  const missing = MODULE_TEMPLATES.filter((m) => !existingIds.has(m.id));
  for (const m of missing) {
    // Sequential, not batched: each is independently a "create if absent"
    // genesis write (see firestore.rules), and the set is tiny (7 rows).
    await createDocument(db, TENANT.MODULES, m.id, {
      name: m.name,
      icon: m.icon,
      renderer: m.renderer,
      order: m.order,
      status: "planned", // flipped to "active" as each module's real UI ships
    }, uid);
  }
  return missing.map((m) => m.id);
}

export async function listModules(db) {
  const snap = await getDocs(collection(db, TENANT.MODULES));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/**
 * Owner ask (10 Aug 2026): move a module up/down in the flat list. Swaps
 * `order` between two modules -- the whole reorder operation, since modules
 * have no hierarchy to renumber. modules/{moduleId} is platform-wide, not
 * tenant-scoped (Architecture, Layer 1) -- firestore.rules restricts writes
 * here to isPlatformAdmin(), same reasoning Phase 6 already hit once
 * (module.status auto-flip would have thrown for a tenant owner). Callers
 * must surface a permission-denied failure clearly (safeWrite/I15), not
 * assume this always succeeds for whoever's using catalogue.html.
 */
export async function swapModuleOrder(db, moduleIdA, orderA, moduleIdB, orderB) {
  await Promise.all([
    updateDocument(db, TENANT.MODULES, moduleIdA, { order: orderB }),
    updateDocument(db, TENANT.MODULES, moduleIdB, { order: orderA }),
  ]);
}
