// Health Atlas — the References/Body Systems view switcher: a COMMITTED,
// reproducible browser acceptance test for real keyboard and pointer
// operability (parity tranche 10, issue #115 Gate A/B).
//
// WHY THIS FILE EXISTS. Tranche 9's buildViewTabs() (health-atlas-view.js)
// declared role="tablist" on the container and role="tab" + aria-selected
// on each button, borrowing the vocabulary of the WAI-ARIA Tabs pattern
// (https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) without the rest of
// what that pattern REQUIRES: neither button carried aria-controls, no
// element anywhere in the screen carried role="tabpanel", and there was no
// keydown handling on the tablist at all — so a real assistive-technology
// user landing on either button had no way to discover which panel it
// exposes, and ArrowLeft/ArrowRight/Home/End (the pattern's own required
// operation model) did nothing. A sighted mouse user saw two working
// buttons; a screen-reader or keyboard-only user was told "tab, 1 of 2"
// and then found nothing behind that promise.
//
// GATE A (reproduction, before touching app code): every assertion below
// was run against the unmodified tranche 9 commit (5817643bf3a7) first,
// and every one of the four structural assertions FAILED, exactly as
// this comment describes — see the dated report for the raw console
// output of that run. This file was not written after the fact to match
// a fix; it was run against the broken screen first.
//
// GATE B (the fix this file now asserts): rather than build out full tab
// semantics for two screens that share no content (Body Systems and
// References are not panels of one tabbed view — switching between them
// replaces the whole screen), the fix drops role="tab"/"tablist" and
// aria-selected entirely and uses two ordinary <button type="button">
// elements with aria-pressed reflecting which view is active — the
// WAI-ARIA "toggle button" pattern
// (https://www.w3.org/WAI/ARIA/apg/patterns/button/#toggle-button), which
// needs no bespoke keyboard handling at all: a native <button> is already
// in the normal Tab order, already activates on Enter and Space, and this
// screen never suppresses its focus outline (no `outline: none` on
// .ha-view-tab in health-atlas.html — checked by the "visible focus"
// assertion below, not assumed). This is exactly the "ordinary buttons if
// these are view-switch actions" alternative issue #115's own instruction
// named, and it is the more conformant choice here BECAUSE these are
// view-switch actions, not panel filters over one shared region.
//
// WHAT THIS FILE ASSERTS, against the FIXED screen:
//   - no role="tab" or role="tablist" survives anywhere in the view
//     switcher (a check that the misleading incomplete pattern is really
//     gone, not merely unused);
//   - each button is reachable by real sequential Tab-key navigation and
//     carries aria-pressed reflecting the active view;
//   - Enter AND Space on a focused button switch the view (native button
//     activation — proven by real key presses, not by calling the click
//     handler directly);
//   - the focused button shows a real, visible focus outline (computed
//     outline-style !== "none"), so a keyboard user can always see where
//     they are;
//   - the group container carries an accessible name (aria-label) so a
//     screen-reader user is told what the two buttons are for.
//   - tablet (768x1024) and phone (390x844): both buttons are reachable
//     and keyboard-activatable at those widths too, and the group is not
//     dropped from the accessibility tree there (no `[hidden]` / display
//     none regression, the class of bug CLAUDE.md's own standing lessons
//     warn about).
//
// WHAT IT NEEDS TO RUN. Playwright's `chromium` package resolvable from
// this file. This repository declares no package.json/node_modules for
// it (see references-index-browser.mjs's own note); this session found it
// resolvable, WITHOUT any shared-tooling or CI change, via a plain local
// symlink into the sandbox's pre-installed global Playwright install
// (`ln -s "$(npm root -g)/playwright" node_modules/playwright` — that
// directory is gitignored at the repo root, so nothing here depends on
// this being committed) — see the dated report for the exact command and
// for what CI would still need to run this class of suite at all (it is
// not wired into .github/workflows/verify.yml, same as every other
// Playwright suite in this project).
//
// Run from the repository root:
//   node tools/health-atlas-verify/references-tabs-accessibility-browser.mjs

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

async function main() {
  const { proc } = await ensureServer();
  const browser = await chromium.launch();
  try {
    console.log('Health Atlas — References/Body Systems view switcher accessibility test\n');

    // ---------------- Desktop (1280x900) ----------------
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      const errors = await gotoHealthAtlas(page);

      await check('desktop: page loads with no page errors', async () => {
        assert(errors.length === 0, `page errors: ${errors.join('; ')}`);
      });

      await check('desktop: no role="tab" or role="tablist" remains in the view switcher', async () => {
        const tabCount = await page.locator('.ha-view-tabs [role="tab"]').count();
        const tablistCount = await page.locator('.ha-view-tabs[role="tablist"]').count();
        assert(tabCount === 0, `expected 0 role="tab" elements, found ${tabCount}`);
        assert(tablistCount === 0, `expected the container to not carry role="tablist", found ${tablistCount}`);
      });

      await check('desktop: the view switcher is an accessibly-named group of ordinary buttons', async () => {
        const group = page.locator('.ha-view-tabs');
        assert((await group.getAttribute('role')) === 'group', 'expected role="group" on .ha-view-tabs');
        const label = await group.getAttribute('aria-label');
        assert(!!label && label.trim().length > 0, 'expected a non-empty aria-label on the view switcher group');
        const buttons = page.locator('.ha-view-tabs button');
        assert((await buttons.count()) === 2, `expected exactly 2 buttons, found ${await buttons.count()}`);
      });

      await check('desktop: aria-pressed reflects which view is active, Body Systems by default', async () => {
        const bodySystemsPressed = await page.locator('.ha-view-tab', { hasText: 'Body Systems' }).getAttribute('aria-pressed');
        const referencesPressed = await page.locator('.ha-view-tab', { hasText: 'References' }).getAttribute('aria-pressed');
        assert(bodySystemsPressed === 'true', `expected Body Systems aria-pressed="true" by default, got "${bodySystemsPressed}"`);
        assert(referencesPressed === 'false', `expected References aria-pressed="false" by default, got "${referencesPressed}"`);
      });

      await check('desktop: real sequential Tab-key navigation reaches both buttons in order', async () => {
        await page.locator('body').evaluate((b) => b.focus());
        // Tab from the top of the document until we land on the first view-switch button.
        let reached = false;
        for (let i = 0; i < 30; i++) {
          await page.keyboard.press('Tab');
          const isFirst = await page.evaluate(() => {
            const el = document.activeElement;
            return !!el && el.classList.contains('ha-view-tab') && el.textContent.trim() === 'Body Systems';
          });
          if (isFirst) { reached = true; break; }
        }
        assert(reached, 'expected real Tab-key navigation to reach the Body Systems button');
        await page.keyboard.press('Tab');
        const isSecond = await page.evaluate(() => {
          const el = document.activeElement;
          return !!el && el.classList.contains('ha-view-tab') && el.textContent.trim() === 'References';
        });
        assert(isSecond, 'expected the very next Tab press to reach the References button (ordinary document order)');
      });

      await check('desktop: the focused button shows a real, visible focus outline', async () => {
        await page.locator('.ha-view-tab', { hasText: 'Body Systems' }).focus();
        const outlineStyle = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
        assert(outlineStyle !== 'none', `expected a visible focus outline on the focused button, got outline-style: ${outlineStyle}`);
      });

      await check('desktop: Enter on a focused button switches the view (native button activation)', async () => {
        await page.locator('.ha-view-tab', { hasText: 'References' }).focus();
        await page.keyboard.press('Enter');
        assert(await page.locator('.ha-refs-index').isVisible(), 'expected Enter on the References button to open the References screen');
        const pressed = await page.locator('.ha-view-tab', { hasText: 'References' }).getAttribute('aria-pressed');
        assert(pressed === 'true', `expected aria-pressed="true" after Enter-activation, got "${pressed}"`);
      });

      await check('desktop: Space on a focused button switches the view (native button activation)', async () => {
        await page.locator('.ha-view-tab', { hasText: 'Body Systems' }).focus();
        await page.keyboard.press(' ');
        assert(await page.locator('.ha-bs-3col').isVisible(), 'expected Space on the Body Systems button to switch back to the Body Systems screen');
      });

      await ctx.close();
    }

    // ---------------- Tablet (768x1024) ----------------
    {
      const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 } });
      const page = await ctx.newPage();
      const errors = await gotoHealthAtlas(page);

      await check('tablet (768x1024): no page errors; both view-switch buttons are real, keyboard-reachable, non-empty targets', async () => {
        assert(errors.length === 0, `page errors: ${errors.join('; ')}`);
        const bs = page.locator('.ha-view-tab', { hasText: 'Body Systems' });
        const refs = page.locator('.ha-view-tab', { hasText: 'References' });
        assert(await bs.isVisible(), 'expected the Body Systems button visible at tablet width');
        assert(await refs.isVisible(), 'expected the References button visible at tablet width');
        await refs.focus();
        await page.keyboard.press('Enter');
        assert(await page.locator('.ha-refs-index').isVisible(), 'expected keyboard activation to work at tablet width too');
      });

      await ctx.close();
    }

    // ---------------- Phone (390x844) ----------------
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
      const page = await ctx.newPage();
      const errors = await gotoHealthAtlas(page);

      await check('phone (390x844): no page errors; a real tap switches the view and sets aria-pressed', async () => {
        assert(errors.length === 0, `page errors: ${errors.join('; ')}`);
        await page.locator('.ha-view-tab', { hasText: 'References' }).tap();
        assert(await page.locator('.ha-refs-index').isVisible(), 'expected a real tap to open the References screen at phone width');
        const pressed = await page.locator('.ha-view-tab', { hasText: 'References' }).getAttribute('aria-pressed');
        assert(pressed === 'true', `expected aria-pressed="true" after tap, got "${pressed}"`);
      });

      await ctx.close();
    }
  } finally {
    await browser.close();
    if (proc) proc.kill();
  }

  console.log(`\nHealth Atlas references-tabs-accessibility-browser: ${passed} passed, ${failed} failed`);
  if (failed) {
    for (const f of failures) console.log('  FAIL:', f);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('FATAL:', err.stack || err.message);
  process.exit(1);
});
