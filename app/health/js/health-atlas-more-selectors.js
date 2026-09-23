// Health Atlas — pure selector functions for tranche 3 (Foods, Diseases,
// Age Groups — the next slice after the foundation Body Systems browser
// and the claim-provenance badges).
//
// No DOM, no Firebase, no import of anything outside this module's own
// data file. Kept pure and standalone, same discipline as
// health-atlas-selectors.js.
//
// DELIBERATE SCOPE BOUNDARY, narrower than the data file itself carries:
//   - Foods: exposes only .id, .name, .category, .refs and organ NAMES
//     derived from .organs via organNamesFor() below — NEVER the raw
//     .organs strings. .organs looks purely qualitative ("Lungs:
//     continuous") on most entries, but several genuinely embed a
//     nutrient-dose recommendation in the same field ("Heart: 40g/day",
//     "Large Intestine: 1 cup/day") — found by walking every rendered food
//     in a real browser, not by reading the field's shape. NEVER
//     .nutrition or .servingQty either — both are nutrient-dose-shaped
//     ("~2.7L/day", "Adequate fibre 25-38g/day") and the task this tranche
//     was built under explicitly excludes nutrient-dose recommendations.
//   - Diseases: exposes only .id, .name, .cause, .symptoms, .organAffected
//     and .refs. NEVER .remedies, .homeRemedies or .naturalRemedies — all
//     three are treatment/remedy content, explicitly excluded.
//   - Age Groups: exposes only .id, .name and .range. NEVER .notes — its
//     entries are nutrition-guidance prose ("Iron needs rise...", "Portion
//     sizes scale with age"), the same excluded class as Foods' dose
//     fields, just without a number attached.
//   - HEALTH_ATLAS_LIFESTYLES is not read by this module AT ALL. Its own
//     substantive fields (.activities, .food, .avoid) are themselves
//     lifestyle RECOMMENDATIONS end to end ("150 min/week...", "avoid
//     screens before bed") — there is no structural/organizational subset
//     of that dataset that isn't a recommendation, so the whole dataset is
//     deferred rather than partially shown. See the tranche report for the
//     reasoning in full.
// This boundary is asserted mechanically by
// tools/health-atlas-verify/view-boundary-more.mjs, which reads this
// file's own source text and health-atlas-more-view.js's — do not import
// a new field or HEALTH_ATLAS_LIFESTYLES here without updating that guard
// first.
//
// SEARCH (parity tranche 11, additive). The source app's own generic
// `matches(item, term)` is `JSON.stringify(item).toLowerCase().includes(term)`
// — it searches the ENTIRE serialized item, excluded fields included. That
// is not source-faithful here: replicating it on Diseases would let a
// search term surface a result because it appears in `remedies`,
// `homeRemedies` or `naturalRemedies` — a hit list is itself a disclosure of
// that hidden text's content even though the field is never rendered
// directly, the exact class of leak `organNamesFor()`'s own dose-stripping
// above already guards against for a different field. matchesFoodSearch and
// matchesDiseaseSearch below are therefore scoped to EXACTLY the fields this
// view already renders (the same discipline health-atlas-selectors.js's own
// matchesOrganSearch uses for organs) — never the excluded ones. No search
// predicate is added for Age Groups: the source app itself has none (its
// own SEARCH_TERM carries no `age` key).
export function matchesFoodSearch(food, term) {
  const needle = String(term || '').trim().toLowerCase();
  if (!needle) return true;
  if (String(food.name || '').toLowerCase().includes(needle)) return true;
  return String(food.category || '').toLowerCase().includes(needle);
}

export function matchesDiseaseSearch(disease, term) {
  const needle = String(term || '').trim().toLowerCase();
  if (!needle) return true;
  if (String(disease.name || '').toLowerCase().includes(needle)) return true;
  if ((disease.organAffected || []).some(o => String(o).toLowerCase().includes(needle))) return true;
  if ((disease.cause || []).some(c => String(c).toLowerCase().includes(needle))) return true;
  return (disease.symptoms || []).some(s => String(s).toLowerCase().includes(needle));
}

export function listFoodCategories(foods) {
  const seen = [];
  for (const f of foods) {
    if (!seen.includes(f.category)) seen.push(f.category);
  }
  return seen;
}

export function foodsByCategory(foods, category) {
  return foods.filter(f => f.category === category);
}

export function getFood(foods, id) {
  return foods.find(f => f.id === id) || null;
}

// food.organs entries are free text of the shape "Organ: qualifier", and
// the qualifier is NOT always a plain word like "supportive" or
// "continuous" — several entries embed a nutrient-dose recommendation
// there instead ("Heart: 40g/day", "Large Intestine: 1 cup/day"), found by
// walking every rendered food in a real browser rather than assumed from
// the field's other, cleaner-looking entries. This strips to the organ
// NAME only (everything before the first ":"), which is the one part of
// the field that is structural/organizational rather than a dose. Do not
// render food.organs directly — see view-boundary-more.mjs.
export function organNamesFor(entity) {
  const list = Array.isArray(entity && entity.organs) ? entity.organs : [];
  return list.map(s => String(s).split(':')[0].trim()).filter(Boolean);
}

export function listDiseases(diseases) {
  return diseases.slice();
}

export function getDisease(diseases, id) {
  return diseases.find(d => d.id === id) || null;
}

export function listAgeGroups(ages) {
  return ages.slice();
}

export function getAgeGroup(ages, id) {
  return ages.find(a => a.id === id) || null;
}
