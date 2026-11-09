// Health Atlas — pure selector functions for tranche 4 (Master Categories
// index — the food-category taxonomy carried by the dataset since
// tranche 1 but never read by any view until now).
//
// No DOM, no Firebase, no import of anything outside this module's own
// arguments. Kept pure and standalone, same discipline as
// health-atlas-selectors.js and health-atlas-more-selectors.js.
//
// DELIBERATE SCOPE BOUNDARY, and why it is smaller than tranche 3's:
// HEALTH_ATLAS_MASTER_CATEGORIES itself carries only .id, .name and .subs
// (a list of plain category-label strings) — checked directly against the
// live data file before this tranche was written. There is no nutrition,
// serving-quantity, remedy, treatment or lifestyle-recommendation field
// anywhere on this dataset to defer; the whole object is structural.
//
// The one cross-dataset read this module makes is food.category, to count
// how many foods sit under each category label — and .category is already
// an approved, already-displayed field (health-atlas-more-view.js has read
// it unchanged since tranche 3). This module never reads any OTHER Foods
// field, and never reads HEALTH_ATLAS_DISEASES, HEALTH_ATLAS_LIFESTYLES or
// HEALTH_ATLAS_AGES at all. Asserted mechanically by
// tools/health-atlas-verify/view-boundary-categories.mjs, which reads this
// file's own source text — do not import a new field or dataset here
// without updating that guard first.

export function listMasterCategories(categories) {
  return categories.slice();
}

export function getMasterCategory(categories, id) {
  return categories.find(c => c.id === id) || null;
}

// Every sub-category label maps 1:1 onto an existing food.category value in
// the live dataset (checked directly, zero unmatched in either direction) —
// so this is a plain equality count over an already-approved field, never a
// new read of anything dose/remedy/lifestyle-shaped.
export function foodCountForSub(foods, subLabel) {
  return foods.filter(f => f.category === subLabel).length;
}

export function totalFoodCountForCategory(foods, category) {
  return category.subs.reduce((sum, sub) => sum + foodCountForSub(foods, sub), 0);
}
