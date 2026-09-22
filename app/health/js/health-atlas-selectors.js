// Health Atlas — pure selector functions (foundation tranche 1).
//
// No DOM, no Firebase, no import of anything outside this module's own
// data file. Kept pure and standalone on purpose: this is a Health-owned
// module foundation, not wired into any shared nav, tenant, or study-app
// surface yet — see app/health/README.md.
//
// Deliberately narrow: these selectors only expose what the concrete
// capability in this tranche (Body Systems + organ function browsing)
// needs. They do not expose nutritionNeeds, foodSources, activity,
// deterioration, remedies, homeRemedies or naturalRemedies — those
// fields are carried by the data file for a future tranche, and are not
// read here. See tools/health-atlas-verify/view-boundary.mjs, which
// asserts the deferral mechanically rather than by convention alone.

export function listSystems(systems) {
  return systems.slice();
}

export function systemById(systems, systemId) {
  return systems.find(s => s.id === systemId) || null;
}

export function organsForSystem(organs, systemId) {
  return organs.filter(o => o.system === systemId);
}

export function getOrgan(organs, organId) {
  return organs.find(o => o.id === organId) || null;
}

export function referencesFor(entity, referencesById) {
  const ids = Array.isArray(entity && entity.refs) ? entity.refs : [];
  return ids
    .map(id => referencesById[id])
    .filter(Boolean);
}

export function organCountsBySystem(systems, organs) {
  return systems.map(sys => ({
    system: sys,
    count: organs.filter(o => o.system === sys.id).length
  }));
}

// Search predicate (parity tranche 6, additive). Matches on organ.name and
// organ.functions only — the two fields this view already renders. It never
// reads nutritionNeeds/foodSources/activity/deterioration, so search cannot
// become a side door into a field the view itself is barred from showing;
// tools/health-atlas-verify/view-boundary-wheel.mjs asserts this file still
// carries none of those field names anywhere in its source.
export function matchesOrganSearch(organ, term) {
  const needle = String(term || '').trim().toLowerCase();
  if (!needle) return true;
  if (String(organ.name || '').toLowerCase().includes(needle)) return true;
  return (organ.functions || []).some(fn => String(fn).toLowerCase().includes(needle));
}
