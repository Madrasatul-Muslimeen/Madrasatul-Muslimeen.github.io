// Health Atlas — body-system diagram data (parity tranche 6, additive).
//
// WHAT THIS FILE IS. Three hand-drawn SVG diagrams — Renal & Urinary,
// Sensory, and Integumentary — ported VERBATIM (same shapes, same
// coordinates, same labels) from the verified v02.04 standalone source
// (`docs/health-source/health-atlas-v02.04-standalone.html`, commit
// `ed4dbb2e535ba6b95ea286a5f3b29a32122ea4b9`; see app/health/README.md for
// the full provenance record). The source ships exactly these three
// diagrams and a plain "diagram in progress" notice for the other six
// systems — this file preserves that same 3-built / 6-not-yet-built split
// rather than inventing diagrams the source never had.
//
// WHY THIS IS SAFE TO SHOW. A diagram here is a generic anatomical
// structure drawing (kidneys, an eye, a skin cross-section) with plain
// anatomical labels (e.g. "Bladder", "Epidermis"). It carries no nutrition
// figure, no dose, no remedy and no per-organ additive claim of any kind —
// nothing in this file needs the accuracy pass the organ nutrition/food/
// activity/deterioration fields and the disease remedy fields still need.
// tools/health-atlas-verify/view-boundary-wheel.mjs asserts this file's own
// source text carries none of those forbidden fields, the same "read the
// module's own source" pattern the rest of this tranche's boundary guards
// use.
//
// SHAPE. Exported as plain data — a system id maps to { viewBox, shapes,
// caption, partMap }. `shapes` is a plain array of { tag, attrs, text? }
// descriptors rather than a pre-built SVG string, so the view module can
// construct real SVG DOM nodes (createElementNS + setAttribute) instead of
// parsing markup or using innerHTML — this codebase's view layer has never
// used innerHTML anywhere, and this file does not start that pattern.
//
// NO IMPORTS — pure data, independently auditable, loadable by
// tools/health-atlas-verify/import-esm-file.mjs's data: URL technique the
// same way health-atlas-claims.js and health-atlas-selectors.js already are.

export const HEALTH_ATLAS_DIAGRAMS = Object.freeze({
  renal: Object.freeze({
    viewBox: '0 0 300 340',
    caption: 'Renal & Urinary — showing',
    shapes: Object.freeze([
      { tag: 'path', attrs: { d: 'M100,40 C70,40 55,65 55,95 C55,115 65,120 65,140 C65,165 85,180 105,175 C125,170 130,150 125,130 C120,110 130,95 125,75 C120,50 115,40 100,40 Z', fill: '#3E7CA6', opacity: '0.85' }, id: 'kidney-shape' },
      { tag: 'path', attrs: { d: 'M200,40 C230,40 245,65 245,95 C245,115 235,120 235,140 C235,165 215,180 195,175 C175,170 170,150 175,130 C180,110 170,95 175,75 C180,50 185,40 200,40 Z', fill: '#3E7CA6', opacity: '0.85' }, id: 'kidney-shape' },
      { tag: 'path', attrs: { d: 'M55,105 L28,95 M55,115 L28,125', stroke: '#B5484B', 'stroke-width': '3', fill: 'none' }, id: 'renal-vessels' },
      { tag: 'path', attrs: { d: 'M245,105 L272,95 M245,115 L272,125', stroke: '#B5484B', 'stroke-width': '3', fill: 'none' }, id: 'renal-vessels' },
      { tag: 'path', attrs: { d: 'M90,175 C95,210 130,230 150,245', stroke: '#B9B2A0', 'stroke-width': '4', fill: 'none' }, id: 'ureter-line' },
      { tag: 'path', attrs: { d: 'M210,175 C205,210 170,230 150,245', stroke: '#B9B2A0', 'stroke-width': '4', fill: 'none' }, id: 'ureter-line' },
      { tag: 'ellipse', attrs: { cx: '150', cy: '278', rx: '42', ry: '34', fill: '#3E7CA6', opacity: '0.85' }, id: 'bladder-shape' },
      { tag: 'line', attrs: { x1: '150', y1: '312', x2: '150', y2: '332', stroke: '#B9B2A0', 'stroke-width': '5' }, id: 'urethra-line' },
      { tag: 'text', attrs: { x: '60', y: '30', 'font-size': '11', fill: '#B9B2A0' }, text: 'Kidneys' },
      { tag: 'text', attrs: { x: '8', y: '90', 'font-size': '10', fill: '#B9B2A0' }, text: 'Renal vessels' },
      { tag: 'text', attrs: { x: '110', y: '218', 'font-size': '11', fill: '#B9B2A0' }, text: 'Ureters' },
      { tag: 'text', attrs: { x: '120', y: '282', 'font-size': '11', fill: '#EDE6D6' }, text: 'Bladder' },
      { tag: 'text', attrs: { x: '158', y: '325', 'font-size': '10', fill: '#B9B2A0' }, text: 'Urethra' }
    ]),
    partMap: Object.freeze({ Kidneys: 'kidney-shape', Bladder: 'bladder-shape', Ureters: 'ureter-line', Urethra: 'urethra-line', 'Renal Blood Vessels': 'renal-vessels' })
  }),
  sensory: Object.freeze({
    viewBox: '0 0 340 260',
    caption: 'Sensory — showing',
    shapes: Object.freeze([
      { tag: 'path', attrs: { d: 'M40,120 C70,90 150,90 180,120 C150,150 70,150 40,120 Z', fill: '#C97B3E', opacity: '0.25', stroke: '#C97B3E', 'stroke-width': '2' }, id: 'eye-main' },
      { tag: 'circle', attrs: { cx: '110', cy: '120', r: '22', fill: '#C97B3E' }, id: 'eye-main' },
      { tag: 'circle', attrs: { cx: '110', cy: '120', r: '9', fill: '#161B22' }, id: 'eye-main' },
      { tag: 'path', attrs: { d: 'M180,120 C210,120 220,110 240,100', stroke: '#6E5AA6', 'stroke-width': '4', fill: 'none' }, id: 'optic-nerve' },
      { tag: 'circle', attrs: { cx: '252', cy: '94', r: '16', fill: '#6E5AA6', opacity: '0.5' } },
      { tag: 'text', attrs: { x: '252', y: '98', 'text-anchor': 'middle', 'font-size': '9', fill: '#EDE6D6' }, text: 'Brain' },
      { tag: 'path', attrs: { d: 'M45,190 C22,178 20,212 42,224 C58,232 64,212 58,200 C53,191 50,192 45,190 Z', fill: '#C97B3E', opacity: '0.6' }, id: 'ear-shape' },
      { tag: 'path', attrs: { d: 'M150,188 C145,204 140,215 148,226 C156,232 168,232 176,226 C184,215 179,204 174,188', stroke: '#C97B3E', 'stroke-width': '3', fill: 'none' }, id: 'nose-shape' },
      { tag: 'text', attrs: { x: '60', y: '95', 'font-size': '11', fill: '#B9B2A0' }, text: 'Eye' },
      { tag: 'text', attrs: { x: '20', y: '240', 'font-size': '10', fill: '#B9B2A0' }, text: 'Ear' },
      { tag: 'text', attrs: { x: '145', y: '245', 'font-size': '10', fill: '#B9B2A0' }, text: 'Nose' }
    ]),
    partMap: Object.freeze({ Eyes: 'eye-main', Ears: 'ear-shape', 'Optic Nerve': 'optic-nerve', 'Olfactory System (Nose)': 'nose-shape' })
  }),
  integument: Object.freeze({
    viewBox: '0 0 320 220',
    caption: 'Integumentary — showing',
    shapes: Object.freeze([
      { tag: 'rect', attrs: { x: '20', y: '20', width: '280', height: '35', fill: '#7A9E5E', opacity: '0.85' }, id: 'skin-layer-all' },
      { tag: 'rect', attrs: { x: '20', y: '55', width: '280', height: '70', fill: '#7A9E5E', opacity: '0.5' }, id: 'skin-layer-all' },
      { tag: 'rect', attrs: { x: '20', y: '125', width: '280', height: '60', fill: '#7A9E5E', opacity: '0.25' }, id: 'skin-layer-all' },
      { tag: 'text', attrs: { x: '28', y: '42', 'font-size': '10', fill: '#161B22' }, text: 'Epidermis' },
      { tag: 'text', attrs: { x: '28', y: '95', 'font-size': '10', fill: '#EDE6D6' }, text: 'Dermis' },
      { tag: 'text', attrs: { x: '28', y: '160', 'font-size': '10', fill: '#EDE6D6' }, text: 'Hypodermis' },
      { tag: 'path', attrs: { d: 'M170,10 L164,55 C158,72 158,100 170,112', stroke: '#EDE6D6', 'stroke-width': '3', fill: 'none' }, id: 'hair-follicle' },
      { tag: 'ellipse', attrs: { cx: '184', cy: '68', rx: '10', ry: '7', fill: '#C9A24B' }, id: 'sebaceous-gland' },
      { tag: 'path', attrs: { d: 'M230,130 C236,140 224,145 230,155 C236,165 224,170 230,182', stroke: '#EDE6D6', 'stroke-width': '3', fill: 'none' }, id: 'sweat-gland' },
      { tag: 'text', attrs: { x: '180', y: '30', 'font-size': '9', fill: '#161B22' }, text: 'Hair follicle' },
      { tag: 'text', attrs: { x: '196', y: '64', 'font-size': '9', fill: '#EDE6D6' }, text: 'Sebaceous gland' },
      { tag: 'text', attrs: { x: '238', y: '148', 'font-size': '9', fill: '#EDE6D6' }, text: 'Sweat gland' }
    ]),
    partMap: Object.freeze({ Skin: 'skin-layer-all', 'Hair & Nails': 'hair-follicle', 'Sebaceous Glands': 'sebaceous-gland', 'Sweat Glands': 'sweat-gland' })
  })
});

/** Returns the diagram record for a system id, or null if that system has
 * no built diagram yet (the other six systems — this is the honest,
 * expected case, not an error, and the view renders a plain "in progress"
 * notice for it, matching the source's own behaviour). */
export function diagramForSystem(systemId) {
  return HEALTH_ATLAS_DIAGRAMS[systemId] || null;
}
