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

import {
  listSystems,
  organsForSystem,
  getOrgan,
  referencesFor,
  organCountsBySystem
} from './health-atlas-selectors.js';

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

function renderOrganDetail(data, organId, onBack) {
  const organ = getOrgan(data.organs, organId);
  if (!organ) return el('p', { class: 'ha-empty', text: 'Organ not found in this dataset.' });

  const system = data.systems.find(s => s.id === organ.system);
  const functionsList = el('ul', { class: 'ha-plain' },
    (organ.functions || []).map(fn => el('li', { text: fn })));
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
