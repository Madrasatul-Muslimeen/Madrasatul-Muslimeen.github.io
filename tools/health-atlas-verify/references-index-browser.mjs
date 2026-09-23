// Health Atlas — References index: a COMMITTED, reproducible browser
// acceptance test (parity tranche 9).
//
// UPDATED IN PLACE, tranche 10 (issue #115 Gate A/B): the view switcher's
// buttons no longer carry role="tab"/aria-selected — see
// health-atlas-view.js's buildViewTabs() and
// references-tabs-accessibility-browser.mjs for why (they are ordinary
// view-switch buttons, not panel-associated tabs, and tranche 9's
// role="tab" was incomplete ARIA that a keyboard/screen-reader user could
// not actually operate). Every assertion below that read aria-selected now
// reads aria-pressed instead; nothing else in this file changed.
//
// WHY THIS FILE EXISTS. Following the precedent
// body-systems-parity-browser.mjs set in tranche 8 (a "focused,
// un-checked-in Playwright script, deleted before commit" is real when it
// runs but not independently reproducible afterwards — the exact gap
// issue #115's original comment named), this new capability gets its own
// COMMITTED suite from day one rather than starting the same debt. Same
// shape: not wired into `.github/workflows/verify.yml` (that workflow
// already excludes this whole class — "need Playwright and a served
// app"), run directly instead.
//
// WHAT IT DOES. Drives real Chromium against `app/health/health-atlas.html`
// and asserts, by real rendered behaviour rather than by reading source:
//   - desktop (1280x900): the two-tab bar (Body Systems / References), the
//     References table lists exactly the 8 HEALTH_ATLAS_REFERENCES rows,
//     each reference's name is a real external link, a reference with no
//     citing organ in this dataset (USDA FoodData Central) says so in
//     words rather than showing an empty cell, a reference WITH a citing
//     organ (World Health Organization -> Lungs) offers a real clickable
//     organ pill, clicking it switches back to the Body Systems tab and
//     opens that exact organ in the existing detail column (a real link
//     into existing organ detail, not a dead one), the index's own
//     disclaimer text is visibly rendered (not just present in source),
//     and keyboard activation (Enter on a focused tab button) works the
//     same as a click.
//   - tablet (768x1024) and phone (390x844): the References tab is
//     reachable via a real tap, the table does not push the page into
//     horizontal overflow (it scrolls within its own card instead), and a
//     real tap on an organ pill opens that organ's detail.
//
// WHAT IT NEEDS TO RUN. Playwright's `chromium` package resolvable from
// this file, same as every other Playwright-based suite in this
// repository (see body-systems-parity-browser.mjs's own note on this —
// this repository deliberately carries no package.json declaring it).
//
// Run from the repository root:
//   node tools/health-atlas-verify/references-index-browser.mjs

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import http from 'node:http';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const PORT = 8080;
const BASE = `http://localhost:${PORT}`;
const HEALTH_ATLAS_URL = `${BASE}/app/health/health-atlas.html`;

let passed = 0;
let failed = 0;
const failures = [];

// Same shape as body-systems-parity-browser.mjs's own check() — an async
// body is required, since every check here drives a real browser.
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
    const req = http.get(`${BASE}/app/health/health-atlas.html`, (res) => {
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

async function gotoHealthAtlas(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(HEALTH_ATLAS_URL, { waitUntil: 'networkidle' });
  return errors;
}

async function openReferencesTab(page) {
  await page.locator('.ha-view-tab', { hasText: 'References' }).click();
}

async function main() {
  const { proc } = await ensureServer();
  const browser = await chromium.launch();
  try {
    console.log('Health Atlas — References index browser acceptance test\n');

    // ---------------- Desktop (1280x900) ----------------
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      const errors = await gotoHealthAtlas(page);

      await check('desktop: page loads with no page errors', async () => {
        assert(errors.length === 0, `page errors: ${errors.join('; ')}`);
      });

      await check('desktop: Body Systems tab is the default, References is not active', async () => {
        const bodySystemsPressed = await page.locator('.ha-view-tab', { hasText: 'Body Systems' }).getAttribute('aria-pressed');
        const referencesPressed = await page.locator('.ha-view-tab', { hasText: 'References' }).getAttribute('aria-pressed');
        assert(bodySystemsPressed === 'true', `expected Body Systems tab selected by default, got aria-pressed="${bodySystemsPressed}"`);
        assert(referencesPressed === 'false', `expected References tab not selected by default, got aria-pressed="${referencesPressed}"`);
        assert(await page.locator('.ha-bs-3col').isVisible(), 'expected the Body Systems 3-column grid to be showing by default');
        assert(await page.locator('.ha-refs-index').count() === 0, 'expected no References table in the DOM before switching tabs');
      });

      await check('desktop: clicking References switches the screen and the tab state', async () => {
        await openReferencesTab(page);
        assert(await page.locator('.ha-refs-index').isVisible(), 'expected the References index to render');
        assert(await page.locator('.ha-bs-3col').count() === 0, 'expected the Body Systems grid to be gone while on the References tab');
        const referencesPressed = await page.locator('.ha-view-tab', { hasText: 'References' }).getAttribute('aria-pressed');
        assert(referencesPressed === 'true', 'expected the References tab to read aria-pressed="true" once active');
      });

      await check('desktop: the table lists exactly the 8 general references, each a real external link', async () => {
        const rows = page.locator('.ha-refs-table tbody tr');
        assert(await rows.count() === 8, `expected 8 reference rows, got ${await rows.count()}`);
        const firstLink = rows.first().locator('a.ha-ref-link');
        assert(await firstLink.count() === 1, 'expected the first row to carry a real <a> link');
        const target = await firstLink.getAttribute('target');
        const rel = await firstLink.getAttribute('rel');
        const href = await firstLink.getAttribute('href');
        assert(target === '_blank', `expected target="_blank", got "${target}"`);
        assert(rel === 'noopener', `expected rel="noopener", got "${rel}"`);
        assert(/^https:\/\//.test(href || ''), `expected an https:// href, got "${href}"`);
      });

      await check('desktop: a reference with no citing organ says so in words (USDA FoodData Central, a real zero case)', async () => {
        const row = page.locator('.ha-refs-table tbody tr', { hasText: 'USDA FoodData Central' });
        assert(await row.count() === 1, 'expected to find the USDA FoodData Central row by its real name');
        const none = row.locator('.ha-ref-none');
        assert(await none.count() === 1, 'expected the "no organ" message for USDA FoodData Central');
        const text = (await none.textContent()) || '';
        assert(/no organ/i.test(text), `expected wording naming the absence, got "${text}"`);
        assert(await row.locator('.ha-ref-organ-link').count() === 0, 'expected zero organ pills on a reference with no citing organ');
      });

      await check('desktop: a reference WITH a citing organ (World Health Organization) offers a real organ pill', async () => {
        const row = page.locator('.ha-refs-table tbody tr', { hasText: 'World Health Organization' });
        assert(await row.count() === 1, 'expected to find the World Health Organization row by its real name');
        const pills = row.locator('.ha-ref-organ-link');
        assert(await pills.count() === 1, `expected exactly 1 organ pill for World Health Organization, got ${await pills.count()}`);
        assert((await pills.first().textContent()) === 'Lungs', `expected the pill to name Lungs, got "${await pills.first().textContent()}"`);
      });

      await check('desktop: clicking the organ pill is a real link into existing organ detail, not a dead reference', async () => {
        const row = page.locator('.ha-refs-table tbody tr', { hasText: 'World Health Organization' });
        await row.locator('.ha-ref-organ-link', { hasText: 'Lungs' }).click();
        // Switching organs from References must land back on Body Systems,
        // with the SAME detail column tranches 6-8 already built -- not a
        // separate/duplicate detail view.
        assert(await page.locator('.ha-bs-3col').isVisible(), 'expected to land back on the Body Systems 3-column layout');
        assert(await page.locator('.ha-refs-index').count() === 0, 'expected the References table to be gone after opening an organ');
        const heading = page.locator('.ha-detail-card h2');
        assert((await heading.textContent()) === 'Lungs', `expected the detail column to show Lungs, got "${await heading.textContent()}"`);
        const badges = page.locator('.ha-detail-card .ha-evidence-badge');
        assert(await badges.count() > 0, 'expected the opened organ to render its own evidence badges, same as opening it any other way');
        const bodySystemsPressed = await page.locator('.ha-view-tab', { hasText: 'Body Systems' }).getAttribute('aria-pressed');
        assert(bodySystemsPressed === 'true', 'expected the Body Systems tab to read as selected after opening an organ from References');
      });

      await check('desktop: the index disclaims per-statement verification in visible rendered text, not just source', async () => {
        await openReferencesTab(page);
        const note = (await page.locator('.ha-refs-index-note').textContent()) || '';
        assert(/not any one function statement individually/i.test(note), `expected the disclaimer sentence to render, got "${note}"`);
        assert(!/\bcited\b/i.test(note), `the index's own note must never itself use the word "cited": "${note}"`);
      });

      await check('desktop: a focused tab button activates on Enter, same as a click', async () => {
        await page.locator('.ha-view-tab', { hasText: 'Body Systems' }).focus();
        await page.keyboard.press('Enter');
        assert(await page.locator('.ha-bs-3col').isVisible(), 'expected Enter on the Body Systems tab to switch the screen, same as a click');
      });

      await ctx.close();
    }

    // ---------------- Tablet (768x1024) ----------------
    {
      const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 } });
      const page = await ctx.newPage();
      const errors = await gotoHealthAtlas(page);

      await check('tablet (768x1024): no page errors; References is reachable via a real tap and does not overflow', async () => {
        assert(errors.length === 0, `page errors: ${errors.join('; ')}`);
        await openReferencesTab(page);
        assert(await page.locator('.ha-refs-index').isVisible(), 'expected the References index to render at tablet width');
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        assert(overflow <= 1, `expected no page-level horizontal overflow at tablet width, got ${overflow}px`);
      });

      await ctx.close();
    }

    // ---------------- Phone (390x844) ----------------
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
      const page = await ctx.newPage();
      const errors = await gotoHealthAtlas(page);

      await check('phone (390x844): no page errors, no page-level horizontal overflow after opening References', async () => {
        assert(errors.length === 0, `page errors: ${errors.join('; ')}`);
        await openReferencesTab(page);
        assert(await page.locator('.ha-refs-index').isVisible(), 'expected the References index to render at phone width');
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        assert(overflow <= 1, `expected no page-level horizontal overflow at phone width (the table itself may scroll within its own card), got ${overflow}px`);
      });

      await check('phone (390x844): a real tap on an organ pill opens that organ in the detail column', async () => {
        const row = page.locator('.ha-refs-table tbody tr', { hasText: 'World Health Organization' });
        await row.locator('.ha-ref-organ-link', { hasText: 'Lungs' }).tap();
        const heading = page.locator('.ha-detail-card h2');
        assert((await heading.textContent()) === 'Lungs', `expected a real tap to open Lungs, got "${await heading.textContent()}"`);
      });

      await ctx.close();
    }
  } finally {
    await browser.close();
    if (proc) proc.kill();
  }

  console.log(`\nHealth Atlas references-index-browser: ${passed} passed, ${failed} failed`);
  if (failed) {
    for (const f of failures) console.log('  FAIL:', f);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('FATAL:', err.stack || err.message);
  process.exit(1);
});
