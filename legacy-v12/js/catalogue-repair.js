// Catalogue self-repair, moved OFF the startup path (load-speed round,
// August 2026).
//
// WHAT THIS REPLACES
//
// Every study module page used to run three seeding checks, one after
// another, BEFORE it drew anything at all:
//
//   ensureModulesSeeded          -> reads the whole `modules` collection
//   ensureSubjectTemplatesSeeded -> reads the whole `subjectTemplates`
//   ensureTenantCatalogueSeeded  -> reads this tenant's whole subject tree
//                                   AND all its trackables
//
// They are idempotent, so for a tenant seeded weeks ago all three found
// nothing to do -- and still cost three round trips before a single word
// appeared on screen, on every page load of every module page, forever.
// Measured: 3 of the 14 sequential round trips a module page made, plus two
// MORE, because the subject tree and trackables that check had just read
// were then read a second time by the page itself.
//
// WHAT HAPPENS NOW, and why it is still correct
//
// 1. A page reads the data it needs anyway (subject tree + trackables), and
//    only if what it needs is genuinely ABSENT does it seed, right then,
//    before rendering. That is the case seeding exists for -- a new tenant,
//    or a tenant that predates this module -- and it is detected from reads
//    the page was already making, at no extra cost.
//
// 2. The full three-way check still runs, but AFTER the page is usable, in
//    the background, at most once per browser tab. So platform drift (a
//    module or subject added to catalogue-data.js since this tenant seeded)
//    still self-repairs on any page load, exactly as before -- it simply no
//    longer makes the person wait for it.
//
// Nothing is deleted or reshaped (I4). Every seeding function is unchanged
// and still writes exactly what it wrote before; only WHEN they are called
// has changed. The owner chose this shape, with the trade-off stated: an
// admin's edit to a module or subject reaches a study page on the next load
// rather than the current one.

import { ensureModulesSeeded } from "./modules.js";
import { ensureSubjectTemplatesSeeded, ensureTenantCatalogueSeeded } from "./catalogue.js";

const REPAIR_FLAG = "qr.catalogueRepairRan";

/**
 * Does this page have what it needs, or must it seed before it can render?
 *
 * `tree` is the tenant's subject tree as already loaded. Two ways it can be
 * inadequate: the tenant has no catalogue at all (a genuinely new tenant),
 * or it has one that predates this module (so the module's own root subject
 * is missing -- which is exactly the tenant standing on this page right now).
 */
export function catalogueNeedsSeeding(tree, rootSubjectId) {
  if (!Array.isArray(tree) || tree.length === 0) return true;
  if (!rootSubjectId) return false;
  return !tree.some((n) => n.id === rootSubjectId);
}

/**
 * The blocking seed, run ONLY when catalogueNeedsSeeding() says so. Same
 * three calls, same order, same writes as the old startup path -- this is
 * the new-tenant path, and it is deliberately identical to what a new
 * tenant got before.
 */
export async function seedCatalogueNow(db, tenantId, uid) {
  await ensureModulesSeeded(db, uid);
  await ensureSubjectTemplatesSeeded(db, uid);
  return ensureTenantCatalogueSeeded(db, tenantId, uid);
}

/**
 * The background repair. Fire-and-forget: never awaited by a page's render
 * path, and never allowed to surface an error to the person studying --
 * a viewer without owner/prime cannot write catalogue data at all, and a
 * permission-denied here is normal, not a fault they can act on (which is
 * why it is a console warning and not an I15 user-facing message: nothing
 * the person did failed, and nothing they can see is missing).
 *
 * Runs at most once per browser tab. sessionStorage, not localStorage: a
 * new tab is a cheap, natural moment to re-check for platform drift, and
 * tying it to the tab keeps it off the critical path of every navigation
 * within one sitting.
 *
 * onSeeded() is called only if something was ACTUALLY written, so a page can
 * refresh itself in the rare case where the background pass found real work.
 */
export function repairCatalogueInBackground(db, tenantId, uid, onSeeded) {
  try {
    if (sessionStorage.getItem(REPAIR_FLAG) === tenantId) return;
    sessionStorage.setItem(REPAIR_FLAG, tenantId);
  } catch {
    // Private browsing with storage blocked: just run it, same as before.
  }
  (async () => {
    try {
      // Deliberately NOT ensureSubjectTemplatesSeeded() here. `subjectTemplates`
      // is written by that function and read by NOTHING in the app -- checked
      // across every page and module: no screen displays it, and even
      // ensureTenantCatalogueSeeded() builds from the bundled SUBJECT_TEMPLATES
      // constant, not from the collection. So drift in it cannot affect
      // anything a study page shows. It is still seeded for a genuinely new
      // tenant (seedCatalogueNow above, unchanged) and still checked on
      // catalogue.html, which is where it could ever matter. Nothing is
      // deleted: the collection and its contents stand (I4).
      await ensureModulesSeeded(db, uid);
      const result = await ensureTenantCatalogueSeeded(db, tenantId, uid);
      if (result && result.seeded && typeof onSeeded === "function") await onSeeded();
    } catch (err) {
      console.warn("Background catalogue check skipped:", err.message);
    }
  })();
}
