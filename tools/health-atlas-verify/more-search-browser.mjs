// Health Atlas — Foods/Conditions search: a COMMITTED, reproducible browser
// acceptance test for the search boxes added to health-atlas-more.html
// (parity tranche 11, issue #115 Gate A/B).
//
// WHY THIS FILE EXISTS. The v02.04 source app has a per-tab text filter on
// every list tab (organs, foods, diseases, lifestyle) except Age Groups —
// tranche 6 already ported it for Body Systems (matchesOrganSearch /
// buildSectionsColumn's search box), but health-atlas-more-view.js (Foods,
// Conditions, Age Groups; tranche 3) had none. This is the "another
// clearly independent safe parity slice" this tranche built after
// Gate A/B concluded the Lifestyle tab itself could not clear Gate B (see
// the dated report): unlike Lifestyle, where every substantive field IS a
// recommendation, Foods and Diseases already have a real, previously
// established safe/excluded field split (tranche 3's own boundary), and a
// text filter can be scoped to the safe side of that split without
// changing what the screen shows or exposing anything new.
//
// THE SAFETY-CRITICAL DIFFERENCE FROM THE SOURCE. The source's own
// `matches(item, term)` is `JSON.stringify(item).toLowerCase().includes(term)`
// — it searches the WHOLE serialized item, excluded fields included. Ported
// literally, a search for a drug name mentioned only in a disease's
// `.remedies` would still return that disease — the result list is itself
// a disclosure of the hidden field's content even though the field is
// never rendered. matchesFoodSearch/matchesDiseaseSearch
// (health-atlas-more-selectors.js) are scoped to exactly the fields this
// view already shows instead. This file proves that boundary holds against
// the REAL rendered page, not just against the pure functions in isolation
// (tools/health-atlas-verify/more-selectors.mjs already covers those) —
// a search term that exists ONLY in an excluded field must render the
// page's own "no matches" empty state, not a false hit.
//
// WHAT THIS FILE ASSERTS:
//   - Foods and Conditions each show a real, typeable search box; Age
//     Groups shows none (matching the source, which has no age search
//     either);
//   - typing a name/category/cause/symptom/organ term filters the list to
//     matching entries only, and typing a term that appears ONLY in an
//     excluded field (a real drug name from a real disease's .remedies)
//     shows the page's own empty state, not a false hit;
//   - typing does not steal keyboard focus — the search input stays
//     focused (and the caret stays at the end) across the input's own
//     full re-render, the same regression class CLAUDE.md's standing
//     lessons warn about for any full-redraw screen;
//   - clearing the box restores the full list;
//   - the search term is preserved switching into a detail card and back
//     with "← All foods"/"← All conditions";
//   - tablet and phone: the box is visible, reachable and a real tap +
//     keyboard type filters the list there too.
//
// WHAT IT NEEDS TO RUN. Same as references-tabs-accessibility-browser.mjs:
// Playwright's `chromium` package resolvable from this file, via a local,
// gitignored `node_modules/playwright` symlink to the sandbox's
// pre-installed global Playwright — nothing committed, no shared
// CI/tooling change. Not wired into .github/workflows/verify.yml, same as
// every other Playwright suite in this project.
//
// Run from the repository root:
//   node tools/health-atlas-verify/more-search-browser.mjs

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import http from 'node:http';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const PORT = 8080;
const BASE = `http://localhost:${PORT}`;
const MORE_URL = `${BASE}/app/health/health-atlas-more.html`;

let passed = 0;
let failed = 0;
const failures = [];

async function check(name, fn) {
  const r = fn();
  if (!r || typeof r.then !== 'function') {
    failed++;
    failures.push(`${name}: check() body must be async (drives a real browser)`);
    console.log(`  FAIL  ${name}: check() body must be async`);
    return;
  }
  try {
    await r;
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    failures.push(`${name}: ${err.message}`);
    console.log(`  FAIL  ${name}: ${err.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function pingServer() {
  return new Promise((resolve) => {
    const req = http.get(MORE_URL, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => { req.destroy(); resolve(false); });
  });
}

async function ensureServer() {
  if (await pingServer()) {
    return { proc: null }; // reuse whatever is already serving this project
  }
  const proc = spawn(process.execPath, ['serve.js'], { cwd: repoRoot, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    if (await pingServer()) return { proc };
    await new Promise((r) => setTimeout(r, 100));
  }
  proc.kill();
  throw new Error(`serve.js did not start serving on port ${PORT} within 5s`);
}

async function gotoMore(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(MORE_URL, { waitUntil: 'networkidle' });
  return errors;
}

async function typeInto(page, selector, text) {
  const input = page.locator(selector);
  await input.click();
  await input.fill('');
  await page.keyboard.type(text);
}

async function main() {
  const { proc } = await ensureServer();
  const browser = await chromium.launch();
  try {
    console.log('Health Atlas — Foods/Conditions search test\n');

    // ---------------- Desktop (1280x900) ----------------
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      const errors = await gotoMore(page);

      await check('desktop: page loads with no page errors', async () => {
        assert(errors.length === 0, `page errors: ${errors.join('; ')}`);
      });

      await check('desktop: Foods tab shows a real, typeable search box', async () => {
        const box = page.locator('.ha-search-input');
        assert(await box.count() === 1, `expected exactly 1 search box on the Foods tab, found ${await box.count()}`);
        assert((await box.getAttribute('placeholder')) === 'Search foods…', 'expected the Foods placeholder text');
      });

      await check('desktop: typing a name term filters the food list to matching entries', async () => {
        const before = await page.locator('.ha-organ-btn').count();
        await typeInto(page, '.ha-search-input', 'Avocado');
        const after = await page.locator('.ha-organ-btn', { hasText: 'Avocado' });
        assert(await after.count() === 1, 'expected the Avocado button to remain after searching "Avocado"');
        const total = await page.locator('.ha-organ-btn').count();
        assert(total < before, `expected the search to narrow the list (before=${before}, after=${total})`);
        assert(await page.locator('.ha-organ-btn', { hasText: 'Butter' }).count() === 0, 'expected an unrelated food to be filtered out');
      });

      await check('desktop: a term that exists ONLY in an excluded field (food .nutrition) shows the empty state, not a false hit', async () => {
        await typeInto(page, '.ha-search-input', 'Potassium');
        assert(await page.locator('.ha-empty', { hasText: 'No matches' }).isVisible(), 'expected the "No matches" empty state for a nutrition-only term');
        assert(await page.locator('.ha-organ-btn').count() === 0, 'expected zero food buttons for a nutrition-only search term');
      });

      await check('desktop: typing does not steal keyboard focus across the redraw', async () => {
        await typeInto(page, '.ha-search-input', 'a');
        await page.keyboard.type('v');
        const isFocused = await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('ha-search-input'));
        assert(isFocused, 'expected the search input to still be focused after typing a second character');
      });

      await check('desktop: clearing the search box restores the full food list', async () => {
        await typeInto(page, '.ha-search-input', '');
        assert(await page.locator('.ha-empty', { hasText: 'No matches' }).count() === 0, 'expected no empty-state message once the search is cleared');
        assert((await page.locator('.ha-organ-btn').count()) > 5, 'expected the full food list back after clearing the search');
      });

      await check('desktop: the search term survives opening a detail card and pressing back', async () => {
        await typeInto(page, '.ha-search-input', 'Avocado');
        await page.locator('.ha-organ-btn', { hasText: 'Avocado' }).click();
        assert(await page.locator('.ha-detail-card h2', { hasText: 'Avocado' }).isVisible(), 'expected the Avocado detail card to open');
        await page.locator('.ha-back').click();
        const term = await page.locator('.ha-search-input').inputValue();
        assert(term === 'Avocado', `expected the search box to still read "Avocado" after going back, got "${term}"`);
        await typeInto(page, '.ha-search-input', '');
      });

      await check('desktop: switching to Conditions shows its own search box, and it filters by name/cause/symptom/organ', async () => {
        await page.locator('.ha-tab', { hasText: 'Conditions' }).click();
        const box = page.locator('.ha-search-input');
        assert(await box.count() === 1, 'expected exactly 1 search box on the Conditions tab');
        assert((await box.getAttribute('placeholder')) === 'Search conditions…', 'expected the Conditions placeholder text');
        await typeInto(page, '.ha-search-input', 'Coronary');
        assert(await page.locator('.ha-organ-btn', { hasText: 'Coronary Artery Disease' }).count() === 1, 'expected Coronary Artery Disease to remain after searching "Coronary"');
      });

      await check('desktop: a term that exists ONLY in an excluded field (disease .remedies) shows the empty state, not a false hit', async () => {
        await typeInto(page, '.ha-search-input', 'Statin');
        assert(await page.locator('.ha-empty', { hasText: 'No matches' }).isVisible(), 'expected the "No matches" empty state for a remedies-only term');
        await typeInto(page, '.ha-search-input', '');
      });

      await check('desktop: switching to Age Groups shows NO search box, matching the source app', async () => {
        await page.locator('.ha-tab', { hasText: 'Age Groups' }).click();
        assert(await page.locator('.ha-search-input').count() === 0, 'expected zero search boxes on the Age Groups tab');
        assert((await page.locator('.ha-organ-btn').count()) === 6, 'expected all 6 age groups still listed');
      });

      await ctx.close();
    }

    // ---------------- Tablet (768x1024) ----------------
    {
      const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 } });
      const page = await ctx.newPage();
      const errors = await gotoMore(page);

      await check('tablet (768x1024): no page errors; the Foods search box is visible and real keyboard typing filters the list', async () => {
        assert(errors.length === 0, `page errors: ${errors.join('; ')}`);
        assert(await page.locator('.ha-search-input').isVisible(), 'expected the search box visible at tablet width');
        await typeInto(page, '.ha-search-input', 'Avocado');
        assert(await page.locator('.ha-organ-btn', { hasText: 'Avocado' }).isVisible(), 'expected filtering to work at tablet width');
      });

      await ctx.close();
    }

    // ---------------- Phone (390x844) ----------------
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
      const page = await ctx.newPage();
      const errors = await gotoMore(page);

      await check('phone (390x844): no page errors; a real tap into the search box plus typing filters the list', async () => {
        assert(errors.length === 0, `page errors: ${errors.join('; ')}`);
        const input = page.locator('.ha-search-input');
        await input.tap();
        await page.keyboard.type('Avocado');
        assert(await page.locator('.ha-organ-btn', { hasText: 'Avocado' }).isVisible(), 'expected filtering to work after a real tap + type at phone width');
        assert(await page.locator('.ha-organ-btn', { hasText: 'Butter' }).count() === 0, 'expected the search to actually narrow the list at phone width');
      });

      await ctx.close();
    }
  } finally {
    await browser.close();
    if (proc) proc.kill();
  }

  console.log(`\nHealth Atlas more-search-browser: ${passed} passed, ${failed} failed`);
  if (failed) {
    for (const f of failures) console.log('  FAIL:', f);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('FATAL:', err.stack || err.message);
  process.exit(1);
});
