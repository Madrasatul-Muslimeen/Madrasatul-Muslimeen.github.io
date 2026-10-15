// v08.110 -- the Owner (29 Sep 2026): "When a Section is renamed or added it
// should be added and edited to the Approach list as well."
//
// Pure (I2): groups the Quran Approaches under the tenant's OWN section list
// (sectionsFromTenantDoc(), catalogue.js), in that list's order, named by that
// list -- so a renamed section reads its new name everywhere the list is drawn,
// and a newly added section appears even before any Approach is filed in it.
//
// Matching an Approach to its section mirrors catalogue.html's own sectionOf():
// the stored `group` number first, then the denormalized `groupName` (a doc
// that reached Firestore without a `group` still knows its section's name).
// Anything matching no section is kept, grouped under its own groupName, at
// the end -- never dropped.
//
// `includeEmpty` shows a section with no Approaches. The landing page passes
// it only once the tenant has taken its sections over (tenantOwnsSections()):
// the platform's own seven all carry Approaches, so an empty one can only be
// one the owner added.

const nameMatches = (a, b) => ["en", "bn"].some((l) => a?.[l] && a[l] === b?.[l]);

/**
 * @param {Array} approaches  items in display order, each with a `group` and
 *                            `groupName` (a trackable, or any object carrying
 *                            them under `trackable`)
 * @param {Array} sections    [{ n, name }] in the tenant's order
 * @returns {Array} [{ n, name, items, empty }] -- `n` null for leftovers
 */
export function groupApproachesBySection(approaches, sections, { includeEmpty = false, trackableOf = (x) => x } = {}) {
  const list = Array.isArray(sections) ? sections : [];
  const numbers = new Set(list.map((s) => Number(s.n)));
  const sectionFor = (tr) => {
    const g = Number(tr?.group);
    if (numbers.has(g)) return g;
    const byName = list.find((s) => nameMatches(tr?.groupName, s.name));
    return byName ? Number(byName.n) : null;
  };
  const bySection = new Map(list.map((s) => [Number(s.n), []]));
  const leftovers = [];
  for (const item of approaches ?? []) {
    const n = sectionFor(trackableOf(item));
    if (n == null) leftovers.push(item);
    else bySection.get(n).push(item);
  }
  const out = [];
  for (const s of list) {
    const items = bySection.get(Number(s.n));
    if (!items.length && !includeEmpty) continue;
    out.push({ n: Number(s.n), name: s.name ?? {}, items, empty: items.length === 0 });
  }
  const byOwnName = new Map();
  for (const item of leftovers) {
    const gn = trackableOf(item)?.groupName ?? null;
    const key = JSON.stringify(gn);
    if (!byOwnName.has(key)) byOwnName.set(key, { n: null, name: gn ?? {}, items: [], empty: false });
    byOwnName.get(key).items.push(item);
  }
  out.push(...byOwnName.values());
  return out;
}
