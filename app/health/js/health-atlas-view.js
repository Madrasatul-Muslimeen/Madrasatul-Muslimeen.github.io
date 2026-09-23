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
//
// PARITY TRANCHE 7 (see docs/reports/2026-09-21-health-atlas-body-systems-
// parity-tranche7.md): two changes, both read-only.
//   (1) Corrected an unsupported claim tranche 6 shipped in
//       buildDiagramPanel()'s placeholder — it asserted the un-diagrammed
//       systems' text connections "are accurate", which no part of this
//       app's evidence-provenance model backs (every function statement is
//       `general-reference-only`, never verified per-fact). Reworded to
//       point at that same text without asserting its accuracy.
//   (2) Ported the source's column drag-resize (`.bs-divider` / two-way
//       COL_WIDTHS-style state, same mousedown/mousemove/mouseup shape) for
//       the sections and detail columns, plus a keyboard-operable variant
//       (ArrowLeft/ArrowRight) as an accessibility addition beyond the
//       source's pointer-only divider — the same kind of addition the
//       wheel wedges already carry. The middle (wheel) column stays
//       flexible, as in the source.
//
// PARITY TRANCHE 9 (see docs/reports/2026-09-21-health-atlas-references-
// index-tranche9.md): a References index, one new top-level view mode
// alongside Body Systems (a small two-tab bar; the source's own References
// tab is a flat id/name/url table with no organ links at all — see that
// report's Gate A for why this tranche goes beyond the source there). Each
// of the 8 HEALTH_ATLAS_REFERENCES rows lists the organs whose own .refs[]
// names it (organsForReference(), the reverse of the existing
// referencesFor()) — NOT a new field, the same .refs array the detail
// column's "General references" block already reads. An organ pill is a
// REAL link into the existing organ detail column (switches back to Body
// Systems and calls the same onSelectOrgan() path the sections list and
// the wheel already use) rather than a dead reference, since the app has
// no URL-addressable per-organ route to link to instead (Gate A finding).
// Explicitly NOT a claim that a listed reference backs any one function
// statement individually — every statement's own evidence badge already
// makes that distinction (health-atlas-claims.js), and this index changes
// none of them; the index note says so in words. One reference (USDA
// FoodData Central) genuinely lists no organ in this dataset — a real
// case, not a hypothetical, so the "no organ" branch below has real
// coverage.

import {
  listSystems,
  organsForSystem,
  getOrgan,
  referencesFor,
  organCountsBySystem,
  matchesOrganSearch,
  organsForReference
} from './health-atlas-selectors.js';
import {
  EVIDENCE_STATUS,
  evidenceStatusFor,
  referenceIdFor
} from './health-atlas-claims.js';
import { diagramForSystem } from './health-atlas-diagrams.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Column drag-resize (parity tranche 7). Source-faithful: the v02.04
// standalone source keeps a mutable {s1, s3} width object and two
// `.bs-divider` strips either side of the (always-flexible) wheel column,
// adjusted on mousedown/mousemove/mouseup with the dragged edge's delta,
// clamped, and applied by writing an inline width directly to the DOM on
// every mousemove rather than going through a full re-render — see
// startColumnDrag() in the source's own script block. This port keeps that
// same shape (state object, same three DOM events, same "write the style
// directly during the drag, let state.colWidths flow through the next
// normal draw()") rather than re-deriving a different resize mechanism.
// Bounds are this app's own — the source's 240–640 range was tuned for its
// wider full-bleed layout, and applying it unchanged here would let either
// side column swallow the whole 3-column row on a laptop-width screen.
const COL_WIDTH_MIN = { s1: 200, s3: 220 };
const COL_WIDTH_MAX = { s1: 420, s3: 460 };
const COL_WIDTH_STEP = 20; // keyboard nudge, an accessibility addition the source's pointer-only divider does not have

function defaultColWidths() {
  return { s1: 260, s3: 300 };
}

function gridTemplateColumns(colWidths) {
  return `${colWidths.s1}px 10px minmax(240px, 1fr) 10px ${colWidths.s3}px`;
}

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
      el('div', { class: 'ha-empty', text: `Diagram for the ${systemName} system is still in progress — see the general-reference text below in the meantime.` })
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

/* ---------- Column divider (drag-to-resize, parity tranche 7) ---------- */
function applyColWidths(gridEl, colWidths) {
  gridEl.style.gridTemplateColumns = gridTemplateColumns(colWidths);
}

function startColumnDrag(e, which, colWidths, gridEl) {
  e.preventDefault();
  const startX = e.clientX;
  const startWidth = colWidths[which];

  function onMove(ev) {
    const deltaX = ev.clientX - startX;
    // Matches the source's own sign convention: dragging the LEFT divider
    // (s1, between the sections column and the wheel) right of its start
    // point widens the sections column; dragging the RIGHT divider (s3,
    // between the wheel and the detail column) right of its start point
    // NARROWS the detail column, since it is being pulled away from it.
    let newWidth = which === 's1' ? startWidth + deltaX : startWidth - deltaX;
    newWidth = Math.max(COL_WIDTH_MIN[which], Math.min(COL_WIDTH_MAX[which], newWidth));
    colWidths[which] = newWidth;
    applyColWidths(gridEl, colWidths);
  }
  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function buildDivider(which, colWidths, getGridEl) {
  const label = which === 's1' ? 'Resize the body-system list column' : 'Resize the detail column';
  const divider = el('div', {
    class: 'ha-bs-divider',
    title: 'Drag to resize',
    tabindex: '0',
    role: 'separator',
    'aria-orientation': 'vertical',
    'aria-label': label
  });
  divider.addEventListener('mousedown', (e) => startColumnDrag(e, which, colWidths, getGridEl()));
  // Keyboard resize is an accessibility addition beyond the source, which
  // only ever offers a pointer-driven divider — same reasoning as the
  // wheel wedges' own tabindex/Enter/Space handling above.
  divider.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const sign = e.key === 'ArrowRight' ? 1 : -1;
    const dir = which === 's1' ? sign : -sign;
    let newWidth = colWidths[which] + dir * COL_WIDTH_STEP;
    newWidth = Math.max(COL_WIDTH_MIN[which], Math.min(COL_WIDTH_MAX[which], newWidth));
    colWidths[which] = newWidth;
    applyColWidths(getGridEl(), colWidths);
  });
  return divider;
}

/* ---------- Root ---------- */
function buildBodySystemsScreen(state, data, callbacks) {
  const grid = el('div', { class: 'ha-bs-3col', style: `grid-template-columns:${gridTemplateColumns(state.colWidths)}` }, []);
  const getGrid = () => grid;
  grid.appendChild(buildSectionsColumn(state, data, callbacks));
  grid.appendChild(buildDivider('s1', state.colWidths, getGrid));
  grid.appendChild(buildWheel(state, data, callbacks));
  grid.appendChild(buildDivider('s3', state.colWidths, getGrid));
  grid.appendChild(buildDetailColumn(state, data, callbacks));
  return grid;
}

/* ---------- View tabs + References index (parity tranche 9) ---------- */
const VIEW_TABS = [
  { id: 'bodysystems', label: 'Body Systems' },
  { id: 'references', label: 'References' }
];

// Parity tranche 10 (issue #115 Gate A/B): these two buttons switch between
// two whole, unrelated screens (Body Systems' 3-column layout vs. the
// References table) rather than showing/hiding panels of one shared view,
// so they are NOT the WAI-ARIA Tabs pattern's "tab" role — that pattern
// requires each tab to own an associated role="tabpanel" reachable via
// aria-controls, plus Left/Right/Home/End arrow-key operation on the
// tablist, none of which tranche 9 built (see the dated report for the
// reproduced failure). Ordinary buttons need none of that: a native
// <button> is already in the normal Tab order and already activates on
// both Enter and Space, so this is the WAI-ARIA "toggle button" pattern
// instead — aria-pressed is the correct state attribute, not aria-selected,
// and the group is a plain accessibly-named role="group", not a tablist.
function buildViewTabs(state, callbacks) {
  const buttons = VIEW_TABS.map((tab) => {
    const active = state.viewMode === tab.id;
    const btn = el('button', {
      type: 'button',
      class: `ha-view-tab${active ? ' ha-view-tab-active' : ''}`,
      'aria-pressed': active ? 'true' : 'false',
      text: tab.label
    });
    btn.addEventListener('click', () => callbacks.onSwitchView(tab.id));
    return btn;
  });
  return el('div', { class: 'ha-view-tabs', role: 'group', 'aria-label': 'Health Atlas view' }, buttons);
}

function buildReferencesScreen(data, callbacks) {
  const rows = Object.entries(data.referencesById).map(([id, ref]) => {
    const organs = organsForReference(data.organs, id);
    const organsCell = organs.length
      ? el('ul', { class: 'ha-ref-organ-list' }, organs.map((organ) => {
          const btn = el('button', { type: 'button', class: 'ha-ref-organ-link', text: organ.name });
          btn.addEventListener('click', () => callbacks.onOpenOrganFromReferences(organ.id));
          return el('li', {}, [btn]);
        }))
      : el('span', { class: 'ha-ref-none', text: 'No organ in this dataset names this reference directly' });

    return el('tr', {}, [
      el('td', { class: 'ha-ref-id', text: id }),
      el('td', {}, [el('a', { class: 'ha-ref-link', href: ref.url, target: '_blank', rel: 'noopener', text: ref.name })]),
      el('td', {}, [organsCell])
    ]);
  });

  const table = el('table', { class: 'ha-refs-table' }, [
    el('thead', {}, [el('tr', {}, [
      el('th', { text: 'Ref' }),
      el('th', { text: 'Source' }),
      el('th', { text: 'Organs in this dataset that cite it' })
    ])]),
    el('tbody', {}, rows)
  ]);

  return el('div', { class: 'ha-refs-index' }, [
    el('p', { class: 'ha-refs-index-note', text: 'General public-health references this dataset’s organ material draws from. A reference listed for an organ backs that organ’s material in general, not any one function statement individually — open an organ and see its own evidence badge for that distinction. None of the 82 function statements in this dataset is verified against a specific source here.' }),
    table
  ]);
}

/* ---------- Root screen dispatch ---------- */
function buildScreen(state, data, callbacks) {
  if (state.viewMode === 'references') return buildReferencesScreen(data, callbacks);
  return buildBodySystemsScreen(state, data, callbacks);
}

export function mountHealthAtlas(container, rawData) {
  const referencesById = rawData.references;
  const data = {
    systems: listSystems(rawData.systems),
    organs: rawData.organs,
    referencesById
  };

  const state = {
    viewMode: 'bodysystems',
    openSections: new Set(),
    searchTerm: '',
    wheelLevel: 'systems',
    wheelActiveSystem: null,
    selectedOrganId: null,
    colWidths: defaultColWidths()
  };

  function selectOrgan(organId) {
    const organ = getOrgan(data.organs, organId);
    state.selectedOrganId = organId;
    if (organ) {
      state.wheelActiveSystem = organ.system;
      state.wheelLevel = 'items';
      state.openSections.add(organ.system);
    }
  }

  function draw() {
    container.textContent = '';
    container.appendChild(el('div', {
      class: 'ha-draft-banner',
      text: 'DRAFT — general reference dataset for internal review only. Not per-fact verified. Not medical advice. Read-only: nothing on this page can be added, edited, deleted or reordered yet.'
    }));
    container.appendChild(buildViewTabs(state, callbacks));
    container.appendChild(buildScreen(state, data, callbacks));
  }

  const callbacks = {
    onSwitchView(mode) {
      state.viewMode = VIEW_TABS.some((t) => t.id === mode) ? mode : state.viewMode;
      draw();
    },
    onOpenOrganFromReferences(organId) {
      selectOrgan(organId);
      state.viewMode = 'bodysystems';
      draw();
    },
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
      selectOrgan(organId);
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
