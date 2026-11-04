// Health Atlas — tranche 4: a read-only Master Categories index, the next
// bounded slice after the foundation Body Systems browser (tranche 1) and
// the claim-provenance badges (tranche 2). Not stacked on tranche 3 (Foods/
// Conditions/Age Groups) — this module's only cross-dataset read is
// food.category, a field already present and already read unchanged since
// tranche 1's own data file, so no import from tranche 3's files is needed.
//
// DELIBERATE SCOPE BOUNDARY: this view only ever reads
//   category.id / .name / .subs
//   food.category (to count foods per sub-category label — see
//   health-atlas-categories-selectors.js for why this one cross-read is
//   safe: it is already an approved, already-displayed field)
// It never reads food.nutrition, food.servingQty, food.organs,
// disease.remedies, disease.homeRemedies, disease.naturalRemedies,
// ageGroup.notes, and it never imports or touches HEALTH_ATLAS_DISEASES,
// HEALTH_ATLAS_LIFESTYLES or HEALTH_ATLAS_AGES at all. The boundary is
// asserted mechanically by
// tools/health-atlas-verify/view-boundary-categories.mjs, which reads this
// file's own source text — do not import those fields or datasets without
// updating that check first.
//
// Every screen carries the same DRAFT / "not medical advice" notice the
// earlier tranches use.

import {
  listMasterCategories,
  getMasterCategory,
  foodCountForSub,
  totalFoodCountForCategory
} from './health-atlas-categories-selectors.js';

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

function draftBanner() {
  return el('div', {
    class: 'ha-draft-banner',
    text: 'DRAFT — general reference only, not per-fact verified, not medical advice. Consult a qualified healthcare professional.'
  });
}

function renderCategoryDetail(data, categoryId, onBack) {
  const category = getMasterCategory(data.categories, categoryId);
  if (!category) return el('p', { class: 'ha-empty', text: 'Category not found in this dataset.' });
  const subItems = category.subs.map(sub => {
    const count = foodCountForSub(data.foods, sub);
    return el('li', {}, [
      el('span', { class: 'ha-cat-sub-name', text: sub }),
      el('span', { class: 'ha-cat-sub-count', text: `${count} food item${count === 1 ? '' : 's'}` })
    ]);
  });
  const back = el('button', { class: 'ha-back', type: 'button', text: '← All categories' });
  back.addEventListener('click', onBack);
  return el('div', { class: 'ha-detail-card' }, [
    back,
    draftBanner(),
    el('h2', { text: category.name }),
    el('div', { class: 'ha-section-label', text: 'Sub-categories' }),
    el('ul', { class: 'ha-cat-sub-list' }, subItems),
    el('p', {
      class: 'ha-intro',
      text: 'Category and sub-category names only. Food items are grouped here by count; open the Foods browser for individual entries.'
    })
  ]);
}

function renderCategoryList(data, onOpenCategory) {
  const items = listMasterCategories(data.categories).map(category => {
    const total = totalFoodCountForCategory(data.foods, category);
    const btn = el('button', { class: 'ha-organ-btn', type: 'button', text: category.name });
    btn.addEventListener('click', () => onOpenCategory(category.id));
    return el('li', {}, [
      btn,
      el('span', { class: 'ha-cat-list-meta', text: `${category.subs.length} sub-categor${category.subs.length === 1 ? 'y' : 'ies'}, ${total} food item${total === 1 ? '' : 's'}` })
    ]);
  });
  return el('div', {}, [
    el('p', { class: 'ha-intro', text: 'The food master-category taxonomy this dataset groups foods under. Structural only — names and counts, nothing dose- or serving-related.' }),
    el('ul', { class: 'ha-cat-list' }, items)
  ]);
}

export function mountHealthAtlasCategories(container, rawData) {
  const data = {
    categories: rawData.categories,
    foods: rawData.foods
  };

  let openDetailId = null;

  function draw() {
    container.textContent = '';
    container.appendChild(openDetailId
      ? renderCategoryDetail(data, openDetailId, () => { openDetailId = null; draw(); })
      : renderCategoryList(data, id => { openDetailId = id; draw(); }));
  }

  draw();
  return { redraw: draw };
}
