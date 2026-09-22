// Health Atlas — Body Systems browser, now with the source app's own
// three-column layout, an interactive body-systems/organs wheel, and the
// three built system diagrams (parity tranche 6, additive to foundation
// tranche 1 + claim-provenance tranche 1).
//
// DELIBERATE SCOPE BOUNDARY, UNCHANGED FROM FOUNDATION TRANCHE 1: this view
// only ever reads organ.id, .name, .system, .role, .functions, .connections
// and .refs (resolved through HEALTH_ATLAS_REFERENCES), plus the pure
// decorative diagram data in health-atlas-diagrams.js. It never reads
// nutritionNeeds, foodSources, activity, deterioration, remedies,
// homeRemedies or naturalRemedies, and it never touches HEALTH_ATLAS_FOODS,
// HEALTH_ATLAS_DISEASES, HEALTH_ATLAS_LIFESTYLES or HEALTH_ATLAS_AGES at
// all. The boundary is asserted mechanically by
// tools/health-atlas-verify/view-boundary.mjs and
// tools/health-atlas-verify/view-boundary-wheel.mjs, which read this file's
// own source text — do not import those fields into this file without
// updating both checks first.
//
// NEW IN THIS TRANCHE, all read-only (no add/edit/delete/reorder/rename of
// anything, no export/import/reset — see docs/reports/
// 2026-09-21-health-atlas-body-systems-parity-tranche6.md for exactly why
// those are deferred rather than built here):
//   - a three-column layout (system list | wheel | detail), matching the
//     v02.04 standalone source's own `.bs-layout-3col`, collapsing to a
//     single column below 980px so it works on tablet/phone widths;
//   - collapsible per-system sections in the left column (open/close only —
//     no reorder, rename, add or delete, all of which the source allows and
//     this tranche deliberately does not port);
//   - a two-level interactive SVG wheel (all systems, then one system's own
//     organs), reusing the exact wedge/polar-coordinate geometry from the
//     source, built with real SVG DOM nodes (createElementNS) rather than
//     innerHTML markup — this file has never used innerHTML anywhere, and
//     this tranche does not start;
//   - the wheel's own resizable box (CSS `resize: both`, matching the
//     source's `.wheel-svg-box`);
//   - a plain-text search box over organ name + functions (the two fields
//     this view already renders — see matchesOrganSearch in
//     health-atlas-selectors.js);
//   - the three built system diagrams (Renal & Urinary, Sensory,
//     Integumentary) with a plain "diagram in progress" notice for the
//     other six systems, matching the source's own 3-built/6-not-yet-built
//     split exactly.
//
// STILL DEFERRED (see the report above): the wheel's third "fields" ring,
// system reorder/rename/delete, organ/system add/edit forms, and the
// header JSON export/import/reset. All are real source behaviour this
// tranche does not attempt, named here rather than silently dropped.

import {
  listSystems,
  organsForSystem,
  getOrgan,
  referencesFor,
  organCountsBySystem,
  matchesOrganSearch
} from './health-atlas-selectors.js';
import {
  EVIDENCE_STATUS,
  evidenceStatusFor,
  referenceIdFor
} from './health-atlas-claims.js';
import { diagramForSystem } from './health-atlas-diagrams.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

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

function svgEl(tag, attrs, children) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    node.setAttribute(key, value);
  }
  for (const child of children || []) {
    if (child) node.appendChild(child);
  }
  return node;
}

function svgText(x, y, text, extraAttrs) {
  const node = svgEl('text', { x, y, ...(extraAttrs || {}) });
  node.textContent = text;
  return node;
}

/* ---------- Wheel geometry (pure math, no field data) ---------- */
function polarPoint(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function wedgePathD(cx, cy, rOuter, rInner, a0, a1) {
  const p0 = polarPoint(cx, cy, rOuter, a0);
  const p1 = polarPoint(cx, cy, rOuter, a1);
  const p2 = polarPoint(cx, cy, rInner, a1);
  const p3 = polarPoint(cx, cy, rInner, a0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${p0.x} ${p0.y} A ${rOuter} ${rOuter} 0 ${large} 1 ${p1.x} ${p1.y} L ${p2.x} ${p2.y} A ${rInner} ${rInner} 0 ${large} 0 ${p3.x} ${p3.y} Z`;
}

function wedgeLabelNode(cx, cy, rMid, angleDeg, text, fontSize) {
  const flip = angleDeg > 180;
  const rot = flip ? angleDeg + 90 : angleDeg - 90;
  const pt = polarPoint(cx, cy, rMid, angleDeg);
  return svgText(pt.x, pt.y, text, {
    transform: `rotate(${rot} ${pt.x} ${pt.y})`,
    'text-anchor': 'middle',
    'dominant-baseline': 'middle',
    'font-size': fontSize,
    fill: '#3a3226',
    class: 'ha-wedge-label'
  });
}

function makeActivatable(node, onActivate, ariaLabel) {
  node.setAttribute('tabindex', '0');
  node.setAttribute('role', 'button');
  if (ariaLabel) node.setAttribute('aria-label', ariaLabel);
  node.addEventListener('click', onActivate);
  node.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate();
    }
  });
}

/* ---------- Wheel widget ---------- */
function buildWheel(state, data, callbacks) {
  const CX = 210, CY = 210, R_OUTER = 185, R_INNER = 75, R_LABEL = 130;
  const wedgeGroup = svgEl('g', {});
  const legend = el('div', { class: 'ha-wheel-legend' });
  let centerTop, centerBottom, backHandler = null, backLabel = '';

  if (state.wheelLevel === 'systems') {
    const systems = data.systems;
    const n = systems.length || 1;
    const step = 360 / n;
    systems.forEach((sys, i) => {
      const a0 = i * step, a1 = (i + 1) * step - 1.2, mid = (a0 + a1) / 2;
      const wedge = svgEl('g', { class: 'ha-wedge' });
      wedge.appendChild(svgEl('path', { d: wedgePathD(CX, CY, R_OUTER, R_INNER, a0, a1), fill: sys.color, class: 'ha-wedge-path' }));
      wedge.appendChild(wedgeLabelNode(CX, CY, R_LABEL, mid, sys.name, 11));
      makeActivatable(wedge, () => callbacks.onSelectSystem(sys.id), `${sys.name} system`);
      wedgeGroup.appendChild(wedge);

      const legendBtn = el('button', { type: 'button', class: 'ha-legend-item' }, [
        el('span', { class: 'ha-swatch', style: `background:${sys.color}` }),
        document.createTextNode(sys.name)
      ]);
      legendBtn.addEventListener('click', () => callbacks.onSelectSystem(sys.id));
      legend.appendChild(legendBtn);
    });
    centerTop = 'Body';
    centerBottom = 'Systems';
  } else {
    const sys = data.systems.find((s) => s.id === state.wheelActiveSystem) || { name: '', color: '#888' };
    const items = organsForSystem(data.organs, state.wheelActiveSystem);
    const n = items.length || 1;
    const step = 360 / n;
    items.forEach((organ, i) => {
      const a0 = i * step, a1 = (i + 1) * step - 1.2, mid = (a0 + a1) / 2;
      const isMain = organ.role === 'main';
      const isSelected = state.selectedOrganId === organ.id;
      const wedge = svgEl('g', { class: `ha-wedge${isSelected ? ' ha-wedge-active' : ''}` });
      const path = svgEl('path', {
        d: wedgePathD(CX, CY, R_OUTER, R_INNER, a0, a1),
        fill: sys.color,
        opacity: isMain ? '1' : '0.5',
        class: 'ha-wedge-path'
      });
      if (!isMain) path.setAttribute('stroke-dasharray', '3 3');
      if (isSelected) {
        path.setAttribute('stroke', '#8a6220');
        path.setAttribute('stroke-width', '3');
      }
      wedge.appendChild(path);
      wedge.appendChild(wedgeLabelNode(CX, CY, R_LABEL, mid, organ.name, 10));
      makeActivatable(wedge, () => callbacks.onSelectOrgan(organ.id), `${organ.name} (${isMain ? 'main' : 'supportive'})`);
      wedgeGroup.appendChild(wedge);

      const legendBtn = el('button', { type: 'button', class: `ha-legend-item${isSelected ? ' ha-legend-item-active' : ''}` }, [
        el('span', { class: `ha-role-dot ${isMain ? 'ha-role-main' : 'ha-role-supportive'}` }),
        document.createTextNode(organ.name)
      ]);
      legendBtn.addEventListener('click', () => callbacks.onSelectOrgan(organ.id));
      legend.appendChild(legendBtn);
    });
    centerTop = '← Back';
    centerBottom = sys.name;
    backHandler = () => callbacks.onWheelBack();
    backLabel = `← All Body Systems`;
  }

  const centerGroup = svgEl('g', { class: 'ha-wheel-center' });
  centerGroup.appendChild(svgEl('circle', { cx: CX, cy: CY, r: 74, fill: '#faf7f1', stroke: '#dcd3c0' }));
  centerGroup.appendChild(svgText(CX, CY - 5, centerTop, { 'text-anchor': 'middle', fill: '#8a6220', 'font-size': state.wheelLevel === 'systems' ? 16 : 13 }));
  centerGroup.appendChild(svgText(CX, CY + 14, centerBottom, { 'text-anchor': 'middle', fill: '#8a6220', 'font-size': state.wheelLevel === 'systems' ? 16 : 13 }));
  if (backHandler) makeActivatable(centerGroup, backHandler, 'Back to all body systems');

  const svg = svgEl('svg', { viewBox: '0 0 420 420', role: 'img', 'aria-label': state.wheelLevel === 'systems' ? 'Body systems wheel' : `${centerBottom} organs wheel` }, [wedgeGroup, centerGroup]);

  const box = el('div', { class: 'ha-wheel-svg-box' }, [svg, el('span', { class: 'ha-wheel-hint', text: '↘ drag corner to resize' })]);
  const wrap = el('div', { class: 'ha-wheel-wrap' }, [box]);

  const panelChildren = [];
  if (backHandler) {
    const back = el('button', { type: 'button', class: 'ha-wheel-back', text: backLabel });
    back.addEventListener('click', backHandler);
    panelChildren.push(back);
  }
  panelChildren.push(wrap, legend);

  return el('div', { class: 'ha-wheel-panel' }, panelChildren);
}

/* ---------- Diagram panel ---------- */
function buildDiagramPanel(organ, systemName) {
  const diagram = diagramForSystem(organ.system);
  if (!diagram) {
    return el('div', { class: 'ha-diagram-card' }, [
      el('div', { class: 'ha-empty', text: `Diagram for the ${systemName} system is still in progress — text connections below are accurate meanwhile.` })
    ]);
  }
  const shapeNodes = diagram.shapes.map((shape) => {
    if (shape.tag === 'text') return svgText(shape.attrs.x, shape.attrs.y, shape.text, shape.attrs);
    return svgEl(shape.tag, shape.attrs);
  });
  const svg = svgEl('svg', { viewBox: diagram.viewBox, class: 'ha-diagram-svg' }, shapeNodes);
  return el('div', { class: 'ha-diagram-card' }, [
    svg,
    el('div', { class: 'ha-diagram-caption', text: `${diagram.caption} ${organ.name}` })
  ]);
}

/* ---------- Organ detail ---------- */
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

function buildDetailColumn(state, data, callbacks) {
  if (!state.selectedOrganId) {
    return el('div', { class: 'ha-detail-card' }, [
      el('div', { class: 'ha-empty', text: 'Select a body part from the list or the wheel to see its full profile and, where available, a diagram of its body system.' })
    ]);
  }
  const organ = getOrgan(data.organs, state.selectedOrganId);
  if (!organ) {
    return el('div', { class: 'ha-detail-card' }, [el('p', { class: 'ha-empty', text: 'Organ not found in this dataset.' })]);
  }
  const system = data.systems.find((s) => s.id === organ.system);
  const functionsList = el('ul', { class: 'ha-plain' },
    (organ.functions || []).map(fn => el('li', {}, [
      el('span', { class: 'ha-function-text', text: fn }),
      renderEvidenceBadge(organ.id, fn, data.referencesById)
    ])));
  const connections = (organ.connections || []).join(', ');
  const refs = referencesFor(organ, data.referencesById);

  const clearBtn = el('button', { type: 'button', class: 'ha-back', text: '✕ Clear selection' });
  clearBtn.addEventListener('click', callbacks.onClearSelection);

  return el('div', {}, [
    buildDiagramPanel(organ, system ? system.name : ''),
    el('div', { class: 'ha-detail-card' }, [
      clearBtn,
      el('div', { class: 'ha-draft-banner', text: 'DRAFT — general reference only, not per-fact verified, not medical advice. Consult a qualified healthcare professional.' }),
      el('h2', { text: organ.name }),
      el('div', { class: 'ha-meta' }, [
        el('span', { class: 'ha-swatch', style: `background:${system ? system.color : '#888'}` }),
        document.createTextNode(system ? ` ${system.name} system` : '')
      ]),
      el('div', { class: 'ha-section-label', text: 'Functions' }),
      functionsList,
      connections ? el('div', { class: 'ha-meta', text: `Connects with: ${connections}` }) : null,
      renderReferences(refs)
    ])
  ]);
}

/* ---------- System list column ---------- */
function buildSectionsColumn(state, data, callbacks) {
  const term = state.searchTerm;
  const searching = !!term.trim();

  const searchInput = el('input', { type: 'text', class: 'ha-search-input', placeholder: 'Search body parts…', value: term });
  searchInput.addEventListener('input', (e) => callbacks.onSearch(e.target.value));
  const searchBox = el('div', { class: 'ha-search-box' }, [searchInput]);

  const sections = data.systems.map((sys) => {
    const items = organsForSystem(data.organs, sys.id).filter((o) => matchesOrganSearch(o, term));
    const mainItems = items.filter((o) => o.role === 'main');
    const suppItems = items.filter((o) => o.role !== 'main');
    const isOpen = searching || state.openSections.has(sys.id);

    function organRow(organ) {
      const isSelected = state.selectedOrganId === organ.id;
      const btn = el('button', { type: 'button', class: `ha-bs-row${isSelected ? ' ha-bs-row-active' : ''}` }, [
        el('span', { class: `ha-role-dot ${organ.role === 'main' ? 'ha-role-main' : 'ha-role-supportive'}` }),
        document.createTextNode(organ.name)
      ]);
      btn.addEventListener('click', () => callbacks.onSelectOrgan(organ.id));
      return btn;
    }

    const headBtn = el('button', { type: 'button', class: 'ha-bs-section-head' }, [
      el('span', { class: `ha-bs-chevron${isOpen ? ' ha-bs-chevron-open' : ''}`, text: '▾' }),
      el('span', { class: 'ha-swatch', style: `background:${sys.color}` }),
      document.createTextNode(sys.name),
      el('span', { class: 'ha-pill', text: String(items.length) })
    ]);
    headBtn.addEventListener('click', () => callbacks.onToggleSection(sys.id));

    const bodyChildren = [];
    if (isOpen) {
      bodyChildren.push(el('div', { class: 'ha-bs-subhead' }, [el('span', { class: 'ha-role-dot ha-role-main' }), document.createTextNode('Main Organs')]));
      bodyChildren.push(mainItems.length
        ? el('div', { class: 'ha-bs-row-list' }, mainItems.map(organRow))
        : el('div', { class: 'ha-bs-row-empty', text: 'None yet.' }));
      bodyChildren.push(el('div', { class: 'ha-bs-subhead' }, [el('span', { class: 'ha-role-dot ha-role-supportive' }), document.createTextNode('Supportive / Associated')]));
      bodyChildren.push(suppItems.length
        ? el('div', { class: 'ha-bs-row-list' }, suppItems.map(organRow))
        : el('div', { class: 'ha-bs-row-empty', text: 'None yet.' }));
    }

    return el('div', { class: `ha-bs-section${isOpen ? ' ha-bs-section-open' : ''}` }, [headBtn, el('div', { class: 'ha-bs-section-body' }, bodyChildren)]);
  });

  return el('div', { class: 'ha-bs-col' }, [searchBox, ...sections]);
}

/* ---------- Root ---------- */
function buildBodySystemsScreen(state, data, callbacks) {
  return el('div', { class: 'ha-bs-3col' }, [
    buildSectionsColumn(state, data, callbacks),
    buildWheel(state, data, callbacks),
    buildDetailColumn(state, data, callbacks)
  ]);
}

export function mountHealthAtlas(container, rawData) {
  const referencesById = rawData.references;
  const data = {
    systems: listSystems(rawData.systems),
    organs: rawData.organs,
    referencesById
  };

  const state = {
    openSections: new Set(),
    searchTerm: '',
    wheelLevel: 'systems',
    wheelActiveSystem: null,
    selectedOrganId: null
  };

  function draw() {
    container.textContent = '';
    container.appendChild(el('div', {
      class: 'ha-draft-banner',
      text: 'DRAFT — general reference dataset for internal review only. Not per-fact verified. Not medical advice. Read-only: nothing on this page can be added, edited, deleted or reordered yet.'
    }));
    container.appendChild(buildBodySystemsScreen(state, data, callbacks));
  }

  const callbacks = {
    onSearch(value) {
      state.searchTerm = value;
      draw();
      // Re-focus the search box after redraw so typing isn't interrupted —
      // the same reason this codebase's other re-render-on-every-keystroke
      // screens do this (a full redraw would otherwise steal focus on
      // every character).
      const input = container.querySelector('.ha-search-input');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    },
    onToggleSection(sysId) {
      if (state.openSections.has(sysId)) state.openSections.delete(sysId);
      else state.openSections.add(sysId);
      draw();
    },
    onSelectSystem(sysId) {
      state.wheelActiveSystem = sysId;
      state.wheelLevel = 'items';
      state.openSections.add(sysId);
      draw();
    },
    onSelectOrgan(organId) {
      const organ = getOrgan(data.organs, organId);
      state.selectedOrganId = organId;
      if (organ) {
        state.wheelActiveSystem = organ.system;
        state.wheelLevel = 'items';
        state.openSections.add(organ.system);
      }
      draw();
    },
    onWheelBack() {
      state.wheelLevel = 'systems';
      state.wheelActiveSystem = null;
      draw();
    },
    onClearSelection() {
      state.selectedOrganId = null;
      draw();
    }
  };

  draw();
  return { redraw: draw };
}

// Exported for organCountsBySystem's continued use elsewhere/tests without
// this module needing to re-implement it.
export { organCountsBySystem };
