// Health Atlas — tranche 3: a read-only Foods / Diseases / Age Groups
// browser, the next bounded slice after the foundation Body Systems
// browser and the claim-provenance badges.
//
// DELIBERATE SCOPE BOUNDARY: this view only ever reads
//   food.id/.name/.category/.refs, and organ NAMES via organNamesFor()
//   (NEVER food.organs directly — see health-atlas-more-selectors.js for
//   why some of its entries embed a dose recommendation)
//   disease.id/.name/.cause/.symptoms/.organAffected/.refs
//   ageGroup.id/.name/.range
// It never reads food.nutrition, food.servingQty, disease.remedies,
// disease.homeRemedies, disease.naturalRemedies or ageGroup.notes, and it
// never imports or touches HEALTH_ATLAS_LIFESTYLES at all. See
// health-atlas-more-selectors.js for the full reasoning. The boundary is
// asserted mechanically by tools/health-atlas-verify/view-boundary-more.mjs,
// which reads this file's own source text — do not import those fields, or
// the Lifestyles dataset, without updating that check first.
//
// Every displayed food/disease/age-group entry also carries the same DRAFT
// / "not medical advice" notice the foundation tranche uses, and the same
// general-references block (via the existing, generic referencesFor()).
//
// SEARCH (parity tranche 11, additive). Foods and Conditions each gain a
// text filter, matching the source app's own per-tab search boxes and
// reusing health-atlas.html's existing `.ha-search-box`/`.ha-search-input`
// classes verbatim (copied into this page's own stylesheet). Filtering
// goes through matchesFoodSearch/matchesDiseaseSearch, which are scoped to
// the same safe fields this view already renders — see the boundary
// comment in health-atlas-more-selectors.js for why the source's own
// whole-object `matches()` is deliberately not replicated. Age Groups gets
// no search box, matching the source (it has none there either). The
// search box is part of the LIST state only, same as the tab bar — it
// disappears behind an open detail card and reappears on "back", and the
// typed term is preserved across that round trip because it lives in this
// closure's own state, not reset by view code.

import {
  listFoodCategories,
  foodsByCategory,
  getFood,
  organNamesFor,
  listDiseases,
  getDisease,
  listAgeGroups,
  getAgeGroup,
  matchesFoodSearch,
  matchesDiseaseSearch
} from './health-atlas-more-selectors.js';
import { referencesFor } from './health-atlas-selectors.js';

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

function plainList(items, className) {
  if (!items || !items.length) return null;
  return el('ul', { class: className || 'ha-plain' }, items.map(t => el('li', { text: t })));
}

function searchBox(placeholder, term, onSearch) {
  const input = el('input', { type: 'text', class: 'ha-search-input', placeholder, value: term });
  input.addEventListener('input', (e) => onSearch(e.target.value));
  return el('div', { class: 'ha-search-box' }, [input]);
}

function tabBar(tabs, activeId, onSelect) {
  const bar = el('div', { class: 'ha-tabbar' });
  for (const tab of tabs) {
    const btn = el('button', {
      class: 'ha-tab' + (tab.id === activeId ? ' ha-tab-active' : ''),
      type: 'button',
      text: tab.label
    });
    btn.addEventListener('click', () => onSelect(tab.id));
    bar.appendChild(btn);
  }
  return bar;
}

// ---- Foods ----

function renderFoodDetail(data, foodId, onBack) {
  const food = getFood(data.foods, foodId);
  if (!food) return el('p', { class: 'ha-empty', text: 'Food not found in this dataset.' });
  const organs = plainList(organNamesFor(food), 'ha-plain');
  const refs = referencesFor(food, data.referencesById);
  const back = el('button', { class: 'ha-back', type: 'button', text: '← All foods' });
  back.addEventListener('click', onBack);
  return el('div', { class: 'ha-detail-card' }, [
    back,
    draftBanner(),
    el('h2', { text: food.name }),
    el('div', { class: 'ha-meta', text: `Category: ${food.category}` }),
    organs ? el('div', {}, [el('div', { class: 'ha-section-label', text: 'Organs it relates to' }), organs]) : null,
    renderReferences(refs)
  ]);
}

function renderFoodList(data, term, onSearch, onOpenFood) {
  const categories = listFoodCategories(data.foods);
  const blocks = categories.map(cat => {
    const items = foodsByCategory(data.foods, cat).filter(f => matchesFoodSearch(f, term));
    if (!items.length) return null;
    const heading = el('div', { class: 'ha-system-head' }, [
      el('span', { class: 'ha-system-name', text: cat }),
      el('span', { class: 'ha-system-count', text: `${items.length} item${items.length === 1 ? '' : 's'}` })
    ]);
    const buttons = items.map(food => {
      const btn = el('button', { class: 'ha-organ-btn', type: 'button', text: food.name });
      btn.addEventListener('click', () => onOpenFood(food.id));
      return el('li', {}, [btn]);
    });
    return el('section', { class: 'ha-system-block' }, [heading, el('ul', { class: 'ha-organ-list' }, buttons)]);
  }).filter(Boolean);
  const empty = !blocks.length
    ? el('p', { class: 'ha-empty', text: 'No matches. Try a different search.' })
    : null;
  return el('div', { class: 'ha-system-list' }, [
    searchBox('Search foods…', term, onSearch),
    el('p', { class: 'ha-intro', text: 'Grouped by category. Amounts and serving guidance are deliberately not shown here — see the tranche report.' }),
    empty,
    ...blocks
  ]);
}

// ---- Diseases ----

function renderDiseaseDetail(data, diseaseId, onBack) {
  const disease = getDisease(data.diseases, diseaseId);
  if (!disease) return el('p', { class: 'ha-empty', text: 'Condition not found in this dataset.' });
  const organs = (disease.organAffected || []).join(', ');
  const refs = referencesFor(disease, data.referencesById);
  const back = el('button', { class: 'ha-back', type: 'button', text: '← All conditions' });
  back.addEventListener('click', onBack);
  return el('div', { class: 'ha-detail-card' }, [
    back,
    draftBanner(),
    el('h2', { text: disease.name }),
    organs ? el('div', { class: 'ha-meta', text: `Organs affected: ${organs}` }) : null,
    el('div', { class: 'ha-section-label', text: 'Commonly associated with' }),
    plainList(disease.cause),
    el('div', { class: 'ha-section-label', text: 'Symptoms sometimes reported' }),
    plainList(disease.symptoms),
    el('p', { class: 'ha-intro', text: 'Diagnosis and treatment-related content are deliberately not shown here — see a qualified healthcare professional and the tranche report.' }),
    renderReferences(refs)
  ]);
}

function renderDiseaseList(data, term, onSearch, onOpenDisease) {
  const matched = listDiseases(data.diseases).filter(d => matchesDiseaseSearch(d, term));
  const items = matched.map(d => {
    const btn = el('button', { class: 'ha-organ-btn', type: 'button', text: d.name });
    btn.addEventListener('click', () => onOpenDisease(d.id));
    return el('li', {}, [btn]);
  });
  const empty = !matched.length
    ? el('p', { class: 'ha-empty', text: 'No matches. Try a different search.' })
    : null;
  return el('div', {}, [
    searchBox('Search conditions…', term, onSearch),
    el('p', { class: 'ha-intro', text: 'Cause and symptom information only. Treatment-related and dosage content is deliberately not shown here.' }),
    empty,
    el('ul', { class: 'ha-organ-list' }, items)
  ]);
}

// ---- Age Groups ----

function renderAgeGroupDetail(data, ageId, onBack) {
  const age = getAgeGroup(data.ages, ageId);
  if (!age) return el('p', { class: 'ha-empty', text: 'Age group not found in this dataset.' });
  const back = el('button', { class: 'ha-back', type: 'button', text: '← All age groups' });
  back.addEventListener('click', onBack);
  return el('div', { class: 'ha-detail-card' }, [
    back,
    draftBanner(),
    el('h2', { text: age.name }),
    el('div', { class: 'ha-meta', text: `Range: ${age.range}` }),
    el('p', { class: 'ha-intro', text: 'Nutrition guidance for this age group is deliberately not shown here — see the tranche report.' })
  ]);
}

function renderAgeGroupList(data, onOpenAge) {
  const items = listAgeGroups(data.ages).map(a => {
    const btn = el('button', { class: 'ha-organ-btn', type: 'button', text: `${a.name} (${a.range})` });
    btn.addEventListener('click', () => onOpenAge(a.id));
    return el('li', {}, [btn]);
  });
  return el('div', {}, [el('ul', { class: 'ha-organ-list' }, items)]);
}

export function mountHealthAtlasMore(container, rawData) {
  const referencesById = rawData.references;
  const data = {
    foods: rawData.foods,
    diseases: rawData.diseases,
    ages: rawData.ages,
    referencesById
  };

  const tabs = [
    { id: 'foods', label: 'Foods' },
    { id: 'diseases', label: 'Conditions' },
    { id: 'ages', label: 'Age Groups' }
  ];

  let activeTab = 'foods';
  let openDetailId = null;
  // Independent per tab, not reset on tab switch or on opening/closing a
  // detail card — same persistence the source app's own SEARCH_TERM object
  // gives each tab.
  const searchTerm = { foods: '', diseases: '' };

  function onSearch(term) {
    return value => {
      searchTerm[term] = value;
      draw();
      // Re-focus after the full redraw so typing isn't interrupted — the
      // same reason health-atlas-view.js's own organ search does this.
      const input = container.querySelector('.ha-search-input');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    };
  }

  function draw() {
    container.textContent = '';
    container.appendChild(tabBar(tabs, activeTab, id => {
      activeTab = id;
      openDetailId = null;
      draw();
    }));

    if (activeTab === 'foods') {
      container.appendChild(openDetailId
        ? renderFoodDetail(data, openDetailId, () => { openDetailId = null; draw(); })
        : renderFoodList(data, searchTerm.foods, onSearch('foods'), id => { openDetailId = id; draw(); }));
    } else if (activeTab === 'diseases') {
      container.appendChild(openDetailId
        ? renderDiseaseDetail(data, openDetailId, () => { openDetailId = null; draw(); })
        : renderDiseaseList(data, searchTerm.diseases, onSearch('diseases'), id => { openDetailId = id; draw(); }));
    } else {
      container.appendChild(openDetailId
        ? renderAgeGroupDetail(data, openDetailId, () => { openDetailId = null; draw(); })
        : renderAgeGroupList(data, id => { openDetailId = id; draw(); }));
    }
  }

  draw();
  return { redraw: draw };
}
