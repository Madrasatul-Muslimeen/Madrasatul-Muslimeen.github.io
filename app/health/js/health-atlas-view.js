// Health Atlas — the one concrete capability built in foundation tranche 1:
// a read-only Body Systems browser (system -> its organs -> one organ's
// functions, body-system membership and general references).
//
// DELIBERATE SCOPE BOUNDARY: this view only ever reads organ.id, .name,
// .system, .functions, .connections and .refs (resolved through
// HEALTH_ATLAS_REFERENCES). It never reads nutritionNeeds, foodSources,
// activity, deterioration, remedies, homeRemedies or naturalRemedies, and
// it never touches HEALTH_ATLAS_FOODS, HEALTH_ATLAS_DISEASES,
// HEALTH_ATLAS_LIFESTYLES or HEALTH_ATLAS_AGES at all — those need an
// accuracy pass before anything shows them as though they were verified,
// which this tranche does not attempt (see app/health/README.md, "what
// this tranche deliberately does not build"). The boundary is asserted
// mechanically by tools/health-atlas-verify/view-boundary.mjs, which reads
// this file's own source text — do not import those fields into this file
// without updating that check first.
//
// CLAIM-LEVEL PROVENANCE (claim-provenance tranche 1, additive to the
// above). Every function statement now renders a small badge naming its
// EVIDENCE STATUS, from health-atlas-claims.js's closed vocabulary — never
// an unqualified claim of verification. The badge's "cited" branch is
// decided ONLY by comparing against the imported EVIDENCE_STATUS.CITED_EVIDENCE
// constant, never by a literal 'cited-evidence' string written in this
// file — tools/health-atlas-verify/view-provenance-boundary.mjs asserts
// that literal is absent from this file's own source, so a future edit
// cannot make a statement look cited without going through the registry.
// A statement the registry has no entry for renders as UNCLASSIFIED
// (visibly, not silently) rather than defaulting to either status.

import {
  listSystems,
  organsForSystem,
  getOrgan,
  referencesFor,
  organCountsBySystem
} from './health-atlas-selectors.js';
import {
  EVIDENCE_STATUS,
  evidenceStatusFor,
  referenceIdFor
} from './health-atlas-claims.js';

function el(tag, attrs, children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else node.setAttribute(key, value);
  }
  for (const child of children || []) {
    if (child) node.appendChild(child);
  }
  return node;
}

function renderReferences(refs) {
  if (!refs.length) return null;
  const list = el('ul', { class: 'ha-refs' });
  for (const ref of refs) {
    const link = el('a', { href: ref.url, target: '_blank', rel: 'noopener', text: ref.name });
    list.appendChild(el('li', {}, [link]));
  }
  return el('div', { class: 'ha-refs-block' }, [
    el('div', { class: 'ha-refs-label', text: 'General references' }),
    list
  ]);
}

// Renders one function statement's evidence-status badge. The status comes
// ONLY from evidenceStatusFor() / the imported EVIDENCE_STATUS constant —
// never a literal string — so a claim can never read as "cited" without a
// real registry entry naming it so (see view-provenance-boundary.mjs).
function renderEvidenceBadge(organId, statement, referencesById) {
  const status = evidenceStatusFor(organId, statement);
  if (status === EVIDENCE_STATUS.CITED_EVIDENCE) {
    const refId = referenceIdFor(organId, statement);
    const ref = refId ? referencesById[refId] : null;
    const label = ref ? `Cited: ${ref.name}` : 'Cited (reference unresolved)';
    return el('span', { class: 'ha-evidence-badge ha-evidence-cited', text: label });
  }
  if (status === EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY) {
    return el('span', {
      class: 'ha-evidence-badge ha-evidence-general',
      text: 'General reference only — not verified as evidence for this specific statement'
    });
  }
  // No registry entry at all: say so plainly rather than guessing a status.
  return el('span', { class: 'ha-evidence-badge ha-evidence-unclassified', text: 'Unclassified — no provenance record yet' });
}

function renderOrganDetail(data, organId, onBack) {
  const organ = getOrgan(data.organs, organId);
  if (!organ) return el('p', { class: 'ha-empty', text: 'Organ not found in this dataset.' });

  const system = data.systems.find(s => s.id === organ.system);
  const functionsList = el('ul', { class: 'ha-plain' },
    (organ.functions || []).map(fn => el('li', {}, [
      el('span', { class: 'ha-function-text', text: fn }),
      renderEvidenceBadge(organ.id, fn, data.referencesById)
    ])));
  const connections = (organ.connections || []).join(', ');
  const refs = referencesFor(organ, data.referencesById);

  const back = el('button', { class: 'ha-back', type: 'button', text: '← All systems' });
  back.addEventListener('click', onBack);

  return el('div', { class: 'ha-detail-card' }, [
    back,
    el('div', { class: 'ha-draft-banner', text: 'DRAFT — general reference only, not per-fact verified, not medical advice. Consult a qualified healthcare professional.' }),
    el('h2', { text: organ.name }),
    el('div', { class: 'ha-meta', text: system ? `Body system: ${system.name}` : '' }),
    el('div', { class: 'ha-section-label', text: 'Functions' }),
    functionsList,
    connections ? el('div', { class: 'ha-meta', text: `Connects with: ${connections}` }) : null,
    renderReferences(refs)
  ]);
}

function renderSystemList(data, onOpenOrgan) {
  const counts = organCountsBySystem(data.systems, data.organs);
  const rows = counts.map(({ system, count }) => {
    const heading = el('div', { class: 'ha-system-head' }, [
      el('span', { class: 'ha-swatch', style: `background:${system.color}` }),
      el('span', { class: 'ha-system-name', text: system.name }),
      el('span', { class: 'ha-system-count', text: `${count} organ${count === 1 ? '' : 's'}` })
    ]);
    const organButtons = organsForSystem(data.organs, system.id).map(organ => {
      const btn = el('button', { class: 'ha-organ-btn', type: 'button', text: organ.name });
      btn.addEventListener('click', () => onOpenOrgan(organ.id));
      return el('li', {}, [btn]);
    });
    return el('section', { class: 'ha-system-block' }, [heading, el('ul', { class: 'ha-organ-list' }, organButtons)]);
  });
  return el('div', { class: 'ha-system-list' }, rows);
}

export function mountHealthAtlas(container, rawData) {
  const referencesById = rawData.references;
  const data = {
    systems: listSystems(rawData.systems),
    organs: rawData.organs,
    referencesById
  };

  function draw(openOrganId) {
    container.textContent = '';
    if (openOrganId) {
      container.appendChild(renderOrganDetail(data, openOrganId, () => draw(null)));
    } else {
      container.appendChild(el('div', { class: 'ha-draft-banner', text: 'DRAFT — general reference dataset for internal review only. Not per-fact verified. Not medical advice.' }));
      container.appendChild(renderSystemList(data, organId => draw(organId)));
    }
  }

  draw(null);
  return { redraw: draw };
}
